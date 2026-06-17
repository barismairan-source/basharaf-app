import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Th — header cell برای جداول.
 *
 * استفاده در جدول history transactions و team management.
 *
 * onClick: اگر sortable است، cursor-pointer می‌شود.
 */
export interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children?: React.ReactNode;
}

export function Th({ className, onClick, children, ...props }: ThProps) {
  return (
    <th
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 font-normal text-[11.5px] text-stone-500 text-right',
        onClick && 'cursor-pointer hover:text-stone-700 select-none',
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
 * استفاده:
 *   <TableContainer>
 *     <table className="w-full text-right">
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
        'border border-stone-200 rounded-lg bg-white overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}
