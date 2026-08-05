# یکپارچه‌سازی «منابع انسانی» — فاز صفر: ممیزی + برنامه‌ی اجرا

وضعیت: در حال اجرا روی branch `feat/hr-workspace-unification` (ساخته‌شده از `main` بعد از commit `2bde6c4`).
هیچ merge/push/deploy/migration واقعی در این سند/فاز انجام نشده یا مجاز نیست.

---

## ۰.۱ وضعیت git در لحظه‌ی شروع

```
main @ 2bde6c4 (سیستم حقوق ساعتی/شیفت/حضور — merge+deploy شده قبل از این نشست)
  M app/(app)/attendance/page.tsx          ← تغییر کاربر (دکمه‌ی حذف)، commit شد در a3f3b34
  ?? project-docs/HR-RECRUITMENT-PAYROLL-OVERVIEW.md  ← سند کاربر، commit شد در a3f3b34
```
Branch جدید `feat/hr-workspace-unification` از همین نقطه ساخته شد؛ commit `a3f3b34` هر دو تغییر بالا را (بدون تغییر محتوا) ثبت کرد تا هیچ‌چیز گم نشود.

## ۰.۲ نقشه‌ی مسیرهای فعلی (قبل از یکپارچه‌سازی)

| مسیر صفحه | فایل | API اصلی |
|---|---|---|
| `/recruitment` | `app/(app)/recruitment/page.tsx` | `/api/recruitment*` |
| `/recruitment/form-builder` | `app/(app)/recruitment/form-builder/page.tsx` | `/api/recruitment/form-builder*` |
| `/employees` | `app/(app)/employees/page.tsx` | `/api/employees*`, `/api/employees/[id]/hourly-rates` |
| `/shift-schedule` | `app/(app)/shift-schedule/page.tsx` | `/api/shift-templates*`, `/api/shift-assignments*` |
| `/attendance` | `app/(app)/attendance/page.tsx` | `/api/attendance*` |
| `/payroll` | `app/(app)/payroll/page.tsx` | `/api/payroll/runs*`, `/api/payroll/events*` |

## ۰.۳ جدول‌ها و ارتباط‌های واقعی فعلی

(جزئیات کامل در `project-docs/HR-RECRUITMENT-PAYROLL-OVERVIEW.md` — اینجا فقط نکات تازه‌ی این ممیزی که آن‌جا نبود.)

- `job_applications` ↔ `employees`: **هیچ FK ندارند.** «تبدیل به پرسنل» فقط `router.push('/employees?fromApplicant=1&fullName=...&phone=...')` است (`app/(app)/recruitment/page.tsx:181`).
- `employees` ↔ `users`: **هیچ FK ندارند.** دو جدول کاملاً مستقل.
- `employees.role`: ستون `text` (نه enum) — تاریخچه: `project-docs/migrations/db-role-to-text.sql` نشان می‌دهد این ستون قبلاً enum بوده و برای پشتیبانی از «سمت سفارشی» به متن آزاد تبدیل شده. enum قدیمی (`employeeRoleEnum`) هنوز در `schema.ts` تعریف شده ولی هیچ ستونی آن را استفاده نمی‌کند (کد مرده بی‌ضرر).
- لیست واقعی سمت‌ها (`DEFAULT_ROLES` + سفارشی‌ها) در یک ردیف JSON داخل جدول `app_settings` با کلید `payroll.roles` نگه داشته می‌شود — نه در یک جدول مستقل.
- تصمیم «کارمند ساعتی یا ماهانه» **هیچ‌جا صریح ذخیره نشده** — در `calculate/route.ts` با `SELECT ... FROM employee_hourly_rates WHERE employeeId=...` در لحظه تشخیص داده می‌شود (اگر رکورد دارد → ساعتی).
- `attendance_entries.shiftAssignmentId` یک unique index دارد (یک حضور به‌ازای هر تخصیص) — ولی **هیچ‌جا جلوی این‌که یک کارمند هم‌زمان یک «حضور بدون شیفت» (`shiftAssignmentId=null`) و هم یک حضور متصل به شیفت در همان بازه‌ی زمانی داشته باشد گرفته نمی‌شود.** این دقیقاً همان ریسک هم‌پوشانی است که در تصویر/توضیح کاربر آمده — تأیید شد، فاز ۱ باید حلش کند.

## ۰.۴ وضعیت migration سیستم ساعتی — بدون دسترسی نوشتنی/خواندنی به production

