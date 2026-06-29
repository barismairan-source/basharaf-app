# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.51-payroll-contacts-fixes` |
| **آخرین به‌روزرسانی** | 2026-06-29 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · tests ✅ 32/32 |
| **دیپلوی** | ✅ **GitHub Actions فعال** — هر push به main خودکار deploy می‌شود (`basharaff` روی لیارا). 🟡 **۴ migration** در انتظار اجرای دستی در pgAdmin: `db-accounting-v1-migration.sql`، `db-admin-migration.sql`، `db-notifications-v2-migration.sql`، `db-financial-periods-migration.sql`. (اجراشده ✅: فاز۱ آشپزخانه + `db-user-roles-migration.sql`) |
| **کار نیمه‌تمام (in-progress)** | منتظر نتیجه‌ی endpoint تشخیصی `/api/admin/diag` از کاربر (مشکل ۲ و ۳). |
| **کار بعدی پیشنهادی** | (۱) کاربر `/api/admin/diag` را باز کند و نتیجه را بدهد. (۲) بعد: فیکس ۲ (reverse payroll) + فیکس ۳ (contact balance) بسته به داده. |
| **بلاک‌شده/منتظر کاربر** | نتیجه‌ی `GET /api/admin/diag` (SuperAdmin) — برای تشخیص مشکل ۲ و ۳. |

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

## 📓 2026-06-29 — شکاف ۱: لینک رسپی به آیتم منو + هشدار اختلاف قیمت — اکانت ۱
**چه شد:** شکاف ۱ (sync قیمت رسپی ↔ منو) پیاده شد — گزینه‌ی B (دو قیمت مستقل + هشدار اختلاف):
(۱) `recipes/route.ts`: `menuItemId` به `saveSchema` اضافه شد (nullable/optional) + در insert/update نوشته می‌شود. audit برای تغییر قیمت رسپی (`inv.recipe.priceChanged`) با مقایسه‌ی قیمت قبل/بعد.
(۲) wizard (step 3): سلکتور اختیاری «لینک به آیتم منو» — آیتم‌های منو از `/api/menu` fetch می‌شوند. دکمه‌ی «استفاده از قیمت منو: X تومان» قیمت رسپی را پر می‌کند (دستی، نه sync خودکار).
(۳) `costing/route.ts`: اگر `menuItemId` ست بود، join به `menu_items` و `menuPrice`/`menuPriceTakeaway` در خروجی costing برگشت داده می‌شود.
(۴) `RecipeCard`: اگر costing باز باشد و `menuPrice` با `recipe.price` فرق داشته باشد، هشدار warn نشان داده می‌شود.
(۵) `lib/auth/audit.ts`: `inv.recipe.priceChanged` به union اضافه شد.
**فایل‌ها:** `lib/auth/audit.ts`, `app/api/inventory/recipes/route.ts`, `app/api/inventory/recipes/[id]/costing/route.ts`, `types/inventory.ts`, `app/(app)/inventory/recipes/page.tsx`
**Build:** tsc ✅ ۰ خطا · build ✅ سبز · tests ✅ 32/32
**ناتمام:** —
**برای جلسه‌ی بعد:** تست شکاف ۱ توسط کاربر. بعد از تأیید، شکاف ۳ variance.

## 📓 2026-06-28 — تأیید فرضیات شکاف ۱ و ۳ رسپی (فاز بررسی) — اکانت ۱
**چه شد:** قبل از پیاده‌سازی دو شکاف قدیمی رسپی‌ساز، فرضیات با کد فعلی تطبیق داده شد (بعد از جداسازی انبار/آشپزخانه و prep page). نتیجه: **هر دو فرضیه هنوز معتبرند.** شکاف ۱: costing از `inv_recipes.price` می‌خواند، wizard `menuItemId` نمی‌نویسد، هیچ sync نیست. شکاف ۳: variance theoretical از voucher_lines kind=sale با فیلتر `updatedAt`؛ مسیر ۲/۳ نامرئی. **پیش‌نیاز چک‌نشده‌ی شکاف ۳ حل شد:** `inv_stock_tx.jalali_date` موجود و notNull است (`schema.ts:1025`) → بازسازی actual بدون migration ممکن. نکات جدید: inv_stock_tx ستون branchId ندارد (فیلتر via join به inv_items)، ایندکس روی jalali_date ندارد (migration اختیاری perf). inv_daily_sales.lines دو شکل دارد (count/qty).
**فایل‌ها:** `project-docs/INVESTIGATION-recipe-costing-gaps-1-3.md` (جدید). هیچ کد اجرایی تغییر نکرد.
**Build:** بدون تغییر کد — tsc/tests دست‌نخورده ✅ 32/32.
**ناتمام:** منتظر تأیید کاربر برای شروع شکاف ۱ (گزینه‌ی B).
**نکته:** git status یک حذف `components/notifications/.gitkeep` دارد که کار من نیست — دست نزدم، در commitهایم نیاوردم.

## 📓 2026-06-28 — فیکس timeout دیپلوی Liara — اکانت ۱
**چه شد:** دیپلوی Liara بعد از «✓ Compiled successfully» در مرحله‌ی «Linting and checking validity of types» بیش از ۲۰ دقیقه گیر می‌کرد و timeout (exit 2). علت: `next build` روی builder محدود Liara هم ESLint هم type-check را اجرا می‌کرد. راه‌حل (الگوی استاندارد):
(۱) `next.config.mjs`: `eslint.ignoreDuringBuilds: true` + `typescript.ignoreBuildErrors: true` → build حالا «Skipping validation of types / Skipping linting» می‌زند و سریع تمام می‌شود.
(۲) برای حفظ گیت type-safety، به `.github/workflows/liara.yml` مراحل `npm ci` → `npm run type-check` → `npm test` **قبل از** deploy اضافه شد. اگر tsc یا tests fail شود، deploy اجرا نمی‌شود. پس چک‌ها از Liara به GitHub Actions (با زمان سخاوتمند) منتقل شدند، نه حذف.
**فایل‌ها:** `next.config.mjs`، `.github/workflows/liara.yml`.
**Build:** محلی ✅ سبز (Skipping validation/linting) · tsc ✅ ۰ خطا · tests ✅ 32/32
**ناتمام:** — (دیپلوی بعدی باید سبز شود؛ بعد از push نتیجه‌ی Actions را چک کن.)


