'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, ShieldX, Trash2, ChevronRight, ChevronLeft, Copy } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select, Empty, Chip, JalaliDatePicker, Toggle, InlineNotice } from '@/components/ui';
import { useAppStore } from '@/store';
import { getTodayJalali, jalaliToDate, dateToJalali } from '@/lib/jalali';

const timeRe = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function jalaliStrToIso(jalali: string): string {
  const d = jalaliToDate(jalali);
  return d ? d.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function isoToJalaliShort(iso: string): string {
  return dateToJalali(new Date(iso + 'T00:00:00Z'));
}

export default function ShiftSchedulePage() {
  const user = useAppStore(s => s.user);
  const employees = useAppStore(s => s.employees);
  const loadEmployees = useAppStore(s => s.loadEmployees);
  const branches = useAppStore(s => s.branches);
  const shiftTemplates = useAppStore(s => s.shiftTemplates);
  const loadShiftTemplates = useAppStore(s => s.loadShiftTemplates);
  const assignments = useAppStore(s => s.shiftAssignments);
  const loadShiftAssignments = useAppStore(s => s.loadShiftAssignments);
  const createShiftAssignments = useAppStore(s => s.createShiftAssignments);
  const cancelShiftAssignment = useAppStore(s => s.cancelShiftAssignment);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [anchorJalali, setAnchorJalali] = useState(getTodayJalali());
  const [branchFilter, setBranchFilter] = useState(user?.assignedBranch ?? '');
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ employeeId: string; workDate: string }>>([]);

  const isBranchUser = user?.role === 'BranchUser';

  const anchorIso = jalaliStrToIso(anchorJalali);
  const rangeFrom = anchorIso;
  const rangeTo = viewMode === 'week' ? addDaysIso(anchorIso, 6) : anchorIso;
  const visibleDates = useMemo(() => {
    const n = viewMode === 'week' ? 7 : 1;
    return Array.from({ length: n }, (_, i) => addDaysIso(rangeFrom, i));
  }, [rangeFrom, viewMode]);

  useEffect(() => { setHydrated(true); loadEmployees(); loadShiftTemplates(); }, [loadEmployees, loadShiftTemplates]);
  useEffect(() => {
    loadShiftAssignments({ from: rangeFrom, to: rangeTo, branchId: isBranchUser ? undefined : (branchFilter || undefined) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeFrom, rangeTo, branchFilter]);

  // ── فرم افزودن شیفت ──
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState<string>('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('16:00');
  const [crossesMidnight, setCrossesMidnight] = useState(false);
  const [breakMinutes, setBreakMinutes] = useState('0');
  const [breakPolicy, setBreakPolicy] = useState<'paid' | 'unpaid' | 'none'>('unpaid');
  const [note, setNote] = useState('');

  function openAdd() {
    setSelectedEmployeeIds([]);
    setSelectedDates([anchorIso]);
    setTemplateId('');
    setStartTime('08:00'); setEndTime('16:00'); setCrossesMidnight(false);
    setBreakMinutes('0'); setBreakPolicy('unpaid'); setNote('');
    setConflicts([]);
    setShowAdd(true);
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = shiftTemplates.find(x => x.id === id);
    if (t) {
      setStartTime(t.startTime); setEndTime(t.endTime); setCrossesMidnight(t.crossesMidnight);
      setBreakMinutes(String(t.defaultBreakMinutes)); setBreakPolicy(t.breakPolicy);
    }
  }

  function applyQuickDuration(hours: number) {
    const [h, m] = startTime.split(':').map(Number);
    let endH = (h ?? 0) + hours;
    const cross = endH >= 24;
    endH = endH % 24;
    setEndTime(`${String(endH).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`);
    setCrossesMidnight(cross);
    setTemplateId('');
  }

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin' && user.role !== 'BranchUser') {
    return <div className="p-6"><Card><CardBody><Empty title="دسترسی به این بخش مجاز نیست" icon={ShieldX} /></CardBody></Card></div>;
  }

  const branchEmployees = employees.filter(e => e.isActive && (!branchFilter || e.branchId === branchFilter));

  async function handleSubmit() {
    if (!timeRe.test(startTime) || !timeRe.test(endTime)) { showToast('فرمت ساعت نامعتبر است', 'danger'); return; }
    if (selectedEmployeeIds.length === 0) { showToast('حداقل یک کارمند انتخاب کنید', 'danger'); return; }
    if (selectedDates.length === 0) { showToast('حداقل یک روز انتخاب کنید', 'danger'); return; }
    setBusy(true);
    const result = await createShiftAssignments({
      employeeIds: selectedEmployeeIds,
      workDates: selectedDates,
      branchId: isBranchUser ? undefined : (branchFilter || null),
      shiftTemplateId: templateId || null,
      startTime, endTime, crossesMidnight,
      breakMinutes: parseInt(breakMinutes, 10) || 0,
      breakPolicy, note: note || null,
    });
    setBusy(false);
    if (!result) { showToast('خطا در ثبت شیفت', 'danger'); return; }
    if (result.conflicts.length > 0) {
      setConflicts(result.conflicts);
      showToast(`${result.created.length} شیفت ثبت شد — ${result.conflicts.length} مورد هم‌پوشان بود`);
    } else {
      showToast(`${result.created.length} شیفت ثبت شد`, 'success');
      setShowAdd(false);
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('این شیفت لغو شود؟')) return;
    const ok = await cancelShiftAssignment(id);
    showToast(ok ? 'لغو شد' : 'خطا در لغو (شاید حضور آن قفل شده)', ok ? 'success' : 'danger');
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">برنامه شیفت</h1>
            <div className="text-[12px] text-stone-500 mt-1">تخصیص شیفت روزانه به پرسنل — جدا از ثبت حضور واقعی</div>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={openAdd}>افزودن شیفت</Button>
        </div>

        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-3">
              <Toggle value={viewMode} onChange={setViewMode} aria-label="نمای روزانه/هفتگی"
                options={[{ value: 'day', label: 'روزانه' }, { value: 'week', label: 'هفتگی' }]} />
              <div className="flex items-center gap-1">
                <button className="p-1.5 text-muted hover:text-stone-700" onClick={() => setAnchorJalali(isoToJalaliShort(addDaysIso(anchorIso, viewMode === 'week' ? -7 : -1)))}>
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
                <JalaliDatePicker value={anchorJalali} onChange={setAnchorJalali} />
                <button className="p-1.5 text-muted hover:text-stone-700" onClick={() => setAnchorJalali(isoToJalaliShort(addDaysIso(anchorIso, viewMode === 'week' ? 7 : 1)))}>
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
              </div>
              {!isBranchUser && (
                <Select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="max-w-[180px]">
                  <option value="">— همه شعبه‌ها —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              )}
            </div>
          </CardBody>
        </Card>

        {visibleDates.map(dateIso => {
          const dayAssignments = assignments.filter(a => a.workDate === dateIso && a.status !== 'cancelled');
          return (
            <Card key={dateIso}>
              <CardBody>
                <div className="text-[12.5px] font-medium text-stone-700 mb-2">{isoToJalaliShort(dateIso)}</div>
                {dayAssignments.length === 0 ? (
                  <div className="text-[11.5px] text-muted py-2">شیفتی ثبت نشده</div>
                ) : (
                  <div className="space-y-1.5">
                    {dayAssignments.map(a => (
                      <div key={a.id} className="flex items-center gap-3 bg-stone-50 rounded-lg p-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-stone-800">{a.employeeName ?? '—'}</div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap mt-0.5">
                            <span dir="ltr">{a.plannedStartTime}–{a.plannedEndTime}</span>
                            <span>{Math.floor(a.plannedMinutes / 60)} ساعت{a.plannedMinutes % 60 ? ` و ${a.plannedMinutes % 60} دقیقه` : ''}</span>
                            {a.crossesMidnight && <Chip tone="neutral">عبور از نیمه‌شب</Chip>}
                          </div>
                        </div>
                        <Chip tone={a.status === 'completed' ? 'green' : 'neutral'}>
                          {a.status === 'completed' ? 'انجام‌شده' : 'برنامه‌ریزی‌شده'}
                        </Chip>
                        <button onClick={() => handleCancel(a.id)} className="text-muted hover:text-rose-600 p-1">
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium text-stone-900 mb-4 flex items-center gap-2">
              <CalendarDays size={16} strokeWidth={1.5} /> افزودن / کپی شیفت
            </h2>

            {conflicts.length > 0 && (
              <InlineNotice tone="warning" title="برخی موارد هم‌پوشان بودند و ثبت نشدند">
                {conflicts.length} مورد رد شد (کارمند/روزی که شیفت هم‌پوشان داشت).
              </InlineNotice>
            )}

            <div className="space-y-3 mt-3">
              <Field label="کارمندان (چندتایی)">
                <div className="border border-stone-200 rounded-lg max-h-36 overflow-y-auto p-2 space-y-1">
                  {branchEmployees.map(e => (
                    <label key={e.id} className="flex items-center gap-2 text-[12.5px] text-stone-700 py-0.5">
                      <input type="checkbox" checked={selectedEmployeeIds.includes(e.id)}
                        onChange={ev => setSelectedEmployeeIds(prev => ev.target.checked ? [...prev, e.id] : prev.filter(id => id !== e.id))} />
                      {e.fullName}
                    </label>
                  ))}
                  {branchEmployees.length === 0 && <div className="text-[11px] text-muted">کارمندی نیست</div>}
                </div>
              </Field>

              <Field label="روزها (کپی به چند روز)">
                <div className="flex flex-wrap gap-1.5">
                  {visibleDates.map(d => (
                    <label key={d} className={`px-2.5 py-1 rounded-full border text-[11px] cursor-pointer ${selectedDates.includes(d) ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}>
                      <input type="checkbox" className="hidden" checked={selectedDates.includes(d)}
                        onChange={ev => setSelectedDates(prev => ev.target.checked ? [...prev, d] : prev.filter(x => x !== d))} />
                      {isoToJalaliShort(d).split('/').slice(1).join('/')}
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="قالب شیفت (اختیاری)">
                <div className="flex flex-wrap gap-1.5">
                  {shiftTemplates.map(t => (
                    <button key={t.id} type="button" onClick={() => applyTemplate(t.id)}
                      className={`px-2.5 py-1 rounded-full border text-[11px] ${templateId === t.id ? 'bg-accent text-white border-accent' : 'border-stone-200 text-stone-600'}`}>
                      {t.name} ({Math.round(t.plannedMinutes / 60)}س)
                    </button>
                  ))}
                  <button type="button" onClick={() => setTemplateId('')}
                    className={`px-2.5 py-1 rounded-full border text-[11px] ${templateId === '' ? 'bg-accent text-white border-accent' : 'border-stone-200 text-stone-600'}`}>
                    سفارشی
                  </button>
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="ساعت شروع">
                  <Input value={startTime} dir="ltr" onChange={e => { setStartTime(e.target.value); setTemplateId(''); }} placeholder="08:00" />
                </Field>
                <Field label="ساعت پایان">
                  <Input value={endTime} dir="ltr" onChange={e => { setEndTime(e.target.value); setTemplateId(''); }} placeholder="16:00" />
                </Field>
              </div>
              <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={() => applyQuickDuration(6)}>۶ ساعت</Button>
                <Button variant="default" size="sm" onClick={() => applyQuickDuration(8)}>۸ ساعت</Button>
                <label className="flex items-center gap-1.5 text-[11.5px] text-stone-600 mr-2">
                  <input type="checkbox" checked={crossesMidnight} onChange={e => setCrossesMidnight(e.target.checked)} />
                  عبور از نیمه‌شب
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="استراحت (دقیقه)">
                  <Input value={breakMinutes} dir="ltr" onChange={e => setBreakMinutes(e.target.value.replace(/\D/g, ''))} />
                </Field>
                <Field label="سیاست استراحت">
                  <Select value={breakPolicy} onChange={e => setBreakPolicy(e.target.value as any)}>
                    <option value="unpaid">بدون حقوق</option>
                    <option value="paid">با حقوق</option>
                    <option value="none">بدون کسر</option>
                  </Select>
                </Field>
              </div>
              <Field label="یادداشت (اختیاری)">
                <Input value={note} onChange={e => setNote(e.target.value)} />
              </Field>
            </div>

            <div className="flex gap-2 mt-5">
              <Button variant="primary" onClick={handleSubmit} loading={busy} icon={Copy}>ثبت شیفت</Button>
              <Button variant="default" onClick={() => setShowAdd(false)}>لغو</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
