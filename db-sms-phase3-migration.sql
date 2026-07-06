-- db-sms-phase3-migration.sql
-- فاز ۳: اتصال SMS به notification channel
-- idempotent — اجرای مکرر امن است

-- قانون آزمایشی — برای تست مسیر کامل notify→SMS
-- sms_enabled را در Settings > پیامک روشن کن، سپس دکمه «تست کامل» را بزن
INSERT INTO notification_rules (key, label, description, enabled, sms_enabled) VALUES
  ('sms.test_notify', 'اعلان آزمایشی پیامک', 'فقط برای تست — از Settings > پیامک روشن کن', true, false)
ON CONFLICT (key) DO NOTHING;
