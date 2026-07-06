# طراحی کارآگاه مالی هوشمند + زیرساخت پیامک
**تاریخ:** 2026-07-06 | **نویسنده:** Claude Code اکانت ۱ | **وضعیت:** پیش‌نویس، منتظر تأیید

---

## ۱. تحلیل زیرساخت موجود

### ۱.۱ سیستم اعلان‌ها (Notifications v2) — دقیقاً چطور کار می‌کند

**جداول:**
- `notifications`: type (pgEnum: pending/approved/rejected/info/warning/critical), title, sub, time, read, txId, actionUrl, entityId, userId
- `notification_rules`: key (PK text), label, description, enabled, threshold (integer), updatedAt

**جریان:**
1. رویداد مهم (approve/reject/voucher/…) رخ می‌دهد
2. کد API از `lib/notify.ts` → `notify()` یا `notifyAdmins()` صدا می‌زند
3. notify() ابتدا `notification_rules` را بررسی می‌کند — اگر disabled، برنمی‌گردد
4. یک یا چند ردیف در `notifications` insert می‌کند (یکی برای هر SuperAdmin در notifyAdmins)
5. UI در پنل سیستم اعلان را با polling/refresh نشان می‌دهد

**قوانین فعلی seed‌شده:**
| key | توضیح | threshold | SMS پیشنهادی |
|---|---|---|---|
| pending_approval | تراکنش جدید BranchUser | — | خیر |
| voucher_pending | برگه انبار ثبت شد | — | خیر |
| low_stock | کسری موجودی (clamp) | — | بله |
| inventory_clamp | کسر بیشتر از موجودی | — | بله |
| po_received | سفارش خرید دریافت شد | — | خیر |
| high_value_tx | تراکنش مبلغ بالا | 50,000,000 | بله |
| cheque.dueSoon | چک نزدیک سررسید | 3 (روز) | بله |

**نقطه‌ی اتصال پیامک:** پیامک **کانال جدید** همین سیستم می‌شود — نه سیستم موازی. ستون `sms_enabled` به `notification_rules` اضافه می‌شود. `notifyAdmins()` پارامتر `options.sms` می‌گیرد؛ اگر true و rule.sms_enabled=true، علاوه بر اعلان داخلی → `sendSms()` هم صدا می‌زند.

### ۱.۲ داده‌های موجود برای کارآگاه

| جدول | داده‌ی مفید | نوع query |
|---|---|---|
| `inv_vouchers` + `inv_voucher_lines` | نوع/مبلغ/تاریخ/قیمت واحد هر برگه | event-driven هنگام approve |
| `inv_stock_tx` | دفتر کل حرکت موجودی با `jalali_date` | daily scan روی aggregate |
| `inv_daily_sales` | COGS/revenue روزانه | daily scan |
| `transactions` | amount/type/category/createdBy/date | event-driven + daily scan |
| `audit_log` | timestamp دقیق همه عملیات + userId | pattern detection |
| variance API | مغایرت تئوری/واقعی — **منطق موجود** | daily scan، استفاده مجدد |

### ۱.۳ زیرساخت زمان‌بندی — تحلیل ۳ گزینه

#### گزینه الف — Cron داخلی Liara
- Liara برای app‌های Next.js یک worker process جداگانه یا HTTP-trigger cron دارد
- نیاز به تنظیم `liara.json` با `scripts.cron` و یک فایل worker جداگانه
- **مزیت:** Clean، بدون dependency خارجی، در همان server
- **عیب:** اضافه شدن یک worker process، بیشتر می‌خورد از quota؛ باید با Liara support بررسی شود که آیا plan فعلی آن را پشتیبانی می‌کند

#### گزینه ب — Event-driven کامل
- همه قوانین هنگام approve/create/reject اجرا می‌شوند
- برای قوانین trend (میانگین ۷ روزه) → در همان event، یک lookback query اجرا می‌شود
- **مزیت:** بی‌درنگ، ساده‌تر، بدون scheduling
- **عیب:** هر approve یک query تاریخی اضافه می‌کند (30 روز inv_stock_tx) — latency تأیید بالا می‌رود؛ برای قوانینی که نیاز به cross-item analysis دارند عملی نیست

#### گزینه پ (پیشنهاد کاربر) — ترکیبی
- قوانین **لحظه‌ای**: event-driven (هنگام approve/create)
- قوانین **روندی**: daily scan از طریق یک endpoint امن که GitHub Actions آن را فراخوانی می‌کند

