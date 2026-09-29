import { and, eq, inArray, sql as sqlOp } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import { generateTrackingCode } from './trackingCode';
import {
  jalaliSlotToDate, reservationInterval, generateSlotsForDate, findTableForInterval,
  isPastJalaliDate, maxSingleTableCapacity, CAPACITY_HOLDING_STATUSES,
  type ExistingReservationForCapacity, type TableBlockForCapacity,
} from './capacity';
import { fireReservationNotification } from './adminAlert';
import type {
  CreatePublicReservationInput, PublicReservationBranch, PublicReservationDay, PublicReservationSlot,
  PublicReservationResult, PublicReservationDetail,
} from '@/types';

type DbOrTx = any;

/** شعبی که رزرو عمومی برایشان تنظیم شده — چه الان باز باشند چه بسته (پیام/شماره‌ی بسته‌بودن هم دیده می‌شود). */
export async function getPublicReservationBranches(): Promise<PublicReservationBranch[]> {
  const rows = await db
    .select({
      id: schema.branches.id,
      name: schema.branches.name,
      maxPartySize: schema.reservationSettings.maxPartySize,
    })
    .from(schema.reservationSettings)
    .innerJoin(schema.branches, eq(schema.branches.id, schema.reservationSettings.branchId));
  return rows;
}

async function loadActiveTables(tx: DbOrTx, branchId: string) {
  return tx.select().from(schema.restaurantTables)
    .where(and(eq(schema.restaurantTables.branchId, branchId), eq(schema.restaurantTables.isActive, true)));
}

async function loadReservationsForDate(tx: DbOrTx, branchId: string, date: string): Promise<ExistingReservationForCapacity[]> {
  const rows = await tx.select({
    id: schema.reservations.id,
    tableId: schema.reservations.tableId,
    time: schema.reservations.time,
    partySize: schema.reservations.partySize,
    status: schema.reservations.status,
  }).from(schema.reservations)
    .where(and(eq(schema.reservations.branchId, branchId), eq(schema.reservations.date, date)));

  return rows
    .map((r: any) => {
      const interval = reservationInterval(date, r.time);
      if (!interval) return null;
      return { id: r.id, tableId: r.tableId, partySize: r.partySize, status: r.status, start: interval.start, end: interval.end };
    })
    .filter((r: any): r is ExistingReservationForCapacity => r !== null);
}

async function loadBlocksForDate(tx: DbOrTx, branchId: string, date: string): Promise<TableBlockForCapacity[]> {
  const rows = await tx.select().from(schema.tableBlocks)
    .where(and(eq(schema.tableBlocks.branchId, branchId), eq(schema.tableBlocks.date, date)));
  return rows.map((b: any) => ({
    tableId: b.tableId,
    start: jalaliSlotToDate(date, b.startTime ?? '00:00')!,
    end: b.endTime ? jalaliSlotToDate(date, b.endTime)! : jalaliSlotToDate(date, '23:59')!,
  }));
}

