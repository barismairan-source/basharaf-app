'use client';

import { useEffect, useState } from 'react';
import { FileBarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardBody, Select, Empty, Chip } from '@/components/ui';
import { fmt } from '@/lib/utils';
import { useHrBranchFilter } from '@/lib/hr/branchFilterContext';
import { getTodayJalali } from '@/lib/jalali';

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

interface TimesheetRow {
  employeeId: string; employeeName: string;
  plannedMinutes: number; workedMinutes: number; regularMinutes: number; overtimeMinutes: number;
  nightMinutes: number; holidayMinutes: number; paidLeaveMinutes: number; unpaidLeaveMinutes: number;
  absentDays: number; shortfallMinutes: number; estimatedAmount: number; complete: boolean;
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}س ${mm}د` : `${h}س`;
}

/** تب «گزارش کارکرد» — خلاصه‌ی هر فرد در دوره؛ فقط از حضور تأییدشده/قفل‌شده. */
export function TimesheetView() {
  const { branchId } = useHrBranchFilter();
  const [today] = useState(getTodayJalali());
  const [jy, jm] = today.split('/');
  const [year, setYear] = useState(jy!);
  const [month, setMonth] = useState(jm!);
  const [rows, setRows] = useState<TimesheetRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const period = `${year}-${month}`;

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams({ period, ...(branchId ? { branchId } : {}) });
    fetch(`/api/hr/time/timesheet?${qs}`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setRows(d?.rows ?? null))
      .finally(() => setLoading(false));
  }, [period, branchId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={year} onChange={e => setYear(e.target.value)} className="max-w-[100px]">
          {['1404', '1405', '1406'].map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select value={month} onChange={e => setMonth(e.target.value)} className="max-w-[130px]">
          {JALALI_MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </Select>
      </div>

      {loading ? (
        <Card><CardBody><div className="text-[12px] text-muted">در حال بارگذاری…</div></CardBody></Card>
      ) : !rows || rows.length === 0 ? (
        <Card><CardBody><Empty title="کارمند ساعتی‌ای برای این دوره/شعبه نیست" icon={FileBarChart2} /></CardBody></Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[720px]">
            <thead>
              <tr className="text-muted text-[10.5px] border-b border-stone-200">
                <th className="text-right py-2 px-2">کارمند</th>
                <th className="text-left py-2 px-2">برنامه‌ریزی‌شده</th>
                <th className="text-left py-2 px-2">واقعی</th>
                <th className="text-left py-2 px-2">عادی</th>
                <th className="text-left py-2 px-2">اضافه‌کاری</th>
                <th className="text-left py-2 px-2">شب‌کاری</th>
                <th className="text-left py-2 px-2">تعطیل‌کاری</th>
                <th className="text-left py-2 px-2">مرخصی</th>
                <th className="text-left py-2 px-2">غیبت</th>
                <th className="text-left py-2 px-2">کسری</th>
                <th className="text-left py-2 px-2">مبلغ تخمینی</th>
                <th className="text-left py-2 px-2">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.employeeId} className="border-b border-stone-100">
                  <td className="py-2 px-2 text-stone-800">{r.employeeName}</td>
                  <td className="py-2 px-2 text-left tabular-nums">{fmtMin(r.plannedMinutes)}</td>
                  <td className="py-2 px-2 text-left tabular-nums">{fmtMin(r.workedMinutes)}</td>
                  <td className="py-2 px-2 text-left tabular-nums">{fmtMin(r.regularMinutes)}</td>
                  <td className="py-2 px-2 text-left tabular-nums text-amber-700">{fmtMin(r.overtimeMinutes)}</td>
                  <td className="py-2 px-2 text-left tabular-nums">{fmtMin(r.nightMinutes)}</td>
                  <td className="py-2 px-2 text-left tabular-nums">{fmtMin(r.holidayMinutes)}</td>
                  <td className="py-2 px-2 text-left tabular-nums">{fmtMin(r.paidLeaveMinutes + r.unpaidLeaveMinutes)}</td>
                  <td className="py-2 px-2 text-left tabular-nums">{r.absentDays || '—'}</td>
                  <td className="py-2 px-2 text-left tabular-nums text-stone-500">{r.shortfallMinutes > 0 ? fmtMin(r.shortfallMinutes) : '—'}</td>
                  <td className="py-2 px-2 text-left tabular-nums font-medium">{fmt(r.estimatedAmount)}</td>
                  <td className="py-2 px-2 text-left">
                    {r.complete ? (
                      <Chip tone="green"><CheckCircle2 size={11} strokeWidth={1.5} /> کامل</Chip>
                    ) : (
                      <Chip tone="amber"><AlertCircle size={11} strokeWidth={1.5} /> ناقص</Chip>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