این sandbox **هیچ فایل `.env.local` یا connection string واقعی ندارد** (فقط `.env.example`/`.env.e2e.example`) — یعنی من از اساس امکان اتصال به هیچ دیتابیسی (نه حتی خواندنی) را ندارم؛ این محدودیت خودِ محیط است، نه فقط یک قانون. بنابراین:
- `project-docs/migrations/db-hourly-attendance-payroll.sql` **در فایل موجود است** (از نشست قبل).
- طبق گفته‌ی صریح کاربر در پیام‌های قبلی («دیتابیس‌ها و میگریشن‌ها انجام شد») و تأیید عملی (دیپلوی روی production بعد از آن بدون خطای «جدول وجود ندارد» موفق بود و مسیرهای API جدید ۴۰۱ درست برگرداندند، نه ۵۰۰)، **فرض منطقی این است که این migration واقعاً روی دیتابیس production اجرا شده است** — ولی این ادعای کاربر است، نه چیزی که من مستقیماً تأیید کرده باشم. migrationهای این فاز جدید (کدهای زیر) باید با همین فرض idempotent نوشته شوند تا اگر قبلاً چیزی اجرا شده، خطا ندهند.

## ۰.۵ تست‌های موجود مرتبط با HR

- `tests/unit/attendanceEngine.test.ts` (۴۴ تست — موتور محاسبه‌ی حقوق ساعتی)
- `tests/unit/recruitment-notification.test.ts`، `recruitment-resumes-zip.test.ts`، `recruitment-route.test.ts`
- `tests/e2e/payroll.spec.ts`، `tests/e2e/recruitment-redesign.spec.ts` (Playwright — نیاز به `.env.e2e` دارند که در این sandbox غایب است؛ طبق محدودیت پروژه فقط با `--list` بررسی می‌شوند، نه اجرای واقعی)
- **هیچ تستی برای `/employees`, `/shift-schedule`, `/attendance` UI یا برای مدل دسترسی این صفحات وجود ندارد.**

## ۰.۶ مدل دسترسی فعلی — یافته‌ی مهم

پروژه از قبل یک سیستم دسترسیِ granular کامل دارد (`lib/auth/permissions.ts`): `SECTIONS` (کدام بخش‌ها را می‌بینی) + `CAPABILITIES` (کدام عملیات را می‌توانی انجام بدهی) + `canAccessSection`/`canDo`. این سیستم در `middleware.ts` (`PROTECTED_PREFIXES` + `sectionForPath`) و در بیشتر صفحات (`dashboard`, `inventory`, ...) درست استفاده می‌شود.

**ولی سه ناسازگاری واقعی پیدا شد:**
1. **`/shift-schedule` و `/attendance` اصلاً در `PROTECTED_PREFIXES` (middleware.ts) نیستند** — یعنی middleware این دو مسیر را حفاظت نمی‌کند (فقط چک کلاینت‌ساید صفحه + چک API‌ها جلویشان را می‌گیرد). تأیید عملی: `curl` بدون session به `/shift-schedule` و `/attendance` روی production چیزی غیر از ریدایرکت لاگین برمی‌گرداند (۲۰۰).
2. **`/shift-schedule` و `/attendance` در `sectionForPath`/`SECTIONS` هم نیستند** — یعنی مدیر کل نمی‌تواند از تنظیمات → تیم، دسترسی granular این دو بخش را به کاربر خاصی بدهد/بگیرد؛ فقط یک چک ساده‌ی نقش (`item.roles`) در `nav-config.ts` تعیین می‌کند چه‌کسی لینک را در سایدبار می‌بیند (و صفحه هم همین نقش را دستی چک می‌کند).
3. **`/employees` و `/payroll` عمداً از سیستم granular استفاده نمی‌کنند** — هر دو صفحه مستقیم `if (user.role !== 'SuperAdmin') return <Empty ... />` می‌نویسند، به‌جای `canAccessSection(user, 'employees'|'payroll')`. یعنی حتی اگر مدیر کل بخواهد از تنظیمات به یک BranchUser خاص دسترسی «فقط دیدن پرسنل» بدهد، این دو صفحه آن تنظیم را اصلاً نمی‌خوانند — تناقض مستقیم با `SECTIONS` که همین دو کلید (`employees`, `payroll`) را به‌عنوان section تعریف کرده است!

