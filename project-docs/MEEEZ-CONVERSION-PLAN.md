# برنامهٔ تبدیل basharaf-app به «میز» (Meeez) — گام ۰

> وضعیت: پیش‌نویس برای تأیید علی · 2026-10-17 · در این نشست هیچ کد، migration یا داده‌ای تغییر نکرده است.
> پس از تأیید، در `project-docs/MEEEZ-CONVERSION-PLAN.md` ذخیره می‌شود. commit فقط با اجازهٔ علی.

## Context: چرا این کار را می‌کنیم

نرم‌افزاری که الان «با شرف» نام دارد، محصول «میز» (meeez.me) می‌شود. با‌شرف اولین مشتری است و با لایسنس از آن استفاده می‌کند.
هر مشتری زیردامنهٔ خودش (`{slug}.meeez.me`) و دادهٔ کاملاً جدا دارد. لایسنس یعنی اشتراک فعال.
امروز دیتابیس هیچ مفهومی از «مجموعه/مشتری» ندارد. هر ۸۰ جدول فرض می‌کنند فقط یک رستوران وجود دارد: تنظیمات تک‌ردیفی (`id=1`) و کلیدهای یکتای سراسری مثل `coupons.code`.

**خلاصهٔ ساده برای علی:**
1. اول به همهٔ داده‌ها یک «شناسنامهٔ مجموعه» اضافه می‌کنیم و همه را به نام با‌شرف ثبت می‌کنیم. هیچ تغییری دیده نمی‌شود.
2. بعد یک قفل در خود دیتابیس می‌گذاریم که هر مجموعه فقط دادهٔ خودش را ببیند، حتی اگر جایی از کد اشتباه کند.
3. بعد اسم و لوگو را از کد بیرون می‌آوریم و به تنظیمات هر مجموعه می‌بریم.
4. زیردامنه‌ها را راه می‌اندازیم و لایسنس را اضافه می‌کنیم.
5. در آخر با‌شرف را به `basharaf.meeez.me` منتقل می‌کنیم.

هر مرحله جدا دیپلوی می‌شود، برگشت‌پذیر است و رستوران‌ها در تمام مسیر بدون وقفه کار می‌کنند.

---

## ۰. وضعیت فعلی ریپو (پروتکل شروع جلسه)

- **`main` با `origin/main` یکی است (`6639851`، بازطراحی استخدام).** بخش ۰ HANDOFF هنوز می‌گوید «push نشده»، ولی git نشان می‌دهد push شده است. چون push روی main یعنی دیپلوی خودکار، احتمالاً روی Liara هم رفته. علی باید تأیید کند و بخش ۰ باید اصلاح شود.
- **تغییرات commit‌نشده از نشست‌های دیگر (دست نخوردند):**
  - فایل‌های تغییرکرده: `.env.example` (متغیرهای Recipe Studio) و `project-docs/migrations/db-hr-job-titles.sql`.
  - فایل‌های جدید:
    - کد Recipe Studio: `app/studio/`، `app/api/recipe-studio/`، `lib/recipe-studio/`.
    - migrationهای Recipe Studio در `project-docs/migrations/recipe-studio/`. این‌ها اسکیمای جدای `recipe_studio` با ۱۸ جدول و نقش محدود `recipe_studio_app` می‌سازند.
    - دو SQL منو: `db-menu-autumn-1405-content.sql` و `db-menu-restore-aioli-sandwich.sql`.
    - بقیه: `logo/`، `CURRENT_STATE_REPORT.md`، `RECIPE_STUDIO_PLAN.md`.
- **کارهای منتظر علی طبق HANDOFF:**
  - دو migration رزرو.
  - `db-inventory-resync-physical.sql` و `db-transactions-indexes.sql`.
  - تصمیم B5.
  - تصمیم دربارهٔ استودیوی رسپی.
- **پیش‌شرط فاز ۱:** این کارهای نیمه‌تمام باید تعیین تکلیف شوند (commit یا کنار گذاشته شوند). تبدیل روی درخت کاری کثیف شروع نمی‌شود.

---

## ۱. فهرست جدول‌ها (`lib/db/schema.ts`: ۸۰ جدول، همه در `public`)

**تصمیم: هر ۸۰ جدول ستون `organization_id uuid NOT NULL` می‌گیرند، حتی جدول‌های فرزند.** سه دلیل:
- قفل RLS روی هر جدول یک شرط ساده و سریع می‌شود و join لازم ندارد.
- تست نشت داده برای همهٔ جدول‌ها یکسان است.
- گزارش‌هایی که مستقیم روی جدول‌های فرزند کوئری می‌زنند (مثل `inv_stock_tx` و `order_lines`) هم محافظت می‌شوند.

فرق دو دستهٔ زیر فقط در این است که مقدار ستون از کجا می‌آید.

**الف) جدول‌هایی که مستقیم به مجموعه تعلق دارند (۵۷ جدول).** مقدار org از کانتکست درخواست پر می‌شود:
`branches, users, categories, transactions, notifications, app_settings, notification_rules, audit_log,
partners, accounts, contacts, job_applications, form_sections, menu_categories, menu_settings, menu_seasons,
link_hub_items, link_hub_settings, recipe_categories, ingredient_tags, receipts, system_logs, employees,
payroll_parameters, payroll_runs, journal_vouchers, shift_templates, employee_shift_assignments,
attendance_entries, job_titles, inv_items, inv_recipes, inv_vouchers, inv_daily_sales, customers,
loyalty_entries, coupons, coupon_redemptions, tables, table_blocks, reservations, reservation_settings,
feedback, purchase_orders, equipment, task_templates, task_instances, ord_settings, ord_zones,
web_customers, web_customer_otp, orders, financial_periods, cheques, sms_log, anomaly_findings, anomaly_rules`

۳۱ جدول ستون `branch_id` دارند، ولی در خیلی از آن‌ها این ستون می‌تواند خالی باشد (مثلاً حساب‌های دفتر مرکزی، شریک دفتر مرکزی، تنظیمات کل مجموعه).
پس org را نمی‌شود از شعبه استنتاج کرد و ستون مستقیم لازم است.

