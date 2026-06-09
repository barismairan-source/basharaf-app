# سند تحویل (Handoff) — «با شرف» v9.0.0

> این سند وضعیت **واقعی و فعلی** کد را مستند می‌کند.
> هرجا چیزی پیاده‌سازی نشده، صریح نوشته شده.
> تاریخ: **2026-06-09** — نسخه `9.0.0`
>
> **فایل تفصیلی‌تر:** `project-docs/handoff.md` (شامل ریزجزئیات Batch 3–4 و hotfixها).

---

## آخرین تغییرات — 2026-06-09: آدیت یکپارچگی انبار ↔ حسابداری

### چه شد
ردیابی end-to-end شش جریان کامل انبار ↔ حسابداری در کد + پیشنهاد ابزار آشپزخانه.
نتایج در `project-docs/inventory-audit.md`.

### یافته‌های بحرانی (🔴 — کد تأیید شد)

1. **باگ: تولید نیمه‌آماده — افت (yieldPct) اعمال نمی‌شود**
   - فایل: `lib/db/inventoryHelpers.ts:200` — `produceConfirmed`
   - `issueConfirmed(r.itemId, r.qtyBase * b)` — بدون ضریب افت
   - فروش منو درست است (`factor = 100/yield`), تولید ندارد → ناسازگاری
   - اثر: موجودی مواد خام بالاتر از واقعیت، COGS نیمه‌آماده کمتر

2. **باگ: برگه انبارگردانی — invStockTx ثبت نمی‌شود**
   - فایل: `app/api/inventory/vouchers/[id]/approve/route.ts:69`
   - `if (kind === 'stocktake') continue;` — لاگ حرکت موجودی رد می‌شود
   - انبارگردانی مستقیم (API) لاگ می‌نویسد؛ انبارگردانی از طریق برگه نمی‌نویسد

3. **ریسک: موجودی ناکافی در فروش منو — هشدار فقط در audit log**
   - فایل: `lib/inventory/menuSaleDeduction.ts:104`
   - warnings.push(...) → فقط در جدول audit_logs، هیچ toast/اعلانی به مدیر نمی‌رسد
   - COGS کمتر از واقعیت اگر stock کافی نباشد

### هیچ کدی تغییر نکرد — فقط آدیت و مستندسازی

### بعدی
- رفع باگ شماره ۱ (produce yield): یک خط تغییر در `produceConfirmed`
- رفع باگ شماره ۲ (stocktake log): اضافه کردن insert به invStockTx در مسیر برگه
- پیاده‌سازی ابزارهای آشپزخانه (اولویت S: کارت رسپی، ماشین‌حساب پرس، کارت چاپ)

---

## آخرین تغییرات — 2026-06-09: رفع ۴ باگ بحرانی + اصلاح Sidebar

### چه شد

**API — حفاظ‌های حذف:**

1. `app/api/accounts/[id]/route.ts` — DELETE حالا ابتدا `balance` را بررسی می‌کند؛ اگر != 0 باشد، خطای ۴۰۹ با پیام فارسی «این صندوق X تومان موجودی دارد و قابل حذف نیست» برمی‌گرداند.
2. `app/api/contacts/[id]/route.ts` — DELETE مشابه بالا؛ پیام بر اساس جهت بدهی: بدهکار (مانده مثبت) یا طلبکار (مانده منفی).
3. `app/api/coupons/route.ts` — GET حالا `eq(isActive, true)` دارد؛ کوپن‌های soft-delete دیگر برنمی‌گردند.
4. `app/api/users/[id]/route.ts` — DELETE ابتدا count تراکنش‌های کاربر را بررسی می‌کند؛ اگر > 0 باشد، خطای ۴۰۹ با پیام فارسی برمی‌گرداند (به جای crash پنهان FK constraint).

**Sidebar — اصلاح نام‌گذاری و گروه‌بندی:**

5. `components/layout/Sidebar.tsx` — «صندوق‌ها و فروش» → «تراکنش‌ها» (رفع تداخل نام با «صندوق‌ها»).
6. `components/layout/Sidebar.tsx` — «طرف‌حساب‌ها» از گروه «روابط و منابع» به «عملیات اصلی» منتقل شد.