## ۰.۷ لینک‌های داخلی به مسیرهای قدیمی (باید بعد از redirect سالم بمانند)

| فایل | لینک | نکته |
|---|---|---|
| `components/dashboard/HRSummaryCard.tsx` | `/employees`, `/payroll` | بدون query param |
| `components/dashboard/UnifiedOverview.tsx` | `/payroll` | بدون query param |
| `components/dashboard/AttentionWidget.tsx` | `/payroll` | آیتم اولویت‌دار هشدار |
| `components/dashboard/RecruitmentWidget.tsx` | `/recruitment`, `/recruitment?q=...` | **باید query param حفظ شود** |
| `app/(app)/recruitment/page.tsx` | `/employees?fromApplicant=1&fullName=...&phone=...` | **باید query param حفظ شود** (این خودش در فاز ۷ به یک API واقعی تبدیل می‌شود، ولی تا آن‌موقع redirect باید کار کند) |
| `components/layout/nav-config.ts` | همه‌ی ۵ مسیر | خودِ فایلی که در فاز ۳ به مسیرهای جدید تغییر می‌کند |

قاعده: redirect باید با `NextResponse.redirect(new URL(target + req.nextUrl.search, req.url))` یا معادل، query string را حفظ کند (نه صرفاً یک redirect ثابت).

## ۰.۸ وابستگی گزارش مالی به دسته‌ی «حقوق پرسنل»

رشته‌ی لفظی `'حقوق پرسنل'` (نه یک ID پایدار) در ۴ جای مستقل استفاده می‌شود:
- **نویسنده:** `lib/payroll/postToBasharaf.ts:144` (`categoryName: 'حقوق پرسنل'` هنگام ساخت تراکنش هزینه)
- **خواننده‌ها:** `app/api/reports/route.ts:217`، `app/api/reports/drilldown/route.ts:20` (`PAYROLL_CAT`)، `lib/reports/flashReport.ts:43`

**قاعده‌ی مطلق برای همه‌ی فازهای بعدی:** این رشته هرگز نباید تغییر کند، و منطق `post`/`reverse` در `lib/payroll/postToBasharaf.ts` نباید در هیچ فازی بازنویسی شود — فقط می‌تواند اضافه شود (مثل قفل‌کردن حضور که در نشست قبل اضافه شد).

---

## برنامه‌ی فازها (بازتأیید بعد از ممیزی)

ترتیب دقیقاً طبق دستور کاربر: فاز ۱ (ریسک مالی/داده) قبل از هر بازطراحی ظاهری. هر فاز = تست‌های مرتبط + یک commit محلی مستقل.

| فاز | عنوان | خروجی اصلی |
|---|---|---|
| ۰ | ممیزی (همین سند) | این فایل |
| ۱ | یکپارچگی داده/مالی | جلوگیری از هم‌پوشانی حضور، `compensationType` صریح، API آمادگی حقوق |
| ۲ | مدل دسترسی HR | `hr` section + ۱۹ کلید `hr.*` در `permissions.ts`، اضافه‌شدن shift/attendance به `PROTECTED_PREFIXES`/`sectionForPath` |
| ۳ | سایدبار + پوسته‌ی `/hr` | گروه «منابع انسانی»، `app/(app)/hr/layout.tsx`، redirectهای ۵گانه |
| ۴ | نمای کلی `/hr` | مرکز عملیات روزانه |
| ۵ | `/hr/people` + پرونده‌ی ۳۶۰ | جدول `job_titles` |
| ۶ | `/hr/time` | ادغام UI شیفت+حضور، بدون ادغام داده |
| ۷ | اتصال استخدام↔پرسنل | `employees.sourceApplicationId`، تراکنش اتمیک استخدام |
| ۸ | اتصال اختیاری پرسنل↔کاربر | `employees.userId` nullable |
| ۹ | `/hr/payroll` + پنل آمادگی | نمایش صریح نوع محاسبه |
| ۱۰ | هماهنگی ظاهری | استفاده از کامپوننت‌های مشترک موجود |
| ۱۱ | migrationهای امن (فقط فایل) | ۵ فایل migration + rollout doc |
| ۱۲ | تست + گیت‌ها + گزارش نهایی | — |

هر فاز که به داده‌ی جدید مالی/دسترسی نیاز دارد (۱، ۲، ۵ بخش job_titles، ۷، ۸) migration خودش را در فاز ۱۱ **می‌نویسد** (نه اجرا می‌کند) — کد اپلیکیشن هر فاز باید طوری نوشته شود که با فرض «migration بعداً دستی اجرا می‌شود» کار کند (دقیقاً مثل الگوی فاز حقوق ساعتی در نشست قبل).

