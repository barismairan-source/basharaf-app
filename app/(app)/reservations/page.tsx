'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Plus, Trash2, Table2, X, Pencil, Check } from 'lucide-react';
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
} from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';
import type { ReservationStatus } from '@/types';

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
  const loadReservations = useAppStore((s) => s.loadReservations);
  const loadTables = useAppStore((s) => s.loadTables);
  const loadCustomers = useAppStore((s) => s.loadCustomers);
  const createReservation = useAppStore((s) => s.createReservation);
  const updateReservation = useAppStore((s) => s.updateReservation);
  const setReservationStatus = useAppStore((s) => s.setReservationStatus);
  const deleteReservation = useAppStore((s) => s.deleteReservation);
  const createTable = useAppStore((s) => s.createTable);
  const deleteTable = useAppStore((s) => s.deleteTable);
  const showToast = useAppStore((s) => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showTables, setShowTables] = useState(false);
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
  const [saving, setSaving] = useState(false);

  // new table
  const [tName, setTName] = useState('');
  const [tCap, setTCap] = useState('');
  const [tArea, setTArea] = useState('');
  const [tBranch, setTBranch] = useState('');

  useEffect(() => {
    setHydrated(true);
    loadReservations();
    loadTables();
    loadCustomers();
  }, [loadReservations, loadTables, loadCustomers]);

  const isAdmin = user?.role === 'SuperAdmin';

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
    setSaving(true);
    const r = await createReservation({
      customerId: customerId || null,
      branchId: isAdmin ? resBranch || null : null,
      tableId: tableId || null,
      date,
      time: time.trim(),
      partySize: partySize ? num(partySize) : 1,
      note: note.trim() || null,
    });
    setSaving(false);
    if (r) {
      showToast('رزرو ثبت شد', 'success');
      setShowAdd(false);
      setCustomerId('');
      setTableId('');
      setTime('');
      setNote('');
    } else {
      showToast('خطا در ثبت رزرو', 'danger');
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
    const ok = await updateReservation(id, {
      tableId: editFields.tableId || null,
      date: editFields.date,
      time: editFields.time.trim(),
      partySize: editFields.partySize ? num(editFields.partySize) : 1,
      note: editFields.note.trim() || null,
    });
    setEditSaving(false);
    if (ok) { showToast('رزرو ویرایش شد', 'success'); setEditingId(null); }
    else showToast('خطا در ویرایش', 'danger');
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
    });
    if (t) {
      showToast('میز اضافه شد', 'success', t.name);
      setTName('');
      setTCap('');
      setTArea('');
    } else {
      showToast('خطا در ساخت میز (شعبه مشخص است؟)', 'danger');
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
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              icon={Table2}
              onClick={() => setShowTables((v) => !v)}
            >
              میزها
            </Button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
              رزرو جدید
            </Button>
          </div>
        </div>

        {/* Tables manager */}
        {showTables && (
          <Card>
            <CardHeader title="میزها" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Input placeholder="نام میز" value={tName} onChange={(e) => setTName(e.target.value)} />
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  placeholder="ظرفیت"
                  value={tCap}
                  onChange={(e) => setTCap(e.target.value)}
                />
                <Input placeholder="منطقه (اختیاری)" value={tArea} onChange={(e) => setTArea(e.target.value)} />
                {isAdmin ? (
                  <Select value={tBranch} onChange={(e) => setTBranch(e.target.value)}>
                    <option value="">شعبه…</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Button variant="primary" size="sm" icon={Plus} onClick={handleAddTable}>
                    افزودن
                  </Button>
                )}
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" icon={Plus} onClick={handleAddTable}>
                    افزودن میز
                  </Button>
                </div>
              )}
              {tables.length === 0 ? (
                <Empty title="میزی ثبت نشده" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tables.map((t) => (
                    <div
                      key={t.id}
                      className="inline-flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-1.5 text-[12px] text-stone-700"
                    >
                      <span>{t.name}</span>
                      <span className="text-[10px] text-muted tabular-nums">{fmt(t.capacity)} نفر</span>
                      {isAdmin && <span className="text-[10px] text-muted">{branchName(t.branchId)}</span>}
                      <button
                        onClick={() => deleteTable(t.id)}
                        className="text-muted hover:text-rose-600"
                      >
                        <X size={12} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                {isAdmin && (
                  <Field label="شعبه">
                    <Select
                      value={resBranch}
                      onChange={(e) => {
                        setResBranch(e.target.value);
                        setTableId('');
                      }}
                    >
                      <option value="">انتخاب شعبه…</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field label="میز (اختیاری)">
                  <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
                    <option value="">بدون میز</option>
                    {selectableTables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="تاریخ">
                  <JalaliDatePicker value={date} onChange={setDate} />
                </Field>
                <Field label="ساعت">
                  <Input
                    dir="ltr"
                    placeholder="۱۹:۳۰"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </Field>
                <Field label="تعداد نفرات">
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="یادداشت (اختیاری)">
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => setShowAdd(false)}>
                  لغو
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  loading={saving}
                  onClick={handleAdd}
                  disabled={!time.trim() || (isAdmin && !resBranch)}
                >
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
              {Object.keys(STATUS_LABELS).map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABELS[k]}
                </option>
              ))}
            </Select>
          </div>
          {isAdmin && (
            <div className="sm:w-44">
              <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">همه شعب</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {(dateFilter || statusFilter || branchFilter) && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setDateFilter('');
                setStatusFilter('');
                setBranchFilter('');
              }}
            >
              پاک‌کردن فیلتر
            </Button>
          )}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <Empty title="رزروی یافت نشد" icon={CalendarClock} />
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardBody className="flex flex-col gap-3">
                  {editingId === r.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Field label="تاریخ">
                          <JalaliDatePicker value={editFields.date} onChange={v => setEditFields(f => ({ ...f, date: v }))} />
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
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-stone-800">{customerName(r.customerId)}</span>
                          <Chip tone={STATUS_TONE[r.status] ?? 'neutral'}>
                            {STATUS_LABELS[r.status] ?? r.status}
                          </Chip>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-1">
                          {r.date} — <span dir="ltr">{r.time}</span> · {fmt(r.partySize)} نفر
                          {r.tableId ? ` · میز ${tableName(r.tableId)}` : ''}
                          {isAdmin ? ` · ${branchName(r.branchId)}` : ''}
                        </div>
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
                          <button onClick={() => startEdit(r)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 text-muted hover:text-stone-700">
                            <Pencil size={13} strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm('این رزرو حذف شود؟')) deleteReservation(r.id); }}
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600"
                        >
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
