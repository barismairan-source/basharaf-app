-- ═══════════════════════════════════════════════════════════════════════
-- با شرف — راه‌اندازی کامل دیتابیس (نسخه واحد و منظم)
-- ═══════════════════════════════════════════════════════════════════════
--
-- این یک فایل واحد است که کل دیتابیس را از صفر می‌سازد.
-- مناسب برای: Supabase، Liara PostgreSQL، یا هر PostgreSQL تازه.
--
-- نحوه استفاده:
--   • Supabase → SQL Editor → کل فایل را paste و Run
--   • Liara → از طریق psql یا کنسول دیتابیس اجرا کنید
--
-- ایمن برای اجرای مجدد (idempotent): IF NOT EXISTS / ON CONFLICT.
-- ترتیب جداول بر اساس وابستگی FK مرتب شده است.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── اکستنشن لازم برای gen_random_uuid ───
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── تابع به‌روزرسانی updated_at ───
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۱ — Enum ها
-- ═══════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE tx_type AS ENUM ('income', 'expense', 'transfer');
EXCEPTION WHEN duplicate_object THEN
  -- اگر از قبل هست، transfer را اضافه کن
  BEGIN ALTER TYPE tx_type ADD VALUE IF NOT EXISTS 'transfer'; EXCEPTION WHEN others THEN NULL; END;
END $$;

DO $$ BEGIN
  CREATE TYPE tx_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('SuperAdmin', 'BranchUser');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notif_type AS ENUM ('pending', 'approved', 'rejected', 'info');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۲ — جداول پایه (بدون وابستگی)
-- ═══════════════════════════════════════════════════════════════════════

-- شعب
CREATE TABLE IF NOT EXISTS branches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT NOT NULL,
  manager     TEXT NOT NULL,
  opened      TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- تنظیمات سامانه (key/value)
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  label       TEXT NOT NULL,
  "group"     TEXT NOT NULL DEFAULT 'general',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۳ — جداول وابسته به شعب
-- ═══════════════════════════════════════════════════════════════════════

-- کاربران
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  role                user_role NOT NULL DEFAULT 'BranchUser',
  assigned_branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  initials            TEXT NOT NULL,
  last_seen           TEXT NOT NULL DEFAULT 'هم اکنون',
  joined              TEXT NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS users_branch_idx ON users(assigned_branch_id);

