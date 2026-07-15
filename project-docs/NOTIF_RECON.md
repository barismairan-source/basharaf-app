# NOTIF_RECON.md — گزارش شناسایی سیستم نوتیفیکیشن

**پروژه:** با شرف v0.26.0 | **تاریخ:** 2026-07-15 | **نوع:** Read-only Recon

---

## 1. زیرساخت اعلان فعلی

### 1.1 SMS — Kavenegar

**فایل‌ها (سه لایه):**

```
lib/sms/types.ts       — interface SendSmsParams / SendSmsResult
lib/sms/kavenegar.ts   — مستقیم به Kavenegar API — fetch POST
lib/sms/sendSms.ts     — orchestrator: cap + dedup + log + ارسال
lib/notify.ts          — entry point عمومی برای همه route‌ها
```

**چطور trigger می‌شود:**
- همزمان داخل HTTP request — هیچ queue یا background job وجود ندارد
- فقط از `notifyAdmins()` با `options: { sms: true }` فراخوانی می‌شود
- SMS به‌صورت **fire-and-forget** فرستاده می‌شود (`.catch(() => {})`) — خطای SMS، request را fail نمی‌کند

**محافظت‌های موجود:**

| مکانیزم | پیاده‌سازی |
|---------|------------|
| Daily cap | `app_settings.sms.daily_cap_per_phone = 5` — همه `sent` های امروز برای همان شماره می‌شمارد |
| Dedup | اگر همان `phone + templateKey + entityId` در N ساعت گذشته ارسال شده → `status='deduped'` |
| Dry-run | اگر `KAVENEGAR_API_KEY` نباشد یا `SMS_DRY_RUN=true` → لاگ می‌شود، API صدا نمی‌خورد |
| Retry | **وجود ندارد** — اگر Kavenegar خطا دهد، `status='failed'` در `sms_log` ثبت می‌شود |

**Abstraction:** بله — `lib/notify.ts` یک لایه‌ی میانی است. همه route‌ها از `notify()` / `notifyAdmins()` استفاده می‌کنند، نه مستقیم از Kavenegar.

**محل‌های trigger فعلی:**
- `app/api/transactions/[id]/approve/route.ts` — قوانین `high_value_tx`, `low_stock`
- `app/api/inventory/vouchers/[id]/approve/route.ts` — قانون `voucher_pending`
- `lib/anomaly/rules/wasteSpikeRule.ts` و `priceJumpRule.ts` — آنومالی‌های کارآگاه

### 1.2 ایمیل

**وجود ندارد.** جستجوی کامل در کل پروژه:
- هیچ پکیجی از نوع `nodemailer`, `resend`, `@sendgrid/mail`, `mailgun-js`, `postmark` در `package.json` نیست
- هیچ `SMTP_*`, `MAIL_*`, `RESEND_*`, `SENDGRID_*` در env یا `liara.json` نیست
- هیچ فایل `email.ts`, `mailer.ts`, `sendEmail.ts` در `lib/` وجود ندارد

### 1.3 جداول DB مرتبط با اعلان

| جدول | هدف | ستون‌های مهم |
|------|-----|-------------|
| `notifications` | اعلان in-app per user | `userId`, `type`, `title`, `sub`, `read`, `actionUrl`, `entityId` |
| `notification_rules` | کنترل on/off هر نوع + SMS | `key`, `enabled`, `sms_enabled`, `threshold` |
| `sms_log` | لاگ کامل هر پیامک | `phone`, `templateKey`, `entityId`, `status`, `providerResponse`, `error`, `sentAt` |
| `app_settings` | key-value قابل تنظیم از UI | `sms.daily_cap_per_phone`, `sms.dedup_window_hours` |
| `audit_log` | لاگ عملیات امنیتی (append-only) | قابل استفاده برای لاگ ایمیل هم |

---

## 2. جریان submit استخدام

### 2.1 مسیر کامل

```
کاربر /apply
  → step 1: انتخاب بخش (hall / kitchen)
  → step 2: GET /api/recruitment/form-structure?area=X  (فرم داینامیک از DB)
  → [اختیاری] POST /api/recruitment/upload  →  base64 data URI برمی‌گرداند
  → step 4 (submit): POST /api/recruitment  (بدون auth — کاملاً عمومی)
       ↓
  INSERT INTO job_applications
  → return { ok: true, id }
  [هیچ notify / SMS / ایمیلی اینجا نیست]
```

