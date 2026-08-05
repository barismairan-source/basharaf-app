'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, ShieldX, Check, CheckCheck, Pencil, UserPlus, Trash2 } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select, Empty, Chip, JalaliDatePicker, InlineNotice } from '@/components/ui';
import { useAppStore } from '@/store';
import { getTodayJalali, jalaliToDate } from '@/lib/jalali';
import {
  resolveTotalPresenceMinutes, applyBreakPolicy, splitRegularOvertime,
  deriveHolidayMinutes, resolveNightMinutes,
  type AttendanceType, type BreakPolicy, type EntryMode,
} from '@/lib/payroll/attendanceEngine';

const ATTENDANCE_TYPE_LABELS: Record<AttendanceType, string> = {
  present: 'حاضر', absent: 'غیبت', paid_leave: 'مرخصی با حقوق', unpaid_leave: 'مرخصی بدون حقوق',
  sick_leave: 'مرخصی استعلاجی', holiday_work: 'کار در تعطیلی', off_day_work: 'کار در روز مرخصی',
};

const STATUS_LABELS: Record<string, { label: string; tone: 'neutral' | 'green' | 'amber' }> = {
  draft: { label: 'پیش‌نویس', tone: 'amber' },
  confirmed: { label: 'تأییدشده', tone: 'green' },
  locked: { label: 'قفل‌شده', tone: 'neutral' },
};

