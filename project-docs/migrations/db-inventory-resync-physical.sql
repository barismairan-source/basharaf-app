-- ═══════════════════════════════════════════════════════════════════
--  اصلاح یک‌باره‌ی داده: هم‌ترازکردن «موجودی نمایشی» انبار (qty_physical)
--  گزارش بررسی ۲۰۲۶-۱۰، یافته‌ی B4.
--
--  مشکل: تا قبل از این اصلاح، تأیید هر برگه اثر موقت qty_physical را برمی‌گرداند
--  ولی دوباره اعمال نمی‌کرد؛ دریافت سفارش خرید و کسر فروش منو هم اصلاً به آن
--  دست نمی‌زدند. پس ستون «موجودی» صفحه‌ی اقلام، پیشنهاد خرید و گزارش کمبود
--  فقط بلافاصله بعد از انبارگردانی درست بودند.
--
--  کد جدید از این به بعد این دو عدد را هم‌تراز نگه می‌دارد؛ این فایل فقط
--  داده‌ی گذشته را درست می‌کند:
--      qty_physical = qty_base (موجودی قطعی) + اثر برگه‌های هنوز در انتظار
--
--  ⚠️ قبل از اجرا حتماً backup بگیرید. اجرای چندباره امن است (idempotent).
--  اول بخش ۱ (فقط نمایش) را اجرا کنید و نتیجه را ببینید؛ بعد بخش ۲.
-- ═══════════════════════════════════════════════════════════════════

-- ─── ۱) پیش‌نمایش: کدام اقلام تغییر می‌کنند (فقط SELECT) ───────────────
WITH pending AS (
  SELECT l.item_id,
         SUM(CASE WHEN v.kind IN ('in', 'produce') THEN l.qty_base
                  WHEN v.kind IN ('out', 'waste', 'sale') THEN -l.qty_base
                  ELSE 0 END) AS delta
  FROM inv_voucher_lines l
  JOIN inv_vouchers v ON v.id = l.voucher_id
  WHERE v.status = 'pending'
  GROUP BY l.item_id
)
SELECT i.name, i.qty_physical AS current_shown,
       GREATEST(0, i.qty_base + COALESCE(p.delta, 0)) AS corrected,
       i.qty_base AS confirmed
FROM inv_items i
LEFT JOIN pending p ON p.item_id = i.id
WHERE abs(i.qty_physical - GREATEST(0, i.qty_base + COALESCE(p.delta, 0))) > 0.0001
ORDER BY abs(i.qty_physical - GREATEST(0, i.qty_base + COALESCE(p.delta, 0))) DESC;

-- ─── ۲) اصلاح (بعد از دیدن پیش‌نمایش) ───────────────────────────────────
BEGIN;
WITH pending AS (
  SELECT l.item_id,
         SUM(CASE WHEN v.kind IN ('in', 'produce') THEN l.qty_base
                  WHEN v.kind IN ('out', 'waste', 'sale') THEN -l.qty_base
                  ELSE 0 END) AS delta
  FROM inv_voucher_lines l
  JOIN inv_vouchers v ON v.id = l.voucher_id
  WHERE v.status = 'pending'
  GROUP BY l.item_id
)
UPDATE inv_items i
SET qty_physical = GREATEST(0, i.qty_base + COALESCE(p.delta, 0)),
    updated_at = now()
FROM inv_items i2
LEFT JOIN pending p ON p.item_id = i2.id
WHERE i.id = i2.id
  AND abs(i.qty_physical - GREATEST(0, i.qty_base + COALESCE(p.delta, 0))) > 0.0001;
COMMIT;

-- بازگشت: این اصلاح فقط ستون نمایشی را بازمحاسبه می‌کند؛ برای برگرداندن، از backup استفاده کنید.
