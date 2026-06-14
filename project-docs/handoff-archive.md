# handoff-archive.md — ژورنال‌های آرشیوشده

## 📓 2026-06-10 — رفع 28P01 لیارا + قرارداد انتشار نسخه‌دار (Backlog #4) — اکانت ۱
**چه شد:** ریشه‌ی خطای `28P01` لیارا پیدا شد: پارسر داخلی `postgres-js` برای جدا کردن host از userinfo از **اولین** `@` در connection string استفاده می‌کند نه آخرین؛ اگر پسورد auto-generated پنل لیارا شامل کاراکترهای خاص (`@ # % &`) باشد و percent-encode نشده باشد، host/user/pass اشتباه پارس می‌شوند → `28P01` حتی با پسورد درست در پنل. در `lib/db/client.ts` تابع `parseDatabaseUrl` اضافه شد: با یک regex حریصانه آخرین `@` قبل از host را پیدا می‌کند، user/pass/host/port/db را جدا می‌کند و به‌صورت آبجکت (نه رشته) به `postgres()` می‌دهد — این مسیر اصلاً وارد پارسر باگ‌دار نمی‌شود. پسورد چه percent-encode شده چه raw درست خوانده می‌شود (دستی با ۶ نمونه‌ی ادج‌کیس شامل `@ # / %` تست شد). منطق auto-detect SSL/`DATABASE_SSL` و رفتار Vercel+Supabase دست‌نخورده ماند. مستندسازی در `DEPLOY-LIARA.md` (بخش عیب‌یابی) اضافه شد.
همچنین **قرارداد انتشار نسخه‌دار** جدید برقرار شد: هر release یک پوشه‌ی `vX.Y.Z/` در ریشه (مطابق `package.json.version`) شامل `basharaf-deploy.zip` (خروجی `git archive HEAD` — بدون node_modules/.next/.git) به‌علاوه‌ی فایل(های) migration جدید یا `NO_SQL_MIGRATION_REQUIRED.txt`. `package.json` از `9.0.0` به `9.1.0` ارتقا یافت تا با این قرارداد هم‌راستا شود.
**فایل‌ها:** `lib/db/client.ts` (+`parseDatabaseUrl`)، `DEPLOY-LIARA.md` (+بخش عیب‌یابی `28P01`)، `package.json` (نسخه `9.1.0`)، `v9.1.0/basharaf-deploy.zip` + `v9.1.0/NO_SQL_MIGRATION_REQUIRED.txt` (جدید، خارج از کنترل git به‌جز فایل marker).
**Build:** tsc سبز ✅ (۰ خطا) / build سبز ✅
**ناتمام:** فیکس روی production لیارا تست نشده — نیاز به deploy واقعی توسط کاربر و گزارش نتیجه.
**برای جلسه‌ی بعد:** کاربر `v9.1.0/basharaf-deploy.zip` را روی لیارا deploy کند. اگر اتصال DB موفق شد → Backlog #5 (اجرای واقعی integration tests) یا Backlog #6. اگر باز هم `28P01` بود → username/host دقیق connection string کاربر را بررسی کن (نه فقط فرمت پسورد).

---

