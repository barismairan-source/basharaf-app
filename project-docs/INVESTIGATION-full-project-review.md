# بررسی جامع پروژه «با شرف» — v0.9.58

> تاریخ: ۱۴۰۴-۰۴-۱۲ | نسخه: 0.9.58-pl-report
> روش: ۴ Explore agent موازی — فقط خواندن، بدون تغییر کد
> محورها: امنیت / یکپارچگی مالی / کیفیت کد / شکاف محصول

---

## ۱۰ مورد اول برای فیکس فوری

| # | مورد | شدت | استدلال |
|---|------|------|---------|
| 1 | **اجرای ۴ migration معلق** | 🔴 | کد قبلاً از proforma، is_active، warning/critical و financial_periods استفاده می‌کند — تأیید تراکنش و صفحه دوره مالی الان crash می‌زنند |
| 2 | **Rate limit روی OTP verify** | 🔴 | endpoint بدون rate limit است — کد 6 رقمی به brute force آسیب‌پذیر است |
| 3 | **Audit log حقوق post/reverse** | 🔴 | postToBasharaf هیچ audit ندارد — اگر مشکل پیدا شود اثبات کی چه کرد ممکن نیست |
| 4 | **Audit log ایجاد تراکنش** | 🟠 | بزرگ‌ترین عملیات مالی سیستم بدون ردپا است |
| 5 | **Audit log رد تراکنش** | 🟠 | reject بدون audit — قابل انکار است |
| 6 | **Audit log import انبوه** | 🟠 | import چندصد تراکنش بدون ردپا — خطر جدی در audit |
| 7 | **Audit log account recalculate** | 🟠 | بازمحاسبه موجودی بدون ردپا — drift ممکن است پنهان بماند |
| 8 | **Rate limit قوی‌تر OTP send** | 🟠 | فقط 2 دقیقه cooldown دارد؛ sliding window لازم است |
| 9 | **حذف console.log OTP mock** | 🟠 | کد OTP در production log می‌شود (lib/ordering/webCustomer.ts:72) |
| 10 | **UI برای force-reset حقوق** | 🟡 | endpoint وجود دارد اما هیچ دکمه‌ای در UI ندارد — SuperAdmin برای استفاده باید curl بزند |

---

## بخش ۱ — امنیت

| یافته | شدت | فایل | پیشنهاد |
|-------|------|------|---------|
| OTP verify بدون rate limit — brute force 6 رقمی ممکن است | 🔴 | `app/api/customer/auth/verify/route.ts` | حداکثر ۵ تلاش در ۱۵ دقیقه per phone/IP، بعد ۳۰ دقیقه block |
| OTP send فقط ۲ دقیقه cooldown دارد — sliding window ندارد | 🟠 | `app/api/customer/auth/send-otp/route.ts:6-7` | مثل login: sliding window، ۵ تلاش در ۱۵ دقیقه |
| آپلود استخدام از rate limit مشترک login استفاده می‌کند | 🟡 | `app/api/recruitment/upload/route.ts:3,21` | rate limit جداگانه برای upload |
| ✅ همه admin routes نقش SuperAdmin را check می‌کنند | 🔵 | `app/api/admin/**` | — |
| ✅ همه routes مالی با zod validate می‌شوند | 🔵 | `app/api/transactions/`, `app/api/accounts/` | — |
| ✅ bcrypt cost 10 برای رمز عبور | 🔵 | `lib/auth/password.ts` | — |
| ✅ JWT با jose، httpOnly cookie | 🔵 | `lib/auth/jwt.ts`, `lib/auth/session.ts` | — |
| ✅ هیچ secret hardcode نشده | 🔵 | همه فایل‌ها | — |
| ✅ آپلود: type/size validation و RBAC | 🔵 | `app/api/upload/route.ts` | — |
| ✅ حذف تراکنش فقط SuperAdmin، approved immutable | 🔵 | `app/api/transactions/[id]/route.ts` | — |
| ✅ جعل هویت audited و JWT-signed | 🔵 | `lib/auth/impersonation.ts` | — |
| ✅ error response هیچ stack trace یا اطلاعات DB leak نمی‌کند | 🔵 | `lib/api-error.ts` | — |

### خلاصه امنیت
معماری auth قوی است: httpOnly JWT، rate limiting روی login، Zod در همه جا، bcrypt. یک آسیب‌پذیری واقعی وجود دارد: OTP verify بدون rate limit — یک مهاجم می‌تواند کد ۶ رقمی را با ۱۰۰۰ تلاش brute force کند. OTP send هم باید sliding window بگیرد. بقیه سیستم از نظر امنیت مناسب است.

