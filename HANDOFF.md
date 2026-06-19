# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.28-accounting-v1` |
| **آخرین به‌روزرسانی** | 2026-06-19 — اکانت: ۲ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ سبز |
| **دیپلوی** | 🟡 migration لازم دارد. `db-accounting-v1-migration.sql` باید در pgAdmin روی Liara اجرا شود قبل از دیپلوی. |
| **کار نیمه‌تمام (in-progress)** | — |
| **کار بعدی پیشنهادی** | (۱) اجرای `db-accounting-v1-migration.sql` در pgAdmin روی Liara. (۲) دیپلوی zip روی Liara. (۳) اضافه کردن فیلد `invoiceCode` به فرم ثبت تراکنش (اختیاری، برای پیش‌فاکتورها). |
| **بلاک‌شده/منتظر کاربر** | تأیید migration و دیپلوی |

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

## 📓 2026-06-19 — v0.9.28: Accounting Overhaul v1 (proforma + invoiceCode + contact ledger) — اکانت ۲
**چه شد:**
(۱) **Phase 1 — Schema:** `proforma` به `txStatusEnum` اضافه شد. فیلد `invoice_code TEXT` به جدول `transactions` اضافه شد. فایل `db-accounting-v1-migration.sql` برای pgAdmin/Liara آماده شد (idempotent). `serializers.ts`، `types/transaction.ts`، `lib/colors.ts`، `RecentList.tsx` به‌روز شدند تا `proforma` را بشناسند.
(۲) **Phase 2 — Ledger Utility:** `lib/db/contactLedger.ts` ساخته شد: `calculateContactBalance(id)` (dynamic از approved txها) و `getContactLedger(id)` (تمام تراکنش‌های نسیه). API endpoint جدید: `GET /api/contacts/[id]/ledger`.
(۳) **Phase 3 — Contacts UI:** ردیف‌های صفحه طرف‌حساب‌ها کلیک‌پذیر شدند. `ContactLedgerDrawer` ساخته شد: drawer سمت راست با مانده‌ی پویا + تاریخچه تراکنش‌ها + دکمه چاپ.
(۴) **Phase 4 — Transactions UI:** `StatusPill` برای `proforma` (amber) به‌روز شد. `invoiceCode` در زیر عنوان هر تراکنش نمایش داده می‌شود. فیلتر وضعیت «پیش‌فاکتور» اضافه شد.
(۵) **نکته حیاتی:** پیش‌فاکتور هیچ اثری روی موجودی صندوق یا طرف‌حساب ندارد — حتی اگر SuperAdmin آن را ثبت کند. فقط approve صریح از `pending/proforma` → `approved` اثر مالی می‌گذارد.
**فایل‌ها:** `lib/db/schema.ts`, `lib/db/serializers.ts`, `lib/db/createExpenseTx.ts`, `lib/db/contactLedger.ts`, `lib/colors.ts`, `types/transaction.ts`, `lib/realtime/useRealtime.ts`, `components/ui/StatusPill.tsx`, `components/dashboard/RecentList.tsx`, `components/transactions/TxDetailPanel.tsx`, `components/contacts/ContactLedgerDrawer.tsx`, `app/(app)/contacts/page.tsx`, `app/(app)/transactions/page.tsx`, `app/api/transactions/route.ts`, `app/api/transactions/[id]/approve/route.ts`, `app/api/contacts/[id]/ledger/route.ts`, `db-accounting-v1-migration.sql`, `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** فیلد `invoiceCode` در فرم ثبت تراکنش جدید (`transactions/new`) نمایش داده نمی‌شود — می‌توان بعداً اضافه کرد.
**برای جلسه‌ی بعد:** (۱) اجرای `db-accounting-v1-migration.sql` در pgAdmin. (۲) دیپلوی. (۳) تست ledger drawer روی طرف‌حساب‌های واقعی.

## 📓 2026-06-19 — v0.9.27: App Shell + Enterprise Header + Sidebar resize — اکانت ۲
**چه شد:**
(۱) **App Shell (`app/(app)/layout.tsx`):** Wrapper از `min-h-screen flex flex-col` (صفحه بلند = کل سند scroll می‌کرد) → `h-screen flex overflow-hidden` (viewport ثابت). حالا Sidebar و main هر کدام مستقلاً scroll می‌کنند.
(۲) **Sidebar (`Sidebar.tsx`):** `h-screen sticky top-0` → `h-full` (درون shell کافی است). Width: `w-60`/`w-16` → `w-64`/`w-20`. Duration: `duration-200` → `duration-300`. nav داخلی scrollbar مخفی شد (`[&::-webkit-scrollbar]:w-0 [scrollbar-width:none]`). Brand row از `h-14` → `h-16` (هم‌ارتفاع با Header جدید).
(۳) **Header (`Header.tsx`):** `h-14 justify-end bg-surface` → `h-16 justify-between bg-surface/95 backdrop-blur-sm shrink-0`. ساختار: سمت راست (start در RTL) = slot خالی برای `GlobalBranchSelector` آینده؛ سمت چپ (end در RTL) = Realtime + Bell + UserMenu.
(۴) **inventory/items:** Sticky search bar از `top-14` → `top-16` (offset صحیح با Header جدید).
**فایل‌ها:** `app/(app)/layout.tsx`، `components/layout/Sidebar.tsx`، `components/layout/Header.tsx`، `app/(app)/inventory/items/page.tsx`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** ساخت `GlobalBranchSelector` و mount در slot راست Header. دیپلوی روی Liara.

## 📓 2026-06-19 — v0.9.26: یکپارچه‌سازی design tokens در Input/Select/Textarea — اکانت ۲
**چه شد:**
رنگ‌های hardcoded (`stone-*`, `rose-*`, `bg-white`) در همه primitive های فرم با design tokens جایگزین شدند:
(۱) **Input.tsx:** `border-stone-200` → `border-border`؛ `focus-within:border-stone-500` → `focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20`؛ `bg-white` → `bg-surface`؛ `text-stone-800` → `text-text`؛ placeholder `text-stone-400` → `text-muted/60`؛ `bg-stone-50/60` → `bg-bg opacity-60`؛ `border-rose-300` → `border-danger`؛ `h-11` → `h-10` (هم‌راستا با Select).
(۲) **Select.tsx:** همان token‌ها + `focus:ring-2 focus:ring-accent/20`.
(۳) **Textarea.tsx:** همان + `focus:ring-2 focus:ring-accent/20` / `focus:ring-danger/20` در حالت خطا.
(۴) **PasswordInput.tsx:** به‌روزرسانی همان‌طور که Input.tsx.
(۵) **transactions/new:** error banner از `bg-rose-50 border-rose-100 text-rose-700` → `bg-danger-subtle border-danger/20 text-danger`؛ checkbox از `border-stone-300 accent-stone-900` → `border-border accent-accent`.
تغییر مهم: `h-11` (Input form) → `h-10` — هم‌راستا با Select. چون از `<Input>` و `<Select>` استفاده می‌شود، تمام صفحات به‌صورت خودکار به‌روز شدند.
**فایل‌ها:** `components/ui/Input.tsx`، `components/ui/Select.tsx`، `components/ui/Textarea.tsx`، `components/ui/PasswordInput.tsx`، `app/(app)/transactions/new/page.tsx`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** دیپلوی روی Liara + تنظیم `CUSTOMER_JWT_SECRET`.

## 📓 2026-06-19 — v0.9.25: grid layout فرم تراکنش + تنظیمات منو — اکانت ۲
**چه شد:**
(۱) **فرم ثبت تراکنش (`transactions/new`):** `max-w-2xl` → `max-w-3xl`؛ تمام فیلدها از `space-y-5` (ستون واحد) به sectional grid تبدیل شدند: عنوان+مبلغ، دسته+شعبه، رسید+تاریخ هر کدام در `grid grid-cols-1 md:grid-cols-2`؛ فیلدهای پهن (نوع، صندوق، VAT، طرف‌حساب، توضیحات) کل عرض را می‌گیرند. دکمه submit از `w-full` به footer `flex justify-end + border-t border-border` با دکمه «انصراف» کنار آن تبدیل شد.
(۲) **SettingsTab منو (`menu/page.tsx`):** اولین Card از `space-y-4` (ستون واحد) به `grid grid-cols-1 sm:grid-cols-2` شد. فونت+تلفن در یک ردیف، اینستاگرام در ردیف بعد، آدرس فارسی و انگلیسی با `sm:col-span-2` (full width — textarea). دکمه ذخیره از `flex justify-end` ساده به footer با `border-t border-border pt-4 mt-2` ارتقا یافت و عنوان «ذخیره تنظیمات» گرفت.
**فایل‌ها:** `app/(app)/transactions/new/page.tsx`، `app/(app)/menu/page.tsx`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** دیپلوی روی Liara + تنظیم `CUSTOMER_JWT_SECRET`.

## 📓 2026-06-18 — v0.9.24: UI polish (EmptyState + card hover + add-row button) — اکانت ۲
**چه شد:**
(۱) **EmptyState در recipes:** متن ساده «هنوز رسپی‌ای ثبت نشده» → کامپوننت EmptyState با آیکون ChefHat، توضیح، و دکمه CTA «رسپی جدید».
(۲) **EmptyState در cartable:** div plain «برگه‌ای در انتظار تأیید نیست» → EmptyState با آیکون ClipboardList و توضیح راهنما.
(۳) **کارت‌های اقدام موجودی (hover/active):** `transition-colors` → `transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]` + `cursor-pointer`.
(۴) **دکمه «افزودن قلم» — ۴ جا:** استایل `text-muted hover:text-text py-1` → `w-full border border-dashed border-border rounded-lg py-2.5 justify-center hover:bg-bg hover:border-text/30` — الان secondary و visible است نه گم‌شده.
**فایل‌ها:** `app/(app)/inventory/recipes/page.tsx`، `app/(app)/inventory/cartable/page.tsx`، `app/(app)/inventory/page.tsx`، `app/(app)/inventory/receive/page.tsx` (۲ جا)، `app/(app)/purchase-orders/page.tsx`، `app/(app)/purchase-orders/[id]/page.tsx`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** دیپلوی روی Liara + تنظیم `CUSTOMER_JWT_SECRET`.

## 📓 2026-06-18 — v0.9.23: PageHeader + RTL wizard arrows — اکانت ۲
**چه شد:**
(۱) **کامپوننت PageHeader (جدید):** `components/ui/PageHeader.tsx` — هدر استاندارد صفحات فرعی. دکمه «→ بازگشت» با ArrowRight (در RTL به معنای رفتن به عقب = راست). `backHref` یا `onBack` یا `router.back()`. `actions` slot برای دکمه‌های سمت چپ. export شده از `components/ui/index.ts`.
(۲) **اعمال روی ۸ صفحه فرعی انبار:** receive/stocktake/sales/plan/variance/cartable + exceptions (با دکمه refresh در actions) + items (با دکمه افزودن در actions). همه `backHref="/inventory"`.
(۳) **accounts/[id]:** PageHeader جایگزین دکمه back دست‌ساز شد؛ عنوان = نام صندوق؛ دکمه چاپ در actions.
(۴) **فلش‌های ویزارد رسپی (RTL fix):** باگ: `← قبلی` و `بعدی →` با Unicode char — در RTL flex ← روی سمت راست (اشتباه برای قبلی) و → سمت چپ (اشتباه برای بعدی). اصلاح: «قبلی» → `ArrowRight` اول در DOM (در RTL flex = سمت راست = درست برای برگشت)؛ «بعدی» → text اول + `ArrowLeft` بعد (در RTL flex = سمت چپ = درست برای پیشروی).
**فایل‌ها:** `components/ui/PageHeader.tsx` (جدید)، `components/ui/index.ts`، `app/(app)/inventory/{receive,stocktake,sales,plan,variance,cartable,exceptions,items}/page.tsx`، `app/(app)/accounts/[id]/page.tsx`، `app/(app)/inventory/recipes/page.tsx`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** دیپلوی روی Liara + تنظیم `CUSTOMER_JWT_SECRET`.

## 📓 2026-06-18 — v0.9.22: رفع باگ ساختاری auth (401 interceptor) — اکانت ۲
**چه شد:**
۳ فایل تغییر یافت تا session منقضی‌شده دیگر کاربر را stuck نگذارد:
(۱) `lib/repos/api.ts` — `apiFetch` interceptor: هر جواب 401 = فوری `window.location.replace('/login')`. promise هرگز resolve نمی‌شود تا component crash نکند. چک pathname برای جلوگیری از redirect loop.
(۲) `store/index.ts` — `bootstrap()`: اگر `/api/auth/me` جواب 401 داد، redirect صریح به login (قبلاً فقط `bootstrapped: true` می‌گذاشت، کاربر روی صفحه blank می‌ماند).
(۳) `store/slices/appSettingsSlice.ts` — `_loadAppSettings` و `updateSetting` به `apiFetch` تبدیل شدند تا از interceptor بهره ببرند.
**چرا این نه آن:** middleware فقط روی navigation اجرا می‌شود، نه روی fetch‌های in-page. وقتی session mid-session منقضی می‌شود، هیچ navigation‌ای رخ نمی‌دهد پس middleware کمکی نمی‌کند — interceptor client-side الزامی است.
**درباره 404 روی Liara:** کد صحیح است؛ 404 از cold-start یا proxy Liara است نه کد. با interceptor، 404 مثل 401 handle می‌شود (redirect به login).
**فایل‌ها:** `lib/repos/api.ts`، `store/index.ts`، `store/slices/appSettingsSlice.ts`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** دیپلوی روی Liara. تنظیم `CUSTOMER_JWT_SECRET` در env Liara.

## 📓 2026-06-18 — v0.9.21: ویزارد رسپی ۳-مرحله‌ای + ناوبری یکپارچه (S1/S2/S3) — اکانت ۲
**چه شد:**
(۱) **Recipe Wizard (S-recipe):** افزودن رسپی از modal تک‌صفحه به ویزارد ۳-قدمی تبدیل شد: قدم ۱ (نام+پخت+پرس+شعبه)، قدم ۲ (جستجو و انتخاب مواد + live cost bar کلاینت‌ساید)، قدم ۳ (قیمت فروش + food cost رنگی سبز/زرد/قرمز). محاسبه‌ی هزینه بدون API round-trip با `avgCostPerBase × qty / (yieldPct/100)` انجام می‌شود. نقش Chef هم اجازه‌ی ذخیره دارد (قبلاً فقط SuperAdmin). فرمول دقیقاً با `costRecipe` سرور هماهنگ است.
(۲) **S3 — ناوبری یکپارچه:** دو ناوبری موازی (هامبرگر هدر + drawer) به یک نوار پایین ۵-تبه + تب «⋮ بیشتر» (MoreSheet) تبدیل شد. `nav-config.ts` به‌عنوان فایل مشترک بدون وابستگی دوری ایجاد شد. `MobileMenu.tsx` حذف و از `Header.tsx` و `index.ts` پاک‌سازی شد.
(۳) **S1 — sidebar بیشتر:** آیتم‌های نادر «روابط و منابع» (کوپن‌ها، پرسنل، حقوق، استخدام) با فیلد `rarely: true` در nav-config علامت‌گذاری شدند. در Sidebar دسکتاپ این موارد پشت دکمه «N مورد بیشتر» پنهان می‌مانند و با کلیک باز می‌شوند. حالت collapsed (icon-only) همه را نشان می‌دهد.
(۴) **S2 — همه شعب:** `همه‌ی شعب` → `همه شعب` در orders/page.tsx.
**فایل‌ها:** `app/(app)/inventory/recipes/page.tsx` (بازنویسی کامل wizard)، `app/api/inventory/recipes/route.ts` (requireRole Chef+SuperAdmin)، `components/layout/nav-config.ts` (جدید، rarely field)، `components/layout/BottomTabBar.tsx` (بازنویسی + MoreSheet)، `components/layout/Sidebar.tsx` (NAV_GROUPS از nav-config، toggle rarely)، `components/layout/Header.tsx` (حذف MobileMenu)، `components/layout/index.ts` (حذف export MobileMenu)، `app/(app)/orders/page.tsx` (S2).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) دیپلوی روی Liara (`git archive HEAD --output=basharaf-v0.9.21.zip`). (۲) تنظیم `CUSTOMER_JWT_SECRET` در env Liara. (۳) S4/S5 (formatMoneyShort در صفحات جمع‌بندی) اگر کاربر خواست.

## 📓 2026-06-16 — v0.9.20: ۸ زیرصفحه‌ی انبار (cartable/receive/stocktake/sales/recipes/plan/variance/exceptions) — اکانت ۱
**چه شد:**
تمام زیرصفحه‌های انبار که از context summary باقی مانده بودند یک‌جا ساخته شدند:
(۱) `/inventory/cartable/page.tsx` — تأیید/رد/حذف برگه‌ها، باز/بسته کردن جزئیات، modal انتخاب صندوق برای رسید خرید، اصلاحی (RotateCcw) برای SuperAdmin.
(۲) `/inventory/receive/page.tsx` — دو تب «ثبت برگه» (in/out/waste + import اکسل) + «خرید سریع» (پخش مبلغ کل به نسبت مقدار).
(۳) `/inventory/stocktake/page.tsx` — جدول شمارش واقعی vs سیستم، فقط مغایرت‌ها ثبت می‌شوند.
(۴) `/inventory/sales/page.tsx` — تعداد فروش هر رسپی → برگه‌ی فروش با جمع درآمد.
(۵) `/inventory/recipes/page.tsx` — RecipeCard با portionCalc (ماشین‌حساب پرس از موجودی)، costing (food cost/حاشیه)، print (popup HTML)، فرم افزودن در modal.
(۶) `/inventory/plan/page.tsx` — پیش‌بینی نیاز مواد با افق انتخابی.
(۷) `/inventory/variance/page.tsx` — گزارش تئوریک vs واقعی + اکسپورت xlsx.
(۸) `/inventory/exceptions/page.tsx` — ۴ کارت هشدار (stalePending/clamp/belowMin/reversals) با refresh auto هر ۶۰ ثانیه.
همه با design tokens (bg-surface/text-text/text-muted/...) و touch target 44px. tsc ✅ ۰ خطا. build ✅ سبز.
**فایل‌ها:** `app/(app)/inventory/cartable/page.tsx` (جدید)، `app/(app)/inventory/receive/page.tsx` (جدید)، `app/(app)/inventory/stocktake/page.tsx` (جدید)، `app/(app)/inventory/sales/page.tsx` (جدید)، `app/(app)/inventory/recipes/page.tsx` (جدید)، `app/(app)/inventory/plan/page.tsx` (جدید)، `app/(app)/inventory/variance/page.tsx` (جدید)، `app/(app)/inventory/exceptions/page.tsx` (جدید)، `package.json` (نسخه `0.9.20-inventory-complete`)، `HANDOFF.md`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** zip تست آماده نشده.
**برای جلسه‌ی بعد:** (۱) ساخت zip با `git archive HEAD --output=basharaf-v0.9.20.zip` و تست. (۲) دیپلوی روی Liara. (۳) تنظیم `CUSTOMER_JWT_SECRET` در env Liara. (۴) اجرای `db-customer-migration.sql` روی Liara.

## 📓 2026-06-16 — v0.9.19: صفحه اقلام انبار با DataList — اکانت ۱
**چه شد:**
`app/(app)/inventory/items/page.tsx` (جدید): صفحه کامل اقلام انبار با DataList — موبایل: کارت عمودی (نام+کد، موجودی، میانگین بها، ⋮)؛ دسکتاپ: جدول. جستجوی sticky بالای فهرست. فرم تدریجی در Sheet: ۴ فیلد اصلی (کد پیشنهادی auto +1، نام، واحد، شعبه*) + آکاردئون «تنظیمات پیشرفته» (ضریب تبدیل با preview زنده «۱ کیلوگرم = ۱۰۰۰ گرم»، راندمان، حداقل موجودی). دکمه Submit تا انتخاب شعبه disabled. آیکون info کنار موجودی صفر با آخرین میانگین بها (tooltip). هدف لمسی ۴۴px روی همه دکمه‌ها. DataList generic از `Record<string,unknown>` به `object` تغییر یافت.
**فایل‌ها:** `app/(app)/inventory/items/page.tsx` (جدید)، `components/ui/DataList.tsx` (generic fix).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا.
**ناتمام:** —
**برای جلسه‌ی بعد:** سایر sub-page های انبار (cartable/receive/stocktake/...) + دیپلوی.

## 📓 2026-06-16 — v0.9.18: بازنویسی صفحه انبار به خانه‌ی اقدام‌محور + سیستم توکن طراحی + کتابخانه کامپوننت — اکانت ۱
**چه شد:**
(۱) سیستم توکن طراحی: `lib/design/tokens.ts` (singleton رنگ/فاصله/فونت)، `tailwind.config.ts` (توکن‌های جدید: bg/surface/accent/ok/warn/danger و variant subtle)، `app/globals.css` (کلاس `.num` با tabular-nums + unicode-bidi: isolate)، `lib/design/format.ts` (formatMoney/formatMoneyShort/formatBranchName).
(۲) کامپوننت‌های UI جدید: `MetricCard`, `Sheet`, `DataList`, `StatusPill`, `EmptyState`. به‌روزرسانی: `Button` (accent primary، h-11)، `Card`, `Chip`, `Field`, `Input`.
(۳) ناوبری: `BottomTabBar` (FAB + Sheet سریع)، `Sidebar` (active=accent)، `MobileMenu` (secondaryOnly)، `Header`، `layout.tsx` — همه از lg: به md: تغییر کردند.
(۴) رفع باگ v0.9.17: `/order` به PUBLIC_PATH_PREFIXES در `sessionExpiry.ts` اضافه شد.
(۵) صفحه `/inventory/page.tsx` از ۱۷۱۴ خط جدول ۹‌تبی به صفحه‌ی اقدام‌محور بازنویسی شد: header + انتخاب شعبه، ۴ کارت اقدام (دریافت بار/انبارگردانی/ثبت فروش/هشدارها با badge)، «وضعیت امروز» از API exceptions، «کارهای بیشتر» (لیست ثانوی). tsc ✅ ۰ خطا.
**فایل‌ها:** `lib/design/tokens.ts` (جدید)، `lib/design/format.ts` (جدید)، `tailwind.config.ts`، `app/globals.css`، `components/ui/MetricCard.tsx` (جدید)، `components/ui/Sheet.tsx` (جدید)، `components/ui/DataList.tsx` (جدید)، `components/ui/StatusPill.tsx` (جدید)، `components/ui/EmptyState.tsx` (جدید)، `components/ui/Button.tsx`، `components/ui/Card.tsx`، `components/ui/Chip.tsx`، `components/ui/Field.tsx`، `components/ui/Input.tsx`، `components/ui/index.ts`، `components/layout/BottomTabBar.tsx`، `components/layout/Sidebar.tsx`، `components/layout/MobileMenu.tsx`، `components/layout/Header.tsx`، `app/(app)/layout.tsx`، `lib/auth/sessionExpiry.ts`، `app/(app)/inventory/page.tsx`، `package.json` (v0.9.18-inventory-home)، `HANDOFF.md`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` تأیید نشده.
**ناتمام:** صفحه‌های جزئیات (`/inventory/receive` و بقیه) هنوز وجود ندارند — لینک‌های کارت‌های اقدام ۴۰۴ می‌دهند.
**برای جلسه‌ی بعد:** (۱) ساخت sub-page های `/inventory/*` با انتقال محتوای تب‌های قدیمی. (۲) دیپلوی روی Liara. (۳) تنظیم `CUSTOMER_JWT_SECRET` در env Liara.