**Validation در `POST /api/recruitment`:**
- Rate limit per IP (in-memory): `checkRateLimit(ip)` — max 5 تلاش در 15 دقیقه، 30 دقیقه بلاک
- `applicationCreateSchema` با Zod:
  - `firstName/lastName`: min 2 کاراکتر
  - `phone`: regex `09XXXXXXXXX`
  - `resumeUrl`: max 8,000,000 chars (رشته base64 — معادل ~6MB فایل)
  - `area`: `hall | kitchen`
  - `shiftAvailability`: آرایه — حداقل ۱ مقدار
- فیلدهای داینامیک: فقط فیلدهای `isActive=true` از جدول `formFields` پذیرفته می‌شوند

### 2.2 ذخیره‌سازی رزومه

**جریان آپلود (قبل از submit اصلی):**
1. `POST /api/recruitment/upload` — فایل را می‌گیرد (rate-limited)
2. اعتبارسنجی type: `jpg/png/webp/pdf/doc/docx` — max **5MB**
3. تبدیل به `data:{mime};name={filename};base64,{data}`
4. همین رشته به client برمی‌گردد — در state فرم نگه‌داشته می‌شود
5. در submit اصلی، به‌عنوان `resumeUrl` به API ارسال و در `job_applications.resume_url` (text) ذخیره می‌شود

**نوع storage:** مستقیم در **Postgres** — هیچ object storage، دیسک، یا سرویس خارجی نیست.

**حجم تقریبی در DB:** فایل 5MB → رشته base64 حدود 6.7MB در `resume_url`.

**دریافت رزومه:**
`GET /api/recruitment/[id]/resume` — فقط SuperAdmin (`requireAdmin()`) — base64 decode → binary response با `Content-Disposition: attachment`.

### 2.3 داده‌های در دسترس لحظه‌ی submit

همه این فیلدها بلافاصله بعد از INSERT موجودند:

```typescript
firstName, lastName, phone, age, gender, city,
hasResume, resumeUrl (base64 ~6.7MB), resumePath,
manualInfo, answers (jsonb), area,
shiftAvailability, startAvailability, referralSource,
customFields (jsonb), fieldSnapshot (jsonb),
id (uuid), createdAt, status = 'new'
```

برای ایمیل خلاصه: همه فیلدهای متنی در دسترس هستند. رزومه هم موجود است ولی 6-7MB رشته است.

---

## 3. معماری تنظیمات (Settings)

### 3.1 جدول `app_settings`

```sql
app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  label      TEXT NOT NULL,    -- نمایش فارسی در Settings UI
  group      TEXT DEFAULT 'general',
  updated_at TIMESTAMP WITH TIME ZONE
)
```

**Groups فعلی:** `brand`, `login`, `general`, `sms`

**API:**
- `GET /api/settings` — همه کاربران authenticated — برمی‌گرداند `{ settings: {key:value}, rows }`
- `PATCH /api/settings` — فقط SuperAdmin — body: `{ key, value }`

**UI:** بله — صفحه‌ی Settings در پنل مدیریت وجود دارد.

### 3.2 نگهداری Secrets

`KAVENEGAR_API_KEY`, `JWT_SECRET`, `DATABASE_URL` در **env variables لیارا** (داشبورد لیارا) نگهداری می‌شوند — هیچ‌کدام در کد یا فایل commit‌شده نیستند. فایل `.env.local` در `.gitignore` است.

### 3.3 مناسب‌ترین جای «لیست ایمیل گیرندگان»

**گزینه پیشنهادی — ردیف جدید در `app_settings`:**

```sql
INSERT INTO app_settings (key, value, label, "group") VALUES
  ('recruitment.notify_emails', '', 'ایمیل‌های دریافت فرم استخدام (جداشده با کاما)', 'recruitment');
```

- بدون migration schema (جدول موجود است)
- از UI Settings موجود قابل تنظیم توسط SuperAdmin
- مناسب برای ۱-۵ آدرس ایمیل

**گزینه B — `users.email`:** این ستون وجود دارد ولی مناسب نیست — لیست گیرندگان notify ممکن است با کاربران سیستم یکی نباشد.

---

## 4. محدودیت‌های پلتفرم

