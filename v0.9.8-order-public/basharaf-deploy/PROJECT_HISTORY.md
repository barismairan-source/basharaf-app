# تاریخچه پروژه — سامانه حسابداری «با شرف»

**نسخه:** `basharaf demo 0.1`
**تاریخ انتشار:** خرداد ۱۴۰۵
**مخزن:** https://github.com/barismairan-source/basharaf-app
**آدرس live:** https://basharaff.vercel.app

---

## درباره پروژه

«با شرف» یک سامانه حسابداری چندشعبه‌ای برای رستوران‌ها است. هدف اصلی: مدیریت درآمد و هزینه چند شعبه به‌صورت یکپارچه، با تفکیک دسترسی بین مدیر کل و کاربران هر شعبه.

**استک فنی نهایی:**
Next.js 14 App Router · TypeScript strict · Tailwind CSS RTL · Zustand · Drizzle ORM · PostgreSQL (Supabase) · bcryptjs · jose JWT · Recharts · @supabase/supabase-js

---

## فازهای توسعه

---

### فازهای ۱–۳ — پایه‌گذاری (Foundation)

**محتوا:**
- راه‌اندازی پروژه Next.js 14 با TypeScript strict
- تنظیم Tailwind CSS با پشتیبانی کامل RTL فارسی
- طراحی سیستم فونت Vazirmatn (local، بدون Google Fonts)
- تعریف types پایه: `Transaction`, `User`, `Branch`, `Category`
- پیاده‌سازی Zustand store با slice pattern

**تصمیمات معماری:**
- استفاده از `discriminated union` برای `Transaction` (pending/approved/rejected) به‌جای optional fields
- تعریف تمام رنگ‌ها در `lib/colors.ts` برای consistency
- RTL-first layout: همه spacing و alignment از ابتدا برای فارسی طراحی شد

---

### فازهای ۴–۵ — Auth + App Shell

**محتوا:**
- طراحی صفحه login با panel چپ (brand) و راست (فرم)
- پیاده‌سازی middleware برای protected routes
- Sidebar با navigation و RBAC-aware لینک‌ها
- Header با notification bell و user menu
- Mobile-responsive با hamburger menu

**تصمیمات:**
- Client-side session ساده در این فاز (upgrade در فاز ۱۰)
- RouterGuard component برای لایه حفاظت UI

---

### فازهای ۶–۷ — Dashboard + تراکنش‌ها

**محتوا:**
- Dashboard با KPI cards (موجودی، درآمد، هزینه، pending)
- Sparkline charts در KPI cards
- صفحه لیست تراکنش‌ها با فیلتر و جستجو
- فرم ثبت تراکنش جدید با Jalali date picker
- جریان تایید/رد (Approval Workflow):
  - `BranchUser` → ثبت با وضعیت pending
  - `SuperAdmin` → ثبت با تایید فوری
  - `SuperAdmin` → approve/reject با دلیل

**workflow تایید:**
```
BranchUser ثبت     → status: 'pending'
SuperAdmin ثبت     → status: 'approved' (فوری)
SuperAdmin approve → pending → approved
SuperAdmin reject  → pending → rejected + rejectionReason
```

---

### فاز ۸ — Settings (5 پنل)

**محتوا:**
- پنل Profile — ویرایش نام و ایمیل
- پنل Preferences — تنظیمات UI
- پنل Team — مدیریت کاربران (فقط SuperAdmin)
- پنل Branches — مدیریت شعب
- پنل Categories — دسته‌بندی درآمد/هزینه

---

### فاز ۹ — Polish + localStorage Demo

**محتوا:**
- داده‌های نمونه (seed) با localStorage برای demo
- بهبود UX و انیمیشن‌ها
- Error boundaries
- Toast notifications
- Empty states
- Detail panel برای تراکنش‌ها

**نکته:** این فاز یک نسخه demo بود. از فاز ۱۰ به‌بعد، backend واقعی جایگزین شد.

---

### فاز ۱۰ — Backend (PostgreSQL + JWT)

