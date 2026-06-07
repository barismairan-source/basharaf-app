# سند تحویل (Handoff) — هسته‌ی حسابداری «با شرف»

> این سند وضعیت **واقعی و فعلی** کد را مستند می‌کند، نه وضعیت آرمانی.
> هرجا چیزی پیاده‌سازی نشده، صریح نوشته شده. تاریخ: نسخه `0.6.0-logs`.

---

## ۰. شناسایی ماژول

- **این ماژول:** هسته‌ی حسابداری (Accounting Core) + یک ماژول جانبی **منوی دیجیتال**.
- این ماژول **انبار-فروش** یا **منابع انسانی-حقوق** نیست. آن دو هنوز ادغام نشده‌اند.
- **نام پروژه:** `basharaf-app`
- **نسخه:** `0.6.0-logs` (در `package.json`)
- **Repo:** `github.com/barismairan-source/basharaf-app` (شاخه `main`)
- **وضعیت دیپلوی:**
  - **Vercel:** فعال و کارکرد تأییدشده (با دیتابیس Supabase).
  - **Liara:** دیپلوی می‌شود و بالا می‌آید، ولی **login کار نمی‌کند** — خطای
    `password authentication failed for user "root"` (کد `28P01`). جزئیات در بخش ۹.
  - **لوکال:** build و typecheck بدون خطا.

---

## ۱. مدل داده (Schema)

منبع: `lib/db/schema.ts` (Drizzle ORM). **۱۳ جدول.**

### نوع‌های کلیدی
- **پول:** همه‌جا `bigint` با `mode: 'number'` — **تومان به‌صورت عدد صحیح**.
  شامل `transactions.amount`, `transactions.vatAmount`, `accounts.balance`,
  `contacts.balance`, `menu_items.price`. هیچ float/numeric برای پول استفاده نشده.
  > نکته: چون `mode: 'number'` است، مقادیر بزرگ‌تر از `Number.MAX_SAFE_INTEGER`
  > (~۹ کوادریلیون) دقت از دست می‌دهند. برای تومان در این مقیاس مشکلی نیست.
- **تاریخ‌ها — دو نوع متفاوت:**
  - تاریخ‌های **کاربری** (`transactions.date`, `branches.opened`, `users.joined`)
    → **رشته‌ی شمسی** (`text`)، مثلاً `'۱۴۰۳/۰۵/۱۲'`.
  - تاریخ‌های **سیستمی** (`createdAt`, `updatedAt`, `approvedAt`, ...)
    → `timestamp with time zone` (میلادی، خودکار).
- **کلید اصلی:** همه‌جا `uuid` با `defaultRandom()`. استثنا: `menu_settings.id`
  که `integer` و همیشه `1` است (single-row)، و `app_settings.key` که `text` است.

### جدول‌ها

**`branches`** — شعب
| ستون | نوع | nullable | default |
|---|---|---|---|
| id | uuid | NO | gen_random_uuid |
| name, address, manager, opened | text | NO | — |
| created_at, updated_at | timestamptz | NO | now |

**`users`** — کاربران
| ستون | نوع | nullable | توضیح |
|---|---|---|---|
| id | uuid | NO | PK |
| name, email (unique), password_hash | text | NO | hash = bcrypt |
| role | enum user_role | NO | `SuperAdmin`\|`BranchUser` |
| assigned_branch_id | uuid | **YES** | FK→branches (restrict). برای SuperAdmin null |
| initials | text | NO | — |
| last_seen | text | NO | default `'هم اکنون'` |
| joined | text | NO | رشته شمسی |
| created_at, updated_at | timestamptz | NO | now |

**`categories`** — دسته‌بندی درآمد/هزینه
| ستون | نوع | nullable |
|---|---|---|
| id | uuid | NO |
| type | enum tx_type | NO |
| name | text | NO |
| created_at | timestamptz | NO |

