# راهنمای استقرار روی Liara

این راهنما برای deploy کامل «با شرف» روی Liara (سرور ایران) است.

---

## پیش‌نیازها

۱. حساب [Liara](https://liara.ir)
۲. Liara CLI نصب شده: `npm install -g @liara/cli`
۳. یک دیتابیس PostgreSQL روی Liara

---

## مرحله ۱ — ساخت دیتابیس PostgreSQL

در پنل Liara:
1. بخش **دیتابیس** → ساخت دیتابیس جدید
2. نوع: **PostgreSQL** (نسخه ۱۵ یا بالاتر)
3. نام دلخواه (مثلاً `basharaf-db`)
4. بعد از ساخت، **connection string** را کپی کنید:
   ```
   postgresql://root:PASSWORD@HOST:PORT/postgres
   ```

---

## مرحله ۲ — اجرای دیتابیس

دو فایل SQL را به‌ترتیب اجرا کنید:

**روش الف — از طریق psql (محلی):**
```bash
# ساختار
psql "CONNECTION_STRING" -f db-setup.sql
# داده اولیه
psql "CONNECTION_STRING" -f db-seed.sql
```

**روش ب — از کنسول دیتابیس Liara:**
محتوای `db-setup.sql` را paste و اجرا کنید، سپس `db-seed.sql`.

نتیجه `db-seed.sql` باید این باشد:
```
branches=3  users=4  categories=9  accounts=3
```

---

## مرحله ۳ — ساخت اپلیکیشن

در پنل Liara:
1. بخش **اپلیکیشن** → ساخت برنامه جدید
2. پلتفرم: **Next.js**
3. نام دلخواه (مثلاً `basharaf`)

---

## مرحله ۴ — تنظیم Environment Variables

در پنل اپ → بخش **تنظیمات** → **متغیرهای محیطی**، این‌ها را اضافه کنید:

| متغیر | مقدار |
|-------|-------|
| `DATABASE_URL` | connection string دیتابیس Liara |
| `DATABASE_SSL` | `false` (دیتابیس داخلی Liara نیاز به SSL ندارد) |
| `JWT_SECRET` | یک رشته تصادفی ۳۲+ کاراکتری |
| `NEXT_PUBLIC_APP_URL` | آدرس اپ شما، مثلاً `https://basharaf.liara.run` |

> **نکته:** اگر از Supabase Storage برای رسید استفاده می‌کنید، این‌ها را هم اضافه کنید:
> `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
> `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
> اگر نه، آپلود رسید و realtime غیرفعال می‌شوند ولی بقیه سیستم کار می‌کند.

برای ساخت `JWT_SECRET` تصادفی:
```bash
openssl rand -base64 32
```

---

## مرحله ۵ — Deploy

```bash
cd basharaf-app
liara login
liara deploy --app=basharaf
```

یا با اتصال به GitHub، هر push خودکار deploy می‌شود.

---

## تفاوت‌های Liara با Vercel

| موضوع | Vercel | Liara |
|-------|--------|-------|
| موقعیت سرور | فرانکفورت | ایران |
| دیتابیس | Supabase (خارج) | PostgreSQL داخلی Liara |
| SSL دیتابیس | `require` | `false` (داخلی) |
| Realtime | کار می‌کند (Supabase) | فقط اگر Supabase وصل باشد |
| سرعت برای کاربر ایرانی | کندتر | سریع‌تر |

---

## نکات مهم

1. **Realtime روی Liara:** اگر دیتابیس Liara استفاده می‌کنید (نه Supabase)،
   قابلیت realtime کار نمی‌کند (به Supabase وابسته است). بقیه سیستم سالم است.
   داده‌ها با refresh به‌روز می‌شوند.

2. **آپلود رسید:** به Supabase Storage وابسته است. اگر فقط Liara دارید، این
   قابلیت کار نمی‌کند مگر یک storage جایگزین وصل کنید.

3. **فونت‌ها:** Vazirmatn و فونت‌های منو local هستند (`public/fonts/`)، پس
   مشکل تحریم Google Fonts ندارید.

4. **timezone:** در `liara.json` روی `Asia/Tehran` تنظیم شده.

5. **نصب dependency:** Liara خودش `npm install` می‌زند. اگر مشکل تحریم npm
   پیش آمد، از build location ایران استفاده کنید (در `liara.json` تنظیم شده).

---

## تست بعد از deploy

1. به آدرس اپ بروید → صفحه login
2. ورود با `admin@basharaf.app` / `basharaf123`
3. داشبورد، صندوق‌ها، منو را چک کنید
4. **حتماً رمز admin را تغییر دهید**

---

## عیب‌یابی

**خطای اتصال دیتابیس:** `DATABASE_SSL` را چک کنید — برای دیتابیس داخلی Liara
باید `false` باشد، برای Supabase باید `require`.

**صفحه سفید / خطای ۵۰۰:** لاگ‌های اپ را در پنل Liara ببینید. معمولاً
`DATABASE_URL` اشتباه است.

**build fail:** مطمئن شوید `JWT_SECRET` ست شده (build بدون آن fail می‌شود).