**ب) جدول‌های فرزند (۲۳ جدول).** org هر ردیف باید با ردیف والدش یکی باشد. این را FK مرکب `(organization_id, parent_id) → parent(organization_id, id)` تضمین می‌کند:
`notification_rule_targets→notification_rules, notification_outbox→notifications, push_subscriptions→users,
partner_branches→partners, form_fields→form_sections, form_field_options→form_fields,
form_field_conditions→form_fields, menu_items→menu_categories, recipes→recipe_categories,
recipe_ingredients→recipes, employee_documents→employees, payroll_events→employees, payslips→payroll_runs,
employee_hourly_rates→employees, employee_compensation_type_changes→employees, inv_recipe_lines→inv_recipes,
inv_voucher_lines→inv_vouchers, inv_stock_tx→inv_items, purchase_order_items→purchase_orders,
maintenance_logs→equipment, web_customer_addresses→web_customers, order_lines→orders, order_events→orders`

**ج) جدول‌های سراسری/پلتفرم: امروز صفر.** جدول‌های تازهٔ پلتفرم RLS مجموعه ندارند و فقط نقش پلتفرم به آن‌ها دسترسی دارد:

| جدول | چه نگه می‌دارد |
|---|---|
| `organizations` | `slug`، نام، وضعیت، برند (`jsonb`) |
| `organization_domains` | زیردامنه، دامنهٔ قدیمی `basharaf.me`، دامنهٔ اختصاصی در آینده |
| `plans` | تعریف پلن‌ها |
| `subscriptions` | پلن، شروع، انقضا، مهلت، ماژول‌ها، سقف شعبه و کاربر |
| `subscription_events` | دفتر تمدید و تعلیق |
| `platform_admins` | مدیران پلتفرم |
| `platform_audit_log` | لاگ کارهای پلتفرم |

**خارج از دامنه:** اسکیمای `recipe_studio.*` (۱۸ جدول، اپ جدا، هنوز commit نشده). دربارهٔ آن جداگانه تصمیم می‌گیریم (سؤال ۷).

**کلیدهای یکتایی که باید «در هر مجموعه» یکتا شوند.** برای هرکدام اول index مرکب جدید با `CONCURRENTLY` ساخته می‌شود، بعد index قدیمی حذف می‌شود:
- `users.email`
- `form_sections.key`، `form_fields.key`
- `menu_categories.slug`، `recipe_categories.slug`، `recipes.slug`، `ingredient_tags.name`
- در `employees`: `employees_national_id_uniq`، `employees_source_application_uniq`، `employees_user_id_uniq`
- `payroll_parameters.jalali_year`، `journal_vouchers.idempotency_key`، `job_titles_code_uniq`
- `customers_phone_uniq`، `web_customers_phone_uniq`، `coupons_code_uniq`
- `reservations_tracking_code_uniq`، `reservations_idempotency_key_uniq`
- `orders_order_no_uidx`، `fp_year_month_uidx`، `notification_outbox.dedupe_key`
- indexهای `(branch_id, code/no)` در `inv_items`، `inv_recipes`، `inv_vouchers`، `purchase_orders` و `equipment`، چون `branch_id` می‌تواند خالی باشد.

جدول‌های تک‌ردیفی:
- PK جدول `app_settings` از `key` به `(organization_id, key)` تغییر می‌کند.
- در `menu_settings` و `link_hub_settings` (هر دو امروز `id=1`) ستون `organization_id` یکتا می‌شود.

این‌ها توکن تصادفی‌اند و سراسری می‌مانند: `orders.track_token`، `orders.client_token`، `push_subscriptions.endpoint`.

---

## ۲. دسترسی به داده: جداسازی چطور اجبار می‌شود

**وضع امروز:**
- یک `db` سراسری (یک Proxy در `lib/db/client.ts`) در ۲۳۶ فایل import شده است: ۱۷۶ تا از ۲۲۶ route در `app/api`، ۵۵ فایل در `lib`، ۱ صفحه و ۴ تست.
- server action وجود ندارد.
- `lib/repos/*` فقط wrapper سمت کلاینت برای fetch است و به دیتابیس دسترسی ندارد.
- محدودیت شعبه دستی است و در هر route جدا نوشته شده: `branchScope()` در ۱۳ route، `session.branchId` در ۴۸ route.

**مکانیزم انتخابی: هر دو، با نقش‌های روشن.**
- **قفل Postgres RLS ضمانت اصلی است.**
- **لایهٔ کانتکست مجموعه** این قفل را برای هر درخواست تنظیم می‌کند.

**چرا اضافه‌کردن فیلتر `WHERE organization_id` دستی در ۲۲۶ route کافی نیست:** امروز هم محدودیت شعبه همین‌طور دستی نوشته شده و در ۴۸ جای مختلف تکرار شده است. با این روش، یک فیلتر جاافتاده یعنی نشت دادهٔ یک رستوران به رستوران دیگر.
با RLS، حتی کوئری‌ای که فیلتر ندارد هم فقط ردیف‌های همان مجموعه را می‌بیند، و ستون با DEFAULT خودکار پر می‌شود. پس بیشتر کدِ موجود اصلاً تغییر نمی‌کند.

**طراحی:**

1. **لایهٔ کانتکست در `lib/tenant/` (فایل جدید).**
   - یک `AsyncLocalStorage<{ orgId, conn }>` شناسهٔ مجموعهٔ درخواست جاری را نگه می‌دارد.
   - تابع `withOrg(orgId, fn)` قبل از اجرای `fn` روی اتصال درخواست `set_config('app.org_id', orgId)` می‌زند.
   - **`db` در `lib/db/client.ts` همان Proxy موجود است.** فقط اگر کانتکست وجود داشته باشد، کوئری را به اتصالِ همان مجموعه می‌فرستد. پس کد فعلی مثل `db.select()…` و `db.transaction()` بدون تغییر کار می‌کند.
   - **نحوهٔ اجرا در یک spike کوتاه در فاز ۳ قطعی می‌شود:**
     - گزینهٔ ترجیحی: اتصال رزروشده (`sql.reserve()`) همراه `set_config` در سطح session. این‌طور معنای فعلی کوئری‌ها (هر دستور جداگانه commit می‌شود) حفظ می‌شود.
     - جایگزین: یک تراکنش برای کل درخواست با `set_config(..., true)`.
     - ریسک گزینهٔ جایگزین: کدی که خطای یک insert را catch می‌کند و ادامه می‌دهد، داخل تراکنش با «current transaction is aborted» می‌شکند.
     - در هر دو گزینه، هر درخواست اول از همه مقدار org را خودش set می‌کند و در `finally` آن را `RESET` می‌کند. اگر reset شکست بخورد، اتصال دور ریخته می‌شود.
     - pool از ۱۰ اتصال به حدود ۲۰ می‌رسد. سقف اتصال پلن Liara باید بررسی شود.
