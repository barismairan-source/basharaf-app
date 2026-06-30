# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.54-variance-daily` |
| **آخرین به‌روزرسانی** | 2026-06-30 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · tests ✅ 32/32 |
| **دیپلوی** | ✅ **GitHub Actions فعال** — هر push به main خودکار deploy می‌شود (`basharaff` روی لیارا). 🟡 **۴ migration** در انتظار اجرای دستی در pgAdmin: `db-accounting-v1-migration.sql`، `db-admin-migration.sql`، `db-notifications-v2-migration.sql`، `db-financial-periods-migration.sql`. (اجراشده ✅: فاز۱ آشپزخانه + `db-user-roles-migration.sql`) |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | تست کاربر: (الف) مانده طرف‌حساب در production (ب) dialog بازنشانی اجباری حقوق (ج) نمای «فروش واقعی» variance با بازه واقعی فروش |
| **بلاک‌شده/منتظر کاربر** | تأیید عملکرد فیکس‌های production (contact balance، force-reset، variance-daily). |

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

## 📓 2026-06-30 — شکاف ۳: variance نمای فروش واقعی — اکانت ۱
**چه شد:** پارامتر `?source=daily` به endpoint `GET /api/inventory/reports/variance` اضافه شد. نمای daily:
- **تئوریک:** از `inv_daily_sales` در بازه jalaliDate → parse JSONB lines (دو فرمت qty/count هر دو handle شدند) → join به `inv_recipes` + `inv_recipe_lines` + `inv_items` → محاسبه `(saleQty / portions) × qtyBase × (100 / effectivePct)` در TypeScript.
- **واقعی:** از `inv_stock_tx` kind∈(out,waste,sale) با فیلتر jalaliDate + فیلتر شعبه via `inv_items.branchId` (چون inv_stock_tx ستون branchId ندارد).
- نمای voucher (قدیمی) کاملاً دست‌نخورده ماند.
- UI: toggle «نمای حواله / نمای فروش واقعی» + یادداشت که رسپی فعلی مبنای محاسبه است.
- فایل migration اختیاری ساخته شد: `project-docs/migrations/db-variance-daily-perf-index.sql` (index روی item_id,jalali_date برای بازه‌های بزرگ).
**فایل‌ها:** `app/api/inventory/reports/variance/route.ts`, `app/(app)/inventory/variance/page.tsx`, `project-docs/migrations/db-variance-daily-perf-index.sql` (جدید)
**Build:** tsc ✅ ۰ خطا. Commit: f8feb71
**ناتمام:** —
**برای جلسه‌ی بعد:** تست با بازه واقعی فروش: نمای daily باید ردیف بیشتری از نمای voucher نشان دهد (فروش‌های مسیر ۲ و ۳). migration اختیاری تنها اگر گزارش کند بود اجرا شود.

## 📓 2026-06-30 — موج ۳ فیکس‌های UX (۱۹ مورد 🟡/🔵) — اکانت ۱
**چه شد:** همه‌ی ۱۹ آیتم موج ۳ پیاده و جداگانه commit شدند:
- **A6–A11**: overflow-x-auto برای جدول‌های موبایل (stocktake, cartable, sales, purchase-orders, DataList)
- **B3**: confirm dialog قبل از غیرفعال‌کردن حساب
- **B7**: KPICard از formatMoneyShort استفاده می‌کند
- **B8**: ردیف‌های دفتر کل به /transactions لینک می‌شوند
- **C4–C6**: حقوق — flex-wrap روی ردیف دکمه‌ها، whitespace-nowrap روی مبالغ فیش، flex-shrink-0 روی مبلغ رویداد
- **D3**: confirm قبل از حذف رزرو
- **D4**: confirm + راهنمای غیرفعال‌کردن قبل از حذف آیتم منو
- **D5**: هشدار پیشگیرانه اگر دسته آیتم داشته باشد (قبل از call به API)
- **D6**: آیکون Trash2 کوپن → EyeOff (رنگ amber) چون soft-deactivate است نه حذف
- **D7/D8**: truncate روی نام آیتم و دسته در جدول منو
- **D9**: truncate روی نام مشتری
- **D10**: truncate روی branchName در کارت سفارش
- **D11**: flex-shrink-0 روی قیمت آیتم در منوی عمومی
**فایل‌ها:** `app/(app)/inventory/stocktake/page.tsx`, `app/(app)/inventory/cartable/page.tsx`, `app/(app)/inventory/sales/page.tsx`, `app/(app)/purchase-orders/page.tsx`, `components/ui/DataList.tsx`, `app/(app)/reports/page.tsx`, `app/(app)/accounts/[id]/page.tsx`, `app/(app)/accounts/page.tsx`, `app/(app)/reservations/page.tsx`, `app/(app)/menu/page.tsx`, `app/(app)/coupons/page.tsx`, `app/(app)/customers/page.tsx`, `app/(app)/orders/page.tsx`, `components/menu/MenuItem.tsx`, `app/(app)/payroll/page.tsx`
**Build:** tsc ✅ ۰ خطا. Commits: c13666e, d4c9acf, 2165700, 555be48, 16c1f89, a73ad25
**ناتمام:** —
**برای جلسه‌ی بعد:** تست کاربر: (الف) مانده طرف‌حساب‌ها در production. (ب) dialog بازنشانی اجباری حقوق اردیبهشت. (ج) رفتار موج ۳ روی موبایل (truncate، overflow، flex-wrap).