### فایل‌های تغییریافته
- `app/api/accounts/[id]/route.ts`
- `app/api/contacts/[id]/route.ts`
- `app/api/coupons/route.ts`
- `app/api/users/[id]/route.ts`
- `components/layout/Sidebar.tsx`

### وضعیت build
`npx tsc --noEmit` و `npm run build` هر دو سبز ✅

### بعدی
- موارد 🟡 باقی‌مانده از domain-audit.md (اختیاری)
- اضافه کردن تست integration برای balance guard

---

## آخرین تغییرات — 2026-06-09: Sidebar UX Redesign

### چه شد
بازطراحی کامل ناوبری (Sidebar + Mobile) با رعایت UX استانداردهای ERP:

**Desktop Sidebar:**
- عرض ۲۴۰px حالت باز / ۶۴px حالت بسته (icon-only)
- دکمه toggle (ChevronRight/Left) در بالای sidebar
- انیمیشن `transition-[width] duration-200` بدون layout shift
- حالت collapsed: فقط آیکون، tooltip با `title` attribute هنگام hover
- بخش footer: Avatar + نام + ایمیل + دکمه logout (در حالت expanded)؛ Avatar + logout (در حالت collapsed)
- تنظیم collapsed/expanded persist در `preferencesSlice` (localStorage)

**Mobile:**
- Drawer از راست (RTL start) با `transition-transform duration-300`
- Overlay با `transition-opacity` (بدون blink از mount/unmount)
- Bottom Tab Bar جدید (`BottomTabBar.tsx`) — ۵ تب: داشبورد، تراکنش‌ها، انبار، گزارش، تنظیمات
- فقط تب‌هایی که کاربر به آن‌ها دسترسی دارد نمایش می‌یابند
- حداقل ارتفاع ۴۸px برای tap target
- `pb-16 lg:pb-0` روی main برای فضای bottom tab bar

### فایل‌های تغییریافته
- `types/preferences.ts` — اضافه شدن `sidebarCollapsed: boolean`
- `components/layout/Sidebar.tsx` — بازنویسی کامل
- `components/layout/MobileMenu.tsx` — بهبود overlay + حذف inline cn
- `components/layout/BottomTabBar.tsx` — **فایل جدید**
- `components/layout/index.ts` — export جدید `BottomTabBar`
- `app/(app)/layout.tsx` — اضافه شدن `<BottomTabBar />` + `pb-16 lg:pb-0`

### وضعیت build
`npx tsc --noEmit` و `npm run build` هر دو سبز ✅

### بعدی
- بدون مورد باز جدید — ادامه‌ی TODOهای بخش ۱۰

---

## آخرین تغییرات — 2026-06-09: آدیت دامین‌لاجیک

گزارش کامل در `project-docs/domain-audit.md`. خلاصه‌ی یافته‌های بحرانی:
1. 🔴 صندوق با مانده != 0 قابل soft-delete (بدون هشدار)
2. 🔴 طرف‌حساب با بدهی/مطالبه قابل soft-delete (بدون هشدار)
3. 🔴 کوپن GET فیلتر isActive ندارد — کوپن‌های حذف‌شده برمی‌گردند
4. 🔴 حذف کاربر با تراکنش → crash پنهان (FK restrict پوشش نشده)
5. 🟡 گروه‌بندی sidebar: «روابط و منابع» ۷ آیتم ناهمگون دارد
6. 🟡 «صندوق‌ها» و «صندوق‌ها و فروش» در sidebar — نام تداخل دارد

هیچ کدی تغییر نکرد — فقط آدیت و مستندسازی.

---

## آخرین تغییرات — 2026-06-09: رفع باگ حذف قلم انبار

### باگ
حذف قلم انبار toast موفقیت نشان می‌داد ولی با refresh صفحه قلم برمی‌گشت.

### ریشه‌ی مشکل
`DELETE /api/inventory/items/[id]` یک **soft-delete** است — فقط `isActive = false` می‌کند (به دلیل FK‌های `restrict` از `inv_recipe_lines` و `inv_voucher_lines`، حذف فیزیکی بلوک می‌شد). اما `GET /api/inventory/items` هیچ فیلتری روی `isActive` نداشت و همه‌ی رکوردها شامل غیرفعال‌ها را برمی‌گرداند. بعد از حذف، `onChange()` صفحه یک re-fetch می‌زد و قلم «حذف‌شده» دوباره برمی‌گشت.

