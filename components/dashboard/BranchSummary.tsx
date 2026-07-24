import { Card, CardHeader, CardBody, Empty } from '@/components/ui';
import { fmt } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BranchSummaryRow {
  branchId: string;
  branchName: string;
  income: number;
  expense: number;
  /** برآورد بهای تمام‌شده — undefined یعنی هنوز محاسبه نشده (نه صفر) */
  cogsEstimate?: number;
  /** ضایعات — undefined یعنی هنوز محاسبه نشده (نه صفر) */
  waste?: number;
  /** درآمد − هزینه‌ی همین بازه (FLOW، نه موجودی حساب) */
  netFlow: number;
}

/**
 * BranchSummary — مقایسه‌ی شعب با bar افقی.
 *
 * هر ردیف: نام شعبه + دو bar کنارهم (درآمد سبز / هزینه قرمز) + جریان خالص
 * دوره + (اگر داده شده) بهای تمام‌شده و ضایعات. bar‌ها نسبی هستند (حداکثر
 * income/expense در همه شعب = ۱۰۰٪ عرض). کلیک روی هر ردیف → filter همان شعبه.
 *
 * برچسب «جریان خالص دوره» (نه «موجودی») چون این عدد یک FLOW روی بازه‌ی
 * انتخابی هدر است، نه موجودی واقعی حساب شعبه.
 */
interface BranchSummaryProps {
  data: ReadonlyArray<BranchSummaryRow>;
  onBranchClick: (branchId: string) => void;
}

export function BranchSummary({ data, onBranchClick }: BranchSummaryProps) {
  const maxVal = Math.max(...data.map((b) => Math.max(b.income, b.expense)), 1);
  const hasCogsWaste = data.some((b) => b.cogsEstimate !== undefined || b.waste !== undefined);

  return (
    <Card>
      <CardHeader
        title="مقایسه شعب"
        sub={`${data.length} شعبه — تراکنش‌های تایید‌شده‌ی بازه‌ی انتخابی`}
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
            {data.map((row) => {
              const incW = Math.round((row.income / maxVal) * 100);
              const expW = Math.round((row.expense / maxVal) * 100);
              return (
                <button
                  key={row.branchId}
                  type="button"
                  onClick={() => onBranchClick(row.branchId)}
                  className="w-full px-5 py-3.5 text-right hover:bg-stone-50/60 transition-colors"
                >
                  {/* نام شعبه + جریان خالص دوره */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 size={12} strokeWidth={1.5} className="text-muted shrink-0" />
                      <span className="text-[12.5px] text-stone-800 truncate">{row.branchName}</span>
                    </div>
                    <span
                      className={cn(
                        'text-[12px] font-semibold tabular-nums shrink-0',
                        row.netFlow > 0 ? 'text-emerald-700' : row.netFlow < 0 ? 'text-rose-700' : 'text-stone-400'
                      )}
                      title={`جریان خالص دوره: ${fmt(row.netFlow)} تومان`}
                    >
                      {formatMoneyShort(row.netFlow)}
                    </span>
                  </div>

                  {/* Bar‌های نسبی — درآمد/هزینه */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-emerald-600 w-8 shrink-0 text-end">درآمد</span>
                      <div className="flex-1 h-[5px] bg-emerald-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${incW}%` }} />
                      </div>
                      <span className="text-[10px] text-emerald-700 tabular-nums w-16 shrink-0" title={`${fmt(row.income)} تومان`}>
                        {formatMoneyShort(row.income)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-rose-600 w-8 shrink-0 text-end">هزینه</span>
                      <div className="flex-1 h-[5px] bg-rose-100 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${expW}%` }} />
                      </div>
                      <span className="text-[10px] text-rose-700 tabular-nums w-16 shrink-0" title={`${fmt(row.expense)} تومان`}>
                        {formatMoneyShort(row.expense)}
                      </span>
                    </div>
                  </div>

                  {/* بهای تمام‌شده و ضایعات — فقط اگر محاسبه شده باشد */}
                  {hasCogsWaste && (
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-stone-50 text-[10.5px] text-muted">
                      <span>
                        بهای تمام‌شده: {row.cogsEstimate !== undefined ? (
                          <span className="tabular-nums text-stone-600">{formatMoneyShort(row.cogsEstimate)}</span>
                        ) : '—'}
                      </span>
                      <span>
                        ضایعات: {row.waste !== undefined ? (
                          <span className="tabular-nums text-stone-600">{formatMoneyShort(row.waste)}</span>
                        ) : '—'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