**تحلیل پیشنهاد ترکیبی:**
✅ پیشنهاد **درست** است با یک دقیق‌سازی: GitHub Actions قبلاً در پروژه موجود است و یک `schedule` job به workflow اضافه می‌شود. این ارزان‌ترین و ساده‌ترین مسیر است.

یک نکته‌ی مهم: `rejection_pattern` هرچند trend است (۳ روز)، ولی می‌توان آن را **event-driven** کرد — هنگام هر رد، یک query 3-day lookback برای همان userId می‌زند. بار سبک است چون فقط روی یک کاربر انجام می‌شود.

**نتیجه:** فقط `consumption_spike` (aggregate چند روزه روی همه اقلام) واقعاً به daily scan نیاز دارد.

**پیشنهاد نهایی زمان‌بندی:**
- **Event-driven:** waste_spike، price_jump، rejection_pattern، off_hours، below_approval_limit
- **Daily scan (GitHub Actions + endpoint):** consumption_spike، تازه‌سازی میانگین پایه برای قوانین event-driven

---

## ۲. معماری پیامک

### ۲.۱ انتخاب Provider

| Provider | قیمت/پیامک | کیفیت API | پایداری | توضیح |
|---|---|---|---|---|
| **Kavenegar** | ~۱۰۰ ریال | عالی (REST + SDK ندارد ولی ساده است) | بالا | استاندارد صنعت SaaS ایران |
| SMS.ir | ~۷۰ ریال | خوب | متوسط | ارزان‌تر، قطعی‌های بیشتر گزارش‌شده |
| Farapayamak | ~۸۰ ریال | متوسط | متوسط | مستندات ضعیف‌تر |

**انتخاب: Kavenegar** — قابل اعتمادترین، ساده‌ترین API (یک HTTP POST)، مستندات فارسی عالی.
```
POST https://api.kavenegar.com/v1/{apikey}/sms/send.json
receptor=09121234567&message=متن&sender=1000...
```
کلید API **فقط** از env: `KAVENEGAR_API_KEY`.

### ۲.۲ جدول `sms_log`

```sql
CREATE TABLE IF NOT EXISTS sms_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text        NOT NULL,            -- گیرنده
  message     text        NOT NULL,
  template_key text,                           -- 'anomaly_alert' | 'cheque_due' | ...
  entity_id   text,                            -- anomaly_findings.id یا cheque.id
  status      text        NOT NULL DEFAULT 'pending',
  -- 'pending' | 'sent' | 'failed' | 'deduped' | 'capped'
  provider    text        NOT NULL DEFAULT 'kavenegar',
  provider_response jsonb,                     -- پاسخ خام API
  error       text,
  sent_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX sms_log_phone_idx    ON sms_log(phone);
CREATE INDEX sms_log_status_idx   ON sms_log(status);
CREATE INDEX sms_log_entity_idx   ON sms_log(entity_id);
CREATE INDEX sms_log_created_idx  ON sms_log(created_at);
```

### ۲.۳ منطق سقف + Dedup

**سقف روزانه:** تنظیم‌پذیر در `app_settings`:
- `sms.daily_cap_per_phone` = 5 (پیش‌فرض)
- قبل از ارسال: `COUNT WHERE phone=X AND status='sent' AND created_at > امروز`؛ اگر ≥ cap → ثبت با status='capped' + fallback به اعلان داخلی

**Dedup:** قبل از ارسال: `SELECT WHERE phone=X AND template_key=Y AND entity_id=Z AND created_at > NOW()-interval 'N hours'`؛ اگر موجود است → status='deduped', بازنمی‌شود. بازه N از `app_settings.sms.dedup_window_hours` = 2.

**Fallback:** اگر ارسال ناموفق بود → ثبت status='failed' + **همیشه** اعلان داخلی ساخته می‌شود (اعلان داخلی قبل از تلاش SMS، نه بعد).

### ۲.۴ شماره تلفن ادمین

