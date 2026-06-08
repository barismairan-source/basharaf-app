# پروژه بشارف — Handoff / تحویل فنی بین جلسات AI

> **این فایل دائمی است.** هدف آن این است که هر نشست هوش مصنوعی جدید (به‌دلیل محدودیت توکن یا تعویض حساب)
> بتواند بدون از‌دست‌دادن زمینه (context)، دقیقاً از همان‌جا که نشست قبلی متوقف شده ادامه دهد.

---

## 1. System Overview & Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript (strict mode)
- **State management:** Zustand — معماری slice-based در `store/slices/*` که در `store/index.ts` ترکیب می‌شوند
- **Database:** PostgreSQL — میزبانی روی Supabase (دیتابیس) و Liara (دیپلوی اپ)
- **ORM / Driver:** Drizzle ORM + درایور خام `postgres` (نه connection pooler زنده هنگام توسعه — مهاجرت‌ها فایل SQL دستی idempotent هستند)
- **Auth:** JWT با کتابخانه `jose`؛ نقش‌ها به‌صورت متن ساده روی ستون `users.role` (مقادیر: `SuperAdmin` | `BranchUser` | `Warehouse`) — **هیچ جدول جداگانه‌ی `roles` وجود ندارد**
- **Styling:** Tailwind CSS با چیدمان RTL (راست‌به‌چپ، فارسی)
- **قراردادهای کلیدی پروژه:**
  - نام‌گذاری: TypeScript camelCase ↔ ستون‌های دیتابیس snake_case
  - مبالغ پولی: `bigint({ mode: 'number' })` به تومان (نه ریال در سطح schema، اما توجه به overflow کلیدی است — به بخش ۴ مراجعه کنید)
  - فیلدهای نوع/وضعیت: ستون‌های متنی ساده با کامنت توضیحی (از ساخت `pgEnum` جدید پرهیز می‌شود)
  - کلید اصلی: `uuid('id').primaryKey().defaultRandom()`
  - تاریخ‌های رو‌به‌کاربر: رشته‌های متنی جلالی (Jalali)؛ تاریخ‌های سیستمی: `timestamptz`
  - مهاجرت‌ها (migrations): یک فایل SQL دستی idempotent (بدون RLS، بدون اتصال زنده به دیتابیس از سمت ابزار)
  - فایل‌های route فقط handlerهای متد HTTP را export می‌کنند
  - `lib/repos` کدِ legacy است و دست‌نخورده باقی می‌ماند
  - الگوی خطا: `handleError()` / کلاس `ApiError` با شکل استاندارد پاسخ `{ error, code, details }`

---

## 2. خلاصه Batch 3 — ماژول انبار و آشپزخانه (Inventory & Kitchen)

پیاده‌سازی کامل سیستم انبارداری حرفه‌ای با حسابداری بهای تمام‌شده:

- **مدیریت اقلام انبار (`inv_items`):** اقلام خام (`raw`) و نیمه‌آماده (`prep`) با واحد پایه، موجودی فیزیکی/قطعی (دو لایه‌ای: `qty_physical` در زمان ثبت برگه، `qty_base` پس از تأیید حسابدار)
- **بهای میانگین موزون (WAC — Weighted Average Cost):** هر بار ثبت رسید خرید، `avg_cost_per_base` با فرمول میانگین موزون بازمحاسبه می‌شود (`computeAutoRecost` در `lib/inventory/costing.ts`)
- **انفجار بازگشتی دستور پخت (Recursive Recipe Explosion):** زنجیره‌ی `resolvePrepCostChain` بهای مواد نیمه‌آماده را به‌صورت بازگشتی از روی مواد خام تشکیل‌دهنده محاسبه می‌کند؛ با تغییر قیمت مواد خام، بهای نیمه‌آماده‌های متأثر به‌صورت خودکار بازمحاسبه می‌شود (`changed` در `computeAutoRecost`)
- **کسر خودکار (Auto-deduction / Backflushing):** هنگام فروش از منو، مواد اولیه‌ی مصرف‌شده بر اساس دستور پخت به‌صورت خودکار از انبار کسر می‌شوند (بدون نیاز به ثبت دستی برگه‌ی خروج)
- **برگه‌های انبار (`inv_vouchers` / `inv_voucher_lines`):** انواع `in` (خرید)، `out`، `waste` (ضایعات)، `sale`، `produce` (تولید نیمه‌آماده)، `stocktake` (انبارگردانی) — هرکدام با گردش کار دو مرحله‌ای ثبت (maker → `pending`) و تأیید (`approve` → `approved`، اعمال اثر قطعی + میانگین موزون اتمیک در `db.transaction`)
- **اتصال به حسابداری (GL Integration) برای ضایعات:** تأیید برگه‌ی `waste` باعث صدور سند هزینه‌ی ضایعات در دفترداری می‌شود (`postWasteToAccounting` در `lib/inventory/postToAccounting.ts`) — بدون اثر روی موجودی صندوق (مشابه COGS فروش منو)؛ همچنین برگه‌ی خرید (`in`) سند هزینه‌ی واقعی + کسر صندوق صادر می‌کند (`postPurchaseToAccounting`) و فروش، سند درآمد + افزایش صندوق (`postSaleToAccounting`)
- **ردیابی انقضا:** فیلد `expiryDate` روی خطوط برگه (زمینه‌ساز FIFO آینده)
- **لاگ حرکت موجودی:** هر تأیید برگه یک رکورد در `inv_stock_tx` با `deltaBase` و `value` ثبت می‌کند

