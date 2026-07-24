'use client';

import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { KPICard } from './KPICard';
import { MetricGrid, Chip } from '@/components/ui';
import { fmt } from '@/lib/utils';

export interface FinancialPositionData {
  summary: { income: number; expense: number; balance: number; count: number; setupExcludedExpense?: number };
}

interface Props {
  data: FinancialPositionData | null;
  loading: boolean;
  excludeSetup: boolean;
}

/**
 * FinancialPosition — «کجای پول هستیم؟».
 *
 * قبلاً این عدد «موجودی» نامیده می‌شد (income − expense همان بازه) —
 * برچسب گمراه‌کننده بود چون با موجودی واقعی حساب (stock) اشتباه گرفته
 * می‌شد. اینجا صریحاً «جریان خالص دوره» است: یک FLOW روی بازه‌ی انتخابی
 * هدر، نه موجودی نقد/بانک لحظه‌ای (که در کارت‌های حساب کنارش، جدا و
 * برچسب‌گذاری‌شده، نمایش داده می‌شود).
 *
 * داده از بیرون prop می‌گیرد (نه fetch مستقل) — صفحه‌ی داشبورد یک‌بار
 * `/api/reports` را برای همین بازه fetch می‌کند و هم اینجا هم برای
 * تفکیک هزینه به‌کار می‌برد؛ گرفتن دوباره‌ی همان داده در دو کامپوننت
 * دقیقاً همان «درخواست تکراری»ای است که این فاز باید حذف کند.
 */
export function FinancialPosition({ data, loading, excludeSetup }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-busy="true">
        <span className="sr-only">در حال بارگذاری تراز مالی…</span>
        {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-lg bg-bg animate-pulse border border-border" />)}
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;
  const hasSetupExcluded = excludeSetup && (summary.setupExcludedExpense ?? 0) > 0;

  return (
    <div className="space-y-3">
      {hasSetupExcluded && (
        <div className="flex items-center gap-2 flex-wrap">
          <Chip tone="amber">
            {fmt(summary.setupExcludedExpense!)} تومان هزینه‌ی راه‌اندازی در این نما حذف شده
          </Chip>
          <span className="text-[11px] text-muted">برای دیدن کامل، نمای «کامل» را انتخاب کنید.</span>
        </div>
      )}

      <MetricGrid minCardWidth={200} className="items-stretch">
        <KPICard
          tone="balance"
          label="جریان خالص دوره"
          value={summary.balance}
          icon={Wallet}
          highlightNegative
        />
        <KPICard
          tone="income"
          label="درآمد تأییدشده"
          value={summary.income}
          icon={TrendingUp}
        />
        <KPICard
          tone="expense"
          label="هزینه تأییدشده"
          value={summary.expense}
          icon={TrendingDown}
        />
      </MetricGrid>
    </div>
  );
}