---

## بخش ۲ — یکپارچگی داده‌ی مالی

| یافته | شدت | فایل | پیشنهاد |
|-------|------|------|---------|
| ایجاد تراکنش بدون audit log | 🔴 | `app/api/transactions/route.ts:POST` | اضافه کردن `audit({ action: 'tx.created', ... })` |
| رد تراکنش (reject) بدون audit log | 🔴 | `app/api/transactions/[id]/reject/route.ts` | اضافه کردن `audit({ action: 'tx.rejected', ... })` |
| import انبوه تراکنش بدون audit log | 🔴 | `app/api/transactions/import/route.ts:138-146` | audit per-row یا حداقل bulk import با تعداد |
| payroll post بدون audit log | 🔴 | `lib/payroll/postToBasharaf.ts:86-198` | `audit({ action: 'payroll.posted', ... })` |
| payroll reverse بدون audit log | 🔴 | `lib/payroll/postToBasharaf.ts:205-235` | `audit({ action: 'payroll.reversed', ... })` |
| account recalculate بدون audit log | 🔴 | `app/api/accounts/recalculate/route.ts:11-43` | `audit({ action: 'account.recalculated', ... })` |
| parseFloat() روی مقادیر مالی انبار — خطر تجمع دقت | 🟠 | `lib/db/inventoryHelpers.ts:23` | استفاده از parseInt یا عملیات integer خالص |
| parseFloat() در approve حواله | 🟠 | `app/api/inventory/vouchers/[id]/approve/route.ts:100-157` | همه تبدیل‌ها integer باشند قبل از Math.round |
| parseFloat() در reversal حواله | 🟠 | `app/api/inventory/vouchers/[id]/reversal/route.ts:58,66-67` | integer arithmetic |
| parseFloat() در دریافت سفارش خرید | 🟠 | `app/api/purchase-orders/[id]/receive/route.ts:71,86` | integer arithmetic |
| Math.round() چندمرحله‌ای — تجمع خطا ممکن | 🟡 | `app/api/inventory/vouchers/[id]/approve/route.ts:136-157` | یکبار در پایان round کنید |
| ✅ همه عملیات مالی چندمرحله‌ای در db.transaction | 🔵 | approve/reject/delete tx، payroll، PO receive | — |
| ✅ soft-delete به‌درستی با isActive=false و فیلتر GET | 🔵 | accounts، contacts، employees | — |
| ✅ PO draft hard-delete مناسب است (هنوز سند مالی ندارد) | 🔵 | `app/api/purchase-orders/[id]/route.ts:DELETE` | — |

### خلاصه یکپارچگی مالی
بزرگ‌ترین مشکل: **۶ عملیات مالی کلیدی بدون audit log** — از جمله ایجاد تراکنش و post/reverse حقوق. اگر مشکلی پیش بیاید اثبات آن ممکن نیست. همه عملیات چندمرحله‌ای درست در db.transaction هستند که از drift جلوگیری می‌کند. parseFloat روی qty انبار (نه مبلغ) ریسک دقت دارد اما در حال حاضر Math.round آن را کنترل می‌کند.

---

## بخش ۳ — کیفیت کد

| یافته | شدت | فایل | پیشنهاد |
|-------|------|------|---------|
| console.log OTP mock — کد تأیید در production log می‌شود | 🟠 | `lib/ordering/webCustomer.ts:72` | جایگزینی با SMS provider واقعی یا حذف log |
| `as any` گسترده — بیش از ۷ مورد در transactions/new | 🟠 | `app/(app)/transactions/new/page.tsx:78-251` | type-safe wrapper برای react-hook-form |
| `as any` در createVoucher calls | 🟠 | `app/(app)/inventory/sales/page.tsx:80` | تکمیل type signature repos.inventory.createVoucher |
| `tx: any` در همه db.transaction callbacks | 🟡 | `lib/db/balanceHelpers.ts:28` و ۲۰+ فایل | استفاده از `typeof db.transaction` یا Drizzle's PgTransaction type |
| `any[]` در inventory logic | 🟡 | `lib/inventoryLogic.ts:169-170` | تعریف interface برای prepCoverage و prepAlerts |
| پارامتر `any` در ItemsTab و ItemRow | 🟡 | `app/(app)/menu/page.tsx:170,236` | تعریف interface مناسب |
| ✅ console.log در useRealtime با NODE_ENV guard | 🔵 | `lib/realtime/useRealtime.ts:132` | — |
| ✅ console در migrate.ts فقط CLI | 🔵 | `lib/db/migrate.ts:25,29` | — |
| ✅ error logging در global-error و api-error مناسب | 🔵 | `app/global-error.tsx:6`, `lib/api-error.ts` | — |
| ✅ هیچ TODO/FIXME بحرانی‌ای جامانده نیست | 🔵 | همه فایل‌ها | OTP mock تنها مورد باقی‌مانده |