## 📓 2026-06-16 — v0.9.17: رفع باگ «میپره تو داشبورد» — اکانت ۱
**چه شد:**
باگ: وقتی کاربر ادمین صفحه‌ی عمومی `/order/account` یا `/order/checkout` را باز می‌کرد، browser هیچ کوکی مشتری (`basharaf-customer`) نداشت → `GET /api/customer/me` → `401` برمی‌گشت. `sessionExpiry.ts` (در root layout نصب شده) هر `401` از `/api/*` را به‌عنوان «سشن ادمین منقضی شده» تفسیر می‌کرد — چون `/order` در `PUBLIC_PATH_PREFIXES` نبود. نتیجه: کاربر ادمین از لاگین‌شدن خارج می‌شد → ریدایرکت به `/login` → middleware ادمین لاگین‌شده را به `/dashboard` می‌فرستاد → داشبورد با `user: null` خالی. رفع: `/order` به `PUBLIC_PATH_PREFIXES` در `lib/auth/sessionExpiry.ts` اضافه شد (یک خط). حالا هیچ ۴۰۱‌ای از صفحات مشتری ادمین را logout نمی‌کند.
**فایل‌ها:** `lib/auth/sessionExpiry.ts` (+`'/order'` به آرایه)، `package.json` (نسخه `0.9.17`)، `v0.9.17-fix-dashboard-redirect/basharaf-deploy.zip` (جدید)، `HANDOFF.md`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** دیپلوی zip جدید. بعد از دیپلوی: تست ادمین در صفحات `/order/*` بدون اینکه به داشبورد پرتاب شود.

