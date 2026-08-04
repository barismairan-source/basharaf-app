# سیستم حقوق ساعتی + برنامه شیفت + حضور و غیاب

وضعیت: پیاده‌سازی کامل روی branch جدا `feat/hourly-attendance-payroll` — **merge/push/deploy/migration نشده**، منتظر تأیید صریح کاربر.

---

## ۱. معماری — سه مفهوم جدا

| مفهوم | جدول | معنی |
|---|---|---|
| شیفت برنامه‌ریزی‌شده | `employee_shift_assignments` | چه‌زمانی *قرار است* کارمند کار کند |
| حضور واقعی | `attendance_entries` | چه‌زمانی *واقعاً* حضور داشته |
| حقوق قابل‌پرداخت | `payslips` (همان جدول قدیمی) | نتیجه‌ی نهایی — فقط از حضور *تأییدشده* محاسبه می‌شود |

انتخاب یک قالب شیفت فقط برنامه را می‌سازد — هرگز خودکار حضور ثبت نمی‌کند. این سه لایه هرگز در کد با هم قاطی نمی‌شوند.

## ۲. مدل داده — ۴ جدول جدید

- **`shift_templates`** — قالب‌های شیفت شعبه (نام، ساعت شروع/پایان، `plannedMinutes` مشتق‌شده، سیاست استراحت، `crossesMidnight`، رنگ). مدت شیفت هیچ‌جا hard-code نیست — کاملاً از ساعت شروع/پایان محاسبه می‌شود.
- **`employee_hourly_rates`** — نرخ ساعتی نسخه‌دار (`effectiveFrom`/`effectiveTo`). ثبت نرخ جدید نرخ قبلی را در روز قبل از تاریخ جدید می‌بندد (بدون همپوشانی)؛ فیش‌های محاسبه‌شده‌ی گذشته چون `hourlyRateSnapshot` را داخل خودشان دارند، هرگز تغییر نمی‌کنند.
- **`employee_shift_assignments`** — تخصیص روزانه؛ **snapshot کامل** از قالب در لحظه‌ی تخصیص (تغییر بعدی قالب اثری روی تخصیص‌های گذشته ندارد). چند شیفت غیرهم‌پوشان در یک روز مجاز است؛ هم‌پوشانی زمانی در لایه‌ی API رد می‌شود (نه با یک unique index ساده، چون آن اجازه‌ی چند شیفت در روز را می‌گرفت).
- **`attendance_entries`** — حضور واقعی؛ `shiftAssignmentId` قابل null (= «حضور بدون شیفت»، عمداً حذف نمی‌شود، فقط برچسب می‌خورد برای بررسی مدیر). ماشین‌حالت `draft → confirmed → locked`.

جزئیات دقیق فیلدها در `lib/db/schema.ts` (کامنت‌های فارسی بالای هر جدول) و migration.

## ۳. فرمول‌های دقیق حقوق

همه در `lib/payroll/attendanceEngine.ts`، گردکردن فقط در `calcAttendancePay`:

```
regularPay  = round(regularMinutes  * hourlyRateSnapshot / 60)
overtimePay = round(overtimeMinutes * hourlyRateSnapshot * overtimeMultiplier / 60)
nightPay    = round(nightMinutes    * hourlyRateSnapshot * nightMultiplier    / 60)
holidayPay  = round(holidayMinutes  * hourlyRateSnapshot * holidayMultiplier  / 60)
```

ضرایب (`overtimeMultiplier`/`nightShiftPremium`/`holidayMultiplier`) از `payroll_parameters` خوانده می‌شوند — هرگز در کد ثابت نیستند (همان پارامترهای موجود سیستم ماهانه، بازاستفاده‌شده).

اگر نرخ میان‌ماه تغییر کند، **هر روز جداگانه با `hourlyRateSnapshot` خودش محاسبه و بعد جمع می‌شود** (`calculateHourlyPayslip` روی هر روز از آرایه‌ی حضور loop می‌زند، نه روی جمع دقایق).

## ۴. سیاست استراحت

```
unpaid      → workedMinutes = totalPresenceMinutes - breakMinutes
paid | none → workedMinutes = totalPresenceMinutes
```

