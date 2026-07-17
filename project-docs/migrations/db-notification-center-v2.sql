-- ══════════════════════════════════════════════════════════════════
-- Migration: Notification Center V2
-- Version:   0.28.0
-- Idempotent: yes — all statements use IF NOT EXISTS / ON CONFLICT DO NOTHING
-- Safe:       additive only — no existing column or table is dropped or rewritten
-- ══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Extend notifications table
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS rule_key     TEXT,
  ADD COLUMN IF NOT EXISTS priority     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS read_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dedupe_key   TEXT;

-- Note: no backfill of read_at for existing rows.
-- read_at is set server-side going forward; historical rows remain NULL.

-- Indexes for notifications V2
CREATE INDEX IF NOT EXISTS notif_user_created_idx
  ON notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notif_user_unread_idx
  ON notifications (user_id, created_at DESC)
  WHERE read = false;

CREATE INDEX IF NOT EXISTS notif_user_archived_idx
  ON notifications (user_id, created_at DESC)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS notif_rule_key_idx
  ON notifications (rule_key)
  WHERE rule_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notif_entity_id_idx
  ON notifications (entity_id)
  WHERE entity_id IS NOT NULL;

-- Partial unique index: per-user dedupe (NULL dedupe_key rows are exempt)
CREATE UNIQUE INDEX IF NOT EXISTS notif_user_dedupe_idx
  ON notifications (user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 2. Extend notification_rules table
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE notification_rules
  ADD COLUMN IF NOT EXISTS in_app_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_enabled   BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────────
-- 3. Seed recruitment.new_application rule (idempotent)
--    DO NOTHING: never overwrite admin settings already set in production.
-- ─────────────────────────────────────────────────────────────────

INSERT INTO notification_rules (key, label, description, enabled, sms_enabled, in_app_enabled, email_enabled, threshold)
VALUES (
  'recruitment.new_application',
  'درخواست استخدام جدید',
  'اعلان به SuperAdminها هنگام ثبت فرم استخدام توسط متقاضی',
  true,
  false,
  true,
  false,
  NULL
)
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 4. Create notification_outbox table
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_outbox (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key         TEXT        NOT NULL,
  notification_id  UUID        REFERENCES notifications(id) ON DELETE SET NULL,
  channel          TEXT        NOT NULL,

  -- recipient_id is nullable so rows are preserved for audit when user is deleted
  -- ON DELETE SET NULL preserves the row and last_error; processor skips NULL rows
  recipient_id     UUID        REFERENCES users(id) ON DELETE SET NULL,

  -- Payload stores routing + content data (title/sub/actionUrl).
  -- title and sub may contain the applicant's name (minimal-necessary PII).
  -- Phone numbers and email addresses are never stored here — looked up from users at send time.
  payload          JSONB       NOT NULL DEFAULT '{}',

  -- Idempotency: unique per rule+entity+recipient+channel combination
  dedupe_key       TEXT        NOT NULL,

  status           TEXT        NOT NULL DEFAULT 'pending',

  attempts         INTEGER     NOT NULL DEFAULT 0,
  max_attempts     INTEGER     NOT NULL DEFAULT 5,
  next_attempt_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Pessimistic lock fields for FOR UPDATE SKIP LOCKED processor
  lock_time        TIMESTAMPTZ,
  lock_owner       TEXT,

  -- Redacted error — no auth headers, no API keys, no stack traces
  last_error       TEXT,

  provider_msg_id  TEXT,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at          TIMESTAMPTZ
);

-- ─────────────────────────────────────────────────────────────────
-- 4b. Repair recipient_id if it was created NOT NULL or with a wrong
--     ON DELETE action in a partial migration.
--     All blocks are idempotent (no-ops when already correct).
-- ─────────────────────────────────────────────────────────────────

-- Ensure recipient_id is nullable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'notification_outbox'
      AND column_name  = 'recipient_id'
      AND is_nullable  = 'NO'
  ) THEN
    ALTER TABLE notification_outbox ALTER COLUMN recipient_id DROP NOT NULL;
  END IF;
END $$;

-- Ensure ON DELETE SET NULL — repair CASCADE / NO ACTION / RESTRICT / missing FK
DO $$
DECLARE
  fk_name   TEXT;
  fk_action TEXT;
BEGIN
  -- Schema-qualified lookup to avoid false matches from another schema
  SELECT rc.constraint_name, rc.delete_rule
    INTO fk_name, fk_action
    FROM information_schema.referential_constraints rc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name   = rc.constraint_name
     AND kcu.constraint_schema = rc.constraint_schema
   WHERE kcu.table_schema = 'public'
     AND kcu.table_name   = 'notification_outbox'
     AND kcu.column_name  = 'recipient_id'
   LIMIT 1;

  IF fk_name IS NULL THEN
    -- FK is absent entirely — create with correct action
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notification_outbox_recipient_id_fkey
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL;

  ELSIF fk_action <> 'SET NULL' THEN
    -- FK has wrong action (CASCADE / NO ACTION / RESTRICT / SET DEFAULT) — replace
    EXECUTE format('ALTER TABLE notification_outbox DROP CONSTRAINT %I', fk_name);
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notification_outbox_recipient_id_fkey
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  -- fk_action = 'SET NULL' → already correct, no-op
END $$;

-- Named CHECK constraints added separately so they are safe to re-run
-- even if the table already existed without them (e.g. from a partial migration).
-- Schema-qualified ::regclass avoids matching a same-named table in another schema.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_outbox_channel_check'
      AND conrelid = 'public.notification_outbox'::regclass
  ) THEN
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notif_outbox_channel_check CHECK (channel IN ('sms', 'email'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_outbox_status_check'
      AND conrelid = 'public.notification_outbox'::regclass
  ) THEN
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notif_outbox_status_check
        CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead', 'skipped'));
  END IF;
END $$;

-- attempts must be non-negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_outbox_attempts_nonneg'
      AND conrelid = 'public.notification_outbox'::regclass
  ) THEN
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notif_outbox_attempts_nonneg CHECK (attempts >= 0);
  END IF;
END $$;

-- max_attempts must be at least 1 (0 means never retry — a misconfiguration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_outbox_max_attempts_pos'
      AND conrelid = 'public.notification_outbox'::regclass
  ) THEN
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notif_outbox_max_attempts_pos CHECK (max_attempts > 0);
  END IF;
END $$;

-- attempts must never exceed max_attempts (belt-and-suspenders; processor also enforces)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_outbox_attempts_le_max'
      AND conrelid = 'public.notification_outbox'::regclass
  ) THEN
    ALTER TABLE notification_outbox
      ADD CONSTRAINT notif_outbox_attempts_le_max CHECK (attempts <= max_attempts);
  END IF;
END $$;

-- Unique dedupe_key per row
CREATE UNIQUE INDEX IF NOT EXISTS notif_outbox_dedupe_idx
  ON notification_outbox (dedupe_key);

-- Indexes for processor: claim due rows (pending, due)
CREATE INDEX IF NOT EXISTS notif_outbox_due_idx
  ON notification_outbox (next_attempt_at, status)
  WHERE status IN ('pending', 'processing');

-- Stale-lock recovery: find processing rows with old lock_time
CREATE INDEX IF NOT EXISTS notif_outbox_lock_idx
  ON notification_outbox (lock_time, status)
  WHERE status = 'processing' AND lock_time IS NOT NULL;

-- Admin monitoring: filter by status
CREATE INDEX IF NOT EXISTS notif_outbox_status_idx
  ON notification_outbox (status, created_at DESC);

-- ══════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ══════════════════════════════════════════════════════════════════