**`transactions`** — قلب سیستم
| ستون | نوع | nullable | default | FK |
|---|---|---|---|---|
| id | uuid | NO | random | — |
| type | enum tx_type | NO | — | income\|expense\|transfer |
| title | text | NO | — | — |
| category_id | uuid | **YES** | — | →categories (restrict) |
| category_name | text | NO | `''` | denormalized |
| amount | bigint | NO | — | تومان |
| payee | text | NO | — | — |
| branch_id | uuid | NO | — | →branches (restrict) |
| branch_name | text | NO | — | denormalized |
| method | text | NO | — | — |
| receipt | text | NO | `'—'` | — |
| receipt_url | text | YES | — | — |
| account_id | uuid | YES | — | →accounts (set null) |
| destination_account_id | uuid | YES | — | →accounts (set null)، فقط transfer |
| contact_id | uuid | YES | — | →contacts (set null) |
| vat_amount | bigint | NO | `0` | مالیات ارزش افزوده |
| is_credit | boolean | NO | `false` | نسیه |
| date | text | NO | — | رشته شمسی |
| note | text | NO | `''` | — |
| has_receipt | boolean | NO | `false` | — |
| status | enum tx_status | NO | `pending` | pending\|approved\|rejected |
| created_by | uuid | NO | — | →users (restrict) |
| approved_by / rejected_by | uuid | YES | — | →users (set null) |
| approved_at / rejected_at | timestamptz | YES | — | — |
| rejection_reason | text | YES | — | — |
| created_at, updated_at | timestamptz | NO | now | — |

**`notifications`** — اعلان‌ها
id (uuid PK), type (enum notif_type), title/sub/time (text), read (bool default false),
tx_id (uuid FK→transactions cascade, YES), user_id (uuid FK→users cascade, YES),
created_at.

**`app_settings`** — تنظیمات key/value
key (text **PK**), value (text), label (text), group (text default `'general'`), updated_at.

**`audit_log`** — لاگ اعمال کاربر (append-only)
id, user_id (FK→users set null, YES), action (text), meta (text JSON), ip (text), created_at.

**`accounts`** — صندوق/بانک
id, name (text), type (text default `'cash'` — مقادیر cash|bank|pos، **enum نیست**),
balance (bigint default 0), is_active (bool default true),
branch_id (uuid FK→branches restrict, **YES**), created_at, updated_at.

**`contacts`** — طرف‌حساب (بدهکار/بستانکار)
id, name (text), type (text default `'customer'` — customer|supplier|other، **enum نیست**),
phone (text YES), note (text YES), balance (bigint default 0 — مثبت=طلب ما، منفی=بدهی ما),
is_active (bool default true), created_at, updated_at.

**`menu_categories`** — دسته منو
id, slug (text unique), label_en, label_fa (text), sort_order (int default 0), created_at.

**`menu_items`** — آیتم منو
id, category_id (uuid FK→menu_categories restrict, NO), title_en/title_fa (text),
description_en/description_fa (text default `''`), price (bigint default 0),
is_available (bool default true), sort_order (int default 0), created_at, updated_at.

**`menu_settings`** — تک‌ردیفی
id (integer PK، همیشه 1), fa_font (text default `'IRANMarker'`), phone, address_fa,
address_en, instagram (text default `''`), updated_at.

**`system_logs`** — لاگ مرکزی (بخش ۹ ببینید)
id, level (text default info), category (text default general), message (text),
path/method (text YES), status_code (int YES), user_id (uuid FK→users set null, YES),
user_email (text YES), context (text JSON YES), stack (text YES), ip (text YES),
user_agent (text YES), created_at.

### نمودار رابطه‌ها (FK)
```
branches ←── users.assigned_branch_id (restrict)
branches ←── accounts.branch_id (restrict)
branches ←── transactions.branch_id (restrict)
categories ←── transactions.category_id (restrict)
users ←── transactions.created_by (restrict)
users ←── transactions.approved_by / rejected_by (set null)
accounts ←── transactions.account_id / destination_account_id (set null)
contacts ←── transactions.contact_id (set null)
transactions ←── notifications.tx_id (cascade)
users ←── notifications.user_id (cascade)
users ←── audit_log.user_id (set null)
users ←── system_logs.user_id (set null)
menu_categories ←── menu_items.category_id (restrict)
```

---

## ۲. دفتر کل / سند حسابداری

- **این ماژول دفتر کل دوطرفه (double-entry GL) ندارد.** هیچ جدول
  journal / journal_entry / debit-credit وجود **ندارد**.
