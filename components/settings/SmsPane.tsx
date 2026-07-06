'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Phone, Bell, History, Settings2,
  CheckCircle2, XCircle, RefreshCw, Send,
} from 'lucide-react';
import { useAppStore } from '@/store';

// ─── types ─────────────────────────────────────────────────────────
interface AdminRow { id: string; name: string; email: string; smsPhone: string | null }
interface RuleRow  { key: string; label: string; description?: string | null; enabled: boolean; smsEnabled: boolean }
interface LogRow   { id: string; phone: string; message: string; templateKey: string | null; status: string; createdAt: string }

const STATUS_LABEL: Record<string, string> = {
  sent:     'ارسال شد',
  dry_run:  'Dry-run',
  failed:   'خطا',
  deduped:  'تکراری',
  capped:   'سقف پر',
  pending:  'در انتظار',
};
const STATUS_COLOR: Record<string, string> = {
  sent:    'text-emerald-700 bg-emerald-50',
  dry_run: 'text-amber-700 bg-amber-50',
  failed:  'text-red-700 bg-red-50',
  deduped: 'text-stone-500 bg-stone-100',
  capped:  'text-orange-700 bg-orange-50',
  pending: 'text-stone-500 bg-stone-100',
};

// ─── SectionCard helper ─────────────────────────────────────────────
function SectionCard({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-stone-100 rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-stone-500" strokeWidth={1.5} />
        <h2 className="text-[14px] font-medium text-stone-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ─── SmsPane ────────────────────────────────────────────────────────
export function SmsPane() {
  const user = useAppStore((s) => s.user);

  // ── تنظیمات SMS ──────────────────────────────────────────────────
  const [cap, setCap] = useState(5);
  const [dedup, setDedup] = useState(2);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // ── مدیریت شماره‌های ادمین ────────────────────────────────────────
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [phoneEdits, setPhoneEdits] = useState<Record<string, string>>({});
  const [phoneSaving, setPhoneSaving] = useState<string | null>(null);

  // ── قوانین پیامک ─────────────────────────────────────────────────
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // ── لاگ پیامک ────────────────────────────────────────────────────
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  // ── تست کامل ─────────────────────────────────────────────────────
  const [testState, setTestState] = useState<{ loading: boolean; result?: Record<string, unknown>; error?: string }>({ loading: false });

  // ── لود اولیه ────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      fetch('/api/admin/sms-settings').then((r) => r.json()),
      fetch('/api/users').then((r) => r.json()),
      fetch('/api/admin/notification-rules').then((r) => r.json()),
      fetch('/api/sms/log').then((r) => r.json()),
    ]).then(([settings, users, rules, logs]) => {
      setCap(settings.dailyCap ?? 5);
      setDedup(settings.dedupHours ?? 2);

      const superAdmins: AdminRow[] = (users.users ?? []).filter((u: AdminRow) => {
        const fullUser = users.users?.find((x: { id: string; role: string }) => x.id === u.id);
        return fullUser?.role === 'SuperAdmin';
      });
      // اگر role در users API نیست filter به جور دیگر
      const su: AdminRow[] = (users.users ?? []).filter(
        (u: { role: string }) => u.role === 'SuperAdmin'
      );
      setAdmins(su);
      setPhoneEdits(Object.fromEntries(su.map((a: AdminRow) => [a.id, a.smsPhone ?? ''])));

      setRules(rules.rules ?? []);
      setLogs(logs.logs ?? []);
    }).catch(() => {}).finally(() => {
      setRulesLoading(false);
      setLogsLoading(false);
    });
  }, [user?.id]);

  const refreshLogs = useCallback(() => {
    setLogsLoading(true);
    fetch('/api/sms/log')
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []))
      .catch(() => {})
      .finally(() => setLogsLoading(false));
  }, []);

  // ── ذخیره تنظیمات ────────────────────────────────────────────────
  async function saveSettings() {
    setSettingsSaving(true);
    try {
      await fetch('/api/admin/sms-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dailyCap: cap, dedupHours: dedup }),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } finally {
      setSettingsSaving(false);
    }
  }

  // ── ذخیره شماره ادمین ────────────────────────────────────────────
  async function saveAdminPhone(adminId: string) {
    setPhoneSaving(adminId);
    const phone = phoneEdits[adminId] ?? '';
    try {
      const res = await fetch(`/api/users/${adminId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsPhone: phone || null }),
      });
      if (res.ok) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === adminId ? { ...a, smsPhone: phone || null } : a))
        );
      }
    } finally {
      setPhoneSaving(null);
    }
  }

  // ── toggle smsEnabled ─────────────────────────────────────────────
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

  // ── تست کامل (از مسیر واقعی notify) ──────────────────────────────
  async function runTestNotify() {
    setTestState({ loading: true });
    try {
      const res = await fetch('/api/sms/test-notify', { method: 'POST' });
      const d = await res.json() as Record<string, unknown>;
      if (!res.ok) setTestState({ loading: false, error: (d.error as string) ?? 'خطا' });
      else {
        setTestState({ loading: false, result: d });
        refreshLogs();
      }
    } catch {
      setTestState({ loading: false, error: 'خطای شبکه' });
    }
  }

  return (
    <div className="space-y-6">

      {/* ── تنظیمات SMS ── */}
      <SectionCard icon={Settings2} title="تنظیمات پیامک">
        <p className="text-[12px] text-stone-500">
          سقف روزانه و بازه‌ی dedup در اینجا تنظیم می‌شوند.
          اگر <code className="text-[11px] bg-stone-100 px-1 rounded">KAVENEGAR_API_KEY</code> در env نباشد،
          پیامک‌ها در حالت <strong>dry-run</strong> فقط لاگ می‌شوند.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <label className="space-y-1">
            <span className="text-[12px] text-stone-600">سقف روزانه (هر شماره)</span>
            <input
              type="number" min={1} max={50}
              value={cap}
              onChange={(e) => setCap(Number(e.target.value))}
              className="w-full h-9 px-3 text-[13px] border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[12px] text-stone-600">بازه Dedup (ساعت)</span>
            <input
              type="number" min={0} max={24}
              value={dedup}
              onChange={(e) => setDedup(Number(e.target.value))}
              className="w-full h-9 px-3 text-[13px] border border-stone-200 rounded-md focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
          </label>
        </div>
        <button
          onClick={saveSettings}
          disabled={settingsSaving}
          className="h-9 px-5 text-[12.5px] bg-stone-900 text-white rounded-md disabled:opacity-50"
        >
          {settingsSaved ? 'ذخیره شد ✓' : settingsSaving ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
        </button>
      </SectionCard>

      {/* ── مدیریت شماره‌های ادمین ── */}
      <SectionCard icon={Phone} title="شماره‌های دریافت‌کننده پیامک">
        <p className="text-[12px] text-stone-500">
          پیامک‌های هشدار به شماره‌های ثبت‌شده‌ی SuperAdminها ارسال می‌شود.
        </p>
        {admins.length === 0 ? (
          <p className="text-[12px] text-muted text-center py-4">هیچ SuperAdminی یافت نشد</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {admins.map((admin) => (
              <li key={admin.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-stone-800">{admin.name}</p>
                  <p className="text-[11px] text-stone-400">{admin.email}</p>
                </div>
                <input
                  type="tel"
                  dir="ltr"
                  placeholder="09xxxxxxxxx"
                  value={phoneEdits[admin.id] ?? ''}
                  onChange={(e) =>
                    setPhoneEdits((prev) => ({ ...prev, [admin.id]: e.target.value }))
                  }
                  className="w-36 h-8 px-2 text-[12px] border border-stone-200 rounded-md focus:outline-none focus:ring-1 focus:ring-stone-300"
                />
                <button
                  onClick={() => saveAdminPhone(admin.id)}
                  disabled={phoneSaving === admin.id}
                  className="h-8 px-3 text-[11.5px] bg-stone-800 text-white rounded-md disabled:opacity-50 shrink-0"
                >
                  {phoneSaving === admin.id ? '…' : 'ذخیره'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* ── قوانین پیامک ── */}
      <SectionCard icon={Bell} title="قوانین هشدار پیامکی">
        <p className="text-[12px] text-stone-500">
          پیامک فقط وقتی ارسال می‌شود که هم قانون فعال باشد هم پیامک آن روشن باشد.
          همه با پیش‌فرض خاموش شروع می‌کنند.
        </p>

        {/* تست از مسیر کامل */}
        <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-md">
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] text-stone-700">تست از مسیر واقعی</p>
            <p className="text-[11px] text-stone-400">
              قانون <code>sms.test_notify</code> را روشن کن، سپس این دکمه را بزن — یک notify واقعی اجرا می‌شود
            </p>
          </div>
          <button
            onClick={runTestNotify}
            disabled={testState.loading}
            className="h-8 px-3 text-[11.5px] border border-stone-200 rounded-md hover:bg-white flex items-center gap-1.5 shrink-0"
          >
            <Send size={12} strokeWidth={1.5} />
            {testState.loading ? '…' : 'تست کامل'}
          </button>
        </div>
        {testState.result && (
          <div className="flex items-start gap-2 text-[12px] text-stone-600 bg-stone-50 rounded-md px-3 py-2">
            <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span>اعلان ایجاد شد.</span>
              {testState.result.smsLog ? (
                <span className="mr-2 text-stone-500">
                  لاگ SMS: <strong>{String((testState.result.smsLog as Record<string, unknown>).status ?? '')}</strong>
                </span>
              ) : (
                <span className="mr-2 text-amber-600">پیامک ارسال نشد — sms_enabled قانون را روشن کن</span>
              )}
            </div>
          </div>
        )}
        {testState.error && (
          <div className="flex items-center gap-2 text-[12px] text-red-700 bg-red-50 rounded-md px-3 py-2">
            <XCircle size={13} className="shrink-0" />
            {testState.error}
          </div>
        )}

        {rulesLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-stone-100 rounded-md animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {rules.map((rule) => (
              <li key={rule.key} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-stone-800">{rule.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-[10px] text-stone-400">{rule.key}</code>
                    {!rule.enabled && (
                      <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">قانون خاموش</span>
                    )}
                  </div>
                </div>
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
      </SectionCard>

      {/* ── لاگ پیامک ── */}
      <SectionCard icon={History} title="لاگ پیامک‌های اخیر">
        <div className="flex justify-end">
          <button
            onClick={refreshLogs}
            disabled={logsLoading}
            className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800"
          >
            <RefreshCw size={12} strokeWidth={1.5} className={logsLoading ? 'animate-spin' : ''} />
            بارگذاری مجدد
          </button>
        </div>

        {logsLoading ? (
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 bg-stone-100 rounded animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-[12px] text-muted text-center py-6">هنوز هیچ پیامکی ارسال نشده</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-right text-stone-400 border-b border-stone-100">
                  <th className="pb-2 font-normal">زمان</th>
                  <th className="pb-2 font-normal">شماره</th>
                  <th className="pb-2 font-normal">قانون</th>
                  <th className="pb-2 font-normal">وضعیت</th>
                  <th className="pb-2 font-normal">پیام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {logs.map((log) => (
                  <tr key={log.id} className="text-stone-600">
                    <td className="py-2 whitespace-nowrap text-stone-400" dir="ltr">
                      {new Date(log.createdAt).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2 whitespace-nowrap" dir="ltr">{log.phone}</td>
                    <td className="py-2">
                      <code className="text-[10px] text-stone-400">{log.templateKey ?? '—'}</code>
                    </td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[log.status] ?? 'text-stone-500'}`}>
                        {STATUS_LABEL[log.status] ?? log.status}
                      </span>
                    </td>
                    <td className="py-2 max-w-[200px] truncate text-stone-500">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
