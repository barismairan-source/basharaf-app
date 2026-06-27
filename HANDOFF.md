# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.42-prep-page-phase1` |
| **آخرین به‌روزرسانی** | 2026-06-27 — اکانت: ۱ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) · build ✅ سبز · tests ✅ 32/32 |
| **دیپلوی** | ✅ **GitHub Actions فعال** — هر push به main خودکار deploy می‌شود (`basharaff` روی لیارا). 🟡 **۴ migration** در انتظار اجرای دستی در pgAdmin: `db-accounting-v1-migration.sql`، `db-admin-migration.sql`، `db-notifications-v2-migration.sql`، `db-financial-periods-migration.sql`. (اجراشده ✅: فاز۱ آشپزخانه + `db-user-roles-migration.sql` Warehouse/Chef enum) |
| **کار نیمه‌تمام (in-progress)** | جداسازی نیمه‌آماده — فاز ۱ انجام شد (صفحه‌ی جدید prep + کارت hub). items دست‌نخورده (prep موقتاً از هر دو جا مدیریت‌پذیر، عمدی). **منتظر تست کاربر** سپس فاز ۲ (محدودکردن items به raw). |
| **کار بعدی پیشنهادی** | (۱) [بعد از تست] فاز ۲: items فقط raw + حذف منطق prep از items. (۲) شکاف ۱: sync قیمت. (۳) شکاف ۳: variance. |
| **بلاک‌شده/منتظر کاربر** | تست صفحه‌ی نیمه‌آماده + ساخت نیمه‌آماده→رسپی→subLines |

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

## 📓 2026-06-27 — v0.9.42: صفحه‌ی نیمه‌آماده در آشپزخانه (فاز ۱ جداسازی prep) — اکانت ۱
**چه شد:** فاز ۱ افزایشی جداسازی نیمه‌آماده:
(۱) صفحه‌ی جدید `app/(app)/inventory/kitchen/prep/page.tsx` — لیست فقط `kind==='prep'` (فیلتر سمت‌کلاینت، endpoint مشترک `listItems` دست‌نخورده)، ساخت/ویرایش با همان mini-builder شکاف ۴ (batchYieldBase + prepRecipe + تشخیص حلقه BFS). در builder هم raw و هم prep قابل انتخاب‌اند (آشپز از مواد خام می‌سازد). گارد صفحه `canAccessSection(user,'kitchen')`؛ ساخت/ویرایش/حذف با `canManage = canAccessSection(kitchen)` (آشپز + مدیرکل، نه فقط SuperAdmin مثل items).
(۲) کارت سوم «نیمه‌آماده‌ها» (آیکون Soup) به hub آشپزخانه اضافه شد، کنار دستور پخت و برنامه تولید. import بلااستفاده‌ی `Card` هم پاک شد.
(۳) `/inventory/items` **اصلاً دست‌نخورد** — prep موقتاً از هر دو جا مدیریت‌پذیر است (عمدی برای تست). فاز ۲: محدودکردن items به raw.
مسیر `/inventory/kitchen/prep` خودکار زیر بخش kitchen می‌افتد (sectionForPath دست‌نخورده) و آیتم nav «آشپزخانه» روی آن highlight می‌شود.
**فایل‌ها:** `app/(app)/inventory/kitchen/prep/page.tsx` (جدید)، `app/(app)/inventory/kitchen/page.tsx`، `HANDOFF.md`.
**Build:** tsc ✅ ۰ خطا · build ✅ (route /inventory/kitchen/prep ساخته شد) · tests ✅ 32/32
**ناتمام:** فاز ۲ (items فقط raw) — منتظر تست کاربر.
**برای جلسه‌ی بعد:** بعد از تأیید تست → فاز ۲: فیلتر items به raw + حذف toggle/prep-builder/wouldCreateCycle از items page.

## 📓 2026-06-27 — بررسی جداسازی نیمه‌آماده از انبار (بدون تغییر کد) — اکانت ۱
**چه شد:** فاز ۲ جداسازی توسط کاربر تست شد و درست کار کرد (آشپز فقط آشپزخانه، انباردار فقط انبار) — یعنی `db-user-roles-migration.sql` هم اجرا شد. سپس بررسی کامل برای انتقال نیمه‌آماده (`kind='prep'`) از صفحه‌ی اقلام انبار به یک صفحه‌ی مستقل زیر آشپزخانه نوشته شد. یافته‌های کلیدی: (۱) endpoint مشترک `listItems()` را ۵+ مصرف‌کننده (stocktake/receive/recipes/cartable/PO) به‌صورت کامل لازم دارند → فیلتر باید سمت‌کلاینت باشد نه سرور. (۲) نقطه‌ی ظریف permission حل است: GET items برای هر session باز است، پس Chef مواد خام را برای builder می‌بیند؛ POST هم گیت SuperAdmin سمت‌سرور ندارد. (۳) مسیر `/inventory/kitchen/prep` خودکار زیر بخش kitchen می‌افتد (sectionForPath دست‌نخورده). نقشه‌ی ۳ فازی: فاز۱ صفحه‌ی جدید (افزایشی)، فاز۲ محدودکردن items به raw، فاز۳ پولیش.
**فایل‌ها:** `project-docs/INVESTIGATION-prep-item-separation.md` (ایجاد)، `HANDOFF.md`. هیچ کد اجرایی تغییر نکرد.
**Build:** بدون تغییر کد — tsc/build/tests دست‌نخورده ✅ 32/32.
**ناتمام:** منتظر تأیید کاربر برای پیاده‌سازی فاز ۱.
**برای جلسه‌ی بعد:** بعد از تأیید → فاز ۱: ساخت `app/(app)/inventory/kitchen/prep/page.tsx` + کارت hub، بدون دست‌زدن به items.

## 📓 2026-06-27 — رفع باگ ۵۰۰ ساخت کاربر Chef/Warehouse (migration enum) — اکانت ۱
**چه شد:** بعد از فاز ۲، ساخت کاربر Chef خطای ۵۰۰ «خطای داخلی سرور» می‌داد. علت‌یابی: **باگ کد نبود** — enum واقعی Postgres `user_role` فقط `('SuperAdmin','BranchUser')` دارد (drizzle 0000). نقش‌های Warehouse/Chef در schema.ts (TS) هستند ولی هرگز به enum دیتابیس اضافه نشدند (`db-chef-role-migration.sql` در project-docs اجرا نشده بود؛ برای Warehouse اصلاً migration وجود نداشت). insert با role='Chef' خطای `invalid input value for enum` می‌دهد که در `api-error.ts` به ۵۰۰ عام می‌افتد. فاز ۲ فقط نقش‌ها را معنادار کرد و باگ نهفته را رو کرد.
**راه‌حل:** فایل `db-user-roles-migration.sql` ساخته شد — `ALTER TYPE user_role ADD VALUE IF NOT EXISTS` برای هر دو Warehouse و Chef. idempotent. **اجرا نشد — منتظر کاربر در pgAdmin (خارج از transaction، هر دستور جدا).** هیچ کدی تغییر نکرد.
**فایل‌ها:** `db-user-roles-migration.sql` (جدید)، `HANDOFF.md`.
**Build:** بدون تغییر کد — tsc/build/tests دست‌نخورده ✅ 32/32.
**ناتمام:** اجرای migration توسط کاربر، سپس تست نقش‌ها.
**برای جلسه‌ی بعد:** بعد از تأیید تست نقش‌ها → فاز ۳.

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
