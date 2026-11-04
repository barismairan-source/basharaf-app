'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Trash2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, InlineNotice, Input, Sheet, Switch } from '@/components/ui';
import { addDaysIso, weekStartIso } from '@/components/me/MeClient';
import { useAppStore } from '@/store';
import { canDo } from '@/lib/auth/permissions';
import { useHrBranchFilter } from '@/lib/hr/branchFilterContext';
import { SHIFT_PRESETS, shiftCellLabel, shiftsToCopy } from '@/lib/hr/shiftPresets';
import { dateToJalali, todayIsoTehran } from '@/lib/jalali';
import { toFa } from '@/lib/utils';

interface Assignment { id: string; employeeId: string; workDate: string; plannedStartTime: string; plannedEndTime: string; crossesMidnight: boolean; plannedMinutes: number; status: string; branchId: string | null }

const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: 'include', cache: 'no-store', headers: init?.body ? { 'Content-Type': 'application/json' } : undefined, ...init });
  const b = await r.json();
  if (!r.ok) throw new Error(b?.error ?? 'خطا');
  return b;
}

/**
 * «جدول هفتگی» — ساده‌ترین راه چیدن شیفت: هر سطر یک نفر، هر ستون یک روز؛ با لمس هر خانه صبح/شب/ساعت دلخواه
 * اضافه یا حذف می‌شود و «کپی از هفته‌ی قبل» یک هفته را یکجا می‌چیند. همان لحظه در پنل هر نفر دیده می‌شود.
 */
