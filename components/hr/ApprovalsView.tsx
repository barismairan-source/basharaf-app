'use client';

import { useEffect, useState } from 'react';
import { CheckCheck, AlertTriangle, Timer, CalendarX2, ShieldAlert } from 'lucide-react';
import { Button, Card, CardBody, Select, Empty, Chip } from '@/components/ui';
import { useAppStore } from '@/store';
import { useHrBranchFilter } from '@/lib/hr/branchFilterContext';
import { getTodayJalali } from '@/lib/jalali';

const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

interface QueueEntry {
  id: string; employeeId: string; employeeName: string; workDate: string;
  workedMinutes: number; overtimeMinutes: number; status: string; attendanceType: string;
}
interface OverlapDay { employeeId: string; employeeName: string; workDate: string; entryIds: string[] }
interface ApprovalsData {
  draftEntries: QueueEntry[]; unapprovedOvertimeEntries: QueueEntry[];
  unscheduledEntries: QueueEntry[]; overlappingDays: OverlapDay[];
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}س ${mm}د` : `${h}س`;
}

/** تب «تأییدها» — صف واحد بررسی برای حضور draft/اضافه‌کاری/بدون‌شیفت/هم‌پوشان. */
export function ApprovalsView() {
  const user = useAppStore(s => s.user);
  const { branchId } = useHrBranchFilter();
  const confirmAttendanceBulk = useAppStore(s => s.confirmAttendanceBulk);
  const updateAttendanceEntry = useAppStore(s => s.updateAttendanceEntry);
  const showToast = useAppStore(s => s.showToast);

  const [today] = useState(getTodayJalali());
  const [jy, jm] = today.split('/');
  const [year, setYear] = useState(jy!);
  const [month, setMonth] = useState(jm!);
  const [data, setData] = useState<ApprovalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);

  const period = `${year}-${month}`;
  const isAdmin = user?.role === 'SuperAdmin';

  function load() {
    setLoading(true);
    const qs = new URLSearchParams({ period, ...(branchId ? { branchId } : {}) });
    fetch(`/api/hr/time/approvals?${qs}`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); setSelected([]); }, [period, branchId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAdmin) {
    return <Card><CardBody><Empty title="فقط مدیر مجاز به تأیید حضور/اضافه‌کاری است" icon={ShieldAlert} /></CardBody></Card>;
  }

  async function handleBulkConfirm() {
    if (selected.length === 0) return;
    const result = await confirmAttendanceBulk(selected);
    if (!result) { showToast('خطا در تأیید گروهی', 'danger'); return; }
    showToast(`${result.confirmed.length} مورد تأیید شد`, 'success');
    setSelected([]); load();
  }

  async function handleApproveOvertime(id: string) {
    const ok = await updateAttendanceEntry(id, { overtimeApproved: true });
    showToast(ok ? 'اضافه‌کاری تأیید شد' : 'خطا', ok ? 'success' : 'danger');
    if (ok) load();
  }

  const totalCount = data ? data.draftEntries.length + data.unapprovedOvertimeEntries.length + data.unscheduledEntries.length + data.overlappingDays.length : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={year} onChange={e => setYear(e.target.value)} className="max-w-[100px]">
          {['1404', '1405', '1406'].map(y => <option key={y} value={y}>{y}</option>)}
        </Select>
        <Select value={month} onChange={e => setMonth(e.target.value)} className="max-w-[130px]">
          {JALALI_MONTHS.map((m, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>)}
        </Select>
        {selected.length > 0 && (
          <Button variant="primary" size="sm" icon={CheckCheck} onClick={handleBulkConfirm}>
            تأیید {selected.length} مورد انتخاب‌شده
          </Button>
        )}
      </div>

      {loading ? (
        <Card><CardBody><div className="text-[12px] text-muted">در حال بارگذاری…</div></CardBody></Card>
      ) : !data || totalCount === 0 ? (
        <Card><CardBody><Empty title="صف بررسی خالی است" icon={CheckCheck} /></CardBody></Card>
      ) : (
        <div className="space-y-4">
          {data.draftEntries.length > 0 && (
            <div>
              <div className="text-[12.5px] font-medium text-stone-700 mb-2 flex items-center gap-1.5"><Timer size={14} strokeWidth={1.5} /> حضور تأییدنشده ({data.draftEntries.length})</div>
              <div className="space-y-1.5">
                {data.draftEntries.map(e => (
                  <label key={e.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-2.5 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(e.id)}
                      onChange={ev => setSelected(prev => ev.target.checked ? [...prev, e.id] : prev.filter(id => id !== e.id))} />
                    <span className="flex-1 text-[12.5px] text-stone-800">{e.employeeName}</span>
                    <span className="text-[11px] text-muted" dir="ltr">{e.workDate}</span>
                    <span className="text-[11px] text-stone-600 tabular-nums">{fmtMin(e.workedMinutes)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {data.unapprovedOvertimeEntries.length > 0 && (
            <div>
              <div className="text-[12.5px] font-medium text-stone-700 mb-2 flex items-center gap-1.5"><Timer size={14} strokeWidth={1.5} /> اضافه‌کاری منتظر تأیید ({data.unapprovedOvertimeEntries.length})</div>
              <div className="space-y-1.5">
                {data.unapprovedOvertimeEntries.map(e => (
                  <div key={e.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-2.5">
                    <span className="flex-1 text-[12.5px] text-stone-800">{e.employeeName}</span>
                    <span className="text-[11px] text-muted" dir="ltr">{e.workDate}</span>
                    <span className="text-[11px] text-amber-700 tabular-nums">{fmtMin(e.overtimeMinutes)}</span>
                    <Button variant="default" size="sm" onClick={() => handleApproveOvertime(e.id)}>تأیید</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.unscheduledEntries.length > 0 && (
            <div>
              <div className="text-[12.5px] font-medium text-stone-700 mb-2 flex items-center gap-1.5"><CalendarX2 size={14} strokeWidth={1.5} /> حضور بدون شیفت برنامه‌ریزی‌شده ({data.unscheduledEntries.length})</div>
              <div className="space-y-1.5">
                {data.unscheduledEntries.map(e => (
                  <div key={e.id} className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-2.5">
                    <span className="flex-1 text-[12.5px] text-stone-800">{e.employeeName}</span>
                    <span className="text-[11px] text-muted" dir="ltr">{e.workDate}</span>
                    <Chip tone="amber">{e.status === 'draft' ? 'پیش‌نویس' : 'تأییدشده'}</Chip>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.overlappingDays.length > 0 && (
            <div>
              <div className="text-[12.5px] font-medium text-rose-700 mb-2 flex items-center gap-1.5"><AlertTriangle size={14} strokeWidth={1.5} /> حضور مشکوک/هم‌پوشان — نیازمند اصلاح دستی ({data.overlappingDays.length})</div>
              <div className="space-y-1.5">
                {data.overlappingDays.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-lg p-2.5">
                    <span className="flex-1 text-[12.5px] text-stone-800">{d.employeeName}</span>
                    <span className="text-[11px] text-muted" dir="ltr">{d.workDate}</span>
                    <span className="text-[11px] text-rose-700">{d.entryIds.length} رکورد هم‌پوشان</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