استراحت بیشتر از حضور خام یا منفی رد می‌شود (`applyBreakPolicy`).

## ۵. سیاست اضافه‌کاری

مبنا = `plannedMinutes` همان تخصیص شیفت (روز). حضور بیشتر از برنامه **هرگز حذف/محدود نمی‌شود** — `splitRegularOvertime` همیشه `overtimeMinutes = max(0, worked - planned)` را نگه می‌دارد. اضافه‌کاری فقط وقتی `overtimeApproved=true` باشد وارد `overtimeMinutesTotal`/مبلغ می‌شود؛ در غیر این‌صورت در `overtimePendingMinutesTotal` می‌ماند (گزارشی، برای بررسی مدیر). تأیید اضافه‌کاری فقط با `PATCH /api/attendance/[id]` و فقط توسط SuperAdmin ممکن است.

«حضور بدون شیفت» (بدون تخصیص) یعنی `plannedMinutes=0` → کل حضور به‌صورت اضافه‌کاری پیشنهادی ثبت می‌شود، منتظر تصمیم مدیر.

## ۶. کم‌کاری، مرخصی، غیبت

- کم‌کاری: `regularMinutes = min(worked, planned)` — فقط حضور واقعی پرداخت می‌شود؛ `shortfallMinutes` فقط گزارشی است، هیچ کسر دوم اعمال نمی‌شود.
- `paid_leave`: مدیر مستقیماً دقیقه‌ی قابل‌پرداخت را در `manualWorkedMinutes` وارد می‌کند؛ در فیش جدا از حضور واقعی جمع می‌شود (`paidLeaveMinutesTotal`/خط `paid_leave`).
- `unpaid_leave`/`sick_leave`: مبلغ صفر، دقیقه فقط برای گزارش نگه داشته می‌شود.
- `absent`: مبلغ صفر، `plannedMinutes` روز برای گزارش کسری نگه داشته می‌شود.
- `holiday_work`/`off_day_work`: کل حضور قابل‌پرداخت به‌عنوان تعطیل‌کاری حساب می‌شود (نه تفکیک عادی/اضافه‌کاری) — `deriveHolidayMinutes`.

## ۷. روند تأیید

```
حضور:  draft → confirmed → locked
حقوق:  draft → calculated → approved → posted
```

- فقط `confirmed`/`locked` وارد `calculateHourlyPayslip` می‌شود (کوئری مستقیم از DB در `calculate/route.ts`، **نه از body درخواست**).
- `approve` روی اجرای حقوق، اگر برای کارمندی حضور `draft` باقی‌مانده در همان دوره پیدا کند، رد می‌شود (`UNCONFIRMED_ATTENDANCE`).
- بعد از `post` (ثبت در حسابداری)، حضورهای `confirmed` همان دوره (کارمندهای همان اجرا) خودکار `locked` می‌شوند (`lib/payroll/postToBasharaf.ts`). `reverse` آن‌ها را به `confirmed` برمی‌گرداند (چون دوره دوباره قابل اصلاح/محاسبه‌ی مجدد می‌شود).
- `locked` از مسیرهای عادی PATCH/DELETE قابل‌تغییر نیست (`canEditAttendance`).

## ۸. دسترسی‌ها (تصمیم مهندسی — چون این پروژه فقط ۴ نقش دارد)

- نرخ ساعتی، تأیید حضور، محاسبه/تأیید/ثبت حقوق: **فقط SuperAdmin** (همان محدودیت سیستم ماهانه‌ی موجود — یک نقش «مدیر ارشد» جدا در این پروژه وجود ندارد).
- ثبت/ویرایش شیفت و حضور (پیش‌نویس): SuperAdmin و BranchUser، هرکدام فقط برای شعبه‌ی خودشان (BranchUser نمی‌تواند شعبه‌ی دیگر را ببیند/تغییر دهد — چک سمت سرور در همه‌ی route ها، نه فقط مخفی‌کردن دکمه).
- همه‌ی این محدودیت‌ها در API (`requireAdmin`/`requireRole`) اجرا می‌شوند، مستقل از UI.

