import { jalaliToDate } from '@/lib/jalali';
import { tehranNow, ymdWeight, type TehranNow } from './tehranTime';
import type { ReservationSettings } from '@/lib/db/schema';

/** وضعیت‌هایی که ظرفیت یک میز/بازه را اشغال می‌کنند — طبق قانون پروژه. */
export const CAPACITY_HOLDING_STATUSES = ['pending', 'confirmed', 'seated'] as const;

/** هر رزرو دقیقاً همین مدت را اشغال می‌کند (دقیقه). */
export const RESERVATION_DURATION_MINUTES = 60;

/** ترکیب تاریخ شمسی + 'HH:mm' به Date واقعی. null اگر نامعتبر. */
export function jalaliSlotToDate(jalaliDate: string, time: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const base = jalaliToDate(jalaliDate);
  if (!base || !m) return null;
  const d = new Date(base);
  d.setHours(parseInt(m[1]!, 10), parseInt(m[2]!, 10), 0, 0);
  return d;
}

/** بازه‌ی زمانی یک رزرو/اسلات (شروع + پایان دقیقاً ۶۰ دقیقه بعد). null اگر تاریخ/ساعت نامعتبر. */
export function reservationInterval(jalaliDate: string, time: string): { start: Date; end: Date } | null {
  const start = jalaliSlotToDate(jalaliDate, time);
  if (!start) return null;
  const end = new Date(start.getTime() + RESERVATION_DURATION_MINUTES * 60_000);
  return { start, end };
}

/** دو بازه تداخل دارند وقتی شروع هرکدام قبل از پایان دیگری باشد (نیم‌بسته — لحظه‌ی پایان اولی = شروع دومی یعنی بدون تداخل). */
export function intervalsOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

/** روز هفته‌ی یک تاریخ شمسی — 0=یکشنبه..6=شنبه. null اگر تاریخ نامعتبر. */
export function jalaliWeekday(jalaliDate: string): number | null {
  const d = jalaliToDate(jalaliDate);
  return d ? d.getDay() : null;
}

/** آیا این تاریخ شمسی (نسبت به «امروز» به‌وقت تهران) گذشته است؟ */
export function isPastJalaliDate(jalaliDate: string, now: TehranNow = tehranNow()): boolean {
  const d = jalaliToDate(jalaliDate);
  if (!d) return true;
  return ymdWeight(d.getFullYear(), d.getMonth() + 1, d.getDate()) < ymdWeight(now.year, now.month, now.day);
}

/** آیا این تاریخ شمسی همان «امروز» تهران است؟ */
export function isTodayJalaliDate(jalaliDate: string, now: TehranNow = tehranNow()): boolean {
  const d = jalaliToDate(jalaliDate);
  if (!d) return false;
  return ymdWeight(d.getFullYear(), d.getMonth() + 1, d.getDate()) === ymdWeight(now.year, now.month, now.day);
}

export interface DaySlot {
  time: string; // 'HH:00'
}

/**
 * اسلات‌های ساعتی یک تاریخ مشخص — یک بازه‌ی فعالیت روزانه (نه دو شیفت جدا)،
 * از openHour تا closeHour (نیم‌بسته). اگر closeHour تنظیم نشده (مدیر هنوز
 * فعالش نکرده)، یا آن روز هفته تعطیل است، یا تاریخ گذشته است → آرایه‌ی خالی.
 * اگر تاریخ «امروز» (تهران) باشد، اسلات‌هایی که ساعت شروعشان گذشته حذف می‌شوند.
 */
