-- ═══════════════════════════════════════════════════════════════════
--  Migration: لینک کوتاه فیش پرداخت (basharaf.me/r/{id})
--  یک جدول ساده برای ذخیره‌ی فیش‌هایی که در basharaf.me/receipts ساخته
--  می‌شوند — فقط برای نمایش به مشتری، هیچ اثر مالی/حسابداری ندارد و به
--  transactions وصل نیست.
--  Idempotent — اجرای چندباره امن است. هیچ داده‌ی موجودی دست‌خورده نمی‌شود.
--  ⚠️ این فایل روی دیتابیس واقعی اجرا نشده — فقط برای اجرای دستی توسط
--     مدیر پروژه (pgAdmin/DBeaver) پس از تهیه‌ی backup آماده شده است.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS receipts (
  id             TEXT PRIMARY KEY,
  customer_name  TEXT,
  items          JSONB NOT NULL,
  created_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── تأیید ───
SELECT 'receipts table ready' AS status;
SELECT count(*) FROM receipts;

-- ═══════════════════════════════════════════════════════════════════
--  بازگشت (Rollback):
--  DROP TABLE IF EXISTS receipts;
-- ═══════════════════════════════════════════════════════════════════
