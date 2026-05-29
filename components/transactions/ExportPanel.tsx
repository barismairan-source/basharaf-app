'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, X } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Select, Field } from '@/components/ui';
import { useAppStore } from '@/store';
import { useExport } from '@/lib/hooks/useExport';
import type { TransactionStatus, TransactionType } from '@/types';
import { cn } from '@/lib/utils';

/**
 * ExportPanel — پنل export تراکنش‌ها.
 *
 * قابلیت‌ها:
 * - فیلتر شعبه (SuperAdmin)
 * - فیلتر نوع (درآمد/هزینه/همه)
 * - فیلتر وضعیت
 * - فیلتر بازه تاریخ (ISO)
 * - Export به Excel یا CSV
 *
 * به‌عنوان یک card collapsible در صفحه transactions نمایش داده می‌شود.
 */

interface ExportPanelProps {
  className?: string;
}

export function ExportPanel({ className }: ExportPanelProps) {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const { exportExcel, exportCSV, loading, error } = useExport();

  const [open, setOpen] = useState(false);
  const [branchId, setBranchId] = useState('all');
  const [status, setStatus] = useState<TransactionStatus | 'all'>('all');
  const [type, setType] = useState<TransactionType | 'all'>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  if (!user) return null;

  const isAdmin = user.role === 'SuperAdmin';

  const filters = {
    branchId: branchId !== 'all' ? branchId : undefined,
    status: status !== 'all' ? status : undefined,
    type: type !== 'all' ? type : undefined,
    from: from || undefined,
    to: to || undefined,
  };

  const today = new Date().toISOString().slice(0, 10);
  const filename = `basharaf-${today}`;

  return (
    <div className={cn(className)}>
      {/* Toggle button */}
      <Button
        variant="default"
        size="sm"
        icon={open ? X : Download}
        onClick={() => setOpen(!open)}
      >
        {open ? 'بستن' : 'خروجی Excel/CSV'}
      </Button>

      {/* Panel */}
      {open && (
        <Card className="mt-3 animate-fade-in">
          <CardHeader
            title="خروجی تراکنش‌ها"
            sub="فیلترها را تنظیم کنید و فرمت دلخواه را انتخاب کنید"
          />
          <CardBody className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {isAdmin && (
                <Field label="شعبه">
                  <Select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                  >
                    <option value="all">همه شعب</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </Select>
                </Field>
              )}

              <Field label="نوع تراکنش">
                <Select
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType | 'all')}
                >
                  <option value="all">همه</option>
                  <option value="income">درآمد</option>
                  <option value="expense">هزینه</option>
                </Select>
              </Field>

              <Field label="وضعیت">
                <Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TransactionStatus | 'all')}
                >
                  <option value="all">همه</option>
                  <option value="approved">تایید شده</option>
                  <option value="pending">در انتظار</option>
                  <option value="rejected">رد شده</option>
                </Select>
              </Field>

              <Field label="از تاریخ">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-stone-200 text-[13px] text-stone-800 focus:outline-none focus:border-stone-500 bg-white"
                  dir="ltr"
                />
              </Field>

              <Field label="تا تاریخ">
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-stone-200 text-[13px] text-stone-800 focus:outline-none focus:border-stone-500 bg-white"
                  dir="ltr"
                />
              </Field>
            </div>

            {/* Error */}
            {error && (
              <div className="text-[12px] text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
              <Button
                variant="primary"
                icon={FileSpreadsheet}
                loading={loading}
                onClick={() => exportExcel(filters, `${filename}.xlsx`)}
              >
                دانلود Excel
              </Button>
              <Button
                variant="default"
                icon={FileText}
                loading={loading}
                onClick={() => exportCSV(filters, `${filename}.csv`)}
              >
                دانلود CSV
              </Button>
              <span className="text-[11px] text-stone-400 mr-auto">
                فرمت CSV برای Google Sheets و Excel مناسب است
              </span>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