export function generateSlotsForDate(
  settings: Pick<ReservationSettings, 'openHour' | 'closeHour' | 'closedWeekdays'>,
  jalaliDate: string,
  now: TehranNow = tehranNow(),
): DaySlot[] {
  if (settings.closeHour == null) return [];
  if (isPastJalaliDate(jalaliDate, now)) return [];
  const weekday = jalaliWeekday(jalaliDate);
  if (weekday == null) return [];
  if (settings.closedWeekdays.includes(weekday)) return [];

  const today = isTodayJalaliDate(jalaliDate, now);
  const slots: DaySlot[] = [];
  for (let h = settings.openHour; h < settings.closeHour; h++) {
    if (today && h <= now.hour) continue; // اسلاتی که ساعت شروعش گذشته
    slots.push({ time: `${String(h).padStart(2, '0')}:00` });
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

export interface ExistingReservationForCapacity {
  id?: string;
  tableId: string | null;
  partySize: number;
  status: string;
  start: Date;
  end: Date;
}

export interface TableBlockForCapacity {
  tableId: string;
  start: Date;
  end: Date;
}

export interface TableAssignment {
  tableId: string;
  tableName: string;
  isSocial: boolean;
}

/**
 * یک میز مناسب برای این تعداد نفر در این بازه‌ی زمانی پیدا می‌کند.
 *
 * قانون: میزهای غیرسوشیال فقط به یک رزرو هم‌پوشان تعلق می‌گیرند (exclusive) —
 * کوچک‌ترین میزی که جا می‌شود انتخاب می‌شود (best fit). اگر هیچ میز غیرسوشیالی
 * جا نداد، میز سوشیال را با ظرفیت باقی‌مانده (capacity منهای مجموع نفرات
 * رزروهای هم‌پوشان همان میز) امتحان می‌کند — چند رزرو جدا می‌توانند هم‌زمان
 * روی میز سوشیال بنشینند. مسدودی یک میز برای بازه‌ی هم‌پوشان، کل ظرفیت آن میز
 * را اشغال‌شده حساب می‌کند (رزرو نمی‌تواند رویش بنشیند).
 *
 * excludeReservationId: برای ویرایش یک رزرو موجود — خودش را نباید با خودش
 * تداخل‌دار حساب کند.
 *
 * tableType: کاربر توی فرم عمومی صریحاً نوع میز را انتخاب می‌کند (طبق سند —
 * «رضایت به میز سوشیال نباید از قبل انتخاب شده باشد»)، پس اینجا خودکار بین
 * دو نوع سوییچ نمی‌کنیم:
 *  - 'normal': فقط میزهای غیرسوشیال بررسی می‌شوند؛ اگر جا نشد، null (حتی اگر
 *    سوشیال خالی باشد — آن باید جداگانه به کاربر پیشنهاد شود، نه اینجا).
 *  - 'social': فقط میز سوشیال بررسی می‌شود.
 *  - 'any' (پیش‌فرض): برای چک‌های داخلی «اصلاً چیزی برای این بازه هست یا نه»
 *    — اول غیرسوشیال، بعد سوشیال.
 */
export function findTableForInterval(
  tables: TableForAssignment[],
  existing: ExistingReservationForCapacity[],
  blocks: TableBlockForCapacity[],
  target: { start: Date; end: Date },
  partySize: number,
  excludeReservationId?: string,
  tableType: 'normal' | 'social' | 'any' = 'any',
): TableAssignment | null {
  const overlapping = existing.filter(
    (r) =>
      (CAPACITY_HOLDING_STATUSES as readonly string[]).includes(r.status) &&
      (!excludeReservationId || r.id !== excludeReservationId) &&
      intervalsOverlap(r.start, r.end, target.start, target.end),
  );
  const overlappingBlocks = blocks.filter((b) => intervalsOverlap(b.start, b.end, target.start, target.end));
  const blockedTableIds = new Set(overlappingBlocks.map((b) => b.tableId));

  const usedByTable = new Map<string, number>();
  for (const r of overlapping) {
    if (!r.tableId) continue;
    usedByTable.set(r.tableId, (usedByTable.get(r.tableId) ?? 0) + r.partySize);
  }

  const active = tables.filter((t) => t.isActive && !blockedTableIds.has(t.id));

  if (tableType !== 'social') {
    const nonSocial = active
      .filter((t) => !t.isSocial && t.capacity >= partySize && !usedByTable.has(t.id))
      .sort((a, b) => a.capacity - b.capacity);
    if (nonSocial[0]) return { tableId: nonSocial[0].id, tableName: nonSocial[0].name, isSocial: false };
    if (tableType === 'normal') return null;
  }

  const social = active
    .filter((t) => t.isSocial)
    .map((t) => ({ ...t, remaining: t.capacity - (usedByTable.get(t.id) ?? 0) }))
    .filter((t) => t.remaining >= partySize)
    .sort((a, b) => a.remaining - b.remaining);
  if (social[0]) return { tableId: social[0].id, tableName: social[0].name, isSocial: true };

  return null;
}

/** آیا یک میز مشخص (نه اتوماتیک) برای این بازه/تعداد نفر جا دارد؟ برای رزرو دستی پنل با میز صریح. */
export function checkSpecificTableCapacity(
  table: TableForAssignment,
  existing: ExistingReservationForCapacity[],
  blocks: TableBlockForCapacity[],
  target: { start: Date; end: Date },
  partySize: number,
  excludeReservationId?: string,
): { ok: true } | { ok: false; reason: string } {
  if (!table.isActive) return { ok: false, reason: 'این میز غیرفعال است' };
  if (partySize > table.capacity) return { ok: false, reason: `ظرفیت این میز ${table.capacity} نفر است` };

  const blocked = blocks.some(
    (b) => b.tableId === table.id && intervalsOverlap(b.start, b.end, target.start, target.end),
  );
  if (blocked) return { ok: false, reason: 'این میز در این بازه مسدود است' };

  const overlapping = existing.filter(
    (r) =>
      r.tableId === table.id &&
      (CAPACITY_HOLDING_STATUSES as readonly string[]).includes(r.status) &&
      (!excludeReservationId || r.id !== excludeReservationId) &&
      intervalsOverlap(r.start, r.end, target.start, target.end),
  );

  if (!table.isSocial) {
    if (overlapping.length > 0) return { ok: false, reason: 'این میز در این بازه رزرو دیگری دارد' };
    return { ok: true };
  }

  const used = overlapping.reduce((sum, r) => sum + r.partySize, 0);
  if (used + partySize > table.capacity) {
    return { ok: false, reason: `ظرفیت باقی‌مانده‌ی میز سوشیال در این بازه ${table.capacity - used} نفر است` };
  }
  return { ok: true };
}

/** بزرگ‌ترین ظرفیت تک‌میزی فعال — برای رد فوری گروه‌هایی که ساختاری جا نمی‌شوند (رزرو چندمیزی در v1 غیرفعال است). */
export function maxSingleTableCapacity(tables: Pick<TableForAssignment, 'capacity' | 'isActive'>[]): number {
  return tables.filter((t) => t.isActive).reduce((max, t) => Math.max(max, t.capacity), 0);
}
