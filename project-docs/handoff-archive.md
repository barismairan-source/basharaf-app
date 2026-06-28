# handoff-archive.md — ژورنال‌های آرشیوشده

## 📓 2026-06-27 — v0.9.41: جداسازی انبار/آشپزخانه فاز ۲ — اکانت ۱
**چه شد:** تفکیک واقعی حوزه‌ی انبار از آشپزخانه:
(۱) `sectionForPath`: `/inventory/kitchen`، `/inventory/recipes`، `/inventory/plan` → `'kitchen'` (قبل از قاعده‌ی عام `/inventory` → `'inventory'`، ترتیب حیاتی).
(۲) `defaultRoles`: بخش `inventory` → `['SuperAdmin','Warehouse','BranchUser']` (Chef حذف، BranchUser اضافه طبق دستور کاربر — هم‌راستا با گارد صفحه‌ی hub که از قبل BranchUser را مجاز می‌دانست). بخش `kitchen` → `['SuperAdmin','Chef']`.
(۳) `nav-config`: آیتم `/inventory` به برچسب «انبار» تغییر کرد + آیتم جدید «آشپزخانه» (ChefHat) → `/inventory/kitchen`. `isNavItemActive` ویژه‌ی kitchen اضافه شد تا روی recipes/plan/kitchen هم highlight شود.
(۴) hub جدید `app/(app)/inventory/kitchen/page.tsx`: دو کارت (دستور پخت، برنامه تولید) با گارد `canAccessSection(user,'kitchen')`.
(۵) hub انبار `/inventory/page.tsx`: کارت‌های recipes/plan با فلگ `kitchen:true` شرطی به `canAccessSection(user,'kitchen')` شدند (SuperAdmin هنوز می‌بیند، Warehouse نه).
(۶) `plan/page.tsx`: backHref از `/inventory` به `/inventory/kitchen`.
موارد مرزی (items/variance/sales) عمداً دست‌نخورده ماندند (فاز ۳).
**فایل‌ها:** `lib/auth/permissions.ts`، `components/layout/nav-config.ts`، `app/(app)/inventory/page.tsx`، `app/(app)/inventory/kitchen/page.tsx` (جدید)، `app/(app)/inventory/plan/page.tsx`، `HANDOFF.md`.
**Build:** tsc ✅ ۰ خطا · build ✅ (route /inventory/kitchen ساخته شد) · tests ✅ 32/32
**⚠️ تغییر رفتار:** BranchUser حالا به بخش انبار دسترسی دارد (طبق دستور کاربر). فعلاً فقط SuperAdmin کاربر واقعی است، پس اثر زنده ندارد.
**ناتمام:** فاز ۳ (موارد مرزی) — نیاز به تصمیم محصول.
**برای جلسه‌ی بعد:** بعد از تست کاربر، تصمیم درباره‌ی `items` (هم raw هم prep)، `variance`، `sales` — هرکدام زیر کدام حوزه.

## 📓 2026-06-27 — v0.9.40: جداسازی انبار/آشپزخانه فاز ۰+۱ — اکانت ۱
**چه شد:**
(فاز ۰ — صفر ریسک) بخش `kitchen` به `SectionKey` و `SECTIONS` در `permissions.ts` اضافه شد با `defaultRoles: ['SuperAdmin','Chef']`. `sectionForPath` و `nav-config` **دست‌نخورده** ماندند — هیچ مسیری هنوز به kitchen نگاشت نمی‌شود، پس رفتار فعلی هیچ کاربری عوض نشده. تنها اثر مرئی: یک تیک جدید «آشپزخانه» در پنل دسترسی TeamPane (که خودکار روی SECTIONS map می‌کند).
(فاز ۱ — migration محافظتی) فایل `db-kitchen-section-migration.sql` ساخته شد: به هر کاربری که permission صریح `'inventory'` دارد و `'kitchen'` ندارد، `'kitchen'` اضافه می‌کند (JSONB `||`). idempotent. **اجرا نشد — منتظر کاربر برای pgAdmin.**
بررسی شد که `ALL_SECTION_KEYS` هیچ‌جا مصرف نمی‌شود و تنها مصرف‌کننده‌ی SECTIONS، `canAccessSection` (بدون مسیر kitchen) و TeamPane است → صفر تغییر رفتار تأیید شد.
**فایل‌ها:** `lib/auth/permissions.ts`، `db-kitchen-section-migration.sql` (جدید)، `HANDOFF.md`.
**Build:** tsc ✅ ۰ خطا · tests ✅ 32/32
**ناتمام:** فاز ۲ و ۳ عمداً زده نشدند. منتظر تست کاربر + اجرای migration.
**برای جلسه‌ی بعد:** فقط بعد از تأیید کاربر → فاز ۲ (تفکیک sectionForPath: recipes/plan → kitchen، تغییر defaultRoles بخش inventory به حذف Chef، افزودن آیتم nav «آشپزخانه»، شرطی‌کردن کارت‌های hub).

## 📓 2026-06-27 — بررسی جداسازی انبار/آشپزخانه (بدون تغییر کد) — اکانت ۱
**چه شد:** بررسی کامل سیستم نقش/دسترسی برای تقسیم «انبار و آشپزخانه» به دو حوزه‌ی جدا. یافته‌ی کلیدی: نقش‌های `Warehouse` (انباردار) و `Chef` (سرآشپز) از قبل وجود دارند؛ مشکل اینجاست که هر دو به یک بخش واحد `inventory` نگاشت می‌شوند و `sectionForPath` همه‌ی `/inventory/*` را یکی می‌بیند. راه‌حل پیشنهادی: افزودن بخش `kitchen`، تفکیک در `sectionForPath`، بدون جابجایی فایل. نقشه‌ی ۵ فازی از صفر-ریسک تا پرریسک نوشته شد. ریسک اصلی: کاربران با permission صریح `'inventory'` نیاز به migration محافظتی (افزودن `'kitchen'`) دارند.
**فایل‌ها:** `project-docs/INVESTIGATION-inventory-kitchen-split.md` (ایجاد)، `HANDOFF.md`. هیچ کد اجرایی تغییر نکرد.
**Build:** بدون تغییر کد — tsc/build/tests دست‌نخورده ✅ 32/32.
**ناتمام:** منتظر تصمیم کاربر برای شروع پیاده‌سازی.
**برای جلسه‌ی بعد:** اگر کاربر تأیید کرد، فاز ۰+۱ (افزودن بخش kitchen + migration محافظتی) را با هم بزن.

## 📓 2026-06-27 — v0.9.39: ساخت/ویرایش نیمه‌آماده از UI (شکاف ۴) — اکانت ۱
**چه شد:**
(۱) PATCH `/api/inventory/items/[id]` کامل شد: `batchYieldBase` و `prepRecipe` به `patchSchema` اضافه شدند (قبلاً در PATCH ناموجود بود — فقط POST).
(۲) فرم اقلام انبار (`items/page.tsx`) بازطراحی: toggle «ماده خام / نیمه‌آماده» اضافه شد. وقتی prep انتخاب شود: فیلد «بازده یک بچ» + mini ingredient builder (جستجو + مقدار + حذف) ظاهر می‌شود.
(۳) cycle detection با BFS روی items لود‌شده کلاینت: self-reference و هر حلقه‌ی دلخواه عمق جلوگیری می‌شود — آیتم‌هایی که حلقه می‌سازند از نتایج جستجو فیلتر می‌شوند.
(۴) ویرایش نیمه‌آماده‌ی موجود: toggle روی «نیمه‌آماده» باز می‌شود و مواد از DB پر می‌شوند.
(۵) ارقام فارسی/عربی با `normalizeDigits` در هر دو input مقدار handle می‌شود.
**فایل‌ها:** `app/api/inventory/items/[id]/route.ts`، `app/(app)/inventory/items/page.tsx`، `HANDOFF.md`.
**Build:** tsc ✅ ۰ خطا · tests ✅ 32/32
**ناتمام:** منتظر تأیید کاربر
**برای جلسه‌ی بعد:** (۱) شکاف ۱: sync قیمت. (۲) شکاف ۳: variance + grep inv_stock_tx columns.

