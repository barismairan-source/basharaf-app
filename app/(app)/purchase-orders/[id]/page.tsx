'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ShoppingCart, Pencil, Check, X, Send, Ban, Plus, Trash2, PackageCheck } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Empty, Chip, JalaliDatePicker, Textarea, useConfirm } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, formatNumericInputValue } from '@/lib/utils';
import type { InventoryItem, PoStatus } from '@/types';

const STATUS_LABELS: Record<PoStatus, string> = {
  draft: 'پیش‌نویس',
  sent: 'ارسال‌شده',
  partial: 'دریافت ناقص',
  received: 'دریافت‌شده',
  cancelled: 'لغو شده',
};

const STATUS_TONES: Record<PoStatus, 'green' | 'amber' | 'neutral' | 'red'> = {
  draft: 'neutral',
  sent: 'amber',
  partial: 'amber',
  received: 'green',
  cancelled: 'red',
};

const UNIT_LABELS: Record<string, string> = { kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر', pcs: 'عدد', can: 'قوطی', pack: 'بسته' };

const ALLOWED_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
  draft: ['sent', 'cancelled'],
  sent: ['cancelled'],
  partial: [],
  received: [],
  cancelled: [],
};

interface ItemRow {
  inventoryItemId: string;
  description: string;
  qty: string;
  unitCost: string;
}

const emptyRow: ItemRow = { inventoryItemId: '', description: '', qty: '', unitCost: '' };

function rowTotal(r: ItemRow): number {
  const qty = parseInt(r.qty.replace(/\D/g, ''), 10) || 0;
  const unitCost = parseInt(r.unitCost.replace(/\D/g, ''), 10) || 0;
  return qty * unitCost;
}

interface ReceiveRow {
  poItemId: string;
  description: string;
  unit: string;
  orderedQty: number;
  orderedUnitCost: number;
  receivedQty: string;
  receivedUnitPrice: string;
}

function receiveRowTotal(r: ReceiveRow, canSeePrices: boolean): number {
  const qty = parseInt(r.receivedQty.replace(/\D/g, ''), 10) || 0;
  const price = canSeePrices ? (parseInt(r.receivedUnitPrice.replace(/\D/g, ''), 10) || 0) : r.orderedUnitCost;
  return qty * price;
}