### 4.1 Background Job / Cron

**وجود ندارد.** جستجوی کامل در `app/` و `lib/`:
- هیچ Vercel Cron config، Liara scheduler، `setInterval` سمت سرور، worker thread، یا queue سیستمی یافت نشد
- یک `setInterval(load, 60_000)` در `app/(app)/inventory/exceptions/page.tsx` — این client-side polling است
- لیارا محیط **container دائمی** (نه serverless) است — یعنی یک cron route داخل Next.js اگر توسط Liara scheduler یا یک سرویس خارجی (مثل cron-job.org) هر N دقیقه صدا زده شود، به‌درستی کار می‌کند

### 4.2 ریسک ارسال ایمیل sync در `/apply`

فرم `/apply` **عمومی** است (بدون login). اگر ارسال ایمیل sync داخل `POST /api/recruitment` قرار بگیرد:

| ریسک | جزئیات |
|------|---------|
| Timeout UX | سرویس ایمیل کند یا down → request متقاضی تا 30+ ثانیه منتظر می‌ماند یا 504 می‌گیرد |
| حجم payload | attachment رزومه 6.7MB داخل HTTP request → timeout احتمالی در Liara |
| از دست رفتن ایمیل | اگر container restart کند یا سرویس ایمیل down باشد، هیچ retry نیست |
| Spam → بمباران ایمیل | با IP‌های مختلف می‌توان rate limit را دور زد → ایمیل‌های بی‌نهایت |

**گزینه‌های async در همین استک (بدون سرویس جدید):**
- **Fire-and-forget:** `sendEmail(...).catch(() => {})` — ساده‌ترین، مثل SMS فعلی — ریسک از دست رفتن
- **جدول `notification_outbox`:** INSERT در DB، یک cron endpoint پردازش کند — مطمئن‌ترین

### 4.3 Env / SMTP

هیچ `SMTP_*`, `RESEND_KEY`, `MAIL_*` در env فعلی لیارا پیدا نشد. هر سرویس ایمیل نیاز به **env variable جدید** در داشبورد لیارا دارد.

---

## 5. امنیت و PII

### 5.1 ریسک‌های ارسال رزومه به‌عنوان attachment ایمیل

| ریسک | شرح |
|------|-----|
| **نشت داده** | ایمیل رمزگذاری end-to-end ندارد — اگر فوروارد شود رزومه در دسترس همه |
| **ذخیره سمت گیرنده** | Gmail/Outlook attachment را نگه می‌دارد — کنترل روی آن نیست |
| **حجم** | 6.7MB در هر submit — ریسک reject شدن توسط mail server گیرنده |
| **اسپم** | ارسال مکرر attachment بزرگ → احتمال spam شناخته‌شدن IP/domain |
| **لیست گیرندگان** | اگر ایمیل HR به خطر بیفتد، همه رزومه‌های دریافتی در آرشیو قابل دسترس |

### 5.2 گزینه‌ی لینک امن به‌جای attachment

**ایمیل خلاصه + لینک:**
```
نام: علی احمدی | بخش: آشپزخانه | تلفن: 0912...
مشاهده جزئیات و دانلود رزومه: https://panel.basharaf.com/recruitment/{id}
```

**امکان‌سنجی:** کاملاً ممکن.
- Endpoint `GET /api/recruitment/[id]/resume` الان وجود دارد و `requireAdmin()` دارد
- بدون login به پنل، لینک کار نمی‌کند
- هیچ PII یا فایل در متن ایمیل نیست

### 5.3 Rate Limit روی `/apply`

```typescript
// lib/auth/rateLimit.ts — همان limiter که برای login استفاده می‌شود
MAX_ATTEMPTS = 5    // تلاش در window
WINDOW_MS    = 15 دقیقه
BLOCK_MS     = 30 دقیقه بلاک per IP
```

**ضعف‌های موجود:**
- Rate limiter **in-memory** — در Liara (container دائمی) این مشکل نیست، اما با **IP‌های مختلف** (VPN، باتنت) می‌توان دور زد
- `recordFailedAttempt` بعد از parse Zod صدا می‌شود — یعنی submit **موفق** هم counter را بالا می‌برد
- هیچ rate limit global روی «تعداد submit موفق در روز» وجود ندارد

