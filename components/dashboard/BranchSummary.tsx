import { Card, CardHeader, CardBody, Empty } from '@/components/ui';
import { fmt } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import { Building2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * BranchSummary — جدول مقایسه شعب.
 *
 * فقط برای SuperAdmin و فقط وقتی branchFilter null است نمایش داده می‌شود.
 * (وقتی filter یک شعبه خاص است، این کارت بی‌معنی است.)
 *
 * هر ردیف:
 * - نام شعبه (با کلیک → filter به همان شعبه + scroll بالا)
 * - درآمد، هزینه، موجودی (همگی fmt و tabular-nums)
 * - رنگ موجودی: emerald اگر مثبت، rose اگر منفی، stone اگر صفر
 */
interface BranchSummaryProps {
  data: ReadonlyArray<{
    branchId: string;
    branchName: string;
    income: number;
    expense: number;
    balance: number;
  }>;
  onBranchClick: (branchId: string) => void;
}

export function BranchSummary({ data, onBranchClick }: BranchSummaryProps) {
  return (
    <Card>
      <CardHeader
        title="مقایسه شعب"
        sub={`${data.length} شعبه — فقط تراکنش‌های تایید‌شده`}
      />
      <CardBody className="p-0">
        {data.length === 0 ? (
          <div className="p-5">
            <Empty
              icon={Building2}
              title="شعبه‌ای ثبت نشده"
              sub="پس از افزودن شعبه‌ها، خلاصه‌ی هر کدام اینجا نمایش داده می‌شود."
            />
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {data.map((row) => (
              <button
                key={row.branchId}
                type="button"
                onClick={() => onBranchClick(row.branchId)}
                className="w-full px-5 py-3 flex items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors text-right group"
              >
                <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                  <Building2
                    size={13}
                    strokeWidth={1.5}
                    className="text-muted"
                    aria-hidden="true"
                  />
                  <span className="text-[12.5px] text-stone-800 truncate">
                    {row.branchName}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[11.5px] tabular-nums">
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="text-[10px] text-muted">درآمد</div>
                    <div className="text-emerald-700" title={`${fmt(row.income)} تومان`}>{formatMoneyShort(row.income)}</div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="text-[10px] text-muted">هزینه</div>
                    <div className="text-rose-700" title={`${fmt(row.expense)} تومان`}>{formatMoneyShort(row.expense)}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="text-[10px] text-muted">موجودی</div>
                    <div
                      className={cn(
                        row.balance > 0 && 'text-emerald-700',
                        row.balance < 0 && 'text-rose-700',
                        row.balance === 0 && 'text-stone-500'
                      )}
                      title={`${fmt(row.balance)} تومان`}
                    >
                      {formatMoneyShort(row.balance)}
                    </div>
                  </div>
                  <ArrowLeft
                    size={12}
                    strokeWidth={1.5}
                    className="text-stone-500 group-hover:text-stone-700 transition-colors flex-shrink-0"
                    aria-hidden="true"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
