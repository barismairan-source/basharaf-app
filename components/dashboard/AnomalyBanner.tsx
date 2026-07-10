'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';
import { fmt } from '@/lib/utils';

interface AnomalyCounts { high: number; medium: number; low: number; total: number; }

/**
 * AnomalyBanner — نوار هشدار دستیار مالی.
 * فقط برای SuperAdmin و فقط اگر یافته‌ی باز high یا medium وجود داشته باشد رندر می‌شود.
 * در غیر این صورت null برمی‌گرداند و هیچ فضایی نمی‌گیرد.
 */
export function AnomalyBanner() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const [counts, setCounts] = useState<AnomalyCounts | null>(null);

  const canSee = canAccessSection(user, 'anomaly');

  useEffect(() => {
    if (!canSee) return;
    let cancelled = false;
    fetch('/api/anomaly/findings/counts', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.ok ? r.json() : null)
      .then((d: AnomalyCounts | null) => { if (!cancelled && d) setCounts(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [canSee]);

  if (!canSee || !counts) return null;

  const urgentCount = counts.high + counts.medium;
  if (urgentCount === 0) return null;

  const isHigh = counts.high > 0;

  return (
    <button
      type="button"
      onClick={() => router.push('/anomaly')}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-right text-[12.5px] font-medium transition-opacity hover:opacity-80 ${
        isHigh
          ? 'bg-rose-50 border border-rose-200 text-rose-700'
          : 'bg-amber-50 border border-amber-200 text-amber-700'
      }`}
    >
      <ShieldAlert size={14} strokeWidth={1.75} className="shrink-0" />
      <span className="flex-1">
        {fmt(urgentCount)} یافته‌ی باز در دستیار مالی
        {counts.high > 0 && ` — ${fmt(counts.high)} با شدت بالا`}
      </span>
      <span className="text-[11px] opacity-70 shrink-0">بررسی ←</span>
    </button>
  );
}