---

## فاز ۱ — نتیجه (تکمیل‌شده)

**موتور خالص (`lib/payroll/attendanceEngine.ts`):** تابع `findAttendanceOverlap` اضافه شد — بازه‌ی زمانی دو رکورد حضور (از ساعت واقعی یا snapshot تخصیص شیفت) را مقایسه می‌کند؛ رکورد `total_minutes` بدون شیفت (بازه‌ی نامشخص) با هر رکورد کاری دیگر همان روز محافظه‌کارانه تضاد اعلام می‌شود (۷ تست جدید، جمعاً ۵۱ تست در این فایل).

**اجرای سرور (`lib/payroll/attendanceEntryHelpers.ts`):** `assertNoAttendanceOverlap` درون `db.transaction` در هر دو مسیر `POST /api/attendance` و `PATCH /api/attendance/[id]` فراخوانی می‌شود — نه فقط UI. `PATCH` حالا `shiftAssignmentId` را هم می‌پذیرد (اتصال «حضور بدون شیفت» به یک تخصیص همان روز). `hasActiveShiftAssignment` هشدار غیرمسدودکننده («این کارمند شیفت فعال دارد، به‌جای بدون‌شیفت وصلش کنید») را در پاسخ `POST` برمی‌گرداند.

**نوع حقوق صریح:** ستون `employees.compensation_type` (`hourly`|`monthly`، پیش‌فرض DB=`monthly` برای سازگاری، پیش‌فرض API ساخت کارمند جدید=`hourly` طبق تصمیم مالک) + جدول `employee_compensation_type_changes` (گزارش حسابرسی با `effectiveFrom`/`reason`/`changedBy`) + endpoint `GET`/`POST /api/employees/[id]/compensation-type`. `calculate/route.ts` و `approve/route.ts` دیگر از روی وجود رکورد `employee_hourly_rates` حدس نمی‌زنند — مستقیماً `emp.compensationType` را می‌خوانند.

**آمادگی محاسبه‌ی حقوق:** `lib/payroll/payrollReadiness.ts` (`computeReadinessForEmployees` + `computePayrollReadiness`) — منبع واحد بین `GET /api/hr/payroll/readiness` و گیت‌های `calculate`/`approve`. خروجی شامل: تعداد پرسنل فعال، افراد فاقد نرخ/حقوق پایه‌ی معتبر، حضورهای draft، روزهای حضور هم‌پوشان، حضور بدون شیفت، اضافه‌کاری تأییدنشده، نرخ‌های هم‌پوشان (دفاعی)، پارامتر قانونی ناموجود، کارمندان ساعتی بدون هیچ حضوری، و تفکیک `criticalErrors` (مسدودکننده) از `warnings` (فقط اطلاع‌رسانی).

**calculate/approve اکنون مسدود می‌شوند اگر:** حضور تأییدنشده، حضور هم‌پوشان، نرخ/حقوق پایه‌ی نامعتبر، یا پارامتر قانونی سال وجود نداشته باشد — دقیقاً طبق خواسته‌ی «محاسبه یا تأیید حقوق در صورت وجود هم‌پوشانی تأییدشده مسدود شود».

**UI (لمس حداقلی، بازطراحی کامل در فاز ۵):** صفحه‌ی پرسنل حالا Chip «ساعتی»/«ماهانه» صریح نشان می‌دهد؛ برای کارمند ساعتی، بلاک «حقوق پایه‌ی ماهانه» و جمع کل آن از خلاصه‌ی صفحه مخفی می‌شود (طبق تصمیم محصول).

**گزارش تشخیصی SQL (فقط خواندنی، بدون تغییر schema):** `project-docs/migrations/db-hr-attendance-integrity.sql` — کوئری‌های شناسایی حضور مشکوک/هم‌پوشان در داده‌ی *قبلی* (قبل از این فیکس).

**migration نوشته‌شده (اجرا نشده):** `project-docs/migrations/db-hr-compensation-mode.sql` — enum + ستون + جدول حسابرسی + backfill idempotent (کارمندان دارای نرخ ساعتی → `compensation_type='hourly'`، بدون تغییر فیش‌های گذشته).

