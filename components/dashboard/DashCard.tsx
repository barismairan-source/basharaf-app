'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';

interface DashCardProps {
  title: string;
  /** آیکون اختیاری در هدر */
  icon?: LucideIcon;
  iconBg?: string;
  iconColor?: string;
  /** عدد badge — اگر > 0 باشد نمایش داده می‌شود */
  badge?: number;
  badgeClass?: string;
  /** دکمه‌ی «مشاهده همه» در انتهای هدر (RTL: سمت چپ) */
  onViewAll?: () => void;
  viewAllLabel?: string;
  /** className اضافه برای Card wrapper */
  className?: string;
  /** className اضافه برای CardBody */
  bodyClass?: string;
  children: ReactNode;
}

/**
 * DashCard — کارت استاندارد داشبورد.
 *
 * همه‌ی کارت‌های داشبورد (AttentionWidget، HRSummaryCard، RecruitmentWidget،
 * وضعیت شرکا) از این کامپوننت استفاده می‌کنند تا padding/radius/سایه/هدر
 * یکدست باشد.
 */
export function DashCard({
  title,
  icon: Icon,
  iconBg = 'bg-stone-100',
  iconColor = 'text-stone-600',
  badge,
  badgeClass = 'bg-stone-100 text-stone-700',
  onViewAll,
  viewAllLabel = 'مشاهده همه ←',
  className,
  bodyClass,
  children,
}: DashCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-stone-100">
        {Icon && (
          <div
            className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center shrink-0',
              iconBg,
              iconColor,
            )}
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
          </div>
        )}
        <span className="text-[13px] font-medium text-stone-800 leading-none">{title}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className={cn(
              'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-medium tabular-nums',
              badgeClass,
            )}
          >
            {fmt(badge)}
          </span>
        )}
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="mr-auto text-[11px] text-stone-400 hover:text-stone-600 transition-colors shrink-0"
          >
            {viewAllLabel}
          </button>
        )}
      </div>
      <CardBody className={bodyClass}>{children}</CardBody>
    </Card>
  );
}
