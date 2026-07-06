# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.65-flash-report` |
| **آخرین به‌روزرسانی** | 2026-07-06 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ |
| **دیپلوی** | ✅ **GitHub Actions فعال** — workflow اکنون ۴ job جداگانه دارد: typecheck / unit-test / e2e / deploy. 🟡 **e2e job** نیاز به secret `STAGING_URL` در GitHub دارد (باید manually اضافه شود). ✅ **۴ migration اجرا شدند** (2026-07-04). 🟡 **۲ migration جدید pending**: `db-waste-reason-migration.sql` و `db-cheques-migration.sql` — باید در pgAdmin اجرا شوند. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | موارد 🟠 باقی‌مانده: ۱. رفع parseFloat مالی انبار (`lib/db/inventoryHelpers.ts:23`). ۲. UI دکمه force-reset حقوق (SuperAdmin). ۳. rate limit قوی‌تر برای OTP send. |
| **بلاک‌شده/منتظر کاربر** | ۲ migration SQL در `db-waste-reason-migration.sql` و `db-cheques-migration.sql` — کاربر باید در pgAdmin اجرا کند. |

> ⛔ **هشدار همزمانی:** هر دو اکانت روی **یک پوشه‌ی واحد** کار می‌کنند. **هرگز دو جلسه هم‌زمان باز نکنید** — تغییرات همدیگر را خراب می‌کنند. همیشه نوبتی: جلسه‌ی قبلی commit/push کرده باشد، بعد جلسه‌ی جدید شروع شود.

---

## 🔁 پروتکل رله‌ی دو اکانت

### شروع هر جلسه (الزامی — به ترتیب)
1. این فایل، بخش ۰ + جدیدترین ورودی ژورنال را بخوان.
2. `git status` بزن — اگر تغییرات commit‌نشده هست، یعنی جلسه‌ی قبل ناقص بسته شده: اول وضعیت را با کاربر روشن کن، چیزی را کورکورانه commit یا revert نکن.
3. `git log -5 --oneline` — تطبیق بده با ژورنال.
4. به کاربر خلاصه بگو: «وضعیت X است، کار نیمه‌تمام Y، پیشنهاد بعدی Z» و منتظر تأیید بمان.

### پایان هر جلسه / بعد از هر تغییر معنادار (الزامی)
1. یک ورودی ژورنال با **قالب زیر** به بالای بخش ژورنال اضافه کن.
2. بخش ۰ را به‌روز کن (نسخه، تاریخ، اکانت، کار نیمه‌تمام، کار بعدی).
3. اگر ژورنال بیش از **۷ ورودی** شد، قدیمی‌ها را به `project-docs/handoff-archive.md` منتقل کن.
4. `git add -A && git commit -m "..." && git push` — **بدون push جلسه را نبند.**
5. ⛔ **دیگر ZIP نساز** — GitHub Actions خودکار deploy می‌کند (از 2026-06-24).

### قالب اجباری ورودی ژورنال
```markdown
## 📓 [تاریخ] — [عنوان کوتاه] — اکانت [۱/۲]
**چه شد:** (۲–۵ خط، تصمیم‌های مهم + چرایی)
**فایل‌ها:** (مسیر کامل ایجاد/ویرایش‌شده‌ها)
**Build:** tsc/build سبز یا خطا + متن خطا
**ناتمام:** دقیقاً کجا متوقف شد، چه چیزی نیمه‌کاره است (اگر هیچ: «—»)
**برای جلسه‌ی بعد:** کار بعدی مشخص + هر هشداری که اکانت دیگر باید بداند
```

---

## 📓 ژورنال نشست‌ها (جدیدترین بالا — حداکثر ۷ ورودی)