**محدودیت آگاهانه‌ی این فاز:** «عملیات اصلاح گروهی» برای حضورهای هم‌پوشان *موجود* (قبل از این فیکس) ساخته نشد — چون هر مورد نیاز به تصمیم انسانی دارد (کدام رکورد درست است). به‌جایش، مسیر دستی (ویرایش/حذف/اتصال به شیفت در `/attendance`) + گزارش تشخیصی SQL بالا کفایت می‌کند؛ این در گزارش نهایی به‌عنوان یک مورد باقی‌مانده (نه بلاکر) اعلام می‌شود.

**گیت‌های این فاز:** tsc ✅ ۰ خطا · tests 526/526 ✅ (۷ جدید) · lint ✅ · build ✅ (route های جدید `/api/hr/payroll/readiness`، `/api/employees/[id]/compensation-type` ثبت شدند).

---

## فاز ۲ — نتیجه (تکمیل‌شده)

**section جدید:** `hr` به `SECTIONS` اضافه شد (`defaultRoles: ['SuperAdmin','BranchUser']`). سه section قدیمی (`employees`/`payroll`/`recruitment`) حذف نشدند — فقط برچسب «(قدیمی)» گرفتند و برای سازگاری permissionهای از‌قبل‌ثبت‌شده باقی ماندند.

**۱۹ کلید `hr.*` در `CAPABILITIES`:** دقیقاً طبق فهرست خواسته‌شده، با پیش‌فرض‌های منطبق با رفتار فعلی — عملیات روزمره‌ی شعبه (`hr.schedule.manage`, `hr.attendance.record`) هم SuperAdmin هم BranchUser؛ هر چیز حساس (نرخ/مبلغ/تأیید حضور/تأیید‌واضافه‌کاری/تأیید‌وثبت حقوق/مدارک/استخدام/اتصال حساب کاربری) فقط SuperAdmin.

**۳ ناسازگاری یافته‌شده در فاز صفر رفع شد:**
1. `PROTECTED_PREFIXES` (middleware.ts) حالا شامل `/hr`، `/shift-schedule`، `/attendance` است — این دو مسیر آخر تا امروز اصلاً محافظت middleware نداشتند.
2. `sectionForPath` حالا `/hr/*`، `/shift-schedule`، `/attendance` را به بخش `hr` نگاشت می‌کند — قبلاً هیچ‌کدام section نداشتند.
3. تابع پل سازگاری `canAccessHr()` اضافه شد (`lib/auth/permissions.ts`) — دسترسی به `hr` را از `hr` *یا* هرکدام از سه کلید قدیمی می‌پذیرد، تا کاربری که قبلاً برای `employees`/`payroll`/`recruitment` مجوز گرفته، بعد از redirect شدن به `/hr/*` (فاز ۳) دسترسی‌اش را از دست ندهد. `middleware.ts` و `Sidebar.tsx` هر دو از این پل برای section=`hr` استفاده می‌کنند.

**محدودیت آگاهانه:** صفحات فعلی `/employees`/`/payroll`/`/shift-schedule`/`/attendance` (که در فاز ۳ به `/hr/*` redirect می‌شوند و دیگر رندر نخواهند شد) همچنان چک `user.role !== 'SuperAdmin'` سخت‌کدشده‌ی خودشان را دارند — چون به‌زودی حذف/redirect می‌شوند، اصلاحشان به مدل granular صرفاً کار دورریختنی بود؛ صفحات جدید `/hr/*` (فازهای ۳ به بعد) از ابتدا با `canAccessHr`/`canDo` ساخته می‌شوند.

**تست:** `tests/unit/hr-permissions.test.ts` (۱۵ تست جدید) — نگاشت مسیر، پل سازگاری (۶ سناریو)، پیش‌فرض‌های ۱۹ کلید hr.*، ثبت‌شدن section جدید.

**گیت‌های این فاز:** tsc ✅ ۰ خطا · tests 541/541 ✅ (۱۵ جدید) · lint ✅ · build ✅.

---

## فاز ۳ — نتیجه (تکمیل‌شده)

