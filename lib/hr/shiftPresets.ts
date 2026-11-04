/** شیفت‌های پرکاربرد مغازه برای جدول هفتگی (از برنامه‌ی شیفت صفاسیتی). ساعت دلخواه هم در جدول ممکن است. */
export interface ShiftPreset { key: string; label: string; start: string; end: string; crossesMidnight: boolean }

export const SHIFT_PRESETS: ShiftPreset[] = [
  { key: 'morning', label: 'صبح', start: '10:00', end: '17:00', crossesMidnight: false },
  { key: 'night', label: 'شب', start: '17:00', end: '00:30', crossesMidnight: true },
];

/** برچسب کوتاه یک شیفت در خانه‌ی جدول: نام پیش‌فرض، یا خود ساعت. */
export function shiftCellLabel(start: string, end: string): string {
  const p = SHIFT_PRESETS.find((x) => x.start === start && x.end === end);
  return p ? p.label : `${start}–${end}`;
}

/** برای «کپی از هفته‌ی قبل»: هر شیفت ۷ روز جلوتر؛ جایی که همان نفر در همان روز و ساعت شیفت دارد تکرار نمی‌شود. */
export function shiftsToCopy<T extends { employeeId: string; workDate: string; plannedStartTime: string; plannedEndTime: string }>(
  previous: T[], current: Array<Pick<T, 'employeeId' | 'workDate' | 'plannedStartTime' | 'plannedEndTime'>>,
): Array<T & { targetDate: string }> {
  const plus7 = (d: string) => new Date(Date.parse(d + 'T00:00:00Z') + 7 * 86400000).toISOString().slice(0, 10);
  return previous
    .map((s) => ({ ...s, targetDate: plus7(s.workDate) }))
    .filter((s) => !current.some((c) => c.employeeId === s.employeeId && c.workDate === s.targetDate && c.plannedStartTime === s.plannedStartTime && c.plannedEndTime === s.plannedEndTime));
}
