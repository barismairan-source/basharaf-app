# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.41-kitchen-split-phase2` |
| **آخرین به‌روزرسانی** | 2026-06-27 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ سبز · tests ✅ 32/32 |
| **دیپلوی** | ✅ **GitHub Actions فعال** — هر push به main خودکار deploy می‌شود (`basharaff` روی لیارا). 🟡 **۴ migration** در انتظار اجرای دستی در pgAdmin: `db-accounting-v1-migration.sql`، `db-admin-migration.sql`، `db-notifications-v2-migration.sql`، `db-financial-periods-migration.sql`. (migration فاز ۱ آشپزخانه توسط کاربر اجرا شد ✅) |
| **کار نیمه‌تمام (in-progress)** | جداسازی انبار/آشپزخانه — فاز ۲ انجام شد. **منتظر کاربر**: تست با نقش آشپز/انباردار، بعد تصمیم فاز ۳ (موارد مرزی items/variance/sales). |
| **کار بعدی پیشنهادی** | (۱) [بعد از تست کاربر] فاز ۳: تصمیم محصول برای items/variance/sales. (۲) شکاف ۱: sync قیمت. (۳) شکاف ۳: variance. |
| **بلاک‌شده/منتظر کاربر** | تست فاز ۲ + تصمیم فاز ۳ |

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