**انتقال فیزیکی صفحات (نه بازنویسی):** `employees/page.tsx`→`hr/people/page.tsx`، `payroll/page.tsx`→`hr/payroll/page.tsx`، `recruitment/page.tsx`(+`form-builder`)→`hr/recruitment/*` — با `git mv` (تاریخچه حفظ شد)، صفر تغییر منطقی. `shift-schedule/page.tsx` و `attendance/page.tsx` به کامپوننت‌های reusable (`components/hr/ShiftScheduleView.tsx`, `AttendanceView.tsx`) استخراج شدند و `app/(app)/hr/time/page.tsx` آن‌ها را با `Tabs`/`TabPanel` (کامپوننت موجود پروژه) بین دو تب «برنامه شیفت»/«ثبت حضور» جابه‌جا می‌کند — دقیقاً طبق اصل مهم: «رابط ادغام شود، داده‌ها جدا بمانند» (هیچ منطق DB/API لمس نشد).

**پوسته‌ی مشترک:** `app/(app)/hr/layout.tsx` — نوار بالای مشترک (برچسب «منابع انسانی» + فیلتر شعبه + ناوبری تب بین ۵ بخش) با یک بار padding. **تصمیم مهندسی:** بدنه‌ی هر صفحه container مستقل خودش را نگه داشت (بعضی `PageShell` موجود، بعضی div دستی) تا padding دوبرابر نشود؛ فازهای بعدی که محتوای هر صفحه را واقعاً بازسازی می‌کنند (۴/۵/۶/۹) این سه الگو را یکی می‌کنند. فیلتر شعبه‌ی مشترک با یک React Context (`lib/hr/branchFilterContext.tsx`) پیاده شد — چون Next.js layout بین صفحات هم‌سطح دوباره mount نمی‌شود، این state واقعاً در طول ناوبری HR حفظ می‌شود؛ اتصال کامل هر ۵ صفحه به این مقدار مشترک (به‌جای فیلتر محلی فعلی هرکدام) در فازهای بعدی که محتوا را بازسازی می‌کنند انجام می‌شود.

**redirect مسیرهای قدیمی:** در `middleware.ts` (`rewriteLegacyHrPath`, export شده برای تست) — قبل از هر چک دیگری اجرا می‌شود، query string و زیرمسیر را حفظ می‌کند (`/recruitment/form-builder`→`/hr/recruitment/form-builder`، `/shift-schedule`→`/hr/time?tab=schedule`، `/attendance`→`/hr/time?tab=attendance`). لینک‌های داخلی شناسایی‌شده در فاز صفر (`HRSummaryCard`, `AttentionWidget`, `RecruitmentWidget`) نیازی به تغییر ندارند چون redirect شفاف کار می‌کند؛ فقط یک لینک داخلی (`convertToEmployee` در صفحه‌ی استخدام) مستقیماً به `/hr/people` اصلاح شد (بهتر از اتکا به round-trip redirect).

**nav-config.ts:** ۵ آیتم قدیمیِ پراکنده زیر «روابط و منابع» (که `rarely:true` داشتند، یعنی پشت «بیشتر» پنهان بودند) حذف و یک گروه مستقل «منابع انسانی» با همان ۵ آیتم (بدون `rarely`) اضافه شد.

**محدودیت شناخته‌شده (تأیید با مرورگر):** بدون DATABASE_URL در این sandbox امکان لاگین واقعی نبود؛ تأیید با `next dev` واقعی انجام شد: build صحیح مسیرهای جدید/حذف قطعی مسیرهای قدیمی از خروجی build، زنجیره‌ی redirect (`/employees`→`/hr/people`→`/login?redirect=%2Fhr%2Fpeople`، مشابه برای ۴ مسیر دیگر) با `window.location.href` واقعی تأیید شد، بدون خطای سرور/کنسول. تست تعاملی کامل (کلیک تب‌ها، تأیید بصری چیدمان) به فازهای بعدی که محتوا آماده می‌شود موکول شد.

**تست:** `tests/unit/hr-legacy-redirects.test.ts` (۷ تست) — نگاشت دقیق هر ۵ مسیر قدیمی + حفظ زیرمسیر + عدم rewrite مسیرهای جدید/بی‌ربط.

**گیت‌های این فاز:** tsc ✅ ۰ خطا · tests 548/548 ✅ (۷ جدید) · lint ✅ (فقط warningهای preexisting، شامل یک فایل جابه‌جاشده) · build ✅ (مسیرهای قدیمی از خروجی حذف، `/hr/*` جدید ثبت شد).

---

## فاز ۴ — نتیجه (تکمیل‌شده)