### اصلاح
`app/api/inventory/items/route.ts` — اضافه شدن `ne(isActive, false)` به `where` clause در GET:
- BranchUser: `AND(isActive != false, branchId = X)`
- SuperAdmin/Warehouse: `isActive != false`

### فایل تغییریافته
- `app/api/inventory/items/route.ts`

---

## ۰. وضعیت فعلی

- **نسخه:** `9.0.0` (در `package.json`)
- **Repo:** `github.com/barismairan-source/basharaf-app` (شاخه `main`)
- **Build/TypeCheck:** `npx tsc --noEmit` و `npm run build` هر دو سبز ✅
- **وضعیت دیپلوی:**
  - **Vercel + Supabase:** کامل کار می‌کند.
  - **Liara:** فایل راهنما `DEPLOY-LIARA.md` در ریشه‌ی پروژه. مشکل قدیمی `28P01` از طریق آن راهنما باید حل شود.

---

## ۱. Tech Stack

| لایه | ابزار |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript strict |
| Database | PostgreSQL (Supabase-hosted) |
| ORM | Drizzle ORM + درایور `postgres` (خام، نه supabase-js برای داده) |
| Auth | JWT دست‌ساز — `jose` (HS256) + `bcryptjs` |
| State | Zustand (slice-based) |
| Styling | Tailwind CSS + tailwindcss-rtl (RTL کامل) |
| Supabase SDK | فقط برای Realtime و Storage |
| Realtime | `@supabase/supabase-js` → `lib/realtime/` |
| Storage | Supabase Storage → `lib/storage/receipts.ts` و `lib/storage/resumes.ts` |
| Forms | react-hook-form + zod |
| Charts | recharts |
| Export | xlsx |
| Date | react-multi-date-picker (Jalali) — `components/ui/JalaliDatePicker.tsx` |
| QR | qrcode |

---

## ۲. مدل داده — Schema (`lib/db/schema.ts`) — ۳۰+ جدول

### قراردادهای کلیدی
- **پول:** همه‌جا `bigint({ mode: 'number' })` — تومان صحیح (نه ریال).
- **بهای واحد در انبار:** `numeric(24,6)` — گسترش‌یافته برای جلوگیری از سرریز عددی (hotfix v4.1).
- **تاریخ کاربری:** رشته‌ی شمسی (`text`)، مثلاً `'۱۴۰۳/۰۵/۱۲'`.
- **تاریخ سیستمی:** `timestamp with time zone` (میلادی، خودکار).
- **PK:** همه‌جا `uuid().defaultRandom()` — استثنا: `menu_settings.id = integer(1)`.
- **نوع/وضعیت:** ستون `text` با check، نه enum جدید (از ساخت `pgEnum` اضافه پرهیز می‌شود).
- **denormalization عمدی:** `branch_name`, `category_name` در تراکنش ذخیره می‌شوند.

### فهرست جداول

**هسته‌ی حسابداری (۱۳ جدول اصلی)**

| جدول | توضیح |
|---|---|
| `branches` | شعب |
| `users` | کاربران (role: text — `SuperAdmin`\|`BranchUser`\|`Warehouse`; permissions: jsonb) |
| `categories` | دسته‌بندی درآمد/هزینه |
| `transactions` | تراکنش‌ها (single-entry) — شامل `saleMeta` (jsonb) برای ردپای فروش منو |
| `notifications` | اعلان‌ها |
| `app_settings` | تنظیمات key/value |
| `audit_log` | لاگ اعمال (append-only) |
| `accounts` | صندوق/بانک |
| `contacts` | طرف‌حساب (نسیه) |
| `system_logs` | لاگ مرکزی سیستم |
| `menu_categories` | دسته‌بندی منو |
| `menu_items` | آیتم منو |
| `menu_settings` | تنظیمات منو (تک‌ردیفی) |

**پرسنل و حقوق (۶ جدول)**