-- دسته‌بندی‌ها (درآمد/هزینه)
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        tx_type NOT NULL DEFAULT 'expense',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- صندوق‌ها و حساب‌های بانکی
CREATE TABLE IF NOT EXISTS accounts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'cash',
  balance     BIGINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  branch_id   UUID REFERENCES branches(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS accounts_branch_idx ON accounts(branch_id);
CREATE INDEX IF NOT EXISTS accounts_active_idx ON accounts(is_active);

-- طرف‌حساب‌ها (بدهکار/بستانکار)
CREATE TABLE IF NOT EXISTS contacts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'customer',
  phone       TEXT,
  note        TEXT,
  balance     BIGINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS contacts_type_idx ON contacts(type);
CREATE INDEX IF NOT EXISTS contacts_active_idx ON contacts(is_active);

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۴ — تراکنش‌ها (قلب سیستم، وابسته به همه قبلی‌ها)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS transactions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    tx_type NOT NULL,
  title                   TEXT NOT NULL,
  category_id             UUID REFERENCES categories(id) ON DELETE RESTRICT,
  category_name           TEXT NOT NULL DEFAULT '',
  amount                  BIGINT NOT NULL,
  payee                   TEXT NOT NULL,
  branch_id               UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  branch_name             TEXT NOT NULL,
  method                  TEXT NOT NULL,
  receipt                 TEXT NOT NULL DEFAULT '—',
  receipt_url             TEXT,
  account_id              UUID REFERENCES accounts(id) ON DELETE SET NULL,
  destination_account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id              UUID REFERENCES contacts(id) ON DELETE SET NULL,
  vat_amount              BIGINT NOT NULL DEFAULT 0,
  is_credit               BOOLEAN NOT NULL DEFAULT false,
  date                    TEXT NOT NULL,
  note                    TEXT NOT NULL DEFAULT '',
  has_receipt             BOOLEAN NOT NULL DEFAULT false,
  status                  tx_status NOT NULL DEFAULT 'pending',
  created_by              UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at             TIMESTAMPTZ,
  rejected_by             UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at             TIMESTAMPTZ,
  rejection_reason        TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS tx_branch_idx   ON transactions(branch_id);
CREATE INDEX IF NOT EXISTS tx_status_idx   ON transactions(status);
CREATE INDEX IF NOT EXISTS tx_account_idx  ON transactions(account_id);
CREATE INDEX IF NOT EXISTS tx_contact_idx  ON transactions(contact_id);
CREATE INDEX IF NOT EXISTS tx_created_idx  ON transactions(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۵ — اعلان‌ها و لاگ
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        notif_type NOT NULL DEFAULT 'info',
  title       TEXT NOT NULL,
  sub         TEXT NOT NULL,
  time        TEXT NOT NULL,
  read        BOOLEAN NOT NULL DEFAULT false,
  tx_id       UUID REFERENCES transactions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notif_user_idx ON notifications(user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  meta        TEXT,
  ip          TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_action_idx ON audit_log(action);
CREATE INDEX IF NOT EXISTS audit_user_idx   ON audit_log(user_id);

-- سیستم لاگ مرکزی (خطاها و رویدادهای فنی)
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

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۶ — ماژول منوی دیجیتال
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS menu_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  label_en    TEXT NOT NULL,
  label_fa    TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  title_en        TEXT NOT NULL,
  title_fa        TEXT NOT NULL,
  description_en  TEXT NOT NULL DEFAULT '',
  description_fa  TEXT NOT NULL DEFAULT '',
  price           BIGINT NOT NULL DEFAULT 0,
  is_available    BOOLEAN NOT NULL DEFAULT true,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS menu_items_sort_idx     ON menu_items(category_id, sort_order);

DROP TRIGGER IF EXISTS trg_menu_items_updated ON menu_items;
CREATE TRIGGER trg_menu_items_updated
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS menu_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  fa_font     TEXT NOT NULL DEFAULT 'IRANMarker',
  phone       TEXT NOT NULL DEFAULT '',
  address_fa  TEXT NOT NULL DEFAULT '',
  address_en  TEXT NOT NULL DEFAULT '',
  instagram   TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO menu_settings (id, fa_font) VALUES (1, 'IRANMarker') ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۷ — تنظیمات پیش‌فرض
-- ═══════════════════════════════════════════════════════════════════════

INSERT INTO app_settings (key, value, label, "group") VALUES
  ('brand.name',        'با شرف',                       'نام سامانه',                'brand'),
  ('brand.tagline',     'سامانه حسابداری شعب',           'توضیح کوتاه',               'brand'),
  ('login.title',       'حسابداری شعب، ساده و یکجا',     'عنوان ورود',                'login'),
  ('login.subtitle',    'مدیریت درآمد و هزینه چند شعبه', 'زیرعنوان',                  'login'),
  ('finance.vat_rate',  '10',                            'نرخ مالیات ارزش افزوده (٪)', 'finance')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- بخش ۸ — Realtime (فقط Supabase — روی Liara بی‌اثر و بی‌خطر)
-- ═══════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
  ALTER PUBLICATION supabase_realtime ADD TABLE contacts;
  ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;
  ALTER PUBLICATION supabase_realtime ADD TABLE menu_categories;
EXCEPTION WHEN others THEN
  -- روی Liara یا اگر publication نیست، رد شو
  NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- پایان — تأیید
-- ═══════════════════════════════════════════════════════════════════════
SELECT
  (SELECT COUNT(*) FROM branches)        AS branches,
  (SELECT COUNT(*) FROM users)           AS users,
  (SELECT COUNT(*) FROM accounts)        AS accounts,
  (SELECT COUNT(*) FROM transactions)    AS transactions,
  (SELECT COUNT(*) FROM menu_items)      AS menu_items,
  (SELECT value FROM app_settings WHERE key = 'finance.vat_rate') AS vat_rate;
