# راهنمای سریع — GitHub + Vercel + Supabase

## ۱. Supabase — ساخت دیتابیس

1. به [supabase.com](https://supabase.com) بروید → **Start your project**
2. با GitHub login کنید
3. **New project** بسازید:
   - Name: `basharaf`
   - Password: یک رمز قوی — **حتماً ذخیره کنید**
   - Region: `Central EU (Frankfurt)`
4. صبر کنید تا project آماده شود (~۱ دقیقه)

### اجرای schema (جدول‌ها)

در Supabase → **SQL Editor** → **New query**:

فایل `drizzle/migrations/0000_tranquil_viper.sql` را باز کنید، همه محتوا را کپی کنید و **Run** بزنید.

### اجرای seed (داده‌های اولیه)

در همان SQL Editor → **New query**:

فایل `supabase-seed.sql` را باز کنید، همه را کپی و **Run** بزنید.

باید ۵ ردیف نشان دهد:
```
branches     | 4
users        | 5
categories   | 11
transactions | 8
notifications| 2
```

### گرفتن Connection String

Supabase → **Settings** → **Database** → **Connection string** → **URI**

مطمئن شوید **Transaction pooler** انتخاب شده (port 6543):
```
postgres://postgres.xxxx:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

---

## ۲. GitHub — آپلود کد

1. به [github.com](https://github.com) بروید → **New repository**
2. نام: `basharaf-app` — **Create repository**
3. در صفحه‌ی بعد روی **"uploading an existing file"** کلیک کنید
4. فایل‌های داخل پوشه `basharaf-app` را انتخاب کنید (نه خود پوشه!)
5. **Commit changes**

---

## ۳. Vercel — Deploy

1. به [vercel.com](https://vercel.com) بروید → **Sign up with GitHub**
2. **New Project** → import `basharaf-app`
3. قبل از deploy، **Environment Variables** را اضافه کنید:

| نام | مقدار |
|-----|-------|
| `DATABASE_URL` | connection string از Supabase |
| `DATABASE_SSL` | `require` |
| `JWT_SECRET` | یک رشته دلخواه حداقل ۳۲ کاراکتر |
| `NEXT_PUBLIC_APP_URL` | `https://basharaf-app.vercel.app` (بعد از deploy می‌دانید) |

4. **Deploy** کنید

---

## ورود اول

- **ایمیل**: `admin@basharaf.app`
- **رمز**: `basharaf123`

⚠ بعد از اولین login از Settings → Profile رمز را عوض کنید.

---

## اگر مشکلی پیش آمد

**خطای DATABASE_URL**: env vars را در Vercel چک کنید  
**خطای login**: مطمئن شوید seed SQL اجرا شده  
**صفحه سفید**: F12 → Console → خطا را ببینید