| جدول | توضیح |
|---|---|
| `employees` | کارکنان (اطلاعات شخصی، بیمه، کارت بهداشت، حقوق پایه) |
| `employee_documents` | مدارک کارکنان (metadata — فایل در Supabase Storage) |
| `payroll_events` | مساعده/کسری/پاداش/تسویه |
| `payroll_parameters` | پارامترهای محاسبه (حداقل حقوق، نرخ بیمه، مالیات) |
| `payroll_runs` | اجراهای دوره‌ای حقوق (draft→calculated→approved→posted) |
| `payslips` | فیش حقوقی هر کارمند در هر اجرا |
| `journal_vouchers` | سند کل ناشی از posting حقوق (خطوط بدهکار/بستانکار در jsonb) |

**انبار و آشپزخانه (۷ جدول)**

| جدول | توضیح |
|---|---|
| `inv_items` | اقلام (خام `raw` / نیمه‌آماده `prep`) با موجودی دو لایه‌ای و WAC |
| `inv_recipes` | دستور پخت (سرفصل) |
| `inv_recipe_lines` | خطوط دستور پخت (مواد + ضریب بازدهی) |
| `inv_vouchers` | برگه‌های انبار (ورود/خروج/ضایعات/فروش/تولید/انبارگردانی) |
| `inv_voucher_lines` | خطوط برگه (شامل `expiryDate` برای ردیابی انقضا) |
| `inv_stock_tx` | لاگ حرکت موجودی (append-only — هر تأیید برگه یک رکورد) |
| `inv_daily_sales` | فروش روزانه تجمیعی (ناشی از backflushing منو) |

**استخدام (۱ جدول)**

| جدول | توضیح |
|---|---|
| `job_applications` | فرم‌های درخواست کار (از صفحه‌ی عمومی `/apply`) |

**مشتریان، وفاداری و رزرو (۷ جدول)**

| جدول | توضیح |
|---|---|
| `customers` | مشتریان (امتیاز، سطح، تعداد بازدید، مجموع خرید) |
| `loyalty_entries` | تاریخچه‌ی امتیاز (earn/redeem/adjust) — اتمیک با SQL مستقیم |
| `coupons` | کوپن‌های تخفیف (درصدی/مبلغی، محدودیت استفاده) |
| `coupon_redemptions` | استفاده از کوپن (قفل race-condition با unique record) |
| `feedback` | بازخورد مشتری (ستاره ۱–۵) |
| `tables` (export: `restaurantTables`) | میزهای رستوران |
| `reservations` | رزرواسیون (state machine: pending→confirmed→seated→...) |

---

## ۳. احراز هویت و مجوزها

### نقش‌ها (۳ تا)
- `SuperAdmin` — دسترسی کامل، همه‌ی شعب.
- `BranchUser` — محدود به شعبه‌ی `assigned_branch_id` خودش.
- `Warehouse` — انباردار، محدود به شعبه‌ی خودش، پیش‌فرضاً فقط به ماژول انبار دسترسی دارد.

### مدل مجوز (منبع: `lib/auth/permissions.ts`)
- **Section permissions:** هر کاربر می‌تواند `permissions: string[]` داشته باشد که مشخص می‌کند کدام بخش‌ها برایش فعال است. SuperAdmin همیشه به همه دسترسی دارد.
- **Capability permissions:** با پیشوند `cap:` — مثلاً `cap:inventory.approve`، `cap:inventory.viewCosts`.
- **به‌روزرسانی فوری:** middleware با کش کوتاه (`revalidate: 5s`) از `/api/auth/permissions` می‌خواند تا تغییر دسترسی بدون نیاز به logout فوری اعمال شود.

### Enforcement (سه لایه)
1. `middleware.ts` (Edge) — چک JWT + section access.
2. API routes — `requireSession()` / `requireAdmin()` / `canDo()`.
3. Client — نمایشی، نه امنیتی.

---

## ۴. منطق مالی کلیدی

### Single-entry (نه GL دوطرفه)
- مدل اصلی single-entry است: هر `transaction` یک رکورد با `type` (income/expense/transfer).
- برای حقوق: `journal_vouchers` سند متوازن دوطرفه را در `lines` (jsonb) نگه می‌دارد ولی در جدول مجزاست.

