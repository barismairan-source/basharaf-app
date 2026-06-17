'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Plus, Trash2, Sparkles } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Empty, Chip, Checkbox, JalaliDatePicker, Textarea } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, formatNumericInputValue } from '@/lib/utils';
import type { InventoryItem, PoStatus, PoSuggestionItem } from '@/types';

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

interface SuggestRow {
  itemId: string;
  name: string;
  unit: string;
  currentQty: number;
  minQty: number;
  qty: string;
  unitCost: string;
  selected: boolean;
}

function suggestRowTotal(r: SuggestRow): number {
  const qty = parseInt(r.qty.replace(/\D/g, ''), 10) || 0;
  const unitCost = parseInt(r.unitCost.replace(/\D/g, ''), 10) || 0;
  return qty * unitCost;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const contacts = useAppStore(s => s.contacts);
  const loadContacts = useAppStore(s => s.loadContacts);
  const purchaseOrders = useAppStore(s => s.purchaseOrders);
  const poLoaded = useAppStore(s => s.poLoaded);
  const loadPurchaseOrders = useAppStore(s => s.loadPurchaseOrders);
  const createPurchaseOrder = useAppStore(s => s.createPurchaseOrder);
  const poError = useAppStore(s => s.poError);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [invItems, setInvItems] = useState<InventoryItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([{ ...emptyRow }]);
  const [adding, setAdding] = useState(false);

  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestRows, setSuggestRows] = useState<SuggestRow[]>([]);
  const [suggestSupplierId, setSuggestSupplierId] = useState('');
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    setHydrated(true);
    loadPurchaseOrders();
    loadContacts();
    fetch('/api/inventory/items', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.items) setInvItems(data.items); })
      .catch(() => {});
  }, [loadPurchaseOrders, loadContacts]);

  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.assignedBranch) setBranchId(user.assignedBranch);
    else if (branches[0] && !branchId) setBranchId(branches[0].id);
  }, [user, branches, branchId]);

  // ورود از کارت «زیر حداقل» داشبورد انبار: ?suggestBranch=<branchId>
  useEffect(() => {
    if (typeof window === 'undefined' || user?.role === 'Warehouse') return;
    const sp = new URLSearchParams(window.location.search);
    const sb = sp.get('suggestBranch');
    if (sb) {
      openSuggestions(sb);
      window.history.replaceState({}, '', '/purchase-orders');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!hydrated || !user) return null;
  const isAdmin = user.role === 'SuperAdmin';

  const suppliers = contacts.filter(c => c.type === 'supplier');
  const branchItems = invItems.filter(it => it.branchId === branchId);
  const estTotal = rows.reduce((s, r) => s + rowTotal(r), 0);

  function branchName(id: string) {
    return branches.find(b => b.id === id)?.name ?? '—';
  }

  function supplierName(id: string | null) {
    if (!id) return '—';
    return contacts.find(c => c.id === id)?.name ?? '—';
  }

  function resetForm() {
    setSupplierId(''); setExpectedDate(''); setNote(''); setRows([{ ...emptyRow }]);
    if (!isAdmin && user?.assignedBranch) setBranchId(user.assignedBranch);
  }

  function setRow(i: number, patch: Partial<ItemRow>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  function onPickInvItem(i: number, itemId: string) {
    const item = invItems.find(it => it.id === itemId);
    setRow(i, { inventoryItemId: itemId, description: item ? item.name : '' });
  }

  async function handleAdd() {
    const validItems = rows
      .map(r => ({
        inventoryItemId: r.inventoryItemId || null,
        description: r.description.trim(),
        qty: parseInt(r.qty.replace(/\D/g, ''), 10) || 0,
        unitCost: parseInt(r.unitCost.replace(/\D/g, ''), 10) || 0,
      }))
      .filter(it => it.description && it.qty > 0);

    if (!branchId || validItems.length === 0) return;

    setAdding(true);
    const created = await createPurchaseOrder({
      branchId,
      supplierId: supplierId || null,
      expectedDate: expectedDate || null,
      note: note.trim(),
      items: validItems,
    });
    setAdding(false);
    if (created) {
      showToast('سفارش خرید ثبت شد', 'success', created.no);
      setShowAdd(false);
      resetForm();
    } else {
      showToast(poError || 'خطا در ثبت سفارش خرید', 'danger');
    }
  }

  async function openSuggestions(targetBranchId?: string) {
    const bId = targetBranchId || branchId;
    if (!bId) return;
    if (targetBranchId && targetBranchId !== branchId) setBranchId(targetBranchId);

    setSuggestLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/suggestions?branchId=${bId}`, { credentials: 'include' });
      const data = (await res.json()) as { items?: PoSuggestionItem[]; error?: string };
      if (!res.ok || !data.items) throw new Error(data.error ?? 'خطا');
      setSuggestRows(data.items.map(it => ({
        itemId: it.id,
        name: it.name,
        unit: it.unit,
        currentQty: it.currentQty,
        minQty: it.minQty,
        qty: it.suggestedQty.toLocaleString('en-US'),
        unitCost: it.suggestedUnitCost.toLocaleString('en-US'),
        selected: true,
      })));
      setSuggestSupplierId('');
      setShowSuggest(true);
    } catch {
      showToast('خطا در دریافت پیشنهاد سفارش', 'danger');
    }
    setSuggestLoading(false);
  }

  function setSuggestRow(i: number, patch: Partial<SuggestRow>) {
    setSuggestRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  async function handleConvert() {
    const items = suggestRows
      .filter(r => r.selected)
      .map(r => ({
        inventoryItemId: r.itemId,
        description: r.name,
        qty: parseInt(r.qty.replace(/\D/g, ''), 10) || 0,
        unitCost: parseInt(r.unitCost.replace(/\D/g, ''), 10) || 0,
      }))
      .filter(it => it.qty > 0);

    if (!branchId || items.length === 0) return;

    setConverting(true);
    const created = await createPurchaseOrder({
      branchId,
      supplierId: suggestSupplierId || null,
      note: 'پیشنهاد خودکار — اقلام زیر حداقل موجودی',
      items,
    });
    setConverting(false);
    if (created) {
      showToast('سفارش پیش‌نویس از روی پیشنهاد ایجاد شد', 'success', created.no);
      setShowSuggest(false);
      router.push(`/purchase-orders/${created.id}`);
    } else {
      showToast(poError || 'خطا در ایجاد سفارش', 'danger');
    }
  }

  const canCreate = user.role !== 'Warehouse';

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">سفارش خرید</h1>
            <div className="text-[12px] text-stone-500 mt-1">ثبت و پیگیری سفارش‌های خرید از تأمین‌کنندگان</div>
          </div>
          {canCreate && (
            <div className="flex gap-2">
              <Button variant="default" size="sm" icon={Sparkles} loading={suggestLoading} onClick={() => openSuggestions()}>پیشنهاد سفارش</Button>
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>سفارش جدید</Button>
            </div>
          )}
        </div>

        {/* Suggestions panel */}
        {showSuggest && (
          <Card>
            <CardHeader title="پیشنهاد سفارش — اقلام زیر حداقل موجودی" sub={`شعبه: ${branchName(branchId)}`} />
            <CardBody className="space-y-3">
              {isAdmin && (
                <Field label="شعبه">
                  <Select value={branchId} onChange={e => openSuggestions(e.target.value)}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
              )}

              {suggestRows.length === 0 ? (
                <div className="text-[12.5px] text-stone-500 py-2">همه‌ی اقلام این شعبه بالاتر از حداقل موجودی هستند.</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {suggestRows.map((r, i) => (
                      <div key={r.itemId} className="flex flex-wrap items-center gap-2">
                        <Checkbox checked={r.selected} onChange={e => setSuggestRow(i, { selected: e.target.checked })} />
                        <div className="flex-1 min-w-[140px] text-[12.5px] text-stone-800">{r.name}</div>
                        <div className="text-[11px] text-stone-400 tabular-nums w-32 text-center">
                          موجودی: {fmt(r.currentQty)} / حداقل: {fmt(r.minQty)} {UNIT_LABELS[r.unit] ?? ''}
                        </div>
                        <Input
                          className="w-24" dir="ltr" inputMode="numeric" placeholder="مقدار"
                          value={r.qty}
                          onChange={e => setSuggestRow(i, { qty: formatNumericInputValue(e.target) })}
                        />
                        <div className="w-14 text-[11px] text-stone-400 text-center shrink-0">{UNIT_LABELS[r.unit] ?? ''}</div>
                        <Input
                          className="w-28" dir="ltr" inputMode="numeric" placeholder="بهای واحد"
                          value={r.unitCost}
                          onChange={e => setSuggestRow(i, { unitCost: formatNumericInputValue(e.target) })}
                        />
                        <div className="w-24 text-[12px] text-stone-600 tabular-nums text-end">{fmt(suggestRowTotal(r))}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-stone-100">
                    <Field label="تأمین‌کننده (اختیاری)">
                      <Select value={suggestSupplierId} onChange={e => setSuggestSupplierId(e.target.value)}>
                        <option value="">بدون تأمین‌کننده</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </Select>
                    </Field>
                    <div className="text-[12.5px] text-stone-700 self-center text-end">
                      جمع برآوردی: <span className="tabular-nums font-medium">
                        {fmt(suggestRows.filter(r => r.selected).reduce((s, r) => s + suggestRowTotal(r), 0))}
                      </span> تومان
                    </div>
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => setShowSuggest(false)}>لغو</Button>
                {suggestRows.length > 0 && (
                  <Button
                    variant="primary" size="sm" icon={Plus} loading={converting}
                    disabled={suggestRows.every(r => !r.selected)}
                    onClick={handleConvert}
                  >
                    تبدیل به سفارش پیش‌نویس
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Add form */}
        {showAdd && (
          <Card>
            <CardHeader title="افزودن سفارش خرید" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isAdmin && (
                  <Field label="شعبه">
                    <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                )}
                <Field label="تأمین‌کننده (اختیاری)">
                  <Select value={supplierId} onChange={e => setSupplierId(e.target.value)}>
                    <option value="">بدون تأمین‌کننده</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="تاریخ تحویل مورد انتظار (اختیاری)">
                  <JalaliDatePicker value={expectedDate} onChange={setExpectedDate} />
                </Field>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="text-[12px] text-stone-500">اقلام سفارش</div>
                {rows.map((r, i) => (
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
                      onChange={e => setRow(i, { description: e.target.value })}
                    />
                    <Input
                      className="w-24" dir="ltr" inputMode="numeric" placeholder="مقدار"
                      value={r.qty}
                      onChange={e => setRow(i, { qty: formatNumericInputValue(e.target) })}
                    />
                    {r.inventoryItemId && (
                      <div className="w-14 text-[11px] text-stone-400 text-center shrink-0">
                        {UNIT_LABELS[branchItems.find(it => it.id === r.inventoryItemId)?.unit ?? ''] ?? ''}
                      </div>
                    )}
                    <Input
                      className="w-28" dir="ltr" inputMode="numeric" placeholder="بهای واحد"
                      value={r.unitCost}
                      onChange={e => setRow(i, { unitCost: formatNumericInputValue(e.target) })}
                    />
                    <div className="w-24 text-[12px] text-stone-600 tabular-nums text-end">{fmt(rowTotal(r))}</div>
                    {rows.length > 1 && (
                      <button onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))} className="text-stone-400 hover:text-rose-600 px-1">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setRows(prev => [...prev, { ...emptyRow }])} className="text-[12px] text-stone-500 flex items-center gap-1">
                  <Plus size={13} />افزودن قلم
                </button>
                <div className="text-[12.5px] text-stone-700 text-end pt-1 border-t border-stone-100">
                  جمع برآوردی: <span className="tabular-nums font-medium">{fmt(estTotal)}</span> تومان
                </div>
              </div>

              <Field label="یادداشت (اختیاری)">
                <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} />
              </Field>

              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => { setShowAdd(false); resetForm(); }}>لغو</Button>
                <Button
                  variant="primary" size="sm" icon={Plus} loading={adding} onClick={handleAdd}
                  disabled={!branchId || rows.every(r => !r.description.trim() || (parseInt(r.qty.replace(/\D/g, ''), 10) || 0) <= 0)}
                >
                  ثبت سفارش
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* List */}
        {poLoaded && purchaseOrders.length === 0 ? (
          <Card><CardBody><Empty title="سفارش خریدی ثبت نشده" icon={ShoppingCart} /></CardBody></Card>
        ) : (
          <Card>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-stone-50/50 border-b border-stone-100">
                  <tr>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">شماره سفارش</th>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-3 py-3">تأمین‌کننده</th>
                    {isAdmin && <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">شعبه</th>}
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">اقلام</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">وضعیت</th>
                    <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">جمع برآوردی</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseOrders.map(po => (
                    <tr
                      key={po.id}
                      className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50 cursor-pointer"
                      onClick={() => router.push(`/purchase-orders/${po.id}`)}
                    >
                      <td className="px-5 py-3">
                        <span className="text-[12.5px] text-stone-800" dir="ltr">{po.no}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-[12px] text-stone-600">{supplierName(po.supplierId)}</span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-center">
                          <span className="text-[11.5px] text-stone-500">{branchName(po.branchId)}</span>
                        </td>
                      )}
                      <td className="px-3 py-3 text-center">
                        <span className="text-[11.5px] text-stone-500 tabular-nums">{toFaCount(po.items.length)}</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Chip tone={STATUS_TONES[po.status]}>{STATUS_LABELS[po.status]}</Chip>
                      </td>
                      <td className="px-5 py-3 text-end">
                        <span className="text-[12.5px] text-stone-700 tabular-nums">{fmt(po.estTotal)}</span>
                      </td>
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

function toFaCount(n: number): string {
  return fmt(n);
}