**بزرگترین فاز — تبدیل demo به production**

**محتوا:**

**Database:**
- Drizzle ORM با PostgreSQL (Supabase)
- ۵ جدول: `users`, `branches`, `categories`, `transactions`, `notifications`
- Foreign keys، indexes، و constraints کامل
- `bigint` برای مبالغ (بدون float precision error)

**Authentication:**
- bcryptjs برای hash رمز (cost factor 10)
- jose JWT (HS256، ۳۰ روز)
- httpOnly + Secure cookie
- Edge-compatible middleware

**API (17 endpoint):**
```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/transactions        (با RBAC scope)
POST   /api/transactions
GET    /api/transactions/[id]
PATCH  /api/transactions/[id]
DELETE /api/transactions/[id]
POST   /api/transactions/[id]/approve
POST   /api/transactions/[id]/reject
GET/POST   /api/users
PATCH/DELETE /api/users/[id]
GET/POST   /api/branches
PATCH/DELETE /api/branches/[id]
GET/POST   /api/categories
PATCH/DELETE /api/categories/[id]
GET/PATCH  /api/notifications
```

**RBAC — 4 لایه دفاع:**
| لایه | کجا | چه می‌کند |
|------|-----|-----------|
| Database | constraints و FK | integrity |
| Server API | requireSession/requireAdmin | authorization |
| Middleware | Edge JWT verify | redirect |
| Client UI | RouterGuard + rbac.ts | conditional render |

**Deployment:**
- Vercel (Next.js) + Supabase (PostgreSQL)
- فونت Vazirmatn local (Google Fonts مسدود در ایران)
- Lazy DB connection (no error at build time without DATABASE_URL)

---

### فاز ۱۱ — Optimistic UI

**مشکل:** هر عملیات (approve، delete، create) یک spinner نشان می‌داد و کاربر باید ۱۵۰-۲۰۰ms صبر می‌کرد.

**راه‌حل — Optimistic Updates:**
```
کاربر approve می‌زند
  ↓ فوری: UI را approved نشان می‌دهد
  ↓ background: API call
  ↓ موفق: sync با داده server
  ↓ خطا: rollback به pending + toast
```

**Slices آپدیت‌شده:**
- `transactionsSlice`: approve/reject/delete/create همه optimistic
- `usersSlice`: create/delete optimistic
- `refsSlice`: branches/categories create/delete optimistic

---

### فاز ۱۲ — Dynamic Content

**مشکل:** عنوان login، متن‌های UI، و پیام‌های برند hardcode بودند.

**محتوا:**
- جدول `app_settings` (key/value store در DB)
- API `/api/settings` (GET/PATCH)
- `appSettingsSlice` در Zustand با `useSetting(key, fallback)` hook
- صفحه login متن‌ها را از DB می‌خواند
- تب «متن‌های سامانه» در Settings (فقط SuperAdmin)
- Optimistic update — تغییر فوری در UI، سپس save به DB

---

### فاز ۱۳ — گزارش مالی + Export

**محتوا:**
- صفحه `/reports` با:
  - ۳ KPI card (درآمد/هزینه/موجودی)
  - نمودار Bar ماهانه (Recharts)
  - نمودار Line روند موجودی
  - جدول مقایسه شعب
  - جدول عملکرد کارکنان
- Export به Excel (xlsx) با فرمت فارسی
- Export به CSV با BOM (برای نمایش صحیح فارسی در Excel ویندوز)
- API `/api/export` با فیلترهای کامل

---

### فاز ۱۴ — Real-time

**مشکل:** اگر دو کاربر همزمان کار می‌کردند، تغییرات را نمی‌دیدند مگر صفحه را refresh کنند.

**محتوا:**
- Supabase Realtime با WebSocket
- Subscribe به `transactions` (INSERT/UPDATE/DELETE)
- Subscribe به `notifications` (INSERT)
- `RealtimeIndicator` در header (dot سبز = متصل)
- Graceful fallback — اگر env vars نداشته باشد، silent disable