### اتمیک بودن موجودی
- `lib/db/balanceHelpers.ts`: `applyBalance`, `reverseBalance`, `applyContactBalance`, `reverseContactBalance`.
- فقط تراکنش `approved` روی موجودی اثر دارد.
- **PATCH immutability:** فیلدهای مالی پس از `approved` immutable‌اند — خطای 422.
- **DELETE atomic rollback:** حذف `approved` تراکنش، موجودی صندوق + طرف‌حساب + کسر انبار فروش منو را به‌صورت اتمیک معکوس می‌کند.

### اتصال انبار ↔ حسابداری (`lib/inventory/postToAccounting.ts`)
- تأیید برگه‌ی خرید (`in`): تراکنش هزینه + کسر صندوق.
- تأیید برگه‌ی فروش: تراکنش درآمد + افزایش صندوق.
- تأیید برگه‌ی ضایعات (`waste`): تراکنش هزینه (non-cash — بدون اثر روی صندوق).

### اتصال حقوق ↔ حسابداری (`lib/payroll/postToBasharaf.ts`)
- posting حقوق: ساخت `journal_voucher` + تراکنش هزینه‌ی خالص پرداختی در هسته.

### Backflushing منو
- تأیید تراکنش درآمد از فروش منو: مواد مصرفی بر اساس دستور پخت به‌صورت خودکار از انبار کسر می‌شوند + سند COGS.

### WAC (Weighted Average Cost)
- هر تأیید رسید خرید `avg_cost_per_base` را بازمحاسبه می‌کند.
- `computeAutoRecost` پس از تأیید خرید، بهای نیمه‌آماده‌های متأثر را به‌صورت اتمیک بازمحاسبه می‌کند.

---

## ۵. API Routes (مسیرهای کامل)

### هسته
| مسیر | متدها |
|---|---|
| `/api/auth/login,logout,me,change-password,permissions` | POST/GET |
| `/api/transactions` | GET, POST |
| `/api/transactions/[id]` | GET, PATCH, DELETE |
| `/api/transactions/[id]/approve,reject` | POST |
| `/api/transactions/import` | POST |
| `/api/transactions/import/template` | GET |
| `/api/accounts`, `/api/accounts/[id]`, `/api/accounts/[id]/ledger` | CRUD + GET |
| `/api/accounts/recalculate` | POST |
| `/api/contacts`, `/api/contacts/[id]` | CRUD |
| `/api/categories`, `/api/categories/[id]` | CRUD |
| `/api/branches`, `/api/branches/[id]` | CRUD |
| `/api/users`, `/api/users/[id]` | CRUD |
| `/api/notifications` | GET, PATCH |
| `/api/reports` | GET |
| `/api/settings` | GET, PATCH |
| `/api/settings/wipe` | POST (Factory Reset — SuperAdmin فقط) |
| `/api/export` | GET/POST |
| `/api/upload` | POST |
| `/api/audit` | GET |
| `/api/logs` | GET, DELETE |
| `/api/dashboard` | GET |

### منو
| مسیر | متدها |
|---|---|
| `/api/menu` | GET (عمومی) |
| `/api/menu/items`, `/api/menu/items/[id]` | POST, PATCH, DELETE |
| `/api/menu/categories`, `/api/menu/categories/[id]` | POST, PATCH, DELETE |
| `/api/menu/settings` | PATCH |

### انبار
| مسیر | متدها |
|---|---|
| `/api/inventory/items`, `/api/inventory/items/[id]` | GET, POST, PATCH |
| `/api/inventory/items/import` | POST |
| `/api/inventory/items/import/template` | GET |
| `/api/inventory/recipes`, `/api/inventory/recipes/[id]` | CRUD |
| `/api/inventory/recipes/[id]/costing` | GET |
| `/api/inventory/vouchers`, `/api/inventory/vouchers/[id]` | CRUD |
| `/api/inventory/vouchers/[id]/approve,reject` | POST |
| `/api/inventory/vouchers/import` | POST |
| `/api/inventory/vouchers/import/template` | GET |
| `/api/inventory/produce` | POST |
| `/api/inventory/stocktake` | POST |
| `/api/inventory/forecast` | GET |