2. **همهٔ route‌ها داخل یک wrapper قرار می‌گیرند** (codemod مکانیکی روی ۲۲۶ فایل):

   | wrapper | کاربرد | org از کجا می‌آید |
   |---|---|---|
   | `staffRoute(handler)` | پنل کارکنان | توکن JWT (باید با زیردامنه برابر باشد) |
   | `customerRoute` | مشتری واردشده | توکن مشتری (باید با زیردامنه برابر باشد) |
   | `publicRoute` | ۲۴ route بی‌احراز | زیردامنه |
   | `internalRoute` | پردازش‌گر اعلان‌ها با secret | — |
   | `platformRoute` | پنل پلتفرم | — |

   - یک تست ایستا تضمین می‌کند هر export داخل `app/api/**/route.ts` داخل یکی از این wrapperها باشد.
   - wrapperها چک‌های فعلی (`requireSession` و بقیه) را حذف نمی‌کنند. فقط کانتکست org را قبل از آن‌ها می‌سازند.
3. **قفل RLS.** برای هر جدول:
   ```sql
   ENABLE ROW LEVEL SECURITY;
   FORCE ROW LEVEL SECURITY;
   CREATE POLICY ... USING (organization_id = nullif(current_setting('app.org_id', true), '')::uuid)
                     WITH CHECK (organization_id = nullif(current_setting('app.org_id', true), '')::uuid);
   ```
   - **اگر org تنظیم نشده باشد، نتیجه صفر ردیف است.** یعنی پیش‌فرض بسته است، نه باز.
   - **مقدار پیش‌فرض ستون:** `DEFAULT nullif(current_setting('app.org_id', true), '')::uuid`. با این، insertها خودکار org درست را می‌گیرند.
   - **اپ با نقش جدید `meeez_app` وصل می‌شود.** این نقش superuser نیست، `BYPASSRLS` ندارد، مالک جدول‌ها نیست و اجازهٔ `TRUNCATE` ندارد. الگوی ساخت نقش محدود از قبل در `recipe-studio/002-recipe-studio-role.sql` آماده است.
   - **پنل پلتفرم و پردازش‌گرها با نقش جدای `meeez_platform` کار می‌کنند** که `BYPASSRLS` دارد و connection string مخصوص خودش را دارد (`DATABASE_URL_PLATFORM`). فقط `lib/platform/*` اجازهٔ import آن را دارد و یک قاعدهٔ lint این را کنترل می‌کند.
   - **نقطه‌های کور RLS که جدا بسته می‌شوند:**
     - `TRUNCATE` از RLS عبور می‌کند. `app/api/settings/wipe/route.ts` (ریست کارخانه) امروز ۲۱ جدول را با `TRUNCATE … CASCADE` پاک می‌کند و در حالت چندمشتری همهٔ مجموعه‌ها را پاک می‌کرد. این route به `DELETE` در محدودهٔ مجموعه تبدیل می‌شود.
     - FK و قید یکتا RLS را نادیده می‌گیرند. جواب: FK مرکب و یکتای مرکب.
     - توابع `SECURITY DEFINER` امروز وجود ندارند و بعداً هم ممنوع می‌شوند.
4. **مسیرهای خاص:**
   - **کوئری‌های raw** (۴ مورد `.execute` در ۲ فایل) خودکار زیر RLS هستند. شمارش‌های سراسری `admin/notification-outbox` محدود به مجموعه می‌شوند.
   - **صفحه‌های عمومی:** org از زیردامنه می‌آید. توکن‌هایی مثل `/r/{id}`، `/order/track` و رزرو فقط داخل همان مجموعه پیدا می‌شوند، پس لینک با‌شرف روی زیردامنهٔ مجموعهٔ دیگر 404 می‌دهد.
     - `getDefaultBranch()` در `lib/ordering/publicMenu.ts` (قدیمی‌ترین شعبه) قدیمی‌ترین شعبهٔ همان مجموعه را برمی‌گرداند.
     - `/m` و `/safasity` جدول تک‌ردیفی همان مجموعه را می‌خوانند.
     - شماره کارت و شبای hard-code در `/pay` (`app/pay/PayCard.tsx`) به تنظیمات مجموعه منتقل می‌شود.
   - **پردازش‌گر اعلان‌ها:** `instrumentation.ts` هر ۶۰ ثانیه، و `POST /api/internal/notifications/process` (با `NOTIFICATION_PROCESSOR_SECRET`).
     - نقش پلتفرم ردیف‌ها را با `FOR UPDATE SKIP LOCKED` برمی‌دارد.
     - هر ردیف داخل `withOrg(row.organization_id)` پردازش می‌شود، چون تنظیمات `sms.*` و قالب‌ها مخصوص هر مجموعه‌اند.
   - **Realtime:**
     - `lib/realtime` از Supabase `postgres_changes` استفاده می‌کند. اشتراک روی `transactions` و `orders` هیچ فیلتری ندارد، و همان کلید anon به مرورگر داده می‌شود.
     - چون دیتابیس روی Liara است، باید بررسی شود که اصلاً کار می‌کند یا نه.
     - پیشنهاد: حذف شود و با polling سمت سرور جایگزین شود که زیر RLS محدود به مجموعه است.
   - **فایل‌ها (Supabase Storage):**
     - کلید فایل‌ها امروز: `receipts` به شکل `${userId}/${txId}/…` و `resumes` به شکل `${folder}/…`.
     - فایل‌های جدید پیشوند `{orgId}/` می‌گیرند. فایل‌های قدیمی همان‌جا می‌مانند، چون آدرسشان در DB ذخیره شده است.
