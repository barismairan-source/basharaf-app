'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { CalendarClock, Plus, Trash2, Table2, X, Pencil, Check, Settings2, Download, Phone, LayoutGrid, Ban } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  Empty,
  Chip,
  JalaliDatePicker,
  Switch,
  Textarea,
  useConfirm,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';
import { jalaliWeekday } from '@/lib/reservations/capacity';
import type { ReservationStatus, ReservationSettingsDTO } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  confirmed: 'تأییدشده',
  seated: 'حاضر شد',
  cancelled: 'لغو',
  no_show: 'عدم حضور',
};

const STATUS_TONE: Record<string, 'neutral' | 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  confirmed: 'neutral',
  seated: 'green',
  cancelled: 'red',
  no_show: 'red',
};

const NEXT_STATES: Record<string, ReservationStatus[]> = {
  pending: ['confirmed', 'seated', 'cancelled', 'no_show'],
  confirmed: ['seated', 'cancelled', 'no_show'],
  seated: [],
  cancelled: [],
  no_show: [],
};

const WEEKDAY_LABELS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

function toLatin(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
function num(s: string): number {
  const n = Number(toLatin(s).trim());
  return Number.isFinite(n) ? n : 0;
}

export default function ReservationsPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const customers = useAppStore((s) => s.customers);
  const reservations = useAppStore((s) => s.reservations);
  const tables = useAppStore((s) => s.tables);
  const tableBlocks = useAppStore((s) => s.tableBlocks);
  const loadReservations = useAppStore((s) => s.loadReservations);
  const loadTables = useAppStore((s) => s.loadTables);
  const loadCustomers = useAppStore((s) => s.loadCustomers);
  const loadTableBlocks = useAppStore((s) => s.loadTableBlocks);
  const createTableBlock = useAppStore((s) => s.createTableBlock);
  const deleteTableBlock = useAppStore((s) => s.deleteTableBlock);
  const createReservation = useAppStore((s) => s.createReservation);
  const updateReservation = useAppStore((s) => s.updateReservation);
  const setReservationStatus = useAppStore((s) => s.setReservationStatus);
  const deleteReservation = useAppStore((s) => s.deleteReservation);
  const createTable = useAppStore((s) => s.createTable);
  const deleteTable = useAppStore((s) => s.deleteTable);
  const showToast = useAppStore((s) => s.showToast);
  const reservationSettings = useAppStore((s) => s.reservationSettings);
  const loadReservationSettings = useAppStore((s) => s.loadReservationSettings);
  const saveReservationSettings = useAppStore((s) => s.saveReservationSettings);
  const confirm = useConfirm();

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showTables, setShowTables] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [settingsBranch, setSettingsBranch] = useState('');
  const [settingsForm, setSettingsForm] = useState<Omit<ReservationSettingsDTO, 'id' | 'branchId' | 'updatedAt'> | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ tableId: '', date: '', time: '', partySize: '', note: '' });
  const [editSaving, setEditSaving] = useState(false);

  // filters
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  // new reservation
  const [customerId, setCustomerId] = useState('');
  const [resBranch, setResBranch] = useState('');
  const [tableId, setTableId] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [note, setNote] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookerName, setBookerName] = useState('');
  const [saving, setSaving] = useState(false);

  // new table
  const [tName, setTName] = useState('');
  const [tCap, setTCap] = useState('');
  const [tArea, setTArea] = useState('');
  const [tBranch, setTBranch] = useState('');
  const [tSocial, setTSocial] = useState(false);

  // new block
  const [bTableId, setBTableId] = useState('');
  const [bDate, setBDate] = useState(getTodayJalali());
  const [bStart, setBStart] = useState('');
  const [bEnd, setBEnd] = useState('');
  const [bReason, setBReason] = useState('');
  const [bSaving, setBSaving] = useState(false);

  // grid
  const [gridDate, setGridDate] = useState(getTodayJalali());
  const [gridBranch, setGridBranch] = useState('');

  useEffect(() => {
    setHydrated(true);
    loadReservations();
    loadTables();
    loadCustomers();
    loadTableBlocks();
  }, [loadReservations, loadTables, loadCustomers, loadTableBlocks]);

  const isAdmin = user?.role === 'SuperAdmin';

  // شعبه‌ی فعال تنظیمات: BranchUser همیشه شعبه‌ی خودش؛ SuperAdmin با Select انتخاب می‌کند.
  const activeSettingsBranch = isAdmin ? settingsBranch : (user?.assignedBranch ?? '');
  const activeGridBranch = isAdmin ? gridBranch : (user?.assignedBranch ?? '');

  useEffect(() => {
    if (!showSettings || !activeSettingsBranch) return;
    loadReservationSettings(activeSettingsBranch);
  }, [showSettings, activeSettingsBranch, loadReservationSettings]);

  useEffect(() => {
    if (!reservationSettings) return;
    const { id: _id, branchId: _branchId, updatedAt: _updatedAt, ...rest } = reservationSettings;
    setSettingsForm(rest);
  }, [reservationSettings]);

  async function handleSaveSettings() {
    if (!settingsForm || !activeSettingsBranch) return;
    setSettingsSaving(true);
    const ok = await saveReservationSettings(isAdmin ? activeSettingsBranch : null, settingsForm);
    setSettingsSaving(false);
    showToast(ok ? 'تنظیمات ذخیره شد' : 'خطا در ذخیره‌ی تنظیمات', ok ? 'success' : 'danger');
  }

  function toggleClosedWeekday(day: number) {
    setSettingsForm((f) => {
      if (!f) return f;
      const has = f.closedWeekdays.includes(day);
      return { ...f, closedWeekdays: has ? f.closedWeekdays.filter((d) => d !== day) : [...f.closedWeekdays, day].sort() };
    });
  }

  function handleExportExcel() {
    const rows = filtered.map((r) => ({
      کد: r.trackingCode ?? '—',
      نام: r.customerId ? (customers.find((c) => c.id === r.customerId)?.name ?? '') : (r.guestName ?? 'مهمان'),
      رزروکننده: r.bookerName ?? '',
      موبایل: r.guestPhone ?? (r.customerId ? (customers.find((c) => c.id === r.customerId)?.phone ?? '') : ''),
      منبع: r.source === 'public' ? 'آنلاین' : 'داخلی',
      شعبه: branches.find((b) => b.id === r.branchId)?.name ?? '',
      میز: r.tableId ? (tables.find((t) => t.id === r.tableId)?.name ?? '') : '',
      تاریخ: r.date,
      ساعت: r.time,
      نفرات: r.partySize,
      وضعیت: STATUS_LABELS[r.status] ?? r.status,
      یادداشت: r.note ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'reservations');
    XLSX.writeFile(wb, `reservations-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const filtered = useMemo(() => {
    return reservations.filter((r) => {
      if (dateFilter && r.date !== dateFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (isAdmin && branchFilter && r.branchId !== branchFilter) return false;
      return true;
    });
  }, [reservations, dateFilter, statusFilter, branchFilter, isAdmin]);

  if (!hydrated || !user) return null;

  const customerName = (id: string | null) =>
    id ? (customers.find((c) => c.id === id)?.name ?? 'مشتری') : 'مهمان';
  const reservationName = (r: typeof filtered[number]) =>
    r.customerId ? customerName(r.customerId) : (r.bookerName ? `${r.bookerName} (برای ${r.guestName ?? 'مهمان'})` : (r.guestName ?? 'مهمان'));
  const tableName = (id: string | null) =>
    id ? (tables.find((t) => t.id === id)?.name ?? '—') : '—';
  const branchName = (id: string | null) =>
    id ? (branches.find((b) => b.id === id)?.name ?? '—') : '—';

  // میزهای قابل انتخاب در فرم رزرو (هم‌شعبه)
  const formBranch = isAdmin ? resBranch : (user.assignedBranch ?? '');
  const selectableTables = tables.filter((t) => !formBranch || t.branchId === formBranch);

  async function handleAdd() {
    if (!date || !time.trim()) {
      showToast('تاریخ و ساعت لازم است', 'danger');
      return;
    }
    if (!customerId && !guestName.trim()) {
      showToast('نام مهمان لازم است (یا یک مشتری انتخاب کنید)', 'danger');
      return;
    }
    setSaving(true);
    const r = await createReservation({
      customerId: customerId || null,
      branchId: isAdmin ? resBranch || null : null,
      tableId: tableId || null,
      date,
      time: time.trim(),
      partySize: partySize ? num(partySize) : 1,
      note: note.trim() || null,
      guestName: customerId ? null : (guestName.trim() || null),
      guestPhone: customerId ? null : (guestPhone.trim() || null),
      bookerName: bookerName.trim() || null,
    });
    setSaving(false);
    if (r && 'id' in r) {
      showToast('رزرو ثبت شد', 'success');
      setShowAdd(false);
      setCustomerId('');
      setTableId('');
      setTime('');
      setNote('');
      setGuestName('');
      setGuestPhone('');
      setBookerName('');
    } else {
      showToast((r && 'error' in r && r.error) || 'خطا در ثبت رزرو', 'danger');
    }
  }

  function startEdit(r: typeof filtered[number]) {
    setEditFields({
      tableId: r.tableId ?? '',
      date: r.date,
      time: r.time,
      partySize: String(r.partySize),
      note: r.note ?? '',
    });
    setEditingId(r.id);
  }

  async function handleEditSave(id: string) {
    setEditSaving(true);
    const res = await updateReservation(id, {
      tableId: editFields.tableId || null,
      date: editFields.date,
      time: editFields.time.trim(),
      partySize: editFields.partySize ? num(editFields.partySize) : 1,
      note: editFields.note.trim() || null,
    });
    setEditSaving(false);
    if (res.ok) { showToast('رزرو ویرایش شد', 'success'); setEditingId(null); }
    else showToast(res.error ?? 'خطا در ویرایش', 'danger');
  }

  async function changeStatus(id: string, status: ReservationStatus) {
    const ok = await setReservationStatus(id, status);
    if (!ok) showToast('تغییر وضعیت ناموفق بود', 'danger');
  }

  async function handleAddTable() {
    if (!tName.trim()) return;
    const t = await createTable({
      name: tName.trim(),
      capacity: tCap ? num(tCap) : 0,
      area: tArea.trim() || null,
      branchId: isAdmin ? tBranch || null : null,
      isSocial: tSocial,
    });
    if (t) {
      showToast('میز اضافه شد', 'success', t.name);
      setTName('');
      setTCap('');
      setTArea('');
      setTSocial(false);
    } else {
      showToast('خطا در ساخت میز (شعبه مشخص است؟)', 'danger');
    }
  }

  async function handleAddBlock() {
    if (!bTableId || !bDate) { showToast('میز و تاریخ لازم است', 'danger'); return; }
    setBSaving(true);
    const res = await createTableBlock({
      tableId: bTableId, date: bDate,
      startTime: bStart.trim() || null, endTime: bEnd.trim() || null,
      reason: bReason.trim() || null,
    });
    setBSaving(false);
    if (res.ok) {
      showToast('میز مسدود شد', 'success');
      setBStart(''); setBEnd(''); setBReason('');
    } else {
      showToast(res.error ?? 'این میز/بازه رزرو فعال دارد — تعارض برطرف نشد', 'danger');
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">رزرو میز</h1>
            <div className="text-[12px] text-stone-500 mt-1">رزروها و مدیریت میزها</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="default" size="sm" icon={Download} onClick={handleExportExcel} disabled={filtered.length === 0}>
              خروجی Excel
            </Button>
            <Button variant="default" size="sm" icon={LayoutGrid} onClick={() => setShowGrid((v) => !v)}>
              نمای روزانه
            </Button>
            <Button variant="default" size="sm" icon={Settings2} onClick={() => setShowSettings((v) => !v)}>
              تنظیمات رزرو آنلاین
            </Button>
            <Button variant="default" size="sm" icon={Table2} onClick={() => setShowTables((v) => !v)}>
              میزها
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
              رزرو جدید
            </Button>
          </div>
        </div>

        {/* Day grid — روزانه ساعت‌به‌ساعت و میزبه‌میز */}
        {showGrid && (
          <DayGrid
            branches={branches} isAdmin={isAdmin} userBranch={user.assignedBranch ?? ''}
            gridBranch={activeGridBranch} setGridBranch={setGridBranch}
            gridDate={gridDate} setGridDate={setGridDate}
            tables={tables} reservations={reservations} tableBlocks={tableBlocks}
            loadTableBlocks={loadTableBlocks} tableName={tableName} reservationName={reservationName}
          />
        )}

        {/* Public booking settings */}
        {showSettings && (
          <Card>
            <CardHeader title="تنظیمات رزرو آنلاین" sub="بازه‌ی فعالیت روزانه + روزهای تعطیل — تا closeHour تنظیم نشود، رزرو آنلاین آن شعبه فعال نیست" />
            <CardBody className="space-y-4">
              {isAdmin && (
                <Field label="شعبه">
                  <Select value={settingsBranch} onChange={(e) => setSettingsBranch(e.target.value)}>
                    <option value="">انتخاب شعبه…</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
              )}

              {activeSettingsBranch && settingsForm && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ساعت شروع فعالیت">
                      <Input dir="ltr" inputMode="numeric" value={String(settingsForm.openHour)} onChange={(e) => setSettingsForm((f) => f && { ...f, openHour: num(e.target.value) })} />
                    </Field>
                    <Field label="ساعت پایان فعالیت" hint="خالی = رزرو آنلاین غیرفعال">
                      <Input dir="ltr" inputMode="numeric" value={settingsForm.closeHour == null ? '' : String(settingsForm.closeHour)}
                        onChange={(e) => setSettingsForm((f) => f && { ...f, closeHour: e.target.value.trim() ? num(e.target.value) : null })} />
                    </Field>
                  </div>

                  <div>
                    <div className="text-[12px] text-stone-600 mb-2">روزهای تعطیل</div>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAY_LABELS.map((label, idx) => (
                        <button key={idx} type="button" onClick={() => toggleClosedWeekday(idx)}
                          className={cn('px-3 h-8 rounded-full text-[12px] border transition-colors',
                            settingsForm.closedWeekdays.includes(idx) ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-200 text-stone-600')}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="حداکثر نفرات هر رزرو">
                      <Input dir="ltr" inputMode="numeric" value={String(settingsForm.maxPartySize)} onChange={(e) => setSettingsForm((f) => f && { ...f, maxPartySize: num(e.target.value) })} />
                    </Field>
                    <Field label="سقف رزرو فعال هر موبایل">
                      <Input dir="ltr" inputMode="numeric" value={String(settingsForm.maxActiveReservationsPerPhone)} onChange={(e) => setSettingsForm((f) => f && { ...f, maxActiveReservationsPerPhone: num(e.target.value) })} />
                    </Field>
                  </div>

                  <Field label="متن وقتی رزرو بسته/تکمیل است" hint="مثلاً «رزرو این تاریخ تکمیل شد، لطفاً تماس بگیرید»">
                    <Textarea
                      rows={2}
                      value={settingsForm.closedMessage ?? ''}
                      onChange={(e) => setSettingsForm((f) => f && { ...f, closedMessage: e.target.value })}
                      placeholder="متن دلخواه شما..."
                    />
                  </Field>

                  <Field label="شماره تماس (وقتی بسته است نشان داده می‌شود)">
                    <Input
                      dir="ltr"
                      value={settingsForm.closedPhone ?? ''}
                      onChange={(e) => setSettingsForm((f) => f && { ...f, closedPhone: e.target.value })}
                      placeholder="021xxxxxxxx"
                    />
                  </Field>

                  <div className="flex justify-end">
                    <Button variant="primary" size="sm" icon={Check} loading={settingsSaving} onClick={handleSaveSettings}>
                      ذخیره‌ی تنظیمات
                    </Button>
                  </div>
                </>
              )}

              {isAdmin && !activeSettingsBranch && (
                <div className="text-[12px] text-muted text-center py-3">یک شعبه انتخاب کنید</div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Tables manager + blocking */}
        {showTables && (
          <Card>
            <CardHeader title="میزها" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input placeholder="نام میز" value={tName} onChange={(e) => setTName(e.target.value)} />
                <Input dir="ltr" inputMode="numeric" placeholder="ظرفیت" value={tCap} onChange={(e) => setTCap(e.target.value)} />
                <Input placeholder="منطقه (اختیاری)" value={tArea} onChange={(e) => setTArea(e.target.value)} />
                {isAdmin && (
                  <Select value={tBranch} onChange={(e) => setTBranch(e.target.value)}>
                    <option value="">شعبه…</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                )}
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px] text-stone-600">
                  <input type="checkbox" checked={tSocial} onChange={(e) => setTSocial(e.target.checked)} />
                  میز اشتراکی/سوشیال (چند رزرو جدا می‌توانند هم‌زمان روی آن بنشینند)
                </label>
                <Button variant="primary" size="sm" icon={Plus} onClick={handleAddTable}>
                  افزودن میز
                </Button>
              </div>
              {tables.length === 0 ? (
                <Empty title="میزی ثبت نشده" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tables.map((t) => (
                    <div key={t.id} className="inline-flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-1.5 text-[12px] text-stone-700">
                      <span>{t.name}</span>
                      <span className="text-[10px] text-muted tabular-nums">{fmt(t.capacity)} نفر</span>
                      {t.isSocial && <Chip tone="amber">سوشیال</Chip>}
                      {isAdmin && <span className="text-[10px] text-muted">{branchName(t.branchId)}</span>}
                      <button onClick={() => deleteTable(t.id)} className="text-muted hover:text-rose-600">
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-4">
                <div className="text-[13px] text-stone-800 mb-2 flex items-center gap-1.5"><Ban size={14} strokeWidth={1.5} /> مسدودکردن میز/بازه</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select value={bTableId} onChange={(e) => setBTableId(e.target.value)}>
                    <option value="">انتخاب میز…</option>
                    {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </Select>
                  <JalaliDatePicker value={bDate} onChange={setBDate} minDate={getTodayJalali()} />
                  <Input dir="ltr" placeholder="از ساعت (خالی = کل روز)" value={bStart} onChange={(e) => setBStart(e.target.value)} />
                  <Input dir="ltr" placeholder="تا ساعت (خالی = کل روز)" value={bEnd} onChange={(e) => setBEnd(e.target.value)} />
                  <div className="sm:col-span-2">
                    <Input placeholder="دلیل (اختیاری)" value={bReason} onChange={(e) => setBReason(e.target.value)} />
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button variant="default" size="sm" icon={Ban} loading={bSaving} onClick={handleAddBlock}>مسدود کن</Button>
                </div>

                {tableBlocks.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {tableBlocks.map((b) => (
                      <div key={b.id} className="flex items-center justify-between text-[11.5px] bg-stone-50 rounded-lg px-3 py-2">
                        <span>{tableName(b.tableId)} — {b.date} {b.startTime ? `${b.startTime}-${b.endTime ?? '?'}` : '(کل روز)'} {b.reason ? `· ${b.reason}` : ''}</span>
                        <button onClick={() => deleteTableBlock(b.id)} className="text-muted hover:text-rose-600"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Add reservation */}
        {showAdd && (
          <Card>
            <CardHeader title="رزرو جدید" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="مشتری (اختیاری)">
                  <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                    <option value="">مهمان</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                {isAdmin && (
                  <Field label="شعبه">
                    <Select value={resBranch} onChange={(e) => { setResBranch(e.target.value); setTableId(''); }}>
                      <option value="">انتخاب شعبه…</option>
                      {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                )}
                <Field label="میز (اختیاری — خالی = تخصیص خودکار)">
                  <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                    <option value="">تخصیص خودکار</option>
                    {selectableTables.map((t) => <option key={t.id} value={t.id}>{t.name} ({fmt(t.capacity)} نفر{t.isSocial ? ' — سوشیال' : ''})</option>)}
                  </Select>
                </Field>
              </div>

              {!customerId && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="نام رزروکننده (اختیاری)">
                    <Input value={bookerName} onChange={(e) => setBookerName(e.target.value)} placeholder="مثلاً صدرا" />
                  </Field>
                  <Field label="نام مهمان اصلی">
                    <Input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="مثلاً شهین" />
                  </Field>
                  <Field label="شماره تماس مهمان">
                    <Input dir="ltr" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="0912xxxxxxx" />
                  </Field>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="تاریخ">
                  <JalaliDatePicker value={date} onChange={setDate} minDate={getTodayJalali()} />
                </Field>
                <Field label="ساعت">
                  <Input dir="ltr" placeholder="۱۹:۳۰" value={time} onChange={(e) => setTime(e.target.value)} />
                </Field>
                <Field label="تعداد نفرات">
                  <Input dir="ltr" inputMode="numeric" value={partySize} onChange={(e) => setPartySize(e.target.value)} />
                </Field>
              </div>
              <Field label="یادداشت (اختیاری)">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => setShowAdd(false)}>لغو</Button>
                <Button variant="primary" size="sm" icon={Plus} loading={saving} onClick={handleAdd}
                  disabled={!time.trim() || (isAdmin && !resBranch)}>
                  ثبت رزرو
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-44">
            <JalaliDatePicker value={dateFilter} onChange={setDateFilter} placeholder="همه تاریخ‌ها" />
          </div>
          <div className="sm:w-40">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">همه وضعیت‌ها</option>
              {Object.keys(STATUS_LABELS).map((k) => <option key={k} value={k}>{STATUS_LABELS[k]}</option>)}
            </Select>
          </div>
          {isAdmin && (
            <div className="sm:w-44">
              <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">همه شعب</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
          )}
          {(dateFilter || statusFilter || branchFilter) && (
            <Button variant="default" size="sm" onClick={() => { setDateFilter(''); setStatusFilter(''); setBranchFilter(''); }}>
              پاک‌کردن فیلتر
            </Button>
          )}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card><CardBody><Empty title="رزروی یافت نشد" icon={CalendarClock} /></CardBody></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardBody className="flex flex-col gap-3">
                  {editingId === r.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="تاریخ">
                          <JalaliDatePicker value={editFields.date} onChange={v => setEditFields(f => ({ ...f, date: v }))} minDate={getTodayJalali()} />
                        </Field>
                        <Field label="ساعت">
                          <Input dir="ltr" placeholder="۱۹:۳۰" value={editFields.time} onChange={e => setEditFields(f => ({ ...f, time: e.target.value }))} />
                        </Field>
                        <Field label="تعداد نفرات">
                          <Input dir="ltr" inputMode="numeric" value={editFields.partySize} onChange={e => setEditFields(f => ({ ...f, partySize: e.target.value }))} />
                        </Field>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Field label="میز">
                          <Select value={editFields.tableId} onChange={e => setEditFields(f => ({ ...f, tableId: e.target.value }))}>
                            <option value="">بدون میز</option>
                            {tables.filter(t => !r.branchId || t.branchId === r.branchId).map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="یادداشت">
                          <Input value={editFields.note} onChange={e => setEditFields(f => ({ ...f, note: e.target.value }))} />
                        </Field>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="default" size="sm" icon={X} onClick={() => setEditingId(null)}>لغو</Button>
                        <Button variant="primary" size="sm" icon={Check} loading={editSaving} onClick={() => handleEditSave(r.id)}>ذخیره</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] text-stone-800">{reservationName(r)}</span>
                          <Chip tone={STATUS_TONE[r.status] ?? 'neutral'}>{STATUS_LABELS[r.status] ?? r.status}</Chip>
                          {r.source === 'public' && <Chip tone="neutral">آنلاین</Chip>}
                          {r.trackingCode && <span className="text-[10px] text-muted tabular-nums" dir="ltr">#{r.trackingCode}</span>}
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1">
                          {r.date} — <span dir="ltr">{r.time}</span> · {fmt(r.partySize)} نفر
                          {r.tableId ? ` · میز ${tableName(r.tableId)}` : ''}
                          {isAdmin ? ` · ${branchName(r.branchId)}` : ''}
                        </div>
                        {r.guestPhone && (
                          <div className="text-[11px] text-stone-500 mt-1 flex items-center gap-1" dir="ltr">
                            <Phone size={11} strokeWidth={1.5} /> {r.guestPhone}
                          </div>
                        )}
                        {r.note && <div className="text-[11px] text-muted mt-1">{r.note}</div>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(NEXT_STATES[r.status] ?? []).map((ns) => (
                          <button key={ns} onClick={() => changeStatus(r.id, ns)}
                            className="px-2.5 py-1 rounded-md text-[11px] bg-stone-50 text-stone-600 hover:bg-stone-100">
                            {STATUS_LABELS[ns]}
                          </button>
                        ))}
                        {(r.status === 'pending' || r.status === 'confirmed') && (
                          <button onClick={() => startEdit(r)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 text-muted hover:text-stone-700">
                            <Pencil size={13} strokeWidth={1.5} />
                          </button>
                        )}
                        <button onClick={async () => { if (await confirm({ title: 'این رزرو حذف شود؟', danger: true })) deleteReservation(r.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600">
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── نمای روزانه — ساعت‌به‌ساعت و میزبه‌میز ────────────────────────
function DayGrid({ branches, isAdmin, userBranch, gridBranch, setGridBranch, gridDate, setGridDate, tables, reservations, tableBlocks, loadTableBlocks, tableName, reservationName }: any) {
  useEffect(() => { loadTableBlocks(gridDate); }, [gridDate, loadTableBlocks]);

  const branchId = isAdmin ? gridBranch : userBranch;
  const branchTables = tables.filter((t: any) => t.branchId === branchId && t.isActive);
  const dayReservations = reservations.filter((r: any) => r.branchId === branchId && r.date === gridDate
    && ['pending', 'confirmed', 'seated'].includes(r.status));
  const dayBlocks = tableBlocks.filter((b: any) => b.branchId === branchId && b.date === gridDate);

  const weekday = jalaliWeekday(gridDate);

  const hours = Array.from(new Set([
    ...dayReservations.map((r: any) => parseInt(r.time, 10)),
    ...([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] as number[]),
  ])).filter((h) => Number.isFinite(h)).sort((a: number, b: number) => a - b);

  return (
    <Card>
      <CardHeader title="نمای روزانه" sub={weekday != null ? `روز هفته: ${WEEKDAY_LABELS[weekday]}` : undefined} />
      <CardBody className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {isAdmin && (
            <div className="sm:w-52">
              <Select value={gridBranch} onChange={(e: any) => setGridBranch(e.target.value)}>
                <option value="">انتخاب شعبه…</option>
                {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </div>
          )}
          <div className="sm:w-44">
            <JalaliDatePicker value={gridDate} onChange={setGridDate} />
          </div>
        </div>

        {!branchId ? (
          <div className="text-[12px] text-muted text-center py-6">یک شعبه انتخاب کنید</div>
        ) : branchTables.length === 0 ? (
          <Empty title="میزی برای این شعبه ثبت نشده" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-[11.5px]">
              <thead>
                <tr>
                  <th className="text-right p-2 text-stone-500 font-normal">میز</th>
                  {hours.map((h: number) => (
                    <th key={h} className="p-2 text-stone-500 font-normal tabular-nums" dir="ltr">{String(h).padStart(2, '0')}:00</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branchTables.map((t: any) => (
                  <tr key={t.id} className="border-t border-stone-100">
                    <td className="p-2 text-stone-800 whitespace-nowrap">
                      {t.name} {t.isSocial && <Chip tone="amber">سوشیال</Chip>}
                    </td>
                    {hours.map((h: number) => {
                      const hh = String(h).padStart(2, '0') + ':00';
                      const resHere = dayReservations.filter((r: any) => r.tableId === t.id && r.time === hh);
                      const blocked = dayBlocks.some((b: any) => b.tableId === t.id
                        && (!b.startTime || (b.startTime <= hh && (!b.endTime || b.endTime > hh))));
                      return (
                        <td key={h} className="p-1 text-center align-top">
                          {blocked ? (
                            <div className="rounded bg-stone-200 text-stone-600 px-1 py-1">مسدود</div>
                          ) : resHere.length > 0 ? (
                            <div className="space-y-0.5">
                              {resHere.map((r: any) => (
                                <div key={r.id} className="rounded bg-accent/10 text-accent px-1 py-1 truncate" title={`${reservationName(r)} — ${fmt(r.partySize)} نفر`}>
                                  {fmt(r.partySize)}ن
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded bg-emerald-50 text-emerald-600 px-1 py-1">خالی</div>
                          )}
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
  );
}
