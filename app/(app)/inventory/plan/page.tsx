'use client';

import { useState } from 'react';
import { Loader2, TrendingUp, AlertTriangle } from 'lucide-react';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import { PageHeader } from '@/components/ui';
import type { ForecastResult } from '@/types';

const repos = createRepos(null as never);

export default function PlanPage() {
  const showToast = useAppStore((s) => s.showToast);
  const [horizon, setHorizon] = useState('7');
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await repos.inventory.forecast({ mode: 'weekday', horizon: parseInt(horizon, 10) || 7 });
      setResult(r);
    } catch {
      showToast('خطا در پیش‌بینی — شاید داده‌ی فروش کافی نیست', 'danger');
    } finally {
      setLoading(false);
    }
  }

  const shortfalls = result?.rawCoverage
    .filter((c) => c.shortfall > 0)
    .sort((a, b) => a.coverDays - b.coverDays) ?? [];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <PageHeader title="برنامه‌ریزی پخت" backHref="/inventory" />

      <div className="bg-surface border border-border rounded-lg p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[11.5px] text-muted">افق پیش‌بینی (روز)</label>
          <input
            value={horizon}
            onChange={(e) => setHorizon(e.target.value.replace(/\D/g, ''))}
            dir="ltr"
            className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
          />
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="flex items-center gap-1.5 bg-text text-surface px-4 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          محاسبه
        </button>
      </div>

      {result && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border text-[12px] text-muted">
            پیش‌بینی نیاز مواد برای {horizon} روز آینده
            {shortfalls.length > 0 && (
              <span className="text-danger mr-1">· {shortfalls.length} قلم نیاز به خرید</span>
            )}
          </div>
          {shortfalls.length === 0 ? (
            <div className="text-center text-muted py-10 text-[13px]">
              موجودی برای افق انتخاب‌شده کافی است
            </div>
          ) : (
            <div className="divide-y divide-border">
              {shortfalls.map((s, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-[12.5px]">
                  <span className="text-text flex items-center gap-1.5">
                    {s.coverDays < 2 && <AlertTriangle size={13} className="text-warn" />}
                    {s.name}
                  </span>
                  <span className="text-muted num text-[11.5px]">
                    پوشش {Math.round(s.coverDays)} روز · کمبود {fmt(Math.round(s.shortfall))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
