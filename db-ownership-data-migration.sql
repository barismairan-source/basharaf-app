-- ════════════════════════════════════════════════════════════════════
-- db-ownership-data-migration.sql
-- مرحله ۳ مدل مالکیت — درج شرکا + ربط شعبه + تبدیل نوع حساب‌ها
--
-- این فایل کاملاً بدون UUID دستی است:
--   - partners با RETURNING id تولید می‌شوند و در همان DO block استفاده
--   - branch_id از subquery روی جدول branches گرفته می‌شود
--   - account ها با WHERE name = '...' پیدا می‌شوند
--   - کل عملیات idempotent است — اجرای دوباره بی‌خطر
--
-- ترتیب اجرا در pgAdmin:
--   ۱. بخش A را اجرا کنید (فقط SELECT) — خروجی را تأیید کنید
--   ۲. اگر نام‌ها درست بودند، بخش B را اجرا کنید
--   ۳. بخش C را اجرا کنید تا نتیجه تأیید شود
-- ════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════
-- بخش A — تأیید پیش‌نیاز (فقط SELECT — هیچ تغییری نمی‌دهد)
-- ════════════════════════════════════════════════════════════════════
--
-- در pgAdmin این بخش را select کنید و اجرا کنید.
-- اگر خروجی با توضیحات زیر مطابقت دارد، بخش B را اجرا کنید.
--
-- ① باید شعبه‌ای با نام دقیق A.S.P (یا هر نام مشابه) پیدا شود:

SELECT
  'شعب موجود' AS "بررسی",
  id,
  name AS "نام شعبه"
FROM branches
ORDER BY name;

-- انتظار: یک یا چند ردیف — نام دقیق شعبه‌ای که شرکا در آن سرمایه دارند را یادداشت کنید.
-- اگر نام دقیق شعبه در DB با 'A.S.P' فرق دارد، در بخش B خط v_branch_name را ویرایش کنید.

-- ② حساب‌های شرکا باید پیدا شوند (انتظار: ۲ ردیف با type='cash'):

SELECT
  'حساب‌های شرکا' AS "بررسی",
  id,
  name AS "نام حساب",
  type AS "نوع",
  balance AS "موجودی (toman)"
FROM accounts
WHERE name ILIKE '%شرف%'
ORDER BY name;

-- انتظار: ۲ ردیف — «صندوق حسین شرف» و «صندوق شهریار شرف» هر دو با type='cash'
-- اگر نام‌ها فرق دارند، در بخش B متغیرهای v_husein_account_name و v_shahryar_account_name را ویرایش کنید.
-- اگر یکی/هر دو قبلاً type='partner_equity' هستند، یعنی migration قبلاً اجرا شده (idempotent — باز هم بی‌خطر).

-- ③ جدول partners باید خالی یا فقط شرکای قبلاً اضافه‌شده باشد:

SELECT
  'شرکای موجود' AS "بررسی",
  id,
  full_name AS "نام",
  is_active AS "فعال"
FROM partners
ORDER BY full_name;

-- انتظار: خالی (اگر اولین اجرا)، یا «حسین شرف» و «شهریار شرف» (اگر قبلاً اجرا شده)


-- ════════════════════════════════════════════════════════════════════
-- بخش B — Migration اصلی
-- فقط بعد از تأیید بخش A اجرا کنید
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ─── متغیرهای قابل تنظیم ───────────────────────────────────────
  -- نام دقیق شعبه در DB (از خروجی بخش A بگیرید):
  v_branch_name           text := 'A.S.P';

  -- نام دقیق حساب‌های شرکا در DB (از خروجی بخش A بگیرید):
  v_husein_account_name   text := 'صندوق حسین شرف';
  v_shahryar_account_name text := 'صندوق شهریار شرف';

  -- تاریخ ورود شرکا به شعبه (جلالی متنی):
  v_husein_joined_date    text := '۱۴۰۳/۰۸/۰۱';
  v_shahryar_joined_date  text := '۱۴۰۳/۰۸/۰۱';

  -- ─── متغیرهای داخلی ────────────────────────────────────────────
  v_husein_id    uuid;
  v_shahryar_id  uuid;
  v_branch_id    uuid;
  v_rows_updated integer;