**API خلاصه‌ی واحد:** `GET /api/hr/overview?branchId=...` (`app/api/hr/overview/route.ts`) — یک درخواست، نه یک فچ جداگانه به‌ازای هر کارت. از موتور آمادگی حقوق فاز ۱ (`computeReadinessForEmployees`) مستقیم استفاده می‌کند تا «حضور مشکوک/هم‌پوشان»، «حضور پیش‌نویس»، «اضافه‌کاری تأییدنشده»، و «کارمند فاقد نرخ معتبر» دقیقاً همان منبع محاسبه‌ی calculate/approve را نشان بدهد (نه یک محاسبه‌ی موازی که ممکن است روزی از هم جدا بیفتد). موارد دیگر مستقیم کوئری می‌شوند: متقاضیان جدید/در انتظار بررسی (`job_applications.status`)، پرسنل ساعتی بدون شیفت امروز، شیفت امروز بدون ثبت حضور، مدارک با انقضای ظرف ۳۰ روز آینده، وضعیت اجرای حقوق دوره‌ی جاری.

**تصمیم مهندسی آگاهانه:** «شیفت‌های پوشش‌داده‌نشده» (یکی از موارد خواسته‌شده) با «کارمند ساعتی بدون شیفت امروز» یکی گرفته شد — چون هیچ جدول «نیاز نیروی موردنیاز» در سیستم وجود ندارد که «پوشش واقعی در برابر نیاز» را قابل‌محاسبه کند؛ ساخت چنین مدلی خارج از حوصله‌ی این فاز است و به بخش «مراحل دستی بعدی» گزارش نهایی منتقل شد.

**صفحه `/hr`:** بخش «نیازمند اقدام» (کارت‌های کلیک‌پذیر، فقط مواردی با تعداد>۰ نمایش داده می‌شوند، هرکدام با لینک مستقیم به مقصد فیلترشده — مثلاً «متقاضی جدید»→`/hr/recruitment?status=new`) + بخش «شاخص‌ها» (`MetricGrid`/`MetricCard` موجود پروژه، بدون نمودار تزئینی). حالت «همه‌چیز مرتب است» با پیام مثبت مجزا.

**گیت‌های این فاز:** tsc ✅ ۰ خطا · tests 548/548 ✅ (بدون تغییر — این فاز عمدتاً DB-coupled است و طبق قرارداد پروژه بدون دیتابیس تست unit نمی‌شود) · lint ✅ · build ✅ (`/api/hr/overview` و `/hr` با محتوای واقعی در خروجی).

---

## فاز ۵ — نتیجه (تکمیل‌شده)

**جدول `job_titles` (فقط زیرساخت):** جدول واقعی + `GET/POST /api/hr/job-titles` + migration با seed از همان ۹ سمت پیش‌فرض فعلی (`DEFAULT_ROLES`). **تصمیم مهم:** این جدول *هنوز* جایگزین `payroll.roles` (تنظیمات JSON فعلی) نشده — فرم افزودن/فیلتر پرسنل هنوز از همان مکانیزم قبلی می‌خواند. دلیل: مقادیر واقعی `employees.role` در production ناشناخته است (ممکن است سمت‌های سفارشی داشته باشد که در seed نیست)؛ migration شامل کوئری `SELECT role, COUNT(*) FROM employees GROUP BY role` است تا قبل از هر cutover واقعی، این مقادیر بررسی و به `job_titles` اضافه شوند — دقیقاً طبق دستور «مقادیر فعلی را قبل از هر migration گزارش کن».

**صفحه‌ی فهرست `/hr/people`:** فیلتر جست‌وجو (نام/تلفن)، سمت، نوع حقوق (ساعتی/ماهانه)، وضعیت همکاری (فعال/غیرفعال/همه) — این آخری نیازمند تغییر کوچک در API بود (`GET /api/employees?status=inactive|all`، پیش‌فرض بدون تغییر یعنی فقط فعال، برای سازگاری با استفاده‌ی موجود در بقیه‌ی پروژه). کلیک روی هر ردیف پرونده‌ی فرد را باز می‌کند؛ دکمه‌های نرخ/ویرایش/حذف با `stopPropagation` مستقل کار می‌کنند (نه تنها راه دسترسی، طبق دستور فاز ۱۰ که همین‌جا رعایت شد).

