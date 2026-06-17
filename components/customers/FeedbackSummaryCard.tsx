'use client';

import { useEffect } from 'react';
import { Star } from 'lucide-react';
import { Card, CardBody, CardHeader, Empty } from '@/components/ui';
import { useAppStore } from '@/store';

/**
 * FeedbackSummaryCard — میانگین رضایت مشتری به تفکیک شعبه.
 * خودکفا: خودش loadFeedbackSummary را صدا می‌زند. در صفحه‌ی /reports قرار می‌گیرد.
 */
export function FeedbackSummaryCard() {
  const branches = useAppStore((s) => s.branches);
  const summary = useAppStore((s) => s.feedbackSummary);
  const loadFeedbackSummary = useAppStore((s) => s.loadFeedbackSummary);

  useEffect(() => {
    loadFeedbackSummary();
  }, [loadFeedbackSummary]);

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '—';

  return (
    <Card>
      <CardHeader title="رضایت مشتری" sub="میانگین امتیاز بازخورد به تفکیک شعبه" />
      <CardBody className="p-0">
        {summary.length === 0 ? (
          <div className="p-5">
            <Empty title="بازخوردی ثبت نشده" icon={Star} />
          </div>
        ) : (
          <ul className="divide-y divide-stone-50">
            {summary.map((row) => (
              <li
                key={row.branchId}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="text-[12.5px] text-stone-700">{branchName(row.branchId)}</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={13}
                        strokeWidth={1.5}
                        className={
                          i < Math.round(row.average)
                            ? 'text-amber-500 fill-amber-400'
                            : 'text-stone-200'
                        }
                      />
                    ))}
                  </div>
                  <span className="text-[13px] font-medium text-stone-800 tabular-nums" dir="ltr">
                    {row.average.toFixed(1)}
                  </span>
                  <span className="text-[10.5px] text-muted tabular-nums">
                    ({row.count})
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
