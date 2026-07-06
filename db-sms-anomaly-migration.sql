-- db-sms-anomaly-migration.sql
-- فاز ۲: زیرساخت پیامک (SMS)
-- idempotent — اجرای مکرر امن است
-- اجرا در pgAdmin روی Liara قبل از deploy

-- ─── بخش ۱: جدول sms_log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_log (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone             text        NOT NULL,
  message           text        NOT NULL,
  template_key      text,
  entity_id         text,
  status            text        NOT NULL DEFAULT 'pending',
  -- pending | sent | failed | dry_run | deduped | capped
  provider          text        NOT NULL DEFAULT 'kavenegar',
  provider_response jsonb,
  error             text,
  sent_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sms_log_phone_idx   ON sms_log(phone);
CREATE INDEX IF NOT EXISTS sms_log_status_idx  ON sms_log(status);
CREATE INDEX IF NOT EXISTS sms_log_entity_idx  ON sms_log(entity_id);
CREATE INDEX IF NOT EXISTS sms_log_created_idx ON sms_log(created_at);

-- ─── بخش ۲: ستون‌های جدید به جداول موجود ─────────────────────────
ALTER TABLE users              ADD COLUMN IF NOT EXISTS sms_phone text;
ALTER TABLE notification_rules ADD COLUMN IF NOT EXISTS sms_enabled boolean NOT NULL DEFAULT false;

-- ─── بخش ۳: تنظیمات SMS در app_settings ─────────────────────────
INSERT INTO app_settings (key, value, label, "group") VALUES
  ('sms.daily_cap_per_phone', '5', 'سقف روزانه پیامک به هر شماره', 'sms'),
  ('sms.dedup_window_hours',  '2', 'بازه‌ی Dedup پیامک (ساعت)',    'sms')
ON CONFLICT (key) DO NOTHING;

-- ملاحظه: همه‌ی قوانین با sms_enabled=false شروع می‌شوند.
-- ادمین از Settings یکی‌یکی آن‌ها را روشن می‌کند.
