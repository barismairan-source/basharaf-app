# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.7-menu-channel-public` |
| **آخرین به‌روزرسانی** | 2026-06-14 — اکانت: ۲ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) — `npm run build` ✅ سبز |
| **دیپلوی** | ✅ `v0.9.7-menu-channel-public/basharaf-deploy.zip` + `v0.9.7-menu-channel-public/db-menu-channel-migration.sql` آماده‌ی دیپلوی (فاز۱+فاز۲ کانال منو سالن/بیرون‌بر؛ migration قبلاً روی DB اجرا شده، `git push origin main` انجام شد — `fdea0a3..fa50941`). zipهای قبلی هنوز دیپلوی نشده: `basharaf-tasks-ops-liara.zip` (شامل `db-operations-migration.sql`)، و `basharaf-0.9.4-inv-foundation.zip` + `db-inventory-reversal.sql`. |
| **کار نیمه‌تمام (in-progress)** | ⚠️ ماژول سفارش بیرون‌بر (باکس ۰ — جدول‌ها + تنظیمات + محدوده‌های ارسال) کامل شد ولی `db-ordering-migration.sql` هنوز روی DB اجرا نشده — تا قبل از اجرا `/orders/settings` خطا می‌دهد. همچنین بعد از دیپلوی خودکار کانال منو باید `/m`، `/m/{takeawaySlug}` و تب QR پنل `/menu` روی production چک شوند. |
| **کار بعدی پیشنهادی** | (۱) کاربر `db-ordering-migration.sql` را در pgAdmin اجرا کند، سپس `/orders/settings` تست شود (لود/ذخیره‌ی تنظیمات + CRUD محدوده‌های ارسال). (۲) بعد از دیپلوی خودکار → چک `/m` (سالن)، `/m/{takeawaySlug}` (بیرون‌بر) و تب QR پنل `/menu` روی production. (۳) دیپلوی `basharaf-tasks-ops-liara.zip` روی Liara (Backlog #14). (۴) retest باگ قدیمی «خطا در ثبت تجهیزات/سفارش خرید» (Backlog #15). (۵) وقتی کاربر آماده بود: فاز۹ — پاسخ به سوالات `project-docs/decision-channel-column.md`. |
| **بلاک‌شده/منتظر کاربر** | ⚠️ اجرای `db-ordering-migration.sql` روی pgAdmin قبل از استفاده‌ی `/orders/settings`. |

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

## 📓 2026-06-14 — ماژول سفارش بیرون‌بر: زیرساخت داده + تنظیمات (باکس ۰) — اکانت ۲
**چه شد:** پایه‌ی ماژول سفارش بیرون‌بر (ارسال+پیکاپ، نقدی+آنلاین، guest checkout) ساخته شد — فقط داده+تنظیمات، بدون UI مشتری. ۵ جدول جدید بدون pgEnum (طبق قرارداد، text+CHECK): `ord_settings` (تنظیمات هر شعبه: باز/بسته، ساعت، ارسال/پیکاپ، روش پرداخت، حداقل سفارش، بافر آماده‌سازی)، `ord_zones` (محدوده‌های ارسال + هزینه)، `orders`، `order_lines`، `order_events` (با CHECK روی service_type/pay_method/pay_status). Migration idempotent `db-ordering-migration.sql` ساخته شد (هنوز روی DB اجرا نشده). repo به الگوی موجود (`lib/repos/ordering.types.ts` + `.api.ts`) + هلپرهای `lib/ordering/settings.ts` + `zones.ts` (شامل ایجاد خودکار ردیف تنظیمات پیش‌فرض با onConflictDoNothing). ۳ روت API (`/api/orders/settings`، `/api/orders/zones`، `/api/orders/zones/[id]`) با RBAC (SuperAdmin همه، BranchUser فقط شعبه‌ی خود). صفحه‌ی جدید `/orders/settings` (فرم تنظیمات شعبه + CRUD محدوده‌های ارسال با فرمت اعداد فارسی) — بدون آیتم سایدبار جدید (طبق دستور).
**فایل‌ها:** `lib/db/schema.ts` (+۵ جدول)، `db-ordering-migration.sql` (جدید)، `lib/db/ordering.serializers.ts` (جدید)، `types/ordering.ts` (جدید) + `types/index.ts`، `lib/repos/ordering.types.ts` + `lib/repos/ordering.api.ts` (جدید)، `lib/ordering/settings.ts` + `lib/ordering/zones.ts` (جدید)، `app/api/orders/settings/route.ts` + `app/api/orders/zones/route.ts` + `app/api/orders/zones/[id]/route.ts` (جدید)، `app/(app)/orders/settings/page.tsx` (جدید).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (روت‌های جدید ساخته شدند: `/api/orders/settings`، `/api/orders/zones`، `/api/orders/zones/[id]`، `/orders/settings` — 4.54 kB).
**ناتمام:** ⚠️ `db-ordering-migration.sql` هنوز روی DB production اجرا نشده — تا قبل از اجرا `/orders/settings` با خطای «جدول وجود ندارد» مواجه می‌شود (چون `getOrdSettings` در اولین فراخوانی سعی می‌کند ردیف پیش‌فرض را در `ord_settings` بسازد). UI مشتری (سفارش‌گیری واقعی) هنوز ساخته نشده — این فقط زیرساخت + تنظیمات است.
**برای جلسه‌ی بعد:** ۱) کاربر `db-ordering-migration.sql` را روی pgAdmin اجرا کند، سپس `/orders/settings` تست شود (لود/ذخیره‌ی تنظیمات + CRUD محدوده‌های ارسال). ۲) سپس باکس‌های بعدی سرویس سفارش (کاتالوگ/UI بیرون‌بر، ثبت سفارش، پیگیری با track_token، پنل مدیریت سفارش‌ها). ۳) سایر آیتم‌های Backlog (#14 دیپلوی عملیات روی Liara، #15 retest تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions).

## 📓 2026-06-14 — push فاز۱+فاز۲ کانال منو + پکیج نسخه‌ی `v0.9.7-menu-channel-public` — اکانت ۲
**چه شد:** کاربر تأیید کرد `db-menu-channel-migration.sql` روی DB production اجرا شده. `git push origin main` انجام شد (دو کامیت محلی فاز۱ `ebdf822` + فاز۲ `fa50941` → `fdea0a3..fa50941`). طبق قرارداد انتشار نسخه‌دار، پوشه‌ی `v0.9.7-menu-channel-public/` ساخته شد: `basharaf-deploy.zip` (خروجی `git archive HEAD`؛ بدون node_modules/.next/.git، چون gitignore هستند) + کپی `db-menu-channel-migration.sql` برای آرشیو (این migration از قبل روی DB اجرا شده — کپی فقط برای کامل‌بودن باندل دیپلوی است).
**فایل‌ها:** `v0.9.7-menu-channel-public/basharaf-deploy.zip` (gitignored، untracked)، `v0.9.7-menu-channel-public/db-menu-channel-migration.sql` (جدید، tracked)، `HANDOFF.md`.
**Build:** بدون تغییر کد در این جلسه — tsc/build قبلاً در همین commitها سبز تأیید شده بود (فاز۲).
**ناتمام:** —
**برای جلسه‌ی بعد:** بعد از دیپلوی خودکار (production)، `/m` (سالن)، `/m/{takeawaySlug}` (بیرون‌بر)، و تب QR پنل `/menu` چک شوند. سپس سایر آیتم‌های Backlog (#14 دیپلوی عملیات روی Liara، #15 retest تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions).

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

> ⬇️ ورودی‌های قدیمی‌تر (integration tests Backlog #5، آدیت امنیتی Backlog #3، account selection، stocktake accounting) به `project-docs/handoff-archive.md` منتقل شدند.

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
