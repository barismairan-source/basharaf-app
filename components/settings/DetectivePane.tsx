'use client';

import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, ToggleLeft, ToggleRight, MessageSquare, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RuleRow {
  ruleKey: string;
  enabled: boolean;
  thresholds: Record<string, number> | null;
  label: string | null;
  description: string | null;
  smsEnabled: boolean | null;
}

const RULE_LABELS: Record<string, string> = {
  waste_spike:         'جهش ضایعات',
  price_jump:          'جهش قیمت خرید',
  rejection_pattern:   'تکرار ابطال',
  consumption_spike:   'مغایرت مصرف',
  below_approval_limit:'زیر سقف تأیید',
  off_hours:           'ساعت غیرعادی',
};

export function DetectivePane() {
  const [rules, setRules] = useState<RuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [thresholdEdits, setThresholdEdits] = useState<Record<string, Record<string, string>>>({});

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/anomaly/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data.rules ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  async function patchRule(key: string, payload: Partial<{ enabled: boolean; thresholds: Record<string, number>; smsEnabled: boolean }>) {
    setSaving(key);
    try {
      await fetch(`/api/anomaly/rules/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await fetchRules();
    } finally {
      setSaving(null);
    }
  }

  async function saveThresholds(key: string) {
    const edits = thresholdEdits[key];
    if (!edits) return;
    const parsed: Record<string, number> = {};
    for (const [k, v] of Object.entries(edits)) {
      const n = parseFloat(v);
      if (!isNaN(n)) parsed[k] = n;
    }
    await patchRule(key, { thresholds: parsed });
    setThresholdEdits((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map((i) => (
          <div key={i} className="h-16 bg-stone-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[14px] font-medium text-stone-900 flex items-center gap-2">
          <ShieldAlert size={15} strokeWidth={1.5} className="text-stone-500" />
          قوانین دستیار مالی
        </h2>
        <p className="text-[12px] text-muted mt-0.5">روشن/خاموش کردن قوانین و تنظیم آستانه‌ها بدون نیاز به deploy.</p>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => {
          const isExpanded = expanded === rule.ruleKey;
          const isSaving = saving === rule.ruleKey;
          const thresholds = rule.thresholds ?? {};
          const edits = thresholdEdits[rule.ruleKey] ?? {};
          const hasEdits = Object.keys(edits).length > 0;
          const label = rule.label ?? RULE_LABELS[rule.ruleKey] ?? rule.ruleKey;

          return (
            <div key={rule.ruleKey} className="bg-white border border-stone-100 rounded-lg overflow-hidden">
              {/* ردیف اصلی */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => patchRule(rule.ruleKey, { enabled: !rule.enabled })}
                  disabled={isSaving}
                  title={rule.enabled ? 'غیرفعال کردن' : 'فعال کردن'}
                  className="flex-shrink-0 text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
                >
                  {rule.enabled
                    ? <ToggleRight size={22} className="text-emerald-600" strokeWidth={1.5} />
                    : <ToggleLeft size={22} strokeWidth={1.5} />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-stone-900 flex items-center gap-1.5">
                    {label}
                    {!rule.enabled && (
                      <span className="text-[10px] text-stone-400 font-normal bg-stone-100 px-1.5 py-0.5 rounded">خاموش</span>
                    )}
                  </div>
                  {rule.description && (
                    <div className="text-[11px] text-muted truncate mt-0.5">{rule.description}</div>
                  )}
                </div>

                {/* SMS toggle */}
                <button
                  type="button"
                  onClick={() => patchRule(rule.ruleKey, { smsEnabled: !rule.smsEnabled })}
                  disabled={isSaving}
                  title={rule.smsEnabled ? 'خاموش کردن پیامک' : 'روشن کردن پیامک'}
                  className={cn(
                    'flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-colors disabled:opacity-50',
                    rule.smsEnabled
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-stone-200 bg-stone-50 text-stone-400'
                  )}
                >
                  <MessageSquare size={11} strokeWidth={1.5} />
                  {rule.smsEnabled ? 'پیامک: روشن' : 'پیامک: خاموش'}
                </button>

                {/* expand thresholds */}
                {Object.keys(thresholds).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpanded(isExpanded ? null : rule.ruleKey)}
                    className="flex-shrink-0 text-muted hover:text-text transition-colors"
                    title="ویرایش آستانه‌ها"
                  >
                    {isExpanded
                      ? <ChevronUp size={14} strokeWidth={2} />
                      : <ChevronDown size={14} strokeWidth={2} />
                    }
                  </button>
                )}
              </div>

              {/* آستانه‌ها */}
              {isExpanded && (
                <div className="border-t border-stone-100 px-4 py-3 bg-stone-50 space-y-2">
                  <div className="text-[11px] text-muted mb-2">آستانه‌های اعمال قانون:</div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(thresholds).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <label className="text-[11.5px] text-stone-600 w-32 flex-shrink-0">{k}</label>
                        <input
                          type="number"
                          step="any"
                          defaultValue={String(edits[k] ?? v)}
                          onChange={(e) => setThresholdEdits((prev) => ({
                            ...prev,
                            [rule.ruleKey]: { ...(prev[rule.ruleKey] ?? {}), [k]: e.target.value },
                          }))}
                          className="flex-1 h-7 text-[12px] px-2 border border-stone-200 rounded-md bg-white text-stone-900 focus:outline-none focus:border-accent"
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => saveThresholds(rule.ruleKey)}
                    disabled={isSaving || !hasEdits}
                    className={cn(
                      'mt-2 flex items-center gap-1.5 h-7 px-3 text-[12px] rounded-md transition-colors',
                      hasEdits
                        ? 'bg-accent text-white hover:bg-accent/90'
                        : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    )}
                  >
                    <Save size={12} strokeWidth={2} />
                    ذخیره آستانه‌ها
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