## 📓 2026-07-06 — Flash Report روزانه برای داشبورد — اکانت ۱
**چه شد:** گزارش روزانه «یک‌نگاهی» برای مالک پیاده شد:
- **`lib/reports/flashReport.ts`**: تابع `getFlashReport(dateJalali, branchId?)` — منطق جداگانه برای استفاده مجدد (بات تلگرام آینده). جمع income امروز، COGS (بهای تمام‌شده COGS)، payroll، ضایعات (invVouchers kind='waste') + همان داده‌های هفته‌ی پیش برای مقایسه ٪.
- **`GET /api/reports/flash?date=jalali&branchId=`**: endpoint ساده — زمینه session + date امروز به‌صورت پیش‌فرض.
- **`FlashReportCard`** در داشبورد (فقط SuperAdmin): ۵ KPI در یک ردیف — فروش (+ فلش هفته قبل)، تعداد فاکتور، COGS (+ فلش)، Prime Cost % (رنگ‌بندی ≤۶۰٪ سبز/۶۰–۶۵٪ کهربایی/>۶۵٪ قرمز)، ضایعات.
**فایل‌ها:** `lib/reports/flashReport.ts` (جدید), `app/api/reports/flash/route.ts` (جدید), `components/dashboard/FlashReportCard.tsx` (جدید), `components/dashboard/index.ts`, `app/(app)/dashboard/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅. Commit: 8d8f288
**ناتمام:** —
**برای جلسه‌ی بعد:** اگر بات تلگرام اضافه شد، `getFlashReport` را مستقیم صدا بزند. موارد 🟠: parseFloat مالی انبار، force-reset حقوق، rate limit OTP.

## 📓 2026-07-06 — ماژول مدیریت چک + ضایعات با دلیل — اکانت ۱
**چه شد:**
(۱) **ضایعات با دلیل** (کامل شد): `wasteReason text nullable` به `inv_voucher_lines` اضافه شد. UI فرم دریافت انبار: select با گزینه‌های فارسی + ورودی متن سفاری برای «سایر». Migration: `db-waste-reason-migration.sql`.
(۲) **ماژول چک‌ها** (کامل):
  - Schema: جدول `cheques` (text+CHECK برای kind/status، bigint تومان، تاریخ جلالی text). Migration: `db-cheques-migration.sql`.
  - API: `GET/POST /api/cheques`، `GET/PATCH/DELETE /api/cheques/[id]`، `GET /api/contacts/[id]/cheques`.
  - صفحه `/cheques`: دو تب (دریافتی/پرداختی)، کارت‌های خلاصه، جدول با رنگ‌بندی (قرمز = سررسید گذشته، کهربایی = ≤۷ روز)، select inline برای تغییر وضعیت، Sheet فرم با JalaliDatePicker، دکمه «ثبت تراکنش» → prefill `/transactions/new` از طریق URL params.
  - sidebar: آیتم «چک‌ها» با آیکون FileCheck بین صندوق‌ها و طرف‌حساب‌ها.
  - `ContactLedgerDrawer`: بخش «چک‌ها» اضافه شد (parallel fetch از `/api/contacts/[id]/cheques`).
  - `transactions/new`: prefill از URL params با `useSearchParams`.
  - `audit.ts`: نوع `chq.statusChanged` اضافه شد.
  - notification rule `cheque.dueSoon` در migration SQL.
**فایل‌ها:** `app/(app)/cheques/page.tsx` (جدید), `app/api/cheques/route.ts` (جدید), `app/api/cheques/[id]/route.ts` (جدید), `app/api/contacts/[id]/cheques/route.ts` (جدید), `types/cheque.ts` (جدید), `types/index.ts`, `lib/db/schema.ts`, `lib/auth/audit.ts`, `components/layout/nav-config.ts`, `components/contacts/ContactLedgerDrawer.tsx`, `app/(app)/transactions/new/page.tsx`, `db-waste-reason-migration.sql` (جدید), `db-cheques-migration.sql` (جدید)
**Build:** tsc ✅ ۰ خطا · build ✅. Commits: ce170cf (waste reason), 5944e32 (cheques)
**ناتمام:** —
**برای جلسه‌ی بعد:** ۲ migration باید در pgAdmin اجرا شوند. موارد 🟠: parseFloat مالی انبار، force-reset حقوق، rate limit OTP.

## 📓 2026-07-06 — تاریخچه قیمت خرید اقلام انبار — اکانت ۱
**چه شد:** فیچر «تاریخچه قیمت» برای رصد تورم مواد اولیه پیاده شد:
- **API** `GET /api/inventory/items/[id]/price-history`: از `inv_voucher_lines` + `inv_vouchers` (kind='in', status='approved') قیمت‌های خرید تأییدشده را بازیابی می‌کند. خروجی: آرایه `{ date (jalali), unitPrice, qty, source }` مرتب بر اساس تاریخ + خلاصه `{ firstPrice, lastPrice, avgPrice, changePct, change3mPct }`.
- **API** `GET /api/inventory/items/price-changes`: یک‌جا قیمت آخرین خرید + تغییر ۳ ماهه برای همه اقلام — برای ستون جدول.
- **UI** `app/(app)/inventory/items/page.tsx`: (الف) آیکون `TrendingUp` کنار میانگین بها — با کلیک Sheet تاریخچه باز می‌شود. (ب) ستون «تغییر ۳م.» جدید (فقط برای canDo inventory.viewCosts): قرمز >۲۰٪، کهربایی ۱–۲۰٪، سبز کاهش. (پ) Sheet تاریخچه: Summary card (آخرین قیمت + ٪ تغییر نسبت به ۳ ماه + میانگین) + نمودار خطی Recharts + جدول (تاریخ/قیمت/مقدار/منبع).
**فایل‌ها:** `app/api/inventory/items/[id]/price-history/route.ts` (جدید), `app/api/inventory/items/price-changes/route.ts` (جدید), `app/(app)/inventory/items/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅. Commit: b455cf1
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠: رفع parseFloat مالی انبار (`lib/db/inventoryHelpers.ts:23`)، UI force-reset حقوق (SuperAdmin)، rate limit قوی‌تر OTP send.