**پرونده‌ی ۳۶۰ درجه `/hr/people/[id]`:** ۹ تب طبق دستور. **۴ تب واقعی و کاملاً کاردار:** خلاصه (نام/وضعیت/شعبه/سمت/تاریخ شروع/نوع حقوق/نرخ فعلی)، اطلاعات همکاری (شناسه‌ها/بانکی/تماس اضطراری)، حقوق و نرخ‌ها (سابقه‌ی کامل نرخ یا حقوق پایه)، تاریخچه تغییرات (تاریخچه‌ی واقعی تغییر نوع حقوق از فاز ۱). اطلاعات حساس (کد ملی/شبا/نرخ/حقوق) فقط پشت `canDo(user, 'hr.people.viewSensitive')` (فاز ۲) نمایش داده می‌شود. **۵ تب صادقانه placeholder:**
- «مدارک» — چون **هیچ رابط کاربری مدیریت مدرک در کل پروژه وجود نداشت** (نه فقط اینجا)؛ جدول `employee_documents` از قبل در schema هست ولی هرگز به هیچ API/UI وصل نشده بود — این یک قابلیت کاملاً نو است، نه چیزی برای «یکپارچه‌سازی»، پس ساختنش این‌جا proje را از هدف اصلی (ادغام موجودها) خارج می‌کرد.
- «شیفت و حضور» و «فیش‌ها و پرداخت‌ها» — لینک مستقیم به صفحات مرتبط (گزارش per-employee آماده نبود، برای جلوگیری از عجله در کد مالی).
- «منبع استخدام» و «حساب کاربری و دسترسی» — رسماً به فاز ۷ و ۸ همین یکپارچه‌سازی وابسته‌اند؛ بعد از تکمیل آن فازها این‌جا واقعی می‌شوند.

**گیت‌های این فاز:** tsc ✅ ۰ خطا · tests 548/548 ✅ · lint ✅ · build ✅ (`/hr/people`، `/hr/people/[id]`، `/api/hr/job-titles` در خروجی).

---

## فاز ۶ — نتیجه (تکمیل‌شده)

**دو تب جدید واقعی به `/hr/time` اضافه شد** (علاوه بر برنامه شیفت/ثبت حضور که در فاز ۳ منتقل شده بودند):

- **«تأییدها»** (`components/hr/ApprovalsView.tsx` + `GET /api/hr/time/approvals`) — یک صف واحد بررسی: حضور تأییدنشده (تأیید تکی/گروهی با همان `confirmAttendanceBulk` موجود)، اضافه‌کاری منتظر تأیید (تأیید تکی)، حضور بدون شیفت (فقط نمایش، برای بررسی/تصمیم مدیر)، حضور مشکوک/هم‌پوشان (نمایش برای اصلاح دستی — عمداً هیچ دکمه‌ی «رفع خودکار» ندارد، چون تصمیم اینکه کدام رکورد درست است باید انسانی باشد). فقط SuperAdmin (`requireAdmin`، مطابق مدل دسترسی فاز ۲).
- **«گزارش کارکرد»** (`components/hr/TimesheetView.tsx` + `GET /api/hr/time/timesheet`) — جدول یک‌ردیف‌به‌ازای‌هرکارمند برای دوره‌ی انتخابی: برنامه‌ریزی‌شده/واقعی/عادی/اضافه‌کاری/شب‌کاری/تعطیل‌کاری/مرخصی/غیبت/کسری/مبلغ تخمینی/وضعیت تکمیل. فقط از حضور تأییدشده/قفل‌شده محاسبه می‌شود؛ مبلغ با همان `calcAttendancePay` موتور فاز ۱ محاسبه می‌شود (نه فرمول موازی).

**محدودیت آگاهانه‌ی این فاز:** «نمای هفتگی شبکه‌ای» (ردیف=کارمند، ستون=روز) برای تب برنامه شیفت ساخته نشد — نمای فعلی (کارت روزانه، از فاز ۳/نشست قبل) کاملاً کاردار است ولی چیدمانش grid واقعی نیست. تبدیل این به یک grid واقعی یک بازطراحی بصری قابل‌توجه است که به فاز ۱۰ (هماهنگی ظاهری، که دقیقاً برای همین‌جور کارها طراحی شده) موکول شد تا در این فاز روی «دو تب جدید کاملاً کارکردی» تمرکز شود، نه یک بازطراحی بصری پرریسک روی کدی که از قبل درست کار می‌کند.

**گیت‌های این فاز:** tsc ✅ ۰ خطا · tests 548/548 ✅ (بدون تغییر — DB-coupled) · lint ✅ · build ✅ (`/api/hr/time/approvals`، `/api/hr/time/timesheet` در خروجی).
