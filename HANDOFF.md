# HANDOFF.md — دفتر وضعیت زنده‌ی پروژه «با شرف»

> این فایل **دفتر رله‌ی بین دو اکانت Claude Code** است که نوبتی روی همین پوشه کار می‌کنند.
> قانون طلایی: **هر جلسه اول بخش ۰ را بخوان؛ آخر جلسه بخش ۰ + ژورنال را به‌روز کن و commit/push کن.**
> جزئیات تاریخی قدیمی‌تر: `project-docs/handoff-archive.md` (اگر نبود، اولین جلسه بسازد).

---

## ⚡ بخش ۰ — وضعیت لحظه‌ای (اول این را بخوان)

| | |
|---|---|
| **نسخه** | `0.9.9-order-checkout` |
| **آخرین به‌روزرسانی** | 2026-06-14 — اکانت: ۲ |
| **Build/tsc** | tsc سبز ✅ (۰ خطا) — `npm run build` ✅ سبز |
| **دیپلوی** | 🆕 `v0.9.9-order-checkout/basharaf-deploy.zip` + `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` آماده‌ی دیپلوی (ماژول سفارش بیرون‌بر — باکس۲: `/order/checkout` نقدی idempotent + `/order/track/[token]`؛ **migration جدید هنوز روی DB اجرا نشده**، باید قبل از ثبت سفارش اجرا شود). ✅ `v0.9.8-order-public` (باکس۰+۱) دیپلوی شده — کاربر تأیید کرد `/order` داده‌ی واقعی نشان می‌دهد. ✅ `v0.9.7-menu-channel-public/basharaf-deploy.zip` (فاز۱+فاز۲ کانال منو، push شده). zipهای قبلی هنوز دیپلوی نشده: `basharaf-tasks-ops-liara.zip` (شامل `db-operations-migration.sql`)، و `basharaf-0.9.4-inv-foundation.zip` + `db-inventory-reversal.sql`. |
| **کار نیمه‌تمام (in-progress)** | ⚠️ باکس ۲ (`/order/checkout` کامل + idempotent + `/order/track/[token]`) کد/tsc/build کامل و سبز است، ولی `db-ordering-checkout-migration.sql` (ستون‌های `pickup_time`/`client_token` + ایندکس یکتا روی `orders`) هنوز روی DB production اجرا نشده — تا قبل از اجرا `POST /api/public/order/create` خطا می‌دهد و `/order/checkout` نمی‌تواند سفارش ثبت کند. |
| **کار بعدی پیشنهادی** | (۱) کاربر `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` را در pgAdmin اجرا کند، سپس `/order/checkout` تست شود: سفارش ارسال + سفارش پیکاپ ثبت شوند، دوبار زدن دکمه تکراری نسازد، حداقل سفارش اعمال شود، `/order/track/[token]` وضعیت «سفارش ثبت شد» را نشان دهد. (۲) باکس بعدی سرویس سفارش: پرداخت آنلاین + پنل مدیریت سفارش‌ها. (۳) دیپلوی `basharaf-tasks-ops-liara.zip` روی Liara (Backlog #14). (۴) retest باگ قدیمی «خطا در ثبت تجهیزات/سفارش خرید» (Backlog #15). |
| **بلاک‌شده/منتظر کاربر** | ⚠️ اجرای `v0.9.9-order-checkout/db-ordering-checkout-migration.sql` روی pgAdmin قبل از تست `/order/checkout`. |

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

## 📓 2026-06-14 — پکیج دیپلوی نسخه‌ی `v0.9.8-order-public` (ماژول سفارش بیرون‌بر: باکس ۰+۱) — اکانت ۲
**چه شد:** طبق قرارداد انتشار نسخه‌دار، برای کل کار ماژول سفارش بیرون‌بر تا اینجا (باکس ۰: جدول‌ها+تنظیمات+محدوده‌های ارسال، باکس ۱: صفحه‌ی عمومی `/order`) یک نسخه‌ی جدید ساخته شد: `package.json` از `0.9.7-menu-channel-public` به `0.9.8-order-public` ارتقا یافت. پوشه‌ی `v0.9.8-order-public/` ساخته شد شامل `basharaf-deploy.zip` (خروجی `git archive HEAD`، gitignored — فقط روی این دیسک) + کپی `db-ordering-migration.sql` (هنوز روی DB production اجرا نشده — این migration **باید قبل از استفاده از کد جدید روی DB اجرا شود**، هم برای `/orders/settings` هم `/order`).
**فایل‌ها:** `package.json` (نسخه)، `v0.9.8-order-public/db-ordering-migration.sql` (جدید، tracked)، `v0.9.8-order-public/basharaf-deploy.zip` (جدید، gitignored/untracked)، `HANDOFF.md`.
**Build:** بدون تغییر کد منطقی در این جلسه — tsc/build قبلاً در `c6e42ed` سبز تأیید شده بود.
**ناتمام:** —
**برای جلسه‌ی بعد:** کاربر `v0.9.8-order-public/db-ordering-migration.sql` را روی pgAdmin اجرا کند، سپس `v0.9.8-order-public/basharaf-deploy.zip` را روی Liara دیپلوی کند و `/orders/settings` و `/order` را تست کند. بعد از آن سراغ سایر آیتم‌های بخش ۰ (پرداخت/checkout واقعی، Backlog #14/#15، چک کانال منو روی production).

## 📓 2026-06-14 — صفحه‌ی عمومی سفارش /order: مرور منو + سبد (باکس ۱) — اکانت ۲
**چه شد:** صفحه‌ی عمومی `/order` (بدون auth، خارج از middleware محافظت‌شده) ساخته شد — مرحله‌ی «مرور منو + سبد»، هنوز بدون ثبت سفارش/پرداخت. هلپر فقط‌خواندنی جدید `lib/ordering/publicMenu.ts` → `getPublicOrderMenu()`: شعبه = اولین شعبه (`branches[0]` به ترتیب `createdAt`)، تنظیمات از `ord_settings` (اگر ردیف نبود → fallback به مقادیر پیش‌فرض schema، **بدون insert**)، کاتالوگ از `menu_items` با `in_takeaway=true AND is_available=true` + `COALESCE(price_takeaway, price)`، دسته‌بندی از `menu_categories` با حذف دسته‌های بدون آیتم بیرون‌بر. تابع `isWithinOpenHours()` وضعیت باز/بسته‌ی لحظه‌ای را با ساعت تهران (`Asia/Tehran`) محاسبه می‌کند (شامل بازه‌ی گذرنده از نیمه‌شب). API عمومی جدید `GET /api/public/order/menu` (بدون auth، `force-dynamic`) فقط همین داده را برمی‌گرداند — هیچ فیلد پنل/قیمت خام/admin leak ندارد. صفحه‌ی `/order` (client component، دیزاین `components/ui` + پالت stone + Vazirmatn از layout ریشه، هم‌خانواده‌ی `/m`): هدر نام شعبه + Chip باز/بسته + ساعت کاری + حداقل سفارش؛ اگر بسته یا خارج ساعت → بنر قرمز هشدار + قفل دکمه‌های افزایش/کاهش تعداد؛ بخش‌های منو با شمارشگر تعداد per-item؛ سبد در state کلاینت با persist در `localStorage` (`basharaf-order-cart`)، نوار پایین چسبان با تعداد قلم/subtotal/کمبود تا حداقل سفارش/دکمه «ادامه» (غیرفعال تا شعبه باز باشد، سبد خالی نباشد، و حداقل سفارش برسد) → `/order/checkout`. صفحه‌ی placeholder جدید `/order/checkout`.
**فایل‌ها:** `types/ordering.ts` (+`PublicOrderItem/Section/Settings/Menu`)، `lib/ordering/publicMenu.ts` (جدید)، `app/api/public/order/menu/route.ts` (جدید)، `lib/repos/publicOrder.types.ts` + `lib/repos/publicOrder.api.ts` (جدید)، `app/order/layout.tsx` + `app/order/page.tsx` + `app/order/checkout/page.tsx` (جدید).
**Build:** `npx tsc --noEmit` ✅ ۰ خطا. `npm run build` ✅ سبز (`/order` 4.24 kB استاتیک، `/order/checkout` 183B استاتیک، `/api/public/order/menu` دینامیک). smoke-test دستی: `/order` در dev سرور 200 برمی‌گرداند و در غیاب `DATABASE_URL` (محیط sandbox، بدون env) به‌درستی fallback خطا (`Empty`) نشان می‌دهد — همان رفتار سایر روت‌های DB-dependent در این محیط، نه باگ این تغییر.
**ناتمام:** ⚠️ `db-ordering-migration.sql` (از باکس ۰) هنوز روی DB production اجرا نشده — تا قبل از اجرا، `/order` با خطای جدول‌نبودن مواجه می‌شود (چون `getPublicOrderMenu` به `ord_settings`/`menu_items`/`menu_categories` کوئری می‌زند). ثبت سفارش/پرداخت/checkout واقعی هنوز ساخته نشده — فقط placeholder.
**برای جلسه‌ی بعد:** ۱) کاربر `db-ordering-migration.sql` را روی pgAdmin اجرا کند (پیش‌نیاز هم `/orders/settings` هم `/order`)، سپس `/order` با چند سناریو تست شود: شعبه باز/بسته، حداقل سفارش>۰، دسته‌های بدون آیتم بیرون‌بر مخفی. ۲) باکس‌های بعدی سرویس سفارش: ثبت سفارش واقعی + `/order/checkout` (آدرس/منطقه‌ی ارسال از `ord_zones`، روش پرداخت از تنظیمات، ایجاد رکورد `orders`+`order_lines`)، پیگیری سفارش با `track_token`، پنل مدیریت سفارش‌ها. ۳) سایر Backlog (#14 دیپلوی عملیات Liara، #15 retest تجهیزات/سفارش‌خرید، فاز۹ کانال فروش transactions).

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
