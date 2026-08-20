import { and, eq, inArray, sql as sqlOp } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import { generateTrackingCode } from './trackingCode';
import { jalaliSlotToDate, computeSlotAvailability, isSlotBookable, isDateBookable, CAPACITY_HOLDING_STATUSES } from './capacity';
import { fireReservationNotification } from './adminAlert';
import type {
  CreatePublicReservationInput, PublicReservationBranch, PublicReservationDay,
  PublicReservationResult, PublicReservationDetail,
} from '@/types';

type ReservationSettingsRow = typeof schema.reservationSettings.$inferSelect;

async function loadEnabledSettings(branchId: string): Promise<ReservationSettingsRow | null> {
  const [row] = await db.select().from(schema.reservationSettings)
    .where(and(eq(schema.reservationSettings.branchId, branchId), eq(schema.reservationSettings.isPublicEnabled, true)))
    .limit(1);
  return row ?? null;
}

/** شعبی که رزرو عمومی برایشان فعال است — برای انتخاب‌گر شعبه در /reserve. */
export async function getPublicReservationBranches(): Promise<PublicReservationBranch[]> {
  const rows = await db
    .select({
      id: schema.branches.id,
      name: schema.branches.name,
      maxPartySize: schema.reservationSettings.maxPartySize,
      minLeadMinutes: schema.reservationSettings.minLeadMinutes,
      maxLeadDays: schema.reservationSettings.maxLeadDays,
    })
    .from(schema.reservationSettings)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.reservationSettings.branchId))
    .where(eq(schema.reservationSettings.isPublicEnabled, true));
  return rows;
}

/** اسلات‌های یک روز برای یک شعبه (با ظرفیت واقعی از رزروهای موجود). */
export async function getPublicReservationAvailability(branchId: string, date: string): Promise<PublicReservationDay> {
  const settings = await loadEnabledSettings(branchId);
  if (!settings) throw new ApiError(404, 'رزرو عمومی برای این شعبه فعال نیست', 'RESERVATIONS_DISABLED');

  const [branch] = await db.select({ id: schema.branches.id, name: schema.branches.name })
    .from(schema.branches).where(eq(schema.branches.id, branchId)).limit(1);
  if (!branch) throw new ApiError(404, 'شعبه پیدا نشد', 'BRANCH_NOT_FOUND');

  const branchInfo = { id: branch.id, name: branch.name, maxPartySize: settings.maxPartySize, minLeadMinutes: settings.minLeadMinutes, maxLeadDays: settings.maxLeadDays };

  const dateCheck = isDateBookable(settings, date);
  if (!dateCheck.ok) {
    return { branch: branchInfo, date, slots: [], dateBookable: false, dateReason: dateCheck.reason };
  }

  const existing = await db
    .select({ time: schema.reservations.time, partySize: schema.reservations.partySize, status: schema.reservations.status })
    .from(schema.reservations)
    .where(and(eq(schema.reservations.branchId, branchId), eq(schema.reservations.date, date)));

  const slots = computeSlotAvailability(settings, date, existing);
  return { branch: branchInfo, date, slots, dateBookable: true };
}

/**
 * ثبت رزرو عمومی — اتمیک، ضد race-condition.
 *
 * قفل: به‌جای یک advisory lock مصنوعی، همان ردیف reservation_settings که
 * برای خواندن ظرفیت لازم است با FOR UPDATE قفل می‌شود (الگوی همین پروژه —
 * ر.ک. lib/db/inventoryHelpers.ts روی invItems). این یعنی همه‌ی تلاش‌های
 * همزمان برای رزرو در یک شعبه صف می‌شوند، ظرفیت هر اسلات زیر همان قفل
 * دوباره محاسبه و چک می‌شود.
 */
