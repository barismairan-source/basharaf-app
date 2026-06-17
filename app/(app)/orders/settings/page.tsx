'use client';

import { useEffect, useState } from 'react';
import { Truck, MapPin, Plus, Trash2, Edit3, X, Check, Settings as SettingsIcon } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Switch, Empty, Chip, type ToastTone } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, parseAmount, formatNumericInputValue } from '@/lib/utils';
import { orderingRepo } from '@/lib/repos/ordering.api';
import type { OrdSettings, OrdZone, PaymentGatewayId } from '@/types';

type ShowToast = (text: string, tone?: ToastTone, sub?: string) => void;

type ZoneFormInput = { name: string; deliveryFeeDisplay: string; minOrderDisplay: string; isActive?: boolean };

export default function OrderingSettingsPage() {
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [settings, setSettings] = useState<OrdSettings | null>(null);
  const [zones, setZones] = useState<OrdZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    isOpen: true,
    openTime: '09:00',
    closeTime: '23:00',
    deliveryEnabled: true,
    pickupEnabled: true,
    payCash: true,
    payOnline: false,
    payGateway: 'zarinpal' as PaymentGatewayId,
    zarinpalMerchantId: '',
    idpayApiKey: '',
    zibalMerchantId: '',
    neshanApiKey: '',
    minOrderDisplay: '',
    prepBufferMin: '30',
  });

  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.assignedBranch) setBranchId(user.assignedBranch);
    else if (branches[0] && !branchId) setBranchId(branches[0].id);
  }, [user, branches, branchId]);

  useEffect(() => {
    if (!branchId) return;
    let active = true;
    setLoading(true);
    Promise.all([orderingRepo.getSettings(branchId), orderingRepo.listZones(branchId)])
      .then(([s, z]) => {
        if (!active) return;
        setSettings(s);
        setForm({
          isOpen: s.isOpen,
          openTime: s.openTime,
          closeTime: s.closeTime,
          deliveryEnabled: s.deliveryEnabled,
          pickupEnabled: s.pickupEnabled,
          payCash: s.payCash,
          payOnline: s.payOnline,
          payGateway: s.payGateway,
          zarinpalMerchantId: s.zarinpalMerchantId ?? '',
          idpayApiKey: s.idpayApiKey ?? '',
          zibalMerchantId: s.zibalMerchantId ?? '',
          neshanApiKey: s.neshanApiKey ?? '',
          minOrderDisplay: s.minOrder ? s.minOrder.toLocaleString('en-US') : '',
          prepBufferMin: String(s.prepBufferMin),
        });
        setZones(z);
      })
      .catch(() => showToast('خطا در بارگذاری تنظیمات', 'danger'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [branchId, showToast]);

  if (!hydrated || !user) return null;

  if (user.role === 'Warehouse') {
    return (
      <div className="p-6">
        <Card><CardBody><Empty title="شما به این بخش دسترسی ندارید" icon={SettingsIcon} /></CardBody></Card>
      </div>
    );
  }

  const isAdmin = user.role === 'SuperAdmin';

  async function handleSaveSettings() {
    if (!branchId) return;
    setSaving(true);
    try {
      const updated = await orderingRepo.updateSettings(branchId, {
        isOpen: form.isOpen,
        openTime: form.openTime,
        closeTime: form.closeTime,
        deliveryEnabled: form.deliveryEnabled,
        pickupEnabled: form.pickupEnabled,
        payCash: form.payCash,
        payOnline: form.payOnline,
        payGateway: form.payGateway,
        zarinpalMerchantId: form.zarinpalMerchantId.trim(),
        idpayApiKey: form.idpayApiKey.trim(),
        zibalMerchantId: form.zibalMerchantId.trim(),
        neshanApiKey: form.neshanApiKey.trim(),
        minOrder: parseAmount(form.minOrderDisplay),
        prepBufferMin: Number(form.prepBufferMin) || 0,
      });
      setSettings(updated);
      showToast('تنظیمات ذخیره شد', 'success');
    } catch {
      showToast('خطا در ذخیره‌ی تنظیمات', 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateZone(input: ZoneFormInput): Promise<boolean> {
    if (!branchId || !input.name.trim()) return false;
    try {
      const zone = await orderingRepo.createZone({
        branchId,
        name: input.name.trim(),
        deliveryFee: parseAmount(input.deliveryFeeDisplay),
        minOrder: parseAmount(input.minOrderDisplay),
      });
      setZones(prev => [...prev, zone].sort((a, b) => a.name.localeCompare(b.name, 'fa')));
      return true;
    } catch {
      return false;
    }
  }

  async function handleUpdateZone(id: string, input: ZoneFormInput): Promise<boolean> {
    if (!input.name.trim()) return false;
    try {
      const zone = await orderingRepo.updateZone(id, {
        name: input.name.trim(),
        deliveryFee: parseAmount(input.deliveryFeeDisplay),
        minOrder: parseAmount(input.minOrderDisplay),
        isActive: input.isActive,
      });
      setZones(prev => prev.map(z => (z.id === id ? zone : z)));
      return true;
    } catch {
      return false;
    }
  }

  async function handleDeleteZone(id: string): Promise<boolean> {
    try {
      await orderingRepo.deleteZone(id);
      setZones(prev => prev.filter(z => z.id !== id));
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">سفارش بیرون‌بر</h1>
          <div className="text-[12px] text-stone-500 mt-1">تنظیمات شعبه و محدوده‌های ارسال</div>
        </div>

        {isAdmin && (
          <Field label="شعبه">
            <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        )}

        {loading || !settings ? (
          <Card><CardBody><Empty title="در حال بارگذاری…" icon={Truck} /></CardBody></Card>
        ) : (
          <>
            <Card>
              <CardHeader title="تنظیمات سفارش‌گیری" sub="باز/بسته، ساعت کاری، روش‌های ارسال و پرداخت" />
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
                    <span className="text-[12px] text-stone-600">پذیرش سفارش</span>
                    <Switch checked={form.isOpen} onCheckedChange={v => setForm({ ...form, isOpen: v })} aria-label="پذیرش سفارش" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
                    <span className="text-[12px] text-stone-600">ارسال فعال است</span>
                    <Switch checked={form.deliveryEnabled} onCheckedChange={v => setForm({ ...form, deliveryEnabled: v })} aria-label="ارسال فعال است" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
                    <span className="text-[12px] text-stone-600">پیکاپ فعال است</span>
                    <Switch checked={form.pickupEnabled} onCheckedChange={v => setForm({ ...form, pickupEnabled: v })} aria-label="پیکاپ فعال است" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
                    <span className="text-[12px] text-stone-600">پرداخت نقدی</span>
                    <Switch checked={form.payCash} onCheckedChange={v => setForm({ ...form, payCash: v })} aria-label="پرداخت نقدی" />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10">
                    <span className="text-[12px] text-stone-600">پرداخت آنلاین</span>
                    <Switch checked={form.payOnline} onCheckedChange={v => setForm({ ...form, payOnline: v })} aria-label="پرداخت آنلاین" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="ساعت شروع">
                    <Input type="time" dir="ltr" value={form.openTime} onChange={e => setForm({ ...form, openTime: e.target.value })} />
                  </Field>
                  <Field label="ساعت پایان">
                    <Input type="time" dir="ltr" value={form.closeTime} onChange={e => setForm({ ...form, closeTime: e.target.value })} />
                  </Field>
                  <Field label="حداقل سفارش (تومان)">
                    <Input
                      type="text" inputMode="numeric" dir="ltr" placeholder="۰"
                      value={form.minOrderDisplay}
                      onChange={e => setForm({ ...form, minOrderDisplay: formatNumericInputValue(e.target) })}
                    />
                  </Field>
                  <Field label="بافر آماده‌سازی (دقیقه)">
                    <Input
                      type="text" inputMode="numeric" dir="ltr"
                      value={form.prepBufferMin}
                      onChange={e => setForm({ ...form, prepBufferMin: e.target.value.replace(/\D/g, '') })}
                    />
                  </Field>
                </div>

                {form.payOnline && (
                  <div className="rounded-md border border-stone-200 p-3 space-y-3">
                    <div className="text-[12px] font-medium text-stone-700">پرداخت آنلاین</div>
                    <Field label="درگاه فعال">
                      <Select
                        value={form.payGateway}
                        onChange={e => setForm({ ...form, payGateway: e.target.value as PaymentGatewayId })}
                      >
                        <option value="zarinpal">زرین‌پال</option>
                        <option value="idpay">آی‌دی‌پی (IDPay)</option>
                        <option value="zibal">زیبال (Zibal)</option>
                      </Select>
                    </Field>
                    {form.payGateway === 'zarinpal' && (
                      <Field label="Merchant ID زرین‌پال">
                        <Input
                          dir="ltr" value={form.zarinpalMerchantId}
                          onChange={e => setForm({ ...form, zarinpalMerchantId: e.target.value })}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        />
                      </Field>
                    )}
                    {form.payGateway === 'idpay' && (
                      <Field label="کلید API آی‌دی‌پی">
                        <Input
                          dir="ltr" value={form.idpayApiKey}
                          onChange={e => setForm({ ...form, idpayApiKey: e.target.value })}
                          placeholder="کلید API از پنل آی‌دی‌پی"
                        />
                      </Field>
                    )}
                    {form.payGateway === 'zibal' && (
                      <Field label="Merchant ID زیبال">
                        <Input
                          dir="ltr" value={form.zibalMerchantId}
                          onChange={e => setForm({ ...form, zibalMerchantId: e.target.value })}
                          placeholder="Merchant ID از پنل زیبال"
                        />
                      </Field>
                    )}
                  </div>
                )}

                <div className="rounded-md border border-stone-200 p-3 space-y-3">
                  <div className="text-[12px] font-medium text-stone-700">نقشه نشان</div>
                  <Field label="کلید API نشان">
                    <Input
                      dir="ltr" value={form.neshanApiKey}
                      onChange={e => setForm({ ...form, neshanApiKey: e.target.value })}
                      placeholder="service.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </Field>
                  <p className="text-[11px] text-muted">
                    برای نمایش نقشه در صفحه‌ی انتخاب آدرس. کلید را از{' '}
                    <a href="https://platform.neshan.org" target="_blank" rel="noreferrer" className="underline">platform.neshan.org</a>
                    {' '}دریافت کنید.
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button variant="primary" size="sm" icon={Check} loading={saving} onClick={handleSaveSettings}>ذخیره</Button>
                </div>
              </CardBody>
            </Card>

            <ZonesCard
              zones={zones}
              onCreate={handleCreateZone}
              onUpdate={handleUpdateZone}
              onDelete={handleDeleteZone}
              showToast={showToast}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── محدوده‌های ارسال ────────────────────────────────────────────
function ZonesCard({ zones, onCreate, onUpdate, onDelete, showToast }: {
  zones: OrdZone[];
  onCreate: (input: ZoneFormInput) => Promise<boolean>;
  onUpdate: (id: string, input: ZoneFormInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  showToast: ShowToast;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', deliveryFeeDisplay: '', minOrderDisplay: '' });
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!addForm.name.trim()) { showToast('نام محدوده الزامی است', 'danger'); return; }
    setAdding(true);
    const ok = await onCreate(addForm);
    setAdding(false);
    if (ok) {
      showToast('محدوده اضافه شد', 'success');
      setShowAdd(false);
      setAddForm({ name: '', deliveryFeeDisplay: '', minOrderDisplay: '' });
    } else {
      showToast('خطا در افزودن محدوده', 'danger');
    }
  }

  return (
    <Card>
      <CardHeader
        title="محدوده‌های ارسال"
        sub="نام، هزینه و حداقل سفارش هر محدوده"
        action={!showAdd && <Button variant="default" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>محدوده جدید</Button>}
      />
      <CardBody className="space-y-4">
        {showAdd && (
          <div className="rounded-md border border-stone-200 p-3 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="نام محدوده">
                <Input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} />
              </Field>
              <Field label="هزینه ارسال (تومان)">
                <Input
                  type="text" inputMode="numeric" dir="ltr" placeholder="۰"
                  value={addForm.deliveryFeeDisplay}
                  onChange={e => setAddForm({ ...addForm, deliveryFeeDisplay: formatNumericInputValue(e.target) })}
                />
              </Field>
              <Field label="حداقل سفارش (تومان، اختیاری)">
                <Input
                  type="text" inputMode="numeric" dir="ltr" placeholder="۰"
                  value={addForm.minOrderDisplay}
                  onChange={e => setAddForm({ ...addForm, minOrderDisplay: formatNumericInputValue(e.target) })}
                />
              </Field>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="default" size="sm" onClick={() => setShowAdd(false)}>لغو</Button>
              <Button variant="primary" size="sm" icon={Plus} loading={adding} onClick={handleAdd} disabled={!addForm.name.trim()}>افزودن</Button>
            </div>
          </div>
        )}

        {zones.length === 0 ? (
          <Empty title="محدوده‌ای ثبت نشده" icon={MapPin} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead className="bg-stone-50/50 border-b border-stone-100">
                <tr>
                  <th className="text-right text-[11px] text-stone-500 font-normal px-3 py-2">نام محدوده</th>
                  <th className="text-end text-[11px] text-stone-500 font-normal px-3 py-2">هزینه ارسال</th>
                  <th className="text-end text-[11px] text-stone-500 font-normal px-3 py-2">حداقل سفارش</th>
                  <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-2">فعال</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {zones.map(zone => (
                  <ZoneRow key={zone.id} zone={zone} onUpdate={onUpdate} onDelete={onDelete} showToast={showToast} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function ZoneRow({ zone, onUpdate, onDelete, showToast }: {
  zone: OrdZone;
  onUpdate: (id: string, input: ZoneFormInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  showToast: ShowToast;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ZoneFormInput>(() => zoneToForm(zone));
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setForm(zoneToForm(zone));
    setEditing(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('نام محدوده الزامی است', 'danger'); return; }
    setSaving(true);
    const ok = await onUpdate(zone.id, form);
    setSaving(false);
    if (ok) { showToast('ذخیره شد', 'success'); setEditing(false); }
    else showToast('خطا', 'danger');
  }

  async function handleDelete() {
    if (!confirm(`محدوده «${zone.name}» حذف شود؟`)) return;
    if (await onDelete(zone.id)) showToast('حذف شد', 'success');
    else showToast('خطا در حذف', 'danger');
  }

  if (editing) {
    return (
      <tr className="border-b border-stone-50 last:border-b-0">
        <td colSpan={5} className="p-3 bg-stone-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Field label="نام محدوده">
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="هزینه ارسال (تومان)">
              <Input
                type="text" inputMode="numeric" dir="ltr"
                value={form.deliveryFeeDisplay}
                onChange={e => setForm({ ...form, deliveryFeeDisplay: formatNumericInputValue(e.target) })}
              />
            </Field>
            <Field label="حداقل سفارش (تومان)">
              <Input
                type="text" inputMode="numeric" dir="ltr"
                value={form.minOrderDisplay}
                onChange={e => setForm({ ...form, minOrderDisplay: formatNumericInputValue(e.target) })}
              />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-stone-200 px-3 h-10 self-end">
              <span className="text-[12px] text-stone-600">فعال</span>
              <Switch checked={!!form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} aria-label="فعال" />
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-3">
            <Button variant="default" size="sm" icon={X} onClick={() => setEditing(false)}>لغو</Button>
            <Button variant="primary" size="sm" icon={Check} loading={saving} onClick={handleSave}>ذخیره</Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50">
      <td className="px-3 py-2.5"><span className="text-[12.5px] text-stone-800">{zone.name}</span></td>
      <td className="px-3 py-2.5 text-end"><span className="text-[12px] text-stone-700 tabular-nums">{fmt(zone.deliveryFee)}</span></td>
      <td className="px-3 py-2.5 text-end"><span className="text-[12px] text-stone-700 tabular-nums">{fmt(zone.minOrder)}</span></td>
      <td className="px-3 py-2.5 text-center"><Chip tone={zone.isActive ? 'green' : 'neutral'}>{zone.isActive ? 'فعال' : 'غیرفعال'}</Chip></td>
      <td className="px-3 py-2.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <button onClick={startEdit} className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-stone-100 text-muted hover:text-stone-700">
            <Edit3 size={13} strokeWidth={1.5} />
          </button>
          <button onClick={handleDelete} className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600">
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function zoneToForm(zone: OrdZone): ZoneFormInput {
  return {
    name: zone.name,
    deliveryFeeDisplay: zone.deliveryFee ? zone.deliveryFee.toLocaleString('en-US') : '',
    minOrderDisplay: zone.minOrder ? zone.minOrder.toLocaleString('en-US') : '',
    isActive: zone.isActive,
  };
}