function jalaliStrToIso(jalali: string): string {
  const d = jalaliToDate(jalali);
  return d ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h}س ${mm}د` : `${h}س`;
}

export default function AttendancePage() {
  const user = useAppStore(s => s.user);
  const employees = useAppStore(s => s.employees);
  const loadEmployees = useAppStore(s => s.loadEmployees);
  const branches = useAppStore(s => s.branches);
  const assignments = useAppStore(s => s.shiftAssignments);
  const loadShiftAssignments = useAppStore(s => s.loadShiftAssignments);
  const entries = useAppStore(s => s.attendanceEntries);
  const loadAttendanceEntries = useAppStore(s => s.loadAttendanceEntries);
  const createAttendanceEntry = useAppStore(s => s.createAttendanceEntry);
  const updateAttendanceEntry = useAppStore(s => s.updateAttendanceEntry);
  const confirmAttendanceEntry = useAppStore(s => s.confirmAttendanceEntry);
  const confirmAttendanceBulk = useAppStore(s => s.confirmAttendanceBulk);
  const deleteAttendanceEntry = useAppStore(s => s.deleteAttendanceEntry);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [dateJalali, setDateJalali] = useState(getTodayJalali());
  const [branchFilter, setBranchFilter] = useState(user?.assignedBranch ?? '');
  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [editor, setEditor] = useState<{ employeeId: string; employeeName: string; assignmentId: string | null; plannedMinutes: number; existingId: string | null } | null>(null);

  const isBranchUser = user?.role === 'BranchUser';
  const dateIso = jalaliStrToIso(dateJalali);

  useEffect(() => { setHydrated(true); loadEmployees(); }, [loadEmployees]);
  useEffect(() => {
    loadShiftAssignments({ from: dateIso, to: dateIso, branchId: isBranchUser ? undefined : (branchFilter || undefined) });
    loadAttendanceEntries({ from: dateIso, to: dateIso, branchId: isBranchUser ? undefined : (branchFilter || undefined) });
    setSelectedForBulk([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateIso, branchFilter]);

  const todaysAssignments = assignments.filter(a => a.workDate === dateIso && a.status !== 'cancelled');
  const todaysEntries = entries.filter(e => e.workDate === dateIso);

  // ردیف‌ها: یک ردیف به‌ازای هر تخصیص شیفت + ردیف‌های حضور بدون شیفت
  const rows = useMemo(() => {
    const byAssignment = todaysAssignments.map(a => {
      const entry = todaysEntries.find(e => e.shiftAssignmentId === a.id);
      return { key: a.id, employeeId: a.employeeId, employeeName: a.employeeName ?? '—', assignment: a, entry: entry ?? null };
    });
    const unscheduled = todaysEntries.filter(e => e.shiftAssignmentId === null)
      .map(e => ({ key: e.id, employeeId: e.employeeId, employeeName: e.employeeName ?? '—', assignment: null, entry: e }));
    return [...byAssignment, ...unscheduled];
  }, [todaysAssignments, todaysEntries]);

  const branchEmployees = employees.filter(ee => ee.isActive && (!branchFilter || ee.branchId === branchFilter));
  const employeesWithoutRowToday = branchEmployees.filter(ee => !rows.some(r => r.employeeId === ee.id));

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin' && user.role !== 'BranchUser') {
    return <div className="p-6"><Card><CardBody><Empty title="دسترسی به این بخش مجاز نیست" icon={ShieldX} /></CardBody></Card></div>;
  }

  async function handleConfirm(id: string) {
    const ok = await confirmAttendanceEntry(id);
    showToast(ok ? 'تأیید شد' : 'خطا در تأیید (فقط مدیر مجاز است)', ok ? 'success' : 'danger');
  }

  async function handleDelete(id: string) {
    if (!confirm('این رکورد حضور حذف شود؟')) return;
    const ok = await deleteAttendanceEntry(id);
    showToast(ok ? 'حذف شد' : 'خطا در حذف (رکورد قفل‌شده قابل حذف نیست)', ok ? 'success' : 'danger');
  }

  async function handleBulkConfirm() {
    if (selectedForBulk.length === 0) return;
    const result = await confirmAttendanceBulk(selectedForBulk);
    if (!result) { showToast('خطا در تأیید گروهی', 'danger'); return; }
    showToast(`${result.confirmed.length} مورد تأیید شد${result.skipped.length ? ` — ${result.skipped.length} مورد قابل تأیید نبود` : ''}`);
    setSelectedForBulk([]);
  }

  const draftIdsOnPage = rows.filter(r => r.entry?.status === 'draft').map(r => r.entry!.id);

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">حضور و غیاب</h1>
            <div className="text-[12px] text-stone-500 mt-1">ثبت حضور واقعی — جدا از شیفت برنامه‌ریزی‌شده</div>
          </div>
          {user.role === 'SuperAdmin' && draftIdsOnPage.length > 0 && (
            <Button variant="primary" size="sm" icon={CheckCheck}
              onClick={() => { setSelectedForBulk(draftIdsOnPage); handleBulkConfirm(); }}>
              تأیید همه‌ی پیش‌نویس‌ها ({draftIdsOnPage.length})
            </Button>
          )}
        </div>

        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <JalaliDatePicker value={dateJalali} onChange={setDateJalali} />
              {!isBranchUser && (
                <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="max-w-[180px]">
                  <option value="">— همه شعبه‌ها —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              )}
              {employeesWithoutRowToday.length > 0 && (
                <Select value="" onChange={e => {
                  const emp = employees.find(x => x.id === e.target.value);
                  if (emp) setEditor({ employeeId: emp.id, employeeName: emp.fullName, assignmentId: null, plannedMinutes: 0, existingId: null });
                }} className="max-w-[220px]">
                  <option value="">+ ثبت حضور بدون شیفت...</option>
                  {employeesWithoutRowToday.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
                </Select>
              )}
            </div>
          </CardBody>
        </Card>

        {rows.length === 0 ? (
          <Card><CardBody><Empty title="امروز شیفت یا حضوری ثبت نشده" icon={Clock} /></CardBody></Card>
        ) : (
          <div className="space-y-2">
            {rows.map(r => {
              const st = r.entry ? STATUS_LABELS[r.entry.status] : null;
              return (
                <div key={r.key} className="bg-white border border-stone-200 rounded-lg p-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <div className="text-[13.5px] font-medium text-stone-900">{r.employeeName}</div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap mt-0.5">
                      {r.assignment ? (
                        <span dir="ltr">{r.assignment.plannedStartTime}–{r.assignment.plannedEndTime} · برنامه: {fmtMin(r.assignment.plannedMinutes)}</span>
                      ) : (
                        <span>بدون شیفت برنامه‌ریزی‌شده</span>
                      )}
                    </div>
                  </div>

                  {r.entry ? (
                    <>
                      <div className="text-[11.5px] text-stone-600 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>حضور: {fmtMin(r.entry.workedMinutes)}</span>
                        <span>عادی: {fmtMin(r.entry.regularMinutes)}</span>
                        {r.entry.overtimeMinutes > 0 && (
                          <span className={r.entry.overtimeApproved ? 'text-emerald-700' : 'text-amber-700'}>
                            اضافه‌کاری: {fmtMin(r.entry.overtimeMinutes)}{r.entry.overtimeApproved ? ' (تأییدشده)' : ' (در انتظار)'}
                          </span>
                        )}
                        {r.entry.nightMinutes > 0 && <span>شب‌کاری: {fmtMin(r.entry.nightMinutes)}</span>}
                      </div>
                      {st && <Chip tone={st.tone}>{st.label}</Chip>}
                      {r.entry.status !== 'locked' && (
                        <>
                          <button onClick={() => setEditor({
                            employeeId: r.employeeId, employeeName: r.employeeName,
                            assignmentId: r.assignment?.id ?? null, plannedMinutes: r.assignment?.plannedMinutes ?? 0,
                            existingId: r.entry!.id,
                          })} className="text-muted hover:text-stone-700 p-1">
                            <Pencil size={14} strokeWidth={1.5} />
                          </button>
                          <button onClick={() => handleDelete(r.entry!.id)} className="text-muted hover:text-rose-600 p-1">
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </>
                      )}
                      {r.entry.status === 'draft' && user.role === 'SuperAdmin' && (
                        <Button variant="default" size="sm" icon={Check} onClick={() => handleConfirm(r.entry!.id)}>تأیید</Button>
                      )}
                    </>
                  ) : (
                    <Button variant="default" size="sm" icon={UserPlus} onClick={() => setEditor({
                      employeeId: r.employeeId, employeeName: r.employeeName,
                      assignmentId: r.assignment?.id ?? null, plannedMinutes: (r.assignment as any)?.plannedMinutes ?? 0,
                      existingId: null,
                    })}>ثبت حضور</Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editor && (
        <AttendanceEditor
          workDate={dateIso}
          employeeName={editor.employeeName}
          employeeId={editor.employeeId}
          shiftAssignmentId={editor.assignmentId}
          plannedMinutes={editor.plannedMinutes}
          existingId={editor.existingId}
          existing={editor.existingId ? todaysEntries.find(e => e.id === editor.existingId) ?? null : null}
          onClose={() => setEditor(null)}
          onSaved={() => setEditor(null)}
          createAttendanceEntry={createAttendanceEntry}
          updateAttendanceEntry={updateAttendanceEntry}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function AttendanceEditor(props: {
  workDate: string; employeeName: string; employeeId: string;
  shiftAssignmentId: string | null; plannedMinutes: number; existingId: string | null;
  existing: ReturnType<typeof useAppStore.getState>['attendanceEntries'][number] | null;
  onClose: () => void; onSaved: () => void;
  createAttendanceEntry: ReturnType<typeof useAppStore.getState>['createAttendanceEntry'];
  updateAttendanceEntry: ReturnType<typeof useAppStore.getState>['updateAttendanceEntry'];
  showToast: ReturnType<typeof useAppStore.getState>['showToast'];
}) {
  const { existing } = props;
  const [entryMode, setEntryMode] = useState<EntryMode>(existing?.entryMode ?? 'time_range');
  const [clockIn, setClockIn] = useState(existing?.clockIn ?? '08:00');
  const [clockOut, setClockOut] = useState(existing?.clockOut ?? '16:00');
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [manualMinutes, setManualMinutes] = useState(String(existing?.manualWorkedMinutes ?? ''));
  const [breakMinutes, setBreakMinutes] = useState(String(existing?.breakMinutes ?? 0));
  const [breakPolicy, setBreakPolicy] = useState<BreakPolicy>('unpaid');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>(existing?.attendanceType ?? 'present');
  const [managerNote, setManagerNote] = useState(existing?.managerNote ?? '');
  const [busy, setBusy] = useState(false);

  const preview = useMemo(() => {
    try {
      if (attendanceType === 'absent') return { workedMinutes: 0, regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, holidayMinutes: 0, error: null as string | null };
      if (attendanceType === 'paid_leave' || attendanceType === 'unpaid_leave' || attendanceType === 'sick_leave') {
        const workedMinutes = parseInt(manualMinutes, 10) || 0;
        return { workedMinutes, regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, holidayMinutes: 0, error: null };
      }
      const total = resolveTotalPresenceMinutes({
        entryMode, clockIn, clockOut, crossesMidnight,
        manualWorkedMinutes: parseInt(manualMinutes, 10) || 0,
      });
      const workedMinutes = applyBreakPolicy(total, parseInt(breakMinutes, 10) || 0, breakPolicy);
      const holidayMinutes = deriveHolidayMinutes(attendanceType, workedMinutes);
      const { regularMinutes, overtimeMinutes } = holidayMinutes > 0
        ? { regularMinutes: 0, overtimeMinutes: 0 }
        : splitRegularOvertime(workedMinutes, props.plannedMinutes);
      const nightMinutes = entryMode === 'time_range' ? resolveNightMinutes(clockIn, clockOut, crossesMidnight) : 0;
      return { workedMinutes, regularMinutes, overtimeMinutes, nightMinutes, holidayMinutes, error: null };
    } catch (e) {
      return { workedMinutes: 0, regularMinutes: 0, overtimeMinutes: 0, nightMinutes: 0, holidayMinutes: 0, error: (e as Error).message };
    }
  }, [entryMode, clockIn, clockOut, crossesMidnight, manualMinutes, breakMinutes, breakPolicy, attendanceType, props.plannedMinutes]);

  async function handleSave() {
    if (preview.error) { props.showToast(preview.error, 'danger'); return; }
    setBusy(true);
    const payload = {
      employeeId: props.employeeId, workDate: props.workDate, shiftAssignmentId: props.shiftAssignmentId,
      entryMode, clockIn: entryMode === 'time_range' ? clockIn : null, clockOut: entryMode === 'time_range' ? clockOut : null,
      crossesMidnight, manualWorkedMinutes: entryMode === 'total_minutes' ? (parseInt(manualMinutes, 10) || 0) : null,
      breakMinutes: parseInt(breakMinutes, 10) || 0, breakPolicy, attendanceType, managerNote: managerNote || null,
    };
    const ok = props.existingId
      ? await props.updateAttendanceEntry(props.existingId, payload)
      : !!(await props.createAttendanceEntry(payload));
    setBusy(false);
    if (ok) { props.showToast('حضور ذخیره شد', 'success'); props.onSaved(); }
    else props.showToast('خطا در ذخیره حضور — شاید نرخ ساعتی فعالی برای این کارمند تعریف نشده', 'danger');
  }

  const isLeaveType = attendanceType === 'paid_leave' || attendanceType === 'unpaid_leave' || attendanceType === 'sick_leave';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={props.onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-[16px] font-medium text-stone-900 mb-1">ثبت حضور — {props.employeeName}</h2>
        <p className="text-[11.5px] text-stone-500 mb-4">{props.plannedMinutes > 0 ? `برنامه‌ریزی‌شده: ${fmtMin(props.plannedMinutes)}` : 'بدون شیفت برنامه‌ریزی‌شده'}</p>

        <div className="space-y-3">
          <Field label="نوع">
            <Select value={attendanceType} onChange={e => setAttendanceType(e.target.value as AttendanceType)}>
              {Object.entries(ATTENDANCE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>

          {attendanceType === 'absent' ? null : isLeaveType ? (
            <Field label="دقیقه‌ی قابل‌پرداخت (تعیین‌شده توسط مدیر)">
              <Input value={manualMinutes} dir="ltr" onChange={e => setManualMinutes(e.target.value.replace(/\D/g, ''))} />
            </Field>
          ) : (
            <>
              <Field label="روش ثبت">
                <Select value={entryMode} onChange={e => setEntryMode(e.target.value as EntryMode)}>
                  <option value="time_range">ساعت ورود/خروج</option>
                  <option value="total_minutes">مجموع دقیقه (دستی)</option>
                </Select>
              </Field>
              {entryMode === 'time_range' ? (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="ورود"><Input value={clockIn} dir="ltr" onChange={e => setClockIn(e.target.value)} placeholder="08:00" /></Field>
                  <Field label="خروج"><Input value={clockOut} dir="ltr" onChange={e => setClockOut(e.target.value)} placeholder="16:00" /></Field>
                </div>
              ) : (
                <Field label="مجموع دقیقه"><Input value={manualMinutes} dir="ltr" onChange={e => setManualMinutes(e.target.value.replace(/\D/g, ''))} /></Field>
              )}
              {entryMode === 'time_range' && (
                <label className="flex items-center gap-1.5 text-[11.5px] text-stone-600">
                  <input type="checkbox" checked={crossesMidnight} onChange={e => setCrossesMidnight(e.target.checked)} />
                  عبور از نیمه‌شب
                </label>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="استراحت (دقیقه)">
                  <Input value={breakMinutes} dir="ltr" onChange={e => setBreakMinutes(e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label="سیاست استراحت">
                  <Select value={breakPolicy} onChange={e => setBreakPolicy(e.target.value as BreakPolicy)}>
                    <option value="unpaid">بدون حقوق</option>
                    <option value="paid">با حقوق</option>
                    <option value="none">بدون کسر</option>
                  </Select>
                </Field>
              </div>
            </>
          )}

          <Field label="یادداشت مدیر (اختیاری)">
            <Input value={managerNote} onChange={e => setManagerNote(e.target.value)} />
          </Field>
        </div>

        <div className="mt-4 bg-stone-50 rounded-lg p-3 text-[12px] space-y-1">
          <div className="font-medium text-stone-700 mb-1">پیش‌نمایش محاسبه</div>
          {preview.error ? (
            <InlineNotice tone="danger">{preview.error}</InlineNotice>
          ) : (
            <>
              <div className="flex justify-between"><span className="text-stone-500">حضور قابل‌پرداخت</span><span className="tabular-nums">{fmtMin(preview.workedMinutes)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">زمان عادی</span><span className="tabular-nums">{fmtMin(preview.regularMinutes)}</span></div>
              {preview.overtimeMinutes > 0 && <div className="flex justify-between"><span className="text-stone-500">اضافه‌کاری پیشنهادی</span><span className="tabular-nums text-amber-700">{fmtMin(preview.overtimeMinutes)}</span></div>}
              {preview.nightMinutes > 0 && <div className="flex justify-between"><span className="text-stone-500">شب‌کاری</span><span className="tabular-nums">{fmtMin(preview.nightMinutes)}</span></div>}
              {preview.holidayMinutes > 0 && <div className="flex justify-between"><span className="text-stone-500">تعطیل‌کاری</span><span className="tabular-nums">{fmtMin(preview.holidayMinutes)}</span></div>}
            </>
          )}
        </div>

        <div className="flex gap-2 mt-5">
          <Button variant="primary" onClick={handleSave} loading={busy}>ذخیره</Button>
          <Button variant="default" onClick={props.onClose}>لغو</Button>
        </div>
      </div>
    </div>
  );
}
