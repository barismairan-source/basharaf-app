'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Phone, Send, Bell, CheckCircle2, XCircle } from 'lucide-react';
import { useAppStore } from '@/store';

interface RuleRow {
  key: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  smsEnabled: boolean;
}

interface TestState {
  loading: boolean;
  result?: { status: string; logId: string } | null;
  error?: string;
}

export function SmsPane() {
  const user = useAppStore((s) => s.user);

  // ── شماره موبایل ─────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // ── پیامک آزمایشی ─────────────────────────────────────────────
  const [test, setTest] = useState<TestState>({ loading: false });

  // ── قوانین پیامک ─────────────────────────────────────────────
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    // بارگذاری شماره فعلی کاربر (از API)
    fetch(`/api/users/${user?.id}`)
      .then((r) => r.json())
      .then((d) => { if (d.user?.smsPhone) setPhone(d.user.smsPhone); })
      .catch(() => {});

    // بارگذاری قوانین
    fetch('/api/admin/notification-rules')
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .catch(() => {})
      .finally(() => setRulesLoading(false));
  }, [user?.id]);

  async function savePhone() {
    setPhoneError('');
    setPhoneSaving(true);
    try {
      const res = await fetch(`/api/users/${user?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsPhone: phone || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        setPhoneError(d.error ?? 'خطا در ذخیره');
      } else {
        setPhoneSaved(true);
        setTimeout(() => setPhoneSaved(false), 3000);
      }
    } finally {
      setPhoneSaving(false);
    }
  }

  async function sendTest() {
    setTest({ loading: true });
    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone || undefined }),
      });
      const d = await res.json();
      if (!res.ok) setTest({ loading: false, error: d.error });
      else setTest({ loading: false, result: d });
    } catch {
      setTest({ loading: false, error: 'خطای شبکه' });
    }
  }

  async function toggleSms(key: string, current: boolean) {
    setToggling(key);
    try {
      const res = await fetch('/api/admin/notification-rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, smsEnabled: !current }),
      });
      if (res.ok) {
        setRules((prev) =>
          prev.map((r) => (r.key === key ? { ...r, smsEnabled: !current } : r))
        );
      }
    } finally {
      setToggling(null);
    }
  }

  const statusLabel: Record<string, string> = {
    sent: 'ارسال شد ✓',
    dry_run: 'Dry-run (کلید API تنظیم نشده)',
    failed: 'خطا در ارسال',
    deduped: 'تکراری — رد شد',
    capped: 'سقف روزانه پر شده',
  };

  return (
    <div className="space-y-6">
      {/* ── شماره موبایل ── */}
      <section className="bg-white border border-stone-100 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Phone size={15} className="text-stone-500" strokeWidth={1.5} />
          <h2 className="text-[14px] font-medium text-stone-900">شماره موبایل برای پیامک هشدار</h2>
        </div>
        <p className="text-[12px] text-stone-500">
          پیامک‌های هشدار سیستم به این شماره ارسال می‌شوند. اگر KAVENEGAR_API_KEY تنظیم نشده
          باشد، پیامک‌ها در حالت <strong>dry-run</strong> فقط لاگ می‌شوند.
        </p>

        <div className="flex gap-2 items-start">
          <div className="flex-1">
            <input
              type="tel"
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
              className="w-full h-9 px-3 text-[13px] border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
            {phoneError && (
              <p className="text-[11px] text-danger mt-1">{phoneError}</p>
            )}
          </div>
          <button
            onClick={savePhone}
            disabled={phoneSaving}
            className="h-9 px-4 text-[12.5px] bg-stone-900 text-white rounded-md disabled:opacity-50 shrink-0"
          >
            {phoneSaved ? 'ذخیره شد ✓' : phoneSaving ? 'در حال ذخیره…' : 'ذخیره'}
          </button>
          <button
            onClick={sendTest}
            disabled={test.loading || !phone}
            title="ارسال پیامک آزمایشی"
            className="h-9 px-4 text-[12.5px] border border-stone-200 rounded-md hover:bg-stone-50 disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            <Send size={13} strokeWidth={1.5} />
            آزمایشی
          </button>
        </div>

        {test.result && (
          <div className="flex items-center gap-2 text-[12px] text-stone-600 bg-stone-50 rounded-md px-3 py-2">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
            {statusLabel[test.result.status] ?? test.result.status}
            <span className="text-stone-400 text-[11px]">logId: {test.result.logId}</span>
          </div>
        )}
        {test.error && (
          <div className="flex items-center gap-2 text-[12px] text-danger bg-red-50 rounded-md px-3 py-2">
            <XCircle size={13} className="shrink-0" />
            {test.error}
          </div>
        )}
      </section>

      {/* ── قوانین پیامک ── */}
      <section className="bg-white border border-stone-100 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Bell size={15} className="text-stone-500" strokeWidth={1.5} />
          <h2 className="text-[14px] font-medium text-stone-900">قوانین هشدار پیامکی</h2>
        </div>
        <p className="text-[12px] text-stone-500">
          برای هر قانون، پیامک را به‌طور مستقل روشن یا خاموش کنید.
          پیامک فقط وقتی قانون و پیامک هر دو فعال باشند ارسال می‌شود.
        </p>

        {rulesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-stone-100 rounded-md animate-pulse" />
            ))}
          </div>
        ) : rules.length === 0 ? (
          <p className="text-[12px] text-muted text-center py-6">هنوز قانونی تعریف نشده</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rules.map((rule) => (
              <li key={rule.key} className="flex items-center gap-3 py-3">
                <MessageSquare
                  size={14}
                  strokeWidth={1.5}
                  className={rule.smsEnabled ? 'text-emerald-600' : 'text-stone-300'}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-stone-800">{rule.label}</p>
                  {rule.description && (
                    <p className="text-[11px] text-stone-400 truncate">{rule.description}</p>
                  )}
                </div>
                {!rule.enabled && (
                  <span className="text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                    غیرفعال
                  </span>
                )}
                <button
                  onClick={() => toggleSms(rule.key, rule.smsEnabled)}
                  disabled={toggling === rule.key}
                  aria-label={rule.smsEnabled ? 'خاموش کردن پیامک' : 'روشن کردن پیامک'}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${
                    rule.smsEnabled ? 'bg-emerald-500' : 'bg-stone-200'
                  } ${toggling === rule.key ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      rule.smsEnabled ? '-translate-x-1' : 'translate-x-1'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
