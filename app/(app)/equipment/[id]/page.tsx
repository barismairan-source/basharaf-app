'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Wrench, Plus, Pencil, Check, X, Archive, History } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Empty, Chip, JalaliDatePicker, Textarea } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, formatAmountInput, parseAmount } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';
import type { EquipmentStatus, MaintType } from '@/types';

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: 'فعال',
  maintenance: 'در تعمیر',
  retired: 'بازنشسته',
};

const STATUS_TONES: Record<EquipmentStatus, 'green' | 'amber' | 'neutral'> = {
  active: 'green',
  maintenance: 'amber',
  retired: 'neutral',
};

const MAINT_TYPE_LABELS: Record<MaintType, string> = {
  preventive: 'پیشگیرانه',
  corrective: 'تعمیر',
  inspection: 'بازرسی',
};

export default function EquipmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const equipment = useAppStore(s => s.equipment);
  const equipmentLoaded = useAppStore(s => s.equipmentLoaded);
  const loadEquipment = useAppStore(s => s.loadEquipment);
  const updateEquipment = useAppStore(s => s.updateEquipment);
  const retireEquipment = useAppStore(s => s.retireEquipment);
  const maintenanceLogs = useAppStore(s => s.maintenanceLogs);
  const maintenanceLoaded = useAppStore(s => s.maintenanceLoaded);
  const loadMaintenanceLogs = useAppStore(s => s.loadMaintenanceLogs);
  const createMaintenanceLog = useAppStore(s => s.createMaintenanceLog);
  const accounts = useAppStore(s => s.accounts);
  const loadAccounts = useAppStore(s => s.loadAccounts);
  const contacts = useAppStore(s => s.contacts);
  const loadContacts = useAppStore(s => s.loadContacts);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
    loadEquipment();
    loadMaintenanceLogs(id);
    loadAccounts();
    loadContacts();
  }, [id, loadEquipment, loadMaintenanceLogs, loadAccounts, loadContacts]);

  const eq = equipment.find(e => e.id === id);

  // ── ویرایش مشخصات تجهیز ──
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState<EquipmentStatus>('active');
  const [editPurchaseDate, setEditPurchaseDate] = useState('');
  const [editPurchaseCostDisplay, setEditPurchaseCostDisplay] = useState('');
  const [editWarrantyExpiry, setEditWarrantyExpiry] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  function startEdit() {
    if (!eq) return;
    setEditName(eq.name);
    setEditCategory(eq.category);
    setEditStatus(eq.status);
    setEditPurchaseDate(eq.purchaseDate ?? '');
    setEditPurchaseCostDisplay(eq.purchaseCost ? fmt(eq.purchaseCost) : '');
    setEditWarrantyExpiry(eq.warrantyExpiry ?? '');
    setEditNote(eq.note ?? '');
    setEditing(true);
  }

  async function saveEdit() {
    if (!eq || !editName.trim()) return;
    setSaving(true);
    const ok = await updateEquipment(eq.id, {
      name: editName.trim(),
      category: editCategory.trim() || 'general',
      status: editStatus,
      purchaseDate: editPurchaseDate || null,
      purchaseCost: parseAmount(editPurchaseCostDisplay),
      warrantyExpiry: editWarrantyExpiry || null,
      note: editNote.trim() || null,
    });
    setSaving(false);
    if (ok) { showToast('تغییرات ذخیره شد', 'success'); setEditing(false); }
    else showToast('خطا در ذخیره', 'danger');
  }

  async function handleRetire() {
    if (!eq) return;
    const ok = await retireEquipment(eq.id);
    if (ok) showToast('تجهیز بازنشسته شد', 'success');
    else showToast('خطا', 'danger');
  }

  // ── ثبت سابقه نگهداری/تعمیر ──
  const [showAddMaint, setShowAddMaint] = useState(false);
  const [maintType, setMaintType] = useState<MaintType>('preventive');
  const [maintDate, setMaintDate] = useState('');
  const [maintCostDisplay, setMaintCostDisplay] = useState('');
  const [maintVendor, setMaintVendor] = useState('');
  const [maintMethod, setMaintMethod] = useState('نقد');
  const [maintNote, setMaintNote] = useState('');
  const [maintAccountId, setMaintAccountId] = useState('');
  const [addingMaint, setAddingMaint] = useState(false);

  const suppliers = contacts.filter(c => c.type === 'supplier');
  const maintCost = parseAmount(maintCostDisplay);

  function openAddMaint() {
    setMaintType('preventive');
    setMaintDate(getTodayJalali());
    setMaintCostDisplay('');
    setMaintVendor('');
    setMaintMethod('نقد');
    setMaintNote('');
    setMaintAccountId('');
    setShowAddMaint(true);
  }

  async function handleAddMaint() {
    if (!eq || !maintDate) return;
    setAddingMaint(true);
    const log = await createMaintenanceLog({
      equipmentId: eq.id,
      type: maintType,
      date: maintDate,
      cost: maintCost,
      vendor: maintVendor.trim() || null,
      note: maintNote.trim(),
      method: maintMethod,
      accountId: maintCost > 0 ? (maintAccountId || null) : null,
    });
    setAddingMaint(false);
    if (log) {
      showToast('سابقه نگهداری ثبت شد', 'success');
      if (log.refTransactionId) showToast('تراکنش هزینه مرتبط ثبت شد', 'success');
      setShowAddMaint(false);
    } else {
      showToast('خطا در ثبت سابقه نگهداری', 'danger');
    }
  }

  if (!hydrated || !user) return null;

  if (!equipmentLoaded) {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-40 bg-stone-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!eq) {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <button onClick={() => router.push('/equipment')} className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800">
            <ArrowRight size={14} strokeWidth={1.5} />
            بازگشت به تجهیزات
          </button>
          <Card><CardBody><Empty title="تجهیز پیدا نشد" /></CardBody></Card>
        </div>
      </div>
    );
  }

  const branchLabel = branches.find(b => b.id === eq.branchId)?.name ?? '—';

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => router.push('/equipment')} className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800">
            <ArrowRight size={14} strokeWidth={1.5} />
            بازگشت به تجهیزات
          </button>
          {!editing && eq.status !== 'retired' && (
            <div className="flex items-center gap-2">
              <Button variant="default" size="sm" icon={Pencil} onClick={startEdit}>ویرایش</Button>
              <Button variant="default" size="sm" icon={Archive} onClick={handleRetire}>بازنشسته کردن</Button>
            </div>
          )}
        </div>

        {/* Equipment info */}
        <Card>
          <CardBody>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="نام تجهیز">
                    <Input value={editName} onChange={e => setEditName(e.target.value)} />
                  </Field>
                  <Field label="دسته">
                    <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} />
                  </Field>
                  <Field label="وضعیت">
                    <Select value={editStatus} onChange={e => setEditStatus(e.target.value as EquipmentStatus)}>
                      <option value="active">فعال</option>
                      <option value="maintenance">در تعمیر</option>
                      <option value="retired">بازنشسته</option>
                    </Select>
                  </Field>
                  <Field label="بهای خرید (تومان)">
                    <Input
                      type="text" inputMode="numeric" dir="ltr" placeholder="۰"
                      value={editPurchaseCostDisplay}
                      onChange={e => setEditPurchaseCostDisplay(formatAmountInput(e.target.value))}
                    />
                  </Field>
                  <Field label="تاریخ خرید">
                    <JalaliDatePicker value={editPurchaseDate} onChange={setEditPurchaseDate} />
                  </Field>
                  <Field label="پایان گارانتی">
                    <JalaliDatePicker value={editWarrantyExpiry} onChange={setEditWarrantyExpiry} />
                  </Field>
                </div>
                <Field label="یادداشت">
                  <Textarea rows={2} value={editNote} onChange={e => setEditNote(e.target.value)} />
                </Field>
                <div className="flex gap-2 justify-end">
                  <Button variant="default" size="sm" icon={X} onClick={() => setEditing(false)}>لغو</Button>
                  <Button variant="primary" size="sm" icon={Check} loading={saving} onClick={saveEdit} disabled={!editName.trim()}>ذخیره</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <Wrench size={18} strokeWidth={1.5} className="text-stone-600" />
                    </div>
                    <div>
                      <div className="text-[15px] text-stone-900 font-medium">{eq.name}</div>
                      <div className="text-[11px] text-stone-400" dir="ltr">{eq.code} · {eq.category}</div>
                    </div>
                  </div>
                  <Chip tone={STATUS_TONES[eq.status]}>{STATUS_LABELS[eq.status]}</Chip>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
                  <div>
                    <div className="text-stone-400 mb-0.5">شعبه</div>
                    <div className="text-stone-700">{branchLabel}</div>
                  </div>
                  <div>
                    <div className="text-stone-400 mb-0.5">بهای خرید</div>
                    <div className="text-stone-700 tabular-nums">{fmt(eq.purchaseCost)} تومان</div>
                  </div>
                  <div>
                    <div className="text-stone-400 mb-0.5">تاریخ خرید</div>
                    <div className="text-stone-700 tabular-nums">{eq.purchaseDate || '—'}</div>
                  </div>
                  <div>
                    <div className="text-stone-400 mb-0.5">پایان گارانتی</div>
                    <div className="text-stone-700 tabular-nums">{eq.warrantyExpiry || '—'}</div>
                  </div>
                </div>

                {eq.note && (
                  <div className="text-[12px] text-stone-600 bg-stone-50/60 rounded-md p-3">{eq.note}</div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Maintenance history */}
        <Card>
          <CardHeader title="سوابق نگهداری و تعمیر" sub={`${maintenanceLogs.length} مورد`} />
          <CardBody className="space-y-4">
            {!showAddMaint ? (
              <Button variant="primary" size="sm" icon={Plus} onClick={openAddMaint}>ثبت سابقه جدید</Button>
            ) : (
              <div className="space-y-4 border border-stone-100 rounded-md p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="نوع">
                    <Select value={maintType} onChange={e => setMaintType(e.target.value as MaintType)}>
                      <option value="preventive">پیشگیرانه</option>
                      <option value="corrective">تعمیر</option>
                      <option value="inspection">بازرسی</option>
                    </Select>
                  </Field>
                  <Field label="تاریخ">
                    <JalaliDatePicker value={maintDate} onChange={setMaintDate} />
                  </Field>
                  <Field label="هزینه (تومان، اختیاری)">
                    <Input
                      type="text" inputMode="numeric" dir="ltr" placeholder="۰"
                      value={maintCostDisplay}
                      onChange={e => setMaintCostDisplay(formatAmountInput(e.target.value))}
                    />
                  </Field>
                  <Field label="تأمین‌کننده/تعمیرکار (اختیاری)">
                    <Input
                      list="maint-vendor-list"
                      placeholder="نام تأمین‌کننده یا تعمیرکار"
                      value={maintVendor}
                      onChange={e => setMaintVendor(e.target.value)}
                    />
                    <datalist id="maint-vendor-list">
                      {suppliers.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </Field>
                  {maintCost > 0 && (
                    <>
                      <Field label="روش پرداخت">
                        <Select value={maintMethod} onChange={e => setMaintMethod(e.target.value)}>
                          <option value="نقد">نقد</option>
                          <option value="کارت به کارت">کارت به کارت</option>
                          <option value="دستگاه پوز">دستگاه پوز</option>
                          <option value="حواله بانکی">حواله بانکی</option>
                          <option value="چک">چک</option>
                        </Select>
                      </Field>
                      <Field label="صندوق پرداخت (اختیاری)">
                        <Select value={maintAccountId} onChange={e => setMaintAccountId(e.target.value)}>
                          <option value="">بدون اثر مالی (فقط ثبت)</option>
                          {accounts.filter(a => a.branchId === eq.branchId || a.branchId === null).map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </Select>
                      </Field>
                    </>
                  )}
                </div>
                <Field label="یادداشت (اختیاری)">
                  <Textarea rows={2} value={maintNote} onChange={e => setMaintNote(e.target.value)} />
                </Field>
                <div className="flex gap-2 justify-end">
                  <Button variant="default" size="sm" onClick={() => setShowAddMaint(false)}>لغو</Button>
                  <Button variant="primary" size="sm" icon={Plus} loading={addingMaint} onClick={handleAddMaint} disabled={!maintDate}>ثبت</Button>
                </div>
              </div>
            )}

            {/* History list */}
            {maintenanceLoaded && maintenanceLogs.length === 0 ? (
              <Empty title="سابقه نگهداری ثبت نشده" icon={History} />
            ) : (
              <div className="divide-y divide-stone-50">
                {maintenanceLogs.map(log => (
                  <div key={log.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Chip>{MAINT_TYPE_LABELS[log.type]}</Chip>
                        <span className="text-[11px] text-stone-500 tabular-nums">{log.date}</span>
                      </div>
                      {log.vendor && <div className="text-[11.5px] text-stone-600 mt-1">{log.vendor}</div>}
                      {log.note && <div className="text-[11px] text-stone-400 mt-0.5">{log.note}</div>}
                    </div>
                    <div className="text-end flex-shrink-0">
                      <div className="text-[12.5px] text-stone-700 tabular-nums">{log.cost > 0 ? fmt(log.cost) : '—'}</div>
                      {log.refTransactionId && <div className="text-[10px] text-stone-400 mt-0.5">تراکنش ثبت شد</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