### پرسنل و حقوق
| مسیر | متدها |
|---|---|
| `/api/employees`, `/api/employees/[id]` | CRUD |
| `/api/payroll/events`, `/api/payroll/events/[id]` | CRUD |
| `/api/payroll/runs`, `/api/payroll/runs/[id]` | GET, POST |
| `/api/payroll/runs/[id]/calculate,approve,post` | POST |

### استخدام
| مسیر | متدها |
|---|---|
| `/api/recruitment`, `/api/recruitment/[id]` | CRUD |
| `/api/recruitment/questions` | GET |
| `/api/recruitment/upload` | POST |

### مشتریان و رزرو
| مسیر | متدها |
|---|---|
| `/api/customers`, `/api/customers/[id]` | CRUD |
| `/api/coupons`, `/api/coupons/[id]`, `/api/coupons/validate` | CRUD + POST |
| `/api/feedback`, `/api/feedback/summary` | GET, POST |
| `/api/tables`, `/api/tables/[id]` | CRUD |
| `/api/reservations`, `/api/reservations/[id]` | CRUD |

---

## ۶. صفحات UI (`app/(app)/`)

| مسیر | ماژول |
|---|---|
| `/dashboard` | داشبورد |
| `/transactions`, `/transactions/new` | تراکنش‌ها + ثبت جدید |
| `/accounts`, `/accounts/[id]` | صندوق‌ها + گردش حساب |
| `/contacts` | طرف‌حساب‌ها |
| `/reports` | گزارش مالی (اعداد خالص) |
| `/employees` | پرسنل |
| `/payroll` | حقوق و دستمزد |
| `/inventory` | انبار و آشپزخانه |
| `/menu` | مدیریت منو |
| `/recruitment` | استخدام |
| `/customers` | مشتریان + وفاداری + FeedbackSummaryCard |
| `/reservations` | رزرواسیون |
| `/coupons` | کوپن‌ها |
| `/logs` | لاگ سیستم (SuperAdmin) |
| `/settings` | تنظیمات (تب‌بندی شده) |

**صفحات خارج از app:**
- `/m` — منوی دیجیتال عمومی (بدون auth)
- `/apply` — فرم درخواست کار عمومی (بدون auth)
- `/login`, `/signup`, `/forgot` — احراز هویت

---

## ۷. State — Zustand Slices (`store/slices/`)

18 slice:
`authSlice`, `transactionsSlice`, `usersSlice`, `refsSlice`, `accountsSlice`,
`contactsSlice`, `menuSlice`, `notificationsSlice`, `appSettingsSlice`,
`preferencesSlice` (persist), `uiSlice`,
`employeesSlice`, `payrollSlice`, `recruitmentSlice`,
`customersSlice`, `couponsSlice`, `reservationsSlice`, `feedbackSlice`.

فقط `preferencesSlice` در localStorage persist می‌شود.

---

## ۸. Migration و دیتابیس

**فایل‌های SQL فعلی (idempotent):**
- `db-setup.sql` — کل ساختار هسته‌ی اولیه (۱۳ جدول).
- `db-seed.sql` — داده اولیه (۳ شعبه، ۴ کاربر، ۹ دسته، ۳ صندوق).
- `db-inventory-migration.sql` — جداول انبار.
- `db-payroll-migration.sql` — جداول حقوق و پرسنل.
- `db-stage-payroll-full.sql` — نسخه‌ی کامل payroll برای staging.
- `customers-migration.sql` — جداول مشتریان/وفاداری/رزرو/کوپن.
- `supabase-v5-menu-sale-deduction-migration.sql` — ستون `sale_meta`.
- `supabase-v6-waste-expiry-migration.sql` — `expiry_date` روی خطوط برگه.
- `supabase-v7-bigint-migration.sql` — گسترش `numeric(18,6)` → `numeric(24,6)` برای بهای واحد.
- `db-role-to-text.sql` — مهاجرت از enum به text برای `user_role`.
- `fix-categories.sql` — اصلاح دسته‌بندی‌ها.
- `supabase-logs-migration.sql` — فقط جدول `system_logs` (برای دیتابیس‌های موجود).