## 📓 2026-06-30 — فیکس‌های داده: مانده طرف‌حساب + reverse حقوق بدون سند — اکانت ۱
**چه شد:**
(مشکل ۳) حذف فیلتر `isCredit=true` از محاسبه‌ی مانده طرف‌حساب: `contacts/route.ts` + `contactLedger.ts` + `calculateContactBalance` همه اصلاح شدند. از این پس همه تراکنش‌های approved (نقدی + نسیه) در مانده لحاظ می‌شوند. drawer هم به‌طور خودکار بهتر می‌شود چون از همان API می‌خواند. داده قبلی: ۵۰ از ۵۰ تراکنش طرف‌حساب isCredit=false بودند → مانده همیشه صفر.
(مشکل ۲) سه لایه اضافه شد: (الف) postToBasharaf خطای tagged با code=NO_JOURNAL_VOUCHER پرتاب می‌کند. (ب) reverse API این code را به client برمی‌گرداند (409). (ج) یک endpoint جدید `POST /api/payroll/runs/[id]/force-reset` فقط برای SuperAdmin ساخته شد که بدون اثر مالی status → approved می‌کند + audit می‌نویسد. اگر posted journal_voucher واقعی وجود داشته باشد → خطا (از reverse عادی استفاده کن). UI هم dialog هشدار نشان می‌دهد.
endpoint تشخیصی موقت `/api/admin/diag` حذف شد.
**فایل‌ها:** `app/api/contacts/route.ts`, `lib/db/contactLedger.ts`, `components/contacts/ContactLedgerDrawer.tsx`, `lib/payroll/postToBasharaf.ts`, `app/api/payroll/runs/[id]/reverse/route.ts`, `app/api/payroll/runs/[id]/force-reset/route.ts` (جدید), `lib/auth/audit.ts`, `store/slices/payrollSlice.ts`, `app/(app)/payroll/page.tsx`
**Build:** tsc ✅ ۰ خطا. Commits: c2cf436, 419e4df, 2541657
**ناتمام:** —
**برای جلسه‌ی بعد:** تست کاربر: (الف) صفحه طرف‌حساب مانده نشان دهد؟ (ب) دکمه‌ی «برگشت ثبت» اردیبهشت ۱۴۰۵ → dialog بازنشانی اجباری نشان دهد؟

## 📓 2026-06-29 — فیکس ۱ + تفکیک drawer + endpoint تشخیصی — اکانت ۱
**چه شد:**
(فیکس ۱) route محاسبه مجدد حقوق: اگر دوره قبلاً payslips داشته باشد، از همان employee IDs (نه re-query کارمندان فعال) محاسبه می‌کند → soft-delete بعدی دیگر NO_EMPLOYEES نمی‌دهد.
(نیاز جدید) `ContactLedgerDrawer`: دو ردیف «جمع دریافتی» و «جمع پرداختی» (approved) در بالای drawer اضافه شد — کاملاً client-side از entries موجود.
(تشخیص) `GET /api/admin/diag` (موقت، SuperAdmin) ساخته شد: isCredit distribution روی تراکنش‌های با contactId + audit دوره‌های posted بدون journal_voucher. **بعد از دریافت نتیجه از کاربر → فایل حذف شود.**
**فایل‌ها:** `app/api/payroll/runs/[id]/calculate/route.ts`, `components/contacts/ContactLedgerDrawer.tsx`, `app/api/admin/diag/route.ts` (موقت)
**Build:** tsc ✅ ۰ خطا · tests ✅ 32/32. Commits: 97ffe5f, 7aa00d6, bf0721a
**ناتمام:** منتظر نتیجه‌ی `/api/admin/diag` برای تشخیص مشکل ۲ (reverse posted) و مشکل ۳ (contact balance).
**برای جلسه‌ی بعد:** کاربر `/api/admin/diag` را باز می‌کند → نتیجه → فیکس ۲ و ۳ طراحی می‌شوند.