- مدل فعلی **single-entry** است: هر `transaction` یک رکورد است با `type`
  (income/expense/transfer) و یک `amount`. مفهوم سند با سرفصل‌های بدهکار/بستانکار
  متوازن **پیاده‌سازی نشده**.
- **اثر مالی واقعی روی دیتابیس post می‌شود** (نه فقط فایل): از طریق
  `lib/db/balanceHelpers.ts` در یک DB transaction اتمیک:
  - `applyBalance` / `reverseBalance` → موجودی `accounts.balance` را تغییر می‌دهد.
  - `applyContactBalance` / `reverseContactBalance` → موجودی `contacts.balance`
    را برای تراکنش‌های نسیه تغییر می‌دهد.
  - فقط تراکنش `approved` روی موجودی اثر دارد. حذف/ویرایش تراکنش approved، اثر را
    معکوس و دوباره اعمال می‌کند.
- **"دفتر کل" در UI** (مسیر `/accounts/[id]` و API `ledger`) فقط یک
  **گزارش گردش حساب** برای یک صندوق است (لیست تراکنش‌ها با مانده‌ی متحرک).
  این یک GL حسابداری استاندارد نیست — صرفاً نمایش است.

> **برای ادغام ERP:** اگر ماژول‌های دیگر به GL دوطرفه نیاز دارند، این ماژول
> فعلاً آن را ندارد و باید از صفر اضافه شود.

---

## ۳. احراز هویت و RBAC

- **منبع حقیقت: لایه‌ی اپ (JWT دست‌ساز با `jose`).** RLS دیتابیس استفاده **نشده**.
- **Supabase Auth (GoTrue) استفاده نشده.** احراز هویت کاملاً دست‌ساز:
  - رمز با `bcryptjs` هش می‌شود.
  - توکن JWT با `jose` (HS256) امضا می‌شود، در cookie `basharaf-session`
    (httpOnly, sameSite=lax, maxAge=30 روز).
- **enforcement در سه نقطه:**
  1. `middleware.ts` (Edge) — مسیرهای protected را با `verifyToken` چک می‌کند.
     PROTECTED_PREFIXES: `/dashboard, /transactions, /settings, /reports,
     /accounts, /contacts, /menu, /logs`.
  2. API routes — `requireSession()` و `requireAdmin()` از `lib/auth/session.ts`.
  3. کلاینت — صفحات نقش کاربر را چک می‌کنند (نمایشی، نه امنیتی).
  > منبع حقیقت امنیتی، چک‌های **سمت سرور** (۱ و ۲) است.
- **نقش‌ها (۲ تا):**
  - `SuperAdmin` — دسترسی کامل، همه شعب، تنها نقشی که می‌تواند تایید/رد کند،
    کاربر بسازد، منو و لاگ را ببیند.
  - `BranchUser` — محدود به شعبه‌ی خودش (`assigned_branch_id`).
- **مدل مجوز ریزدانه (per-permission) وجود ندارد** — فقط همین دو نقش.

---

## ۴. وابستگی به Supabase

استفاده‌ی واقعی از Supabase (تأییدشده در کد):

| قابلیت | استفاده شده؟ | محل |
|---|---|---|
| PostgreSQL | بله (هسته) | `lib/db/client.ts` با درایور `postgres` |
| GoTrue (Auth) | **خیر** | auth دست‌ساز است |
| RLS policies | **خیر** | هیچ policy در کد نیست |
| Realtime | بله | `lib/realtime/` — subscribe به `transactions` و `notifications` |
| Storage | بله | `lib/storage/receipts.ts` — آپلود رسید |
| Edge Functions | **خیر** | — |

- **اتصال دیتابیس از طریق درایور خام `postgres`** است (نه `supabase-js` برای داده).
  یعنی دیتابیس را می‌توان به **هر PostgreSQL** (از جمله Liara) وصل کرد.
- `@supabase/supabase-js` فقط برای **Realtime و Storage** استفاده می‌شود
  (`lib/realtime/client.ts`, `lib/realtime/useRealtime.ts`, `lib/storage/receipts.ts`).
