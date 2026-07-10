'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Users } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { fmt, cn } from '@/lib/utils';

interface Applicant {
  id: string;
  firstName: string;
  lastName: string;
  area: string | null;
  score: number | null;
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
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    fetch('/api/dashboard/applicants', { credentials: 'include', cache: 'no-store', signal: ctrl.signal })
      .then((r) => r.ok ? r.json() : null)
      .then((d: ApplicantsData | null) => {
        if (!ctrl.signal.aborted && d) {
          setData(d);
          const init: Record<string, number | null> = {};
          for (const a of d.applicants) init[a.id] = a.score;
          setScores(init);
        }
      })
      .catch(() => {})
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });

    return () => { ctrl.abort(); };
  }, []);

  async function handleScore(id: string, n: number) {
    const prev = scores[id] ?? null;
    const next = prev === n ? null : n;
    setScores((s) => ({ ...s, [id]: next }));

    try {
      const res = await fetch(`/api/recruitment/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: next }),
      });
      if (!res.ok) setScores((s) => ({ ...s, [id]: prev }));
    } catch {
      setScores((s) => ({ ...s, [id]: prev }));
    }
  }

  if (loading) return <div className="h-[120px] rounded-xl bg-stone-100 animate-pulse" />;
  if (!data?.hasActivity) return null;

  return (
    <Card>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-stone-100">
        <div className="w-7 h-7 rounded-md flex items-center justify-center bg-violet-50 text-violet-600 shrink-0">
          <Users size={14} strokeWidth={1.75} />
        </div>
        <span className="text-[13px] font-medium text-stone-800">داوطلبان تازه</span>
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-violet-100 text-violet-700 text-[10px] font-medium tabular-nums">
          {fmt(data.totalNew)}
        </span>
        <button
          type="button"
          onClick={() => router.push('/recruitment')}
          className="mr-auto text-[11px] text-stone-400 hover:text-stone-600 transition-colors"
        >
          مشاهده همه ←
        </button>
      </div>
      <CardBody className="py-2">
        <ul>
          {data.applicants.map((a) => {
            const currentScore = scores[a.id] ?? null;
            return (
              <li key={a.id} className="flex items-center gap-3 py-2 px-1">
                <div className="flex-1 min-w-0">
                  <span className="text-[12.5px] text-stone-800 font-medium">
                    {a.firstName} {a.lastName}
                  </span>
                  {a.area && (
                    <span className="text-[11px] text-stone-400 mr-1.5">
                      {AREA_LABELS[a.area] ?? a.area}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleScore(a.id, n)}
                      aria-label={`امتیاز ${n}`}
                      className="p-0.5 touch-manipulation"
                    >
                      <Star
                        size={13}
                        className={cn(
                          currentScore != null && n <= currentScore
                            ? 'text-amber-500'
                            : 'text-stone-200',
                        )}
                        fill={currentScore != null && n <= currentScore ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