## 📓 2026-06-10 — integration tests برای balance guardها (Backlog #5) — اکانت ۱
**چه شد:** سه سناریوی Backlog #5 با Node.js test runner داخلی (`node --test` از طریق `tsx` — صفر وابستگی جدید) پیاده شد: (A) DELETE اتمیک یک تراکنش approved → reverse کامل صندوق، مانده‌ی طرف‌حساب، موجودی انبار (`qtyBase`) و حذف سند COGS + ثبت ردیف معکوس `inv_stock_tx`؛ (B) PATCH فیلد مالی روی approved → 422 `FINANCIAL_FIELDS_IMMUTABLE_AFTER_APPROVAL` (شامل تست «فقط حضور کلید کافی است، حتی با همان مقدار»)؛ (C) PATCH فیلد غیرمالی (note/receipt/categoryId) روی approved → ۲۰۰، بدون اثر بر amount/balance. تست‌ها یک نمونه‌ی واقعی `next start` بالا می‌آورند، با لاگین واقعی کوکی session می‌گیرند و روی fixtureهای ایزوله با پیشوند `__INTEGRATION_TEST__` کار می‌کنند که در پایان کامل پاک می‌شوند. به دستور کاربر: روی production اجرا نشد، schema دست‌نخورد، هیچ SQL جدیدی لازم نشد. کل suite اگر `DATABASE_URL` ست نباشد با پیام فارسی skip می‌شود (تأیید شد: `npm run test:integration` بدون DB → exit 0، صفر تست اجراشده).
**فایل‌ها:** `tests/integration/transactions.test.ts`، `tests/integration/helpers/env.ts`، `tests/integration/helpers/server.ts`، `tests/integration/helpers/fixtures.ts`، `tests/integration/helpers/api.ts`، `package.json` (+اسکریپت `test:integration`).
**Build:** tsc سبز ✅ (۰ خطا) / build سبز ✅. اجرای واقعی تست‌ها روی DB واقعی هنوز تأیید نشده.
**ناتمام:** اجرا/تأیید این تست‌ها روی یک دیتابیس واقعی غیر-production — منتظر تصمیم کاربر برای محیط تست.
**برای جلسه‌ی بعد:** اگر DATABASE_URL تست آماده شد → `npm run build && npm run test:integration` و گزارش نتیجه. وگرنه Backlog #4 (Liara `28P01`).

---

## 📓 2026-06-10 — آدیت امنیتی Backlog #3 (_diag) — اکانت ۱
**چه شد:** اسکن کامل `app/api/` برای endpoint تشخیصی یا افشای credential. نتیجه: `/api/_diag` هرگز در این کدبیس وجود نداشته. تمام استفاده‌های `process.env` فقط در `lib/` و برای پیکربندی داخلی است — هیچ‌کدام در پاسخ HTTP بازگردانده نمی‌شوند. یک string literal در پیام خطای آپلود نام متغیر محیطی را ذکر می‌کند ولی مقدار را فاش نمی‌کند (مشکل نیست). هیچ کدی تغییر نکرد.
**فایل‌ها:** — (فقط آدیت، بدون تغییر کد)
**Build:** tsc سبز ✅ (بدون تغییر)
**ناتمام:** —
**برای جلسه‌ی بعد:** Backlog #5 — تست integration برای balance guardها.

---

## 📓 2026-06-10 — account selection در تأیید رسید خرید (Backlog #2) — اکانت ۱
**چه شد:** `postPurchaseToAccounting` جستجوی داخلی حساب را حذف کرد و `resolvedAccountId` را به‌عنوان آرگومان صریح دریافت می‌کند. approve route: `accountId` (optional uuid) به `bodySchema` اضافه شد؛ priority: body.accountId (validate) → first active account for branch → 422 `NO_ACTIVE_ACCOUNT`. UI: تأیید رسید (kind='in') modal انتخاب صندوق نشان می‌دهد (accounts از store، موجودی نمایشی)؛ سایر انواع بدون تغییر. `tsconfig.json`: `release-artifacts/` و `graphify-out/` از کامپایل خارج شدند.
**فایل‌ها:** `lib/inventory/postToAccounting.ts`، `app/api/inventory/vouchers/[id]/approve/route.ts`، `lib/repos/inventory.types.ts`، `lib/repos/inventory.api.ts`، `app/(app)/inventory/page.tsx`، `tsconfig.json`.
**Build:** tsc سبز ✅ / build سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** Backlog #3 یا Backlog #5.

---