- **پیامد استقرار:** اگر روی Liara با دیتابیس داخلی بروید (بدون Supabase)،
  **Realtime و آپلود رسید کار نمی‌کنند**، ولی بقیه‌ی سیستم سالم است.
- **RLS policy برای پیست‌کردن وجود ندارد** (هیچ‌وقت نوشته نشد). در نسخه‌های
  آرشیوی قدیمی RLS بود ولی در migration فعلی (`db-setup.sql`) **حذف شده** و
  جای آن به auth لایه‌ی اپ سپرده شده.

---

## ۵. لایه‌ی API و سرویس

همه Route Handler (App Router، `app/api/.../route.ts`):

| مسیر | متدها | کار |
|---|---|---|
| `/auth/login` | POST | ورود، rate-limit، ساخت JWT |
| `/auth/logout` | POST | حذف session |
| `/auth/me` | GET | کاربر فعلی |
| `/auth/change-password` | POST | تغییر رمز |
| `/transactions` | GET, POST | لیست/ساخت تراکنش |
| `/transactions/[id]` | GET, PATCH, DELETE | جزئیات/ویرایش/حذف (با reverse balance) |
| `/transactions/[id]/approve` | POST | تایید + اعمال موجودی |
| `/transactions/[id]/reject` | POST | رد |
| `/accounts` | GET, POST | صندوق‌ها |
| `/accounts/[id]` | GET, PATCH, DELETE | جزئیات صندوق |
| `/accounts/[id]/ledger` | GET | گردش حساب با مانده متحرک |
| `/accounts/recalculate` | POST | بازسازی موجودی از روی تراکنش‌ها |
| `/contacts`, `/contacts/[id]` | GET,POST,PATCH,DELETE | طرف‌حساب‌ها |
| `/categories`, `/categories/[id]` | CRUD | دسته‌بندی‌ها |
| `/branches`, `/branches/[id]` | CRUD | شعب |
| `/users`, `/users/[id]` | CRUD | کاربران |
| `/notifications` | GET, PATCH | اعلان‌ها |
| `/reports` | GET | گزارش aggregate سمت سرور |
| `/settings` | GET, PATCH | app_settings |
| `/export` | GET/POST | خروجی Excel (xlsx) |
| `/upload` | POST | آپلود رسید (Supabase Storage) |
| `/audit` | GET | خواندن audit_log |
| `/logs` | GET, DELETE | خواندن/پاک‌کردن system_logs (SuperAdmin) |
| `/menu` | GET | منوی کامل عمومی (بدون auth) |
| `/menu/items`, `/menu/items/[id]` | POST,PATCH,DELETE | CRUD آیتم |
| `/menu/categories`, `/menu/categories/[id]` | POST,PATCH,DELETE | CRUD دسته |
| `/menu/settings` | PATCH | تنظیمات منو |
| `/_diag` | GET | **endpoint تشخیص اتصال DB — موقت، باید حذف شود** |

**helperهای کلیدی:**
- `lib/db/balanceHelpers.ts` — `applyBalance`, `reverseBalance`,
  `applyContactBalance`, `reverseContactBalance` (منطق مالی اتمیک).
- `lib/db/serializers.ts` — تبدیل bigint→number (چون JSON نمی‌تواند bigint).
- `lib/db/menuSerializers.ts` — سریالایز منو.
- `lib/api-error.ts` — `handleError` و `handleErrorLogged` (مدیریت خطای یکپارچه).
- `lib/logger.ts` — `logEvent`, `logError` (نوشتن در system_logs).
- `lib/auth/session.ts` — `requireSession`, `requireAdmin`.
- **تابع تولید سند حسابداری (journal) وجود ندارد** (چون GL نداریم).

---

## ۶. State (Zustand)

۱۱ slice در `store/slices/`، همه با CRUD optimistic:

| slice | نگه‌داری |
|---|---|
| authSlice | کاربر فعلی، login/logout |
| transactionsSlice | تراکنش‌ها، submit/approve/reject |
| usersSlice | کاربران |
| refsSlice | شعب + دسته‌بندی‌ها |
| accountsSlice | صندوق‌ها |
| contactsSlice | طرف‌حساب‌ها |
| menuSlice | منو (دسته/آیتم/تنظیمات) |
| notificationsSlice | اعلان‌ها |
| appSettingsSlice | تنظیمات key/value |
| preferencesSlice | ترجیحات کاربر (تنها چیزی که `persist` می‌شود) |
| uiSlice | وضعیت UI (toast، drawer، ...) |