5. **تست‌های خودکار نشت داده** (پایه‌شان `tests/integration/helpers/`: `createFixtures`، `startServer`، `login`):
   - **(الف) تست کاتالوگ:** روی `pg_class` و `pg_policies` چک می‌کند که هر جدول در `public` این‌ها را دارد: `organization_id NOT NULL`، RLS فعال و FORCE، policy درست. جدول جدیدی که این‌ها را نداشته باشد، CI را قرمز می‌کند.
   - **(ب) تست دو مجموعه:**
     - دو مجموعهٔ A و B ساخته می‌شوند و هرکدام برای همهٔ ۸۰ جدول حداقل یک ردیف می‌گیرند (factory).
     - با کاربر A روی `a.localhost` همهٔ routeهای فهرست‌شده صدا زده می‌شوند. فهرست routeها خودکار از اسکن `app/api` ساخته می‌شود.
     - شرط قبولی: هیچ id یا متن نشانه‌گذاری‌شدهٔ B در پاسخ‌ها نباشد، و هر تغییر روی idهای B جواب 404 یا 403 بگیرد.
   - **(ج)** توکن A روی زیردامنهٔ B جواب 401 بگیرد. توکن مشتری A هم همین‌طور.
   - **(د)** هر route داخل wrapper باشد (تست ایستا).
   - **(هـ)** در حالت strict، `db` بدون کانتکست خطا بدهد.
   - **(و)** کارهای پس‌زمینه: ردیف outbox مجموعهٔ B با تنظیمات SMS مجموعهٔ B ارسال شود.
   - این تست‌ها در GitHub Actions روی یک Postgres service اجرا می‌شوند (`.github/workflows/liara.yml`)، قبل از دیپلوی.

---

## ۳. تشخیص مجموعه از زیردامنه

- **`middleware.ts` (Edge):**
  - از Host، `slug` را بیرون می‌کشد: `{slug}.meeez.me`.
  - نام‌های رزروشده: `www`، `app`، `admin`، `platform`، `api`، `static`، `mail`.
  - در دورهٔ گذار `basharaf.me` و `www.basharaf.me` به slug `basharaf` نگاشت می‌شوند.
  - هدر `x-meeez-org-slug` را روی درخواست می‌گذارد و نسخهٔ جعلی‌ای را که از بیرون فرستاده شده پاک می‌کند.
  - matcher امروز `/api` را کاملاً مستثنا کرده است. یک شاخهٔ سبک فقط برای گذاشتن هدر به آن اضافه می‌شود و منطق احراز `/api` دست نمی‌خورد.
  - دامنهٔ اصلی `meeez.me` به این اپ نمی‌آید (اپ جدای `/Users/ali/meeez` است).
- **سمت Node:** `resolveOrg(slug)` با کش ۳۰ ثانیه‌ای، ردیف org و وضعیت اشتراکش را برمی‌گرداند. slug ناشناخته صفحهٔ «مجموعه پیدا نشد» نشان می‌دهد. چک‌های صفحه در middleware از همان الگوی موجود `fetchFreshAccess` (fetch داخلی با revalidate) استفاده می‌کنند.
- **محیط توسعهٔ محلی:**
  - `basharaf.localhost:3000` و `demo.localhost:3000` (`*.localhost` در مرورگرهای جدید خودکار به 127.0.0.1 می‌رود).
  - برای `localhost` ساده و Playwright، متغیر `DEV_DEFAULT_ORG_SLUG=basharaf` به کار می‌رود. این متغیر در production نادیده گرفته می‌شود.
- **احراز هویت کارکنان:**
  - `users.organization_id`: هر کاربر عضو یک مجموعه است. اگر یک نفر در دو مجموعه کار کند، دو حساب جدا دارد.
  - ورود فقط در زیردامنهٔ همان مجموعه انجام می‌شود و کاربر با `(org, email)` پیدا می‌شود.
  - JWT ادعای `org` می‌گیرد (`lib/auth/jwt.ts`).
  - `getServerSession` و `/api/auth/permissions` شرط `token.org === hostOrg` و `users.organization_id` را هم چک می‌کنند.
  - توکن‌های قدیمیِ بدون `org` در دورهٔ گذار «با‌شرف» حساب می‌شوند.
  - کوکی‌ها host-only هستند (بدون `Domain`)، پس هر زیردامنه کوکی خودش را دارد.
  - تغییر نام `basharaf-session`/`basharaf-imp`/`basharaf-customer` به `meeez-*` با خواندن هر دو نام در دورهٔ گذار.
- **جعل هویت (impersonation):** فقط داخل همان مجموعه ممکن است.
- **مشتریان سایت:**
  - `web_customers` و OTP مخصوص هر مجموعه‌اند: یک شماره در دو رستوران یعنی دو حساب.
  - JWT مشتری ادعای `org` می‌گیرد.
  - متن OTP نام همان مجموعه را دارد.
- **سوپرادمین پلتفرم:**
  - جدول جدای `platform_admins` و کوکی جدای `meeez-platform`، فقط روی `platform.meeez.me`.
  - TOTP (رمز دوم) اجباری و همهٔ کارها در `platform_audit_log` ثبت می‌شود.
  - «ورود پشتیبانی» به یک مجموعه محدود به زمان است، بنر دارد و ثبت می‌شود.
  - نقش فعلی `SuperAdmin` داخل مجموعه می‌ماند (مقدار DB تغییر نمی‌کند، چون تغییر enum پرریسک است) و فقط با عنوان «مدیر کل مجموعه» نمایش داده می‌شود.

---

## ۴. برند

**تعداد فایل‌ها:** نام‌های Basharaf/با شرف/Safasity/صفاسیتی در **۱۳۲ فایل** آمده‌اند:

| دسته | تعداد |
|---|---|
| کد و تنظیمات و asset (`app`، `components`، `lib`، `store`، `types`، `scripts`، `public`، تنظیمات) | ۷۶ |
| `project-docs` | ۳۸ |
| md ریشه | ۷ |
| تست | ۵ |
| drizzle | ۲ |
| سایر (از جمله `tsconfig.tsbuildinfo`) | ۴ |

