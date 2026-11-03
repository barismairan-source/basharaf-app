-- ═══════════════════════════════════════════════════════════════════
--  Migration: دسترسی موقت ثبت حضور — IP برای یک نفر خاص و/یا تا زمان مشخص (مثلاً ۱ ساعت)
--  دو ستون اختیاری به branch_attendance_networks اضافه می‌شود؛ ردیف‌های فعلی همان IP ثابت شعبه می‌مانند
--  (employee_id و expires_at خالی = برای همه، بی‌انقضا). هیچ داده‌ای تغییر نمی‌کند.
--  یکتایی «یک IP فعال در هر شعبه» فقط برای IPهای ثابتِ همگانی می‌ماند تا یک IP موقت بتواند برای چند نفر ثبت شود.
--  Idempotent — اجرای چندباره امن است. ترتیب انتشار: اول همین فایل، بعد کد.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE branch_attendance_networks ADD COLUMN IF NOT EXISTS employee_id uuid REFERENCES employees(id) ON DELETE CASCADE;
ALTER TABLE branch_attendance_networks ADD COLUMN IF NOT EXISTS expires_at timestamptz;

DROP INDEX IF EXISTS branch_attendance_networks_active_uniq;
CREATE UNIQUE INDEX IF NOT EXISTS branch_attendance_networks_active_uniq
  ON branch_attendance_networks(branch_id, cidr)
  WHERE is_active AND employee_id IS NULL AND expires_at IS NULL;
CREATE INDEX IF NOT EXISTS branch_attendance_networks_employee_idx ON branch_attendance_networks(employee_id);

-- کوئری بررسی (read-only): SELECT cidr, employee_id, expires_at FROM branch_attendance_networks WHERE is_active;
-- Rollback: DROP INDEX branch_attendance_networks_employee_idx; DROP INDEX branch_attendance_networks_active_uniq;
--   CREATE UNIQUE INDEX branch_attendance_networks_active_uniq ON branch_attendance_networks(branch_id, cidr) WHERE is_active;
--   ALTER TABLE branch_attendance_networks DROP COLUMN expires_at, DROP COLUMN employee_id;
