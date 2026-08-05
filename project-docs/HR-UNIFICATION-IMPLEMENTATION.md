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