## 📓 2026-06-27 — v0.9.38: نمایش زنجیره prep در costing panel (شکاف ۲) — اکانت ۱
**چه شد:** سه تغییر additive برای نمایش مواد تشکیل‌دهنده‌ی آیتم‌های نیمه‌آماده در پنل bhosting رسپی:
(۱) `LineCost` در `costing.ts` فیلد اختیاری `subLines?: LineCost[]` گرفت — بدون تغییر توابع موجود.
(۲) `RecipeLineCost` در `types/inventory.ts` فیلد `subLines?: RecipeLineCost[]` گرفت — backward-compatible.
(۳) `costing/route.ts` بازنویسی: بعد از `costRecipe()` برای هر line با `kind='prep'`، `prepRecipe` JSONB آن item را fetch و با scale factor (qtyUsed / batchYieldBase) expand می‌کند. یک DB fetch اضافه فقط برای sub-items.
(۴) `recipes/page.tsx` RecipeCard: اگر `subLines` موجود بود، با indent و border-r نمایش می‌دهد + badge «نیمه‌آماده».
**فایل‌ها:** `lib/inventory/costing.ts`، `types/inventory.ts`، `app/api/inventory/recipes/[id]/costing/route.ts`، `app/(app)/inventory/recipes/page.tsx`.
**Build:** tsc ✅ ۰ خطا · tests ✅ 32/32
**ناتمام:** منتظر تأیید کاربر
**برای جلسه‌ی بعد:** شکاف ۱ (sync قیمت، Option B) — فایل‌های اصلی: `recipes/page.tsx` wizard step 1 + `costing/route.ts`.

## 📓 2026-06-26 — گزارش وضعیت کامل (STATE-SNAPSHOT) — اکانت ۱
**چه شد:** بدون تغییر کد، یک گزارش جامع وضعیت پروژه ساخته شد: درخت app/ تا عمق ۳، تمام ۱۱۱ API endpoint با HTTP method، ۵۱ جدول دیتابیس از schema.ts، ارزیابی تکمیل ۱۰ ماژول، تمام TODO/mock/hardcode در کد.
**فایل‌ها:** `project-docs/STATE-SNAPSHOT.md` (ایجاد)، `HANDOFF.md`.
**Build:** بدون تغییر کد — tsc/build/tests همچنان ✅ 32/32.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) تست /apply روی موبایل با کیبورد فارسی. (۳) SMS provider واقعی جایگزین OTP mock در `lib/ordering/webCustomer.ts:71`.

## 📓 2026-06-26 — v0.9.37: فیکس ۴ باگ UI (apply + recruitment) — اکانت ۱
**چه شد:**
(۱) **باگ ۱ — تاگل رزومه:** بخش رزومه در مرحله ۲ فرم /apply از دکمه‌ی مبهم به یک تاگل دو حالته واضح (آپلود رزومه | رزومه ندارم) با پس‌زمینه مشکی برای حالت انتخاب‌شده تبدیل شد. وضعیت toggle همیشه visible است و محتوای داخل بر اساس انتخاب نمایش داده می‌شود.
(۲) **باگ ۲ — ارقام فارسی:** تابع `normalizeDigits()` به `lib/utils.ts` اضافه شد (تبدیل ۰-۹ فارسی و ٠-٩ عربی به 0-9 لاتین). روی تمام inputهای عددی پروژه اعمال شد: `/apply` (phone, age)، employees (phone)، contacts (phone×2)، customers (phone)، customers/[id] (phone)، order/account (phone, code OTP).
(۳) **باگ ۳ — مدیریت سوالات:** در modal مدیریت سوالات در /recruitment، `Input` ویژگی `flex-1` گرفت، دکمه Trash2 به `flex-shrink-0` و hover واضح‌تر (rose bg) تبدیل شد، `Textarea` با `mr-7` زیر Input تراز شد.
(۴) **باگ ۴ — سوالات در /apply:** کنتراست متن سوال (prompt) از `text-gray-400` به `text-gray-600` و عنوان از `text-gray-800` به `text-gray-900` ارتقا یافت. fallback برای عنوان خالی (`سوال N`) اضافه شد.
**فایل‌ها:** `lib/utils.ts`، `app/apply/page.tsx`، `app/(app)/recruitment/page.tsx`، `app/(app)/employees/page.tsx`، `app/(app)/contacts/page.tsx`، `app/(app)/customers/page.tsx`، `app/(app)/customers/[id]/page.tsx`، `app/order/account/page.tsx`.
**Build:** tsc ✅ ۰ خطا · build ✅ سبز · tests ✅ 32/32
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) تست /apply روی موبایل با کیبورد فارسی. (۳) تست Excel import با فایل واقعی.

## 📓 2026-06-26 — فیکس db-admin-migration.sql — اکانت ۱
**چه شد:** در شروع جلسه مشخص شد `db-admin-migration.sql` به‌اشتباه با محتوای `db-financial-periods-migration.sql` جایگزین شده بود (محتوای تکراری جدول financial_periods). migration اصلی (اضافه‌کردن ستون `is_active` به جدول `users` — Super Admin Panel v1) حذف شده بود. با `git checkout -- db-admin-migration.sql` فایل به وضعیت committed صحیح برگشت.
**فایل‌ها:** `db-admin-migration.sql` (revert)، `HANDOFF.md`.
**Build:** بدون تغییر کد — tsc/build/tests همچنان ✅ 32/32.
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) تست Excel import با فایل واقعی پس از deploy.

## 📓 2026-06-24 — CI/CD + بازطراحی apply + فیکس ThemeProvider crash — اکانت ۱
**چه شد:**
(۱) **GitHub Actions راه‌اندازی شد:** کاربر `.github/workflows/liara.yml` و `LIARA_API_TOKEN` secret را تنظیم کرد. از این به بعد هر push به main → لیارا خودکار deploy می‌کند (نام اپ: `basharaff`). دیگر ZIP لازم نیست.
(۲) **بازطراحی `app/apply/page.tsx`:** تمام منطق/state/validation/API حفظ شد، فقط JSX بازنویسی شد. Layout جدید: دو ستون (sidebar مشکی ۲۶۰px + فرم سفید) روی دسکتاپ، progress bar 3px روی موبایل. مرحله ۰: کارت‌های کلیک‌مستقیم. موفقیت: صفحه‌ی کامل مشکی با کارت سفید.
(۳) **فیکس ThemeProvider crash:** کاربرانی که localStorage قدیمی (بدون `accentColor`) داشتند، خطای `Cannot read properties of undefined (reading 'trim')` می‌گرفتند. guard `typeof` اضافه شد با fallback به `'#2563eb'`.
**فایل‌ها:** `app/apply/page.tsx`، `components/ui/ThemeProvider.tsx`، `components/settings/PreferencesPane.tsx`، `HANDOFF.md`.
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin (اگر هنوز نشده). (۲) تست Excel import با فایل واقعی. دیگر zip نساز — فقط push.

## 📓 2026-06-23 — v0.9.36: رنگ جانبی دینامیک + فیکس login loop + فیکس rolldown — اکانت ۱
**چه شد:**
(۱) **فیکس deploy (rolldown):** `@rolldown/binding-darwin-arm64` اشتباهاً به عنوان devDependency صریح در `package.json` ثبت شده بود. روی Linux x64 لیارا با `EBADPLATFORM` fail می‌کرد. حذف شد + lockfile rebuild.
(۲) **فیکس login reload loop:** `SessionSync` در root layout روی همه صفحات اجرا می‌شود. وقتی `bootstrap()` روی `/login` اجرا می‌شد، 401 از `/api/auth/me` می‌گرفت و بدون چک pathname، `window.location.replace('/login')` صدا می‌زد → reload بی‌نهایت. فیکس: guard مشابه `apiFetch` و `installSessionExpiryInterceptor` اضافه شد (`!isAuthRoute` چک).
(۳) **فیچر رنگ جانبی دینامیک:** `AccentColor` از union ثابت به `string` (hex) تغییر کرد. `ThemeProvider` هر hex رو می‌گیره و `--accent`/`--accent-subtle`/`--accent-hover` رو روی `:root` set می‌کنه. hover/subtle خودکار از luminance محاسبه می‌شوند (رنگ‌های تیره مثل مشکی → روشن‌تر hover؛ بقیه → تیره‌تر). Tailwind tokens.ts به `var(--accent)` و `var(--accent-subtle)` تبدیل شد. تنظیمات > تنظیمات نمایش: ۱۰ preset رنگ + چرخ رنگ بومی + ورودی hex + پیش‌نمایش زنده.
**فایل‌ها:** `package.json`، `package-lock.json`، `store/index.ts` (login loop fix)، `types/preferences.ts`، `types/index.ts`، `lib/design/tokens.ts`، `app/globals.css`، `app/layout.tsx`، `components/ui/Button.tsx`، `components/ui/ThemeProvider.tsx` (جدید)، `components/ui/index.ts`، `components/settings/PreferencesPane.tsx`.
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) دیپلوی `basharaf-v0.9.36-liara.zip`. (۳) تست رنگ جانبی در تنظیمات > تنظیمات نمایش. (۴) تست Excel import با فایل واقعی.