**نتیجه:** تراکنش جدید، approve، و اعلان‌ها بلافاصله برای همه کاربران نمایش داده می‌شوند.

---

### فاز ۱۵ — امنیت Production-Ready

**محتوا:**

**Rate Limiting:**
- ۵ تلاش ناموفق در ۱۵ دقیقه → بلاک ۳۰ دقیقه
- Timing-safe login (bcrypt حتی برای email نادرست اجرا می‌شود)

**تغییر رمز واقعی:**
- API `/api/auth/change-password`
- نیاز به رمز فعلی، validation قوی (۸+ کاراکتر، حرف و عدد)

**Audit Log:**
- جدول `audit_log` در DB
- ثبت: login/logout، approve/reject، password change، delete
- تب «امنیت» در Settings — آمار و لاگ برای SuperAdmin

**Security Headers:**
```
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security (production)
```

---

### فاز ۱۶ — آپلود فایل رسید

**محتوا:**
- Supabase Storage bucket `receipts` (public)
- API `/api/upload` (POST/DELETE) با service_role key
- کامپوننت `ReceiptUploader`:
  - Drag & Drop یا کلیک
  - Preview تصویر inline
  - Progress bar
  - مشاهده، تغییر، حذف
- RBAC: فقط صاحب تراکنش یا SuperAdmin
- فرمت مجاز: JPG، PNG، WebP، PDF (حداکثر ۵MB)

---

### فاز ۱۷ — صندوق‌ها و انتقال وجه

**محتوا:**

**Database:**
- جدول `accounts` (صندوق‌های نقدی و حساب‌های بانکی)
- فیلدهای جدید در `transactions`: `account_id`, `destination_account_id`
- نوع جدید transaction: `transfer` (انتقال وجه)

**منطق موجودی:**
```
income  → +amount به account_id
expense → -amount از account_id
transfer → -amount از account_id
          +amount به destination_account_id
```

**UI:**
- صفحه `/accounts` — dashboard موجودی همه حساب‌ها
- فرم تراکنش — dropdown صندوق مبدا و مقصد
- بعد از approve، موجودی فوری آپدیت می‌شود
- لینک «صندوق‌ها» در Sidebar

**Bug Fixes همراه این فاز:**
- BigInt serialization error (500) — رفع شد
- Transfer enum در schema اضافه شد
- Password در createUser به API پاس می‌شود (نه hardcode)
- Sync موجودی حساب بعد از approve در store

---

## آمار نهایی (demo 0.1)

| آیتم | تعداد |
|------|-------|
| API Endpoints | ۲۱ |
| صفحات | ۸ |
| Zustand Slices | ۸ |
| جداول DB | ۷ |
| کامپوننت‌ها | ۵۰+ |
| فایل‌های TypeScript | ~۱۰۰ |

---

## تصمیمات معماری کلیدی

**چرا Zustand به‌جای Redux؟**
سبک‌تر، boilerplate کمتر، slice pattern برای modular state، و ساده‌تر برای تیم‌های کوچک.

**چرا Drizzle به‌جای Prisma؟**
Type-safe بودن query ها در زمان کامپایل، lightweight تر، و سازگاری بهتر با Edge runtime.

**چرا Supabase به‌جای Liara Postgres؟**
Realtime built-in، Storage built-in، dashboard visual برای SQL editor، و دسترسی از ایران.

**چرا local font به‌جای Google Fonts؟**
Google Fonts در ایران مسدود است و build در Liara/Vercel با موقعیت ایران fail می‌کند.

**چرا Optimistic UI؟**
Supabase Frankfurt → ایران: ~۱۵۰-۲۰۰ms latency. بدون optimistic، هر عملیات یک spinner اضافه داشت.

---

## محدودیت‌های نسخه demo 0.1

- **Email verification** وجود ندارد (در production باید اضافه شود)
- **Rate limiting** in-memory است (در serverless multi-instance کار نمی‌کند — نیاز به Redis)
- **Password reset** واقعی ندارد (فقط تغییر رمز برای کاربران login‌شده)
- **Session revocation** نیست (logout از همه دستگاه‌ها)
- **Backup خودکار** تنظیم نشده (Supabase دارد ولی فعال نشده)
- نمودار گزارش از localStorage (client-side) محاسبه می‌شود نه از DB aggregate

