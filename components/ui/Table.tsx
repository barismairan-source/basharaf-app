import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Th — header cell برای جداول.
 *
 * استفاده در جدول history transactions و team management.
 *
 * onClick: اگر sortable است، cursor-pointer می‌شود؛ با کیبورد هم قابل‌فعال‌سازی
 * است (Enter/Space) چون role=button + tabIndex اضافه می‌شود — بدون این، مرتب‌سازی
 * فقط با ماوس قابل استفاده بود.
 */
export interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export function Th({ className, onClick, children, ...props }: ThProps) {
  const sortable = Boolean(onClick);
  return (
    <th
      onClick={onClick}
      role={sortable ? 'button' : undefined}
      tabIndex={sortable ? 0 : undefined}
      onKeyDown={
        sortable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.(e as unknown as React.MouseEvent<HTMLTableCellElement>);
              }
            }
          : undefined
      }
      className={cn(
        'px-4 py-2.5 font-normal text-[11.5px] text-muted text-right',
        sortable && 'cursor-pointer hover:text-text select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

/**
 * Td — data cell برای جداول.
 *
 * نکته: padding ثابت دارد. اگر در یک سلول نیاز به layout پیچیده‌تری دارید
 * (مثلاً flex با چند عنصر)، یک <div> داخلش بگذارید.
 */
export function Td({ className, children, ...props }: TdProps) {
  return (
    <td
      className={cn('px-4 py-3 align-middle', className)}
      {...props}
    >
      {children}
    </td>
  );
}

/**
 * TableContainer — wrapper استاندارد جدول با حاشیه و گرد بودن.
 *
 * `overflow-x-auto` همیشه روی wrapper هست — بدون این، جدول عریض‌تر از
 * عرض صفحه روی موبایل کلیپ می‌شد (نه اسکرول). خود `<table>` باید
 * `min-w-[...]` مناسب داشته باشد تا این اسکرول واقعاً فعال شود.
 *
 * استفاده:
 *   <TableContainer>
 *     <table className="w-full min-w-[560px] text-right">
 *       <thead>...</thead>
 *       <tbody>...</tbody>
 *     </table>
 *   </TableContainer>
 */
export function TableContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'border border-border rounded-lg bg-surface overflow-x-auto',
        className
      )}
    >
      {children}
    </div>
  );
}