عدد «۶۵ فایل» در نقشهٔ meeez تقریباً همان کد بدون مستندات است.

**۱) برند محصول = «میز».** این‌ها نام و لوگوی میز می‌گیرند:
- صفحهٔ ورود و `app/page.tsx`.
- metadata در `app/layout.tsx` (`metadataBase` امروز `https://basharaf.me` است).
- `public/manifest.json` (که به `app/manifest.ts` پویا تبدیل می‌شود).
- `public/sw-push.js`.
- پانویس ایمیل در `lib/notifications/templates.ts`.
- «تولیدشده از سامانه» در `lib/transactions/printInvoice.ts`.
- `components/ui/BrandMark.tsx`.
- `components/layout/Sidebar.tsx:160`: «میز» به‌همراه نام مجموعه.

**۲) برند هر مجموعه** در `organizations.brand` (jsonb که با zod اعتبارسنجی می‌شود):
- نام فارسی و انگلیسی.
- لوگو و wordmark (روشن و تیره).
- آیکن اپ و favicon.
- رنگ‌ها: `primary`، `accent`، `background`، `foreground`، `card`، `gold`، `burgundy`. این همان متغیرهایی است که `safasity.css` امروز override می‌کند.
- فونت‌ها: انتخاب از فهرست فونت‌های موجود (Vazirmatn، Haiku-Ravan، StiffBallpoint، IRANMarker، NeveshtFaNum، Hasti و بقیه). `next/font/local` فایل را در زمان build می‌خواهد، پس آپلود فونت دلخواه بعداً با `@font-face` از storage اضافه می‌شود.
- اطلاعات پرداخت `/pay` (کارت و شبا).
- امضای پیامک.

اطلاعات تماس فعلی در `menu_settings` و `link_hub_settings` می‌ماند، که حالا مخصوص هر مجموعه است.
کلید `app_settings.brand.name` امروز ویرایش می‌شود ولی هیچ‌جا خوانده نمی‌شود. به `organizations.brand` منتقل می‌شود.

**۳) تبدیل تم صفاسیتی به تم هر مجموعه.** امروز تم فقط از طریق layoutها پخش می‌شود:
- `components/safasity/SafasityTheme.tsx` (با `next/font/local` و افزودن کلاس به `body`) این layoutها را می‌پوشاند: `app/safasity`، `app/m`، `app/reserve`، `app/order`، `app/apply`.
- `app/safasity/safasity.css` متغیرهای shadcn را دوباره تعریف می‌کند و حدود ۴۰ کلاس Tailwind را با hex ثابت override می‌کند.
- `app/m/menu.css` همان پالت را تکرار می‌کند.

مراحل تبدیل:
- **مرحلهٔ ۱:** hexهای ثابت به `var(--…)` تبدیل می‌شوند. ظاهر هیچ تغییری نمی‌کند و با مقایسهٔ اسکرین‌شات Playwright قبل و بعد تأیید می‌شود.
- **مرحلهٔ ۲:** مقادیر فعلی به یک preset به نام «safasity» منتقل می‌شوند.
- **مرحلهٔ ۳:** `SafasityTheme` به `OrgTheme` تبدیل می‌شود: یک server component که برند مجموعه را می‌خواند، یک `<style>` با متغیرهای `.org-root` تزریق می‌کند و کلاس فونت را از preset برمی‌دارد.
- **مسیرها:** `/safasity` به `/hub` تبدیل می‌شود (لینک‌هاب عمومی مجموعه). `/safasity` و `/safasity/menu/*` برای مجموعهٔ با‌شرف به‌عنوان alias دائمی می‌مانند، چون QR کدهای چاپ‌شده به آن‌ها اشاره می‌کنند.
- **پنل کارکنان:** رنگ accent پیش‌فرض از برند مجموعه می‌آید (`components/ui/ThemeProvider.tsx` امروز فقط ترجیح هر کاربر را دارد).

**۴) شناسه‌های فنی** (با احتیاط، چون تغییرشان کاربران را logout می‌کند):
- کوکی‌ها: دو نام با هم خوانده می‌شوند.
- کلیدهای localStorage: `basharaf-app-store`، `basharaf-order-cart`، `basharaf-logout-signal`.
- متغیرهای سراسری `__basharaf_*`.
- ستون‌های `basharaf_voucher_id` و `posted_to_basharaf_at` و فایل `lib/payroll/postToBasharaf.ts`: اختیاری و دیرتر، با rename ستون.
- نام فایل‌های خروجی `basharaf-*.csv/xlsx`.
- `package.json` (`basharaf-app` به `meeez`).

**۵) فوری (امنیتی):** رمز پیش‌فرض `'basharaf123'` در `lib/repos/api.ts:209` حذف شود.

---

## ۵. لایسنس/اشتراک

- **`subscriptions` به ازای هر مجموعه:**
  - `plan_code`
  - `status`: یکی از `trial | active | grace | readonly | suspended | cancelled`
  - `starts_at` و `expires_at`: timestamptz، با نمایش جلالی. مقدار null یعنی دائمی.
  - `grace_days` (پیش‌فرض ۷) و `readonly_days` (پیش‌فرض ۳۰)
  - `modules text[]`، `max_branches`، `max_users`
  - هر تغییر یک ردیف در `subscription_events` می‌سازد.
- **ماژول‌ها** دسته‌هایی از `SECTIONS` موجود در `lib/auth/permissions.ts` هستند:

  | ماژول | بخش‌ها |
  |---|---|
  | `accounting` | داشبورد، تراکنش‌ها، صندوق‌ها، طرف‌حساب‌ها، گزارش، چک، شرکا |
  | `inventory` | انبار، سفارش خرید |
  | `kitchen` | آشپزخانه، رسپی‌بوک |
  | `menu` | منو، لینک‌هاب |
  | `ordering` | سفارش آنلاین، پرداخت |
  | `reservations` | رزرو |
  | `hr` | منابع انسانی، حقوق، استخدام |
  | `crm` | مشتری، باشگاه، کوپن، بازخورد |
  | `ops` | تجهیزات، تسک‌ها |
  | `anomaly` | دستیار مالی |

