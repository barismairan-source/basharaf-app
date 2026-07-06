-- فاز ۴: موتور کارآگاه مالی
-- اجرا در pgAdmin بعد از فازهای ۲ و ۳

-- ════════════════════════════════════════════
-- ۱. جدول anomaly_findings
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anomaly_findings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key    text        NOT NULL,
  severity    text        NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  status      text        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'investigating', 'confirmed', 'false_positive')),
  branch_id   uuid        REFERENCES branches(id) ON DELETE SET NULL,
  entity_type text,
  entity_id   text,
  jalali_date text,
  detected_at timestamptz NOT NULL DEFAULT NOW(),
  resolved_at timestamptz,
  resolved_by uuid        REFERENCES users(id) ON DELETE SET NULL,
  details     jsonb       NOT NULL DEFAULT '{}',
  note        text        NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS af_rule_idx     ON anomaly_findings(rule_key);
CREATE INDEX IF NOT EXISTS af_status_idx   ON anomaly_findings(status);
CREATE INDEX IF NOT EXISTS af_branch_idx   ON anomaly_findings(branch_id);
CREATE INDEX IF NOT EXISTS af_entity_idx   ON anomaly_findings(entity_id);
CREATE INDEX IF NOT EXISTS af_detected_idx ON anomaly_findings(detected_at);

-- ════════════════════════════════════════════
-- ۲. جدول anomaly_rules — آستانه‌های قابل‌تنظیم
-- ════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS anomaly_rules (
  rule_key   text    PRIMARY KEY,
  enabled    boolean NOT NULL DEFAULT true,
  thresholds jsonb   NOT NULL DEFAULT '{}'
);

INSERT INTO anomaly_rules (rule_key, enabled, thresholds) VALUES
  ('waste_spike',          true, '{"multiplierPct": 200}'),
  ('price_jump',           true, '{"jumpPct": 30}'),
  ('rejection_pattern',    true, '{"maxRejects": 3, "windowDays": 3}'),
  ('consumption_spike',    true, '{"multiplierPct": 250}'),
  ('below_approval_limit', true, '{"maxCount": 3, "windowHours": 24, "rangeStartPct": 80}'),
  ('off_hours_activity',   true, '{"startHour": 23, "endHour": 5}')
ON CONFLICT (rule_key) DO NOTHING;

-- ════════════════════════════════════════════
-- ۳. seed قوانین کارآگاه در notification_rules
--    (برای toggle UI و SMS آینده — فاز ۵)
-- ════════════════════════════════════════════
INSERT INTO notification_rules (key, label, description, enabled, threshold, sms_enabled) VALUES
  ('waste_spike',          'جهش ضایعات',            'افزایش غیرعادی مبلغ برگه ضایعات',              true, 200, false),
  ('price_jump',           'جهش قیمت خرید',         'افزایش غیرعادی قیمت خرید یک ماده اولیه',       true, 30,  false),
  ('rejection_pattern',    'الگوی رد مکرر',         'رد مکرر ثبت‌های یک کاربر در ۳ روز',            true, 3,   false),
  ('consumption_spike',    'جهش مصرف انبار',        'مصرف روزانه بیش از ۲٫۵ برابر میانگین هفتگی',  true, 250, false),
  ('below_approval_limit', 'تراکنش زیر سقف تأیید', 'الگوی احتمالی تقسیم تراکنش برای فرار از سقف', true, 3,   false),
  ('off_hours_activity',   'فعالیت ساعت غیرعادی',  'ثبت تراکنش یا برگه در ساعت غیرعادی شبانه',     true, 23,  false)
ON CONFLICT (key) DO NOTHING;
