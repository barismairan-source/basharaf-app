# یکپارچه‌سازی «منابع انسانی» — راهنمای استقرار (Rollout)

این سند فقط راهنماست — **هیچ‌کدام از مراحل زیر در طول این نشست اجرا نشده‌اند.** جزئیات معماری/تصمیم‌های هر فاز در `project-docs/HR-UNIFICATION-IMPLEMENTATION.md`.

---

## ۱. پیش‌نیازها

- یک backup تازه از دیتابیس واقعی (`liara db backup create` یا معادل).
- تأیید این‌که migration فاز حقوق ساعتی قبلی (`db-hourly-attendance-payroll.sql`) قبلاً روی این دیتابیس اجرا شده — چون یکی از migrationهای این فاز (`db-hr-compensation-mode.sql`) به جدول `employee_hourly_rates` (ساخته‌شده در آن migration) نیاز دارد.
- دسترسی pgAdmin (یا معادل) برای اجرای دستی SQL — همان الگوی همیشگی این پروژه؛ هیچ اسکریپت خودکار migration-runner برای این فاز ساخته نشد (توضیح در بخش ۷).

## ۲. ترتیب اجرای migrationها

هر فایل idempotent است (اجرای دوباره‌اش خطا نمی‌دهد)؛ ترتیب پیشنهادی زیر بر اساس فاز است، ولی چون هرکدام فقط به جدول‌های *هسته* (نه به هم) وابسته‌اند، تقدم/تأخر بین آیتم‌های ۲ تا ۵ مشکلی ایجاد نمی‌کند:

1. `project-docs/migrations/db-hr-compensation-mode.sql` — enum `compensation_type` + ستون `employees.compensation_type` + جدول `employee_compensation_type_changes` + backfill (کارمندان دارای نرخ ساعتی → `hourly`).
2. `project-docs/migrations/db-hr-attendance-integrity.sql` — **فقط SELECT، بدون تغییر schema** — می‌تواند هر زمان (قبل/بعد) اجرا شود.
3. `project-docs/migrations/db-hr-job-titles.sql` — جدول `job_titles` + seed ۹ سمت پیش‌فرض.
4. `project-docs/migrations/db-hr-recruitment-employee-link.sql` — `job_applications.hired_at`/`hired_by` + `employees.source_application_id`.
5. `project-docs/migrations/db-hr-employee-user-link.sql` — `employees.user_id`.

## ۳. queryهای پیش‌بررسی (قبل از اجرا، برای هر فایل داخل خودش هم هست)

```sql
-- قبل از #1: چند کارمند از قبل نرخ ساعتی دارند؟ (این‌ها بعد از migration hourly می‌شوند)
SELECT COUNT(DISTINCT employee_id) FROM employee_hourly_rates;

-- قبل از #3: سمت‌های واقعی فعلی (شامل سفارشی‌های اضافه‌شده از تنظیمات) — با seed مقایسه کنید
SELECT role, COUNT(*) FROM employees GROUP BY role ORDER BY COUNT(*) DESC;

-- قبل از #4: کارمندانی که با مکانیزم قدیمی (تطبیق تلفن، قبل از این فاز) ساخته شده‌اند
-- و اتصال واقعی به متقاضی ندارند — تصمیم دستی برای backfill با شماست
SELECT e.id AS employee_id, e.full_name, e.phone, ja.id AS application_id
  FROM employees e JOIN job_applications ja ON ja.phone = e.phone
  WHERE e.source_application_id IS NULL;
```

## ۴. queryهای پس‌بررسی

```sql
SELECT compensation_type, COUNT(*) FROM employees GROUP BY compensation_type;
SELECT COUNT(*) FROM job_titles;
SELECT COUNT(*) FROM employees WHERE source_application_id IS NOT NULL;
SELECT COUNT(*) FROM employees WHERE user_id IS NOT NULL;
```

## ۵. مراحل استقرار کد (بعد از تأیید صریح شما)

۱. بررسی/merge نهایی PR شاخه‌ی `feat/hr-workspace-unification` به `main` (این خودش یک مرحله‌ی جدا و نیازمند تأیید شماست).
۲. اجرای ۵ migration بالا به ترتیب، هرکدام با بررسی خروجی «تأیید» در انتهای فایل.
۳. Deploy کد (GitHub Actions موجود پروژه، طبق روال فعلی).
۴. Smoke test (بخش ۶).

## ۶. Smoke Test پیشنهادی (بعد از deploy)

- ورود با یک کاربر SuperAdmin → گروه «منابع انسانی» در سایدبار دیده می‌شود، نه دیگر ۵ آیتم پراکنده.
- بازکردن هرکدام از مسیرهای قدیمی (`/employees`, `/payroll`, `/recruitment`, `/shift-schedule`, `/attendance`) → باید بی‌درنگ به معادل جدید `/hr/*` هدایت شوند.
- `/hr` → کارت‌های «نیازمند اقدام» و شاخص‌ها بدون خطا لود می‌شوند.
- `/hr/people` → فیلترها کار می‌کنند؛ کلیک روی یک ردیف → پرونده‌ی ۳۶۰ درجه باز می‌شود.
- برای یک کارمند ساعتی، تب «حقوق و نرخ‌ها» نرخ فعلی را نشان می‌دهد.
- `/hr/time` → هر ۴ تب (برنامه شیفت/ثبت حضور/تأییدها/گزارش کارکرد) بدون خطا لود می‌شوند.
- ثبت یک شیفت تستی + یک حضور تستی + تأیید آن + محاسبه‌ی یک اجرای حقوق تستی → مبلغ محاسبه‌شده منطقی است و از حسابداری قبلی جدا نشده.
- در `/hr/recruitment`، یک متقاضی تستی «تبدیل به پرسنل» شود → پرونده‌ی پرسنلی جدید ساخته و redirect می‌شود؛ تلاش دوباره برای همان متقاضی رد می‌شود (۴۰۹).
- در پرونده‌ی همان کارمند تازه‌ساخته‌شده، تب «منبع استخدام» اطلاعات واقعی نشان می‌دهد.
- در تب «حساب کاربری و دسترسی» یک کارمند، اتصال به یک کاربر تستی و قطع اتصال هر دو کار می‌کنند.

