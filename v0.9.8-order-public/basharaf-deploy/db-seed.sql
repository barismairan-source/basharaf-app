-- ═══════════════════════════════════════════════════════════════════════
-- با شرف — داده‌های اولیه (Seed)
-- ═══════════════════════════════════════════════════════════════════════
--
-- بعد از db-setup.sql این فایل را اجرا کنید (روی دیتابیس تازه).
-- شامل: ۳ شعبه، ۴ کاربر، دسته‌بندی‌ها، ۳ صندوق.
--
-- رمز همه کاربران: basharaf123
-- (hash واقعی bcrypt — بعد از اولین ورود تغییر دهید)
-- ═══════════════════════════════════════════════════════════════════════

-- ─── شعب ───
INSERT INTO branches (id, name, address, manager, opened) VALUES
  ('11111111-1111-1111-1111-111111111111', 'شعبه مرکزی',  'تهران، خیابان ولیعصر',   'مهدی رضایی',  '۱۴۰۰/۰۱/۰۱'),
  ('22222222-2222-2222-2222-222222222222', 'شعبه تجریش',   'تهران، تجریش',           'نرگس احمدی',  '۱۴۰۱/۰۳/۱۵'),
  ('33333333-3333-3333-3333-333333333333', 'شعبه یوسف‌آباد', 'تهران، یوسف‌آباد',     'سارا کریمی',  '۱۴۰۲/۰۷/۱۰')
ON CONFLICT (id) DO NOTHING;

-- ─── کاربران (رمز: basharaf123) ───
INSERT INTO users (name, email, password_hash, role, assigned_branch_id, initials, joined) VALUES
  ('مدیر کل',     'admin@basharaf.app',  '$2a$10$9adQQ.x.CqBHKzrmHiF2XOwGhqf5A0Ndst6sJe6CyExpEKC8K3.4u', 'SuperAdmin', NULL,                                       'م.ک', '۱۴۰۰/۰۱/۰۱'),
  ('مهدی رضایی',  'mehdi@basharaf.app',  '$2a$10$9adQQ.x.CqBHKzrmHiF2XOwGhqf5A0Ndst6sJe6CyExpEKC8K3.4u', 'BranchUser', '11111111-1111-1111-1111-111111111111', 'م.ر', '۱۴۰۰/۰۲/۰۱'),
  ('نرگس احمدی',  'narges@basharaf.app', '$2a$10$9adQQ.x.CqBHKzrmHiF2XOwGhqf5A0Ndst6sJe6CyExpEKC8K3.4u', 'BranchUser', '22222222-2222-2222-2222-222222222222', 'ن.ا', '۱۴۰۱/۰۳/۱۵'),
  ('سارا کریمی',  'sara@basharaf.app',   '$2a$10$9adQQ.x.CqBHKzrmHiF2XOwGhqf5A0Ndst6sJe6CyExpEKC8K3.4u', 'BranchUser', '33333333-3333-3333-3333-333333333333', 'س.ک', '۱۴۰۲/۰۷/۱۰')
ON CONFLICT (email) DO NOTHING;

-- ─── دسته‌بندی‌ها ───
INSERT INTO categories (name, type) VALUES
  ('فروش غذا',      'income'),
  ('فروش نوشیدنی',   'income'),
  ('سایر درآمد',     'income'),
  ('خرید مواد اولیه', 'expense'),
  ('حقوق پرسنل',     'expense'),
  ('اجاره',          'expense'),
  ('قبوض',           'expense'),
  ('تعمیرات',        'expense'),
  ('سایر هزینه',     'expense')
ON CONFLICT DO NOTHING;

-- ─── صندوق‌ها ───
INSERT INTO accounts (name, type) VALUES
  ('صندوق نقدی',  'cash'),
  ('حساب بانکی',  'bank'),
  ('دستگاه پوز',  'pos')
ON CONFLICT DO NOTHING;

-- ─── تأیید ───
SELECT
  (SELECT COUNT(*) FROM branches)   AS branches,
  (SELECT COUNT(*) FROM users)      AS users,
  (SELECT COUNT(*) FROM categories) AS categories,
  (SELECT COUNT(*) FROM accounts)   AS accounts;