## ۹. سازگاری با سیستم فعلی

- `lib/payroll/payrollEngine.ts` و `calculatePayslip` **بدون هیچ تغییری** باقی ماندند — کارمندهای بدون نرخ ساعتی دقیقاً مثل قبل با سیستم ماهانه محاسبه می‌شوند.
- `app/api/payroll/runs/[id]/calculate/route.ts`: برای هر کارمند چک می‌شود آیا در `employee_hourly_rates` رکورد دارد؛ اگر بله → مسیر ساعتی (`calculateHourlyPayslip`)، اگر نه → همان مسیر ماهانه‌ی قبلی. یک اجرای حقوق می‌تواند مخلوطی از هر دو نوع کارمند را داشته باشد.
- `lib/payroll/postToBasharaf.ts` (`post`/`reverse`) **بدون تغییر در منطق حسابداری** — فقط قفل/بازکردن حضور به آن اضافه شد. دسته‌بندی «حقوق پرسنل» در تراکنش هسته دست‌نخورده است — گزارش‌های مالی همچنان از همان‌جا می‌خوانند.
- ستون `employees.base_monthly_salary` حذف نشد (فعلاً) — سیستم ماهانه کاملاً فعال می‌ماند تا سیستم جدید کامل تست شود.

## ۱۰. مسیرهای API جدید

| مسیر | متد | دسترسی |
|---|---|---|
| `/api/shift-templates` | GET, POST | GET: session · POST: Admin |
| `/api/shift-templates/[id]` | PATCH, DELETE | Admin |
| `/api/employees/[id]/hourly-rates` | GET, POST | GET: session · POST: Admin |
| `/api/shift-assignments` | GET, POST | GET: session (branch‌محدود) · POST: Admin/BranchUser |
| `/api/shift-assignments/[id]` | PATCH, DELETE | Admin/BranchUser (شعبه‌ی خود) |
| `/api/attendance` | GET, POST | GET: session · POST: Admin/BranchUser |
| `/api/attendance/[id]` | PATCH, DELETE | Admin/BranchUser (پیش از قفل) |
| `/api/attendance/[id]/confirm` | POST | Admin |
| `/api/attendance/confirm-bulk` | POST | Admin |
| `/api/payroll/runs/[id]/calculate` | POST (موجود، گسترش‌یافته) | Admin |

## ۱۱. صفحات جدید UI

- **`/shift-schedule`** — نمای روزانه/هفتگی، فیلتر شعبه، انتخاب چندکارمندی، قالب سریع یا سفارشی، دکمه‌ی سریع ۶/۸ ساعت، کپی شیفت به چند روز، لغو، هشدار هم‌پوشانی (`conflicts` از API).
- **`/attendance`** — لیست تخصیص‌های روز + حضورهای بدون شیفت، ثبت زمان ورود/خروج یا مجموع دقیقه، **پیش‌نمایش لحظه‌ای محاسبه** (مستقیماً از توابع خالص `attendanceEngine` در کلاینت — بدون round-trip شبکه)، تأیید تکی/گروهی، رنگ‌بندی وضعیت draft/confirmed/locked.
- **`/employees`** (گسترش‌یافته) — دکمه‌ی «نرخ ساعتی» روی هر ردیف: نمایش نرخ فعال، سابقه‌ی کامل، فرم ثبت نرخ جدید با تاریخ شروع (جلالی).

**محدودیت شناخته‌شده (تصمیم مهندسی آگاهانه):** پیش‌نمایش لحظه‌ای در `/attendance` فقط دقیقه‌ها را نشان می‌دهد (حضور/عادی/اضافه‌کاری/شب‌کاری)، نه مبلغ تومانی — چون نمایش مبلغ نیاز به بارگذاری پارامترهای ضریب (`payroll_parameters`) در کلاینت دارد که فعلاً هیچ صفحه‌ای آن را لود نمی‌کند. مبلغ نهایی در محاسبه‌ی حقوق (`/payroll`) که مرجع رسمی است نمایش داده می‌شود.

## ۱۲. مهاجرت