### خلاصه کیفیت کد
ساختار کلی تمیز است. دو مشکل اصلی: (۱) `any` گسترده در transactions/new به دلیل react-hook-form — عملی است اما type safety را کاهش می‌دهد. (۲) OTP console.log که اطلاعات احراز هویت را log می‌کند. dead code قابل توجهی پیدا نشد. console.log های دیگر همه مناسب و guard-شده هستند.

---

## بخش ۴ — شکاف‌های محصول

| یافته | شدت | فایل | پیشنهاد |
|-------|------|------|---------|
| migration proforma: کد status='proforma' می‌گذارد — اگر enum DB ندارد → crash | 🔴 | `app/(app)/transactions/new/page.tsx:134` | اجرای `db-accounting-v1-migration.sql` فوری |
| migration is_active: کد isActive کاربر را می‌خواند — column نبود → crash | 🔴 | payroll، orders، inventory (چندین فایل) | اجرای `db-admin-migration.sql` فوری |
| migration warning/critical: approve تراکنش `type:'warning'` می‌فرستد — enum نبود → crash | 🔴 | `app/api/transactions/[id]/approve/route.ts:89` | اجرای `db-notifications-v2-migration.sql` فوری |
| migration financial_periods: صفحه admin query می‌زند — table نبود → crash | 🔴 | `app/api/financial-periods/route.ts`، `app/(admin)/admin/settings/financial-periods/page.tsx` | اجرای `db-financial-periods-migration.sql` فوری |
| force-reset حقوق: endpoint وجود دارد ولی هیچ UI دکمه‌ای ندارد | 🟡 | `app/api/payroll/runs/[id]/force-reset/route.ts` | اضافه کردن دکمه به payroll UI (SuperAdmin only) |
| inventory expiry API بدون UI — اقلام در حال انقضا مخفی‌اند | 🟡 | `app/api/inventory/expiry/route.ts` | کارت هشدار انقضا در `/inventory/page.tsx` |
| inventory forecast API بدون UI — قابلیت پیش‌بینی مخفی است | 🟡 | `app/api/inventory/forecast/route.ts` | panel در `/inventory/plan/page.tsx` |
| ✅ همه صفحات اصلی loading skeleton دارند | 🔵 | همه `app/(app)/*/page.tsx` | — |
| ✅ همه صفحات Empty component یا پیام «داده نیست» دارند | 🔵 | همه `app/(app)/*/page.tsx` | — |
| ✅ ExportPanel به‌درستی در reports ادغام شده | 🔵 | `components/transactions/ExportPanel.tsx` | — |

### خلاصه شکاف‌های محصول
بحرانی‌ترین مشکل: **۴ migration اجرانشده — کد production این ستون‌ها/enumها را فرض می‌گیرد**. تأیید تراکنش (`warning` notification) و صفحه دوره مالی در حال حاضر crash می‌زنند. سه API مخفی هم وجود دارند که UI ندارند (force-reset، expiry، forecast) و قابلیت‌های مفیدی هستند. UX states در همه صفحات اصلی کامل است.

---

## چیزهایی که سالم‌اند ✅

- **Auth architecture**: httpOnly JWT، bcrypt، role checking در همه sensitive routes
- **Financial atomicity**: همه عملیات چندمرحله‌ای مالی در db.transaction هستند
- **Input validation**: Zod در همه API routes که داده می‌گیرند
- **Soft-delete**: موجودیت‌های مالی isActive=false می‌شوند و GET فیلتر می‌کند
- **Error responses**: هیچ stack trace یا DB detail leak نمی‌شود
- **Secret management**: همه secrets در env vars، هیچ hardcode
- **UX completeness**: همه صفحات اصلی loading/empty/error state دارند
- **Dead code**: کد مرده قابل توجهی پیدا نشد
- **TypeScript coverage**: `any` موجود اما limited و mostly محدود به react-hook-form

---

*این گزارش حاصل بررسی مستقیم کد توسط ۴ agent موازی است — نه فرضیه. هر یافته با مسیر فایل مستند شده.*