## 📓 2026-06-16 — v0.9.16: کلید API نشان از پنل ادمین (نه env var) — اکانت ۱
**چه شد:**
(۱) کاربر گزارش داد «جایی برای زدن api نشان نیست» — تصمیم: به‌جای `NEXT_PUBLIC_NESHAN_API_KEY` در env، کلید از پنل `/orders/settings` وارد و در `ord_settings.neshan_api_key` در DB ذخیره شود (همان الگوی `zarinpalMerchantId`/`idpayApiKey`/`zibalMerchantId`).
(۲) `lib/db/schema.ts`: ستون `neshanApiKey: text('neshan_api_key')` به `ordSettings` اضافه شد.
(۳) `db-neshan-key-migration.sql` (جدید): `ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS neshan_api_key text`.
(۴) `lib/db/ordering.serializers.ts`: `neshanApiKey: row.neshanApiKey` به `rowToOrdSettings` اضافه شد.
(۵) `types/ordering.ts`: `neshanApiKey: string | null` به `OrdSettings` و `OrdSettingsPatch` و `PublicOrderSettings` اضافه شد.
(۶) `app/api/orders/settings/route.ts`: `neshanApiKey: z.string().trim().max(200).optional()` به patchSchema اضافه شد.
(۷) `lib/ordering/publicMenu.ts`: `neshanApiKey: s.neshanApiKey` از تنظیمات DB به response عمومی اضافه شد.
(۸) `components/order/AddressPicker.tsx`: `NESHAN_API` ثابت حذف شد → `apiKey: string` prop شد (در `AddressPickerProps` و استفاده داخلی در `reverseGeocode` + `useEffect` جستجو + init نقشه).
(۹) `app/order/checkout/page.tsx`: `apiKey={menu?.settings.neshanApiKey ?? ''}` به `<AddressPicker>` اضافه شد.
(۱۰) `app/order/account/page.tsx`: `publicOrderRepo` import شد؛ `neshanApiKey` state در `CustomerAccountPage` از `getMenu()` خوانده می‌شود؛ به `AddressesTab` به‌عنوان prop پاس داده می‌شود؛ `AddressesTab` آن را دریافت و به `<AddressPicker>` می‌دهد.
(۱۱) `app/(app)/orders/settings/page.tsx`: فرم + UI فیلد «کلید API نشان» با placeholder + لینک platform.neshan.org اضافه شد.
**فایل‌ها:** `lib/db/schema.ts`، `db-neshan-key-migration.sql` (جدید)، `lib/db/ordering.serializers.ts`، `types/ordering.ts`، `app/api/orders/settings/route.ts`، `lib/ordering/publicMenu.ts`، `components/order/AddressPicker.tsx`، `app/order/checkout/page.tsx`، `app/order/account/page.tsx`، `app/(app)/orders/settings/page.tsx`، `package.json` (نسخه `0.9.16-neshan-key-ui`).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای `db-customer-migration.sql` + `db-neshan-key-migration.sql` روی Liara (هر دو idempotent). (۲) تنظیم `CUSTOMER_JWT_SECRET` در env Liara (NEXT_PUBLIC_NESHAN_API_KEY دیگر لازم نیست). (۳) ساخت `v0.9.16-neshan-key-ui/basharaf-deploy.zip` + دیپلوی. (۴) از `/orders/settings` کلید API نشان را وارد و ذخیره کن. (۵) تست کامل.

## 📓 2026-06-16 — باکس ب: نقشه‌ی نشان (AddressPicker) در فرم آدرس + checkout — اکانت ۱
**چه شد:**
(۱) پکیج `@neshan-maps-platform/leaflet@1.0.8` + `@types/leaflet` نصب شد (پکیج رسمی نشان که نوع رسمی TS ندارد — declaration دستی در `types/neshan-leaflet.d.ts` ساخته شد).
(۲) کامپوننت `components/order/AddressPicker.tsx` (جدید): نقشه‌ی تعاملی نشان با مارکر قابل drag؛ کلیک روی نقشه مارکر را منتقل می‌کند؛ هر جابه‌جایی `GET api.neshan.org/v5/reverse` را فراخوانی و آدرس فارسی را نشان می‌دهد (با `NEXT_PUBLIC_NESHAN_API_KEY` header)؛ جستجوی متنی debounced با `api.neshan.org/v1/search` + dropdown نتایج؛ دکمه‌ی «تأیید موقعیت» → callback با `(lat, lng, address)`. static import با `ssr: false` dynamic import در parent (Leaflet به window نیاز دارد).
(۳) `/order/account` (`AddressesTab`): dynamic import کامپوننت؛ فرم افزودن آدرس حالا `lat`/`lng` هم نگه می‌دارد؛ دکمه‌ی «انتخاب روی نقشه» → modal تمام‌صفحه → بعد از تأیید، آدرس + lat/lng در فرم پر می‌شود؛ lat/lng با آدرس در `web_customer_addresses` ذخیره می‌شود (schema باکس الف دارد، migration ندارد).
(۴) `/order/checkout`: dynamic import کامپوننت؛ در بخش delivery بعد از textarea آدرس، دکمه‌ی «انتخاب روی نقشه» → modal → آدرس متنی پر می‌شود.
(۵) `types/neshan-leaflet.d.ts` (جدید): declaration برای SDK بدون types رسمی.
(۶) تداخل `Map` (lucide-react icon) با JavaScript `Map<K,V>` → به `MapIcon as Map` تغییر نام داده شد در هر دو فایل.
**فایل‌ها:** `components/order/AddressPicker.tsx` (جدید)، `types/neshan-leaflet.d.ts` (جدید)، `app/order/account/page.tsx` (+dynamic import، +lat/lng، +AddressPicker)، `app/order/checkout/page.tsx` (+dynamic import، +AddressPicker در delivery)، `package.json` (+@neshan-maps-platform/leaflet, +@types/leaflet).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** `NEXT_PUBLIC_NESHAN_API_KEY` در env Liara تنظیم نشده — بدون آن نقشه لود می‌شود (Neshan CSS + tiles) ولی آدرس reverse geocode و جستجو کار نمی‌کنند. تست UI زنده در sandbox انجام نشد (نیاز به مرورگر).
**برای جلسه‌ی بعد:** (۱) کاربر API Key نشان از https://developers.neshan.org بگیرد و `NEXT_PUBLIC_NESHAN_API_KEY` در env Liara تنظیم کند. (۲) `db-customer-migration.sql` اجرا کند. (۳) `CUSTOMER_JWT_SECRET` تنظیم کند. (۴) ساخت zip + دیپلوی. (۵) تست: کلیک نقشه → marker جابه‌جا → آدرس فارسی → تأیید → در فرم پر می‌شود.

