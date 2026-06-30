'use client';

import { useEffect, useState } from 'react';
import { Calculator, Plus, ShieldX, Check, Calculator as CalcIcon, Send, ChevronDown, Loader2, Wallet, Trash2, RotateCcw } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select, Empty, Chip } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';
import type { Payslip } from '@/store/slices/payrollSlice';

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  draft: { label: 'پیش‌نویس', tone: 'neutral' },
  calculated: { label: 'محاسبه‌شده', tone: 'warning' },
  approved: { label: 'تأییدشده', tone: 'info' },
  posted: { label: 'ثبت در حسابداری', tone: 'success' },
};

const JALALI_MONTHS = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
function periodLabel(p: string): string {
  const [y, m] = p.split('-');
  const mi = parseInt(m || '0', 10) - 1;
  return mi >= 0 && mi < 12 ? `${JALALI_MONTHS[mi]} ${y}` : p;
}

export default function PayrollPage() {
  const user = useAppStore(s => s.user);
  const runs = useAppStore(s => s.payrollRuns);
  const branches = useAppStore(s => s.branches);
  const accounts = useAppStore(s => s.accounts);
  const loadRuns = useAppStore(s => s.loadPayrollRuns);
  const loadAccounts = useAppStore(s => s.loadAccounts);
  const createRun = useAppStore(s => s.createPayrollRun);
  const calculateRun = useAppStore(s => s.calculateRun);
  const approveRun = useAppStore(s => s.approveRun);
  const postRun = useAppStore(s => s.postRun);
  const getRunDetail = useAppStore(s => s.getRunDetail);
  const employees = useAppStore(s => s.employees);
  const loadEmployees = useAppStore(s => s.loadEmployees);
  const payrollEvents = useAppStore(s => s.payrollEvents);
  const loadEvents = useAppStore(s => s.loadEvents);
  const createEvent = useAppStore(s => s.createEvent);
  const voidEvent = useAppStore(s => s.voidEvent);
  const reverseRun = useAppStore(s => s.reverseRun);
  const forceResetRun = useAppStore(s => s.forceResetRun);
  const deleteRun = useAppStore(s => s.deleteRun);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [period, setPeriod] = useState('');
  const [branchId, setBranchId] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Payslip[]>>({});

  // فرم رویداد
  const [evEmployee, setEvEmployee] = useState('');
  const [evType, setEvType] = useState<'advance' | 'bonus' | 'deduction'>('advance');
  const [evAmount, setEvAmount] = useState('');
  const [evPeriod, setEvPeriod] = useState('');
  const [evDesc, setEvDesc] = useState('');

  // override بیمه/مالیات
  const [overrideRun, setOverrideRun] = useState<string | null>(null);
  const [noJvRunId, setNoJvRunId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, { insuranceEmployee: string; incomeTax: string }>>({});

  async function openOverride(runId: string) {
    const d = await getRunDetail(runId);
    if (!d) return;
    const init: Record<string, { insuranceEmployee: string; incomeTax: string }> = {};
    for (const s of d.payslips) {
      init[s.employeeId] = {
        insuranceEmployee: String(s.insuranceEmployee),
        incomeTax: String(s.incomeTax),
      };
    }
    setOverrides(init);
    setDetails(prev => ({ ...prev, [runId]: d.payslips }));
    setOverrideRun(runId);
  }

  async function applyOverride() {
    if (!overrideRun) return;
    setBusy(overrideRun);
    const ov: Record<string, { insuranceEmployee?: number; incomeTax?: number }> = {};
    for (const [empId, v] of Object.entries(overrides)) {
      ov[empId] = {
        insuranceEmployee: parseInt(v.insuranceEmployee.replace(/\D/g, ''), 10) || 0,
        incomeTax: parseInt(v.incomeTax.replace(/\D/g, ''), 10) || 0,
      };
    }
    const ok = await calculateRun(overrideRun, 30, ov);
    setBusy(null);
    if (ok) {
      showToast('کسورات به‌روز شد', 'success');
      await openDetail(overrideRun, true);
      setOverrideRun(null);
    } else showToast('خطا', 'danger');
  }

  useEffect(() => {
    setHydrated(true);
    loadRuns(); loadAccounts(); loadEmployees(); loadEvents();
  }, [loadRuns, loadAccounts, loadEmployees, loadEvents]);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return <div className="p-6"><Card><CardBody><Empty title="فقط مدیر کل به این بخش دسترسی دارد" icon={ShieldX} /></CardBody></Card></div>;
  }

  async function handleCreate() {
    if (!/^\d{4}-\d{2}$/.test(period)) { showToast('فرمت دوره: ۱۴۰۵-۰۳', 'danger'); return; }
    setBusy('create');
    const branch = branches.find(b => b.id === branchId);
    const run = await createRun({ periodYearMonth: period, branchId: branchId || null, branchName: branch?.name ?? null });
    setBusy(null);
    if (run) { showToast('اجرا ساخته شد', 'success'); setShowAdd(false); setPeriod(''); setBranchId(''); }
    else showToast('خطا — شاید پارامتر آن سال تعریف نشده یا اجرای تکراری است', 'danger');
  }

  async function handleCalculate(id: string) {
    setBusy(id);
    const ok = await calculateRun(id, 30);
    setBusy(null);
    if (ok) { showToast('فیش‌ها محاسبه شد', 'success'); await openDetail(id, true); }
    else showToast('خطا در محاسبه — شاید پرسنل فعالی نیست', 'danger');
  }

  async function handleApprove(id: string) {
    setBusy(id);
    const ok = await approveRun(id);
    setBusy(null);
    showToast(ok ? 'تأیید شد' : 'خطا در تأیید', ok ? 'success' : 'danger');
  }

  async function handleReverse(id: string) {
    if (!confirm('این عملیات ثبت حقوق را برمی‌گرداند و تراکنش هزینه‌ی مرتبط حذف می‌شود. ادامه می‌دهید؟')) return;
    setBusy(id);
    const result = await reverseRun(id);
    setBusy(null);
    if (result.ok) {
      showToast('ثبت برگشت داده شد', 'success');
    } else if (result.code === 'NO_JOURNAL_VOUCHER') {
      setNoJvRunId(id);
    } else {
      showToast('خطا در برگشت ثبت', 'danger');
    }
  }

  async function handleForceReset(id: string) {
    setNoJvRunId(null);
    setBusy(id);
    const ok = await forceResetRun(id);
    setBusy(null);
    showToast(ok ? 'دوره به تأییدشده بازنشانی شد' : 'خطا در بازنشانی', ok ? 'success' : 'danger');
  }

  async function handleDeleteRun(id: string) {
    if (!confirm('این اجرای پیش‌نویس کامل حذف شود؟')) return;
    setBusy(id);
    const ok = await deleteRun(id);
    setBusy(null);
    if (!ok) showToast('خطا در حذف', 'danger');
  }

  async function handlePost(id: string) {
    const activeAccounts = accounts.filter(a => a.isActive);
    if (activeAccounts.length === 0) { showToast('هیچ صندوقی فعال نیست', 'danger'); return; }
    const acc = activeAccounts[0];
    if (!acc) { showToast('هیچ صندوقی فعال نیست', 'danger'); return; }
    if (!confirm(`ثبت حقوق در حسابداری از صندوق «${acc.name}»؟ یک تراکنش هزینه ساخته می‌شود.`)) return;
    setBusy(id);
    const today = new Date().toLocaleDateString('fa-IR-u-nu-latn').replace(/\//g, '/');
    const ok = await postRun(id, acc.id, today);
    setBusy(null);
    showToast(ok ? 'در حسابداری ثبت شد' : 'خطا در ثبت', ok ? 'success' : 'danger');
  }

  async function openDetail(id: string, force = false) {
    if (expanded === id && !force) { setExpanded(null); return; }
    setExpanded(id);
    const d = await getRunDetail(id);
    if (d) setDetails(prev => ({ ...prev, [id]: d.payslips }));
  }

  async function handleCreateEvent() {
    if (!evEmployee) { showToast('کارمند را انتخاب کنید', 'danger'); return; }
    if (!/^\d{4}-\d{2}$/.test(evPeriod)) { showToast('فرمت دوره: ۱۴۰۵-۰۳', 'danger'); return; }
    const amount = parseInt(evAmount.replace(/\D/g, ''), 10);
    if (!amount || amount < 1) { showToast('مبلغ نامعتبر', 'danger'); return; }
    setBusy('event');
    const ok = await createEvent({ employeeId: evEmployee, type: evType, amount, periodYearMonth: evPeriod, description: evDesc || null });
    setBusy(null);
    if (ok) {
      showToast('ثبت شد', 'success');
      setShowEvent(false); setEvEmployee(''); setEvAmount(''); setEvPeriod(''); setEvDesc('');
      loadEvents();
    } else showToast('خطا در ثبت', 'danger');
  }

  async function handleVoidEvent(id: string) {
    if (!confirm('این رویداد حذف شود؟')) return;
    const ok = await voidEvent(id);
    showToast(ok ? 'حذف شد' : 'خطا', ok ? 'success' : 'danger');
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">حقوق و دستمزد</h1>
            <div className="text-[12px] text-stone-500 mt-1">اجرای حقوق، محاسبه فیش، و ثبت در حسابداری</div>
          </div>
          <div className="flex gap-2">
            <Button variant="default" size="sm" icon={Wallet} onClick={() => setShowEvent(true)}>مساعده/پاداش</Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>اجرای جدید</Button>
          </div>
        </div>

        {runs.length === 0 ? (
          <Card><CardBody><Empty title="هنوز اجرایی ساخته نشده" icon={Calculator} /></CardBody></Card>
        ) : (
          <div className="space-y-2">
            {runs.map(run => {
              const st = STATUS_LABELS[run.status] ?? STATUS_LABELS.draft!;
              const slips = details[run.id] ?? [];
              const isOpen = expanded === run.id;
              const isBusy = busy === run.id;
              return (
                <div key={run.id} className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                  <div className="p-3 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13.5px] font-medium text-stone-900">دوره {periodLabel(run.periodYearMonth)}</span>
                        <Chip tone={st.tone as any}>{st.label}</Chip>
                        {run.branchName && <span className="text-[10.5px] text-muted">{run.branchName}</span>}
                      </div>
                    </div>
                    {isBusy && <Loader2 size={15} className="animate-spin text-muted" />}
                    {/* اکشن‌ها بر اساس وضعیت */}
                    {!isBusy && run.status === 'draft' && (
                      <>
                        <Button variant="default" size="sm" icon={CalcIcon} onClick={() => handleCalculate(run.id)}>محاسبه</Button>
                        <button onClick={() => handleDeleteRun(run.id)} title="حذف اجرای پیش‌نویس"
                          className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-600 rounded-lg">
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                    {!isBusy && run.status === 'calculated' && (
                      <>
                        <Button variant="default" size="sm" icon={CalcIcon} onClick={() => handleCalculate(run.id)}>محاسبه مجدد</Button>
                        <Button variant="default" size="sm" icon={Wallet} onClick={() => openOverride(run.id)}>ویرایش کسورات</Button>
                        <Button variant="primary" size="sm" icon={Check} onClick={() => handleApprove(run.id)}>تأیید</Button>
                      </>
                    )}
                    {!isBusy && run.status === 'approved' && (
                      <Button variant="primary" size="sm" icon={Send} onClick={() => handlePost(run.id)}>ثبت در حسابداری</Button>
                    )}
                    {!isBusy && run.status === 'posted' && (
                      <button onClick={() => handleReverse(run.id)} title="بازگشت به حالت تأییدشده"
                        className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-stone-200 text-[12px] text-stone-500 hover:text-rose-600 hover:border-rose-200">
                        <RotateCcw size={13} strokeWidth={1.5} />
                        <span>برگشت ثبت</span>
                      </button>
                    )}
                    <button onClick={() => openDetail(run.id)} className="text-muted p-1">
                      <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />
                    </button>
                  </div>
                  {isOpen && (
                    <div className="border-t border-stone-100 bg-stone-50/50 p-3">
                      {slips.length === 0 ? (
                        <div className="text-[12px] text-muted text-center py-3">فیشی نیست (اول محاسبه کنید)</div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-4 gap-2 text-[10px] text-muted px-2">
                            <span>کارمند</span><span className="text-left">ناخالص</span>
                            <span className="text-left">کسورات</span><span className="text-left">خالص</span>
                          </div>
                          {slips.map(s => (
                            <div key={s.id} className="bg-white rounded border border-stone-100">
                              <div className="grid grid-cols-4 gap-2 text-[12px] p-2">
                                <span className="text-stone-800 truncate">{s.employeeName}</span>
                                <span className="text-left tabular-nums text-stone-600 whitespace-nowrap">{fmt(s.grossEarnings)}</span>
                                <span className="text-left tabular-nums text-rose-600 whitespace-nowrap">{fmt(s.totalDeductions)}</span>
                                <span className="text-left tabular-nums font-medium text-stone-900 whitespace-nowrap">{fmt(s.netPay)}</span>
                              </div>
                              {s.deductionLines && s.deductionLines.length > 0 && (
                                <div className="border-t border-stone-50 px-2 py-1.5 space-y-1">
                                  <div className="text-[9.5px] text-muted">تفکیک کسورات:</div>
                                  {s.deductionLines.map((d, i) => (
                                    <div key={i} className="flex justify-between text-[10.5px] text-stone-500">
                                      <span>{d.label}</span>
                                      <span className="tabular-nums">{fmt(d.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="grid grid-cols-4 gap-2 text-[12px] px-2 pt-1 font-medium">
                            <span className="text-stone-500">جمع</span>
                            <span className="text-left tabular-nums">{fmt(slips.reduce((a, s) => a + s.grossEarnings, 0))}</span>
                            <span className="text-left tabular-nums text-rose-600">{fmt(slips.reduce((a, s) => a + s.totalDeductions, 0))}</span>
                            <span className="text-left tabular-nums text-emerald-700">{fmt(slips.reduce((a, s) => a + s.netPay, 0))}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium text-stone-900 mb-4">اجرای حقوق جدید</h2>
            <div className="space-y-3">
              <Field label="دوره (سال و ماه شمسی)">
                <div className="grid grid-cols-2 gap-2">
                  <Select value={period.split('-')[0] || ''} onChange={e => setPeriod(`${e.target.value}-${period.split('-')[1] || '01'}`)}>
                    <option value="">سال</option>
                    {['1404', '1405', '1406'].map(y => <option key={y} value={y}>{y}</option>)}
                  </Select>
                  <Select value={period.split('-')[1] || ''} onChange={e => setPeriod(`${period.split('-')[0] || '1405'}-${e.target.value}`)}>
                    <option value="">ماه</option>
                    {['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((m, i) => (
                      <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                    ))}
                  </Select>
                </div>
              </Field>
              <Field label="شعبه">
                <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
                  <option value="">— همه پرسنل —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="primary" onClick={handleCreate} loading={busy === 'create'} icon={Plus}>ساخت</Button>
              <Button variant="default" onClick={() => setShowAdd(false)}>لغو</Button>
            </div>
          </div>
        </div>
      )}
      {overrideRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOverrideRun(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium text-stone-900 mb-1">ویرایش دستی بیمه و مالیات</h2>
            <p className="text-[11.5px] text-stone-500 mb-4">مقادیر خودکار محاسبه شده‌اند؛ می‌توانید هر کدام را دستی تغییر دهید.</p>
            <div className="space-y-3">
              {(details[overrideRun] ?? []).map(s => (
                <div key={s.employeeId} className="border border-stone-100 rounded-lg p-3">
                  <div className="text-[12.5px] font-medium text-stone-800 mb-2">{s.employeeName}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="بیمه سهم کارگر">
                      <Input value={overrides[s.employeeId]?.insuranceEmployee ?? ''} dir="ltr"
                        onChange={e => {
                          const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                          setOverrides(prev => ({ ...prev, [s.employeeId]: { ...prev[s.employeeId]!, insuranceEmployee: n ? n.toLocaleString('en-US') : '' } }));
                        }} />
                    </Field>
                    <Field label="مالیات">
                      <Input value={overrides[s.employeeId]?.incomeTax ?? ''} dir="ltr"
                        onChange={e => {
                          const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                          setOverrides(prev => ({ ...prev, [s.employeeId]: { ...prev[s.employeeId]!, incomeTax: n ? n.toLocaleString('en-US') : '' } }));
                        }} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <Button variant="primary" onClick={applyOverride} loading={busy === overrideRun} icon={Check}>اعمال و محاسبه مجدد</Button>
              <Button variant="default" onClick={() => setOverrideRun(null)}>لغو</Button>
            </div>
          </div>
        </div>
      )}

      {/* دیالوگ بازنشانی اجباری — وقتی دوره سند مالی ندارد */}
      {noJvRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setNoJvRunId(null)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="text-[15px] font-medium text-stone-900 mb-2">این دوره سند حسابداری ندارد</div>
            <p className="text-[12.5px] text-stone-600 mb-1">
              این دوره هنگام ثبت در حسابداری، سند مالی واقعی دریافت نکرده است.
            </p>
            <p className="text-[12px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-4">
              ⚠️ «بازنشانی اجباری» فقط وضعیت را به «تأییدشده» برمی‌گرداند. مانده‌ی هیچ حسابی تغییر نمی‌کند.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleForceReset(noJvRunId)}
                className="flex-1 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[13px] font-medium transition-colors"
              >
                بازنشانی اجباری
              </button>
              <button
                onClick={() => setNoJvRunId(null)}
                className="h-9 px-4 rounded-lg border border-stone-200 text-[13px] text-stone-600 hover:bg-stone-50 transition-colors"
              >
                لغو
              </button>
            </div>
          </div>
        </div>
      )}

      {showEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowEvent(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium text-stone-900 mb-4">ثبت مساعده / پاداش / کسری</h2>
            <div className="space-y-3">
              <Field label="کارمند">
                <Select value={evEmployee} onChange={e => setEvEmployee(e.target.value)}>
                  <option value="">— انتخاب —</option>
                  {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.fullName}</option>)}
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="نوع">
                  <Select value={evType} onChange={e => setEvType(e.target.value as any)}>
                    <option value="advance">مساعده</option>
                    <option value="bonus">پاداش</option>
                    <option value="deduction">کسری</option>
                  </Select>
                </Field>
                <Field label="دوره">
                  <div className="grid grid-cols-2 gap-1.5">
                    <Select value={evPeriod.split('-')[0] || ''} onChange={e => setEvPeriod(`${e.target.value}-${evPeriod.split('-')[1] || '01'}`)}>
                      <option value="">سال</option>
                      {['1404', '1405', '1406'].map(y => <option key={y} value={y}>{y}</option>)}
                    </Select>
                    <Select value={evPeriod.split('-')[1] || ''} onChange={e => setEvPeriod(`${evPeriod.split('-')[0] || '1405'}-${e.target.value}`)}>
                      <option value="">ماه</option>
                      {['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'].map((m, i) => (
                        <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
                      ))}
                    </Select>
                  </div>
                </Field>
              </div>
              <Field label="مبلغ (تومان)">
                <Input value={evAmount} onChange={e => {
                  const n = parseInt(e.target.value.replace(/[^\d]/g, ''), 10) || 0;
                  setEvAmount(n ? n.toLocaleString('en-US') : '');
                }} placeholder="مثلاً: 2,000,000" dir="ltr" />
              </Field>
              <Field label="توضیح (اختیاری)">
                <Input value={evDesc} onChange={e => setEvDesc(e.target.value)} placeholder="..." />
              </Field>
            </div>

            {/* رویدادهای ثبت‌شده */}
            {payrollEvents.length > 0 && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <div className="text-[11px] text-stone-500 mb-2">رویدادهای ثبت‌شده</div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {payrollEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-2 text-[11.5px] bg-stone-50 rounded p-2">
                      <span className="flex-1 text-stone-700">{ev.employeeName} · {ev.typeLabel}</span>
                      <span className="text-stone-500">{ev.periodYearMonth}</span>
                      <span className="tabular-nums text-stone-800 whitespace-nowrap flex-shrink-0">{fmt(ev.amount)}</span>
                      <button onClick={() => handleVoidEvent(ev.id)} className="text-muted hover:text-rose-600">
                        <Trash2 size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <Button variant="primary" onClick={handleCreateEvent} loading={busy === 'event'} icon={Plus}>ثبت</Button>
              <Button variant="default" onClick={() => setShowEvent(false)}>بستن</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