## 📓 2026-07-05 — C8: مهندسی منو — اکانت ۱
**چه شد:** ماتریس مهندسی منو (Menu Engineering Matrix) پیاده شد:
- **API** `GET /api/inventory/reports/menu-engineering`: فروش روزانه inv_daily_sales بازه را جمع می‌کند، costRecipe را برای هر رسپی اجرا می‌کند، میانگین unitsSold و unitMargin را محاسبه می‌کند، هر آیتم را در یکی از ۴ ربع (star/plowhorse/puzzle/dog) قرار می‌دهد. اگر کمتر از ۳ آیتم فروخته شده باشد `tooFew: true` برمی‌گرداند.
- **صفحه** `/inventory/menu-engineering`: فیلتر شعبه + بازه تاریخ، ماتریس ۲×۲ با آیکون + عنوان + راهنمای اقدام فارسی، جدول جزئیات با رنگ‌بندی حاشیه سود، خروجی اکسل.
- **Hub آشپزخانه**: کارت «مهندسی منو» (BarChart2) اضافه شد.
- **nav-config**: `/inventory/menu-engineering` به KITCHEN_PATHS اضافه شد.
**فایل‌ها:** `app/api/inventory/reports/menu-engineering/route.ts` (جدید), `app/(app)/inventory/menu-engineering/page.tsx` (جدید), `app/(app)/inventory/kitchen/page.tsx`, `components/layout/nav-config.ts`
**Build:** tsc ✅ ۰ خطا · build ✅. Commit: 98b5d0b
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠: rate limit OTP send، parseFloat مالی انبار، UI force-reset حقوق.

## 📓 2026-07-05 — UI: هشدار انقضا + پیش‌بینی تقاضا + Prime Cost % — اکانت ۱
**چه شد:**
(۱) **هشدار انقضای موجودی** (`app/(app)/inventory/page.tsx`): کارت «هشدار انقضا» به hub انبار اضافه شد. فقط وقتی اقلام نزدیک یا گذشته از تاریخ انقضا وجود دارد نمایش می‌دهد (اگر همه سالم → کارت پنهان). برای هر قلم: نام، تاریخ انقضا، badge وضعیت (منقضی/امروز/فردا/N روز).
(۲) **پیش‌بینی تقاضا** (`app/(app)/inventory/kitchen/page.tsx`): جدول «پیش‌بینی مصرف فردا» در hub آشپزخانه اضافه شد. داده از `POST /api/inventory/forecast`. نمایش rawCoverage: قلم | مصرف روزانه | موجودی فعلی | کمبود احتمالی. ردیف‌های کمبود قرمز. واحدها تبدیل‌شده (qtyBase ÷ basePerUnit + unit).
(۳) **Prime Cost %** (`app/(app)/reports/page.tsx`): ردیف جدید بعد از «حقوق پرسنل» در P&L. Prime Cost = COGS + حقوق. درصد رنگ‌بندی: سبز ≤۶۰٪، کهربایی ۶۰–۶۵٪، قرمز >۶۵٪. آیکون Info با tooltip فارسی. `PLRow` با `marginColor` و `tooltip` prop گسترش یافت.
**فایل‌ها:** `app/(app)/inventory/page.tsx`, `app/(app)/inventory/kitchen/page.tsx`, `app/(app)/reports/page.tsx`
**Build:** tsc ✅ ۰ خطا · unit tests ✅ 32/32 — ۳ commit جدا
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠: rate limit OTP send، parseFloat مالی انبار، UI force-reset حقوق.

