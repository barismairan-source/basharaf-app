-- ═══════════════════════════════════════════════════════════════
-- Migration — جدول system_logs (سیستم لاگ مرکزی)
-- روی Supabase و Liara هر دو اجرا شود
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS system_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level        TEXT NOT NULL DEFAULT 'info',
  category     TEXT NOT NULL DEFAULT 'general',
  message      TEXT NOT NULL,
  path         TEXT,
  method       TEXT,
  status_code  INTEGER,
  user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email   TEXT,
  context      TEXT,
  stack        TEXT,
  ip           TEXT,
  user_agent   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logs_level_idx    ON system_logs(level);
CREATE INDEX IF NOT EXISTS logs_category_idx ON system_logs(category);
CREATE INDEX IF NOT EXISTS logs_created_idx  ON system_logs(created_at DESC);

-- تأیید
SELECT 'system_logs created' AS status;
