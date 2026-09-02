/**
 * منطق خالص «مقدار پیشنهادی سفارش» — جدا از route تا بدون DB قابل تست باشد.
 * دو سیگنال را می‌بیند و بیشترین را انتخاب می‌کند:
 *   ۱) کمبود تا حداقل موجودی (رفتار قدیمی — همیشه فعال)
 *   ۲) ریتم واقعی مصرف اخیر × بازه‌ی پوشش تا چرخه‌ی بعدی شمارش
 * اگر تاریخچه‌ی مصرف نباشد، سیگنال ۲ صفر می‌شود و بی‌صدا فقط سیگنال ۱ اثر دارد.
 */

export interface SuggestionInput {
  qtyPhysical: number;
  minBase: number;
  countCycle: 'daily' | 'weekly';
  /** مجموع مصرف (out+waste+sale) در پنجره‌ی نگاه به گذشته، واحد پایه */
  totalConsumedBase: number;
  lookbackDays: number;
}

export interface SuggestionResult {
  suggestedBase: number;
  avgDailyConsumption: number;
  demandDriven: boolean;
}

/** بازه‌ی پوشش تا چرخه‌ی بعدی شمارش + کمی حاشیه‌ی امن — روزانه کوتاه، هفتگی بلندتر. */
export function coverageDaysForCycle(countCycle: 'daily' | 'weekly'): number {
  return countCycle === 'daily' ? 2 : 8;
}

export function computeSuggestion(input: SuggestionInput): SuggestionResult {
  const deficitBase = input.minBase - input.qtyPhysical;
  const avgDailyConsumption = input.lookbackDays > 0 ? input.totalConsumedBase / input.lookbackDays : 0;
  const coverageDays = coverageDaysForCycle(input.countCycle);
  const demandBase = avgDailyConsumption * coverageDays - input.qtyPhysical;

  const suggestedBase = Math.max(deficitBase, demandBase);
  const demandDriven = demandBase > deficitBase && avgDailyConsumption > 0;

  return { suggestedBase, avgDailyConsumption, demandDriven };
}
