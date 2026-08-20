import { jalaliToDate } from '@/lib/jalali';
import type { ReservationSettings } from '@/lib/db/schema';

/** وضعیت‌هایی که ظرفیت یک میز/اسلات را اشغال می‌کنند — طبق قانون پروژه. */
export const CAPACITY_HOLDING_STATUSES = ['pending', 'confirmed', 'seated'] as const;

/** ترکیب تاریخ شمسی + 'HH:mm' به Date واقعی (فقط برای ستون سیستمی reserveAt). null اگر نامعتبر. */
export function jalaliSlotToDate(jalaliDate: string, time: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const base = jalaliToDate(jalaliDate);
  if (!base || !m) return null;
  const d = new Date(base);
  d.setHours(parseInt(m[1]!, 10), parseInt(m[2]!, 10), 0, 0);
  return d;
}

export interface ShiftSlot {
  time: string;               // 'HH:00'
  period: 'lunch' | 'dinner';
}

/**
 * اسلات‌های ساعتی «امروز» — فقط از دو شیفت ثابت (ناهار/شام)، هرکدام جدا
 * enabled/disabled. هر نشست حداکثر یک ساعت است، پس اسلات‌ها دقیقاً همان
 * ساعت‌های شروع (۱۲،۱۳،...) هستند. اسلاتی که ساعت شروعش گذشته، حذف می‌شود.
 */
export function generateTodaySlots(
  settings: Pick<ReservationSettings, 'lunchEnabled' | 'lunchStartHour' | 'lunchEndHour' | 'dinnerEnabled' | 'dinnerStartHour' | 'dinnerEndHour'>,
  now: Date = new Date(),
): ShiftSlot[] {
  const slots: ShiftSlot[] = [];
  const currentHour = now.getHours();

  if (settings.lunchEnabled) {
    for (let h = settings.lunchStartHour; h < settings.lunchEndHour; h++) {
      if (h > currentHour) slots.push({ time: `${String(h).padStart(2, '0')}:00`, period: 'lunch' });
    }
  }
  if (settings.dinnerEnabled) {
    for (let h = settings.dinnerStartHour; h < settings.dinnerEndHour; h++) {
      if (h > currentHour) slots.push({ time: `${String(h).padStart(2, '0')}:00`, period: 'dinner' });
    }
  }
  return slots;
}

export interface TableForAssignment {
  id: string;
  name: string;
  capacity: number;
  isSocial: boolean;
  isActive: boolean;
}

export interface ExistingSlotReservation {
  tableId: string | null;
  partySize: number;
  status: string;
}

export interface TableAssignment {
  tableId: string;
  tableName: string;
  isSocial: boolean;
}

/**
 * یک میز مناسب برای این تعداد نفر در این اسلات پیدا می‌کند.
 *
 * قانون: میزهای غیرسوشیال فقط به یک رزرو در هر اسلات تعلق می‌گیرند
 * (exclusive) — کوچک‌ترین میزی که جا می‌شود انتخاب می‌شود (best fit، کمترین
 * هدررفت صندلی). اگر هیچ میز غیرسوشیالی جا نداد، میز سوشیال را با ظرفیت
 * باقی‌مانده (capacity منهای مجموع نفرات رزروهای فعال همان اسلات) امتحان می‌کند
 * — چند رزرو جدا می‌توانند هم‌زمان روی میز سوشیال بنشینند.
 */
export function findTableForSlot(
  tables: TableForAssignment[],
  existingAtSlot: ExistingSlotReservation[],
  partySize: number,
): TableAssignment | null {
  const holding = existingAtSlot.filter((r) => (CAPACITY_HOLDING_STATUSES as readonly string[]).includes(r.status));
  const usedByTable = new Map<string, number>();
  for (const r of holding) {
    if (!r.tableId) continue;
    usedByTable.set(r.tableId, (usedByTable.get(r.tableId) ?? 0) + r.partySize);
  }

  const active = tables.filter((t) => t.isActive);

  const nonSocial = active
    .filter((t) => !t.isSocial && t.capacity >= partySize && !usedByTable.has(t.id))
    .sort((a, b) => a.capacity - b.capacity);
  if (nonSocial[0]) return { tableId: nonSocial[0].id, tableName: nonSocial[0].name, isSocial: false };

  const social = active
    .filter((t) => t.isSocial)
    .map((t) => ({ ...t, remaining: t.capacity - (usedByTable.get(t.id) ?? 0) }))
    .filter((t) => t.remaining >= partySize)
    .sort((a, b) => a.remaining - b.remaining);
  if (social[0]) return { tableId: social[0].id, tableName: social[0].name, isSocial: true };

  return null;
}