جدول `users` فعلاً فیلد phone ندارد. نیاز به migration:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_phone text;
```
در Settings → مدیریت کاربران → SuperAdmin می‌تواند شماره خود را وارد کند. `notifyAdmins()` هنگام ارسال SMS، `users WHERE role='SuperAdmin' AND sms_phone IS NOT NULL` را می‌گیرد.

### ۲.۵ اتصال به notification_rules

```sql
ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;
```

```typescript
// lib/notify.ts — تغییر signature
export async function notifyAdmins(
  params: Omit<NotifyParams, 'userId'>,
  tx?: unknown,
  options?: { sms?: boolean }  // جدید
): Promise<void>
```

اگر `options.sms=true` و rule.sms_enabled=true → `sendSms({ templateKey: params.ruleKey, message: ..., entityId: params.entityId })`.

---

## ۳. معماری کارآگاه مالی

### ۳.۱ جدول `anomaly_findings`

```sql
CREATE TABLE IF NOT EXISTS anomaly_findings (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key     text        NOT NULL,
  severity     text        NOT NULL,
  -- 'high' | 'medium' | 'low'
  status       text        NOT NULL DEFAULT 'new',
  -- 'new' | 'investigating' | 'confirmed' | 'false_positive'
  branch_id    uuid        REFERENCES branches(id) ON DELETE SET NULL,
  entity_type  text,                -- 'voucher' | 'transaction' | 'item' | 'user'
  entity_id    text,
  detected_at  timestamptz NOT NULL DEFAULT NOW(),
  resolved_at  timestamptz,
  resolved_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  details      jsonb       NOT NULL DEFAULT '{}',
  -- داده‌های خاص قانون: مقدار واقعی، آستانه، میانگین تاریخی، درصد انحراف
  note         text        NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX af_rule_idx      ON anomaly_findings(rule_key);
CREATE INDEX af_status_idx    ON anomaly_findings(status);
CREATE INDEX af_branch_idx    ON anomaly_findings(branch_id);
CREATE INDEX af_entity_idx    ON anomaly_findings(entity_id);
CREATE INDEX af_detected_idx  ON anomaly_findings(detected_at);
```

### ۳.۲ قوانین کارآگاه — منطق دقیق هر یک

#### قانون ۱ — `waste_spike` (جهش ضایعات)
**شدت:** high | **نوع:** event-driven

**منطق:**
1. هنگام تأیید برگه‌ای با `kind='waste'`
2. `finalTotal` (یا `estTotal` اگر finalTotal null باشد) را بگیر
3. میانگین `finalTotal` برگه‌های waste تأییدشده همان شعبه در ۳۰ روز گذشته را محاسبه کن
4. اگر `finalTotal_امروز > avg * (threshold/100)` → finding
5. در `details`: `{ todayTotal, avg30d, multiplier, threshold }`

**threshold در notification_rules:** `waste_spike` → threshold = 200 (یعنی 2x میانگین)
**Dedup:** اگر finding با status≠false_positive برای همین voucherId موجود باشد → skip

#### قانون ۲ — `price_jump` (جهش قیمت خرید)
**شدت:** high | **نوع:** event-driven

**منطق:**
1. هنگام تأیید برگه‌ای با `kind='in'`
2. برای هر خط: `finalUnitCost` را بگیر
3. میانگین `finalUnitCost` همان item از برگه‌های `in` تأییدشده در ۹۰ روز گذشته را محاسبه کن (از `inv_voucher_lines` + join به `inv_vouchers`)
4. اگر `(finalUnitCost - avg) / avg * 100 > threshold` → finding با entity_id = voucherId + itemId
5. در `details`: `{ itemId, itemName, newPrice, avg90d, jumpPct, threshold }`

**threshold:** `price_jump` → threshold = 30 (درصد)
**نکته:** قیمت‌های خرید اول باید normalize شوند — `finalUnitCost` به صورت numeric(24,6) است؛ `parseFloat` در لایه اپ.

#### قانون ۳ — `rejection_pattern` (الگوی رد)
**شدت:** medium | **نوع:** event-driven (هنگام هر رد)

**منطق:**
1. هنگام رد تراکنش یا برگه انبار
2. `userId` کسی که چیز را ثبت کرده (createdBy) را بگیر
3. تعداد ردهای ۳ روز گذشته برای همین userId بشمار:
   - `transactions WHERE status='rejected' AND created_by=X AND rejected_at > now()-3d`
   - `inv_vouchers WHERE status='rejected' AND created_by=X AND rejected_at > now()-3d`
4. اگر count ≥ threshold → finding با entity_type='user', entity_id=userId
5. در `details`: `{ userId, userName, rejectCount, windowDays, threshold }`

**threshold:** `rejection_pattern` → threshold = 3
**Dedup:** اگر finding با همین userId و status='new'|'investigating' در ۲۴ ساعت گذشته وجود داشت → skip

#### قانون ۴ — `consumption_spike` (جهش مصرف)
**شدت:** medium | **نوع:** daily scan

**منطق:**
1. برای هر شعبه + هر item فعال
2. مصرف امروز = `SUM(-delta_base)` از `inv_stock_tx` WHERE `kind IN ('out','waste','sale','produce')` AND `jalali_date = today`
3. میانگین مصرف ۷ روز گذشته (همان query با بازه ۷ روز)
4. اگر `consumption_today > avg7d * (threshold/100)` AND `avg7d > 0` → finding
5. در `details`: `{ itemId, itemName, todayConsumption, avg7d, spikePct, threshold }`

**threshold:** `consumption_spike` → threshold = 250 (یعنی 2.5x میانگین)
**نکته:** فقط اقلامی که میانگین ۷ روزه > 0 دارند بررسی می‌شوند (اقلام جدید/فصلی رد شوند).

#### قانون ۵ — `below_approval_limit` (تراکنش زیر سقف)
**شدت:** high | **نوع:** event-driven (هنگام ثبت تراکنش)

**منطق (الگوی تقلب «کمی زیر سقف»):**
1. هنگام ثبت تراکنش جدید با status=pending
2. آستانه‌ی `high_value_tx` را از notification_rules بگیر (پیش‌فرض ۵۰M)
3. اگر `amount >= threshold * (rule_threshold/100)` AND `amount < threshold` → مشکوک به intentional splitting
4. آیا همین userId در ۲۴ ساعت گذشته ≥ N تراکنش مشابه دارد؟ N از `threshold` قانون خودش
5. در `details`: `{ txId, amount, approvalThreshold, splitCount, window }`

**threshold:** `below_approval_limit` → threshold = 3 (تعداد تراکنش مشابه در ۲۴ ساعت)
**پارامتر ثانوی:** آستانه‌ی `high_value_tx` برای محاسبه range (از notification_rules.threshold)

#### قانون ۶ — `off_hours_activity` (فعالیت ساعت غیرعادی)
**شدت:** low | **نوع:** event-driven (هنگام ثبت تراکنش یا برگه)

**منطق:**
1. هنگام ثبت تراکنش یا برگه انبار
2. ساعت تهران از `createdAt` استخراج کن: `EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Tehran')`
3. اگر hour >= threshold (مثلاً 23) یا hour < 5 → finding
4. در `details`: `{ entityType, entityId, tehranHour, threshold }`

**threshold:** `off_hours_activity` → threshold = 23 (ساعت شروع ساعت غیرعادی، ۲۳:۰۰ تهران)
**نکته:** شدت low است — فقط ذخیره‌سازی، بدون اعلان (قابل تنظیم).

### ۳.۳ سطح‌بندی شدت و عمل

| شدت | عمل خودکار | UI |
|---|---|---|
| **high** | اعلان داخلی (critical) + **پیامک** (اگر SMS enabled) | قرمز |
| **medium** | اعلان داخلی (warning) | کهربایی |
| **low** | فقط ذخیره در `anomaly_findings` | خاکستری |

### ۳.۴ چرخه‌ی وضعیت finding

```
new → investigating → confirmed (تقلب واقعی)
new → investigating → false_positive (غلط بود)
new → false_positive (مستقیم، بدون بررسی)
```
تغییر وضعیت توسط SuperAdmin از UI، با ثبت `resolved_by` و `resolved_at` و `note`.

### ۳.۵ هشدار: Dedup مرکزی

هنگام insert به `anomaly_findings` قبل از هر چیز:
```sql
SELECT 1 FROM anomaly_findings
WHERE rule_key=$1 AND entity_id=$2 AND status != 'false_positive'
AND detected_at > NOW() - INTERVAL '24 hours'
LIMIT 1;
```
اگر وجود داشت → skip (بدون error).

---

## ۴. جداول جدید و migration

### ۴.۱ فایل migration: `db-sms-anomaly-migration.sql`

```sql
-- بخش ۱: جدول sms_log
CREATE TABLE IF NOT EXISTS sms_log (...);
-- ایندکس‌ها ...

-- بخش ۲: ستون‌های جدید
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_phone text;
ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;

-- بخش ۳: جدول anomaly_findings
CREATE TABLE IF NOT EXISTS anomaly_findings (...);
-- ایندکس‌ها ...

-- بخش ۴: seed قوانین کارآگاه
INSERT INTO notification_rules (key, label, description, enabled, threshold, sms_enabled) VALUES
  ('waste_spike',           'جهش ضایعات',               '...', true,  200, true),
  ('price_jump',            'جهش قیمت خرید',            '...', true,  30,  true),
  ('rejection_pattern',     'الگوی رد مکرر',            '...', true,  3,   false),
  ('consumption_spike',     'جهش مصرف انبار',           '...', true,  250, false),
  ('below_approval_limit',  'تراکنش زیر سقف تأیید',    '...', true,  3,   true),
  ('off_hours_activity',    'فعالیت ساعت غیرعادی',     '...', true,  23,  false)
ON CONFLICT (key) DO NOTHING;

-- بخش ۵: آپدیت SMS برای قوانین موجود بحرانی
UPDATE notification_rules SET sms_enabled=true WHERE key IN ('low_stock','inventory_clamp','high_value_tx');

-- بخش ۶: app_settings برای SMS
INSERT INTO app_settings (key, value, label, "group") VALUES
  ('sms.daily_cap_per_phone',   '5',  'سقف روزانه پیامک به هر شماره',   'sms'),
  ('sms.dedup_window_hours',    '2',  'بازه‌ی Dedup پیامک (ساعت)',       'sms')
ON CONFLICT (key) DO NOTHING;
```

---

## ۵. فازبندی اجرایی

### فاز ۲ — هسته‌ی پیامک (مستقل)

**هدف:** ارسال پیامک کار کند، بدون کارآگاه.

**فایل‌ها:**
- `db-sms-anomaly-migration.sql` (فقط بخش‌های ۱+۲+۶)
- `lib/sms/types.ts` — interface‌ها
- `lib/sms/kavenegar.ts` — POST به Kavenegar API، خطاها را handle کند
- `lib/sms/sendSms.ts` — منطق cap + dedup + log + fallback
- `lib/notify.ts` — افزودن `sms_enabled` check + `options.sms` param
- `app/api/sms/test/route.ts` — ارسال test SMS، فقط SuperAdmin
- `app/(app)/settings/page.tsx` — بخش SMS: تنظیم `sms_phone` برای ادمین‌ها، toggle `sms_enabled` برای قوانین، cap/dedup settings

**تست:**
- unit: `sendSms()` با mock HTTP → cap/dedup به درستی کار کند
- integration: تأیید یک تراکنش با `high_value_tx` → بررسی `sms_log`

**معیار پذیرش:**
- یک SMS آزمایشی با موفقیت دریافت شود
- ارسال دوم برای همان entity_id در 2 ساعت status='deduped' بگیرد
- بعد از 5 پیامک در روز، ارسال جدید status='capped' باشد
- اگر API خطا داد، `sms_log.status='failed'` ولی اعلان داخلی ساخته شده باشد

---

### فاز ۳ — اتصال پیامک به اعلان‌های موجود

**هدف:** قوانین `low_stock`, `high_value_tx`, `cheque.dueSoon` پیامک بفرستند.

**فایل‌ها:**
- `lib/notify.ts` — `notifyAdmins(params, tx?, { sms?: boolean })`
- `app/api/transactions/[id]/approve/route.ts` — افزودن `{ sms: true }` برای high_value_tx
- `app/api/inventory/vouchers/[id]/approve/route.ts` — افزودن `{ sms: true }` برای low_stock/clamp
- `app/api/cheques/route.ts` — افزودن `{ sms: true }` برای cheque.dueSoon

**تست:**
- mock sendSms: verify که با correct rule_key صدا می‌شود
- تأیید تراکنش > 50M → sendSms فراخوانی شده باشد

**معیار پذیرش:**
- approve تراکنش بالای سقف → پیامک به ادمین‌های دارای sms_phone
- بدون sms_phone → فقط اعلان داخلی (بدون خطا)

---

### فاز ۴ — موتور کارآگاه

**هدف:** ۶ قانون فعال شوند، findings ذخیره شوند، SMS برای high بفرستد.

**فایل‌ها:**
```
lib/detective/
  types.ts              — interface RuleContext, Finding, RuleResult
  engine.ts             — رجیستری قوانین + runRule() + dedup check
  rules/
    wasteSpikeRule.ts
    priceJumpRule.ts
    rejectionPatternRule.ts
    consumptionSpikeRule.ts
    belowApprovalLimitRule.ts
    offHoursRule.ts
```
- `app/api/detective/scan/route.ts` — POST با `Authorization: Bearer $DETECTIVE_SCAN_SECRET`، اجرای daily scan rules
- `.github/workflows/liara.yml` — افزودن job جدید: `schedule: '0 2 * * *'`، `curl POST /api/detective/scan`، نیاز به secret `DETECTIVE_SCAN_SECRET` و `NEXT_PUBLIC_APP_URL`
- wire در approve routes: `wasteSpikeRule.check(voucherId)` و `priceJumpRule.check(voucherId)` در `/api/inventory/vouchers/[id]/approve`
- wire در transaction create: `offHoursRule.check(tx)` و `belowApprovalLimitRule.check(tx)` در `/api/transactions`
- wire در reject: `rejectionPatternRule.check(userId)` در هر دو `/api/transactions/[id]/reject` و `/api/inventory/vouchers/[id]/reject`

**تست:**
- unit: هر rule با mock DB → threshold کمتر و بیشتر
- integration: approve یک waste voucher با مبلغ ۳x میانگین → finding در DB، اعلان داخلی، پیامک

**معیار پذیرش:**
- هر ۶ قانون finding درست ثبت کند
- dedup جلوی finding تکراری را بگیرد
- scan endpoint با token اشتباه → 401
- GitHub Actions scheduled job صدا بزند و موفق شود

---

### فاز ۵ — UI و اتصال نهایی

**هدف:** SuperAdmin بتواند findings را ببیند و مدیریت کند.

**فایل‌ها:**
- `app/(app)/detective/page.tsx` — لیست findings با فیلتر status/severity/branch، badge تعداد new
- `app/api/detective/findings/route.ts` — GET لیست، فیلتر
- `app/api/detective/findings/[id]/route.ts` — PATCH وضعیت + note
- `components/dashboard/UnifiedOverview.tsx` — افزودن کارت «هشدارهای کارآگاه» برای SuperAdmin
- `components/layout/nav-config.ts` — nav item برای `/detective` (فقط SuperAdmin)
- `app/(app)/settings/page.tsx` — جدول قوانین کارآگاه با toggle enabled + threshold + sms_enabled

**معیار پذیرش:**
- SuperAdmin می‌تواند finding را از new به investigating تغییر دهد
- می‌تواند false_positive کند
- داشبورد نشان می‌دهد چند finding جدید دارد
- Settings: تغییر threshold → قانون با آستانه‌ی جدید اجرا می‌شود

---

## ۶. نکات پروژه‌محور مهم

- **text+CHECK نه enum** برای `severity`, `status` در anomaly_findings (قرارداد پروژه)
- **bigint تومان** در `details` JSON برای مبالغ — در ذخیره string, در خواندن BigInt
- **تاریخ جلالی text** برای هر date کاربری در details
- **audit.ts** باید `AuditAction` با `detective.findingResolved` | `detective.scanRun` گسترش پیدا کند
- **jalaliToDate** از `lib/jalali.ts` برای تبدیل تاریخ‌ها در query range، نه مقایسه string-based در PostgreSQL با Persian digits (چون ممکن است مقایسه‌ی ASCII‌ها درست باشد ولی Persian ۱۴۰۵/۰۴/۱۵ مقایسه‌اش با ASCII YYYY/MM/DD متفاوت است — باید normalize شود)
- **inv_stock_tx.jalali_date** از نوع text است و به ASCII Latin digits ذخیره می‌شود (بررسی شد، مقایسه string-based روی آن safe است)
- **KAVENEGAR_API_KEY** هرگز در کد یا git نیاید
- **سقف پیامک = پول واقعی**: قبل از هر ارسال، cap check اجباری است

---

## ۷. سوالات باز (نیاز به تأیید قبل از شروع فاز ۲)

1. **Provider:** Kavenegar تأیید شود؟ آیا حساب Kavenegar آماده است یا باید در فاز ۲ test mode داشته باشیم؟
2. **شماره‌ی فرستنده Kavenegar:** نیاز به خط اختصاصی یا shared line کافی است؟
3. **فاز اول پیاده‌سازی:** آیا فاز ۲ (SMS هسته) الان شروع شود؟
4. **سقف روزانه:** پیش‌فرض ۵ پیامک در روز به هر شماره مناسب است؟
5. **GitHub Actions secret:** نام `DETECTIVE_SCAN_SECRET` و زمان scan (پیشنهاد: ۰۵:۳۰ تهران = ۰۲:۰۰ UTC) تأیید شود.