---

## 3. خلاصه Batch 4 — ماژول مشتریان و وفاداری + رزرواسیون (Customers & Loyalty + Reservations)

- **CRM وفاداری (Loyalty CRM):**
  - جداول `customers`, `loyalty_entries`, `coupons`, `coupon_redemptions`
  - کسب امتیاز (`loyalty.earn`)، استفاده از امتیاز (`loyalty.redeem`)، اصلاح دستی (`loyalty.adjust`) — همگی با ثبت در `audit_log`
- **به‌روزرسانی اتمیک امتیاز با SQL مستقیم (Atomic SQL Points Updates):** برای جلوگیری از race condition در محاسبه‌ی موجودی امتیاز هنگام درخواست‌های هم‌زمان، به‌جای خواندن-محاسبه-نوشتن در سطح اپلیکیشن، از عبارات SQL اتمیک (`UPDATE ... SET points = points + N`) در سطح دیتابیس استفاده شده است
- **بازخورد مشتریان (Feedback):** جدول `feedback` + خلاصه‌ی آماری (`FeedbackSummaryCard`، `app/api/feedback/summary`)
- **استفاده از کوپن با جلوگیری از race condition (Coupon Redemption):**
  - جدول `coupon_redemptions` به‌عنوان رکورد یکتا/قفل‌کننده عمل می‌کند تا از استفاده‌ی هم‌زمان/تکراری یک کوپن توسط دو درخواست هم‌زمان جلوگیری شود
  - اعتبارسنجی در `app/api/coupons/validate/route.ts`
- **رزرواسیون میزها (Table Reservations):**
  - جداول `tables` (نگاشت به `restaurantTables` در schema) و `reservations`
  - ماشین حالت (State Machine) برای وضعیت رزرو/میز (مثلاً آزاد → رزروشده → نشسته → تسویه/لغو) که از تغییر وضعیت‌های نامعتبر جلوگیری می‌کند
  - پیاده‌سازی کامل: `store/slices/reservationsSlice.ts`, `app/api/tables/*`, `app/api/reservations/*`, صفحه‌ی `app/(app)/reservations/page.tsx`

📦 **بسته‌ی استقرار:** `release-artifacts/batch4-customers/` شامل `migration.sql`, `liara.json`, `readme.md` و فایل‌های ZIP آماده‌ی دیپلوی روی Liara.

---

## 4. هاتفیکس‌های حیاتی (Critical Hotfixes)

### ۴.۱ — رفع سرریز عددی (Rial/Toman Overflow) با `numeric(24,6)`
- **علت ریشه‌ای:** ستون‌های بهای واحد (`avg_cost_per_base`, `est_unit_cost`, `final_unit_cost`) با دقت `numeric(18,6)` تعریف شده بودند؛ مقادیر خراب/غول‌آسا (مثلاً ۶۵.۵ میلیارد) هنگام محاسبه‌ی میانگین موزون باعث خطای داخلی کور `خطا در ثبت برگه` می‌شدند
- **راه‌حل:**
  - گسترش دقت ستون‌ها از `numeric(18,6)` به `numeric(24,6)` در `lib/db/schema.ts`
  - مهاجرت idempotent: `supabase-v7-bigint-migration.sql`
  - افزودن گاردهای Zod (`.finite()` + `.max(MONEY_MAX = 100_000_000_000)`) در `app/api/inventory/vouchers/route.ts` و `app/api/inventory/vouchers/[id]/approve/route.ts`
  - بهبود `handleError()` در `lib/api-error.ts` برای تشخیص خطاهای `numeric field overflow` / `out of range` و بازگرداندن پیام خوانا (HTTP 422، کد `NUMERIC_OVERFLOW`)
  - افزودن کمک‌تابع `errMsg(e, fallback)` در `app/(app)/inventory/page.tsx` برای نمایش پیام خطای واقعی به‌جای toastهای کور عمومی
  - اسکریپت پاکسازی داده‌ی خراب: `cleanup-rice.sql` (ریست `inv_items` برای کد `R-002`)
