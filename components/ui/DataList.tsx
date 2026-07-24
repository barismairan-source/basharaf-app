'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Th, Td, TableContainer } from './Table';
import { Empty } from './Empty';

/** Enter/Space روی یک ردیف role=button — تنها راه فعال‌سازی onRowClick با کیبورد. */
function handleRowKeyDown(e: React.KeyboardEvent, onActivate: () => void) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    onActivate();
  }
}

export interface DataColumn<T extends object> {
  /** شناسه یکتا — برای key در React */
  key: string;
  /** سرستون در جدول دسکتاپ */
  label: string;
  /** رندر محتوای هر سلول */
  render: (row: T) => React.ReactNode;
  /** کلاس برای سرستون (مثلاً text-left برای عدد) */
  headerClassName?: string;
  /** کلاس برای سلول */
  cellClassName?: string;
  /** برچسب جایگزین در کارت موبایل */
  mobileLabel?: string;
  /** این ستون در نمایش کارت موبایل مخفی شود */
  mobileHide?: boolean;
  /** این ستون در جدول دسکتاپ مخفی شود */
  desktopHide?: boolean;
}

export interface DataListProps<T extends object> {
  columns: DataColumn<T>[];
  data: T[];
  /** کلید یکتا هر ردیف */
  keyExtractor: (row: T) => string;
  loading?: boolean;
  /** محتوای حالت خالی — پیش‌فرض: Empty ساده */
  empty?: React.ReactNode;
  /** کلیک روی ردیف/کارت */
  onRowClick?: (row: T) => void;
  /** کلاس اضافی برای هر ردیف/کارت (برای conditional styling مثل proforma) */
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}

/**
 * DataList — الگوی واحد برای همه‌ی لیست‌های سیستم.
 * روی دسکتاپ (md:) → جدول | روی موبایل → کارت.
 * رفع M3 (سرریز افقی جداول روی موبایل) و S1 (تناقض نمایش بین صفحات).
 *
 * نمونه استفاده:
 *   const cols: DataColumn<Tx>[] = [
 *     { key: 'date',   label: 'تاریخ',   render: r => r.date },
 *     { key: 'amount', label: 'مبلغ',    render: r => <span className="num">{fmt(r.amount)}</span>,
 *       headerClassName: 'text-left', cellClassName: 'text-left', mobileLabel: 'مبلغ (تومان)' },
 *     { key: 'status', label: 'وضعیت',  render: r => <StatusPill status={r.status} /> },
 *   ];
 *   <DataList columns={cols} data={txList} keyExtractor={r => r.id} onRowClick={openDetail} />
 */
function DataList<T extends object>({
  columns,
  data,
  keyExtractor,
  loading,
  empty,
  onRowClick,
  rowClassName,
  className,
}: DataListProps<T>): React.JSX.Element | null {
  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-bg animate-pulse border border-border" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={className}>
        {empty ?? <Empty title="موردی یافت نشد." />}
      </div>
    );
  }

  const visibleDesktop = columns.filter((c) => !c.desktopHide);
  const visibleMobile = columns.filter((c) => !c.mobileHide);

  return (
    <div className={className}>
      {/* ── موبایل: کارت‌ها (زیر md) ── */}
      <div className="md:hidden space-y-2">
        {data.map((row) => (
          <div
            key={keyExtractor(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            role={onRowClick ? 'button' : undefined}
            tabIndex={onRowClick ? 0 : undefined}
            onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, () => onRowClick(row)) : undefined}
            className={cn(
              'bg-surface border border-border rounded-lg overflow-hidden',
              onRowClick && 'cursor-pointer active:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1',
              rowClassName?.(row),
            )}
          >
            {visibleMobile.map((col, ci) => (
              <div
                key={col.key}
                className={cn(
                  'flex items-center justify-between px-4 py-2.5',
                  ci < visibleMobile.length - 1 && 'border-b border-border'
                )}
              >
                <span className="text-[11px] text-muted shrink-0 ml-3">
                  {col.mobileLabel ?? col.label}
                </span>
                <span className={cn('text-[13px] text-text text-left min-w-0 truncate', col.cellClassName)}>
                  {col.render(row)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── دسکتاپ: جدول (md به بالا) ── */}
      <TableContainer className="hidden md:block">
        <table className="w-full text-right">
          <thead className="bg-bg border-b border-border">
            <tr>
              {visibleDesktop.map((col) => (
                <Th key={col.key} className={col.headerClassName}>
                  {col.label}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={onRowClick ? (e) => handleRowKeyDown(e, () => onRowClick(row)) : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40',
                  rowClassName?.(row),
                )}
              >
                {visibleDesktop.map((col) => (
                  <Td key={col.key} className={col.cellClassName}>
                    {col.render(row)}
                  </Td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>
    </div>
  );
}

export { DataList };
export type { DataColumn as DataListColumn };