**آرشیو:** فایل‌های قدیمی پراکنده در `migrations-archive/`.

**توجه:** seed آیتم‌های منو (۳۱ آیتم) فقط در `supabase-v4-menu-migration.sql` آرشیوی هست — در `db-setup.sql` جدید نیست.

---

## ۹. قابلیت‌های کامل (تأییدشده)

- احراز هویت JWT، RBAC سه‌لایه (SuperAdmin/BranchUser/Warehouse)، rate-limit ورود.
- مدل مجوز گرانولار section + capability با به‌روزرسانی فوری در middleware.
- CRUD کامل برای همه‌ی ماژولها.
- موجودی اتمیک (apply/reverse)، گردش حساب، بازسازی موجودی.
- PATCH immutability روی فیلدهای مالی پس از تأیید.
- DELETE atomic rollback (برگشت کامل موجودی + انبار + COGS).
- VAT، تراکنش نسیه، گزارش aggregate، خروجی Excel.
- سیستم انبار با WAC + recipe explosion + backflushing + waste GL.
- سیستم حقوق با محاسبه‌ی اتوماتیک بیمه/مالیات + posting به GL.
- فرم درخواست کار عمومی + مدیریت استخدام.
- CRM وفاداری (امتیاز اتمیک) + کوپن (race-condition safe) + رزرواسیون (state machine).
- Factory Reset با عبارت تأییدی سخت (`POST /api/settings/wipe`).
- منوی دیجیتال + QR، PWA، Realtime، آپلود رسید.
- سیستم لاگ مرکزی (`/logs`).

---

## ۱۰. باگ‌های شناخته‌شده / TODOهای باز

- **`/api/_diag` endpoint موقت** — اگر هنوز در کد هست، قبل از production باید حذف شود (اطلاعات اتصال را افشا می‌کند).
- **GL دوطرفه کامل** — `journal_vouchers` فقط برای حقوق وجود دارد؛ هسته still single-entry.
- **FIFO انبار** — `expiryDate` ثبت می‌شود ولی موتور WAC هنوز FIFO نیست.
- **منو → POS/فروش** — منو فقط کاتالوگ است؛ هیچ تراکنش مالی مستقیم از منو ساخته نمی‌شود (backflushing فقط از تراکنش income دستی فعال می‌شود).
- **Password reset با ایمیل** — پیاده‌سازی نشده.
- **Rate-limit در حافظه** — در محیط multi-instance سراسری نیست.
- **Seed منو خالی** — روی دیتابیس تازه آیتم‌های منو نیاز به ورود دستی دارند.
- **Realtime و Storage** — به Supabase گره خورده‌اند؛ روی هاست خالص بدون Supabase کار نمی‌کنند.

---

## ۱۱. وابستگی‌های کلیدی

| بسته | نسخه | نکته |
|---|---|---|
| `next` | `14.2.15` | App Router |
| `react` | `^18.3.1` | |
| `typescript` | `^5.6.3` | strict |
| `drizzle-orm` | `^0.36.1` | |
| `postgres` | `^3.4.5` | درایور خام |
| `@supabase/supabase-js` | `^2.45.4` | فقط Realtime + Storage |
| `jose` | `^5.9.6` | JWT |
| `bcryptjs` | `^2.4.3` | hashing |
| `zustand` | `^4.5.5` | |
| `zod` | `^3.23.8` | |
| `recharts` | `^3.8.1` | |
| `xlsx` | `^0.18.5` | |
| `qrcode` | `^1.5.4` | |
| `react-multi-date-picker` | `^4.5.2` | Jalali — هنوز در پروژه |
| `@types/file-saver` | — | وابستگی یتیم (خود `file-saver` نصب نیست) |

---

## پروتکل تحویل بین نشست‌ها

> هر نشست AI که پیش از خاتمه تغییراتی انجام داده، این فایل را با موارد زیر به‌روز کند:
> - نسخه‌ی جدید، بخش‌های تغییریافته.
> - فایل‌های ایجاد/ویرایش‌شده (مسیر کامل).
> - قرارداد یا الگوی جدید.
> - وضعیت build/tsc.
> - کارهای ناتمام.
