'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, FileText, Plus, Trash2, FileSpreadsheet, Download, Upload, X, AlertTriangle } from 'lucide-react';
import type { ToastTone } from '@/components/ui/Toast';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { fmt, formatNumericInputValue } from '@/lib/utils';
import { JalaliDatePicker } from '@/components/ui';
import { getTodayJalali, isValidJalaliString } from '@/lib/jalali';
import type { InventoryItem, InvVoucherKind } from '@/types';

const repos = createRepos(null as never);

const UNIT_LABELS: Record<string, string> = {
  kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر',
  pcs: 'عدد', can: 'قوطی', pack: 'بسته',
};

type Mode = 'voucher' | 'quickbuy';

export default function ReceivePage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const showToast = useAppStore((s) => s.showToast);

  const defaultBranch = (() => {
    if (!user) return '';
    if (user.role !== 'SuperAdmin') return user.assignedBranch ?? '';
    return branches[0]?.id ?? '';
  })();

  const isWarehouse = user?.role === 'Warehouse';
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const canSeePrices = !isWarehouse || isSuperAdmin;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>('voucher');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const its = await repos.inventory.listItems();
      setItems(its);
    } catch {
      showToast('خطا در بارگذاری', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-[17px] font-semibold text-text">دریافت بار</h1>

      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setMode('voucher')}
          className={`px-4 py-2.5 text-[12.5px] border-b-2 -mb-px transition-colors ${mode === 'voucher' ? 'border-text text-text font-medium' : 'border-transparent text-muted'}`}
        >
          ثبت برگه
        </button>
        <button
          onClick={() => setMode('quickbuy')}
          className={`px-4 py-2.5 text-[12.5px] border-b-2 -mb-px transition-colors ${mode === 'quickbuy' ? 'border-text text-text font-medium' : 'border-transparent text-muted'}`}
        >
          خرید سریع
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted" size={24} /></div>
      ) : mode === 'voucher' ? (
        <VoucherForm
          items={items}
          branches={branches}
          defaultBranch={defaultBranch}
          isSuperAdmin={isSuperAdmin}
          isWarehouse={isWarehouse}
          canSeePrices={canSeePrices}
          onDone={load}
          showToast={showToast}
        />
      ) : (
        <QuickBuyForm
          items={items}
          branches={branches}
          defaultBranch={defaultBranch}
          isSuperAdmin={isSuperAdmin}
          onDone={load}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function VoucherForm({
  items, branches, defaultBranch, isSuperAdmin, isWarehouse, canSeePrices, onDone, showToast,
}: {
  items: InventoryItem[];
  branches: { id: string; name: string }[];
  defaultBranch: string;
  isSuperAdmin: boolean;
  isWarehouse: boolean;
  canSeePrices: boolean;
  onDone: () => void;
  showToast: (m: string, t?: ToastTone) => void;
}) {
  const [kind, setKind] = useState<InvVoucherKind>(isWarehouse ? 'out' : 'in');
  const [branchId, setBranchId] = useState(defaultBranch);
  const [date, setDate] = useState(getTodayJalali());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<{ itemId: string; qty: string; cost: string }[]>([
    { itemId: '', qty: '', cost: '' },
  ]);
  const [saving, setSaving] = useState(false);

  function setLine(i: number, patch: Partial<{ itemId: string; qty: string; cost: string }>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ شمسی نامعتبر است', 'danger'); return; }
    const valid = lines.filter(
      (l) => l.itemId && parseInt(l.qty.replace(/\D/g, ''), 10) > 0
    );
    if (valid.length === 0) { showToast('حداقل یک قلم با مقدار', 'danger'); return; }
    setSaving(true);
    try {
      await (createRepos(null as never).inventory as any).createVoucher({
        kind, branchId, date, note: note || undefined,
        lines: valid.map((l) => ({
          itemId: l.itemId,
          qtyBase: parseInt(l.qty.replace(/\D/g, ''), 10),
          estUnitCost: l.cost ? parseInt(l.cost.replace(/\D/g, ''), 10) : undefined,
        })),
      });
      showToast('برگه ثبت شد (در انتظار تأیید)', 'success');
      setLines([{ itemId: '', qty: '', cost: '' }]);
      setNote('');
      onDone();
    } catch {
      showToast('خطا در ثبت برگه', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
      {!isWarehouse && (
        <div className="flex justify-end">
          <VouchersImport onDone={onDone} showToast={showToast} />
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-[11.5px] text-muted">نوع برگه</label>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as InvVoucherKind)}
            className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text h-11"
          >
            {!isWarehouse && <option value="in">رسید (خرید)</option>}
            <option value="out">حواله (مصرف)</option>
            <option value="waste">ضایعات</option>
          </select>
        </div>
        {isSuperAdmin && (
          <div>
            <label className="text-[11.5px] text-muted">شعبه<span className="text-danger">*</span></label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text h-11"
            >
              <option value="">— انتخاب —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-[11.5px] text-muted">تاریخ</label>
          <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11.5px] text-muted">اقلام</label>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <select
              value={l.itemId}
              onChange={(e) => setLine(i, { itemId: e.target.value })}
              className="flex-1 border border-border rounded-lg px-2 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
            >
              <option value="">— قلم —</option>
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({UNIT_LABELS[it.unit] ?? it.unit})
                </option>
              ))}
            </select>
            <input
              value={l.qty}
              onChange={(e) => setLine(i, { qty: formatNumericInputValue(e.target) })}
              dir="ltr"
              placeholder="مقدار"
              className="w-28 border border-border rounded-lg px-2 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
            />
            {kind === 'in' && canSeePrices && (
              <input
                value={l.cost}
                onChange={(e) => setLine(i, { cost: formatNumericInputValue(e.target) })}
                dir="ltr"
                placeholder="بهای واحد"
                className="w-28 border border-border rounded-lg px-2 py-2 text-[12.5px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
              />
            )}
            {lines.length > 1 && (
              <button
                onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                className="w-11 h-11 flex items-center justify-center text-muted hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setLines((prev) => [...prev, { itemId: '', qty: '', cost: '' }])}
          className="flex items-center gap-1 text-[12px] text-muted hover:text-text py-1"
        >
          <Plus size={13} />افزودن قلم
        </button>
      </div>

      <div>
        <label className="text-[11.5px] text-muted">توضیح (اختیاری)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
        />
      </div>

      <button
        onClick={submit}
        disabled={saving}
        className="flex items-center gap-1.5 bg-text text-surface px-4 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
        ثبت برگه
      </button>
    </div>
  );
}

function QuickBuyForm({
  items, branches, defaultBranch, isSuperAdmin, onDone, showToast,
}: {
  items: InventoryItem[];
  branches: { id: string; name: string }[];
  defaultBranch: string;
  isSuperAdmin: boolean;
  onDone: () => void;
  showToast: (m: string, t?: ToastTone) => void;
}) {
  const [branchId, setBranchId] = useState(defaultBranch);
  const [date, setDate] = useState(getTodayJalali());
  const [rows, setRows] = useState<Array<{ itemId: string; qty: string }>>([{ itemId: '', qty: '' }]);
  const [totalAmount, setTotalAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const branchItems = items.filter((it) => it.isActive && (!branchId || it.branchId === branchId));

  function setRow(i: number, patch: Partial<{ itemId: string; qty: string }>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  const validRows = rows
    .map((r) => ({ itemId: r.itemId, qty: parseFloat((r.qty || '').replace(/[^0-9.]/g, '')) || 0 }))
    .filter((r) => r.itemId && r.qty > 0);
  const total = parseInt((totalAmount || '').replace(/\D/g, ''), 10) || 0;

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ نامعتبر', 'danger'); return; }
    if (validRows.length === 0) { showToast('حداقل یک قلم با مقدار وارد کنید', 'danger'); return; }

    const totalQty = validRows.reduce((s, r) => s + r.qty, 0);
    const lines = validRows.map((r) => {
      const share = total > 0 && totalQty > 0 ? total * (r.qty / totalQty) : 0;
      const unitCost = r.qty > 0 ? Math.round(share / r.qty) : 0;
      return { itemId: r.itemId, qtyBase: r.qty, estUnitCost: unitCost };
    });

    setSaving(true);
    try {
      await (createRepos(null as never).inventory as any).createVoucher({
        kind: 'in', branchId, date,
        note: total > 0 ? `خرید سریع — جمع ${fmt(total)} تومان` : 'خرید سریع',
        lines,
      });
      showToast('خرید سریع ثبت شد (در انتظار تأیید)', 'success');
      setRows([{ itemId: '', qty: '' }]);
      setTotalAmount('');
      onDone();
    } catch {
      showToast('خطا در ثبت خرید', 'danger');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 space-y-4">
      <div className="text-[12px] text-muted">
        برای خریدهای کوچک و سریع: قلم و مقدار را وارد کنید، مبلغ کل بین اقلام به نسبت مقدار پخش می‌شود.
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isSuperAdmin && (
          <div>
            <label className="text-[11.5px] text-muted">شعبه<span className="text-danger">*</span></label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text h-11"
            >
              <option value="">— انتخاب —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className="text-[11.5px] text-muted">تاریخ</label>
          <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11.5px] text-muted">اقلام خریداری‌شده</label>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={r.itemId}
              onChange={(e) => setRow(i, { itemId: e.target.value })}
              disabled={!branchId}
              className="flex-1 border border-border rounded-lg px-2 py-2 text-[12.5px] disabled:bg-bg focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
            >
              <option value="">— انتخاب قلم —</option>
              {branchItems.map((it) => (
                <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>
              ))}
            </select>
            <input
              value={r.qty}
              onChange={(e) => setRow(i, { qty: e.target.value })}
              dir="ltr"
              placeholder="مقدار"
              className="w-24 border border-border rounded-lg px-2 py-2 text-[12.5px] text-center focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
            />
            <button
              onClick={() => setRows((prev) => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev)}
              className="w-11 h-11 flex items-center justify-center text-muted hover:text-danger"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setRows((prev) => [...prev, { itemId: '', qty: '' }])}
          className="flex items-center gap-1 text-[12px] text-muted hover:text-text py-1"
        >
          <Plus size={13} />افزودن قلم
        </button>
      </div>

      <div>
        <label className="text-[11.5px] text-muted">مبلغ کل خرید (تومان، اختیاری)</label>
        <input
          value={totalAmount}
          onChange={(e) => setTotalAmount(formatNumericInputValue(e.target))}
          dir="ltr"
          placeholder="مثلاً ۲۵۰٬۰۰۰"
          className="w-full border border-border rounded-lg px-3 py-2.5 text-[13px] mt-1 focus:outline-none focus:ring-1 focus:ring-accent bg-surface text-text"
        />
      </div>

      <button
        onClick={submit}
        disabled={saving || validRows.length === 0}
        className="flex items-center gap-1.5 bg-text text-surface px-4 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
        ثبت خرید سریع
      </button>
      <p className="text-[11px] text-muted">
        این خرید در کارتابل ثبت می‌شود و با تأیید، موجودی بالا می‌رود و سند هزینه ساخته می‌شود.
      </p>
    </div>
  );
}

function VouchersImport({ onDone, showToast }: {
  onDone: () => void;
  showToast: (m: string, t?: ToastTone) => void;
}) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function downloadTemplate() {
    try {
      const res = await fetch('/api/inventory/vouchers/import/template', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'basharaf-purchase-vouchers-template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('خطا در دانلود تمپلیت', 'danger');
    }
  }

  async function doImport() {
    if (!file) { showToast('فایل اکسل را انتخاب کنید', 'danger'); return; }
    setBusy(true); setErrors([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/inventory/vouchers/import', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`${data.vouchers} برگه (${data.imported} قلم) ساخته شد`, 'success');
        setFile(null); setOpen(false); onDone();
      } else {
        setErrors(data.errors ?? ['خطای نامشخص']);
      }
    } catch {
      showToast('خطا در ورود فایل', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-[12.5px] text-muted hover:text-text min-h-[44px]"
      >
        <FileSpreadsheet size={14} />ورود دسته‌ای رسید
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-surface rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[16px] font-medium text-text">ورود دسته‌ای رسید خرید</h2>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            <p className="text-[11.5px] text-muted mb-4 leading-relaxed">
              هر ردیف = یک قلم. ردیف‌هایی با «شماره فاکتور» یکسان در یک برگه جمع می‌شوند.
              کد قلم باید از قبل در سیستم باشد. اگر ردیفی خطا داشته باشد، هیچ برگه‌ای ساخته نمی‌شود.
            </p>
            <div className="space-y-3">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-1.5 border border-border px-3 py-2 rounded-lg text-[12.5px] text-muted hover:text-text min-h-[44px]"
              >
                <Download size={14} />دانلود تمپلیت اکسل
              </button>
              <label className="flex items-center gap-2 border border-dashed border-border rounded-lg p-3 cursor-pointer hover:border-muted">
                <Upload size={16} className="text-muted" />
                <span className="text-[12px] text-muted flex-1 truncate">
                  {file ? file.name : 'فایل اکسل پرشده'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".xlsx,.xls"
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErrors([]); }}
                />
              </label>
              {errors.length > 0 && (
                <div className="bg-danger-subtle rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-danger font-medium mb-1">
                    <AlertTriangle size={14} />هیچ برگه‌ای ساخته نشد:
                  </div>
                  <ul className="text-[11px] text-danger space-y-0.5 max-h-40 overflow-y-auto">
                    {errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={doImport}
                disabled={busy || !file}
                className="flex items-center gap-1.5 bg-text text-surface px-4 py-2.5 rounded-lg text-[13px] disabled:opacity-50 min-h-[44px]"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                ساخت برگه‌ها
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg text-[13px] border border-border text-muted min-h-[44px]"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
