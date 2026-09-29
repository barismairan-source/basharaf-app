import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import {
  reservationInterval, findTableForInterval, checkSpecificTableCapacity,
  CAPACITY_HOLDING_STATUSES, type ExistingReservationForCapacity, type TableBlockForCapacity,
  type TableForAssignment,
} from './capacity';
import { jalaliSlotToDate } from './capacity';

type DbOrTx = any;

async function loadBranchTables(tx: DbOrTx, branchId: string): Promise<TableForAssignment[]> {
  return tx.select().from(schema.restaurantTables)
    .where(and(eq(schema.restaurantTables.branchId, branchId), eq(schema.restaurantTables.isActive, true)))
    .for('update');
}

async function loadReservationsForDate(tx: DbOrTx, branchId: string, date: string, excludeId?: string): Promise<ExistingReservationForCapacity[]> {
  const rows = await tx.select({
    id: schema.reservations.id,
    tableId: schema.reservations.tableId,
    time: schema.reservations.time,
    partySize: schema.reservations.partySize,
    status: schema.reservations.status,
  }).from(schema.reservations)
    .where(and(eq(schema.reservations.branchId, branchId), eq(schema.reservations.date, date)));

  return rows
    .filter((r: any) => r.id !== excludeId)
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

export interface StaffBookingInput {
  branchId: string;
  customerId: string | null;
  tableId: string | null; // null = اتوماتیک تخصیص بده
  date: string;
  time: string;
  partySize: number;
  note: string | null;
  guestName: string | null;
  guestPhone: string | null;
  bookerName: string | null;
  createdBy: string;
}

/**
 * ثبت رزرو از پنل — همان موتور ظرفیت رزرو عمومی را با قفل تراکنشی به کار می‌برد.
 * اگر tableId صریح داده شده، فقط همان میز چک می‌شود (نه تخصیص خودکار)؛ اگر
 * خالی باشد، بهترین میز خودکار پیدا می‌شود.
 */
export async function createStaffReservation(input: StaffBookingInput) {
  return db.transaction(async (tx) => {
    const target = reservationInterval(input.date, input.time);
    if (!target) throw new ApiError(422, 'تاریخ یا ساعت نامعتبر است', 'INVALID_DATETIME');

    const tables = await loadBranchTables(tx, input.branchId);
    const [existing, blocks] = await Promise.all([
      loadReservationsForDate(tx, input.branchId, input.date),
      loadBlocksForDate(tx, input.branchId, input.date),
    ]);

    let tableId: string | null = null;
    let isSocial = false;

    if (input.tableId) {
      const table = tables.find((t) => t.id === input.tableId);
      if (!table) throw new ApiError(400, 'میز انتخابی متعلق به این شعبه نیست یا غیرفعال است', 'TABLE_BRANCH_MISMATCH');
      const check = checkSpecificTableCapacity(table, existing, blocks, target, input.partySize);
      if (!check.ok) throw new ApiError(409, check.reason, 'TABLE_NOT_AVAILABLE');
      tableId = table.id;
      isSocial = table.isSocial;
    } else if (tables.length > 0) {
      // بدون میز صریح: فقط وقتی این شعبه اصلاً میزی ندارد رزرو بدون میز مجاز است (پیام قدیمی‌تر)
      const assignment = findTableForInterval(tables, existing, blocks, target, input.partySize);
      if (!assignment) throw new ApiError(409, 'ظرفیت این بازه تکمیل است', 'SLOT_FULL');
      tableId = assignment.tableId;
      isSocial = assignment.isSocial;
    }

    const [row] = await tx.insert(schema.reservations).values({
      customerId: input.customerId,
      branchId: input.branchId,
      tableId,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      note: input.note,
      guestName: input.guestName,
      guestPhone: input.guestPhone,
      bookerName: input.bookerName,
      source: 'staff',
      reserveAt: target.start,
      createdBy: input.createdBy,
    }).returning();
    if (!row) throw new ApiError(500, 'خطا در ثبت رزرو', 'INSERT_FAILED');
    return { ...row, isSocialTable: isSocial };
  });
}

export interface StaffBookingPatch {
  tableId?: string | null;
  date?: string;
  time?: string;
  partySize?: number;
  note?: string | null;
}

/**
 * ویرایش رزرو از پنل — اگر میز/تاریخ/ساعت/تعداد نفرات تغییر کند، ظرفیت دوباره
 * زیر قفل چک می‌شود (بدون احتساب خودِ همین رزرو در محاسبه‌ی اشغال). اگر ظرفیت
 * جا نداد، خطا می‌دهد و رزرو قبلی دست‌نخورده می‌ماند.
 */
export async function updateStaffReservation(id: string, branchId: string, existingRow: {
  tableId: string | null; date: string; time: string; partySize: number;
}, patch: StaffBookingPatch) {
  const needsCapacityCheck = patch.tableId !== undefined || patch.date !== undefined || patch.time !== undefined || patch.partySize !== undefined;
  const nextTableId = patch.tableId !== undefined ? patch.tableId : existingRow.tableId;
  const nextDate = patch.date ?? existingRow.date;
  const nextTime = patch.time ?? existingRow.time;
  const nextPartySize = patch.partySize ?? existingRow.partySize;

  return db.transaction(async (tx) => {
    if (needsCapacityCheck && nextTableId) {
      const target = reservationInterval(nextDate, nextTime);
      if (!target) throw new ApiError(422, 'تاریخ یا ساعت نامعتبر است', 'INVALID_DATETIME');

      const tables = await loadBranchTables(tx, branchId);
      const table = tables.find((t) => t.id === nextTableId);
      if (!table) throw new ApiError(400, 'میز انتخابی متعلق به این شعبه نیست یا غیرفعال است', 'TABLE_BRANCH_MISMATCH');

      const [existing, blocks] = await Promise.all([
        loadReservationsForDate(tx, branchId, nextDate, id),
        loadBlocksForDate(tx, branchId, nextDate),
      ]);
      const check = checkSpecificTableCapacity(table, existing, blocks, target, nextPartySize, id);
      if (!check.ok) throw new ApiError(409, check.reason, 'TABLE_NOT_AVAILABLE');
    }

    const [updated] = await tx.update(schema.reservations)
      .set({ ...patch })
      .where(eq(schema.reservations.id, id))
      .returning();
    if (!updated) throw new ApiError(404, 'رزرو پیدا نشد', 'NOT_FOUND');
    return updated;
  });
}

export interface CreateBlockInput {
  tableId: string;
  branchId: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdBy: string;
}

/**
 * مسدودکردن یک میز/بازه — قبل از ثبت، رزروهای فعال هم‌پوشان را چک می‌کند.
 * اگر تعارض بود، رزروهای متعارض را برمی‌گرداند و چیزی ثبت نمی‌کند (رزرو قبلی
 * پنهان یا حذف نمی‌شود).
 */
export async function createTableBlock(input: CreateBlockInput) {
  return db.transaction(async (tx) => {
    const target = {
      start: jalaliSlotToDate(input.date, input.startTime ?? '00:00')!,
      end: input.endTime ? jalaliSlotToDate(input.date, input.endTime)! : jalaliSlotToDate(input.date, '23:59')!,
    };

    const rows = await tx.select({
      id: schema.reservations.id, time: schema.reservations.time, partySize: schema.reservations.partySize,
      status: schema.reservations.status, guestName: schema.reservations.guestName, bookerName: schema.reservations.bookerName,
    }).from(schema.reservations)
      .where(and(
        eq(schema.reservations.tableId, input.tableId),
        eq(schema.reservations.date, input.date),
      ));

    const conflicts = rows.filter((r: any) => {
      if (!(CAPACITY_HOLDING_STATUSES as readonly string[]).includes(r.status)) return false;
      const interval = reservationInterval(input.date, r.time);
      if (!interval) return false;
      return interval.start.getTime() < target.end.getTime() && target.start.getTime() < interval.end.getTime();
    });

    if (conflicts.length > 0) {
      throw new ApiError(409, 'این میز/بازه رزرو فعال دارد — ابتدا آن را جابه‌جا یا لغو کنید', 'BLOCK_CONFLICT', {
        conflicts: conflicts.map((c: any) => ({ id: c.id, time: c.time, partySize: c.partySize, name: c.bookerName ?? c.guestName })),
      });
    }

    const [row] = await tx.insert(schema.tableBlocks).values({
      tableId: input.tableId,
      branchId: input.branchId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      reason: input.reason,
      createdBy: input.createdBy,
    }).returning();
    if (!row) throw new ApiError(500, 'خطا در ثبت مسدودی', 'INSERT_FAILED');
    return row;
  });
}
