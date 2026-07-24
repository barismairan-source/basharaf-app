'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { DashCard } from './DashCard';
import { Chip } from '@/components/ui';

interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  area: string | null;
  createdAt: string;
}

interface ApplicantsData {
  hasActivity: boolean;
  totalNew: number;
  applicants: Applicant[];
}

const AREA_LABELS: Record<string, string> = {
  kitchen: 'آشپزخانه',
  service: 'سرویس',
  management: 'مدیریت',
  delivery: 'پیک',
  cashier: 'صندوق',
  cleaning: 'نظافت',
};

export function RecruitmentWidget() {
  const router = useRouter();
  const [data, setData] = useState<ApplicantsData | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetch('/api/dashboard/applicants', { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((d: ApplicantsData | null) => {
        if (!ctrl.signal.aborted && d) setData(d);
      })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });

    return () => { ctrl.abort(); };
  }, []);

  if (loading) return <div className="h-[120px] rounded-xl bg-stone-100 animate-pulse" aria-busy="true"><span className="sr-only">در حال بارگذاری داوطلبان…</span></div>;
  if (!data?.hasActivity) return null;

  return (
    <DashCard
      title="داوطلبان تازه"
      icon={Users}
      iconBg="bg-violet-50"
      iconColor="text-violet-600"
      badge={data.totalNew}
      badgeClass="bg-violet-100 text-violet-700"
      onViewAll={() => router.push('/recruitment')}
      viewAllLabel="بررسی همه ←"
      bodyClass="py-2"
    >
      <ul>
        {data.applicants.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => router.push(`/recruitment?q=${encodeURIComponent(a.firstName + ' ' + a.lastName)}`)}
              className="w-full flex items-center gap-3 py-2 px-1 rounded-lg hover:bg-stone-50/80 transition-colors text-right"
            >
              <span className="text-[12.5px] text-stone-800 font-medium flex-1 truncate">
                {a.firstName} {a.lastName}
              </span>
              {a.area && (
                <span className="text-[11px] text-stone-400">
                  {AREA_LABELS[a.area] ?? a.area}
                </span>
              )}
              {/* وضعیت + اقدام بعدی: تازه رسیده، منتظر بررسی */}
              <Chip tone="neutral" className="shrink-0">جدید — منتظر بررسی</Chip>
            </button>
          </li>
        ))}
      </ul>
    </DashCard>
  );
}