## 📓 2026-06-23 — v0.9.35: UI مدیریت دوره‌های مالی — اکانت ۱
**چه شد:**
صفحه‌ی `/admin/settings/financial-periods` برای SuperAdmin ساخته شد. این صفحه API از پیش موجود `GET/POST/DELETE /api/financial-periods` را مصرف می‌کند.
قابلیت‌ها: (۱) لیست دوره‌های بسته‌شده به‌صورت معکوس زمانی با تاریخ بستن. (۲) فرم بستن دوره جدید (سال ۱۴۰۰–۱۴۱۰ + ماه dropdown + دکمه‌ی قرمز). (۳) دکمه‌ی «بازگشایی» با confirm dialog که DELETE می‌زند. (۴) کارت هشدار amber توضیح اثر قفل. (۵) تشخیص خودکار ماه/سال جاری از `getTodayJalali()` با تبدیل ارقام فارسی: `c.charCodeAt(0) - 0x06F0`. تم dark admin (stone-950/900/800/700). همچنین `AdminSidebar.tsx` با آیکون `CalendarDays` به‌روز شد.
ZIP نیز rebuild شد: `basharaf-v0.9.35-liara.zip` (1.4MB).
**فایل‌ها:** `app/(admin)/admin/settings/financial-periods/page.tsx` (جدید)، `components/admin/AdminSidebar.tsx` (ویرایش).
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) دیپلوی `basharaf-v0.9.35-liara.zip`. (۳) تست Excel import با فایل واقعی پس از deploy.

## 📓 2026-06-23 — v0.9.34: Excel Bulk Import + 3-Tier BOM — اکانت ۱
**چه شد:**
فیچر «ایمپورت رسپی از Excel» با معماری ۳ لایه‌ی BOM پیاده‌سازی شد:
(۱) **API — `POST /api/inventory/recipes/import`:** فایل `.xlsx/.xls` را در `multipart/form-data` می‌گیرد. سه شیت الزامی (`۱_مواد خام`، `۲_زیررسپی`، `۳_پرس نهایی`) را parse می‌کند. تمام عملیات درون یک `db.transaction` اتمیک است. شیت ۱ مواد خام را در `invItems (kind='raw')` upsert می‌کند و `avgCostPerBase` را از «قیمت خرید ÷ basePerUnit» محاسبه می‌کند. شیت ۲ نیمه‌آماده‌ها را در `invItems (kind='prep')` upsert می‌کند و `prepRecipe` JSON و `batchYieldBase` را می‌نویسد. شیت ۳ رسپی‌های نهایی را در `invRecipes + invRecipeLines` upsert می‌کند و به‌صورت خودکار با `menuItems.titleFa` لینک می‌زند. خطاهای validation (واحد نامعتبر، ماده ناشناخته، رسپی بدون ماده) با row/sheet دقیق برمی‌گرداند.
(۲) **Template — `GET /api/inventory/recipes/import/template`:** فایل Excel الگو را با سه شیت و ردیف‌های نمونه on-the-fly تولید می‌کند.
(۳) **UI — `ImportExcelModal`:** دکمه «ایمپورت Excel» در header صفحه رسپی‌ها. Modal با drag-and-drop dropzone، دانلود template، نمایش progress، و خلاصه‌ی نتیجه (۴ کارت).
**فایل‌ها:** `app/api/inventory/recipes/import/route.ts` (جدید)، `app/api/inventory/recipes/import/template/route.ts` (جدید)، `app/(app)/inventory/recipes/page.tsx` (ImportExcelModal + دکمه جدید).
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) دیپلوی `basharaf-v0.9.34-liara.zip`. (۳) تست import با فایل Excel واقعی. (۴) UI مدیریت دوره‌های مالی.

## 📓 2026-06-22 — مرتب‌سازی root + zip درست برای Liara — اکانت ۱
**چه شد:**
root پروژه که بسیار شلوغ شده بود پاکسازی شد: ۳۵ فایل SQL قدیمی (همه‌ی supabase-* و db-* که قبلاً deploy شده بودند) با `git mv` به `project-docs/migrations/` منتقل شدند. ۴ فایل doc سرگردان (`DEPLOY.md`، `DEPLOY-LIARA.md`، `final-status.md`، `deployment-summary.md`) به `project-docs/` رفتند. ۱۹ zip قدیمی در root حذف شدند (در gitignore بودند، tracked نبودند). zip جدید `basharaf-v0.9.33-liara.zip` با exclude کامل ساخته شد (snapshot dirs، tests، .claude، graphify-out، release-artifacts) — حجم از ۴MB به ۱.۴MB کاهش یافت.
**فایل‌ها:** `project-docs/migrations/` (جدید)، `project-docs/` (4 doc)، `HANDOFF.md`.
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅
**ناتمام:** —
**برای جلسه‌ی بعد:** (۱) اجرای ۴ migration در pgAdmin. (۲) آپلود `basharaf-v0.9.33-liara.zip` روی Liara. (۳) UI مدیریت دوره‌های مالی.

## 📓 2026-06-21 — v0.9.33: Core Financial Integrity Sprint (Phase 1+2+3) — اکانت ۲
**چه شد:** سپرینت یکپارچگی مالی کامل شد: (۱) `lib/db/migrate.ts` برای migration خودکار. (۲) جدول `financial_periods` + API + guard مسدودکننده در تراکنش‌های دوره بسته. (۳) Vitest + 32/32 unit tests (balance, costing, vat).
**فایل‌ها:** `lib/db/schema.ts`، `lib/db/migrate.ts`، `lib/financial-period.ts`، `lib/financial/balance.ts`، `lib/financial/vat.ts`، `app/api/financial-periods/route.ts`، `db-financial-periods-migration.sql`، `tests/unit/*.test.ts`، `vitest.config.ts`.
**Build:** tsc ✅ · build ✅ · tests 32/32 ✅

## 📓 2026-06-20 — v0.9.32: سیستم اعلان نسل ۲ — اکانت ۲
**چه شد:**
بازسازی کامل سیستم اعلان در ۴ فاز:
(۱) **فاز ۱ — Schema/DB:** `notifTypeEnum` به `warning` و `critical` گسترش یافت. ستون‌های `action_url` و `entity_id` به جدول `notifications` اضافه شد. جدول `notification_rules` (key/label/enabled/threshold) برای کنترل ادمین ساخته شد. Migration: `db-notifications-v2-migration.sql`. `lib/notify.ts` helper مرکزی با `notify()`, `notifyAdmins()`, `getRuleThreshold()` ساخته شد.
(۲) **فاز ۲ — UI Bell:** `NotificationsBell.tsx` کاملاً بازنویسی شد. Desktop: dropdown 360px با TYPE_META برای ۶ نوع. Mobile: bottom sheet (max-h-75vh، animate-slide-up، backdrop-blur). Deep linking: کارت‌های با `actionUrl` به `<Link>` تبدیل شدند.
(۳) **فاز ۳ — Admin Config:** صفحه‌ی `/admin/settings/notifications` با toggle سوئیچ برای ۶ قانون. API `GET/PATCH /api/admin/notification-rules`. آیتم جدید در `AdminSidebar`.
(۴) **فاز ۴ — Wire-up:** همه ۶ call-site به `notify()`/`notifyAdmins()` migrate شدند.
**فایل‌ها:** `lib/db/schema.ts`، `lib/notify.ts` (جدید)، `db-notifications-v2-migration.sql` (جدید)، `types/notification.ts`، `components/layout/NotificationsBell.tsx`، `components/admin/AdminSidebar.tsx`، `app/api/admin/notification-rules/route.ts` (جدید)، `app/(admin)/admin/settings/notifications/page.tsx` (جدید)، و چند route دیگر.
**Build:** tsc ✅ · build ✅