## 📓 2026-06-16 — باکس الف: ماژول مشتری آنلاین (OTP + آدرس‌ها + تاریخچه‌ی سفارش) — اکانت ۱
**چه شد:**
کل ماژول مشتری آنلاین در یک جلسه پیاده‌سازی شد:
(۱) سه جدول جدید با نام `web_customers`/`web_customer_addresses`/`web_customer_otp` (جدا از جدول CRM `customers` موجود) + ستون nullable `order_customer_id` روی `orders` — `db-customer-migration.sql` (idempotent).
(۲) Drizzle schema: سه `pgTable` جدید + FK روی `orders`.
(۳) JWT مستقل: `lib/auth/customerJwt.ts` با `CUSTOMER_JWT_SECRET` جداگانه (≥۳۲ کاراکتر) + `lib/auth/customerSession.ts` با cookie `basharaf-customer` — کاملاً بی‌ربط به JWT پرسنل.
(۴) لایه‌ی سرور: `lib/ordering/webCustomer.ts` — `getOrCreateWebCustomer`, `createWebOtp` (ضد‌اسپم ۲ دقیقه‌ای→429, mock console.log)، `verifyWebOtp`، CRUD آدرس، `getWebCustomerOrders`, `linkOrderToWebCustomer`.
(۵) هفت API route جدید: `POST /api/customer/auth/send-otp`, `/verify`, `/logout`؛ `GET /api/customer/me`؛ `GET/POST /api/customer/addresses`؛ `PATCH/DELETE /api/customer/addresses/[id]`؛ `GET /api/customer/orders`. همه با `requireCustomer()` guard (نه middleware) کاملاً مستقل از auth پرسنل.
(۶) Client repo: `lib/repos/customer.api.ts` با `sendOtp`, `verifyOtp`, `logout`, `getMe`, `getAddresses`, `addAddress`, `updateAddress`, `deleteAddress`, `getOrders`.
(۷) صفحه‌ی جدید `/order/account` — client component: فرم OTP (۲ مرحله: شماره موبایل → کد ۶ رقمی) اگر نلاگین؛ بعد از لاگین: تب «آدرس‌های من» (CRUD) + تب «سفارش‌های من» (با لینک به رهگیری). RTL/Vazirmatn/mobile-first.
(۸) `/order/checkout` یکپارچه شد: اگر مشتری لاگین کرده، آدرس‌های ذخیره‌شده نمایش داده می‌شوند (انتخاب یک کلیک)؛ دکمه‌ی «ورود/ثبت‌نام» در header؛ `orderCustomerId` در payload سفارش.
(۹) `types/ordering.ts` → `CreateOrderInput.orderCustomerId?` اضافه شد؛ `lib/ordering/publicOrders.ts` → `orderCustomerId` هنگام insert order ذخیره می‌شود.
**فایل‌ها:** `db-customer-migration.sql` (جدید)، `lib/db/schema.ts` (+`webCustomers/webCustomerAddresses/webCustomerOtp` + `orders.orderCustomerId`)، `lib/auth/customerJwt.ts` (جدید)، `lib/auth/customerSession.ts` (جدید)، `lib/ordering/webCustomer.ts` (جدید)، `types/webCustomer.ts` (جدید)، `lib/repos/customer.api.ts` (جدید)، `app/api/customer/auth/send-otp/route.ts` (جدید)، `app/api/customer/auth/verify/route.ts` (جدید)، `app/api/customer/auth/logout/route.ts` (جدید)، `app/api/customer/me/route.ts` (جدید)، `app/api/customer/addresses/route.ts` (جدید)، `app/api/customer/addresses/[id]/route.ts` (جدید)، `app/api/customer/orders/route.ts` (جدید)، `app/order/account/page.tsx` (جدید)، `app/order/checkout/page.tsx` (آدرس‌های ذخیره‌شده + دکمه‌ی ورود)، `types/ordering.ts` (+`orderCustomerId?`)، `lib/ordering/publicOrders.ts` (+`orderCustomerId`)، `package.json` (نسخه `0.9.14-customer`)، `HANDOFF.md`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (`/order/account` 4.43 kB در build output).
**ناتمام:** `db-customer-migration.sql` هنوز روی production اجرا نشده. `CUSTOMER_JWT_SECRET` در env Liara هنوز تنظیم نشده. زیپ نسخه‌دار ساخته نشده.
**برای جلسه‌ی بعد:** (۱) اجرای `db-customer-migration.sql` روی Liara + تنظیم `CUSTOMER_JWT_SECRET` در env. (۲) ساخت `v0.9.14-customer/basharaf-deploy.zip` + دیپلوی. (۳) تست: ورود OTP در `/order/account` → ذخیره آدرس → checkout با آدرس ذخیره‌شده → تاریخچه سفارش. (۴) پیکربندی درگاه پرداخت + دسته‌ی «نوشیدنی» با VAT ۱۶٪.

## 📓 2026-06-16 — باکس ۵ سفارش: اتصال حسابداری/انبار + VAT دسته‌ها + KPI + commit نهایی — اکانت ۱
**چه شد:**
(۱) `lib/ordering/orderAccounting.ts` (جدید) — پل حسابداری/انبار برای تکمیل سفارش: سند فروش approved با split VAT خط‌به‌خط (نرخ از `menu_categories.vat_rate`، fallback ۱۰٪)، `applyBalance` روی صندوق، `applyMenuSaleDeduction` برای backflushing رسپی + COGS، هشدار audit + اعلان SuperAdmin برای آیتم‌های بدون نگاشت. قفل ضد-تکرار: `orders.sale_transaction_id` (idempotent — حداکثر یک سند فروش به ازای هر سفارش).
(۲) `lib/ordering/orders.ts` → `transitionOrderStatus`: باکس ۵ wire شد — فقط در `delivered`/`completed` با پرداخت تسویه‌شده (آنلاین=paid، نقدی=همین لحظه) `postOrderSaleToAccounting` فراخوانی می‌شود.
(۳) `lib/payments/types.ts`: `GatewayCurrencyUnit = 'toman' | 'rial'` + `toGatewayAmount(amount, unit)` — واحد پول هر درگاه از یک نقطه‌ی واحد کنترل می‌شود (Zarinpal=toman، IDPay=rial، Zibal=rial).
(۴) `menu_categories.vat_rate` (integer، nullable) به schema + migration اضافه شد. UI پنل منو → تب دسته‌ها: فرم ایجاد + inline edit نرخ VAT هر دسته.
(۵) KPI بیرون‌بر در `/reports`: تعداد/فروش/میانگین سبد/نسبت ارسال-پیکاپ + نمودار recharts.
(۶) هر دو migration (`db-ordering-pending-migrations-combined.sql` + `db-ordering-fulfillment-migration.sql`) توسط کاربر روی Liara اجرا و تأیید شد — اورژانسی production رفع، `/order`/`/orders`/`/orders/settings` سالم.
**فایل‌ها:** `lib/ordering/orderAccounting.ts` (جدید)، `lib/ordering/orders.ts`، `lib/ordering/publicOrders.ts`، `lib/db/schema.ts` (+`order_lines.menu_item_id`، `orders.sale_transaction_id`، `menu_categories.vat_rate`)، `lib/payments/types.ts`، `lib/payments/zarinpal.ts`، `lib/payments/idpay.ts`، `lib/payments/zibal.ts`، `app/(app)/menu/page.tsx`، `app/api/menu/categories/route.ts`، `app/api/menu/categories/[id]/route.ts`، `types/menu.ts`، `lib/db/menuSerializers.ts`، `app/api/reports/route.ts`، `app/(app)/reports/page.tsx`، `db-ordering-fulfillment-migration.sql` (جدید)، `package.json` (نسخه `0.9.13-order-fulfillment`)، `HANDOFF.md`، `project-docs/online-order-report.md` (جدید).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** `v0.9.13-order-fulfillment/basharaf-deploy.zip` هنوز ساخته و دیپلوی نشده.
**برای جلسه‌ی بعد:** (۱) ساخت zip + دیپلوی Liara. (۲) دسته‌ی «نوشیدنی» با VAT ۱۶٪ در پنل منو بساز. (۳) در `/orders/settings` درگاه پرداخت را پیکربندی کن. (۴) تست end-to-end: سفارش نقدی+آنلاین تا «تحویل» → بررسی سند فروش حسابداری + کسر انبار. (۵) Backlog #14/#15.

## 📓 2026-06-15 — 🔴 رفع اورژانسی: production سفارش بیرون‌بر خراب (migrationهای معلق تلنبارشده) — اکانت ۲
**چه شد:** کاربر بعد از دیپلوی `v0.9.12` گزارش داد `/order` (منوی عمومی) با خطا «سفارش آنلاین در دسترس نیست» و `/orders/settings` بارگذاری نمی‌شوند. علت: `getOrdSettings()` حالا ستون‌های جدید `ord_settings` (`pay_gateway`/`zarinpal_merchant_id`/`idpay_api_key`/`zibal_merchant_id` از migration این جلسه) را در SELECT می‌خواهد، ولی DB production هنوز این ستون‌ها (و ۳ migration معلق قبلی روی `orders`/`order_events`) را ندارد → Postgres «column does not exist». فایل جدید `db-ordering-pending-migrations-combined.sql` (ریشه‌ی پروژه) هر ۴ migration معلق (v0.9.9 تا v0.9.12، همه idempotent/افزایشی) را یکجا اجرا می‌کند — تنها اقدام لازم برای رفع خرابی production است.
**فایل‌ها:** `db-ordering-pending-migrations-combined.sql` (جدید)، `HANDOFF.md`.
**Build:** بدون تغییر کد — فقط SQL کمکی + مستندسازی.
**ناتمام:** 🔴 production الان خراب است تا کاربر این فایل را اجرا کند (نقدی/سایر ماژول‌ها سالم‌اند — فقط ماژول سفارش بیرون‌بر).
**برای جلسه‌ی بعد:** بعد از اجرای `db-ordering-pending-migrations-combined.sql` توسط کاربر، تأیید شود `/order`، `/order/checkout`، `/orders`، `/orders/settings` همه بدون خطا لود می‌شوند؛ سپس ادامه‌ی «کار بعدی پیشنهادی» در بخش ۰ (پیکربندی درگاه پرداخت + تست end-to-end).