> فقط `preferencesSlice` در localStorage persist می‌شود. بقیه از سرور می‌آیند.

---

## ۷. کنوانسیون‌ها

- **پول:** تومان صحیح (`bigint`). در UI با `Intl.NumberFormat('fa-IR')` نمایش.
- **Branch scope:** BranchUser فقط داده‌ی `assigned_branch_id` خودش. SuperAdmin همه.
  enforce در API queryها.
- **تاریخ:** کاربری = رشته‌ی شمسی؛ سیستمی = timestamptz میلادی.
- **RTL:** کل اپ RTL، با `tailwindcss-rtl` (utility های منطقی ms-/me-/ps-/pe-).
- **فونت:** Vazirmatn local (`public/fonts/`) + ۵ فونت منو. هیچ فونت remote.
- **Invariant تایید:** فقط `approved` روی موجودی اثر دارد. تغییر تراکنش approved
  باید balance را اتمیک reverse+reapply کند.
- **UUID:** همه‌جا `crypto.randomUUID` / `defaultRandom`.
- **denormalization عمدی:** `branch_name`, `category_name` در تراکنش ذخیره می‌شوند
  تا اگر شعبه/دسته حذف شد، تاریخچه حفظ شود.

---

## ۸. Migrationها

- **مدیریت با drizzle-kit نیست در عمل.** هرچند `drizzle.config.ts` و `drizzle/`
  وجود دارد، روش واقعی استقرار **اجرای دستی فایل SQL** در Supabase/Liara است.
- **فایل‌های فعلی (consolidated شده):**
  - `db-setup.sql` — کل ساختار (۱۳ جدول، enumها، indexها، تنظیمات پیش‌فرض).
    idempotent. شامل `system_logs` هم هست.
  - `db-seed.sql` — داده اولیه (۳ شعبه، ۴ کاربر با hash واقعی، ۹ دسته، ۳ صندوق).
  - `supabase-logs-migration.sql` — فقط جدول `system_logs` (برای دیتابیس‌های
    موجود که می‌خواهند فقط لاگ را اضافه کنند).
- **آرشیو:** ۹ فایل SQL قدیمی پراکنده در `migrations-archive/` منتقل شده‌اند
  (دیگر استفاده نمی‌شوند، فقط تاریخچه).
- **نکته:** seed آیتم‌های منو (۳۱ آیتم) در migration آرشیوی
  `supabase-v4-menu-migration.sql` بود؛ در `db-setup.sql` فعلی **seed منو نیست**
  (فقط ساختار جداول منو هست). اگر روی دیتابیس تازه می‌روید، آیتم‌های منو خالی‌اند.

---

## ۹. وضعیت تکمیل و باگ‌های شناخته‌شده

### کامل و کارکرد تأییدشده
- احراز هویت JWT، RBAC سه‌لایه، rate-limit ورود.
- CRUD تراکنش/صندوق/طرف‌حساب/دسته/شعبه/کاربر.
- موجودی اتمیک، بازسازی موجودی، گردش حساب.
- VAT (نرخ از app_settings)، تراکنش نسیه.
- گزارش aggregate، خروجی Excel.
- منوی دیجیتال (`/m` عمومی + `/menu` ادمین + QR).
- PWA (manifest + apple-touch-icon).
- سیستم لاگ (`/logs` + `system_logs`).
- **روی Vercel + Supabase کامل کار می‌کند.**