## 📓 2026-06-29 — موج ۲ فیکس‌های UX (شش مورد آماده) — اکانت ۱
**چه شد:** شش مورد 🟠 از audit که API آماده داشتند پیاده شدند:
(C1) reverse دوره‌ی posted حقوق: endpoint جدید `POST /api/payroll/runs/[id]/reverse` + دکمه‌ی «برگشت ثبت» با confirm dialog (تراکنش هزینه حذف، وضعیت → approved).
(C2) حذف دوره‌ی draft حقوق: endpoint `DELETE /api/payroll/runs/[id]` فقط برای draft + دکمه‌ی Trash2 با confirm.
(D12) ویرایش inline نام/ترتیب دسته‌ی منو: CategoryRow جدید با Edit3 → expand به فرم labelFa/labelEn/sortOrder.
(D13) ویرایش رزرو: `updateReservation` به store اضافه شد + Pencil روی pending/confirmed → فرم inline تاریخ/ساعت/نفرات/میز/یادداشت.
(D14) ویرایش کوپن: Pencil → modal ویرایش code/type/value/validFrom/validTo/usageLimit.
(A2) ویرایش حواله pending: `PATCH /api/inventory/vouchers/[id]` (اتمیک: reverse فیزیکی قدیم → apply جدید → update DB) + Pencil + modal qty/قیمت/یادداشت در کارتابل.
**فایل‌ها:** `app/api/payroll/runs/[id]/reverse/route.ts` (جدید), `app/api/payroll/runs/[id]/route.ts`, `store/slices/payrollSlice.ts`, `app/(app)/payroll/page.tsx`, `app/(app)/menu/page.tsx`, `store/slices/reservationsSlice.ts`, `app/(app)/reservations/page.tsx`, `app/(app)/coupons/page.tsx`, `app/api/inventory/vouchers/[id]/route.ts`, `app/(app)/inventory/cartable/page.tsx`
**Build:** tsc ✅ ۰ خطا · tests ✅ 32/32. Commits: ce9c503, 3005e45, fa662c5, fa763d4, 8dc26be
**ناتمام:** —
**برای جلسه‌ی بعد:** تست موج ۲ توسط کاربر. بعد: موج ۳ (🟡 مورد‌های جزئی) + شکاف ۳ variance رسپی.

## 📓 2026-06-29 — موج ۱ فیکس‌های UX (پنج باگ بحرانی) — اکانت ۱
**چه شد:** پنج باگ 🔴 بحرانی از audit نتیجه گرفته از INVESTIGATION-ux-consistency-audit.md پیاده و commit شدند:
(B1) TxDetailPanel: ویرایش تراکنش approved بی‌صدا fail می‌کرد (patch شامل amount بود → ۴۲۲ → rollback → خطا نشان نمی‌داد). فیکس: فیلدهای مالی (amount/category/date) برای approved disabled + از payload حذف + toast خطا در صورت fail.
(B5+B6) TxDetailPanel: وضعیت `proforma` به‌اشتباه «رد شده» (قرمز) و نوع `transfer` به‌اشتباه «هزینه» (قرمز) نشان می‌داد. فیکس: جایگزینی با `StatusPill` (دارای STATUS_MAP صحیح) و اضافه‌کردن حالت transfer به type chip.
(A12) RecipeCard بدون دکمه‌ی ویرایش بود. فیکس: دکمه‌ی Pencil اضافه شد + wizard با پیش‌پرشدن همه‌ی فیلدها از رسپی موجود باز می‌شود.
(A1) دکمه‌ی reversal روی حواله‌ی stocktake فعال بود ولی همیشه NOT_REVERSIBLE برمی‌گرداند. فیکس: `v.kind === 'stocktake'` به شرط disabled اضافه شد + tooltip توضیح می‌دهد.
**فایل‌ها:** `components/transactions/TxDetailPanel.tsx`، `app/(app)/inventory/recipes/page.tsx`، `app/(app)/inventory/cartable/page.tsx`
**Build:** tsc ✅ ۰ خطا · tests ✅ 32/32. Commits: afe288f (B1), 2a0836f (B5+B6), 773c557 (A12), cb01f7f (A1).
**ناتمام:** —
**برای جلسه‌ی بعد:** تست شکاف ۱ رسپی + تصمیم اولویت موج ۲ (🟠 مورد‌های متوسط از audit).

## 📓 2026-06-29 — UX Consistency Audit (بررسی سراسری ۳ الگو) — اکانت ۱
**چه شد:** بررسی سراسری ۳ الگوی UX در ۴ ماژول اصلی (انبار/حسابداری/پرسنل/منو-سفارش) با ۴ agent موازی. ۳۵+ یافته در ۳ دسته اولویت‌بندی شدند: باگ واقعی / عمدی‌درست / نیاز به تصمیم. بحرانی‌ترین: B1/B5/B6 در TxDetailPanel (label غلط + silent fail) و A12 (رسپی بدون ویرایش). آماده‌ترین فیکس‌ها: C1 (reverse حقوق)، D12/D13/D14 (ویرایش دسته/رزرو/کوپن — API آماده).
**فایل‌ها:** `project-docs/INVESTIGATION-ux-consistency-audit.md` (جدید)، `HANDOFF.md`.
**Build:** بدون تغییر کد — tsc/tests دست‌نخورده ✅ 32/32.
**ناتمام:** —
**برای جلسه‌ی بعد:** منتظر تأیید کاربر برای شروع فیکس‌ها (کدام ماژول اول؟).