## 📓 2026-07-04 — audit log برای ۶ عملیات مالی — اکانت ۱
**چه شد:**
۶ عملیات مالی که قبلاً هیچ ردپایی نمی‌گذاشتند حالا در `audit_log` ثبت می‌شوند:
- `transaction.created` — هر تراکنش جدید (id, type, amount, status, branchId)
- `transaction.rejected` — رد تراکنش (title, amount, reason, branchId)
- `transaction.imported` — import انبوه اکسل (count, branchIds)
- `payroll.posted` — post حقوق به حسابداری (runId, accountId, date؛ فقط اولین بار، نه idempotent replay)
- `payroll.reversed` — معکوس حقوق (هر دو route: DELETE روی `/post` و POST روی `/reverse`)
- `account.recalculated` — بازمحاسبه موجودی (count + old/new balance هر حساب)
`AuditAction` union در `lib/auth/audit.ts` با ۵ نوع جدید گسترش یافت (`transaction.rejected` از قبل بود).
**فایل‌ها:** `lib/auth/audit.ts`, `app/api/transactions/route.ts`, `app/api/transactions/[id]/reject/route.ts`, `app/api/transactions/import/route.ts`, `app/api/payroll/runs/[id]/post/route.ts`, `app/api/payroll/runs/[id]/reverse/route.ts`, `app/api/accounts/recalculate/route.ts`
**Build:** tsc ✅ ۰ خطا (بعد از هر commit جداگانه تأیید شد) — ۶ commit جدا
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠 باقی‌مانده: rate limit OTP send، parseFloat مالی انبار، UI force-reset حقوق.

## 📓 2026-07-04 — امنیت: rate limit OTP + حذف console.log — اکانت ۱
**چه شد:**
(۱) **OTP verify rate limit**: `lib/auth/rateLimit.ts` با توابع phone-keyed rate limiting برای OTP گسترش یافت (`checkOtpRateLimit`, `recordOtpFailedAttempt`, `clearOtpAttempts`, `OTP_MAX_ATTEMPTS=5`). `verifyWebOtp` در `lib/ordering/webCustomer.ts` حالا: (الف) قبل از هر query rate limit را بررسی می‌کند (ب) بعد از ۵ شکست، OTP فعال را invalidate می‌کند (used=true) و 429 می‌دهد (ج) بعد از موفقیت counter را پاک می‌کند.
(۲) **OTP console.log**: خط `console.log([OTP MOCK]...)` در `createWebOtp` با `NODE_ENV !== 'production'` guard محافظت شد — در production لاگ نمی‌شود.
(۳) **Migration verify**: همه ۴ migration (proforma، is_active، warning/critical، financial_periods) در schema.ts تأیید شدند. ۲ فایل migration که agent بررسی جامع خالی کرده بود بازگردانی شدند.
**فایل‌ها:** `lib/auth/rateLimit.ts`, `lib/ordering/webCustomer.ts`, `HANDOFF.md`, `project-docs/INVESTIGATION-full-project-review.md`
**Build:** tsc ✅ ۰ خطا · unit tests ✅ 32/32
**ناتمام:** —
**برای جلسه‌ی بعد:** موارد 🟠 بعدی از بررسی جامع: audit log‌های ۶‌گانه (transaction create/reject/import، payroll post/reverse، account recalculate).



