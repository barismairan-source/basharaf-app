'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell, Clock, AlertTriangle, AlertOctagon,
  ShoppingCart, Package, CheckCircle2, RefreshCw, DollarSign,
  type LucideIcon,
} from 'lucide-react';
import type { NotificationRule } from '@/types/notification';

const RULE_META: Record<string, { icon: LucideIcon; accent: string }> = {
  pending_approval:  { icon: Clock,         accent: 'text-indigo-400' },
  voucher_pending:   { icon: Package,       accent: 'text-amber-400' },
  low_stock:         { icon: AlertTriangle, accent: 'text-amber-400' },
  inventory_clamp:   { icon: AlertOctagon,  accent: 'text-red-400' },
  po_received:       { icon: ShoppingCart,  accent: 'text-emerald-400' },
  high_value_tx:     { icon: DollarSign,    accent: 'text-sky-400' },
};

function formatThreshold(key: string, threshold: number | null): string {
  if (threshold === null) return '';
  if (key === 'high_value_tx') {
    return new Intl.NumberFormat('fa-IR').format(threshold) + ' تومان';
  }
  return new Intl.NumberFormat('fa-IR').format(threshold);
}

function RuleRow({
  rule,
  onToggle,
  onThreshold,
  saving,
}: {
  rule: NotificationRule;
  onToggle: (key: string, enabled: boolean) => void;
  onThreshold: (key: string, value: number | null) => void;
  saving: string | null;
}) {
  const meta = RULE_META[rule.key] ?? { icon: Bell, accent: 'text-stone-400' };
  const Icon = meta.icon;
  const isSaving = saving === rule.key;

  const [localThreshold, setLocalThreshold] = useState(
    rule.threshold !== null ? String(rule.threshold) : ''
  );

  return (
    <div className={`flex items-start gap-4 px-5 py-4 border-b border-stone-800/60 last:border-b-0 transition-opacity ${isSaving ? 'opacity-60' : ''}`}>
      {/* Icon */}
      <div className="w-9 h-9 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className={meta.accent} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13.5px] font-medium text-stone-100">{rule.label}</p>
          {!rule.enabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-400">غیرفعال</span>
          )}
        </div>
        {rule.description && (
          <p className="text-[12px] text-stone-500 mt-0.5">{rule.description}</p>
        )}

        {/* Threshold input */}
        {rule.threshold !== null && rule.enabled && (
          <div className="mt-2.5 flex items-center gap-2">
            <label className="text-[11.5px] text-stone-400">آستانه:</label>
            <input
              type="number"
              value={localThreshold}
              onChange={(e) => setLocalThreshold(e.target.value)}
              onBlur={() => {
                const v = parseInt(localThreshold, 10);
                if (!isNaN(v) && v >= 0) onThreshold(rule.key, v);
              }}
              className="w-36 h-7 px-2 rounded-md bg-stone-800 border border-stone-700 text-stone-200 text-[12px] text-right focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              dir="ltr"
            />
            {rule.threshold !== null && (
              <span className="text-[11px] text-stone-500">
                {formatThreshold(rule.key, rule.threshold)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={rule.enabled}
        onClick={() => onToggle(rule.key, !rule.enabled)}
        disabled={isSaving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 mt-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
          rule.enabled ? 'bg-indigo-600' : 'bg-stone-700'
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform ${
            rule.enabled ? 'translate-x-[-5px]' : 'translate-x-[-18px]'
          }`}
          style={{ width: '18px', height: '18px', transform: rule.enabled ? 'translateX(-4px)' : 'translateX(-18px)' }}
        />
      </button>
    </div>
  );
}

export default function NotificationRulesPage() {
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/notification-rules', { credentials: 'include' });
      if (!res.ok) throw new Error('خطا در بارگذاری');
      const data = await res.json();
      setRules(data.rules ?? []);
    } catch {
      setError('بارگذاری قوانین ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (key: string, body: { enabled?: boolean; threshold?: number | null }) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/notification-rules', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...body }),
      });
      if (!res.ok) throw new Error('خطا');
      const data = await res.json();
      setRules((prev) => prev.map((r) => (r.key === key ? data.rule : r)));
      setLastSaved(key);
      setTimeout(() => setLastSaved(null), 2000);
    } catch {
      setError('ذخیره‌سازی ناموفق بود.');
    } finally {
      setSaving(null);
    }
  }, []);

  const handleToggle = (key: string, enabled: boolean) => patch(key, { enabled });
  const handleThreshold = (key: string, value: number | null) => patch(key, { threshold: value });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-stone-100 flex items-center gap-2">
            <Bell size={18} className="text-indigo-400" />
            قوانین اعلان
          </h1>
          <p className="text-[12.5px] text-stone-500 mt-1">
            کنترل کنید کدام رویدادها برای مدیران اعلان تولید کنند.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="w-8 h-8 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          title="بارگذاری مجدد"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Success flash */}
      {lastSaved && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-[12px]">
          <CheckCircle2 size={13} />
          تغییرات ذخیره شد
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-[12px]">
          {error}
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="rounded-xl border border-stone-800 bg-stone-900 overflow-hidden">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-stone-800/60 last:border-b-0">
              <div className="w-9 h-9 rounded-lg bg-stone-800 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-36 bg-stone-800 rounded animate-pulse" />
                <div className="h-3 w-52 bg-stone-800/60 rounded animate-pulse" />
              </div>
              <div className="w-11 h-6 rounded-full bg-stone-800 animate-pulse" />
            </div>
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-10 text-center">
          <Bell size={28} className="text-stone-600 mx-auto mb-3" />
          <p className="text-[13px] text-stone-500">هیچ قانونی یافت نشد. Migration را اجرا کنید.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-stone-800 bg-stone-900 overflow-hidden">
          {rules.map((rule) => (
            <RuleRow
              key={rule.key}
              rule={rule}
              onToggle={handleToggle}
              onThreshold={handleThreshold}
              saving={saving}
            />
          ))}
        </div>
      )}

      <p className="text-[11px] text-stone-600">
        تغییرات بلافاصله اعمال می‌شوند — هیچ نیازی به ری‌استارت سرور نیست.
      </p>
    </div>
  );
}
