-- Migration: cheques — مدیریت چک دریافتی و پرداختی
-- هدف: جدول cheques برای ثبت چک‌های دریافتی/پرداختی با ردیابی وضعیت + rule اعلان
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS, ON CONFLICT DO NOTHING
-- این فایل را یک‌بار در pgAdmin روی دیتابیس production اجرا کنید، سپس deploy کنید.

-- ── جدول اصلی چک‌ها ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cheques (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          text        NOT NULL CHECK (kind IN ('received', 'issued')),
  contact_id    uuid        REFERENCES contacts(id) ON DELETE SET NULL,
  amount        bigint      NOT NULL CHECK (amount > 0),
  serial_no     text        NOT NULL DEFAULT '',
  bank_name     text        NOT NULL DEFAULT '',
  due_date_jalali text      NOT NULL,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'cashed', 'bounced', 'returned', 'spent')),
  note          text        NOT NULL DEFAULT '',
  branch_id     uuid        REFERENCES branches(id) ON DELETE SET NULL,
  created_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Index‌ها ────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS cheques_due_date_idx  ON cheques(due_date_jalali);
CREATE INDEX IF NOT EXISTS cheques_status_idx    ON cheques(status);
CREATE INDEX IF NOT EXISTS cheques_kind_idx      ON cheques(kind);
CREATE INDEX IF NOT EXISTS cheques_branch_idx    ON cheques(branch_id);
CREATE INDEX IF NOT EXISTS cheques_contact_idx   ON cheques(contact_id);

-- ── قانون اعلان «چک نزدیک به سررسید» ─────────────────────────────
-- threshold=3 → ۳ روز مانده به سررسید اعلان می‌فرستد (قابل تنظیم در Admin)
INSERT INTO notification_rules (key, label, description, enabled, threshold)
VALUES (
  'cheque.dueSoon',
  'چک نزدیک به سررسید',
  'اعلان هنگام ثبت یا بررسی چک‌هایی که سررسیدشان نزدیک است',
  true,
  3
)
ON CONFLICT (key) DO NOTHING;
