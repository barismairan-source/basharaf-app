import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, asc, desc, eq, inArray, isNull, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import { computeDerivedFields, assertNoAttendanceOverlap, NEW_ATTENDANCE_CANDIDATE_ID } from '@/lib/payroll/attendanceEntryHelpers';
import { ipMatchesCidr } from './ip';
import {
  clockStateFrom, decideClock, pairToEntryFields, pickClosestAssignment, tehranParts,
  type ClockAction, type ClockState, type OpenClockIn,
} from './rules';

export const CLOCK_COOKIE = 'basharaf-clock';
// مرورگرها کوکی را حداکثر ~۴۰۰ روز نگه می‌دارند.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 395;

// همان الگوی lib/payroll/attendanceEntryHelpers.ts — هم با db هم با tx کار می‌کند.
type DbOrTx = any;

export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function setClockCookie(deviceToken: string): void {
  cookies().set(CLOCK_COOKIE, deviceToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // strict: درخواست ثبت از سایت دیگر هرگز کوکی را با خودش نمی‌برد.
    sameSite: 'strict',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

/**
 * مسیرهای عمومی ثبت حضور فقط JSON می‌پذیرند. فرم‌های سایت‌های دیگر نمی‌توانند بدون
 * preflight مرورگر Content-Type: application/json بفرستند، پس یک صفحه‌ی مخرب نمی‌تواند
 * گوشی کسی را با لینک دیگری «فعال» کند (CSRF).
 */
export function assertJsonRequest(req: Request): void {
  const ct = (req.headers.get('content-type') ?? '').toLowerCase();
  if (!ct.startsWith('application/json')) {
    throw new ApiError(415, 'درخواست نامعتبر است', 'UNSUPPORTED_MEDIA_TYPE');
  }
}

export interface ClockDevice {
  deviceId: string;
  employeeId: string;
  employeeName: string;
  employeeBranchId: string | null;
  passkeyRegistered: boolean;
  faceIdExempt: boolean;
}

/** گوشی فعال‌شده‌ی این درخواست (از کوکی). لینک لغوشده یا پرسنل غیرفعال → null. */
export async function getDeviceFromCookie(): Promise<ClockDevice | null> {
  const token = cookies().get(CLOCK_COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 200) return null;
  const [row] = await db.select({
    deviceId: schema.attendanceClockDevices.id,
    employeeId: schema.employees.id,
    employeeName: schema.employees.fullName,
    employeeBranchId: schema.employees.branchId,
    employeeActive: schema.employees.isActive,
    passkeyCredentialId: schema.attendanceClockDevices.passkeyCredentialId,
    faceIdExempt: schema.attendanceClockDevices.faceIdExempt,
  }).from(schema.attendanceClockDevices)
    .innerJoin(schema.employees, eq(schema.attendanceClockDevices.employeeId, schema.employees.id))
    .where(and(
      eq(schema.attendanceClockDevices.deviceTokenHash, hashToken(token)),
      isNull(schema.attendanceClockDevices.revokedAt),
      isNotNull(schema.attendanceClockDevices.activatedAt),
    )).limit(1);
  if (!row || !row.employeeActive) return null;
  return {
    deviceId: row.deviceId, employeeId: row.employeeId, employeeName: row.employeeName, employeeBranchId: row.employeeBranchId,
    passkeyRegistered: !!row.passkeyCredentialId, faceIdExempt: row.faceIdExempt,
  };
}

export const REQUIRE_FACE_ID_KEY = 'attendance.clock.requireFaceId';

/** تنظیم سراسری «ثبت حضور با Face ID». اگر ردیف تنظیم نباشد، پیش‌فرض روشن است. */
export async function getRequireFaceId(): Promise<boolean> {
  const [row] = await db.select({ value: schema.appSettings.value }).from(schema.appSettings)
    .where(eq(schema.appSettings.key, REQUIRE_FACE_ID_KEY)).limit(1);
  return row ? row.value !== 'false' : true;
}

/** برای این گوشی Face ID لازم است؟ (تنظیم سراسری روشن و نفر استثنا نشده) */
export async function faceIdRequiredFor(device: ClockDevice): Promise<boolean> {
  if (device.faceIdExempt) return false;
  return getRequireFaceId();
}

/** ثبت قبلی همین گوشی با همین کلید ضدتکرار (برای تلاش دوباره پس از قطع شبکه). */
export async function findPunchByKey(deviceId: string, clientKey: string) {
  const [row] = await db.select().from(schema.attendanceClockEvents)
    .where(eq(schema.attendanceClockEvents.idempotencyKey, `${deviceId}:${clientKey}`)).limit(1);
  return row ?? null;
}

export interface MatchedNetwork { networkId: string; branchId: string; branchName: string }

/**
 * IP به کدام شبکه‌ی فعال شعبه می‌خورد؟ اگر به چند شعبه بخورد، شعبه‌ی خود نفر اولویت دارد.
 */
export async function matchBranchNetwork(ip: string, preferBranchId: string | null): Promise<MatchedNetwork | null> {
  const rows = await db.select({
    networkId: schema.branchAttendanceNetworks.id,
    branchId: schema.branchAttendanceNetworks.branchId,
    cidr: schema.branchAttendanceNetworks.cidr,
    branchName: schema.branches.name,
  }).from(schema.branchAttendanceNetworks)
    .innerJoin(schema.branches, eq(schema.branchAttendanceNetworks.branchId, schema.branches.id))
    .where(eq(schema.branchAttendanceNetworks.isActive, true))
    .orderBy(asc(schema.branchAttendanceNetworks.createdAt));
  const matches = rows.filter((r) => ipMatchesCidr(ip, r.cidr));
  const pick = matches.find((m) => m.branchId === preferBranchId) ?? matches[0];
  return pick ? { networkId: pick.networkId, branchId: pick.branchId, branchName: pick.branchName } : null;
}

/** آیا اصلاً شبکه‌ای برای هیچ شعبه‌ای تنظیم شده؟ (برای پیام «هنوز راه‌اندازی نشده») */
export async function anyNetworkConfigured(): Promise<boolean> {
  const [row] = await db.select({ id: schema.branchAttendanceNetworks.id })
    .from(schema.branchAttendanceNetworks).where(eq(schema.branchAttendanceNetworks.isActive, true)).limit(1);
  return !!row;
}

/** آخرین ورود این نفر، اگر هنوز خروج نخورده. */
export async function findOpenClockIn(tx: DbOrTx, employeeId: string): Promise<OpenClockIn | null> {
  const [last] = await tx.select({ id: schema.attendanceClockEvents.id, occurredAt: schema.attendanceClockEvents.occurredAt })
    .from(schema.attendanceClockEvents)
    .where(and(eq(schema.attendanceClockEvents.employeeId, employeeId), eq(schema.attendanceClockEvents.eventType, 'clock_in')))
    .orderBy(desc(schema.attendanceClockEvents.occurredAt)).limit(1);
  if (!last) return null;
  const [out] = await tx.select({ id: schema.attendanceClockEvents.id }).from(schema.attendanceClockEvents)
    .where(eq(schema.attendanceClockEvents.pairedInEventId, last.id)).limit(1);
  return out ? null : { id: last.id, occurredAt: last.occurredAt };
}

/** ورود/خروج‌های امروزِ (به وقت تهران) همین نفر — برای نمایش در صفحه‌ی گوشی. */
export async function todaySessions(employeeId: string, now: Date): Promise<Array<{ inAt: string; outAt: string | null }>> {
  const ins = await db.select({ id: schema.attendanceClockEvents.id, occurredAt: schema.attendanceClockEvents.occurredAt })
    .from(schema.attendanceClockEvents)
    .where(and(
      eq(schema.attendanceClockEvents.employeeId, employeeId),
      eq(schema.attendanceClockEvents.eventType, 'clock_in'),
      eq(schema.attendanceClockEvents.workDate, new Date(tehranParts(now).date + 'T00:00:00Z')),
    ))
    .orderBy(asc(schema.attendanceClockEvents.occurredAt));
  if (ins.length === 0) return [];
  const outs = await db.select({ pairedInEventId: schema.attendanceClockEvents.pairedInEventId, occurredAt: schema.attendanceClockEvents.occurredAt })
    .from(schema.attendanceClockEvents)
    .where(inArray(schema.attendanceClockEvents.pairedInEventId, ins.map((i) => i.id)));
  return ins.map((i) => ({
    inAt: i.occurredAt.toISOString(),
    outAt: outs.find((o) => o.pairedInEventId === i.id)?.occurredAt.toISOString() ?? null,
  }));
}

export async function getClockState(employeeId: string, now: Date): Promise<ClockState> {
  return clockStateFrom(await findOpenClockIn(db, employeeId), now);
}

export interface PunchResult {
  eventId: string;
  eventType: ClockAction;
  occurredAt: Date;
  branchName: string;
  duplicate: boolean;
  conversion?: { attendanceEntryId: string | null; error: string | null };
}

/**
 * ثبت یک ورود/خروج. ترتیب و تکرار داخل تراکنش با قفل ردیف پرسنل کنترل می‌شود
 * (دو لمس هم‌زمان پشت سر هم اجرا می‌شوند، نه موازی). زمان = now() دیتابیس.
 */
export async function recordPunch(input: {
  device: ClockDevice; network: MatchedNetwork; action: ClockAction; clientKey: string; userVerified: boolean;
}): Promise<PunchResult> {
  const idempotencyKey = `${input.device.deviceId}:${input.clientKey}`;

  const result = await db.transaction(async (tx: DbOrTx) => {
    await tx.select({ id: schema.employees.id }).from(schema.employees)
      .where(eq(schema.employees.id, input.device.employeeId)).for('update');

    const [dup] = await tx.select().from(schema.attendanceClockEvents)
      .where(eq(schema.attendanceClockEvents.idempotencyKey, idempotencyKey)).limit(1);
    if (dup) {
      return { event: dup as typeof schema.attendanceClockEvents.$inferSelect, duplicate: true, inAt: null as Date | null };
    }

    // «الان» از ساعت دیتابیس — نه مرورگر و نه ساعت سرور اپ.
    const nowRows = await tx.execute(sql`select now() as now`) as unknown as Array<{ now: Date | string }>;
    const nowDate = new Date(nowRows[0]!.now);
    const state = clockStateFrom(await findOpenClockIn(tx, input.device.employeeId), nowDate);
    const decision = decideClock(input.action, state, nowDate);
    if (!decision.ok) throw new ApiError(409, decision.message, decision.code);

    const workDate = decision.action === 'clock_out'
      ? tehranParts(decision.inAt).date
      : tehranParts(nowDate).date;

    const [event] = await tx.insert(schema.attendanceClockEvents).values({
      employeeId: input.device.employeeId,
      branchId: input.network.branchId,
      eventType: decision.action,
      occurredAt: nowDate,
      workDate: new Date(workDate + 'T00:00:00Z'),
      networkId: input.network.networkId,
      deviceId: input.device.deviceId,
      pairedInEventId: decision.action === 'clock_out' ? decision.pairedInEventId : null,
      idempotencyKey,
      userVerified: input.userVerified,
    }).returning();

    await tx.update(schema.attendanceClockDevices).set({ lastUsedAt: nowDate })
      .where(eq(schema.attendanceClockDevices.id, input.device.deviceId));

    return { event, duplicate: false, inAt: decision.action === 'clock_out' ? decision.inAt : null };
  });

  const ev = result.event;
  const out: PunchResult = {
    eventId: ev.id, eventType: ev.eventType, occurredAt: ev.occurredAt,
    branchName: input.network.branchName, duplicate: result.duplicate,
  };
  if (!result.duplicate && ev.eventType === 'clock_out' && result.inAt) {
    out.conversion = await convertPairToDraftEntry(ev, result.inAt);
  }
  return out;
}


/**
 * یک جفت ورود/خروج → ردیف «پیش‌نویس» در attendance_entries تا مدیر مثل همیشه
 * بررسی و تأیید کند. اگر ممکن نبود (نرخ ساعتی ندارد، با حضور دیگری هم‌پوشانی دارد،
 * ...) رویداد خام می‌ماند و علت روی آن ثبت می‌شود تا مدیر دستی ثبت کند.
 * هیچ‌وقت خودکار «تأیید» نمی‌کند.
 */
export async function convertPairToDraftEntry(
  outEvent: typeof schema.attendanceClockEvents.$inferSelect,
  inAt: Date,
): Promise<{ attendanceEntryId: string | null; error: string | null }> {
  const fields = pairToEntryFields(inAt, outEvent.occurredAt);
  let attendanceEntryId: string | null = null;
  let error: string | null = null;
  try {
    if (fields.clockIn === fields.clockOut && !fields.crossesMidnight) {
      throw new ApiError(400, 'ورود و خروج در یک دقیقه', 'TOO_SHORT');
    }
    attendanceEntryId = await db.transaction(async (tx: DbOrTx) => {
      const workDateValue = new Date(fields.workDate + 'T00:00:00Z');
      const candidates = await tx.select({ a: schema.employeeShiftAssignments, entryId: schema.attendanceEntries.id })
        .from(schema.employeeShiftAssignments)
        .leftJoin(schema.attendanceEntries, eq(schema.attendanceEntries.shiftAssignmentId, schema.employeeShiftAssignments.id))
        .where(and(
          eq(schema.employeeShiftAssignments.employeeId, outEvent.employeeId),
          eq(schema.employeeShiftAssignments.workDate, workDateValue),
          eq(schema.employeeShiftAssignments.status, 'scheduled'),
        ));
      type Assignment = typeof schema.employeeShiftAssignments.$inferSelect;
      const free: Assignment[] = (candidates as Array<{ a: Assignment; entryId: string | null }>)
        .filter((c) => !c.entryId).map((c) => c.a);
      const assignment = pickClosestAssignment<Assignment>(free, fields.clockIn);

      const breakMinutes = assignment?.breakMinutes ?? 0;
      const breakPolicy = assignment?.breakPolicy ?? 'unpaid';
      const derived = await computeDerivedFields({
        employeeId: outEvent.employeeId, workDate: fields.workDate, entryMode: 'time_range',
        clockIn: fields.clockIn, clockOut: fields.clockOut, crossesMidnight: fields.crossesMidnight,
        breakMinutes, breakPolicy, attendanceType: 'present', plannedMinutes: assignment?.plannedMinutes ?? 0,
      });
      await assertNoAttendanceOverlap(tx, {
        id: NEW_ATTENDANCE_CANDIDATE_ID, attendanceType: 'present', entryMode: 'time_range',
        clockIn: fields.clockIn, clockOut: fields.clockOut, crossesMidnight: fields.crossesMidnight,
        shiftAssignmentId: assignment?.id ?? null,
        assignmentStartTime: assignment?.plannedStartTime ?? null, assignmentEndTime: assignment?.plannedEndTime ?? null,
        assignmentCrossesMidnight: assignment?.crossesMidnight ?? false,
      }, outEvent.employeeId, fields.workDate);

      const [entry] = await tx.insert(schema.attendanceEntries).values({
        employeeId: outEvent.employeeId, branchId: outEvent.branchId, workDate: workDateValue,
        shiftAssignmentId: assignment?.id ?? null, entryMode: 'time_range',
        clockIn: fields.clockIn, clockOut: fields.clockOut, breakMinutes,
        workedMinutes: derived.workedMinutes, regularMinutes: derived.regularMinutes,
        overtimeMinutes: derived.overtimeMinutes, nightMinutes: derived.nightMinutes,
        holidayMinutes: derived.holidayMinutes, hourlyRateSnapshot: derived.hourlyRateSnapshot,
        attendanceType: 'present', status: 'draft',
        managerNote: 'ثبت خودکار با اینترنت مغازه (ساعت ورود و خروج از سرور)',
        createdBy: null,
      }).returning({ id: schema.attendanceEntries.id });
      return entry?.id ?? null;
    });
  } catch (e) {
    error = e instanceof ApiError ? e.code : 'CONVERSION_FAILED';
    if (!(e instanceof ApiError) && process.env.NODE_ENV !== 'production') console.error('[attendance-clock]', e);
  }
  try {
    await db.update(schema.attendanceClockEvents)
      .set({ attendanceEntryId, conversionError: error })
      .where(eq(schema.attendanceClockEvents.id, outEvent.id));
  } catch {
    // رویداد خام ثبت شده؛ اگر فقط نتیجه‌ی تبدیل ذخیره نشد، در پنل «تبدیل‌نشده» دیده می‌شود.
  }
  return { attendanceEntryId, error };
}

/** پیام فارسی برای کد خطای تبدیل — در پنل مدیر. */
export const CONVERSION_ERROR_LABELS: Record<string, string> = {
  NO_ACTIVE_RATE: 'نرخ ساعتی فعال ندارد — دستی ثبت شود',
  ATTENDANCE_OVERLAP: 'با حضور دیگری در همان روز هم‌پوشانی دارد',
  TOO_SHORT: 'ورود و خروج در یک دقیقه',
  CONVERSION_FAILED: 'تبدیل به حضور ناموفق بود',
};