- **بسته‌ی هاتفیکس:** `basharaf-app-batch4-hotfix-liara-deploy.zip`

### ۴.۲ — منطقهٔ خطر (Danger Zone): بازگشت به تنظیمات کارخانه (Factory Reset)
- **محل UI:** بخش «منطقهٔ خطر» داخل `components/settings/SecurityPane.tsx` (تب «امنیت» در تنظیمات، فقط قابل‌مشاهده برای `SuperAdmin` از طریق `RouterGuard cap="settings.security"`)
- **عبارت تاییدی سخت (Hard Confirmation Phrase):** `"تایید حذف کل سیستم"` — کاربر باید این عبارت را دقیقاً تایپ کند تا دکمه‌ی نهایی فعال شود
- **API:** `POST /api/settings/wipe` (`app/api/settings/wipe/route.ts`)
  - فقط `SuperAdmin` (`requireAdmin()`)
  - استراتژی: یک دستور اتمیک `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` از طریق `db.execute(sql.raw(...))` — به‌جای حذف رابطه‌ای ردیف‌به‌ردیف (که مستعد deadlock و کندی است)
  - **جداول TRUNCATE‌شونده (۱۹ جدول):**
    ```
    transactions, journal_vouchers,
    inv_stock_tx, inv_voucher_lines, inv_vouchers, inv_daily_sales,
    inv_recipe_lines, inv_recipes, inv_items,
    menu_items, menu_categories,
    loyalty_entries, coupon_redemptions, coupons, feedback, reservations, customers,
    tables, notifications
    ```
  - **جداول حفظ‌شده (Strict Exemption — هرگز TRUNCATE نمی‌شوند):**
    ```
    users, branches, app_settings
    ```
    (نکته: جدول مجزای `roles` وجود ندارد — نقش روی ستون متنی `users.role` نگه‌داری می‌شود و خودبه‌خود حفظ می‌شود)
  - ثبت در `audit_log` با اکشن `settings.factoryReset` (اضافه‌شده به یونیون `AuditAction` در `lib/auth/audit.ts`)
  - تأیید شده با `tsc --noEmit` و `npm run build` — بدون خطا

---

## 5. پروتکل تحویل بین نشست‌ها (Handoff Protocol)

> **دستور برای نشست‌های آینده‌ی هوش مصنوعی:**
>
> هرگاه کاربر درخواست **تعویض حساب (account switch)** کرد — یعنی می‌خواهد از این نشست خارج شود و
> با حساب/نشست دیگری ادامه دهد — شما **موظف** هستید **پیش از خروج کاربر**، این فایل
> (`project-docs/handoff.md`) را با **آخرین قابلیت‌های پیاده‌سازی‌شده، فایل‌های تغییریافته،
> باگ‌های رفع‌شده، و کارهای در دست انجام** به‌روزرسانی کنید.
>
> این فایل تنها مرجع پیوستگی context بین نشست‌هاست — بدون به‌روزرسانی آن، نشست بعدی
> مجبور خواهد بود از صفر کاوش کند و ممکن است کارهای تکراری انجام دهد یا قراردادهای
> پروژه را نقض کند.
>
> هنگام به‌روزرسانی، حداقل بخش‌های زیر را اضافه/ویرایش کنید:
> - یک بخش جدید با عنوان تاریخ/Batch برای کار تازه انجام‌شده
> - فهرست فایل‌های ایجاد/ویرایش‌شده (مسیر کامل)
> - هرگونه قرارداد یا الگوی جدید که باید رعایت شود
> - وضعیت build/tsc (آیا پروژه در حالت سبز/قابل‌دیپلوی است؟)
> - کارهای ناتمام یا برنامه‌ریزی‌شده‌ی بعدی

---

*این فایل به‌صورت دستی نگهداری می‌شود — لطفاً آن را به‌روز نگه دارید.*