/** وضعیت یک تاریخ مشخص برای یک شعبه — اسلات‌های ساعتی + اینکه هرکدام برای این تعداد نفر/نوع میز جا دارد یا نه. */
export async function getReservationStatusForDate(
  branchId: string, date: string, partySize: number, tableType: 'normal' | 'social',
): Promise<PublicReservationDay> {
  const [settings] = await db.select().from(schema.reservationSettings)
    .where(eq(schema.reservationSettings.branchId, branchId)).limit(1);
  if (!settings) throw new ApiError(404, 'رزرو عمومی برای این شعبه تنظیم نشده', 'RESERVATIONS_NOT_CONFIGURED');

  const [branch] = await db.select({ id: schema.branches.id, name: schema.branches.name })
    .from(schema.branches).where(eq(schema.branches.id, branchId)).limit(1);
  if (!branch) throw new ApiError(404, 'شعبه پیدا نشد', 'BRANCH_NOT_FOUND');

  if (isPastJalaliDate(date)) throw new ApiError(422, 'این تاریخ گذشته است', 'DATE_IN_PAST');

  const daySlots = generateSlotsForDate(settings, date);
  const tables = await loadActiveTables(db, branchId);
  const relevantTables = tables.filter((t: any) => (tableType === 'social' ? t.isSocial : !t.isSocial));
  const structurallyImpossible = partySize > maxSingleTableCapacity(relevantTables);

  if (daySlots.length === 0 || structurallyImpossible) {
    return {
      branch: { id: branch.id, name: branch.name, maxPartySize: settings.maxPartySize },
      date,
      slots: [],
      structurallyImpossible,
      closedMessage: structurallyImpossible ? 'برای این تعداد، رزرو آنلاین در این ساعت ممکن نیست' : settings.closedMessage,
      closedPhone: structurallyImpossible ? null : settings.closedPhone,
    };
  }

  const [existing, blocks] = await Promise.all([
    loadReservationsForDate(db, branchId, date),
    loadBlocksForDate(db, branchId, date),
  ]);

  const slots: PublicReservationSlot[] = daySlots.map((s) => {
    const target = reservationInterval(date, s.time)!;
    const assignment = findTableForInterval(tables, existing, blocks, target, partySize, undefined, tableType);
    return { time: s.time, available: assignment !== null, social: assignment?.isSocial ?? false };
  });

  const anyAvailable = slots.some((s) => s.available);

  return {
    branch: { id: branch.id, name: branch.name, maxPartySize: settings.maxPartySize },
    date,
    slots,
    structurallyImpossible: false,
    closedMessage: anyAvailable ? null : settings.closedMessage,
    closedPhone: anyAvailable ? null : settings.closedPhone,
  };
}

/**
 * ثبت رزرو عمومی — اتمیک، ضد race-condition.
 *
 * قفل: همه‌ی میزهای فعال شعبه با FOR UPDATE قفل می‌شوند (تعداد کم، ۵ تا ۱۰
 * ردیف — کاملاً سبک) تا محاسبه‌ی تخصیص میز زیر یک تراکنش قفل‌شده انجام شود؛
 * دو رزرو هم‌زمان روی آخرین میز/صندلی خالی امکان‌پذیر نیست.
 */
