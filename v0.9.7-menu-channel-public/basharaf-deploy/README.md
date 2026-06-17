# با شرف — سامانه حسابداری شعب

سامانه‌ی چندشعبه‌ای حسابداری برای رستوران با Postgres backend واقعی، authentication با JWT، و RBAC سختگیرانه.

---

## استک فنی

| لایه | فناوری |
|---|---|
| فریم‌ورک | Next.js 14 (App Router) |
| زبان | TypeScript strict |
| استایل | Tailwind CSS + tailwindcss-rtl |
| State | Zustand + persist (preferences) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | bcryptjs + jose (JWT امضاشده) |
| فرم | React Hook Form + Zod |
| فونت | Vazirmatn |
| تاریخ | react-multi-date-picker (Jalali) |

---

## اجرای محلی (development)

### ۱. نصب Postgres محلی

اگر روی Mac:
```bash
brew install postgresql@16
brew services start postgresql@16
createdb basharaf
```

روی Linux:
```bash
sudo apt install postgresql
sudo -u postgres createdb basharaf
```

روی Windows: از [postgresql.org](https://www.postgresql.org/download/windows/) نصب کنید.

### ۲. تنظیم env

```bash
cp .env.example .env.local
```

سپس `.env.local` را ویرایش کنید:

```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/basharaf
DATABASE_SSL=false
JWT_SECRET=any-long-random-string-at-least-32-chars
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

برای تولید JWT_SECRET:
```bash
openssl rand -base64 32
```

### ۳. نصب وابستگی‌ها و migration

```bash
npm install
npm run db:push    # ساخت جدول‌ها
npm run db:seed    # داده‌های نمونه
```

### ۴. اجرا

```bash
npm run dev
```

روی [http://localhost:3000](http://localhost:3000) باز کنید.

**کاربران نمونه:**

| ایمیل | نقش | رمز |
|---|---|---|
| admin@basharaf.app | مدیر کل | basharaf123 |
| mehdi@basharaf.app | کاربر شعبه اصلی | basharaf123 |
| narges@basharaf.app | کاربر شعبه تجریش | basharaf123 |

⚠ **این رمزها فقط برای اولین login هستند.** بعد از login، از طریق Settings → Profile رمز را تغییر دهید (در فاز بعدی فعال می‌شود).

---

## آپلود روی Liara — پیشنهادی برای ایران

Liara بومی ایران است، بدون نیاز به VPN، با Postgres managed.

### مرحله ۱: نصب Liara CLI

```bash
npm install -g @liara/cli
liara login
```

### مرحله ۲: ساخت database

```bash
liara db:create
# پلتفرم: postgresql
# نام: basharaf-db
# پلن: free (یا متناسب با نیاز)
```

پس از ساخت، اطلاعات اتصال نمایش داده می‌شود — connection string را کپی کنید.

### مرحله ۳: ساخت app

```bash
cd basharaf-app
liara create
# پلتفرم: nextjs
# نام: basharaf-app  (یا هر اسمی که می‌خواهید)
```

### مرحله ۴: تنظیم env vars

از طریق Liara dashboard ([console.liara.ir](https://console.liara.ir)):

```
DATABASE_URL=<connection-string از مرحله ۲>
DATABASE_SSL=require
JWT_SECRET=<یک رشته تصادفی ۳۲+ کاراکتری>
NEXT_PUBLIC_APP_URL=https://YOUR-APP.liara.run
```

### مرحله ۵: Deploy

```bash
liara deploy
```

ظرف ۲-۳ دقیقه روی URL مانند `basharaf-app.liara.run` خواهد بود.

### مرحله ۶: اجرای migration روی production

اولین بار باید schema روی DB ساخته شود:

```bash
# با URL production:
DATABASE_URL='<your-production-url>' DATABASE_SSL=require npm run db:push

# و seed:
DATABASE_URL='<your-production-url>' DATABASE_SSL=require npm run db:seed
```

⚠ بعد از seed، **حتماً** کاربران را از طریق UI ویرایش کنید و رمزشان را تغییر دهید.

---

## ساختار پروژه

```
basharaf-app/
├── app/
│   ├── (auth)/                       صفحات auth
│   │   ├── login/                    POST /api/auth/login
│   │   ├── signup/                   visual only — admin از Settings می‌سازد
│   │   └── forgot/                   visual only (فاز آینده)
│   ├── (app)/                        صفحات اصلی
│   │   ├── dashboard/
│   │   ├── transactions/
│   │   └── settings/
│   ├── api/                          ⭐ Server endpoints (فاز ۱۰)
│   │   ├── auth/{login,logout,me}/
│   │   ├── transactions/[id]/{approve,reject}/
│   │   ├── users/[id]/
│   │   ├── branches/[id]/
│   │   ├── categories/[id]/
│   │   └── notifications/
│   └── layout.tsx
├── components/
│   ├── ui/                           Atoms
│   ├── layout/                       Shell (Sidebar, Header, ...)
│   ├── dashboard/
│   ├── transactions/
│   ├── settings/
│   └── auth/SessionSync.tsx          Bootstrap داده از API
├── lib/
│   ├── db/                           ⭐ Drizzle (فاز ۱۰)
│   │   ├── schema.ts                 PostgreSQL schema
│   │   ├── client.ts                 Connection pool
│   │   ├── migrate.ts                Migration runner
│   │   └── seed.ts                   Seed script
│   ├── auth/                         ⭐ Server auth (فاز ۱۰)
│   │   ├── password.ts               bcrypt hash/verify
│   │   ├── jwt.ts                    jose sign/verify
│   │   └── session.ts                requireSession/requireAdmin
│   ├── repos/
│   │   ├── api.ts                    ⭐ fetch-based (فاز ۱۰)
│   │   ├── local.ts                  in-memory (legacy فاز ۹)
│   │   └── index.ts                  swap point
│   ├── api-error.ts                  ⭐ Standardized errors
│   ├── rbac.ts
│   ├── utils.ts
│   └── ...
├── store/
│   ├── index.ts                      ⭐ bootstrap from API
│   └── slices/
├── drizzle/
│   ├── migrations/                   SQL files
│   └── ...
├── middleware.ts                     ⭐ JWT verification
├── drizzle.config.ts
├── liara.json
└── .env.example
```

---

## دستورات

```bash
npm run dev          # توسعه با hot-reload
npm run build        # build production
npm run start        # اجرای production build
npm run type-check   # tsc --noEmit
npm run lint         # ESLint

# Database
npm run db:push      # schema را مستقیماً به DB اعمال کن (dev)
npm run db:generate  # تولید SQL migration بر اساس تغییرات schema
npm run db:migrate   # اجرای migrations روی production DB
npm run db:seed      # داده‌های اولیه
npm run db:studio    # UI ادیتور database (Drizzle Studio)
```

---

## امنیت در فاز ۱۰

### چه چیزی پیاده شده

- ✅ Password hashing با bcrypt (cost factor 10)
- ✅ JWT امضاشده با HS256
- ✅ Cookie httpOnly + Secure (در production) + SameSite=Lax
- ✅ Middleware Edge-compatible JWT verification
- ✅ RBAC در ۴ لایه: data scope, UI, route guard, server API
- ✅ Reference integrity در FK constraints سطح DB
- ✅ Email enumeration protection در login (پیام یکسان برای ایمیل/رمز نادرست)

### چه چیزی هنوز نیست (آینده)

- ⚠ Rate limiting روی login (پیش‌نیاز: Redis یا Upstash)
- ⚠ Email verification برای signup
- ⚠ Password reset واقعی (نیاز به email provider)
- ⚠ 2FA / TOTP
- ⚠ Session revocation (logout همه session ها)
- ⚠ Audit log برای admin actions
- ⚠ Backup خودکار database

برای production جدی، حداقل rate limiting و backup خودکار را اضافه کنید.

---

## RBAC — قلب امنیت

### چهار لایه دفاع

| لایه | فایل | چه می‌کند |
|---|---|---|
| Database | `lib/db/schema.ts` | FK constraints، unique emails |
| Server API | API routes با `requireSession`/`requireAdmin` | sanitization + authorization |
| Middleware | `middleware.ts` (Edge) | redirect ناشناس‌ها به login |
| Client UI | `components/layout/RouterGuard` + `lib/rbac.ts` | تب‌ها و دکمه‌ها conditional |

اگر یکی شکست بخورد، بقیه می‌گیرند. حتی اگر کاربری middleware را bypass کند، API endpoint خودش session را verify می‌کند.

### Workflow تایید

```
BranchUser ثبت می‌کند              → status: 'pending'
SuperAdmin ثبت می‌کند              → status: 'approved' (فوری)
SuperAdmin تایید                  → 'pending' → 'approved'
                                    + notification برای creator
SuperAdmin رد با دلیل             → 'pending' → 'rejected'
                                    + notification + rejectionReason
```

موجودی فقط `status === 'approved'` را در محاسبات لحاظ می‌کند.

---

## Troubleshooting

### "DATABASE_URL not set"
بررسی کنید `.env.local` در root پروژه موجود است (نه در subdirectory)، و `DATABASE_URL` به‌درستی ست شده.

### "JWT_SECRET too short"
JWT_SECRET باید حداقل ۳۲ کاراکتر باشد:
```bash
openssl rand -base64 32
```

### Migration در Liara اجرا نمی‌شود
Liara CLI به database مستقیم دسترسی ندارد. Migration را locally اجرا کنید با connection string production:
```bash
DATABASE_URL='postgres://...liara.cloud' DATABASE_SSL=require npm run db:push
```

### "ایمیل یا رمز عبور نادرست"
- بررسی کنید seed اجرا شده
- اگر اولین login بعد از seed: رمز پیش‌فرض `basharaf123` است
- اگر بعد از تغییر رمز فراموش کرده‌اید: از طریق Drizzle Studio (`npm run db:studio`) یا psql، فیلد passwordHash را با hash جدید replace کنید

### Cookie persist نمی‌شود در Safari/iOS
SameSite=Lax در iOS گاهی issue دارد. اگر مشکل ادامه دارد:
- بررسی کنید `NEXT_PUBLIC_APP_URL` با domain واقعی مطابقت دارد
- در production حتماً HTTPS استفاده کنید

---

## فازهای پیاده‌سازی

| فاز | محتوا |
|---|---|
| ۱ | Foundation |
| ۲ | UI Atoms |
| ۳ | Store + Repository |
| ۴ | Auth + Middleware |
| ۵ | App Shell |
| ۶ | Dashboard |
| ۷ | Transactions & Approval Workflow |
| ۸ | Settings (5 panes) |
| ۹ | Polish |
| **۱۰** | **Backend (PostgreSQL + JWT + Real API)** ← فعلی |

---

## License

این پروژه برای استفاده داخلی رستوران «با شرف» ساخته شده.