`project-docs/migrations/db-hourly-attendance-payroll.sql` — idempotent (`IF NOT EXISTS`/`DO $$ EXCEPTION`)، فقط ۴ جدول+۵ enum+index جدید، بدون حذف/تغییر هیچ جدول یا ستون موجود، شامل کوئری‌های بررسی و بخش rollback مرحله‌ای در انتها. **روی دیتابیس واقعی اجرا نشده** — باید توسط کاربر در pgAdmin بعد از backup اجرا شود.

## ۱۳. پاک‌سازی سیستم قبلی

`scripts/reset-payroll-to-hourly.ts` — پیش‌فرض dry-run (فقط گزارش). اجرای واقعی فقط با:
```
PAYROLL_RESET_CONFIRM=RESET_TO_HOURLY_CONFIRMED npx tsx scripts/reset-payroll-to-hourly.ts
```
فقط `payroll_runs` با status≠`posted` (و بدون سند حسابداری غیرمنتظره) + `payslips` مرتبط را حذف می‌کند. هرگز به `employees`، `employee_documents`، اطلاعات هویتی/بانکی/تماس، `branches`، سمت‌ها، `payroll_events`، `journal_vouchers`، `transactions`، `accounts` دست نمی‌زند. اجراهای `posted` همیشه رد می‌شوند (نیاز به مسیر رسمی `reverse` دارند).

## ۱۴. روش بازگشت (Rollback)

- کد: فقط با checkout به commit قبل از این branch، یا حذف merge commit (چون هنوز merge نشده، صرفاً branch را حذف/نادیده بگیرید).
- دیتابیس: بخش rollback در انتهای فایل migration (`DROP TABLE`/`DROP TYPE` برای ۴ جدول و ۵ enum جدید) — فقط اگر migration واقعاً اجرا شده باشد.
- داده: چون migration فقط جدول اضافه می‌کند (نه تغییر/حذف)، rollback هیچ‌وقت داده‌ی سیستم ماهانه‌ی موجود را لمس نمی‌کند.

## ۱۵. تست‌ها

`tests/unit/attendanceEngine.test.ts` — ۴۴ تست، پوشش کامل ۲۵ سناریوی اصلی خواسته‌شده (شیفت ۶/۸/سفارشی، snapshot تخصیص، اضافه‌کاری تأییدشده/نشده، عبور از نیمه‌شب، استراحت با/بدون حقوق، دو روش ثبت حضور، نرخ‌های متفاوت/تغییر میان‌ماه، انواع مرخصی/غیبت، حضور بدون شیفت، هم‌پوشانی شیفت، ماشین‌حالت draft/confirmed/locked، جلوگیری از کسر دوگانه) + فرمول دقیق پرداخت + پاداش/مساعده. سناریوهای idempotency ثبت حسابداری/reverse (۲۶–۲۷) از قبل در سیستم موجود پوشش دارند و بدون تغییر ماندند. تست مرورگر (Playwright) به‌دلیل نبود دیتابیس تست/production در این محیط اجرا نشد — طبق دستور صریح، فقط همین‌جا مستند شد.

## ۱۶. محدودیت‌های باقی‌مانده / کارهای دستی کاربر

1. اجرای migration (`db-hourly-attendance-payroll.sql`) روی دیتابیس واقعی (بعد از backup).
2. تصمیم درباره‌ی زمان اجرای `reset-payroll-to-hourly.ts` (فقط وقتی سیستم ساعتی کاملاً جای سیستم ماهانه را گرفت).
3. تعریف نرخ ساعتی برای هر کارمندی که قرار است به سیستم ساعتی منتقل شود (از صفحه‌ی «پرسنل»).
4. ساخت قالب‌های شیفت واقعی شعبه‌ها (از صفحه‌ی «برنامه شیفت» یا مستقیم API).
5. تست دستی end-to-end با کاربر واقعی (چون دیتابیس/مرورگر production در دسترس این نشست نبود).
6. تصمیم آینده: افزودن EXCLUDE constraint سطح دیتابیس برای نرخ ساعتی (نیازمند فعال‌سازی extension `btree_gist`) — فعلاً فقط در لایه‌ی API چک می‌شود.