## ۷. چرا اسکریپت backfill/cleanup جدا (با `HR_MIGRATION_CONFIRM`) ساخته نشد

بر خلاف فاز قبلی (سیستم حقوق ساعتی) که یک عملیات واقعاً مخرب (حذف اجراهای حقوق ماهانه‌ی قدیمی) نیاز داشت و به همین دلیل اسکریپت `scripts/reset-payroll-to-hourly.ts` با dry-run پیش‌فرض ساخته شد، **هیچ‌کدام از ۵ migration این فاز داده‌ای را حذف یا به‌طور غیرقابل‌بازگشت تغییر نمی‌دهند** — همه فقط ستون/جدول جدید nullable اضافه می‌کنند، به‌جز یک `UPDATE` امن و idempotent (backfill نوع حقوق، که خودش چندین‌بار اجرا هم بی‌خطر است چون فقط `WHERE compensation_type='monthly' AND ...` را تغییر می‌دهد). به همین دلیل، به‌جای ساختن ابزار جدید بدون نیاز واقعی، همان قرارداد `HR_MIGRATION_CONFIRM=APPLY_HR_UNIFICATION` که در دستور اصلی پیشنهاد شده بود، **در همین‌جا مستند می‌شود** تا اگر بعداً یک ابزار خودکار اجرای این migrationها ساخته شد، از همین قرارداد استفاده کند — ولی برای اجرای دستی این ۵ فایل .sql (که سبک همیشگی این پروژه است)، نیازی به آن token نبود.

## ۸. روش تشخیص داده‌ی تکراری (کارمند دوبار ساخته‌شده)

- بعد از فاز ۷، مسیر تکراریِ ساخت کارمند از استخدام (اتوماتیک هنگام «قبول‌کردن») **حذف شد** — از این پس فقط `POST /api/hr/recruitment/[id]/hire` این کار را می‌کند و خودش اتمیک/تکرارناپذیر است.
- برای رکوردهای **قبل از این فاز** (که ممکن است با مکانیزم قدیمی دوبار ساخته شده باشند)، کوئری زیر کاندیدها را نشان می‌دهد:
  ```sql
  SELECT phone, COUNT(*) FROM employees WHERE is_active = true GROUP BY phone HAVING COUNT(*) > 1;
  ```
  هر ردیفی که برگرداند نیاز به بررسی دستی دارد (کدام رکورد را نگه دارید/غیرفعال کنید) — تصمیم انسانی، نه خودکار.

## ۹. روش اصلاح حضورهای ناسازگار/هم‌پوشان

- گزارش خواندنی: `project-docs/migrations/db-hr-attendance-integrity.sql` (سه کوئری SELECT).
- گزارش زنده در اپ: `GET /api/hr/payroll/readiness` (فیلد `overlappingAttendanceDays`) و تب «تأییدها» در `/hr/time`.
- اصلاح: فقط دستی، از همان صفحه‌ی «ثبت حضور» (ویرایش رکورد نادرست یا حذف آن، پیش از قفل‌شدن). هیچ عملیات خودکار «رفع هم‌پوشانی» وجود ندارد و عمداً ساخته نشد — چون تشخیص «کدام رکورد درست است» نیازمند قضاوت انسانی است.

## ۱۰. مواردی که نیازمند تصمیم مالک هستند

1. آیا `job_titles` باید جایگزین تنظیمات JSON فعلی سمت‌ها شود؟ (نیازمند بررسی خروجی کوئری بخش ۳ برای سمت‌های سفارشی، و migration/UI جدا).
2. آیا افزودن مقدار enum واقعی `'offer'`/`'hired'` به `application_status` (به‌جای معیار فعلی `hired_at IS NOT NULL`) ارزش تغییر همزمان UI کانبان استخدام را دارد؟
3. آیا کارمندان تکراری شناسایی‌شده در بخش ۸ باید دستی ادغام/غیرفعال شوند؟
4. آیا نمای هفتگی شبکه‌ای واقعی برای برنامه شیفت (فاز ۱۰، انجام‌نشده) اولویت دارد؟
5. آیا مدیریت مدارک پرسنل (آپلود/مشاهده — کاملاً غایب در کل پروژه) باید به‌عنوان یک قابلیت جدید ساخته شود؟

## ۱۱. Rollback

هر فایل migration بخش «بازگشت» خودش را در انتها دارد (`DROP TABLE`/`DROP COLUMN`/`DROP INDEX`). برای rollback کد: از آن‌جا که این فاز هنوز به `main` merge نشده، صرفاً branch را نادیده بگیرید یا merge commit را (اگر انجام شد) revert کنید.
