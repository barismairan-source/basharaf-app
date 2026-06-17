'use client';

import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Receipt as ReceiptIcon,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardHeader, CardBody, Empty, Chip } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import type { Transaction } from '@/types';
import { cn } from '@/lib/utils';

/**
 * RecentList — آخرین ۵ تراکنش از scope کاربر.
 *
 * هر ردیف:
 * - آیکن نوع (درآمد/هزینه با رنگ مناسب)
 * - عنوان تراکنش
 * - شعبه + تاریخ
 * - مبلغ (با علامت + برای درآمد، - برای هزینه)
 * - chip وضعیت
 *
 * کلیک روی ردیف:
 * - `openTx(tx.id)` → uiSlice ست می‌کند
 * - navigate به `/transactions` → detail panel در آنجا باز می‌شود
 *
 * Rejected ها با opacity پایین + line-through نمایش داده می‌شوند
 * (مطابق پروتوتایپ).
 */

const STATUS_META: Record<
  Transaction['status'],
  { icon: LucideIcon; chipTone: 'amber' | 'green' | 'red'; label: string }
> = {
  pending: { icon: Clock, chipTone: 'amber', label: 'در انتظار' },
  approved: { icon: CheckCircle2, chipTone: 'green', label: 'تایید شده' },
  rejected: { icon: XCircle, chipTone: 'red', label: 'رد شده' },
};

interface RecentListProps {
  transactions: ReadonlyArray<Transaction>;
  limit?: number;
}

export function RecentList({ transactions, limit = 5 }: RecentListProps) {
  const router = useRouter();
  const openTx = useAppStore((s) => s.openTx);

  // مرتب نزولی بر اساس createdAt
  const sorted = [...transactions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  function handleClick(tx: Transaction) {
    openTx(tx.id);
    router.push('/transactions');
  }

  return (
    <Card>
      <CardHeader
        title="آخرین تراکنش‌ها"
        sub={`نمایش ${sorted.length} از ${transactions.length}`}
        action={
          <button
            type="button"
            onClick={() => router.push('/transactions')}
            className="text-[11.5px] text-stone-500 hover:text-stone-900 transition-colors"
          >
            مشاهده همه ←
          </button>
        }
      />
      <CardBody className="p-0">
        {sorted.length === 0 ? (
          <div className="p-5">
            <Empty
              icon={ReceiptIcon}
              title="هنوز تراکنشی ثبت نشده"
              sub="با کلیک روی «ثبت تراکنش جدید» در منو، اولین تراکنش را وارد کنید."
            />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {sorted.map((tx) => {
              const statusMeta = STATUS_META[tx.status];
              const isIncome = tx.type === 'income';
              const isRejected = tx.status === 'rejected';
              const TypeIcon = isIncome ? ArrowDownLeft : ArrowUpRight;

              return (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(tx)}
                    className={cn(
                      'w-full px-5 py-3 flex items-center gap-3 hover:bg-stone-50/60 transition-colors text-right',
                      isRejected && 'opacity-60'
                    )}
                  >
                    {/* Type icon */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                        isIncome
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-rose-50 text-rose-700'
                      )}
                    >
                      <TypeIcon size={13} strokeWidth={1.5} aria-hidden="true" />
                    </div>

                    {/* Title & metadata */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={cn(
                          'text-[12.5px] text-stone-800 truncate',
                          isRejected && 'line-through'
                        )}
                      >
                        {tx.title}
                      </div>
                      <div className="text-[10.5px] text-muted mt-0.5 truncate">
                        {tx.branch} · {tx.date}
                      </div>
                    </div>

                    {/* Amount + status */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div
                        className={cn(
                          'text-[12.5px] tabular-nums font-medium',
                          isIncome ? 'text-emerald-700' : 'text-rose-700',
                          isRejected && 'line-through'
                        )}
                      >
                        {isIncome ? '+' : '−'} {fmt(tx.amount)}
                      </div>
                      <Chip tone={statusMeta.chipTone} className="hidden sm:inline-flex">
                        {statusMeta.label}
                      </Chip>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