### باگ‌های حل‌نشده / WIP
- **🔴 بحرانی — login روی Liara کار نمی‌کند:**
  `PostgresError: password authentication failed for user "root"` (`28P01`).
  - خطای SSL قبلی (`ECONNRESET`) **حل شد** (تشخیص خودکار host داخلی در
    `lib/db/client.ts`).
  - مشکل فعلی: رمز/کاربر دیتابیس. URI رسمی Liara و `DATABASE_URL` ظاهراً یکی‌اند
    ولی auth رد می‌شود. **هنوز ریشه‌یابی نشده.** احتمال: دیتابیسی که seed روی آن
    اجرا شد با دیتابیسی که اپ به آن وصل می‌شود فرق دارد، یا رمز عوض شده.
  - برای تشخیص، endpoint موقت `/api/_diag` ساخته شد ولی در آخرین تست ۴۰۴ داد
    (یعنی نسخه‌ی deploy شده قدیمی بود؛ تأیید نهایی نشده).
- **🟡 endpoint `/api/_diag` موقت است** — قبل از production نهایی باید حذف شود
  (اطلاعات اتصال را افشا می‌کند، هرچند رمز را mask می‌کند).
- **🟡 سیستم لاگ برای دیباگِ همین مشکل DB بی‌فایده است:** چون نوشتن لاگ هم به
  همان دیتابیس نیاز دارد. اگر DB وصل نشود، لاگ هم نوشته نمی‌شود.
- **🟡 seed منو در migration اصلی نیست** (بخش ۸).

### TODOهای باز / پیاده‌سازی‌نشده‌ها
- **GL دوطرفه / journal entry — پیاده‌سازی نشده** (بخش ۲).
- **منو → POS/فروش — پیاده‌سازی نشده.** منو فقط کاتالوگ است؛ هیچ تراکنش مالی
  از منو ساخته نمی‌شود. جدول orders/order_items وجود ندارد.
- **مدل مجوز ریزدانه — وجود ندارد** (فقط ۲ نقش).
- **password reset با ایمیل — وجود ندارد.**
- **rate-limit در حافظه است** (در محیط multi-instance سراسری نیست).
- **refactor مسیرها به `/admin/*`** که کاربر خواسته بود — **انجام نشده**
  (به‌خاطر اولویت رفع باگ‌های دیپلوی به تعویق افتاد).

---

## ۱۰. وابستگی‌ها (package.json)

**نسخه‌های کلیدی:**
- `next`: `14.2.15` (App Router)
- `react` / `react-dom`: `^18.3.1`
- `typescript`: `^5.6.3` (strict)
- **DB:** `drizzle-orm`: `^0.36.1` + درایور `postgres`: `^3.4.5`
  (درایور خام، نه `supabase-js` برای داده). `drizzle-kit`: `^0.27.2` (dev).
- **Auth:** `bcryptjs`: `^2.4.3` + `jose`: `^5.9.6`
- **Supabase:** `@supabase/supabase-js`: `^2.45.4` (فقط Realtime + Storage)
- **Forms/Validation:** `react-hook-form`: `^7.53.0` + `zod`: `^3.23.8` +
  `@hookform/resolvers`: `^3.9.0`
- **UI:** `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`,
  `tailwindcss` + `tailwindcss-rtl`
- **Charts:** `recharts`: `^3.8.1`
- **تاریخ شمسی:** `react-multi-date-picker`: `^4.5.2`
  **(توجه: این بسته هنوز نصب و استفاده می‌شود — در `components/ui/JalaliDatePicker.tsx`.
  ادعای حذف آن در مستندات قبلی نادرست بود.)**
- **Export:** `xlsx`: `^0.18.5`
  **(توجه: `@types/file-saver` هنوز در deps هست ولی خود `file-saver` نصب نیست و
  استفاده هم نمی‌شود — یک وابستگی یتیم.)**
- **QR:** `qrcode`: `^1.5.4`
- **State:** `zustand`: `^4.5.5`

> **برای ادغام ERP — هشدارهای صداقتی:**
> 1. این ماژول **GL ندارد**؛ اگر ERP به دفتر کل دوطرفه نیاز دارد، باید ساخته شود.
> 2. روی Liara هنوز **login حل نشده**؛ تا قبل از اتکا، باید رفع شود.
> 3. Realtime و Storage به Supabase گره خورده‌اند؛ روی هاست بدون Supabase کار نمی‌کنند.
> 4. وابستگی‌های یتیم (`file-saver` types) و بسته‌هایی که تصور می‌شد حذف شده‌اند
>    (`react-multi-date-picker`) هنوز در پروژه‌اند.
