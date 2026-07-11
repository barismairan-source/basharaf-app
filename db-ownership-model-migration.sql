-- db-ownership-model-migration.sql
-- مدل مالکیت — شرکا، آورده سرمایه به تفکیک شعبه.
--
-- ════════════════════════════════════════════════
-- ترتیب اجرا (مهم!):
--   مرحله ۱ (جداول + ستون جدید) را قبل از deploy کد فاز ۱ اجرا کنید.
--   مرحله ۳ (data migration) را بعد از deploy موفق فاز ۱ و تأیید نام‌های دقیق اجرا کنید.
-- ════════════════════════════════════════════════
--
-- همه statements idempotent هستند و اجرای مجدد آن‌ها بی‌خطر است.

-- ════════════════════════════════════════════════
-- مرحله ۱ — ساختار (backward-compatible)
-- اجرا: قبل از deploy کد فاز ۱
-- ════════════════════════════════════════════════

-- ─── جدول شرکا (اشخاص) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text        NOT NULL,
  phone       text,
  national_id text,
  note        text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partners_name_idx    ON partners (full_name);
CREATE INDEX IF NOT EXISTS partners_active_idx  ON partners (is_active);

-- ─── رابطه شریک↔شعبه ───────────────────────────────────────────────
-- branch_id nullable یعنی «ستادی» (آورده به کل مجموعه، نه شعبه خاص).
--
-- مشکل UNIQUE با NULL در Postgres:
--   UNIQUE(partner_id, branch_id) با دو NULL جداگانه تلقی می‌شود →
--   می‌توان برای یک شریک دو ردیف ستادی (branch_id=null) ساخت (اشتباه).
--
-- راه‌حل: دو partial index جداگانه:
--   ۱. برای branch_id غیر-null: (partner_id, branch_id) یکتا
--   ۲. برای branch_id=null: (partner_id) یکتا
-- این الگو در PostgreSQL استاندارد و مستند است.

CREATE TABLE IF NOT EXISTS partner_branches (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    uuid        NOT NULL REFERENCES partners(id) ON DELETE RESTRICT,
  branch_id     uuid        REFERENCES branches(id) ON DELETE RESTRICT,  -- nullable=ستادی
  share_percent numeric(5,2),      -- درصد سهم — اختیاری، فعلاً null
  joined_date   text,              -- تاریخ ورود به شعبه (جلالی متنی)
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- partial unique index برای branch_id غیر-null
CREATE UNIQUE INDEX IF NOT EXISTS pb_unique_partner_branch
  ON partner_branches (partner_id, branch_id)
  WHERE branch_id IS NOT NULL;

-- partial unique index برای branch_id=null (ستادی): یک ردیف ستادی برای هر شریک
CREATE UNIQUE INDEX IF NOT EXISTS pb_unique_partner_hq
  ON partner_branches (partner_id)
  WHERE branch_id IS NULL;

CREATE INDEX IF NOT EXISTS pb_partner_idx ON partner_branches (partner_id);
CREATE INDEX IF NOT EXISTS pb_branch_idx  ON partner_branches (branch_id)
  WHERE branch_id IS NOT NULL;

-- ─── ستون partner_id روی accounts ─────────────────────────────────
-- این ستون فقط برای حساب‌های type='partner_equity' مقدار دارد.
-- سایر حساب‌ها (cash/bank/pos) این ستون را NULL دارند.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='accounts' AND column_name='partner_id'
  ) THEN
    ALTER TABLE accounts
      ADD COLUMN partner_id uuid REFERENCES partners(id) ON DELETE RESTRICT;
    CREATE INDEX accounts_partner_id_idx ON accounts (partner_id)
      WHERE partner_id IS NOT NULL;
  END IF;
END $$;

-- تأیید مرحله ۱:
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('partners','partner_branches');
-- \d accounts   -- باید ستون partner_id دیده شود
-- انتظار: ۲ جدول جدید + ستون partner_id روی accounts


-- ════════════════════════════════════════════════
-- مرحله ۳ — data migration
-- اجرا: بعد از deploy موفق فاز ۱
--         و بعد از تأیید نام‌های دقیق accounts از DB
-- ════════════════════════════════════════════════
--
-- قبل از اجرا، این query را اجرا کنید تا نام‌ها را تأیید کنید:
--   SELECT id, name, type, balance FROM accounts WHERE name ILIKE '%شرف%';
--   SELECT id, name FROM branches;
--
-- سپس <<UUID-...>> را با مقادیر واقعی جایگزین کنید.

-- SQL-D: درج شرکا
-- ⚠️ UUID‌های زیر را با gen_random_uuid() یا مقادیر دلخواه ثابت پر کنید
-- INSERT INTO partners (id, full_name) VALUES
--   ('<<UUID-حسین>>'::uuid,   'حسین شرف'),
--   ('<<UUID-شهریار>>'::uuid, 'شهریار شرف')
-- ON CONFLICT DO NOTHING;

-- SQL-E: درج partner_branches (شعبه A.S.P)
-- INSERT INTO partner_branches (partner_id, branch_id, joined_date) VALUES
--   ('<<UUID-حسین>>'::uuid,   '<<UUID-ASP>>'::uuid, '۱۴۰۳/۰۸/۰۱'),
--   ('<<UUID-شهریار>>'::uuid, '<<UUID-ASP>>'::uuid, '۱۴۰۳/۰۸/۰۱')
-- ON CONFLICT DO NOTHING;

-- SQL-F: تبدیل نوع حساب‌های شرکا
-- UPDATE accounts SET type='partner_equity', partner_id='<<UUID-حسین>>'::uuid,   updated_at=NOW() WHERE name='صندوق حسین شرف'   AND type='cash';
-- UPDATE accounts SET type='partner_equity', partner_id='<<UUID-شهریار>>'::uuid, updated_at=NOW() WHERE name='صندوق شهریار شرف' AND type='cash';

-- تأیید مرحله ۳:
-- SELECT a.name, a.type, a.balance, p.full_name
-- FROM accounts a LEFT JOIN partners p ON p.id = a.partner_id
-- WHERE a.type = 'partner_equity';
-- انتظار: ۲ ردیف با balance منفی و full_name پر شده