export function ShiftWeekGrid() {
  const user = useAppStore((s) => s.user);
  const employees = useAppStore((s) => s.employees);
  const loadEmployees = useAppStore((s) => s.loadEmployees);
  const showToast = useAppStore((s) => s.showToast);
  const { branchId } = useHrBranchFilter();
  const canManage = canDo(user, 'hr.schedule.manage');

  const today = todayIsoTehran();
  const [start, setStart] = useState(() => weekStartIso(today));
  const [items, setItems] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cell, setCell] = useState<{ employeeId: string; name: string; date: string } | null>(null);
  const [customStart, setCustomStart] = useState('12:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [customNext, setCustomNext] = useState(false);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysIso(start, i)), [start]);
  const people = useMemo(() => employees
    .filter((e) => e.isActive && (!branchId || e.branchId === branchId))
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'fa')), [employees, branchId]);

  const fetchRange = useCallback(async (from: string, to: string) => {
    const qs = new URLSearchParams({ from, to, ...(branchId ? { branchId } : {}) });
    const b = await api<{ assignments: Assignment[] }>(`/api/shift-assignments?${qs}`);
    return b.assignments.filter((a) => a.status !== 'cancelled');
  }, [branchId]);

  const load = useCallback(() => {
    setItems(null);
    fetchRange(start, addDaysIso(start, 6)).then(setItems).catch((e) => { setItems([]); setError(e.message); });
  }, [fetchRange, start]);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);
  useEffect(() => { load(); }, [load]);

  const inCell = (employeeId: string, date: string) => (items ?? []).filter((a) => a.employeeId === employeeId && a.workDate === date);
  const openShifts = cell ? inCell(cell.employeeId, cell.date) : [];

  async function add(startTime: string, endTime: string, crossesMidnight: boolean) {
    if (!cell) return;
    const emp = employees.find((e) => e.id === cell.employeeId);
    setBusy(true); setError(null);
    try {
      const b = await api<{ conflicts: unknown[] }>('/api/shift-assignments', {
        method: 'POST',
        body: JSON.stringify({ employeeIds: [cell.employeeId], workDates: [cell.date], branchId: emp?.branchId ?? null, startTime, endTime, crossesMidnight, breakMinutes: 0, breakPolicy: 'none' }),
      });
      if (b.conflicts.length > 0) setError('این ساعت با شیفت دیگر همین نفر در همین روز تداخل دارد.');
      else setCell(null);
      load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true); setError(null);
    try {
      await api(`/api/shift-assignments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
      load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function copyPrevious() {
    setBusy(true); setError(null);
    try {
      const prevStart = addDaysIso(start, -7);
      const previous = await fetchRange(prevStart, addDaysIso(prevStart, 6));
      const toCreate = shiftsToCopy(previous, items ?? []);
      if (previous.length === 0) { setError('هفته‌ی قبل شیفتی ندارد.'); return; }
      let conflicts = 0;
      for (const s of toCreate) {
        const b = await api<{ conflicts: unknown[] }>('/api/shift-assignments', {
          method: 'POST',
          body: JSON.stringify({ employeeIds: [s.employeeId], workDates: [s.targetDate], branchId: s.branchId, startTime: s.plannedStartTime, endTime: s.plannedEndTime, crossesMidnight: s.crossesMidnight, breakMinutes: 0, breakPolicy: 'none' }),
        });
        conflicts += b.conflicts.length;
      }
      showToast(`${toFa(toCreate.length - conflicts)} شیفت کپی شد`, 'success');
      if (conflicts > 0) setError(`${toFa(conflicts)} شیفت به‌خاطر تداخل کپی نشد.`);
      load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const label = (iso: string) => toFa(dateToJalali(new Date(iso + 'T12:00:00Z')).split('/').slice(1).join('/'));

  return (
    <div className="space-y-4">
      {error && <InlineNotice tone="danger" onDismiss={() => setError(null)}>{error}</InlineNotice>}
      <Card>
        <CardHeader title="جدول هفتگی شیفت" sub="روی هر خانه بزنید تا شیفت اضافه یا حذف شود؛ همان لحظه در پنل هر نفر دیده می‌شود" />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => setStart(addDaysIso(start, -7))}>هفته قبل</Button>
            <span className="min-w-[120px] text-center text-[14px] font-medium">{start === weekStartIso(today) ? 'این هفته' : `${label(start)} تا ${label(addDaysIso(start, 6))}`}</span>
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setStart(addDaysIso(start, 7))}>هفته بعد</Button>
            {canManage && <Button size="sm" icon={Copy} className="ms-auto" disabled={busy || items === null} onClick={copyPrevious}>کپی از هفته‌ی قبل</Button>}
          </div>
          {items === null ? <p className="text-[13px] text-muted">در حال بارگذاری…</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-separate border-spacing-1 text-[12.5px]">
                <thead>
                  <tr>
                    <th className="sticky start-0 bg-surface px-2 py-1 text-start font-medium">نفر</th>
                    {days.map((d, i) => (
                      <th key={d} className={`px-1 py-1 text-center font-medium ${d === today ? 'text-primary' : ''}`}>
                        <div>{WEEKDAYS[i]}</div><div className="text-[11px] font-normal text-muted">{label(d)}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr key={p.id}>
                      <td className="sticky start-0 whitespace-nowrap bg-surface px-2 py-1 font-medium">{p.fullName}</td>
                      {days.map((d) => {
                        const list = inCell(p.id, d);
                        return (
                          <td key={d} className="p-0">
                            <button type="button" disabled={!canManage} onClick={() => { setError(null); setCell({ employeeId: p.id, name: p.fullName, date: d }); }}
                              aria-label={`${p.fullName}، ${label(d)}`}
                              style={list.length ? { background: 'rgba(179,139,89,0.16)', borderColor: 'rgba(179,139,89,0.55)' } : undefined}
                              className="flex min-h-[38px] w-full flex-col items-center justify-center gap-0.5 rounded-md border border-border px-1 py-1 hover:bg-bg">
                              {list.length === 0 ? <span className="text-muted">—</span> : list
                                .sort((a, b) => a.plannedStartTime.localeCompare(b.plannedStartTime))
                                .map((s) => <span key={s.id}>{toFa(shiftCellLabel(s.plannedStartTime, s.plannedEndTime))}</span>)}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Sheet open={!!cell} onClose={() => setCell(null)} title={cell ? `${cell.name} — ${label(cell.date)}` : undefined}>
        {cell && (
          <div className="space-y-4 pb-2">
            {error && <InlineNotice tone="danger" onDismiss={() => setError(null)}>{error}</InlineNotice>}
            {openShifts.length > 0 && (
              <ul className="divide-y divide-border">
                {openShifts.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-[13px]">
                    <span>{toFa(shiftCellLabel(s.plannedStartTime, s.plannedEndTime))} <span dir="ltr" className="text-muted">({toFa(s.plannedStartTime)}–{toFa(s.plannedEndTime)})</span></span>
                    <Button size="sm" variant="danger" icon={Trash2} disabled={busy} onClick={() => remove(s.id)}>حذف</Button>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-2">
              {SHIFT_PRESETS.map((p) => (
                <Button key={p.key} variant="primary" disabled={busy} onClick={() => add(p.start, p.end, p.crossesMidnight)}>
                  {p.label} ({toFa(p.start)} تا {toFa(p.end)})
                </Button>
              ))}
            </div>
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="text-[12.5px] font-medium">ساعت دلخواه</p>
              <div className="grid grid-cols-2 gap-2">
                <Field label="از"><Input dir="ltr" value={customStart} onChange={(e) => setCustomStart(e.target.value)} placeholder="12:00" /></Field>
                <Field label="تا"><Input dir="ltr" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} placeholder="17:00" /></Field>
              </div>
              <div className="flex items-center gap-2 text-[12.5px]"><Switch checked={customNext} onCheckedChange={setCustomNext} aria-label="پایان شیفت روز بعد است" /><span>پایان شیفت روز بعد است</span></div>
              <Button disabled={busy} onClick={() => add(customStart, customEnd, customNext)}>افزودن این ساعت</Button>
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
