/**
 * یک شعبه — به‌عنوان مثال «شعبه اصلی»، «شعبه تجریش»
 *
 * `id` کلید اصلی است و در تراکنش‌ها به‌عنوان `branchId` و در کاربران
 * به‌عنوان `assignedBranch` ارجاع می‌شود.
 */
export interface Branch {
  id: string;
  name: string;
  address: string;
  manager: string;
  /** تاریخ شمسی — تاریخ ثبت/افتتاح شعبه */
  opened: string;
  /** تاریخ شمسی nullable — تاریخ شروع بهره‌برداری (از این تاریخ گزارش عملیاتی شروع می‌شود) */
  openingDate: string | null;
}
