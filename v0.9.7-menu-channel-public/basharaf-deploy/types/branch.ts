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
  /** تاریخ شمسی به شکل رشته: 'YYYY/MM/DD' با ارقام فارسی */
  opened: string;
}
