/**
 * توابع خالص معناشناسی معیارهای داشبورد — جدا از کامپوننت‌ها تا بدون رندر
 * DOM قابل تست باشند. قانون مشترک همه‌ی این‌ها: «صفر» و «داده‌ای نیست»
 * دو مقدار متفاوتند؛ هیچ‌کدام نباید بی‌صدا به‌جای دیگری نمایش داده شود.
 */

/**
 * میانگین هر فاکتور فروش. اگر هنوز هیچ فاکتوری ثبت نشده (invoiceCount=0)،
 * `null` برمی‌گرداند — نه صفر تومان و نه NaN. تقسیم بر صفر همیشه یک
 * حالت «قابل‌محاسبه نیست» است، نه یک عدد.
 */
export function computeAvgTicket(revenue: number, invoiceCount: number): number | null {
  if (invoiceCount <= 0) return null;
  return Math.round(revenue / invoiceCount);
}

/**
 * آیا امروز واقعاً هیچ فعالیت مالی/عملیاتی ثبت نشده؟ اگر بله، به‌جای
 * گرید صفرهای بی‌معنی، یک حالت خالی راهنما نشان داده می‌شود.
 */
export function isNothingHappenedToday(flash: {
  revenue: number;
  invoiceCount: number;
  cogs: number;
  wasteTotal: number;
}): boolean {
  return flash.revenue === 0 && flash.invoiceCount === 0 && flash.cogs === 0 && flash.wasteTotal === 0;
}

/**
 * درصد تغییر current نسبت به دوره‌ی قبل. اگر مبنای قبلی صفر باشد،
 * درصد قابل‌تعریف نیست مگر current هم صفر باشد (که یعنی «بدون تغییر»،
 * ۰٪) — تقسیم بر صفر هرگز یک درصد ساختگی برنمی‌گرداند.
 *
 * `previous === null` یعنی اصلاً داده‌ی دوره‌ی قبل موجود/درخواست‌شده نیست
 * (نه این‌که صفر بوده) → همیشه null.
 */
export function computeChangePct(current: number, previous: number | null): number | null {
  if (previous === null) return null;
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}
