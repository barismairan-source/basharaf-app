import { jalaliToDate } from '@/lib/jalali';
import type { ReservationSettings } from '@/lib/db/schema';

/** وضعیت‌هایی که ظرفیت امروز را اشغال می‌کنند — طبق قانون پروژه. */
export const CAPACITY_HOLDING_STATUSES = ['pending', 'confirmed', 'seated'] as const;

function parseHHMM(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return null;
  const h = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  return h * 60 + mm;
}

/** ترکیب تاریخ شمسی + 'HH:mm' به Date واقعی (فقط برای ستون سیستمی reserveAt). null اگر نامعتبر. */
export function jalaliSlotToDate(jalaliDate: string, time: string): Date | null {
  const base = jalaliToDate(jalaliDate);
  const minutes = parseHHMM(time);
  if (!base || minutes === null) return null;
  const d = new Date(base);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

export interface TodayAvailability {
  open: boolean;
  remainingTables: number;
}

/**
 * وضعیت رزرو «امروز» یک شعبه — مدل ساده: یک کلید روشن/خاموش دستی +
 * سقف تعداد میز. جمع رزروهای فعال امروز (pending/confirmed/seated) با
 * tableCount مقایسه می‌شود؛ هیچ مفهوم اسلات زمانی/روز آینده‌ای در کار نیست.
 */
export function computeTodayAvailability(
  settings: Pick<ReservationSettings, 'isPublicEnabled' | 'tableCount'>,
  activeCountToday: number,
): TodayAvailability {
  if (!settings.isPublicEnabled) return { open: false, remainingTables: 0 };
  const remaining = Math.max(0, settings.tableCount - activeCountToday);
  return { open: remaining > 0, remainingTables: remaining };
}