**توصیه قبل از اضافه‌کردن notify:** یک سقف روزانه‌ی notify در `app_settings` تعریف شود تا spam → بمباران ایمیل جلوگیری شود:
```sql
('recruitment.max_daily_notifs', '50', 'حداکثر اعلان استخدام در روز', 'recruitment')
```

---

## 6. جمع‌بندی معماری

### 6.1 گزینه‌های پیاده‌سازی

**گزینه A — Fire-and-forget مستقیم**

```
POST /api/recruitment
  → INSERT job_applications
  → sendEmail({to: emails, subject, body}).catch(() => {})
  → return 201
```

- مزایا: ساده‌ترین، بدون جدول جدید، ریسک صفر برای سیستم موجود
- معایب: در صورت down بودن سرویس ایمیل یا restart container → ایمیل از دست می‌رود، هیچ retry نیست
- مناسب برای: شروع سریع با حجم کم (کمتر از ۵۰ درخواست در روز)

**گزینه B — جدول `notification_outbox` + Liara Cron**

```
POST /api/recruitment
  → INSERT job_applications
  → INSERT notification_outbox (type, payload={applicationId}, status='pending')
  → return 201

GET /api/cron/process-outbox  (هر 5 دقیقه از Liara scheduler یا cron-job.org)
  → SELECT WHERE status='pending' LIMIT 10
  → sendEmail()
  → UPDATE status='sent'/'failed', retries++
```

- مزایا: مطمئن — در صورت failure قابل retry. لاگ کامل. قابل گسترش به webhook، SMS، push.
- معایب: نیاز به جدول جدید + endpoint cron + تنظیم scheduler در Liara. پیچیده‌تر.
- مناسب برای: اگر reliability مهم است یا حجم notify بالا می‌رود

**گزینه C — SMS notify با زیرساخت موجود**

```
POST /api/recruitment
  → INSERT job_applications
  → sendSms({ phone: settings['recruitment.notify_phone'], message: ... }).catch(() => {})
  → return 201
```

- مزایا: **صفر کد جدید برای channel** — SMS آماده است. Cap و Dedup هم آماده. ریسک صفر.
- معایب: ایمیل نیست — رزومه قابل ارسال نیست. اگر چند گیرنده باشند هزینه SMS.
- مناسب برای: اولین قدم سریع تا ایمیل آماده شود

### 6.2 تصمیم‌هایی که کاربر باید بگیرد

| # | سوال | گزینه‌ها |
|---|------|---------|
| 1 | **سرویس ایمیل کدام باشد؟** | Resend.com (ساده‌ترین API — رایگان تا 3000/ماه)، Liara Mail، SMTP خودت |
| 2 | **رزومه attachment یا لینک؟** | Attachment (ساده ولی 6.7MB — ریسک PII) یا لینک به پنل (امن‌تر) |
| 3 | **گیرندگان کجا تنظیم شوند؟** | `app_settings` (پیشنهادی — UI آماده) یا env ثابت |
| 4 | **ایمیل یا SMS یا هر دو؟** | SMS با زیرساخت موجود کافی است؟ یا ایمیل هم لازم است؟ |
| 5 | **Reliability چقدر مهم است؟** | Fire-and-forget (ساده، ریسک از دست رفتن) یا outbox+cron (مطمئن) |
| 6 | **Rate limit notify؟** | حداکثر چند اعلان در روز قابل قبول است؟ |

### 6.3 تخمین ریسک هر گزینه برای سیستم فعلی

| گزینه | ریسک شکستن سیستم | پیچیدگی | قابلیت اطمینان |
|-------|------------------|---------|-----------------|
| C — SMS موجود | **صفر** | **خیلی کم** | متوسط (مثل SMS فعلی) |
| A — Fire-and-forget ایمیل | صفر | کم | پایین (بدون retry) |
| B — Outbox + Cron | خیلی کم | متوسط | بالا |

**توصیه‌ی معمارانه:**
برای **اولین قدم**، گزینه C (SMS با زیرساخت موجود) را پیاده کنید — فقط چند خط کد در `POST /api/recruitment`، هیچ پکیج جدیدی، هیچ env جدیدی. اگر ایمیل لازم شد، گزینه A با **لینک** (بدون attachment) با Resend شروع کنید. بعداً در صورت نیاز به گزینه B ارتقا دهید.