## 📓 2026-06-20 — v0.9.31: Enterprise UX (Skeleton primitive + 11 loading.tsx + API error unification) — اکانت ۲
**چه شد:**
(۱) `components/ui/Skeleton.tsx` با sub-components کامپوزبل ساخته شد. (۲) ۱۱ فایل `loading.tsx` با skeleton دقیق برای هر صفحه‌ی سنگین. (۳) API Error Unification برای ۷ route (customer/* و auth/permissions) به `handleError()`.
**فایل‌ها:** `components/ui/Skeleton.tsx`، `components/ui/index.ts`، ۱۱ فایل loading.tsx، ۷ API route.
**Build:** tsc ✅ · build ✅

## 📓 2026-06-20 — v0.9.30: Phase A کامل (Bug1: SecurityPane labels + Bug2: invoiceCode/proforma در فرم تراکنش) — اکانت ۲
**چه شد:**
(۱) برچسب و آیکون ۴۳ AuditAction جدید به `ACTION_META` در SecurityPane.tsx اضافه شد. (۲) فیلد «کد فاکتور» و چک‌باکس «پیش‌فاکتور» به فرم تراکنش جدید اضافه شد. (۳) TS Fix: `TransactionInput` دو فیلد `invoiceCode?` و `initialStatus?` گرفت.
**فایل‌ها:** `types/transaction.ts`، `components/settings/SecurityPane.tsx`، `app/(app)/transactions/new/page.tsx`.
**Build:** tsc ✅ · build ✅

## 📓 2026-06-20 — v0.9.29: Super Admin Panel v1 (RBAC + Impersonation + Audit) — اکانت ۲
**چه شد:**
(۱) فیلد `is_active` به جدول `users` اضافه شد. (۲) سیستم جعل هویت (impersonation) با کوکی `basharaf-imp` (4h) و AuditLog کامل. (۳) پنل ادمین تاریک با صفحات داشبورد، مدیریت کاربران، و لاگ ادیت. (۴) `ImpersonationBanner` بنر قرمز z-50 در حین جعل هویت.
**فایل‌ها:** `lib/auth/impersonation.ts` (جدید)، `lib/auth/session.ts`، `middleware.ts`، `app/(admin)/` (layout + 3 page)، `db-admin-migration.sql`.
**Build:** tsc ✅ · build ✅

## 📓 2026-06-19 — v0.9.28: Accounting Overhaul v1 (proforma + invoiceCode + contact ledger) — اکانت ۲
**چه شد:**
(۱) `proforma` به `txStatusEnum` + فیلد `invoice_code` به جدول transactions اضافه شد. (۲) `lib/db/contactLedger.ts` + API `GET /api/contacts/[id]/ledger`. (۳) `ContactLedgerDrawer` — drawer سمت راست با مانده‌ی پویا + تاریخچه تراکنش‌ها.
**فایل‌ها:** `lib/db/schema.ts`، `lib/db/contactLedger.ts` (جدید)، `components/contacts/ContactLedgerDrawer.tsx` (جدید)، `db-accounting-v1-migration.sql`.
**Build:** tsc ✅ · build ✅

## 📓 2026-06-19 — v0.9.27: App Shell + Enterprise Header + Sidebar resize — اکانت ۲
**چه شد:**
App Shell به `h-screen overflow-hidden` تبدیل شد (scroll مستقل sidebar و main). Header به `h-16 backdrop-blur-sm` ارتقا یافت. Sidebar به `w-64`/`w-20` رفت.
**فایل‌ها:** `app/(app)/layout.tsx`، `components/layout/Sidebar.tsx`، `components/layout/Header.tsx`.
**Build:** tsc ✅ · build ✅

## 📓 2026-06-19 — v0.9.26: یکپارچه‌سازی design tokens در Input/Select/Textarea — اکانت ۲
**چه شد:**
رنگ‌های hardcoded (`stone-*`, `rose-*`, `bg-white`) در همه primitive های فرم با design tokens جایگزین شدند:
(۱) **Input.tsx:** `border-stone-200` → `border-border`؛ `focus-within:border-stone-500` → `focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20`؛ `bg-white` → `bg-surface`؛ `text-stone-800` → `text-text`؛ placeholder `text-stone-400` → `text-muted/60`؛ `bg-stone-50/60` → `bg-bg opacity-60`؛ `border-rose-300` → `border-danger`؛ `h-11` → `h-10` (هم‌راستا با Select).
(۲) **Select.tsx:** همان token‌ها + `focus:ring-2 focus:ring-accent/20`.
(۳) **Textarea.tsx:** همان + `focus:ring-2 focus:ring-accent/20` / `focus:ring-danger/20` در حالت خطا.
(۴) **PasswordInput.tsx:** به‌روزرسانی همان‌طور که Input.tsx.
(۵) **transactions/new:** error banner از `bg-rose-50 border-rose-100 text-rose-700` → `bg-danger-subtle border-danger/20 text-danger`.
**فایل‌ها:** `components/ui/Input.tsx`، `components/ui/Select.tsx`، `components/ui/Textarea.tsx`، `components/ui/PasswordInput.tsx`، `app/(app)/transactions/new/page.tsx`.
**Build:** tsc/build ✅ سبز.
**ناتمام:** —
**برای جلسه‌ی بعد:** (آرشیو شده — resolved)

## 📓 2026-06-14 — پکیج دیپلوی نسخه‌ی `v0.9.8-order-public` (ماژول سفارش بیرون‌بر: باکس ۰+۱) — اکانت ۲
**چه شد:** طبق قرارداد انتشار نسخه‌دار، برای کل کار ماژول سفارش بیرون‌بر تا اینجا (باکس ۰: جدول‌ها+تنظیمات+محدوده‌های ارسال، باکس ۱: صفحه‌ی عمومی `/order`) یک نسخه‌ی جدید ساخته شد: `package.json` از `0.9.7-menu-channel-public` به `0.9.8-order-public` ارتقا یافت. پوشه‌ی `v0.9.8-order-public/` ساخته شد شامل `basharaf-deploy.zip` (خروجی `git archive HEAD`، gitignored — فقط روی این دیسک) + کپی `db-ordering-migration.sql`.
**فایل‌ها:** `package.json` (نسخه)، `v0.9.8-order-public/db-ordering-migration.sql` (جدید، tracked)، `HANDOFF.md`.
**Build:** بدون تغییر کد منطقی در این جلسه.
**ناتمام:** —
**برای جلسه‌ی بعد:** (آرشیو شده — وضعیت resolved)

## 📓 2026-06-14 — صفحه‌ی عمومی سفارش /order: مرور منو + سبد (باکس ۱) — اکانت ۲
**چه شد:** صفحه‌ی عمومی `/order` (بدون auth، خارج از middleware محافظت‌شده) ساخته شد — مرحله‌ی «مرور منو + سبد»، هنوز بدون ثبت سفارش/پرداخت. هلپر فقط‌خواندنی جدید `lib/ordering/publicMenu.ts` → `getPublicOrderMenu()`: شعبه = اولین شعبه (`branches[0]` به ترتیب `createdAt`)، تنظیمات از `ord_settings` (اگر ردیف نبود → fallback به مقادیر پیش‌فرض schema، **بدون insert**)، کاتالوگ از `menu_items` با `in_takeaway=true AND is_available=true` + `COALESCE(price_takeaway, price)`، دسته‌بندی از `menu_categories` با حذف دسته‌های بدون آیتم بیرون‌بر. تابع `isWithinOpenHours()` وضعیت باز/بسته‌ی لحظه‌ای را با ساعت تهران (`Asia/Tehran`) محاسبه می‌کند (شامل بازه‌ی گذرنده از نیمه‌شب). API عمومی جدید `GET /api/public/order/menu` (بدون auth، `force-dynamic`) فقط همین داده را برمی‌گرداند — هیچ فیلد پنل/قیمت خام/admin leak ندارد. صفحه‌ی `/order` (client component، دیزاین `components/ui` + پالت stone + Vazirmatn از layout ریشه، هم‌خانواده‌ی `/m`): هدر نام شعبه + Chip باز/بسته + ساعت کاری + حداقل سفارش؛ اگر بسته یا خارج ساعت → بنر قرمز هشدار + قفل دکمه‌های افزایش/کاهش تعداد؛ بخش‌های منو با شمارشگر تعداد per-item؛ سبد در state کلاینت با persist در `localStorage` (`basharaf-order-cart`)، نوار پایین چسبان با تعداد قلم/subtotal/کمبود تا حداقل سفارش/دکمه «ادامه» (غیرفعال تا شعبه باز باشد، سبد خالی نباشد، و حداقل سفارش برسد) → `/order/checkout`. صفحه‌ی placeholder جدید `/order/checkout`.
**فایل‌ها:** `types/ordering.ts` (+`PublicOrderItem/Section/Settings/Menu`)، `lib/ordering/publicMenu.ts` (جدید)، `app/api/public/order/menu/route.ts` (جدید)، `lib/repos/publicOrder.types.ts` + `lib/repos/publicOrder.api.ts` (جدید)، `app/order/layout.tsx` + `app/order/page.tsx` + `app/order/checkout/page.tsx` (جدید).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز.
**ناتمام:** ✅ migration اجرا شد، باکس‌های بعدی تکمیل شدند (آرشیو — ادامه در ورودی‌های بعدی).

---

## 📓 2026-06-14 — ماژول سفارش بیرون‌بر: زیرساخت داده + تنظیمات (باکس ۰) — اکانت ۲
**چه شد:** پایه‌ی ماژول سفارش بیرون‌بر (ارسال+پیکاپ، نقدی+آنلاین، guest checkout) ساخته شد — فقط داده+تنظیمات، بدون UI مشتری. ۵ جدول جدید بدون pgEnum (طبق قرارداد، text+CHECK): `ord_settings` (تنظیمات هر شعبه: باز/بسته، ساعت، ارسال/پیکاپ، روش پرداخت، حداقل سفارش، بافر آماده‌سازی)، `ord_zones` (محدوده‌های ارسال + هزینه)، `orders`، `order_lines`، `order_events` (با CHECK روی service_type/pay_method/pay_status). Migration idempotent `db-ordering-migration.sql` ساخته شد (هنوز روی DB اجرا نشده). repo به الگوی موجود (`lib/repos/ordering.types.ts` + `.api.ts`) + هلپرهای `lib/ordering/settings.ts` + `zones.ts` (شامل ایجاد خودکار ردیف تنظیمات پیش‌فرض با onConflictDoNothing). ۳ روت API (`/api/orders/settings`، `/api/orders/zones`، `/api/orders/zones/[id]`) با RBAC (SuperAdmin همه، BranchUser فقط شعبه‌ی خود). صفحه‌ی جدید `/orders/settings` (فرم تنظیمات شعبه + CRUD محدوده‌های ارسال با فرمت اعداد فارسی) — بدون آیتم سایدبار جدید (طبق دستور).
**فایل‌ها:** `lib/db/schema.ts` (+۵ جدول)، `db-ordering-migration.sql` (جدید)، `lib/db/ordering.serializers.ts` (جدید)، `types/ordering.ts` (جدید) + `types/index.ts`، `lib/repos/ordering.types.ts` + `lib/repos/ordering.api.ts` (جدید)، `lib/ordering/settings.ts` + `lib/ordering/zones.ts` (جدید)، `app/api/orders/settings/route.ts` + `app/api/orders/zones/route.ts` + `app/api/orders/zones/[id]/route.ts` (جدید)، `app/(app)/orders/settings/page.tsx` (جدید).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (روت‌های جدید ساخته شدند: `/api/orders/settings`، `/api/orders/zones`، `/api/orders/zones/[id]`، `/orders/settings` — 4.54 kB).
**ناتمام:** ⚠️ `db-ordering-migration.sql` هنوز روی DB production اجرا نشده — تا قبل از اجرا `/orders/settings` با خطای «جدول وجود ندارد» مواجه می‌شود (چون `getOrdSettings` در اولین فراخوانی سعی می‌کند ردیف پیش‌فرض را در `ord_settings` بسازد). UI مشتری (سفارش‌گیری واقعی) هنوز ساخته نشده — این فقط زیرساخت + تنظیمات است.
**برای جلسه‌ی بعد:** ۱) کاربر `db-ordering-migration.sql` را روی pgAdmin اجرا کند، سپس `/orders/settings` تست شود (لود/ذخیره‌ی تنظیمات + CRUD محدوده‌های ارسال). ۲) سپس باکس‌های بعدی سرویس سفارش (کاتالوگ/UI بیرون‌بر، ثبت سفارش، پیگیری با track_token، پنل مدیریت سفارش‌ها). ۳) سایر آیتم‌های Backlog (#14 دیپلوی عملیات روی Liara، #15 retest تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions).

---

## 📓 2026-06-14 — push فاز۱+فاز۲ کانال منو + پکیج نسخه‌ی `v0.9.7-menu-channel-public` — اکانت ۲
**چه شد:** کاربر تأیید کرد `db-menu-channel-migration.sql` روی DB production اجرا شده. `git push origin main` انجام شد (دو کامیت محلی فاز۱ `ebdf822` + فاز۲ `fa50941` → `fdea0a3..fa50941`). طبق قرارداد انتشار نسخه‌دار، پوشه‌ی `v0.9.7-menu-channel-public/` ساخته شد: `basharaf-deploy.zip` (خروجی `git archive HEAD`؛ بدون node_modules/.next/.git، چون gitignore هستند) + کپی `db-menu-channel-migration.sql` برای آرشیو (این migration از قبل روی DB اجرا شده — کپی فقط برای کامل‌بودن باندل دیپلوی است).
**فایل‌ها:** `v0.9.7-menu-channel-public/basharaf-deploy.zip` (gitignored، untracked)، `v0.9.7-menu-channel-public/db-menu-channel-migration.sql` (جدید، tracked)، `HANDOFF.md`.
**Build:** بدون تغییر کد در این جلسه — tsc/build قبلاً در همین commitها سبز تأیید شده بود (فاز۲).
**ناتمام:** —
**برای جلسه‌ی بعد:** بعد از دیپلوی خودکار (production)، `/m` (سالن)، `/m/{takeawaySlug}` (بیرون‌بر)، و تب QR پنل `/menu` چک شوند. سپس سایر آیتم‌های Backlog (#14 دیپلوی عملیات روی Liara، #15 retest تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions).

---

## 📓 2026-06-13 — منو: کانال سالن/بیرون‌بر (فاز۲ — صفحه‌ی عمومی بیرون‌بر + QR دوم) — اکانت ۲
**چه شد:**
(۱) `lib/db/menuSerializers.ts`: تابع جدید `buildPublicMenuSections(categories, items, channel, settings)` — برای یک کانال (`hall`/`takeaway`) فقط آیتم‌های `inHall`/`inTakeaway`=true را نگه می‌دارد، قیمت را resolve می‌کند (سالن: `price`؛ بیرون‌بر: `priceTakeaway ?? price`)، اگر سوییچ نمایش قیمت آن کانال خاموش باشد `price` را `null` می‌کند، و دسته‌های بدون آیتم در آن کانال را حذف می‌کند.
(۲) `/api/menu`: پارامتر `?channel=hall|takeaway` اضافه شد. **بدون پارامتر = دقیقاً همان رفتار قبلی** (داده‌ی خام کامل برای پنل ادمین — بدون تغییر، چون `loadMenu()` به `price`/`priceTakeaway`/`inHall`/`inTakeaway` خام برای فرم ویرایش نیاز دارد). با `channel`، خروجی از `buildPublicMenuSections` می‌آید.
(۳) کامپوننت مشترک جدید `components/menu/PublicMenu.tsx` — دقیقاً همان دیزاین/فونت/RTL/سوییچ زبان `/m` قبلی (LanguageToggle/MenuSection/menu.css)، با پراپ `channel`. تیتر بالای صفحه: سالن از `hallTitle`/`hallNote` (پیش‌فرض `null` → چیزی نشان نمی‌دهد، یعنی `/m` فعلی دقیقاً بدون تغییر ظاهری)؛ بیرون‌بر از `takeawayTitle`/`takeawayNote` (پیش‌فرض «منوی بیرون‌بر» + یک جمله‌ی توضیح).
(۴) `app/m/page.tsx` به یک wrapper نازک بازنویسی شد: `<PublicMenu channel="hall" />` (همان دیزاین قبلی، حالا با `/api/menu?channel=hall`). مسیر جدید `app/m/[slug]/page.tsx` (dynamic) → `<PublicMenu channel="takeaway" />`؛ `layout.tsx`/`menu.css`/`LanguageProvider` موجود `app/m/` به‌صورت خودکار به آن هم اعمال می‌شود. **توجه:** خود رشته‌ی `slug` چک نمی‌شود — هر مسیر زیر `/m/*` همان منوی بیرون‌بر را نشان می‌دهد؛ لینک «رسمی» همان `takeaway_slug` تنظیمات است که در تب QR/پیش‌نمایش تنظیمات استفاده می‌شود (طبق بریف: بدون auth، فقط نمایشی، نه سفارش‌گیری).
(۵) `components/menu/MenuItem.tsx`: وقتی `item.price === null` (چه آیتم اصلاً قیمت ندارد، چه سوییچ نمایش قیمت آن کانال خاموش است)، نه خط قیمت و نه خط‌چین کنارش رندر می‌شود — فقط عنوان/توضیح، بدون خط خالی.
(۶) تب «کد QR» پنل `/menu`: حالا دو کارت کنار هم — «سالن» (`/m`) و «بیرون‌بر» (`/m/{takeawaySlug}`)، هرکدام QR + کپی لینک + دانلود PNG مستقل (کامپوننت مشترک `QrCard`). لینک بیرون‌بر همیشه از `settings.takeawaySlug` فعلی ساخته می‌شود — با تغییر آن در تب تنظیمات، QR بیرون‌بر هم آپدیت می‌شود.
نسخه `package.json` → `0.9.7-menu-channel-public`.
**فایل‌ها:** `lib/db/menuSerializers.ts`، `app/api/menu/route.ts`، `components/menu/PublicMenu.tsx` (جدید)، `app/m/page.tsx`، `app/m/[slug]/page.tsx` (جدید)، `components/menu/MenuItem.tsx`، `app/(app)/menu/page.tsx` (تب QR)، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (`/m` 3.17 kB، `/m/[slug]` 3.16 kB — جدید، dynamic؛ `/menu` 15.2 kB).
**ناتمام:** —
**Commit/Push:** هنوز push نشده — همان دلیل فاز۱: `/api/menu` (با هر دو حالت — بدون پارامتر و `?channel=...`) به ستون‌های جدید `menu_items`/`menu_settings` نیاز دارد که فقط بعد از اجرای `db-menu-channel-migration.sql` روی DB موجودند.
**برای جلسه‌ی بعد:**
۱. بعد از تأیید کاربر که migration اجرا شده → `git push origin main` (شامل فاز۱+فاز۲، ۲ کامیت محلی)، سپس روی production چک شود: `/m` (سالن، باید دقیقاً مثل قبل باشد)، `/m/{takeawaySlug}` (بیرون‌بر — فقط آیتم‌های `inTakeaway=true`)، و تب QR پنل (هر دو کد).
۲. سایر آیتم‌های Backlog (#14 دیپلوی ماژول عملیات روی Liara، #15 retest باگ تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions).

---

## 📓 2026-06-13 — منو: کانال سالن/بیرون‌بر (فاز۱ — داده + پنل ادمین) — اکانت ۲
**چه شد:**
(۱) Migration جدید `db-menu-channel-migration.sql` (idempotent): `menu_items` +`in_hall`(bool, default true) +`in_takeaway`(bool, default false) +`price_takeaway`(bigint nullable) و `price` می‌شود nullable؛ `menu_settings` +`show_price_hall`/`show_price_takeaway`(bool, default true) +`takeaway_slug`(text, default `'birun'`) +`hall_title`/`takeaway_title`/`hall_note`/`takeaway_note`(text nullable).
(۲) `lib/db/schema.ts` و `types/menu.ts` با ستون‌های جدید هماهنگ شدند (`price`/`priceTakeaway` قابل null).
(۳) `lib/db/menuSerializers.ts`: `rowToMenuItem` به‌روز شد + سریالایزر جدید `rowToMenuSettings` (در `/api/menu` و `/api/menu/settings` مشترک استفاده می‌شود).
(۴) API: zod schemaهای آیتم (`POST`/`PATCH`) فیلدهای `inHall`/`inTakeaway`/`priceTakeaway` + `price` nullable را می‌پذیرند. `PATCH /api/menu/settings` فیلدهای کانال جدید را می‌پذیرد + اعتبارسنجی `takeawaySlug` (regex `^[a-z0-9-]+$`) + چک یکتایی در برابر `menu_categories.slug` (۴۰۹ `SLUG_CONFLICT` در صورت تداخل).
(۵) پنل `/menu`: تب «آیتم‌ها» — فرم افزودن/ویرایش (ردیف ویرایش درون‌خطی با آیکن `Edit3`/`X`) با دو سوییچ «نمایش در سالن/بیرون‌بر»، دو فیلد قیمت اختیاری با `formatNumericInputValue` (راهنما: «خالی = بدون قیمت» برای سالن، «خالی = همون قیمت سالن» برای بیرون‌بر)، و دو Chip «سالن»/«بیرون» در لیست. تب «تنظیمات» — کارت جدید «کانال‌های سالن و بیرون‌بر»: دو سوییچ نمایش قیمت، فیلد `takeaway_slug` با پیش‌نمایش زنده‌ی `/m/{slug}` + خطای اعتبارسنجی، و عنوان/یادداشت اختیاری برای هر کانال.
(۶) `/m`: فقط یک خط تغییر کرد — `formatPrice(item.price ?? 0)` در `MenuItem.tsx` برای سازگاری با نوع nullable جدید؛ رفتار فعلی برای آیتم‌های موجود (همه قیمت دارند) کاملاً بدون تغییر. این فاز فقط داده + پنل ادمین است؛ نمایش عمومی `/m` بر اساس کانال = فاز۲ (طبق بریف).
نسخه `package.json` → `0.9.6-menu-channel`.
**فایل‌ها:** `db-menu-channel-migration.sql` (جدید)، `lib/db/schema.ts`، `types/menu.ts`، `lib/db/menuSerializers.ts`، `app/api/menu/items/route.ts`، `app/api/menu/items/[id]/route.ts`، `app/api/menu/settings/route.ts`، `app/api/menu/route.ts`، `components/menu/MenuItem.tsx`، `app/(app)/menu/page.tsx`، `package.json`.
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (`/menu` 15.2 kB، `/m` 2.96 kB، همه‌ی روت‌ها ساخته شدند).
**ناتمام:** فاز۲ — اعمال `show_price_hall`/`show_price_takeaway`/`takeaway_slug`/عنوان‌ها/یادداشت‌های هر کانال و `item.inHall/inTakeaway/priceTakeaway` در صفحه‌ی عمومی `/m` (و احتمالاً مسیر `/m/[slug]` برای بیرون‌بر) — انجام نشده، طبق بریف.
**Commit/Push:** ⚠️ `/api/menu` (عمومی، بدون auth، مصرف‌شده توسط `/m` برای همه‌ی بازدیدکنندگان + پنل `/menu`) حالا ستون‌های جدید را از `menu_items`/`menu_settings` می‌خواند — اگر `db-menu-channel-migration.sql` روی DB اجرا نشده باشد، بعد از دیپلوی این کد `/api/menu` (و در نتیجه `/m`) برای همه‌ی مشتری‌ها خطا می‌دهد. قبل از push از کاربر پرسیده شد؛ کاربر گفت **الان روی pgAdmin اجرا می‌کنم و بعد بگو push کن** — یعنی commit محلی انجام شد ولی `git push` منتظر تأیید کاربر است.
**برای جلسه‌ی بعد:**
۱. اگر کاربر تأیید کرد migration اجرا شده → `git push origin main`، بعد `/menu` و `/m` روی production چک شوند (انتظار: هیچ خطایی، چون فیلدهای جدید مقدار پیش‌فرض دارند).
۲. فاز۲ — نمایش `/m` بر اساس کانال (سالن/بیرون‌بر) با استفاده از `show_price_hall`/`show_price_takeaway`/`hall_title`/`takeaway_title`/`hall_note`/`takeaway_note`/`item.inHall`/`item.inTakeaway`/`item.priceTakeaway`، و احتمالاً مسیر جدید `/m/{takeawaySlug}`.
۳. سایر آیتم‌های Backlog (#14 دیپلوی ماژول عملیات روی Liara، #15 retest باگ تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions).

---

## 📓 2026-06-13 — ماژول عملیات: تجهیزات/سفارش‌خرید/وظایف روزانه + RBAC/سایدبار/داشبورد (فاز ۲–۷) — اکانت ۲
**چه شد:**
(۱) **فاز ۲–۴ (پیش از این ورودی، در همین زنجیره‌ی جلسات):** ماژول «تجهیزات» (CRUD + سوابق نگهداری `maintenance_logs`) و ماژول «سفارش خرید» (CRUD، گردش وضعیت draft→sent→partial/received→cancelled، دریافت کالا با ساخت برگه‌ی ورود انبار) ساخته شدند. جدول‌های جدید در `db-operations-migration.sql`: `equipment`, `maintenance_logs`, `purchase_orders`, `purchase_order_items`.
(۲) **فاز ۵ (پیش از این ورودی):** پیشنهاد سفارش خودکار از روی `min_base` انبار (`/api/purchase-orders/suggestions`) — کامل بود، در این جلسه نیاز به rework نداشت.
(۳) **فاز ۶ (وظایف روزانه):** جدول‌های `task_templates`/`task_instances` + `store/slices/tasksSlice.ts` (loadTaskTemplates, createTaskTemplate, updateTaskTemplate, loadTasks, generateTodayTasks idempotent, updateTaskInstance) + صفحه‌ی `/tasks` (فیلتر شعبه/تاریخ/مسئول + «کارهای من»، ساخت وظایف امروز، تکمیل/رد/بازگشت/تخصیص، مدیریت قالب‌ها برای ادمین). انباردار هم به `/tasks` دسترسی دارد (وظایف انبار مثل شماری روزانه به او تخصیص می‌یابد).
(۴) **فاز ۷ (RBAC + سایدبار + داشبورد):** `/purchase-orders`, `/equipment`, `/tasks` به `PROTECTED_PREFIXES` در `middleware.ts` اضافه شد. سایدبار: «تجهیزات»/«سفارش خرید» → SuperAdmin+BranchUser، «وظایف روزانه» → هر سه نقش. صفحه‌ی `[id]`/دریافت کالای سفارش‌خرید از قبل برای Warehouse باز بود (بدون آیتم سایدبار جدا — انباردار راه ورود مستقیم به یک PO خاص از داخل اپ ندارد، یادداشت در Backlog). داشبورد: کامپوننت جدید `OperationsStrip` (۳ کارت کلیک‌پذیر: سفارش خرید باز / تجهیزات در تعمیر / وظایف امروزِ ناتمام) از فیلد جدید `operations` در `/api/dashboard/overview`. نسخه `package.json` → `0.9.5-operations`. `SKILL.md` به‌روزرسانی شد (بخش وضعیت ماژول عملیات + migration جدید + یادآوری روال build/commit طبق CLAUDE.md).
(۵) **فاز ۸ (مستندسازی کانال فروش — فقط مستند):** سند تصمیم `project-docs/decision-channel-column.md` ساخته شد — افزودن ستون `channel` (text, nullable) به `transactions`، چرایی (نه `sale_meta`، نه pgEnum)، مقادیر پیشنهادی (`dine_in`/`takeaway`/`delivery_own`/`delivery_app`)، اثر روی کد در فاز پیاده‌سازی آینده، و ۵ سوال باز برای کاربر. **هیچ کد/migration/schema تغییر نکرد** — طبق بریف.
**فایل‌ها (خلاصه):** `app/(app)/equipment/**` (جدید)، `app/(app)/purchase-orders/**` (جدید)، `app/(app)/tasks/page.tsx` (جدید)، `app/api/equipment/**`, `app/api/maintenance/**`, `app/api/purchase-orders/**`, `app/api/task-templates/**`, `app/api/tasks/**` (همه جدید)، `components/dashboard/OperationsStrip.tsx` (جدید) + `components/dashboard/index.ts`، `components/layout/Sidebar.tsx`، `middleware.ts`، `app/(app)/dashboard/page.tsx`، `app/api/dashboard/overview/route.ts`، `store/index.ts` + `store/slices/operationsSlice.ts` (جدید) + `store/slices/tasksSlice.ts` (جدید)، `lib/db/schema.ts`، `lib/db/createExpenseTx.ts` (جدید)، `lib/db/operations.serializers.ts` (جدید)، `types/operations.ts` (جدید) + `types/index.ts`، `lib/auth/audit.ts`، `app/api/transactions/route.ts`، `app/(app)/inventory/page.tsx`، `db-operations-migration.sql` (جدید — equipment/maintenance_logs/purchase_orders/purchase_order_items/task_templates/task_instances + enumها)، `package.json`، `SKILL.md`، `project-docs/decision-channel-column.md` (جدید).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (همه‌ی روت‌های جدید `/tasks`, `/equipment(+/[id])`, `/purchase-orders(+/[id])`, `/api/tasks*`, `/api/task-templates*`, `/api/equipment*`, `/api/purchase-orders*` ساخته شدند). فاز۸ فقط `.md` است — بدون اثر بر build.
**ناتمام:** —
**Commit/Push:** کاربر سناریوهای فاز۶/۷ را تست کرد و تأیید کرد ("تست کردم کار میکنه"). قبل از push از کاربر پرسیده شد که آیا `db-operations-migration.sql` روی DB اجرا شده (چون `/api/dashboard/overview` که در `/dashboard` برای **همه‌ی کاربران** لود می‌شود حالا جدول‌های `equipment`/`purchase_orders`/`task_instances` را هم query می‌کند) — کاربر تأیید کرد **قبلاً اجرا کرده**. commit شد: `f531dcf` ("feat: v0.9.5-operations — equipment, purchase orders, daily tasks (phases 2-8)"، ۴۰ فایل) و `git push origin main` با موفقیت انجام شد (`d0e871c..f531dcf`).
**برای جلسه‌ی بعد:**
۱. بعد از دیپلوی خودکار Vercel (~۲-۳ دقیقه)، `/dashboard` روی production را چک کن (کارت‌های جدید عملیات نباید خطا بدهند — چون migration قبلاً اجرا شده، انتظار می‌رود سالم باشد).
۲. اگر Liara هم به‌عنوان هاست جداگانه استفاده می‌شود، `basharaf-tasks-ops-liara.zip` (≈۱.۱MB، شامل migration) را روی آن دیپلوی کن.
۳. retest باگ قدیمی «خطا در ثبت تجهیزات/سفارش خرید» روی production با کد جدید.
۴. وقتی کاربر آماده بود: پاسخ به ۵ سوال باز `project-docs/decision-channel-column.md` و شروع پیاده‌سازی ستون `channel` (فاز۹).

## 📓 2026-06-12 — تکمیل ماژول انبار (reversal UI، واریانس، exception dashboard، zip) — اکانت ۱
**چه شد:**
(۱) **بخش ۱ (باگ‌ها):** سه چک — هر سه از قبل رفع شده بودند (Pencil+canSeePrices موجود، تایپو `*/` وجود نداشت، import استفاده می‌شد). بدون تغییر کد.
(۲) **بخش ۲ (UI Reversal):** در لیست pending کارتابل، badge «اصلاحی» + خط «مربوط به برگه اصلی» برای voucher هایی که `parentVoucherId != null` دارند. بخش «برگه‌های تأییدشده» با دکمه `RotateCcw` برای SuperAdmin (حداکثر ۳۰ ردیف). State `reversalLoading` + تابع `handleReversal` با مدیریت خطای ۴۰۹.
(۳) **بخش ۳ (Clamp Warning):** تأیید شد — `warnAndLogClamp` در `inventoryWarnings.ts` کامل بود، `issueConfirmed` و `produceConfirmed` درست سیم‌کشی شده بودند.
(۴) **بخش ۴ (Variance API+UI):** `app/api/inventory/reports/variance/route.ts` — مصرف تئوریک (sale) در برابر مصرف واقعی (out+waste+sale)، گروه‌بندی بر اساس itemId با WAC. تب «واریانس» (فقط SuperAdmin) با date range، جدول هایلایت (>500k)، مجموع، و اکسپورت Excel.
(۵) **بخش ۵ (Exception Dashboard):** `app/api/inventory/reports/exceptions/route.ts` — چهار query: pending قدیمی >۴۸h، clamp_warning از audit_log (۷ روز)، زیر minBase، reversal pending. کارت‌های `ExceptionCards` بالای صفحه با polling ۶۰s و رنگ‌بندی (۰→خاکستری، ≤۳→amber، >۳→rose).
(۶) **بخش ۶:** نسخه `9.1.0`→`0.9.4-inv-foundation`، zip ساخته شد.
**فایل‌ها:** `app/(app)/inventory/page.tsx`، `app/api/inventory/reports/variance/route.ts` (جدید)، `app/api/inventory/reports/exceptions/route.ts` (جدید)، `package.json` (نسخه).
**Build:** tsc سبز ✅ (۰ خطا). `npm run build` در این ماشین گیر می‌کند (مشکل محیطی شناخته‌شده).
**ناتمام:** —
**برای جلسه‌ی بعد:** deploy `basharaf-0.9.4-inv-foundation.zip` روی Liara پس از اجرای `db-inventory-reversal.sql`.

---

## 📓 2026-06-11 — رفع ۶ باگ گزارش‌شده (۴۰۱ سراسری، RTL منفی، استخدام→پرسنل، مانده طرف‌حساب، UI موبایل، کارتابل انبار) — اکانت ۲
**چه شد:**
(۱) **۴۰۱ سراسری:** وقتی session منقضی می‌شد، هر slice جدا خطا را catch می‌کرد (معمولاً آرایه خالی) → کاربر صفحه‌ی خالی/صفر می‌دید بدون اطلاع از نیاز به ورود مجدد. فایل جدید `lib/auth/sessionExpiry.ts`: `window.fetch` یک‌بار patch می‌شود؛ هر ۴۰۱ از `/api/*` (به‌جز تلاش لاگین و مسیرهای عمومی `/login,/signup,/forgot,/apply,/m`) → `user=null` + ریدایرکت به `/login`. در `SessionSync.tsx` پیش از `bootstrap()` نصب می‌شود.
(۲) **فرمت اعداد منفی RTL:** ارقام فارسی bidi نوع AN هستند و علامت منفی با آن‌ها ترکیب نمی‌شود → در متن RTL سمت چپ می‌افتاد (مثلاً «۱۰۰-» به‌جای «-۱۰۰»). در `fmt()` (`lib/utils.ts`)، برای مقادیر منفی بلوک «−عدد» بین Left-to-Right Isolate / Pop Directional Isolate (U+2066…U+2069) محصور شد.
(۳) **همگام‌سازی استخدام→پرسنل:** تأیید درخواست استخدام (`status='accepted'`) پرونده‌ی پرسنلی نمی‌ساخت. در `PATCH /api/recruitment/[id]` حالا یک `db.transaction` اجرا می‌شود: اگر برای اولین‌بار به `accepted` تغییر کند (idempotent با چک شماره تلفن در `employees`)، رکورد پرسنلی با نام/تلفن/جنسیت از فرم استخدام و نقش پیش‌فرض بر اساس `area` (`kitchen→cook`, `hall→waiter`, else→`other`) ساخته می‌شود.
(۴) **مانده‌ی طرف‌حساب صفر می‌ماند:** بعد از approve/create/delete تراکنش، موجودی صندوق سرور به‌روز می‌شد ولی لیست طرف‌حساب‌ها (نسیه) در UI رفرش نمی‌شد. `refreshAccounts()` در `store/index.ts` حالا علاوه بر `loadAccounts()`، `loadContacts()` را هم صدا می‌زند. در `transactionsSlice.ts`: بعد از create وقتی تراکنش بلافاصله `approved` است (مسیر ادمین) و بعد از delete یک تراکنش `approved`، `refreshAccounts()` صدا زده می‌شود.
(۵) **سرریز UI موبایل:** در صفحات «حساب‌ها» و «تراکنش‌ها»، هدر و کارت‌های خلاصه با اعداد بزرگ در صفحه‌های باریک سرریز می‌کردند. اضافه شد: `flex-wrap` روی هدرها، `min-w-0`+`truncate` روی کانتینرهای عدد، سایز فونت ریسپانسیو (`text-[14px] sm:text-[18px]`، `text-[22px] sm:text-[28px]`)، و padding صفحه `p-6`→`p-4 lg:p-6`.
(۶) **تعامل عجیب کارتابل انبار:** در «ثبت برگه» (و فرم‌های مشابه)، با هر کلید روی input عددی، رشته دوباره با `toLocaleString('en-US')` فرمت می‌شد؛ چون طول رشته (با اضافه/حذف کاما) عوض می‌شود، مرورگر موقعیت cursor را بر اساس اندیس کاراکتر نگه می‌داشت نه «چندمین رقم» → حین تایپ ارقام وسط عدد می‌پریدند. تابع جدید `formatNumericInputValue()` در `lib/utils.ts` موقعیت cursor را بر اساس تعداد رقم‌های قبل از آن حفظ می‌کند؛ در `app/(app)/inventory/page.tsx` روی ۵ ورودی عددی جایگزین شد (مقدار/بهای واحد در ثبت برگه، قیمت فروش رسپی، مقدار ماده‌ی رسپی، مبلغ کل خرید سریع).

**فایل‌ها:** `lib/auth/sessionExpiry.ts` (جدید)، `components/auth/SessionSync.tsx`، `lib/utils.ts` (+`fmt` RTL، +`formatNumericInputValue`)، `app/api/recruitment/[id]/route.ts`، `store/index.ts`، `store/slices/transactionsSlice.ts`، `app/(app)/accounts/page.tsx`، `app/(app)/transactions/page.tsx`، `app/(app)/inventory/page.tsx`.

**Build:** `npx tsc --noEmit` ✅ ۰ خطا (۲ بار تأیید شد، یک‌بار قبل و یک‌بار بعد از فیکس #۶). `npm run build` ❌ — در این ماشین/محیط، **سه تلاش پشت‌سرهم** (با sandbox + با `NEXT_TELEMETRY_DISABLED`، با sandbox + بدون آن، و کاملاً بدون sandbox) دقیقاً در همان نقطه گیر کردند: فقط بنر `▲ Next.js 14.2.15` چاپ می‌شود و بعد فرآیند برای ده‌ها دقیقه (یک تلاش تا ۴۵ دقیقه صبر شد) با CPU≈۰٪ و RSS ثابت (~۱۱۰MB) بی‌حرکت می‌ماند — `sample` نشان داد همه‌ی threadها روی `psynch_cvwait`/`kevent` idle هستند، بدون هیچ I/O شبکه یا فایل جدید در `.next`. پروژه از `next/font/local` استفاده می‌کند (نه google fonts)، `instrumentation.ts`/`postbuild` hook ندارد، و `.next/cache/webpack/*-production` از یک build قبلیِ موفق هنوز موجود است — یعنی build قبلاً کامل شده بوده. تشخیص: مشکل محیطیِ همین ماشین است، نه از این ۶ فیکس (هیچ‌کدام config/dependency/route جدید اضافه نکردند). **به تأیید صریح کاربر**، commit/push فقط با تأیید tsc انجام شد.

**ناتمام:** تأیید `npm run build` برای این ۶ فیکس — باید روی یک محیط دیگر (ماشین دیگر، یا مستقیماً سرور deploy لیارا/Vercel) انجام شود.

**برای جلسه‌ی بعد:** اول `npm run build` را برای commit فعلی روی محیط دیگری امتحان کن. اگر سبز بود، خیال همه راحت است و می‌توان به Backlog ادامه داد. اگر همان‌جا هم گیر کرد، شک به یک پکیج/نسخه‌ی Node خاص برو (`rm -rf .next node_modules/.cache && npm run build`، یا `next build --debug`). جدا از این، deploy `v9.1.0/basharaf-deploy.zip` روی لیارا هنوز توسط کاربر تست نشده.

---

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