- **یک نقطهٔ تصمیم:** `getOrgAccess(org)` یکی از این حالت‌ها را برمی‌گرداند: `active`، `grace` (کار کامل همراه بنر)، `readonly` (فقط دیدن و خروجی گرفتن)، `locked` (صفحهٔ تمدید).

  جاهایی که اعمال می‌شود:
  - **(۱) wrapper routeها:** در حالت `locked` جواب 402 برمی‌گردد. در حالت `readonly` هر متد غیر از GET رد می‌شود، به‌جز ورود و خروجی.
  - **(۲) middleware صفحه‌ها:** بنر و صفحهٔ «اشتراک تمام شده».
  - **(۳) `canAccessSection`:** ماژول غیرفعال باشد، از منو حذف می‌شود و routeهایش 403 می‌دهند.
  - **(۴) سقف‌ها:** موقع ساختن شعبه و کاربر چک می‌شوند (`POST /api/branches`، `POST /api/users`).
  - **(۵) صفحه‌های عمومی در حالت `locked`:** سفارش، رزرو و پرداخت بسته می‌شوند. اینکه منو باز بماند سؤال ۳ است.
  - داده هیچ‌وقت خودکار پاک نمی‌شود.
- **کلید خاموش/روشن:** متغیر `LICENSE_ENFORCEMENT=off|warn|on`. اول `warn` (فقط لاگ و بنر)، بعد `on`.
- **پنل پلتفرم (`platform.meeez.me`):**
  - فهرست مجموعه‌ها.
  - ساخت مجموعه با یک ویزارد: slug، نام، برند، پلن، اولین مدیر، و seed پیش‌فرض‌ها (دسته‌بندی‌ها، فرم استخدام، تنظیمات تک‌ردیفی، کلیدهای `app_settings`).
  - تمدید، تعلیق، تغییر ماژول‌ها و سقف‌ها.
  - ورود پشتیبانی و لاگ.
- **بعداً از meeez.me:** ریپوی `/Users/ali/meeez` با یک API امضاشده (HMAC و secret مشترک) مثل `POST /api/platform/v1/orgs` و `…/renew` درخواست لایسنس را به ساخت مجموعه وصل می‌کند. پرداخت آنلاین اشتراک گام ۶ نقشه است.

---

## ۶. مهاجرت داده و دامنه

- **محیط staging:**
  - یک اپ دوم روی Liara (`meeez-staging`) با دیتابیسی که از آخرین بکاپ production بازیابی شده است.
  - هر SQL اول آنجا اجرا و زمان‌سنجی می‌شود.
  - هر فاز اول روی staging با دادهٔ واقعی تست می‌شود.
- **بکاپ:**
  - قبل از هر migration، بکاپ Liara به‌علاوهٔ `pg_dump -Fc` دستی که بیرون از Liara نگه داشته می‌شود.
  - یک بار بازیابی کامل روی staging تمرین می‌شود.
- **ترتیب SQL.** همه فایل جدا در `project-docs/migrations/` هستند و مثل امروز دستی اجرا می‌شوند. همه با `SET lock_timeout='3s'` و تکرار اجرا می‌شوند تا هیچ‌وقت پشت یک کوئری طولانی صف نکشند و اپ را قفل نکنند. اجرا شب بعد از بسته‌شدن رستوران‌ها انجام می‌شود.
  1. **`db-meeez-01-platform.sql`:** جدول‌های پلتفرم ساخته می‌شوند و مجموعهٔ `basharaf` با UUID ثابت و اشتراک دائمی ثبت می‌شود.
  2. **`db-meeez-02-org-columns.sql`:** روی هر ۸۰ جدول:
     - `ADD COLUMN organization_id uuid DEFAULT '<basharaf-uuid>'`. روی PG11 به بالا با مقدار ثابت، جدول بازنویسی نمی‌شود و عملاً فوری است.
     - FK با `NOT VALID` اضافه می‌شود و بعد `VALIDATE` می‌شود. این قفل نوشتن را نمی‌بندد.
     - `CHECK (organization_id IS NOT NULL) NOT VALID`، بعد `VALIDATE`، بعد `SET NOT NULL` که سریع است.
     - **کد قدیمی بدون هیچ تغییری کار می‌کند،** چون insert با DEFAULT به نام با‌شرف ثبت می‌شود.
  3. **`db-meeez-03-indexes.sql`:** index روی `organization_id` و یکتاهای مرکب با `CONCURRENTLY`، بعد حذف یکتاهای قدیمی. PK `app_settings` هم عوض می‌شود.
  4. **`db-meeez-04-composite-fks.sql`:** `UNIQUE (organization_id, id)` روی والدها، و FK مرکب برای ۲۳ جدول فرزند (`NOT VALID` و بعد `VALIDATE`).
  5. **`db-meeez-05-default-from-context.sql`:** DEFAULT عوض می‌شود: اول به `coalesce(context, basharaf)` در دورهٔ گذار، و بعد از strict فقط context.
  6. **`db-meeez-06-rls.sql`:** نقش‌های `meeez_app` و `meeez_platform`، grantها، و policy و FORCE روی همهٔ جدول‌ها.
     - **لحظهٔ اصلی این مرحله:** `DATABASE_URL` روی Liara به نقش `meeez_app` عوض می‌شود.
     - **برگشت:** برگرداندن env به نقش قبلی در چند دقیقه.