BEGIN

  -- ┌─────────────────────────────────────────────────────────────┐
  -- │ ۱. پیدا کردن branch_id از نام شعبه                         │
  -- └─────────────────────────────────────────────────────────────┘
  SELECT id INTO v_branch_id
  FROM branches
  WHERE name = v_branch_name
  LIMIT 1;

  IF v_branch_id IS NULL THEN
    RAISE EXCEPTION
      'شعبه «%» در DB پیدا نشد. نام دقیق را از بخش A بررسی کنید و v_branch_name را اصلاح کنید.',
      v_branch_name;
  END IF;
  RAISE NOTICE 'branch_id شعبه %: %', v_branch_name, v_branch_id;

  -- ┌─────────────────────────────────────────────────────────────┐
  -- │ ۲. حسین شرف — get or insert                                 │
  -- └─────────────────────────────────────────────────────────────┘
  SELECT id INTO v_husein_id
  FROM partners
  WHERE full_name = 'حسین شرف'
  LIMIT 1;

  IF v_husein_id IS NULL THEN
    INSERT INTO partners (full_name)
    VALUES ('حسین شرف')
    RETURNING id INTO v_husein_id;
    RAISE NOTICE 'شریک «حسین شرف» ایجاد شد: %', v_husein_id;
  ELSE
    RAISE NOTICE 'شریک «حسین شرف» از قبل موجود بود: %', v_husein_id;
  END IF;

  -- ┌─────────────────────────────────────────────────────────────┐
  -- │ ۳. شهریار شرف — get or insert                               │
  -- └─────────────────────────────────────────────────────────────┘
  SELECT id INTO v_shahryar_id
  FROM partners
  WHERE full_name = 'شهریار شرف'
  LIMIT 1;

  IF v_shahryar_id IS NULL THEN
    INSERT INTO partners (full_name)
    VALUES ('شهریار شرف')
    RETURNING id INTO v_shahryar_id;
    RAISE NOTICE 'شریک «شهریار شرف» ایجاد شد: %', v_shahryar_id;
  ELSE
    RAISE NOTICE 'شریک «شهریار شرف» از قبل موجود بود: %', v_shahryar_id;
  END IF;

  -- ┌─────────────────────────────────────────────────────────────┐
  -- │ ۴. رابطه شریک↔شعبه — حسین                                  │
  -- └─────────────────────────────────────────────────────────────┘
  IF NOT EXISTS (
    SELECT 1 FROM partner_branches
    WHERE partner_id = v_husein_id
      AND branch_id = v_branch_id
      AND is_active = true
  ) THEN
    INSERT INTO partner_branches (partner_id, branch_id, joined_date)
    VALUES (v_husein_id, v_branch_id, v_husein_joined_date);
    RAISE NOTICE 'رابطه حسین↔% اضافه شد', v_branch_name;
  ELSE
    RAISE NOTICE 'رابطه حسین↔% از قبل موجود بود', v_branch_name;
  END IF;

  -- ┌─────────────────────────────────────────────────────────────┐
  -- │ ۵. رابطه شریک↔شعبه — شهریار                                │
  -- └─────────────────────────────────────────────────────────────┘
  IF NOT EXISTS (
    SELECT 1 FROM partner_branches
    WHERE partner_id = v_shahryar_id
      AND branch_id = v_branch_id
      AND is_active = true
  ) THEN
    INSERT INTO partner_branches (partner_id, branch_id, joined_date)
    VALUES (v_shahryar_id, v_branch_id, v_shahryar_joined_date);
    RAISE NOTICE 'رابطه شهریار↔% اضافه شد', v_branch_name;
  ELSE
    RAISE NOTICE 'رابطه شهریار↔% از قبل موجود بود', v_branch_name;
  END IF;

  -- ┌─────────────────────────────────────────────────────────────┐
  -- │ ۶. تبدیل نوع حساب حسین شرف                                  │
  -- │    نکته: balance دست نمی‌خورد — فقط type و partner_id       │
  -- └─────────────────────────────────────────────────────────────┘
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = v_husein_account_name) THEN
    RAISE WARNING
      'حساب «%» پیدا نشد! نام را از بخش A بررسی کنید و v_husein_account_name را اصلاح کنید.',
      v_husein_account_name;
  END IF;

  UPDATE accounts
  SET
    type       = 'partner_equity',
    partner_id = v_husein_id,
    updated_at = NOW()
  WHERE name = v_husein_account_name
    AND (partner_id IS NULL OR partner_id = v_husein_id);
  -- partner_id IS NULL    → اولین اجرا
  -- partner_id = v_husein_id → اجرای تکراری (idempotent — بی‌خطر)

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE WARNING 'حساب «%» آپدیت نشد — ممکن است قبلاً به شریک دیگری وصل شده باشد.', v_husein_account_name;
  ELSE
    RAISE NOTICE 'حساب «%» → partner_equity ✓ (% ردیف)', v_husein_account_name, v_rows_updated;
  END IF;

  -- ┌─────────────────────────────────────────────────────────────┐
  -- │ ۷. تبدیل نوع حساب شهریار شرف                               │
  -- └─────────────────────────────────────────────────────────────┘
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = v_shahryar_account_name) THEN
    RAISE WARNING
      'حساب «%» پیدا نشد! نام را از بخش A بررسی کنید و v_shahryar_account_name را اصلاح کنید.',
      v_shahryar_account_name;
  END IF;

  UPDATE accounts
  SET
    type       = 'partner_equity',
    partner_id = v_shahryar_id,
    updated_at = NOW()
  WHERE name = v_shahryar_account_name
    AND (partner_id IS NULL OR partner_id = v_shahryar_id);

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RAISE WARNING 'حساب «%» آپدیت نشد — ممکن است قبلاً به شریک دیگری وصل شده باشد.', v_shahryar_account_name;
  ELSE
    RAISE NOTICE 'حساب «%» → partner_equity ✓ (% ردیف)', v_shahryar_account_name, v_rows_updated;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE '✅ مرحله ۳ با موفقیت اجرا شد';
  RAISE NOTICE '   بخش C را اجرا کنید تا نتایج تأیید شود';
  RAISE NOTICE '══════════════════════════════════════════';