export default function PurchaseOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const confirm = useConfirm();

  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const contacts = useAppStore(s => s.contacts);
  const loadContacts = useAppStore(s => s.loadContacts);
  const purchaseOrders = useAppStore(s => s.purchaseOrders);
  const poLoaded = useAppStore(s => s.poLoaded);
  const poError = useAppStore(s => s.poError);
  const loadPurchaseOrders = useAppStore(s => s.loadPurchaseOrders);
  const updatePurchaseOrder = useAppStore(s => s.updatePurchaseOrder);
  const deletePurchaseOrder = useAppStore(s => s.deletePurchaseOrder);
  const receivePurchaseOrder = useAppStore(s => s.receivePurchaseOrder);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [invItems, setInvItems] = useState<InventoryItem[]>([]);

  useEffect(() => {
    setHydrated(true);
    loadPurchaseOrders();
    loadContacts();
    fetch('/api/inventory/items', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.items) setInvItems(data.items); })
      .catch(() => {});
  }, [loadPurchaseOrders, loadContacts]);

  const po = purchaseOrders.find(o => o.id === id);

  const [editing, setEditing] = useState(false);
  const [editSupplierId, setEditSupplierId] = useState('');
  const [editExpectedDate, setEditExpectedDate] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editRows, setEditRows] = useState<ItemRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showReceive, setShowReceive] = useState(false);
  const [receiveRows, setReceiveRows] = useState<ReceiveRow[]>([]);
  const [vatAmountInput, setVatAmountInput] = useState('');
  const [receiving, setReceiving] = useState(false);

  function startEdit() {
    if (!po) return;
    setEditSupplierId(po.supplierId ?? '');
    setEditExpectedDate(po.expectedDate ?? '');
    setEditNote(po.note ?? '');
    setEditRows(po.items.map(it => ({
      inventoryItemId: it.inventoryItemId ?? '',
      description: it.description,
      qty: it.qty ? it.qty.toLocaleString('en-US') : '',
      unitCost: it.unitCost ? it.unitCost.toLocaleString('en-US') : '',
    })));
    setEditing(true);
  }

  function setEditRow(i: number, patch: Partial<ItemRow>) {
    setEditRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function onPickInvItem(i: number, itemId: string) {
    const item = invItems.find(it => it.id === itemId);
    setEditRow(i, { inventoryItemId: itemId, description: item ? item.name : '' });
  }

  async function saveEdit() {
    if (!po) return;
    const validItems = editRows
      .map(r => ({
        inventoryItemId: r.inventoryItemId || null,
        description: r.description.trim(),
        qty: parseInt(r.qty.replace(/\D/g, ''), 10) || 0,
        unitCost: parseInt(r.unitCost.replace(/\D/g, ''), 10) || 0,
      }))
      .filter(it => it.description && it.qty > 0);
    if (validItems.length === 0) return;

    setSaving(true);
    const updated = await updatePurchaseOrder(po.id, {
      supplierId: editSupplierId || null,
      expectedDate: editExpectedDate || null,
      note: editNote.trim(),
      items: validItems,
    });
    setSaving(false);
    if (updated) { showToast('تغییرات ذخیره شد', 'success'); setEditing(false); }
    else showToast(poError || 'خطا در ذخیره', 'danger');
  }

  async function handleTransition(status: 'sent' | 'cancelled') {
    if (!po) return;
    setTransitioning(true);
    const updated = await updatePurchaseOrder(po.id, { status });
    setTransitioning(false);
    if (updated) showToast(status === 'sent' ? 'سفارش برای تأمین‌کننده ارسال شد' : 'سفارش لغو شد', 'success');
    else showToast(poError || 'خطا', 'danger');
  }

  async function handleDelete() {
    if (!po) return;
    if (!(await confirm({ title: 'این سفارش خرید (پیش‌نویس) حذف شود؟', danger: true, confirmLabel: 'حذف' }))) return;
    setDeleting(true);
    const ok = await deletePurchaseOrder(po.id);
    setDeleting(false);
    if (ok) {
      showToast('سفارش خرید حذف شد', 'success');
      router.push('/purchase-orders');
    } else {
      showToast(poError || 'خطا در حذف', 'danger');
    }
  }

  function setReceiveRow(i: number, patch: Partial<ReceiveRow>) {
    setReceiveRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function openReceive() {
    if (!po) return;
    setReceiveRows(po.items.map(it => ({
      poItemId: it.id,
      description: it.description,
      unit: it.inventoryItemId ? (invItems.find(i => i.id === it.inventoryItemId)?.unit ?? '') : '',
      orderedQty: it.qty,
      orderedUnitCost: it.unitCost,
      receivedQty: it.qty ? it.qty.toLocaleString('en-US') : '',
      receivedUnitPrice: it.unitCost ? it.unitCost.toLocaleString('en-US') : '',
    })));
    setVatAmountInput('');
    setShowReceive(true);
  }

  async function handleReceive() {
    if (!po) return;
    const canSeePrices = user?.role !== 'Warehouse';
    const lines = receiveRows.map(r => {
      const receivedQty = parseInt(r.receivedQty.replace(/\D/g, ''), 10) || 0;
      if (!canSeePrices) return { poItemId: r.poItemId, receivedQty };
      return {
        poItemId: r.poItemId,
        receivedQty,
        receivedUnitPrice: parseInt(r.receivedUnitPrice.replace(/\D/g, ''), 10) || 0,
      };
    });
    const vatAmount = parseInt(vatAmountInput.replace(/\D/g, ''), 10) || 0;

    setReceiving(true);
    const result = await receivePurchaseOrder(po.id, { lines, vatAmount });
    setReceiving(false);
    if (result) {
      const details: string[] = [];
      if (result.voucherNo) details.push(`رسید انبار ${result.voucherNo}`);
      if (result.hasDiscrepancy) details.push('مغایرت با سفارش به مدیر اطلاع داده شد');
      if (!canSeePrices) details.push('سند هزینه برای تأیید مدیر ارسال شد');
      showToast('دریافت کالا ثبت شد', 'success', details.join(' — ') || undefined);
      setShowReceive(false);
    } else {
      showToast(poError || 'خطا در ثبت دریافت کالا', 'danger');
    }
  }

  if (!hydrated || !user) return null;

  if (!poLoaded) {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-40 bg-stone-100 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <button onClick={() => router.push('/purchase-orders')} className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800">
            <ArrowRight size={14} strokeWidth={1.5} />
            بازگشت به سفارش خرید
          </button>
          <Card><CardBody><Empty title="سفارش خرید پیدا نشد" icon={ShoppingCart} /></CardBody></Card>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === 'SuperAdmin';
  const branchMatch = isAdmin || user.assignedBranch === po.branchId;
  const canManage = user.role !== 'Warehouse' && branchMatch;
  const canEditItems = canManage && po.status === 'draft';
  const transitions = canManage ? ALLOWED_TRANSITIONS[po.status] : [];
  const suppliers = contacts.filter(c => c.type === 'supplier');
  const branchItems = invItems.filter(it => it.branchId === po.branchId);
  const editEstTotal = editRows.reduce((s, r) => s + rowTotal(r), 0);
  const canSeePrices = user.role !== 'Warehouse';
  const receiveEstTotal = receiveRows.reduce((s, r) => s + receiveRowTotal(r, canSeePrices), 0);
  const canReceive = branchMatch && po.status === 'sent';

  const branchLabel = branches.find(b => b.id === po.branchId)?.name ?? '—';
  const supplierLabel = po.supplierId ? (contacts.find(c => c.id === po.supplierId)?.name ?? '—') : '—';

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => router.push('/purchase-orders')} className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800">
            <ArrowRight size={14} strokeWidth={1.5} />
            بازگشت به سفارش خرید
          </button>
          {!editing && !showReceive && (
            <div className="flex items-center gap-2">
              {canEditItems && (
                <Button variant="default" size="sm" icon={Pencil} onClick={startEdit}>ویرایش</Button>
              )}
              {canEditItems && (
                <Button variant="danger" size="sm" icon={Trash2} loading={deleting} onClick={handleDelete}>حذف</Button>
              )}
              {canReceive && (
                <Button variant="primary" size="sm" icon={PackageCheck} onClick={openReceive}>دریافت کالا</Button>
              )}
              {transitions.includes('sent') && (
                <Button variant="primary" size="sm" icon={Send} loading={transitioning} onClick={() => handleTransition('sent')}>ارسال سفارش</Button>
              )}
              {transitions.includes('cancelled') && (
                <Button variant="danger" size="sm" icon={Ban} loading={transitioning} onClick={() => handleTransition('cancelled')}>لغو سفارش</Button>
              )}
            </div>
          )}
        </div>

        {/* Info */}
        <Card>
          <CardBody>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="تأمین‌کننده">
                    <Select value={editSupplierId} onChange={e => setEditSupplierId(e.target.value)}>
                      <option value="">بدون تأمین‌کننده</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="تاریخ تحویل مورد انتظار">
                    <JalaliDatePicker value={editExpectedDate} onChange={setEditExpectedDate} />
                  </Field>
                </div>

                <div className="space-y-2">
                  <div className="text-[12px] text-stone-500">اقلام سفارش</div>
                  {editRows.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Select
                        className="flex-1 min-w-[140px]"
                        value={r.inventoryItemId}
                        onChange={e => onPickInvItem(i, e.target.value)}
                      >
                        <option value="">آیتم آزاد (توضیح دستی)</option>
                        {branchItems.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </Select>
                      <Input
                        className="flex-[1.5] min-w-[160px]"
                        placeholder="توضیح"
                        value={r.description}
                        onChange={e => setEditRow(i, { description: e.target.value })}
                      />
                      <Input
                        className="w-24" dir="ltr" inputMode="numeric" placeholder="مقدار"
                        value={r.qty}
                        onChange={e => setEditRow(i, { qty: formatNumericInputValue(e.target) })}
                      />
                      {r.inventoryItemId && (
                        <div className="w-14 text-[11px] text-muted text-center shrink-0">
                          {UNIT_LABELS[branchItems.find(it => it.id === r.inventoryItemId)?.unit ?? ''] ?? ''}
                        </div>
                      )}
                      <Input
                        className="w-28" dir="ltr" inputMode="numeric" placeholder="بهای واحد"
                        value={r.unitCost}
                        onChange={e => setEditRow(i, { unitCost: formatNumericInputValue(e.target) })}
                      />
                      <div className="w-24 text-[12px] text-stone-600 tabular-nums text-end">{fmt(rowTotal(r))}</div>
                      {editRows.length > 1 && (
                        <button onClick={() => setEditRows(prev => prev.filter((_, idx) => idx !== i))} className="text-muted hover:text-rose-600 px-1">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setEditRows(prev => [...prev, { ...emptyRow }])} className="flex items-center justify-center gap-1.5 w-full py-2.5 text-[12.5px] text-muted border border-dashed border-border rounded-lg hover:bg-bg hover:text-text hover:border-text/30 transition-colors mt-1">
                    <Plus size={13} />
                    افزودن قلم
                  </button>
                  <div className="text-[12.5px] text-stone-700 text-end pt-1 border-t border-stone-100">
                    جمع برآوردی: <span className="tabular-nums font-medium">{fmt(editEstTotal)}</span> تومان
                  </div>
                </div>

                <Field label="یادداشت">
                  <Textarea rows={2} value={editNote} onChange={e => setEditNote(e.target.value)} />
                </Field>

                <div className="flex gap-2 justify-end">
                  <Button variant="default" size="sm" icon={X} onClick={() => setEditing(false)}>لغو</Button>
                  <Button
                    variant="primary" size="sm" icon={Check} loading={saving} onClick={saveEdit}
                    disabled={editRows.every(r => !r.description.trim() || (parseInt(r.qty.replace(/\D/g, ''), 10) || 0) <= 0)}
                  >
                    ذخیره
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-md bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <ShoppingCart size={18} strokeWidth={1.5} className="text-stone-600" />
                    </div>
                    <div>
                      <div className="text-[15px] text-stone-900 font-medium" dir="ltr">{po.no}</div>
                      <div className="text-[11px] text-muted">{supplierLabel}</div>
                    </div>
                  </div>
                  <Chip tone={STATUS_TONES[po.status]}>{STATUS_LABELS[po.status]}</Chip>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[12px]">
                  {isAdmin && (
                    <div>
                      <div className="text-muted mb-0.5">شعبه</div>
                      <div className="text-stone-700">{branchLabel}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-muted mb-0.5">تاریخ تحویل مورد انتظار</div>
                    <div className="text-stone-700 tabular-nums">{po.expectedDate || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted mb-0.5">جمع برآوردی</div>
                    <div className="text-stone-700 tabular-nums">{fmt(po.estTotal)} تومان</div>
                  </div>
                  {po.finalTotal != null && (
                    <div>
                      <div className="text-muted mb-0.5">جمع نهایی</div>
                      <div className="text-stone-700 tabular-nums">{fmt(po.finalTotal)} تومان</div>
                    </div>
                  )}
                </div>

                {po.note && (
                  <div className="text-[12px] text-stone-600 bg-stone-50/60 rounded-md p-3">{po.note}</div>
                )}

                {po.status === 'received' && (
                  <div className="text-[11.5px] text-emerald-700 bg-emerald-50/60 rounded-md p-3 space-y-1">
                    <div>کالای این سفارش دریافت شد{po.refInvVoucherId ? ' و رسید ورود به انبار ثبت شد' : ''}.</div>
                    <div>
                      سند هزینه (نسیه) برای تأمین‌کننده ثبت شد
                      {po.finalTotal != null ? ` — مبلغ ${fmt(po.finalTotal)} تومان` : ''}.
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Receive goods */}
        {showReceive && (
          <Card>
            <CardHeader title="دریافت کالا" sub="مقدار دریافت‌شده‌ی هر قلم را تأیید کنید — مقدار پیش‌فرض برابر سفارش است" />
            <CardBody className="space-y-3">
              {!canSeePrices && (
                <div className="text-[11px] text-stone-500 bg-stone-50/60 rounded-md p-3">
                  به‌عنوان انباردار فقط مقدار دریافتی را ثبت می‌کنید؛ بها طبق سفارش محاسبه می‌شود
                  و سند هزینه پس از این، در انتظار تأیید مدیر می‌ماند.
                </div>
              )}
              {receiveRows.map((r, i) => (
                <div key={r.poItemId} className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[160px] text-[12.5px] text-stone-800">{r.description}</div>
                  <div className="text-[11px] text-muted tabular-nums w-24 text-center">
                    سفارش: {fmt(r.orderedQty)} {UNIT_LABELS[r.unit] ?? ''}
                  </div>
                  <Input
                    className="w-24" dir="ltr" inputMode="numeric" placeholder="دریافتی"
                    value={r.receivedQty}
                    onChange={e => setReceiveRow(i, { receivedQty: formatNumericInputValue(e.target) })}
                  />
                  {r.unit && (
                    <div className="w-14 text-[11px] text-muted text-center shrink-0">{UNIT_LABELS[r.unit] ?? ''}</div>
                  )}
                  {canSeePrices && (
                    <>
                      <Input
                        className="w-28" dir="ltr" inputMode="numeric" placeholder="بهای واحد"
                        value={r.receivedUnitPrice}
                        onChange={e => setReceiveRow(i, { receivedUnitPrice: formatNumericInputValue(e.target) })}
                      />
                      <div className="w-24 text-[12px] text-stone-600 tabular-nums text-end">{fmt(receiveRowTotal(r, canSeePrices))}</div>
                    </>
                  )}
                </div>
              ))}

              {canSeePrices && (
                <div className="flex flex-wrap items-end justify-between gap-3 pt-1 border-t border-stone-100">
                  <Field label="مالیات ارزش‌افزوده (اختیاری)">
                    <Input
                      className="w-40" dir="ltr" inputMode="numeric" placeholder="۰"
                      value={vatAmountInput}
                      onChange={e => setVatAmountInput(formatNumericInputValue(e.target))}
                    />
                  </Field>
                  <div className="text-[12.5px] text-stone-700 text-end">
                    جمع دریافتی: <span className="tabular-nums font-medium">
                      {fmt(receiveEstTotal + (parseInt(vatAmountInput.replace(/\D/g, ''), 10) || 0))}
                    </span> تومان
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => setShowReceive(false)}>لغو</Button>
                <Button variant="primary" size="sm" icon={PackageCheck} loading={receiving} onClick={handleReceive}>
                  ثبت دریافت
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Items */}
        {!editing && !showReceive && (
          <Card>
            <CardHeader title="اقلام سفارش" sub={`${po.items.length} قلم`} />
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="bg-stone-50/50 border-b border-stone-100">
                  <tr>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">شرح</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">مقدار</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">واحد</th>
                    <th className="text-end text-[11px] text-stone-500 font-normal px-3 py-3">بهای واحد</th>
                    <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {po.items.map(it => (
                    <tr key={it.id} className="border-b border-stone-50 last:border-b-0">
                      <td className="px-5 py-3 text-[12.5px] text-stone-800">{it.description}</td>
                      <td className="px-3 py-3 text-center text-[12px] text-stone-600 tabular-nums">{fmt(it.qty)}</td>
                      <td className="px-3 py-3 text-center text-[11px] text-muted">
                        {it.inventoryItemId ? (UNIT_LABELS[invItems.find(i => i.id === it.inventoryItemId)?.unit ?? ''] ?? '—') : '—'}
                      </td>
                      <td className="px-3 py-3 text-end text-[12px] text-stone-600 tabular-nums">{fmt(it.unitCost)}</td>
                      <td className="px-5 py-3 text-end text-[12.5px] text-stone-700 tabular-nums">{fmt(it.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