## 📓 2026-06-10 — stocktake accounting entry (Backlog #1) — اکانت ۱
**چه شد:** تابع `postStocktakeToAccounting` به `lib/inventory/postToAccounting.ts` اضافه شد. در approve route، قبل از loop متغیر `stocktakeVarianceCost` تعریف شد؛ داخل loop به‌ازای هر خط `diff * pre.a` (WAC قبل از تأیید) انباشته می‌شود. بعد از loop، اگر مغایرت ≠ ۰، یک تراکنش با `accountId: null` ساخته می‌شود: کسری → expense «هزینه مغایرت انبارگردانی - فیش شماره X»، مازاد → income «درآمد تعدیل انبارگردانی - فیش شماره X». اتمیک با همان db.transaction؛ idempotent با linkedTransactionId؛ برگه با txId وصل می‌شود.
**فایل‌ها:** `lib/inventory/postToAccounting.ts` (+`postStocktakeToAccounting`)، `app/api/inventory/vouchers/[id]/approve/route.ts` (+import، +variance accumulator، +accounting call).
**Build:** tsc سبز ✅ / build سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** account selection در خرید (Backlog #2).

---

## 📓 2026-06-10 — سامان‌دهی commitهای CRM + cleanup — اکانت ۱
**چه شد:** همه‌ی فایل‌های uncommit از جلسات قبل (ماژول CRM + SQL migrationها) در دو commit منطقی جدا سامان‌دهی شدند. `*.zip` و `release-artifacts/` به `.gitignore` اضافه شد. tsc (۰ خطا) و build (سبز) تأیید شد.
**فایل‌ها:** ماژول CRM، `supabase-v5/v6/v7-migration.sql`، `.gitignore`، `HANDOFF.md`.
**Build:** tsc سبز ✅ / build سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** stocktake accounting entry (Backlog #1).

---

## 📓 2026-06-10 — رفع ۴ باگ production (بازسازی از commit 3050ae4) — اکانت _(؟)_
**چه شد:** (۱) نوع طرف‌حساب read-only بود: `z.enum→z.string` در POST/PATCH schema؛ ردیف ویرایش inline با datalist آزاد اضافه شد. (۲) دکمه‌ی «ثبت تراکنش» از header صفحه‌ی تراکنش‌ها حذف شده بود؛ بازگردانده شد. (۳) خطای import bulk پیام generic نشان می‌داد؛ اصلاح: `data.error` قبل از fallback عمومی. (۴) ارسال voucher با 500 crash می‌کرد: conditional spread برای `expiryDate` (جلوگیری از column-not-found پیش از migration v6)؛ باگ FK در approve route (`id`→`linkedTransactionId ?? null`) اصلاح شد.
**فایل‌ها:** `app/(app)/contacts/page.tsx`، `app/(app)/transactions/page.tsx`، `app/api/contacts/[id]/route.ts`، `app/api/contacts/route.ts`، `app/api/inventory/vouchers/[id]/approve/route.ts`، `app/api/inventory/vouchers/route.ts`، `components/transactions/ImportPanel.tsx`.
**Build:** سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** —

---

## 📓 2026-06-10 — ۴ ابزار آشپزخانه (اولویت S) — اکانت _(؟)_
**چه شد:** (۱) کارت بهای رسپی: grid ۴ستونه با حاشیه سود = ۱۰۰−foodCost٪ (قرمز اگر <۳۰٪)؛ قیمت پیشنهادی فقط وقتی >۵٪ اختلاف. (۲) ماشین‌حساب پرس client-side با `useMemo` — badge سبز/زرد/قرمز + گلوگاه (bottleneck) با نام؛ `overridePct` لحاظ شد. (۳) کارت رسپی چاپ‌پذیر: پنجره‌ی HTML خالص + `window.print()`، اعداد لاتین، بدون قیمت. (۴) هشدار انقضا: API جدید `GET /api/inventory/expiry` از `inv_stock_tx.expiryDate` (جلالی→`jalaliToDate`)، UI به‌صورت `ExpiryWarningsSection` بالای تب موجودی.
**فایل‌ها:** `types/inventory.ts` (+`ExpiryWarning`)، `app/api/inventory/expiry/route.ts` (جدید)، `lib/repos/inventory.types.ts` و `inventory.api.ts` (+`expiryWarnings()`)، `app/(app)/inventory/page.tsx` (RecipeCard + ExpiryWarningsSection + RecipesTab).
**Build:** سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** دو 🟡 باقی‌مانده‌ی `inventory-audit.md`: stocktake accounting entry (مغایرت در P&L ثبت نمی‌شود) و account selection در خرید (انتخاب دستی صندوق به‌جای اولین حساب فعال).

---

## 📓 2026-06-10 — رفع ۳ باگ بحرانی انبار↔حسابداری — اکانت _(؟)_
**چه شد:** (۱) `produceConfirmed` در `lib/db/inventoryHelpers.ts`: yield اعمال نمی‌شد؛ حالا برای هر خط رسپی `yieldPct` از DB خوانده و ضریب `100/yield` اعمال می‌شود (هم‌فرمول `menuSaleDeduction`). (۲) برگه‌ی انبارگردانی `invStockTx` نمی‌نوشت (`continue` رد می‌کرد)؛ حالا `preStocktakeQtys` پیش‌خوانی و بعد از تأیید، اختلاف درج می‌شود — هم‌رفتار مسیر مستقیم API. (۳) موجودی ناکافی فروش منو فقط در audit پنهان بود؛ حالا اعلان `info` به همه‌ی SuperAdminها (فروش block نمی‌شود).
**فایل‌ها:** `lib/db/inventoryHelpers.ts`، `app/api/inventory/vouchers/[id]/approve/route.ts`، `app/api/transactions/[id]/approve/route.ts`.
**Build:** سبز ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** ابزارهای آشپزخانه (انجام شد در ورودی بالا) + دو 🟡 stocktake/account-selection.

---

## 📓 2026-06-09 — رفع ۴ باگ بحرانی + اصلاح Sidebar — اکانت _(؟)_
**چه شد:** حفاظ‌های حذف: صندوق با مانده≠۰ → خطای ۴۰۹ فارسی؛ طرف‌حساب با بدهی/طلب → ۴۰۹؛ کوپن GET فیلتر isActive؛ حذف کاربر دارای تراکنش → ۴۰۹. Sidebar: برچسب‌ها اصلاح شد.
**فایل‌ها:** `app/api/accounts/[id]/route.ts`، `app/api/contacts/[id]/route.ts`، `app/api/coupons/route.ts`، `app/api/users/[id]/route.ts`، `components/layout/Sidebar.tsx`.
**Build:** سبز ✅ | **ناتمام:** —

## 📓 2026-06-09 — بازطراحی UX ناوبری (Sidebar/Mobile) — اکانت _(؟)_
**چه شد:** Sidebar دسکتاپ ۲۴۰/۶۴px با toggle؛ موبایل: drawer راست + BottomTabBar (۵ تب، مجوزمحور، tap target ≥۴۸px).
**فایل‌ها:** `types/preferences.ts`، `components/layout/Sidebar.tsx`، `MobileMenu.tsx`، `BottomTabBar.tsx`، `layout/index.ts`، `app/(app)/layout.tsx`.
**Build:** سبز ✅ | **ناتمام:** —

---

> ورودی‌های قدیمی‌تر از HANDOFF.md که برای نگهداری تاریخچه منتقل شده‌اند.

---

## 📓 2026-06-09 — آدیت یکپارچگی انبار↔حسابداری — اکانت _(؟)_
**چه شد:** ردیابی e2e شش جریان انبار↔حسابداری؛ گزارش در `project-docs/inventory-audit.md`. سه 🔴: yield اعمال نمی‌شد؛ stocktake لاگ نمی‌نوشت؛ هشدار موجودی به مدیر نمی‌رسید. فقط آدیت. (🔴ها در جلسات بعدی رفع شدند.)
**فایل‌ها:** `project-docs/inventory-audit.md`. | **Build:** بدون تغییر. | **ناتمام:** —

## 📓 2026-06-09 — آدیت دامین‌لاجیک — اکانت _(؟)_
**چه شد:** گزارش در `project-docs/domain-audit.md`. چهار 🔴 (حذف صندوق/طرف‌حساب بدون چک مانده، کوپن بدون فیلتر isActive، crash حذف کاربر) + دو 🟡 sidebar. هیچ کدی تغییر نکرد. (🔴ها در ورودی‌های بعدی رفع شدند.)
**فایل‌ها:** `project-docs/domain-audit.md` (جدید).
**Build:** بدون تغییر کد.
**ناتمام:** —
**برای جلسه‌ی بعد:** رفع چهار 🔴 (انجام شد).

## 📓 2026-06-09 — رفع باگ حذف قلم انبار — اکانت _(؟)_
**چه شد:** حذف قلم soft-delete است (`isActive=false` به‌خاطر FK restrict) ولی GET فیلتر نداشت → قلم بعد از refresh برمی‌گشت. اصلاح: `ne(isActive,false)` در where برای همه‌ی نقش‌ها.
**فایل‌ها:** `app/api/inventory/items/route.ts`.
**Build:** سبز ✅
**ناتمام:** —