export async function createPublicReservation(input: CreatePublicReservationInput): Promise<PublicReservationResult> {
  return db.transaction(async (tx) => {
    if (input.idempotencyKey) {
      const [dupe] = await tx.select({
        trackingCode: schema.reservations.trackingCode,
        date: schema.reservations.date,
        time: schema.reservations.time,
        partySize: schema.reservations.partySize,
        status: schema.reservations.status,
        branchName: schema.branches.name,
        isSocial: schema.restaurantTables.isSocial,
      }).from(schema.reservations)
        .innerJoin(schema.branches, eq(schema.branches.id, schema.reservations.branchId))
        .leftJoin(schema.restaurantTables, eq(schema.restaurantTables.id, schema.reservations.tableId))
        .where(eq(schema.reservations.idempotencyKey, input.idempotencyKey)).limit(1);
      if (dupe) {
        return {
          trackingCode: dupe.trackingCode ?? '',
          branchName: dupe.branchName,
          date: dupe.date,
          time: dupe.time,
          partySize: dupe.partySize,
          status: dupe.status,
          isSocialTable: dupe.isSocial ?? false,
        };
      }
    }

    const [settings] = await tx.select().from(schema.reservationSettings)
      .where(eq(schema.reservationSettings.branchId, input.branchId)).limit(1);
    if (!settings) throw new ApiError(404, 'رزرو عمومی برای این شعبه تنظیم نشده', 'RESERVATIONS_NOT_CONFIGURED');

    const [branch] = await tx.select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches).where(eq(schema.branches.id, input.branchId)).limit(1);
    if (!branch) throw new ApiError(404, 'شعبه پیدا نشد', 'BRANCH_NOT_FOUND');

    if (input.partySize < 1 || input.partySize > settings.maxPartySize) {
      throw new ApiError(422, `تعداد نفرات باید بین ۱ تا ${settings.maxPartySize} باشد`, 'PARTY_SIZE_INVALID');
    }
    if (isPastJalaliDate(input.date)) {
      throw new ApiError(422, 'این تاریخ گذشته است', 'DATE_IN_PAST');
    }

    const daySlots = generateSlotsForDate(settings, input.date);
    if (!daySlots.some((s) => s.time === input.time)) {
      throw new ApiError(422, 'این ساعت دیگر قابل رزرو نیست', 'SLOT_NOT_BOOKABLE');
    }

    const target = reservationInterval(input.date, input.time);
    if (!target) throw new ApiError(422, 'تاریخ یا ساعت نامعتبر است', 'INVALID_DATETIME');

    // قفل میزها — تراکنش‌های همزمان روی این شعبه صف می‌شوند
    const tables = await tx.select().from(schema.restaurantTables)
      .where(and(eq(schema.restaurantTables.branchId, input.branchId), eq(schema.restaurantTables.isActive, true)))
      .for('update');

    const relevantTables = tables.filter((t: any) => (input.tableType === 'social' ? t.isSocial : !t.isSocial));
    if (input.partySize > maxSingleTableCapacity(relevantTables)) {
      throw new ApiError(422, 'برای این تعداد، رزرو آنلاین در این ساعت ممکن نیست', 'PARTY_TOO_LARGE_FOR_SINGLE_TABLE');
    }

    const [existing, blocks] = await Promise.all([
      loadReservationsForDate(tx, input.branchId, input.date),
      loadBlocksForDate(tx, input.branchId, input.date),
    ]);
    const assignment = findTableForInterval(tables, existing, blocks, target, input.partySize, undefined, input.tableType);
    if (!assignment) {
      throw new ApiError(409, settings.closedMessage ?? 'ظرفیت این ساعت تکمیل شده — ساعت دیگری را امتحان کنید', 'SLOT_FULL');
    }

    // ضد اسپم — حداکثر رزرو فعال هم‌زمان per شماره موبایل (در همه‌ی شعب)
    const activeCountRows = await tx
      .select({ activeCount: sqlOp<number>`count(*)::int` })
      .from(schema.reservations)
      .where(and(
        eq(schema.reservations.guestPhone, input.guestPhone),
        inArray(schema.reservations.status, [...CAPACITY_HOLDING_STATUSES]),
      ));
    const phoneActiveCount = activeCountRows[0]?.activeCount ?? 0;
    if (phoneActiveCount >= settings.maxActiveReservationsPerPhone) {
      throw new ApiError(429, 'شما به حداکثر تعداد رزرو فعال رسیده‌اید — ابتدا یکی از رزروهای قبلی را لغو کنید', 'PHONE_LIMIT_REACHED');
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
      tableId: assignment.tableId,
      bookerName: input.bookerName ?? null,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      note: input.note ?? null,
      status: 'pending',
      source: 'public',
      trackingCode,
      idempotencyKey: input.idempotencyKey ?? null,
      reserveAt: target.start,
      createdBy: null,
    }).returning();
    if (!row) throw new ApiError(500, 'خطا در ثبت رزرو', 'INSERT_FAILED');

    fireReservationNotification({
      reservationId: row.id,
      branchId: input.branchId,
      guestName: input.guestName,
      date: row.date,
      time: row.time,
    });

    return {
      trackingCode,
      branchName: branch.name,
      date: row.date,
      time: row.time,
      partySize: row.partySize,
      status: row.status,
      isSocialTable: assignment.isSocial,
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

export { loadReservationsForDate, loadBlocksForDate, loadActiveTables };
