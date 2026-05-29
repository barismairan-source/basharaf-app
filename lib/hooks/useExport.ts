'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import type { TransactionStatus, TransactionType } from '@/types';

/**
 * useExport — hook برای export به Excel و CSV.
 *
 * برای Excel: داده‌ها را از API (json) می‌گیرد و با xlsx در client می‌سازد.
 * برای CSV: مستقیم از API دانلود می‌کند (فرمت utf-8 BOM).
 *
 * چرا Excel در client؟
 * - کتابخانه xlsx در Edge runtime مشکل دارد
 * - payload json کوچک‌تر از xlsx binary است
 * - styling فقط در client ممکن است
 */

interface ExportFilters {
  branchId?: string;
  status?: TransactionStatus | 'all';
  type?: TransactionType | 'all';
  from?: string;
  to?: string;
}

export function useExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildUrl(format: 'json' | 'csv', filters: ExportFilters) {
    const params = new URLSearchParams();
    params.set('format', format);
    if (filters.branchId) params.set('branchId', filters.branchId);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.type && filters.type !== 'all') params.set('type', filters.type);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    return `/api/export?${params.toString()}`;
  }

  /** Export به Excel (xlsx) */
  async function exportExcel(filters: ExportFilters = {}, filename?: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildUrl('json', filters), { credentials: 'include' });
      if (!res.ok) throw new Error('خطا در دریافت داده');

      const { transactions } = await res.json() as {
        transactions: Array<Record<string, unknown>>;
        total: number;
      };

      // ساخت workbook
      const wb = XLSX.utils.book_new();

      // تبدیل به شکل مناسب برای Excel
      const typeMap: Record<string, string> = { income: 'درآمد', expense: 'هزینه' };
      const statusMap: Record<string, string> = {
        approved: 'تایید شده',
        pending: 'در انتظار',
        rejected: 'رد شده',
      };

      const data = transactions.map((t) => ({
        'عنوان': t.title,
        'نوع': typeMap[t.type as string] ?? t.type,
        'مبلغ (تومان)': t.amount,
        'دسته': t.categoryName,
        'طرف معامله': t.payee,
        'شعبه': t.branchName,
        'روش پرداخت': t.method,
        'شماره رسید': t.receipt,
        'تاریخ': t.date,
        'وضعیت': statusMap[t.status as string] ?? t.status,
        'یادداشت': t.note ?? '',
        'تاریخ ثبت': t.createdAt,
      }));

      const ws = XLSX.utils.json_to_sheet(data, { skipHeader: false });

      // عرض ستون‌ها
      ws['!cols'] = [
        { wch: 30 }, // عنوان
        { wch: 10 }, // نوع
        { wch: 15 }, // مبلغ
        { wch: 15 }, // دسته
        { wch: 20 }, // طرف معامله
        { wch: 15 }, // شعبه
        { wch: 15 }, // روش پرداخت
        { wch: 12 }, // رسید
        { wch: 12 }, // تاریخ
        { wch: 12 }, // وضعیت
        { wch: 30 }, // یادداشت
        { wch: 20 }, // تاریخ ثبت
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'تراکنش‌ها');

      // دانلود
      const name = filename ?? `basharaf-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در export');
    } finally {
      setLoading(false);
    }
  }

  /** Export به CSV — دانلود مستقیم */
  async function exportCSV(filters: ExportFilters = {}, filename?: string) {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildUrl('csv', filters), { credentials: 'include' });
      if (!res.ok) throw new Error('خطا در دریافت داده');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename ?? `basharaf-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در export CSV');
    } finally {
      setLoading(false);
    }
  }

  return { exportExcel, exportCSV, loading, error };
}
