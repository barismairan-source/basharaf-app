-- v0.9.16 — افزودن کلید API نشان به ord_settings (ذخیره از پنل ادمین)
ALTER TABLE ord_settings ADD COLUMN IF NOT EXISTS neshan_api_key text;