export async function createPublicReservation(input: CreatePublicReservationInput): Promise<PublicReservationResult> {
  return db.transaction(async (tx) => {
    const [settings] = await tx.select().from(schema.reservationSettings)
      .where(and(eq(schema.reservationSettings.branchId, input.branchId), eq(schema.reservationSettings.isPublicEnabled, true)))
      .for('update');
    if (!settings) throw new ApiError(404, 'رزرو عمومی برای این شعبه فعال نیست', 'RESERVATIONS_DISABLED');

    const [branch] = await tx.select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches).where(eq(schema.branches.id, input.branchId)).limit(1);
    if (!branch) throw new ApiError(404, 'شعبه پیدا نشد', 'BRANCH_NOT_FOUND');

    const slotCheck = isSlotBookable(settings, input.date, input.time);
    if (!slotCheck.ok) throw new ApiError(422, slotCheck.reason ?? 'این اسلات قابل رزرو نیست', 'SLOT_NOT_BOOKABLE');

    if (input.partySize < 1 || input.partySize > settings.maxPartySize) {
      throw new ApiError(422, `تعداد نفرات باید بین ۱ تا ${settings.maxPartySize} باشد`, 'PARTY_SIZE_INVALID');
    }

    // ضد اسپم — حداکثر رزرو فعال هم‌زمان per شماره موبایل (در همه‌ی شعب)
    const activeCountRows = await tx
      .select({ activeCount: sqlOp<number>`count(*)::int` })
      .from(schema.reservations)
      .where(and(
        eq(schema.reservations.guestPhone, input.guestPhone),
        inArray(schema.reservations.status, [...CAPACITY_HOLDING_STATUSES]),
      ));
    const activeCount = activeCountRows[0]?.activeCount ?? 0;
    if (activeCount >= settings.maxActiveReservationsPerPhone) {
      throw new ApiError(429, 'شما به حداکثر تعداد رزرو فعال رسیده‌اید — ابتدا یکی از رزروهای قبلی را لغو کنید', 'PHONE_LIMIT_REACHED');
    }

    // ظرفیت همان اسلات
    const existing = await tx
      .select({ partySize: schema.reservations.partySize, status: schema.reservations.status })
      .from(schema.reservations)
      .where(and(
        eq(schema.reservations.branchId, input.branchId),
        eq(schema.reservations.date, input.date),
        eq(schema.reservations.time, input.time),
      ));
    const used = existing
      .filter((r) => (CAPACITY_HOLDING_STATUSES as readonly string[]).includes(r.status))
      .reduce((sum, r) => sum + r.partySize, 0);
    if (used + input.partySize > settings.slotCapacityGuests) {
      throw new ApiError(409, 'ظرفیت این اسلات تکمیل شده — لطفاً ساعت دیگری را انتخاب کنید', 'SLOT_FULL');
    }

    let trackingCode = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateTrackingCode();
      const [dupe] = await tx.select({ id: schema.reservations.id }).from(schema.reservations)
        .where(eq(schema.reservations.trackingCode, candidate)).limit(1);
      if (!dupe) { trackingCode = candidate; break; }
    }
    if (!trackingCode) throw new ApiError(500, 'خطا در تولید کد پیگیری — دوباره تلاش کنید', 'TRACKING_CODE_GEN_FAILED');

    const [row] = await tx.insert(schema.reservations).values({
      branchId: input.branchId,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      note: input.note ?? null,
      status: 'pending',
      source: 'public',
      trackingCode,
      reserveAt: jalaliSlotToDate(input.date, input.time),
      createdBy: null,
    }).returning();
    if (!row) throw new ApiError(500, 'خطا در ثبت رزرو', 'INSERT_FAILED');

    fireReservationNotification({
      reservationId: row.id,
      branchId: input.branchId,
      guestName: input.guestName,
      date: input.date,
      time: input.time,
    });

    return {
      trackingCode,
      branchName: branch.name,
      date: row.date,
      time: row.time,
      partySize: row.partySize,
      status: row.status,
    };
  });
}

async function findByCodeAndPhone(code: string, phone: string) {
  const [row] = await db
    .select({
      id: schema.reservations.id,
      branchName: schema.branches.name,
      date: schema.reservations.date,
      time: schema.reservations.time,
      partySize: schema.reservations.partySize,
      status: schema.reservations.status,
      note: schema.reservations.note,
      createdAt: schema.reservations.createdAt,
    })
    .from(schema.reservations)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.reservations.branchId))
    .where(and(
      eq(schema.reservations.trackingCode, code),
      eq(schema.reservations.guestPhone, phone),
    ))
    .limit(1);
  return row ?? null;
}

/** پیگیری رزرو با کد + موبایل — هر دو باید مطابقت داشته باشند (جلوگیری از حدس‌زدن کد). */
export async function getPublicReservationByCodeAndPhone(code: string, phone: string): Promise<PublicReservationDetail | null> {
  const row = await findByCodeAndPhone(code, phone);
  if (!row) return null;
  return {
    trackingCode: code,
    branchName: row.branchName,
    date: row.date,
    time: row.time,
    partySize: row.partySize,
    status: row.status,
    note: row.note,
    canCancel: row.status === 'pending' || row.status === 'confirmed',
    createdAt: row.createdAt.toISOString(),
  };
}

/** لغو رزرو توسط خود مهمان — فقط اگر هنوز pending/confirmed باشد. */
export async function cancelPublicReservation(code: string, phone: string): Promise<boolean> {
  const row = await findByCodeAndPhone(code, phone);
  if (!row) throw new ApiError(404, 'رزرو با این کد و شماره پیدا نشد', 'NOT_FOUND');
  if (row.status !== 'pending' && row.status !== 'confirmed') {
    throw new ApiError(409, 'این رزرو دیگر قابل لغو نیست', 'NOT_CANCELABLE');
  }
  await db.update(schema.reservations)
    .set({ status: 'cancelled', canceledReason: 'لغو توسط مشتری' })
    .where(eq(schema.reservations.id, row.id));
  return true;
}
