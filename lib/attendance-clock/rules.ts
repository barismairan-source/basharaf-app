/**
 * قواعد خالص (بدون DB) ثبت ورود/خروج — جدا برای آزمون واحد.
 *
 * این‌ها قاعده‌ی «فنی» برای جلوگیری از ثبت اشتباه‌اند، نه قاعده‌ی حقوقی: تأخیر،
 * ارفاق، گرد کردن و اضافه‌کاری اینجا نیست. حقوق فقط از attendance_entries تأییدشده
 * توسط مدیر حساب می‌شود (lib/payroll/attendanceEngine.ts).
 */

/** ورودی که بیش از این باز مانده باشد «ناقص» است و خروج روی آن ثبت نمی‌شود (مدیر دستی ثبت می‌کند). */
export const MAX_OPEN_SHIFT_HOURS = 16;
/** فاصله‌ی کمتر از این بین ورود و خروج، به‌احتمال زیاد لمس اشتباه است. */
export const MIN_SHIFT_SECONDS = 60;
/** مهلت فعال‌سازی لینک شخصی روی گوشی. */
export const LINK_TTL_HOURS = 72;

export type ClockAction = 'clock_in' | 'clock_out';

export interface OpenClockIn { id: string; occurredAt: Date }

export type ClockState =
  | { kind: 'out' }
  | { kind: 'in'; since: Date; eventId: string }
  | { kind: 'stale'; since: Date; eventId: string };

/**
 * وضعیت فعلی نفر از روی آخرین «ورود بدون خروج».
 * stale = ورود قدیمی‌تر از MAX_OPEN_SHIFT_HOURS — ناقص؛ ورود جدید مجاز است.
 */
export function clockStateFrom(open: OpenClockIn | null, now: Date): ClockState {
  if (!open) return { kind: 'out' };
  const ageMs = now.getTime() - open.occurredAt.getTime();
  if (ageMs > MAX_OPEN_SHIFT_HOURS * 3600_000) return { kind: 'stale', since: open.occurredAt, eventId: open.id };
  return { kind: 'in', since: open.occurredAt, eventId: open.id };
}

export type ClockDecision =
  | { ok: true; action: 'clock_in' }
  | { ok: true; action: 'clock_out'; pairedInEventId: string; inAt: Date }
  | { ok: false; code: 'ALREADY_IN' | 'NOT_IN' | 'TOO_SOON'; message: string };

export function decideClock(action: ClockAction, state: ClockState, now: Date): ClockDecision {
  if (action === 'clock_in') {
    if (state.kind === 'in') {
      return { ok: false, code: 'ALREADY_IN', message: `ورود شما قبلاً ساعت ${tehranHHMM(state.since)} ثبت شده است.` };
    }
    return { ok: true, action: 'clock_in' };
  }
  if (state.kind === 'out') {
    return { ok: false, code: 'NOT_IN', message: 'ورود فعالی برای شما ثبت نشده است؛ اول «ورود» را بزنید.' };
  }
  if (state.kind === 'stale') {
    return {
      ok: false, code: 'NOT_IN',
      message: `ورود قبلی شما (${tehranHHMM(state.since)}) خیلی وقت پیش بوده و ناقص مانده؛ به مدیر بگویید آن را ثبت کند.`,
    };
  }
  if (now.getTime() - state.since.getTime() < MIN_SHIFT_SECONDS * 1000) {
    return { ok: false, code: 'TOO_SOON', message: 'کمتر از یک دقیقه از ورود گذشته است.' };
  }
  return { ok: true, action: 'clock_out', pairedInEventId: state.eventId, inAt: state.since };
}

const TEHRAN_TZ = 'Asia/Tehran';

/** تاریخ میلادی YYYY-MM-DD و ساعت HH:MM به‌وقت تهران — مستقل از timezone سرور. */
export function tehranParts(at: Date): { date: string; hhmm: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TEHRAN_TZ, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hhmm: `${get('hour')}:${get('minute')}` };
}

function tehranHHMM(at: Date): string {
  return tehranParts(at).hhmm;
}

/**
 * یک جفت ورود/خروج → فیلدهای ردیف پیش‌نویس attendance_entries.
 * روز کاری = روزِ ورود (به وقت تهران)؛ اگر خروج روز بعد باشد crossesMidnight.
 * ثانیه‌ها کنار گذاشته می‌شوند چون ستون‌های موجود HH:MM هستند (گرد کردن نیست).
 */
export function pairToEntryFields(inAt: Date, outAt: Date): { workDate: string; clockIn: string; clockOut: string; crossesMidnight: boolean } {
  const a = tehranParts(inAt);
  const b = tehranParts(outAt);
  return { workDate: a.date, clockIn: a.hhmm, clockOut: b.hhmm, crossesMidnight: b.date !== a.date };
}

/** «HH:MM» → دقیقه از نیمه‌شب */
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** از بین شیفت‌های برنامه‌ریزی‌شده‌ی آن روز، نزدیک‌ترین شروع به ساعت ورود. */
export function pickClosestAssignment<T extends { plannedStartTime: string }>(assignments: T[], clockIn: string): T | null {
  if (assignments.length === 0) return null;
  const target = hhmmToMinutes(clockIn);
  const dist = (t: string) => {
    const d = Math.abs(hhmmToMinutes(t) - target);
    return Math.min(d, 1440 - d);
  };
  return [...assignments].sort((x, y) => dist(x.plannedStartTime) - dist(y.plannedStartTime))[0] ?? null;
}