## 📓 2026-06-15 — پیکربندی دستی درگاه پرداخت از پنل (Zarinpal+IDPay+Zibal) + پکیج `v0.9.12-payment-gateways` — اکانت ۲
**چه شد:**
(۱) درخواست کاربر: به‌جای `ZARINPAL_MERCHANT_ID` در env، انتخاب درگاه فعال + کلید/مرچنت آن از پنل «تنظیمات سفارش» (`/orders/settings`) و per-branch در DB ذخیره شود. کاربر از بین دو گزینه «فقط Zarinpal» و «Zarinpal+IDPay+Zibal»، گزینه‌ی دوم را با mockup تأیید کرد.
(۲) `ord_settings` ۴ ستون جدید گرفت: `pay_gateway text default 'zarinpal'`, `zarinpal_merchant_id`, `idpay_api_key`, `zibal_merchant_id` (همه nullable text) — `db-ordering-payment-gateway-migration.sql` (idempotent، `ADD COLUMN IF NOT EXISTS`، چهارمین migration معلق این ماژول). `types/ordering.ts` (+`OrdSettings.payGateway/zarinpalMerchantId/idpayApiKey/zibalMerchantId` + نوع جدید export شده `PaymentGatewayId='zarinpal'|'idpay'|'zibal'` + `OrdSettingsPatch`)، `lib/db/ordering.serializers.ts` (`rowToOrdSettings`)، `app/api/orders/settings/route.ts` (`patchSchema` +۴ فیلد، `zarinpal/idpay/zibalMerchantId/idpayApiKey` با `z.string().trim().max(100).optional()`).
(۳) `lib/payments/types.ts`: امضای `verify` به `verify(authority, amount, orderId)` تغییر کرد (IDPay برای verify به `order_id` نیاز دارد). سه پیاده‌سازی به الگوی factory تبدیل/اضافه شدند (نه singleton env-based): `zarinpal.ts` → `createZarinpalGateway(merchantId)` (بدون تغییر منطق API v4، فقط merchantId از پارامتر)، `idpay.ts` (جدید، API v1.1 — `createIdpayGateway(apiKey)`، هدر `X-API-KEY`, **مبلغ×۱۰ تومان→ریال** صریح، `request`→`POST .../v1.1/payment`→`{url:link, authority:id}`, `verify`→`POST .../v1.1/payment/verify` با `{id, order_id}`, کد ۱۰۰/۱۰۱=موفق)، `zibal.ts` (جدید، API v1 — `createZibalGateway(merchant)`، **مبلغ×۱۰ تومان→ریال** صریح، `request`→`POST gateway.zibal.ir/v1/request`→`{url:start/{trackId}, authority:trackId}`, `verify`→`POST .../v1/verify` با `{merchant, trackId}`, کد ۱۰۰/۲۰۱=موفق). نکته: واحد ریال/تومان هر درگاه با کامنت صریح در همان فایل ضرب می‌شود (ریسک اعمال دوبار/فراموشی صفر).
(۴) `lib/payments/index.ts` بازنویسی شد: `getPaymentGateway(branchId)` حالا **async** — `getOrdSettings(branchId)` را می‌خواند، بر اساس `payGateway` یکی از ۳ factory را با کلید/مرچنت ذخیره‌شده در DB می‌سازد؛ اگر کلید/مرچنت درگاه انتخابی خالی باشد `ApiError(500, ..., 'GATEWAY_NOT_CONFIGURED')` می‌دهد (پیام فارسی راهنما به سمت `/orders/settings`).
(۵) `/api/public/order/pay/request`: `getPaymentGateway()` → `await getPaymentGateway(order.branchId)`. `/api/public/order/pay/callback` بازنویسی شد تا با هر سه درگاه کار کند — نام پارامتر authority هر درگاه فرق دارد و تداخلی ندارند: `Authority` (Zarinpal) یا `trackId` (Zibal) یا `id` (IDPay) با fallback پیدا می‌شود؛ تشخیص لغو زودهنگام فقط برای Zarinpal (`Status≠'OK'`) و Zibal (`success≠'1'`) انجام می‌شود (IDPay همیشه `verify` صدا می‌زند و نتیجه‌ی verify ملاک نهایی است)؛ در غیر این صورت `gateway.verify(authority, order.total, order.id)` با همان منطق idempotent/ضد-دستکاری قبلی.
(۶) `/orders/settings` UI: داخل کارت «تنظیمات سفارش‌گیری»، وقتی سوییچ «پرداخت آنلاین» روشن است، بخش جدید «پرداخت آنلاین» نشان داده می‌شود — `Select` انتخاب «درگاه فعال» (زرین‌پال/آی‌دی‌پی (IDPay)/زیبال (Zibal)) + یک فیلد credential که بر اساس درگاه انتخابی عوض می‌شود (Merchant ID زرین‌پال / کلید API آی‌دی‌پی / Merchant ID زیبال). همه‌ی ۳ فیلد credential در `form` نگه داشته و در هر ذخیره با هم ارسال می‌شوند (سوییچ بین درگاه‌ها کلید قبلی را پاک نمی‌کند).
طبق قرارداد انتشار نسخه‌دار: `package.json` → `0.9.12-payment-gateways`؛ پوشه‌ی `v0.9.12-payment-gateways/` با `basharaf-deploy.zip` (`git archive HEAD`, gitignored) + کپی `db-ordering-payment-gateway-migration.sql` ساخته شد.
**فایل‌ها:** `lib/db/schema.ts` (+۴ ستون `ord_settings`)، `db-ordering-payment-gateway-migration.sql` (جدید)، `types/ordering.ts`، `lib/db/ordering.serializers.ts`، `app/api/orders/settings/route.ts`، `lib/payments/types.ts`، `lib/payments/zarinpal.ts` (factory)، `lib/payments/idpay.ts` (جدید)، `lib/payments/zibal.ts` (جدید)، `lib/payments/index.ts` (async + branch-aware)، `app/api/public/order/pay/request/route.ts`، `app/api/public/order/pay/callback/route.ts`، `app/(app)/orders/settings/page.tsx`، `package.json`، `v0.9.12-payment-gateways/db-ordering-payment-gateway-migration.sql` (جدید، tracked) + `basharaf-deploy.zip` (gitignored).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** ⚠️ `db-ordering-payment-gateway-migration.sql` هنوز روی DB production اجرا نشده — تا اجرای آن، `ord_settings.payGateway` و کلیدهای درگاه در کد موجودند ولی ستون‌هایشان در DB نیست → خواندن/نوشتن تنظیمات سفارش خطا می‌دهد. همچنین ۳ migration معلق قبلی این ماژول (`db-ordering-checkout-migration.sql`, `db-ordering-board-realtime-migration.sql`, `db-ordering-payment-migration.sql`) هنوز اجرا نشده‌اند. **`ZARINPAL_MERCHANT_ID` در env دیگر لازم نیست** (کاملاً جای آن را پنل گرفت) — اگر قبلاً در env تنظیم شده بود، حذفش بی‌اثر است (کد دیگر آن را نمی‌خواند). تست UI زنده در sandbox انجام نشد.
**برای جلسه‌ی بعد:** ۱) کاربر ۴ migration معلق سفارش بیرون‌بر را به‌ترتیب در pgAdmin/Supabase اجرا کند: `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` → `v0.9.10-order-board/db-ordering-board-realtime-migration.sql` → `v0.9.11-online-payment/db-ordering-payment-migration.sql` → `v0.9.12-payment-gateways/db-ordering-payment-gateway-migration.sql`. ۲) بعد از migrationها: در `/orders/settings` «پرداخت آنلاین» را روشن کنید، درگاه را انتخاب و Merchant ID/کلید API واقعی را وارد و ذخیره کنید (برای هرکدام از سه درگاه که کاربر حساب دارد). ۳) تست end-to-end برای درگاه پیکربندی‌شده: ثبت سفارش آنلاین از `/order/checkout` → ریدایرکت به درگاه → بازگشت موفق → `/order/track/[token]` باید `paid`+کد پیگیری نشان دهد؛ بازگشت دوباره idempotent باشد؛ لغو/شکست → `failed`+دکمه retry. ۴) سایر Backlog (#14 دیپلوی Liara، #15 retest تجهیزات/سفارش‌خرید).

## 📓 2026-06-15 — پرداخت آنلاین Zarinpal (باکس ۴): لایه‌ی انتزاع درگاه + checkout/رهگیری + پکیج `v0.9.11-online-payment` — اکانت ۲
**چه شد:**
(۱) لایه‌ی انتزاع `lib/payments/` — `types.ts` (interface `PaymentGateway`: `request(amount, orderId, callbackUrl)`→`{url, authority}`؛ `verify(authority, amount)`→`{ok, refId?, message?}`)، `zarinpal.ts` (Zarinpal API v4 — `currency: 'IRT'` برای ارسال مستقیم مبلغ تومان بدون ضرب در ۱۰؛ `ZARINPAL_MERCHANT_ID` فقط از `process.env`، هرگز به کلاینت نشت نمی‌کند؛ `request`→`POST .../v4/payment/request.json` + ریدایرکت `StartPay/{authority}`؛ `verify`→`POST .../v4/payment/verify.json`، کد ۱۰۰/۱۰۱=موفق)، `index.ts` (`getPaymentGateway()` — فعلاً فقط Zarinpal؛ افزودن IDPay/Zibal = یک فایل پیاده‌سازی جدید + یک شاخه در این فایل).
(۲) Schema/migration: ستون `pay_authority text` (+ایندکس) روی `orders` برای lookup سفارش در callback از authority درگاه؛ ستون `note text` روی `order_events` برای لاگ رویدادهای پرداخت بدون دست‌زدن به state machine وضعیت سفارش (`from_status=to_status=order.status`، فقط `note` توضیح می‌دهد). `db-ordering-payment-migration.sql` (idempotent، هنوز روی DB اجرا نشده — سومین migration معلق این ماژول).
(۳) جریان checkout: `CreateOrderInput`+`PublicOrder` در `types/ordering.ts` +`payMethod`/+`payRef`؛ `bodySchema` در `/api/public/order/create` +`payMethod: enum(cash|online)`؛ `createPublicOrder` چک فعال‌بودن روش پرداخت عمومی شد (`cash`→`settings.payCash`، `online`→`settings.payOnline`، کد خطای جدید `ONLINE_DISABLED`) و `pay_method` ورودی به‌جای hardcode `'cash'` در insert استفاده می‌شود؛ `pay_status='unpaid'` برای هر دو روش.
(۴) دو روت عمومی جدید: `POST /api/public/order/pay/request` (با `trackToken` — اگر `pay_method='online'` و `pay_status≠'paid'`، از `gateway.request(order.total, order.id, callbackUrl)` آدرس درگاه می‌گیرد، `pay_authority` را روی سفارش ذخیره و `{url}` برمی‌گرداند)؛ `GET /api/public/order/pay/callback` (پارامترهای `Authority`/`Status` از Zarinpal — سفارش با `pay_authority` پیدا می‌شود؛ **idempotent**: اگر `pay_status='paid'` بود دوباره verify نمی‌شود؛ `Status≠'OK'`→`pay_status='failed'`+`order_events.note`؛ `Status='OK'`→`gateway.verify(authority, order.total)` (مبلغ همیشه از DB سرور، **ضد دستکاری**) → موفق: `pay_status='paid'`+`pay_ref`+`order_events.note`، ناموفق: `pay_status='failed'`+`order_events.note`؛ همه در `db.transaction`؛ نهایتاً ریدایرکت به `/order/track/[token]`).
(۵) UI: `/order/checkout` — بخش جدید «روش پرداخت» (فقط روش‌های فعال در `ord_settings` نشان داده می‌شوند؛ هر دو فعال→`Toggle` نقدی/آنلاین، یکی فقط→متن ساده)؛ دکمه‌ی پایین برای آنلاین «پرداخت و ثبت سفارش»؛ بعد از ثبت سفارش با `payMethod='online'`، `requestPayment(trackToken)` صدا زده و `window.location.href` به درگاه ریدایرکت می‌شود (خطای اتصال → کاربر به صفحه‌ی رهگیری برای retry). `/order/track/[token]` — `pay_method='cash'` همان متن قبلی؛ `online`+`paid`→پیام سبز + کد پیگیری (`pay_ref`)؛ `online`+`unpaid/failed`→پیام هشدار + دکمه‌ی «پرداخت آنلاین» (retry با `requestPayment` دوباره).
(۶) repo: `lib/repos/publicOrder.types.ts`/`.api.ts` +`requestPayment(trackToken)` → `POST /api/public/order/pay/request`.
طبق قرارداد انتشار نسخه‌دار: `package.json` → `0.9.11-online-payment`؛ پوشه‌ی `v0.9.11-online-payment/` با `basharaf-deploy.zip` (`git archive HEAD`, gitignored) + کپی `db-ordering-payment-migration.sql` ساخته شد.
**فایل‌ها:** `lib/payments/types.ts` (جدید)، `lib/payments/zarinpal.ts` (جدید)، `lib/payments/index.ts` (جدید)، `lib/db/schema.ts` (+`orders.pay_authority`+ایندکس، +`order_events.note`)، `db-ordering-payment-migration.sql` (جدید)، `types/ordering.ts` (+`CreateOrderInput.payMethod`، +`PublicOrder.payRef`)، `lib/db/ordering.serializers.ts` (+`payRef` در `rowToPublicOrder`)، `app/api/public/order/create/route.ts` (+`payMethod` در zod)، `lib/ordering/publicOrders.ts` (چک عمومی روش پرداخت + `pay_method` از ورودی)، `app/api/public/order/pay/request/route.ts` (جدید)، `app/api/public/order/pay/callback/route.ts` (جدید)، `lib/repos/publicOrder.types.ts`+`.api.ts` (+`requestPayment`)، `app/order/checkout/page.tsx` (بخش روش پرداخت + ریدایرکت آنلاین)، `app/order/track/[token]/page.tsx` (وضعیت پرداخت + دکمه‌ی retry)، `package.json` (نسخه)، `v0.9.11-online-payment/db-ordering-payment-migration.sql` (جدید، tracked) + `basharaf-deploy.zip` (gitignored).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (`/api/public/order/pay/request` و `/api/public/order/pay/callback` روت‌های دینامیک جدید، `/order/checkout` 5.46 kB، `/order/track/[token]` 4.38 kB).
**ناتمام:** ⚠️ `db-ordering-payment-migration.sql` هنوز روی DB production اجرا نشده — بدون آن `orders.pay_authority`/`order_events.note` وجود ندارند و `pay/request`+callback خطا می‌دهند (نقدی تأثیر نمی‌گیرد). **مهم‌تر:** `ZARINPAL_MERCHANT_ID` هنوز به env production اضافه نشده — بدون آن `request()`/`verify()` خطای `GATEWAY_NOT_CONFIGURED` (۵۰۰) می‌دهند؛ تا آن زمان پرداخت آنلاین کار نمی‌کند (نقدی سالم است). تست UI زنده در sandbox انجام نشد (بدون env/merchant واقعی).
**برای جلسه‌ی بعد:** ۱) کاربر سه migration معلق سفارش بیرون‌بر را به‌ترتیب روی pgAdmin/Supabase اجرا کند: `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` → `v0.9.10-order-board/db-ordering-board-realtime-migration.sql` → `v0.9.11-online-payment/db-ordering-payment-migration.sql`. ۲) کاربر `ZARINPAL_MERCHANT_ID` (Merchant ID از پنل zarinpal.com) را به env production اضافه کند؛ بدون آن پرداخت آنلاین فعال نمی‌شود ولی نقدی سالم است. ۳) بعد از migrationها+env: تست end-to-end — در `/orders/settings` «پرداخت آنلاین» را روشن کنید → از `/order/checkout` سفارش آنلاین ثبت کنید → ریدایرکت به Zarinpal → بازگشت با `Status=OK` → `/order/track/[token]` باید `pay_status=paid`+کد پیگیری نشان دهد؛ بازگشت دوباره به همان callback نباید رکورد تکراری بسازد (idempotent)؛ لغو/شکست در درگاه (`Status=NOK`) → `pay_status=failed` + دکمه‌ی «پرداخت آنلاین» روی صفحه‌ی رهگیری برای retry ظاهر شود. ۴) سایر Backlog (#14 دیپلوی Liara، #15 retest تجهیزات/سفارش‌خرید).

## 📓 2026-06-14 — `/orders`: پنل عملیاتی پرسنل (Kanban + state machine + Realtime + چاپ) + پکیج `v0.9.10-order-board` — اکانت ۲
**چه شد:**
(۱) ماژول state machine جدید `lib/ordering/orderStatus.ts` — منبع واحد حقیقت برای ۹ وضعیت سفارش (`received→confirmed→preparing→ready→(delivery)out_for_delivery→delivered` یا `(pickup)→completed`؛ هر غیرنهایی→`cancelled`؛ فقط `received→rejected`). شامل برچسب فارسی هر وضعیت، رنگ Chip، برچسب دکمه‌ی انتقال، `getValidTransitions(status, serviceType)`/`canTransition`، و تعریف ۷ ستون Kanban (`received/confirmed/preparing/ready/out_for_delivery/done(delivered+completed)/closed(cancelled+rejected)`).
(۲) صفحه‌ی جدید `/orders` (`app/(app)/orders/page.tsx`) — تخته‌ی Kanban: SuperAdmin فیلتر شعبه + همه‌ی شعب، BranchUser فقط شعبه‌ی خود (Warehouse دسترسی ندارد). فیلتر «باز» (پیش‌فرض — همه‌ی سفارش‌های غیرنهایی، بدون توجه به تاریخ) / «امروز» (همه‌ی سفارش‌های امروز شمسی شامل نهایی‌ها). هر کارت: شماره، Chip وضعیت+رنگ، ساعت تهران، نام شعبه (برای SuperAdmin)، نوع سرویس (ارسال/پیکاپ)، نام/تلفن مشتری، آدرس+محدوده یا زمان پیکاپ، اقلام+تعداد+جمع، یادداشت، مبلغ کل، دکمه‌ی چاپ، و دکمه(های) انتقال وضعیت مجاز (قرمز برای لغو/رد با تأیید `confirm()`).
(۳) Realtime: هوک جدید `lib/realtime/useOrdersRealtime.ts` (الگوی `lib/realtime/client.ts` موجود) — subscribe روی INSERT/UPDATE جدول `orders`، اسکوپ‌شده به شعبه (BranchUser=شعبه‌ی خودش، SuperAdmin=فیلتر فعلی یا همه). سفارش جدید → `playOrderAlert()` (بوق دوتایی Web Audio، فایل جدید `lib/ordering/alertSound.ts`) + toast «سفارش جدید ثبت شد» + رفرش کامل لیست؛ آپدیت → پچ محلی فیلد `status`.
(۴) API انتقال وضعیت `PATCH /api/orders/[id]/status` (zod enum ۹ وضعیت) + `GET /api/orders?branchId=` (`app/api/orders/route.ts`، `app/api/orders/[id]/status/route.ts`) — منطق در `lib/ordering/orders.ts` (`listBoardOrders`, `transitionOrderStatus`): RBAC شعبه (BranchUser فقط شعبه‌ی خود → ۴۰۳ `BRANCH_MISMATCH`)، ۴۰۴ اگر سفارش نبود، ۴۲۲ `INVALID_TRANSITION` اگر انتقال طبق state machine مجاز نباشد، در غیر این صورت در یک `db.transaction` اتمیک `orders.status` آپدیت + یک `order_events` (`from_status`/`to_status`/`actor_user_id`) درج می‌شود. سریالایزر جدید `rowToBoardOrder` در `lib/db/ordering.serializers.ts` + repo (`lib/repos/ordering.types.ts`/`.api.ts`: `listOrders`, `updateOrderStatus`) + نوع‌های جدید `BoardOrder`/`BoardOrderLine`/`OrderStatus`/`OrderStatusPatchInput` در `types/ordering.ts`.
(۵) چاپ: دکمه‌ی چاپ روی هر کارت → `PrintReceipt` (بخش مخفی `hidden print:block`، الگوی موجود `transactions/page.tsx`) با نام شعبه، شماره/نوع سرویس/ساعت، مشتری+آدرس/زمان پیکاپ+یادداشت، جدول اقلام، و خلاصه‌ی مبالغ؛ `window.print()` بعد از ۵۰ms + ریست با `afterprint`.
(۶) سایدبار: آیتم «سفارش‌های بیرون‌بر» (آیکن `Truck`، SuperAdmin+BranchUser، `matchPrefix` برای `/orders/settings`) در گروه «عملیات اصلی» بعد از «تراکنش‌ها». `/orders` به `PROTECTED_PREFIXES` در `middleware.ts` اضافه شد + `'orders'` به `SectionKey`/`SECTIONS`/`sectionForPath` در `lib/auth/permissions.ts` (دسترسی بخش‌محور).
(۷) رهگیری مشتری `/order/track/[token]`: نگاشت قدیمی محدود `STATUS_LABELS` حذف و به `ORDER_STATUS_LABELS`/`ORDER_STATUS_TONES` مشترک از `lib/ordering/orderStatus.ts` متصل شد — حالا هر ۹ وضعیت (شامل `confirmed`/`out_for_delivery`/`rejected` که قبلاً نبودند) را با برچسب/رنگ صحیح نشان می‌دهد؛ انتقال وضعیت از `/orders` بلافاصله در رهگیری منعکس می‌شود (بعد از رفرش صفحه).
(۸) کمکی جدید `formatTehranTime(iso)` در `lib/jalali.ts` (ساعت:دقیقه به‌وقت تهران، ارقام فارسی) — برای زمان ثبت روی کارت.
(۹) Migration جدید `db-ordering-board-realtime-migration.sql` — افزودن `orders`/`order_lines`/`order_events` به `supabase_realtime` (الگوی idempotent `DO $$ ... EXCEPTION WHEN others THEN NULL`، بدون اثر روی Liara). طبق قرارداد انتشار نسخه‌دار: `package.json` → `0.9.10-order-board`؛ پوشه‌ی `v0.9.10-order-board/` با `basharaf-deploy.zip` (`git archive HEAD`, gitignored) + کپی migration ساخته شد.
**فایل‌ها:** `lib/ordering/orderStatus.ts` (جدید)، `lib/ordering/orders.ts` (جدید)، `lib/ordering/alertSound.ts` (جدید)، `lib/realtime/useOrdersRealtime.ts` (جدید)، `app/(app)/orders/page.tsx` (جدید)، `app/api/orders/route.ts` (جدید)، `app/api/orders/[id]/status/route.ts` (جدید)، `lib/db/ordering.serializers.ts` (+`rowToBoardOrder`)، `lib/repos/ordering.types.ts` + `.api.ts` (+`listOrders`/`updateOrderStatus`)، `types/ordering.ts` (+`OrderStatus`/`BoardOrder*`)، `lib/jalali.ts` (+`formatTehranTime`)، `app/order/track/[token]/page.tsx` (نگاشت وضعیت مشترک)، `components/layout/Sidebar.tsx` (+آیتم «سفارش‌های بیرون‌بر»)، `lib/auth/permissions.ts` (+`'orders'`)، `middleware.ts` (+`/orders`)، `db-ordering-board-realtime-migration.sql` (جدید)، `package.json` (نسخه)، `v0.9.10-order-board/db-ordering-board-realtime-migration.sql` (جدید، tracked) + `basharaf-deploy.zip` (gitignored).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (`/orders` 5.85 kB، `/api/orders` و `/api/orders/[id]/status` دینامیک، `/order/track/[token]` 4.05 kB).
**ناتمام:** — تست UI زنده در sandbox انجام نشد (بدون `DATABASE_URL`/Supabase env محلی) — فقط tsc/build سبز تأیید شد. **هیچ اثر مالی/انباری در این باکس** (طبق spec).
**برای جلسه‌ی بعد:** ۱) کاربر `v0.9.10-order-board/db-ordering-board-realtime-migration.sql` را روی pgAdmin/Supabase اجرا کند تا هشدار صوتی Realtime در `/orders` کار کند (بدون آن، API/UI همچنان کار می‌کند ولی سفارش جدید فقط بعد از «به‌روزرسانی» دستی ظاهر می‌شود). ۲) **یادآوری مهم:** `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` (باکس۲ — ستون‌های `pickup_time`/`client_token`) هنوز هم تأیید نشده — بدون آن `/order/checkout` کار نمی‌کند؛ این مستقل از migration باکس۳ است و هنوز بلاک‌شده. ۳) بعد از هر دو migration: تست end-to-end — سفارش از `/order/checkout` ثبت شود → فوراً در `/orders` با هشدار صوتی ظاهر شود → انتقال وضعیت تا «تحویل/تکمیل» کار کند و در `/order/track/[token]` دیده شود → چاپ رسید درست باشد → BranchUser فقط سفارش‌های شعبه‌ی خود را ببیند/تغییر دهد. ۴) سایر Backlog (#14 دیپلوی Liara، #15 retest تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions، باکس بعدی سفارش: پرداخت آنلاین).

## 📓 2026-06-14 — `/order/checkout`: ثبت سفارش نقدی idempotent + صفحه‌ی رهگیری (باکس ۲) + پکیج `v0.9.9-order-checkout` — اکانت ۲
**چه شد:**
(۱) `/order/checkout` از placeholder به فرم کامل بازنویسی شد: انتخاب نوع سرویس (ارسال/پیکاپ) با `Toggle` (فقط سرویس‌های فعال در `ord_settings` نشان داده می‌شوند)؛ برای ارسال انتخاب محدوده از `ord_zones` (هزینه + حداقل سفارش محدوده) + آدرس؛ برای پیکاپ زمان دریافت اختیاری؛ نام/تلفن/یادداشت؛ خلاصه‌ی `subtotal + delivery_fee − discount = total` (تومان) با اعمال حداقل سفارش (شعبه + محدوده) قبل از فعال‌شدن دکمه‌ی «ثبت سفارش». یک `client_token` (`crypto.randomUUID()`) یک‌بار در state صفحه ساخته می‌شود.
(۲) API جدید بدون auth `POST /api/public/order/create` (`lib/ordering/publicOrders.ts` → `createPublicOrder`): idempotent با `client_token` (اگر سفارشی با همین token موجود بود همان برگردانده می‌شود، بدون insert تکراری)؛ قیمت‌ها دوباره از `menu_items` خوانده می‌شوند و `total` سمت سرور ساخته می‌شود (به مبلغ کلاینت اعتماد نمی‌شود)؛ `order_lines` با snapshot نام/قیمت ذخیره می‌شود (نه FK زنده)؛ چک باز/بسته‌بودن شعبه + فعال‌بودن ارسال/پیکاپ/پرداخت نقدی از `ord_settings` + برای ارسال چک محدوده و حداقل سفارش محدوده؛ `order_no`/`track_token` یکتا، `status='received'`, `pay_method='cash'`, `pay_status='unpaid'`؛ insert سفارش + خطوط + یک `order_events` (`from_status=null → to_status='received'`) همه در یک `db.transaction` اتمیک.
(۳) صفحه‌ی جدید بدون auth `/order/track/[token]` — Chip وضعیت، شماره/تاریخ سفارش، نوع سرویس + آدرس/محدوده یا زمان پیکاپ، اطلاعات تماس، اقلام، و خلاصه‌ی قیمت از `GET /api/public/order/track/[token]`. بعد از ثبت موفق سبد پاک می‌شود (`clearCart`) و کاربر به این صفحه ریدایرکت می‌شود.
(۴) سبد خرید مشترک بین `/order` و `/order/checkout` به `lib/ordering/cart.ts` (`loadCart`/`saveCart`/`clearCart`) منتقل شد. `types/ordering.ts` (+`PublicOrderZone`, `CreateOrderInput`, `PublicOrder*`)، `lib/db/ordering.serializers.ts` (+`rowToPublicOrder`)، `lib/ordering/publicMenu.ts` (+`zones` از `ord_zones` فعال، +export `getDefaultBranch`).
(۵) Migration افزایشی جدید `db-ordering-checkout-migration.sql` (روی `db-ordering-migration.sql` که قبلاً اجرا و تأیید شده): دو ستون جدید روی `orders` — `pickup_time text` و `client_token text` + `CREATE UNIQUE INDEX orders_client_token_uidx`.
(۶) رفع جانبی: پوشه‌ی آرشیو نسخه‌ی قبلی `v0.9.8-order-public/basharaf-deploy/` (کپی منجمد کد قدیمی روی دیسک، untracked) به‌خاطر `paths: "@/*"→"./*"` به تایپ جدید ریشه `PublicOrderMenu.zones` ارجاع می‌داد و خطای tsc می‌داد؛ به `exclude` در `tsconfig.json` اضافه شد (بدون اثر روی کد فعال یا production).
طبق قرارداد انتشار نسخه‌دار: `package.json` → `0.9.9-order-checkout`؛ پوشه‌ی `v0.9.9-order-checkout/` با `basharaf-deploy.zip` (`git archive HEAD`, gitignored) + کپی `db-ordering-checkout-migration.sql` ساخته شد.
**فایل‌ها:** `app/order/checkout/page.tsx` (بازنویسی کامل)، `app/order/track/[token]/page.tsx` (جدید)، `app/api/public/order/create/route.ts` (جدید)، `app/api/public/order/track/[token]/route.ts` (جدید)، `lib/ordering/publicOrders.ts` (جدید)، `lib/ordering/cart.ts` (جدید)، `lib/ordering/publicMenu.ts`، `lib/db/ordering.serializers.ts`، `lib/db/schema.ts` (+`pickup_time`/`client_token`/uidx روی `orders`)، `types/ordering.ts`، `lib/repos/publicOrder.types.ts` + `.api.ts` (+`createOrder`/`getOrderByToken`)، `app/order/page.tsx` (سبد → `lib/ordering/cart`)، `db-ordering-migration.sql` (ستون‌های جدید برای نصب تازه — no-op روی DB فعلی)، `db-ordering-checkout-migration.sql` (جدید)، `tsconfig.json` (+exclude)، `package.json` (نسخه)، `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` (جدید، tracked) + `basharaf-deploy.zip` (gitignored).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (`/order/checkout` 5.17 kB، `/order/track/[token]` 3.66 kB دینامیک، `/api/public/order/create` و `/api/public/order/track/[token]` دینامیک).
**ناتمام:** ⚠️ `db-ordering-checkout-migration.sql` (ستون‌های `pickup_time`/`client_token` + ایندکس یکتا روی `orders`) هنوز روی DB production اجرا نشده — تا قبل از اجرا، `POST /api/public/order/create` با خطای ستون‌نبودن fail می‌شود (یعنی `/order/checkout` نمی‌تواند سفارش را ثبت کند). تست UI زنده در sandbox انجام نشد (بدون `DATABASE_URL` محلی) — فقط tsc/build سبز تأیید شد.
**برای جلسه‌ی بعد:** ۱) کاربر `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` را روی pgAdmin اجرا کند. ۲) بعد از دیپلوی، `/order/checkout` تست شود: سفارش ارسال (با انتخاب محدوده+آدرس) و سفارش پیکاپ هر دو ثبت شوند؛ دوبار زدن دکمه‌ی «ثبت سفارش» نباید سفارش تکراری بسازد (idempotency با `client_token` ثابت در state صفحه)؛ زیر حداقل سفارش دکمه غیرفعال بماند؛ `/order/track/[token]` وضعیت «سفارش ثبت شد» را نشان دهد. ۳) سایر Backlog (#14 دیپلوی عملیات Liara، #15 retest تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions) + باکس بعدی ماژول سفارش: پرداخت آنلاین.


---

> ⬇️ ورودی‌های قدیمی‌تر (تکمیل ماژول انبار ۲۰۲۶-۰۶-۱۲، رفع ۶ باگ گزارش‌شده ۲۰۲۶-۰۶-۱۱، integration tests Backlog #5، آدیت امنیتی Backlog #3، account selection، stocktake accounting) به `project-docs/handoff-archive.md` منتقل شدند.

---

## 📌 Backlog یکپارچه (به ترتیب اولویت)

### 🟠 فوری/مهم
1. ~~**stocktake accounting entry**~~ — ✅ انجام شد (2026-06-10، commit a90cd9d).
2. ~~**account selection در خرید**~~ — ✅ انجام شد (2026-06-10، commit 1a4c9f5).
3. ~~**چک `/api/_diag`**~~ — ✅ آدیت شد (2026-06-10): endpoint وجود ندارد، هیچ credential-ای در HTTP response فاش نمی‌شود.
4. ~~**Liara `28P01`**~~ — کد فیکس شد ✅ (2026-06-10، `lib/db/client.ts` +`parseDatabaseUrl`، `v9.1.0/basharaf-deploy.zip` آماده)؛ منتظر deploy واقعی کاربر روی لیارا برای تأیید نهایی.
14. **دیپلوی ماژول عملیات (فاز۲–۷، نسخه `0.9.5-operations`)** — کد + tsc + build همه آماده/سبز روی دیسک ولی commit نشده. منتظر تست کاربر برای سناریوهای فاز۶/۷، سپس اجرای `db-operations-migration.sql` (+`db-inventory-reversal.sql` که از قبل هم اجرا نشده) روی DB → commit/push یکجا → دیپلوی `basharaf-tasks-ops-liara.zip`.
15. **retest باگ «خطا در ثبت تجهیزات/سفارش خرید»** روی production لیارا — فیکس toast انجام شد (نمایش خطای واقعی به‌جای پیام عمومی)، کاربر هنوز تأیید نکرده. zip جدید `basharaf-tasks-ops-liara.zip` شامل همین فیکس هم هست.

### 🟡 متوسط
5. ~~**تست integration برای balance guardها**~~ — کد نوشته شد ✅ (2026-06-10، سه سناریوی A/B/C در `tests/integration/`، tsc/build سبز)؛ اجرای واقعی روی DB غیر-production هنوز انجام نشده — منتظر DATABASE_URL تستی از کاربر.
6. موارد 🟡 باقی‌مانده‌ی `project-docs/domain-audit.md`.
7. Seed منو روی دیتابیس تازه خالی است (۳۱ آیتم فقط در `supabase-v4-menu-migration.sql` آرشیوی).
16. **انباردار بدون نقطه‌ورود مستقیم به یک سفارش‌خرید خاص** (فاز۷) — صفحه‌ی `/purchase-orders/[id]` از قبل برای Warehouse منطق receive دارد، ولی هیچ UI فعلی لینکی به یک PO خاص برای انباردار نمی‌دهد. شاید نیاز به لیست «سفارش‌های منتظر دریافت شعبه‌ی من» در `/tasks` یا بخش جدید.
17. ~~**فاز۸ (مستندسازی)**~~ — ✅ انجام شد (2026-06-13): سند تصمیم `project-docs/decision-channel-column.md` (ستون `channel` روی `transactions`، فقط مستند). پیاده‌سازی واقعی منتظر پاسخ کاربر به ۵ سوال باز آن سند است.

### 🔵 ساختاری/بلندمدت
8. GL دوطرفه‌ی کامل — `journal_vouchers` فقط برای حقوق؛ هسته single-entry.
9. FIFO انبار — `expiryDate` ثبت می‌شود ولی موتور هزینه WAC است نه FIFO.
10. منو → POS — منو کاتالوگ است؛ backflushing فقط از تراکنش income دستی.
11. Password reset با ایمیل — پیاده نشده.
12. Rate-limit در حافظه — در multi-instance سراسری نیست.
13. وابستگی Realtime/Storage به Supabase — روی هاست خالص کار نمی‌کند.

### ❓ برای تأیید (جلسه‌ی بعدی با کد تطبیق دهد — ممکن است خطای مستندات باشد نه کد)
- لیست SQL بخش ۸، فایلی برای **`job_applications`** (استخدام)، **ستون `users.permissions`**، و **نقش `Warehouse`** ندارد. یا در `db-setup.sql` ادغام شده‌اند یا فایل‌هایشان (`db-recruitment-migration.sql`، `db-user-permissions.sql`، `db-warehouse-role.sql`) از لیست جا افتاده. تطبیق و این سند اصلاح شود.
- `@types/file-saver` یتیم است (خود `file-saver` نصب نیست) — حذف یا نصب.

---

# 📚 مرجع پایدار (کم‌تغییر — فقط وقتی معماری عوض شد به‌روز کن)

## ۱. Tech Stack

| لایه | ابزار |
|---|---|
| Framework | Next.js 14 (App Router) — `14.2.15` |
| Language | TypeScript strict |
| Database | PostgreSQL (Supabase-hosted) |
| ORM | Drizzle ORM `^0.36.1` + درایور `postgres` `^3.4.5` (خام؛ supabase-js برای داده نه) |
| Auth | JWT دست‌ساز — `jose` (HS256) + `bcryptjs` |
| State | Zustand (slice-based) `^4.5.5` |
| Styling | Tailwind CSS + tailwindcss-rtl |
| Supabase SDK | فقط Realtime (`lib/realtime/`) و Storage (`lib/storage/receipts.ts`, `resumes.ts`) |
| Forms | react-hook-form + zod |
| Charts | recharts · Export: xlsx · QR: qrcode |
| Date | react-multi-date-picker (جلالی) — `components/ui/JalaliDatePicker.tsx` |

## ۲. مدل داده — `lib/db/schema.ts` (۳۰+ جدول)

### قراردادهای کلیدی
- **پول:** `bigint({ mode: 'number' })` — تومان صحیح.
- **بهای واحد انبار:** `numeric(24,6)` (hotfix v4.1 برای سرریز).
- **تاریخ کاربری:** رشته‌ی جلالی `text`؛ **تاریخ سیستمی:** timestamptz.
- **PK:** `uuid().defaultRandom()` — استثنا: `menu_settings.id = integer(1)`.
- **نوع/وضعیت:** `text` با check (نه pgEnum جدید).
- **denormalization عمدی:** `branch_name`, `category_name` در تراکنش.

### جداول
**هسته (۱۳):** `branches`, `users` (role: text — SuperAdmin|BranchUser|Warehouse؛ permissions: jsonb), `categories`, `transactions` (+`saleMeta` jsonb), `notifications`, `app_settings`, `audit_log`, `accounts`, `contacts`, `system_logs`, `menu_categories`, `menu_items`, `menu_settings`.
**پرسنل/حقوق (۷):** `employees`, `employee_documents`, `payroll_events`, `payroll_parameters`, `payroll_runs` (draft→calculated→approved→posted), `payslips`, `journal_vouchers` (خطوط jsonb).
**انبار (۷):** `inv_items` (raw/prep، موجودی دولایه + WAC), `inv_recipes`, `inv_recipe_lines`, `inv_vouchers` (in/out/waste/sale/produce/stocktake), `inv_voucher_lines` (+`expiryDate`), `inv_stock_tx` (append-only), `inv_daily_sales`.
**استخدام (۱):** `job_applications`.
**مشتریان/وفاداری/رزرو (۷):** `customers`, `loyalty_entries` (اتمیک با SQL مستقیم), `coupons`, `coupon_redemptions` (race-safe با unique), `feedback`, `tables` (export: `restaurantTables`), `reservations` (state machine: pending→confirmed→seated→…).
**عملیات (۶، فاز۲–۶، migration: `db-operations-migration.sql`):** `equipment`, `maintenance_logs`, `purchase_orders`, `purchase_order_items`, `task_templates`, `task_instances`.

## ۳. احراز هویت و مجوزها
- نقش‌ها: `SuperAdmin` (همه‌چیز) / `BranchUser` (شعبه‌ی خودش) / `Warehouse` (انبار شعبه‌ی خودش).
- **Section permissions:** `users.permissions: string[]` — SuperAdmin همیشه همه.
- **Capability:** پیشوند `cap:` — مثل `cap:inventory.approve`, `cap:inventory.viewCosts`.
- **اعمال فوری:** middleware با کش ۵ ثانیه از `/api/auth/permissions` می‌خواند (logout لازم نیست).
- سه لایه: `middleware.ts` (Edge) → API (`requireSession`/`requireAdmin`/`canDo`) → Client (نمایشی).
- منبع: `lib/auth/permissions.ts`.

## ۴. منطق مالی کلیدی
- **Single-entry** (هر transaction یک رکورد income/expense/transfer)؛ GL دوطرفه فقط در `journal_vouchers` حقوق.
- **اتمیک موجودی:** `lib/db/balanceHelpers.ts` — apply/reverse برای صندوق و طرف‌حساب. فقط `approved` اثر دارد.
- **PATCH immutability:** فیلدهای مالی پس از approved تغییرناپذیر (۴۲۲).
- **DELETE atomic rollback:** برگشت کامل صندوق + طرف‌حساب + کسر انبار فروش منو.
- **انبار↔حسابداری** (`lib/inventory/postToAccounting.ts`): تأیید خرید→هزینه+کسر صندوق؛ فروش→درآمد+افزایش؛ ضایعات→هزینه‌ی non-cash.
- **حقوق↔حسابداری** (`lib/payroll/postToBasharaf.ts`): posting → journal_voucher + تراکنش هزینه‌ی خالص.
- **Backflushing منو:** تأیید income فروش منو → کسر خودکار مواد طبق رسپی + COGS.
- **WAC:** هر تأیید خرید `avg_cost_per_base` را بازمحاسبه؛ `computeAutoRecost` نیمه‌آماده‌های متأثر را اتمیک recost می‌کند.
- **Yield:** هم فروش منو هم تولید (`produceConfirmed`) ضریب `100/yieldPct` اعمال می‌کنند (هم‌فرمول — رفع 2026-06-10).

## ۵. API Routes
**هسته:** `/api/auth/{login,logout,me,change-password,permissions}` · `/api/transactions` (+`[id]`, `[id]/approve|reject`, `import`, `import/template`) · `/api/accounts` (+`[id]`, `[id]/ledger`, `recalculate`) · `/api/contacts`, `/api/categories`, `/api/branches`, `/api/users` (CRUD) · `/api/notifications` · `/api/reports` · `/api/settings` (+`wipe` = Factory Reset فقط SuperAdmin) · `/api/export`, `/api/upload`, `/api/audit`, `/api/logs`, `/api/dashboard`.
**منو:** `/api/menu` (عمومی) · `items`, `categories`, `settings` (mutation).
**انبار:** `items` (+import/template) · `recipes` (+`[id]/costing`) · `vouchers` (+approve/reject, import/template) · `produce` · `stocktake` · `forecast` · `expiry` (هشدار انقضا — جدید 06-10).
**حقوق:** `employees` · `payroll/events` · `payroll/runs` (+calculate/approve/post).
**استخدام:** `recruitment` (+questions, upload).
**CRM:** `customers` · `coupons` (+validate) · `feedback` (+summary) · `tables` · `reservations`.
**عملیات (فاز۲–۶):** `/api/equipment` (+`[id]`) · `/api/maintenance` · `/api/purchase-orders` (+`[id]`, `[id]/receive`, `suggestions`) · `/api/task-templates` (+`[id]`) · `/api/tasks` (+`[id]`, `generate-today`).

## ۶. صفحات UI — `app/(app)/`
`/dashboard` · `/transactions(+/new)` · `/accounts(+/[id])` · `/contacts` · `/reports` · `/employees` · `/payroll` · `/inventory` · `/menu` · `/recruitment` · `/customers` · `/reservations` · `/coupons` · `/logs` · `/settings` · `/equipment(+/[id])` · `/purchase-orders(+/[id])` · `/tasks`.
**خارج از app:** `/m` (منوی عمومی)، `/apply` (استخدام عمومی)، `/login`, `/signup`, `/forgot`.

## ۷. Zustand — ۲۰ slice
auth, transactions, users, refs, accounts, contacts, menu, notifications, appSettings, preferences (تنها persist‌شونده), ui, employees, payroll, recruitment, customers, coupons, reservations, feedback, operations (تجهیزات+PO), tasks (وظایف روزانه).

## ۸. Migrationها (idempotent)
`db-setup.sql` (هسته ۱۳ جدول) · `db-seed.sql` (۳ شعبه، ۴ کاربر، ۹ دسته، ۳ صندوق) · `db-inventory-migration.sql` · `db-payroll-migration.sql` · `db-stage-payroll-full.sql` · `customers-migration.sql` · `supabase-v5-menu-sale-deduction-migration.sql` (sale_meta) · `supabase-v6-waste-expiry-migration.sql` (expiry_date) · `supabase-v7-bigint-migration.sql` (numeric 24,6) · `db-role-to-text.sql` · `fix-categories.sql` · `supabase-logs-migration.sql` · `db-inventory-reversal.sql` · `db-operations-migration.sql` (equipment/maintenance_logs/purchase_orders/purchase_order_items/task_templates/task_instances — هنوز روی DB اجرا نشده).
آرشیو: `migrations-archive/`. ⚠️ به آیتم «برای تأیید» در Backlog نگاه کن (فایل‌های recruitment/permissions/warehouse-role در این لیست نیستند).

## ۹. قابلیت‌های تأییدشده
JWT + RBAC سه‌لایه + rate-limit ورود · مجوز granular با اعمال فوری · CRUD همه‌ی ماژول‌ها · موجودی اتمیک + گردش حساب + بازسازی · PATCH immutability · DELETE atomic rollback · VAT، نسیه، گزارش، Excel · انبار WAC + recipe explosion + backflushing + waste GL · حقوق با بیمه/مالیات + posting · استخدام عمومی · CRM وفاداری/کوپن/رزرو · Factory Reset · منوی دیجیتال + QR + PWA + Realtime · لاگ مرکزی.

## ۱۰. اطلاعات عملیاتی (که نباید گم شود)
- **لاگین تست:** `admin@basharaf.app` / `basharaf123` (SuperAdmin).
- **Repo:** `github.com/barismairan-source/basharaf-app` (شاخه `main`).
- **JWT_SECRET باید ≥ ۳۲ کاراکتر باشد** — کمتر = لاگین کلاً خراب (درس پرهزینه‌ی گذشته).
- TS strict: `arr[0]` با گارد؛ `Record[key]` با `!` یا `?? fallback`؛ آیکن Lucide prop `dir` ندارد؛ enum از map نیاز به `as` cast.
- فایل route فقط متد HTTP و config export کند؛ helper در `lib/`.
- فایل‌های SQL: بایت اول `2d 2d` (خط تیره)؛ کامنت ASCII.
- روال هر تغییر: `npx tsc --noEmit` (۰ خطا) → `npm run build` → ژورنال + بخش ۰ → commit/push.

## ۱۱. وابستگی‌های کلیدی
next `14.2.15` · react `^18.3.1` · typescript `^5.6.3` · drizzle-orm `^0.36.1` · postgres `^3.4.5` · @supabase/supabase-js `^2.45.4` · jose `^5.9.6` · bcryptjs `^2.4.3` · zustand `^4.5.5` · zod `^3.23.8` · recharts `^3.8.1` · xlsx `^0.18.5` · qrcode `^1.5.4` · react-multi-date-picker `^4.5.2` · ⚠️ `@types/file-saver` یتیم.