- **دامنه:**
  - **پیش‌نیازها:**
    - DNS دامنهٔ meeez.me.
    - اضافه‌کردن `*.meeez.me` به اپ محصول روی Liara، به‌همراه گواهی SSL wildcard. **باید با مستندات یا پشتیبانی Liara تأیید شود.** اگر wildcard پشتیبانی نشود، هر زیردامنه دستی اضافه می‌شود؛ برای چند مشتری اول کافی است.
    - دامنهٔ اصلی `meeez.me` روی اپ سایت معرفی می‌ماند.
  - **دورهٔ موازی:** `basharaf.meeez.me` و `basharaf.me` هر دو کار می‌کنند و هر دو در `organization_domains` به مجموعهٔ با‌شرف نگاشت شده‌اند.
  - **روز انتقال:**
    - هر آدرس `basharaf.me/*` با 308 به `basharaf.meeez.me/*` می‌رود و مسیر و query حفظ می‌شوند. **این ریدایرکت باید برای همیشه بماند،** چون QR کدها چاپ شده‌اند و دامنهٔ basharaf.me باید همچنان تمدید شود.
    - **قبل از روز انتقال، درگاه‌های پرداخت به‌روز شوند.** آدرس callback الان از خود درخواست ساخته می‌شود و مشکلی ندارد، ولی Zarinpal و احتمالاً IDPay و Zibal دامنهٔ ثبت‌شدهٔ پذیرنده را چک می‌کنند. اگر دامنهٔ جدید در پنلشان ثبت نشود، پرداخت آنلاین می‌شکند.
    - **پیامدهای تغییر دامنه:** همهٔ کارکنان و مشتری‌ها یک بار دوباره وارد می‌شوند (کوکی‌ها به دامنه وابسته‌اند). سبد خرید و ترجیحات localStorage پاک می‌شوند. اشتراک web push و نصب PWA باید روی دامنهٔ جدید دوباره انجام شود. به کارکنان از قبل اطلاع داده می‌شود.

---

## ۷. فازبندی، ریسک، برگشت

اصل کار: **تغییر درجا روی `main` و قدم‌به‌قدم.** هر فاز برای با‌شرف نامرئی است تا وقتی ویژگی جدید عمداً روشن شود.
جایگزینش، یعنی یک branch بلندمدت و یک جابه‌جایی بزرگ در آخر، از main فاصله می‌گیرد (main هر هفته commit جدید دارد) و ریسک روز انتقال را بالا می‌برد. علی در سؤال ۲ این را تأیید می‌کند.
برآورد زمان بر حسب «روزِ کاری نشست» است.

| فاز | محتوا | زمان | ریسک برای رستوران‌ها | برگشت |
|---|---|---|---|---|
| **۱. آماده‌سازی** | تعیین تکلیف کارهای نیمه‌تمام؛ staging؛ Postgres در CI؛ helper تست دو مجموعه؛ حذف `basharaf123`؛ اسکلت تست کاتالوگ | ۱–۲ | هیچ | — |
| **۲. پایهٔ DB** | SQL ۰۱–۰۳؛ افزودن `organizationId` به Drizzle schema (با default) | ۱ + شب اجرا | خیلی کم (فقط ستون اضافه) | اسکریپت drop آماده |
| **۳. لایهٔ کانتکست** | `lib/tenant`؛ spike اتصال؛ codemod ۲۲۶ route؛ هدر org در middleware برای `/api`؛ ادعای `org` در JWT؛ چک org در fresh access؛ تک‌ردیفی‌ها و `getDefaultBranch` بر اساس مجموعه؛ پردازش‌گر بر اساس مجموعه؛ بازنویسی `wipe`؛ لاگ «کوئری بدون کانتکست» (فقط هشدار) | ۳–۵ | کم (همه چیز به با‌شرف resolve می‌شود) | revert دیپلوی؛ DB دست نخورده |
| **۴. یکتاها و FK مرکب** | SQL ۰۴–۰۵ | ۱ + شب | کم | اسکریپت برگشت index |
| **۵. قفل RLS** | SQL ۰۶؛ تست دو مجموعه روی staging سبز؛ یک هفته صفر هشدار «بدون کانتکست»؛ حذف Supabase realtime؛ بعد سوییچ `DATABASE_URL` | ۲–۳ | متوسط (کوئری جاافتاده = صفحهٔ خالی، نه نشت) | برگشت env در چند دقیقه |
| **۶. برند** | برند «میز» برای محصول؛ `organizations.brand` و صفحهٔ «برند مجموعه»؛ `OrgTheme` به‌جای `SafasityTheme` (مقایسهٔ اسکرین‌شات)؛ metadata و manifest پویا؛ متن‌ها؛ کوکی با خواندن دو نام؛ seed برند با‌شرف/صفاسیتی تا ظاهر مشتری عوض نشود | ۴–۶ | کم (ظاهر عمومی همان می‌ماند؛ پنل «میز · با‌شرف» می‌شود) | revert دیپلوی |
| **۷. زیردامنه** | DNS، دامنه روی Liara، resolve از host، `organization_domains`، dev روی `*.localhost`؛ `basharaf.meeez.me` موازی کار می‌کند | ۲ | هیچ (basharaf.me دست نمی‌خورد) | حذف دامنه |
| **۸. لایسنس** | جدول‌ها، `getOrgAccess`، اعمال در نقاط بالا، ماژول‌ها در منو، سقف‌ها، بنر؛ اول `warn` بعد `on` | ۳–۴ | هیچ (با‌شرف = دائمی) | `LICENSE_ENFORCEMENT=off` |
| **۹. پنل پلتفرم** | `platform.meeez.me`، TOTP، ویزارد ساخت مجموعه، تمدید/تعلیق، لاگ؛ ساخت مجموعهٔ دوم واقعی «demo» برای تست | ۳–۵ | هیچ (جدا) | خاموش‌کردن مسیر |
| **۱۰. انتقال با‌شرف** | درگاه‌ها، اطلاع‌رسانی ورود مجدد، 308، پایش ۴۸ ساعته | ۰.۵ + هماهنگی | متوسط (پرداخت/ورود) | خاموش‌کردن ریدایرکت |
| **۱۱. تغییر نام ریپو** | GitHub `basharaf-app` به `meeez` (GitHub ریدایرکت می‌سازد)، `package.json`، `CLAUDE.md`/`HANDOFF`، اسم اپ Liara | ۰.۵ | هیچ | — |
| **۱۲. (گام ۶ نقشه)** | پرداخت آنلاین اشتراک از meeez.me | بعداً | — | — |

**جمع:** حدود ۲۲ تا ۳۲ روز کاری نشست.
فاز ۶ (برند) را می‌شود بلافاصله بعد از فاز ۲ انجام داد اگر پیشرفت دیدنی زودتر مهم باشد، ولی چون به همان layoutها و middleware دست می‌زند، با فازهای ۳ تا ۵ موازی اجرا نمی‌شود.

