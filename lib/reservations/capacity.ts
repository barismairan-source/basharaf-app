import { jalaliToDate } from '@/lib/jalali';
import type { ReservationSettings } from '@/lib/db/schema';
import type { PublicReservationSlot } from '@/types';

/** وضعیت‌هایی که ظرفیت اسلات را اشغال می‌کنند — طبق قانون پروژه. */
export const CAPACITY_HOLDING_STATUSES = ['pending', 'confirmed', 'seated'] as const;

function parseHHMM(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

function formatHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** لیست اسلات‌های زمانی یک روز طبق تنظیمات (بدون در نظر گرفتن ظرفیت/رزروهای موجود). */
export function generateSlotTimes(settings: Pick<ReservationSettings, 'openTime' | 'closeTime' | 'slotMinutes'>): string[] {
  const open = parseHHMM(settings.openTime);
  const close = parseHHMM(settings.closeTime);
  const step = settings.slotMinutes > 0 ? settings.slotMinutes : 30;
  if (open === null || close === null || close <= open) return [];
  const slots: string[] = [];
  for (let t = open; t < close; t += step) slots.push(formatHHMM(t));
  return slots;
}

/** ترکیب تاریخ شمسی + 'HH:mm' به Date واقعی (برای مقایسه با now). null اگر نامعتبر. */
export function jalaliSlotToDate(jalaliDate: string, time: string): Date | null {
  const base = jalaliToDate(jalaliDate);
  const minutes = parseHHMM(time);
  if (!base || minutes === null) return null;
  const d = new Date(base);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export interface DateBookabilityResult {
  ok: boolean;
  reason?: string;
}

/** آیا این تاریخ (بدون توجه به ساعت خاص) اصلاً قابل رزرو است؟ (روز کاری + blackout + سقف روزهای آینده) */
export function isDateBookable(
  settings: ReservationSettings,
  jalaliDate: string,
  now: Date = new Date(),
): DateBookabilityResult {
  const day = jalaliToDate(jalaliDate);
  if (!day) return { ok: false, reason: 'تاریخ نامعتبر است' };

  if (settings.blackoutDates.includes(jalaliDate)) {
    return { ok: false, reason: 'رزرو در این تاریخ بسته است' };
  }
  if (settings.workingDays && settings.workingDays.length > 0 && !settings.workingDays.includes(day.getDay())) {
    return { ok: false, reason: 'در این روز از هفته رزرو فعال نیست' };
  }
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + settings.maxLeadDays);
  maxDate.setHours(23, 59, 59, 999);
  if (day > maxDate) {
    return { ok: false, reason: 'این تاریخ هنوز باز نشده است' };
  }
  const minDate = new Date(now);
  minDate.setHours(0, 0, 0, 0);
  if (day < minDate) {
    return { ok: false, reason: 'این تاریخ گذشته است' };
  }
  return { ok: true };
}

/** آیا یک اسلات مشخص (تاریخ+ساعت) هنوز از نظر حداقل فاصله‌ی زمانی قابل رزرو است؟ */
export function isSlotBookable(
  settings: ReservationSettings,
  jalaliDate: string,
  time: string,
  now: Date = new Date(),
): DateBookabilityResult {
  const dateCheck = isDateBookable(settings, jalaliDate, now);
  if (!dateCheck.ok) return dateCheck;
  const slotDate = jalaliSlotToDate(jalaliDate, time);
  if (!slotDate) return { ok: false, reason: 'ساعت نامعتبر است' };
  const minBookable = new Date(now.getTime() + settings.minLeadMinutes * 60_000);
  if (slotDate < minBookable) {
    return { ok: false, reason: 'برای این ساعت دیگر دیر شده است' };
  }
  return { ok: true };
}

/**
 * ظرفیت باقی‌مانده‌ی هر اسلات یک روز، با توجه به رزروهای موجود (فقط
 * وضعیت‌های اشغال‌کننده‌ی ظرفیت — ر.ک. CAPACITY_HOLDING_STATUSES).
 */
export function computeSlotAvailability(
  settings: ReservationSettings,
  jalaliDate: string,
  existingReservations: Array<{ time: string; partySize: number; status: string }>,
  now: Date = new Date(),
): PublicReservationSlot[] {
  const slots = generateSlotTimes(settings);
  const usedByTime = new Map<string, number>();
  for (const r of existingReservations) {
    if (!(CAPACITY_HOLDING_STATUSES as readonly string[]).includes(r.status)) continue;
    usedByTime.set(r.time, (usedByTime.get(r.time) ?? 0) + r.partySize);
  }
  return slots.map((time) => {
    const used = usedByTime.get(time) ?? 0;
    const remaining = Math.max(0, settings.slotCapacityGuests - used);
    const timeOk = isSlotBookable(settings, jalaliDate, time, now).ok;
    return { time, remainingGuests: remaining, available: timeOk && remaining > 0 };
  });
}
