# handoff-archive.md — ژورنال‌های آرشیوشده

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