---

## راهنمای Deploy

### پیش‌نیازها
1. حساب [Supabase](https://supabase.com) با project active
2. حساب [Vercel](https://vercel.com) متصل به GitHub
3. Repository: `github.com/barismairan-source/basharaf-app`

### مراحل
1. SQL migrations را در Supabase SQL Editor اجرا کنید (به ترتیب)
2. Storage bucket `receipts` را بسازید (public)
3. Environment variables را در Vercel تنظیم کنید
4. Push به GitHub → Vercel خودکار deploy می‌کند

### Environment Variables
```
DATABASE_URL                   Connection string (Transaction pooler, port 6543)
DATABASE_SSL                   require
JWT_SECRET                     رشته تصادفی ۳۲+ کاراکتری
NEXT_PUBLIC_APP_URL            https://basharaff.vercel.app
NEXT_PUBLIC_SUPABASE_URL       https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY  anon/public key
SUPABASE_URL                   https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY      service_role key (فقط server-side)
```

---

## اعتبارات ورود (بعد از seed)

| ایمیل | نقش | رمز پیش‌فرض |
|-------|------|------------|
| admin@basharaf.app | مدیر کل | basharaf123 |
| mehdi@basharaf.app | کاربر شعبه اصلی | basharaf123 |
| narges@basharaf.app | کاربر شعبه تجریش | basharaf123 |
| sara@basharaf.app | کاربر شعبه یوسف‌آباد | basharaf123 |

⚠ **رمزهای پیش‌فرض را بعد از اولین login تغییر دهید.**

---

*«با شرف» — حسابداری شعب، ساده و یکجا*

---

### فاز ۱۸ — نسخه ۰.۳ (Performance + Mobile + Search)

**نسخه:** `basharaf-demo-0.3`

#### Server-Side Report Aggregation
- **قبل:** گزارش همه تراکنش‌های raw را fetch می‌کرد و در browser محاسبه می‌کرد → با هزاران تراکنش crash
- **بعد:** API `/api/reports` با Drizzle `sql` operator: `SUM`, `COUNT`, `GROUP BY` در PostgreSQL
- ۵ query اجرا می‌شود: KPI totals، ماهانه، شعب، دسته، کاربران
- Client فقط داده‌های خلاصه‌شده دریافت می‌کند

#### جستجو و فیلتر شمسی
- جستجوی متنی: عنوان، طرف معامله، دسته، مبلغ
- فیلتر تاریخ شمسی با الگوریتم تبدیل Jalali→Gregorian بدون dependency خارجی
- فیلتر نوع، وضعیت، شعبه، مرتب‌سازی — همه ترکیبی

#### Print View
- دکمه «چاپ» در گزارشات و لیست تراکنش‌ها
- Tailwind print modifiers: `print:hidden`, `print:block`
- فرمت A4 با margin مناسب
- رنگ‌های سازگار با چاپ

#### Mobile-First Layout
- Sidebar → Drawer در موبایل (< lg)
- Hamburger menu با animation
- Overlay برای بستن drawer
- Route change → drawer auto-close
- Body scroll lock هنگام باز بودن drawer
- لیست تراکنش‌ها → Card layout در موبایل (به‌جای جدول)
- همه touch targets حداقل ۴۴x۴۴px
- جداول با `overflow-x-auto` و `min-w` مناسب

---

### فاز ۱۹ — نسخه ۰.۴ (مالیات + بدهکاران + دفتر کل)

**نسخه:** `basharaf-demo-0.4`

#### مالیات ارزش افزوده (۱۰٪ امسال)
- فیلد `vat_amount` در تراکنش‌ها
- نرخ مالیات قابل تنظیم در `app_settings` (پیش‌فرض ۱۰٪)
- محاسبه خودکار در فرم: مبلغ مالیات + جمع کل به‌صورت زنده نمایش داده می‌شود
- checkbox «احتساب مالیات ارزش افزوده»

#### بدهکاران و بستانکاران (طرف‌حساب‌ها)
- جدول `contacts` با انواع: مشتری، تأمین‌کننده، سایر
- صفحه `/contacts` با خلاصه «طلب ما» و «بدهی ما»
- balance هر طرف‌حساب: مثبت = بدهکار به ما، منفی = طلبکار از ما
- پشتیبانی از تراکنش نسیه (`is_credit`):
  - فروش نسیه → مشتری بدهکار می‌شود
  - خرید نسیه → ما بدهکار می‌شویم
- منطق در `applyContactBalance`/`reverseContactBalance`

#### دفتر کل حساب (Account Ledger)
- صفحه `/accounts/[id]` — گردش کامل هر صندوق
- مانده‌ی متحرک (running balance) برای هر تراکنش
- ورود/خروج با رنگ و آیکن مجزا
- قابل چاپ
- کلیک روی موجودی صندوق → دفتر کل

#### اصلاحات یکپارچگی موجودی (از v0.3.1)
- حذف تراکنش approved → balance برمی‌گردد
- ویرایش مبلغ → balance تنظیم می‌شود (معکوس قدیم + اعمال جدید)
- دکمه «بازسازی موجودی» در صفحه صندوق‌ها
- validation انتقال وجه (مبدا ≠ مقصد، هر دو الزامی)

---

### فاز ۲۰ — نسخه ۰.۵ (ماژول منوی دیجیتال صفاسیتی)

**نسخه:** `basharaf-demo-0.5`

#### ادغام ماژول منو
ماژول منوی دوزبانه (FA/EN) که قبلاً با Supabase client مستقل بود، کاملاً
بازنویسی و با معماری اصلی یکپارچه شد:
- **لایه داده:** از Supabase JS client → **Drizzle ORM**
- **احراز هویت:** از Supabase Auth → **JWT خودی** (SuperAdmin)
- **state:** از useState پراکنده → **menuSlice در Zustand**
- **قیمت:** از numeric → **bigint** (هماهنگ با کل سیستم، تومان صحیح)

#### جداول جدید
- `menu_categories` — دسته‌های منو (پیش‌غذا، غذای اصلی، دسر)
- `menu_items` — آیتم‌ها با عنوان/توضیح دوزبانه، قیمت، موجودی
- `menu_settings` — تنظیمات تک‌ردیفی (فونت، تماس، اینستاگرام)

#### صفحات
- `/m` — منوی عمومی (بدون نیاز به login، برای QR و مشتری)
  - دوزبانه با دکمه شناور تغییر زبان
  - فونت فارسی قابل انتخاب توسط ادمین
  - گروه‌بندی بر اساس دسته، نمایش حالت ناموجود
- `/menu` — پنل ادمین (فقط SuperAdmin)
  - سه تب: آیتم‌ها، دسته‌ها، تنظیمات
  - CRUD کامل + toggle موجودی
  - لینک مشاهده منوی عمومی

#### API
- `GET /api/menu` — منوی کامل (عمومی)
- `POST/PATCH/DELETE /api/menu/items` — مدیریت آیتم
- `POST/PATCH/DELETE /api/menu/categories` — مدیریت دسته
- `PATCH /api/menu/settings` — تنظیمات

#### نکته معماری
منو فعلاً **تراکنش مالی نمی‌سازد** (کاتالوگ نمایشی). برای تبدیل به POS در
آینده، نیاز به جداول `orders`/`order_items` و اتصال به `transactions` است
که نقشه راهش در INTEGRATION.md آمده.

#### فونت‌ها
۵ فونت فارسی منو (NeveshtFaNum، IRANMarker، HastiHeavy، BlockFD) + Gochi Hand
لاتین به `public/fonts/` اضافه شد. CSS منو scoped است (فقط `/m` را تحت تأثیر
قرار می‌دهد، نه پنل حسابداری).