**نگاشت به نقشهٔ meeez** (`/Users/ali/meeez/HANDOFF.md`):

| گام نقشه | فاز این برنامه |
|---|---|
| ۱ (برند) | ۶ |
| ۲ (چندمشتری) | ۲ تا ۵ |
| ۳ (زیردامنه) | ۷ |
| ۴ (لایسنس) | ۸ و ۹ |
| ۵ (مهاجرت) | ۲ و ۱۰ |
| ۶ (پرداخت) | ۱۲ |

پیشنهاد: جدول نقشه در آن ریپو در یک نشست جدا به‌روز شود.

**ریسک‌های اصلی:**
1. کوئری یا کار پس‌زمینه‌ای که کانتکست ندارد. بعد از RLS به‌جای نشت داده، صفحهٔ خالی می‌دهد. جواب: هشدار یک‌هفته‌ای قبل از strict، و تست دو مجموعه.
2. سقف اتصال‌های Postgres روی Liara، چون اتصال‌ها تمام طول درخواست نگه داشته می‌شوند.
3. پشتیبانی Liara از wildcard و SSL.
4. ثبت دامنهٔ جدید در درگاه‌های پرداخت.
5. `TRUNCATE` در ریست کارخانه.
6. Supabase realtime بدون فیلتر.
7. نشست‌های هم‌زمان روی این پوشه. فقط یک نشست فعال مجاز است و هر فاز یک نشست است.

---

## ۸. سؤال‌های باز برای علی (پیشنهاد من داخل پرانتز)

1. **صفاسیتی مجموعهٔ جداست یا داخل مجموعهٔ با‌شرف می‌ماند؟** امروز صفاسیتی برند روبه‌مشتریِ همان منو، لینک‌هاب، رسپی و فیش پرداخت است. منو تک‌ردیفی است و حسابداری، پرسنل و انبار مشترک‌اند. جداکردن یعنی تقسیم داده (کدام شعبه، منو، مشتری و حساب مال کیست). **(پیشنهاد: فعلاً داخل با‌شرف بماند و تم عمومی مجموعهٔ با‌شرف همان تم صفاسیتی باشد. اگر بعداً کسب‌وکار جدایی شد، با یک ابزار تقسیم داده جدا می‌شود.)**
2. **مدل اجرا:** تغییر درجا و قدم‌به‌قدم روی main، یا یک نسخهٔ جدای کامل با جابه‌جایی بزرگ؟ **(پیشنهاد: درجا. شرط «با‌شرف تا آماده‌شدن نسخهٔ جدید روی نسخهٔ فعلی کار کند» حفظ می‌شود، چون هیچ فازی برای آن‌ها تغییری ایجاد نمی‌کند.)**
3. **بعد از انقضای اشتراک:**
   - چند روز مهلت کامل؟ **(۷ روز.)**
   - بعد چه؟ **(۳۰ روز فقط-خواندنی، بعد قفل.)**
   - منوی عمومی در حالت قفل باز بماند؟ **(بله. سفارش، رزرو و پرداخت بسته شوند.)**
4. **لایسنس با‌شرف:** دائمی و رایگان (پلن «بنیان‌گذار»)، یا با تاریخ انقضا؟ **(دائمی.)**
5. **دسته‌بندی ماژول‌ها و پلن‌ها** (جدول بخش ۵) قبول است؟
6. **لوگوی میز:** فایل‌های پوشهٔ `logo/` (`png-Black`، `png-White`، `jpeg-*`) همان لوگوی میز هستند؟ املای لاتین «Meeez» قطعی است؟
7. **استودیوی رسپی (`/studio`):** محتوای مشترک کل پلتفرم است یا مخصوص هر مجموعه؟ زیردامنهٔ جدا می‌خواهد (`studio.meeez.me`)؟ **(پیشنهاد: پلتفرمی و جدا. فعلاً دست نخورد.)**
8. **دامنهٔ meeez.me:** خریداری شده؟ DNS کجاست؟ (برای wildcard روی Liara.)
9. **درگاه‌های پرداخت:** چه کسی به پنل Zarinpal، IDPay و Zibal دسترسی دارد تا دامنهٔ جدید ثبت شود؟
10. **پیامک:** یک حساب ملی‌پیامک برای کل پلتفرم (میز هزینه را حساب می‌کند)، یا حساب جدا برای هر مجموعه؟ قالب OTP ثبت‌شده «با شرف» دارد. **(پیشنهاد: حساب مخصوص هر مجموعه در تنظیماتش، و قالب عمومی «کد ورود شما: {code}».)**
11. **دسترسی به پنل پلتفرم:** فقط علی؟ رمز دوم (TOTP) اجباری؟ **(بله.)**
12. **زمان انتقال basharaf.me:** کدام روز و ساعت کم‌کار است؟

---

## Verification (برای هر فاز)

- **هر تغییر کد:** `npx tsc --noEmit` با ۰ خطا، بعد `npm test` (۶۵۹ تست فعلی باید سبز بمانند)، بعد `npm run lint`، بعد `npm run build`.
- **فازهای ۳، ۵ و ۷ به بعد:**
  - `npm run test:integration` همراه تست دو مجموعه و تست کاتالوگ RLS روی Postgres در CI.
  - Playwright با `basharaf.localhost` و `demo.localhost`.
- **هر migration:**
  - اول روی staging با دادهٔ واقعی: زمان‌سنجی، مقایسهٔ تعداد ردیف‌ها، و صفر ردیف با `organization_id IS NULL`.
  - **چک تراز مالی:** جمع `accounts.balance` قبل و بعد عیناً برابر باشد، و `balanceHelpers` هیچ drift گزارش نکند.
- **فاز ۶:** مقایسهٔ اسکرین‌شات قبل و بعد برای `/safasity`، `/m`، `/order`، `/reserve`، `/apply`.
- **فاز ۱۰:** چک‌لیست دستی روی production: ورود، ثبت تراکنش، سفارش با پرداخت تستی، رزرو، فیش `/r`، QR قدیمی.
- **بعد از هر فاز:** ژورنال HANDOFF، بخش ۰، commit و push، طبق پروتکل ریپو.
