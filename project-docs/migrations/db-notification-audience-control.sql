-- ══════════════════════════════════════════════════════════════════
-- Migration: Notification Audience & Access Control
-- Version:   0.29.0
-- Idempotent: yes — CREATE TABLE/INDEX IF NOT EXISTS, constraints guarded
--             with DO $$ ... IF NOT EXISTS pg_constraint blocks (safe to
--             re-run).
-- Safe:       additive only — no existing table, column, or row is
--             dropped, rewritten, or backfilled. No outbox rows or
--             notifications are created by this migration.
-- Transactional: wrapped in explicit BEGIN/COMMIT — the whole migration
--             applies atomically or not at all.
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────
-- 1. notification_rule_targets — per-rule, per-channel audience rows
--
--    No rows for a given (rule_key, channel) = preserve current
--    behavior exactly: all active SuperAdmins. This table is additive
--    configuration on top of that default, never a replacement of it
--    at the schema level — the *application* decides "no rows → default"
--    (see lib/notifications/audience.ts).
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_rule_targets (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  rule_key      TEXT        NOT NULL REFERENCES notification_rules(key) ON DELETE CASCADE,

  -- NULL = shared target, applies to every channel that has no
  -- channel-specific target of its own (see resolution contract in
  -- lib/notifications/audience.ts). Otherwise one of in_app/email/sms.
  channel       TEXT,

  -- 'include' adds users to the recipient set; 'exclude' always wins
  -- over any 'include' for the same user.
  effect        TEXT        NOT NULL DEFAULT 'include',

  target_type   TEXT        NOT NULL,

  -- Exactly one of these three is populated, matched to target_type
  -- by the shape CHECK constraint below. all_active/event_branch need none.
  role_target   TEXT,
  branch_target UUID        REFERENCES branches(id) ON DELETE CASCADE,
  user_target   UUID        REFERENCES users(id)    ON DELETE CASCADE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Named CHECK constraints, added in guarded DO blocks so this migration
-- stays safe to re-run even against a table that already exists from a
-- partial prior run (mirrors the pattern used in
-- db-notification-center-v2.sql for notification_outbox).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_rule_targets_channel_check'
      AND conrelid = 'public.notification_rule_targets'::regclass
  ) THEN
    ALTER TABLE notification_rule_targets
      ADD CONSTRAINT notif_rule_targets_channel_check
        CHECK (channel IS NULL OR channel IN ('in_app', 'email', 'sms'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_rule_targets_effect_check'
      AND conrelid = 'public.notification_rule_targets'::regclass
  ) THEN
    ALTER TABLE notification_rule_targets
      ADD CONSTRAINT notif_rule_targets_effect_check
        CHECK (effect IN ('include', 'exclude'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_rule_targets_type_check'
      AND conrelid = 'public.notification_rule_targets'::regclass
  ) THEN
    ALTER TABLE notification_rule_targets
      ADD CONSTRAINT notif_rule_targets_type_check
        CHECK (target_type IN ('all_active', 'role', 'branch', 'event_branch', 'user'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_rule_targets_role_check'
      AND conrelid = 'public.notification_rule_targets'::regclass
  ) THEN
    ALTER TABLE notification_rule_targets
      ADD CONSTRAINT notif_rule_targets_role_check
        CHECK (role_target IS NULL OR role_target IN ('SuperAdmin', 'BranchUser', 'Warehouse', 'Chef'));
  END IF;
END $$;

-- Shape guard: the populated target column must match target_type —
-- prevents e.g. a 'role' row that also carries a branch_target.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname  = 'notif_rule_targets_shape_check'
      AND conrelid = 'public.notification_rule_targets'::regclass
  ) THEN
    ALTER TABLE notification_rule_targets
      ADD CONSTRAINT notif_rule_targets_shape_check
      CHECK (
        (target_type = 'all_active'   AND role_target IS NULL     AND branch_target IS NULL AND user_target IS NULL) OR
        (target_type = 'event_branch' AND role_target IS NULL     AND branch_target IS NULL AND user_target IS NULL) OR
        (target_type = 'role'         AND role_target IS NOT NULL AND branch_target IS NULL AND user_target IS NULL) OR
        (target_type = 'branch'       AND branch_target IS NOT NULL AND role_target IS NULL AND user_target IS NULL) OR
        (target_type = 'user'         AND user_target IS NOT NULL AND role_target IS NULL AND branch_target IS NULL)
      );
  END IF;
END $$;

-- Duplicate-target prevention. NULLs are normalized via COALESCE since
-- plain UNIQUE treats NULL <> NULL (two "shared channel" rows for the
-- same rule/effect/target would otherwise both be accepted).
CREATE UNIQUE INDEX IF NOT EXISTS notif_rule_targets_dedupe_idx
  ON notification_rule_targets (
    rule_key,
    COALESCE(channel, '*'),
    effect,
    target_type,
    COALESCE(role_target, ''),
    COALESCE(branch_target::text, ''),
    COALESCE(user_target::text, '')
  );

-- Resolution lookup: "give me all targets for this rule (+ optionally
-- this channel)" is the hot path, run on every notifyAdminsV2 call.
CREATE INDEX IF NOT EXISTS notif_rule_targets_rule_channel_idx
  ON notification_rule_targets (rule_key, channel);

-- Admin UI: "which rules target this branch/user" reverse lookups.
CREATE INDEX IF NOT EXISTS notif_rule_targets_branch_idx
  ON notification_rule_targets (branch_target) WHERE branch_target IS NOT NULL;

CREATE INDEX IF NOT EXISTS notif_rule_targets_user_idx
  ON notification_rule_targets (user_target) WHERE user_target IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 2. Seed the 6 anomaly-detective rule keys into notification_rules.
--
--    These ruleKeys (waste_spike, below_approval_limit, consumption_spike,
--    rejection_pattern, price_jump, off_hours_activity) were already being
--    passed to notifyAdmins() from lib/anomaly/engine.ts, but with no
--    matching row in notification_rules the service's rule.enabled gate
--    always resolved to "rule not found" and silently dropped every one
--    of them — no in-app row, no outbox row, ever. This seed makes them
--    real, independently controllable rules like the rest of the catalog.
--    ON CONFLICT DO NOTHING: never overwrites admin settings already
--    present in production (e.g. from a manual pre-seed).
--    sms_enabled defaults to false (conservative) even though callers in
--    engine.ts declare SMS support for 'high' severity — the DB rule is
--    always the actual on/off switch, same as every other rule.
-- ─────────────────────────────────────────────────────────────────

INSERT INTO notification_rules (key, label, description, enabled, sms_enabled, in_app_enabled, email_enabled, threshold)
VALUES
  ('waste_spike',           'جهش ضایعات',                    'اعلان وقتی ثبت ضایعات یک قلم به‌طور غیرعادی بالا می‌رود.',            true, false, true, false, NULL),
  ('below_approval_limit',  'الگوی تقسیم زیر سقف تأیید',      'اعلان وقتی الگوی تراکنش‌ها نشان‌دهنده‌ی تلاش برای دور زدن سقف تأیید است.', true, false, true, false, NULL),
  ('consumption_spike',     'جهش مصرف انبار',                 'اعلان وقتی مصرف روزانه‌ی یک قلم انبار به‌طور غیرعادی بالا می‌رود.',    true, false, true, false, NULL),
  ('rejection_pattern',     'الگوی رد مکرر',                  'اعلان وقتی تراکنش‌های یک کاربر به‌طور مکرر رد می‌شوند.',              true, false, true, false, NULL),
  ('price_jump',            'جهش قیمت خرید',                  'اعلان وقتی قیمت خرید یک قلم نسبت به خرید قبلی جهش زیادی دارد.',      true, false, true, false, NULL),
  ('off_hours_activity',    'فعالیت خارج از ساعت کاری',       'اعلان وقتی رویدادی مالی/انبار خارج از ساعت‌های معمول کاری ثبت می‌شود.', true, false, true, false, NULL)
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ══════════════════════════════════════════════════════════════════
-- END OF MIGRATION
-- ══════════════════════════════════════════════════════════════════
