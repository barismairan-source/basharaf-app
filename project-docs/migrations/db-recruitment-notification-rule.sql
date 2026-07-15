-- migration: اضافه کردن قانون اعلان درخواست استخدام
-- idempotent — اگر ردیف وجود داشته باشد هیچ تغییری نمی‌دهد
-- اجرا: روی دیتابیس توسعه/production توسط DBA یا SuperAdmin

INSERT INTO notification_rules (key, label, description, enabled, sms_enabled, threshold)
VALUES (
  'recruitment.new_application',
  'درخواست استخدام جدید',
  'اعلان به SuperAdminها هنگام ثبت فرم استخدام توسط متقاضی',
  true,
  false,
  NULL
)
ON CONFLICT (key) DO NOTHING;