END $$;


-- ════════════════════════════════════════════════════════════════════
-- بخش C — تأیید نهایی (فقط SELECT)
-- بعد از اجرای بخش B این بخش را اجرا کنید
-- ════════════════════════════════════════════════════════════════════

-- ① شرکا — باید ۲ ردیف حسین و شهریار باشند:
SELECT
  '① شرکا' AS "تأیید",
  p.id,
  p.full_name  AS "نام",
  p.is_active  AS "فعال",
  p.created_at AS "ایجاد شده"
FROM partners p
ORDER BY p.full_name;
-- انتظار: ۲ ردیف (حسین شرف، شهریار شرف) هر دو is_active=true

-- ② رابطه شریک↔شعبه — باید ۲ ردیف باشند:
SELECT
  '② partner_branches' AS "تأیید",
  pb.id,
  p.full_name  AS "شریک",
  b.name       AS "شعبه",
  pb.joined_date AS "تاریخ ورود",
  pb.is_active AS "فعال"
FROM partner_branches pb
JOIN partners p ON p.id = pb.partner_id
LEFT JOIN branches b ON b.id = pb.branch_id
ORDER BY p.full_name;
-- انتظار: ۲ ردیف با نام شعبه A.S.P

-- ③ حساب‌های partner_equity — باید ۲ ردیف با partner_id پر باشند:
SELECT
  '③ equity accounts' AS "تأیید",
  a.id,
  a.name       AS "نام حساب",
  a.type       AS "نوع",
  a.balance    AS "موجودی (toman — دست‌نخورده)",
  p.full_name  AS "شریک",
  a.partner_id AS "partner_id"
FROM accounts a
LEFT JOIN partners p ON p.id = a.partner_id
WHERE a.type = 'partner_equity'
ORDER BY a.name;
-- انتظار:
--   ۲ ردیف با type='partner_equity'
--   partner_id پر (نه null)
--   full_name هر شریک کنار حساب خودش
--   balance دقیقاً همان عدد قبل از migration (دست‌نخورده)
