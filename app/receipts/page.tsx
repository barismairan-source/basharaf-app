'use client';

import { useMemo, useState } from 'react';
import { Check, Copy, Plus, Trash2, Receipt, ExternalLink } from 'lucide-react';
import { useAppStore } from '@/store';
import { getTodayJalali } from '@/lib/jalali';

interface ItemRow { name: string; qty: string; unitPrice: string }

function formatToman(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

/** base64url (بدون +، /، =) تا داخل query string سالم بماند — سمت خواندن در app/receipts/view/page.tsx. */
function encodeReceipt(data: object): string {
  const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export default function ReceiptsAdminPage() {
  const user = useAppStore(s => s.user);
  const [hydrated, setHydrated] = useState(false);
  useMemo(() => { setHydrated(true); }, []);

  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ name: '', qty: '1', unitPrice: '' }]);
  const [link, setLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  function updateItem(idx: number, patch: Partial<ItemRow>) {
    setItems(rows => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
    setLink(null);
  }
  function addItem() { setItems(rows => [...rows, { name: '', qty: '1', unitPrice: '' }]); setLink(null); }
  function removeItem(idx: number) { setItems(rows => rows.filter((_, i) => i !== idx)); setLink(null); }

  const validItems = items
    .filter(r => r.name.trim() && Number(r.unitPrice) > 0)
    .map(r => ({ name: r.name.trim(), qty: Math.max(1, Number(r.qty) || 1), unitPrice: Number(r.unitPrice) }));
  const total = validItems.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);

  function handleGenerateLink() {
    if (validItems.length === 0) return;
    const payload = { customerName: customerName.trim() || undefined, items: validItems, date: getTodayJalali() };
    const encoded = encodeReceipt(payload);
    const url = `${window.location.origin}/receipts/view?d=${encoded}`;
    setLink(url);
  }

  async function handleCopyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1500);
    } catch {}
  }

  if (!hydrated) return null;
  if (!user) return <div className="p-10 text-center text-sm text-stone-400">در حال بارگذاری…</div>;
  if (user.role !== 'SuperAdmin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-stone-500">فقط مدیر کل به این بخش دسترسی دارد.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 pb-20 pt-14">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900">
          <Receipt size={20} className="text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-lg font-semibold text-foreground">ساخت فیش برای مشتری</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">اقلام را وارد کنید، لینک بسازید و برای مشتری بفرستید</p>
      </header>

      <div className="mt-7 space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1 block text-[12px] text-muted-foreground">نام مشتری (اختیاری)</label>
          <input value={customerName} onChange={e => { setCustomerName(e.target.value); setLink(null); }}
            className="h-11 w-full rounded-lg border border-stone-200 px-3 text-[13px] focus:border-stone-400 focus:outline-none" />
        </div>

        <div>
          <p className="mb-2 text-[12px] text-muted-foreground">اقلام</p>
          <div className="space-y-2">
            {items.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input placeholder="نام آیتم" value={row.name} onChange={e => updateItem(idx, { name: e.target.value })}
                  className="h-10 flex-1 rounded-lg border border-stone-200 px-3 text-[13px] focus:border-stone-400 focus:outline-none" />
                <input placeholder="تعداد" dir="ltr" value={row.qty} onChange={e => updateItem(idx, { qty: e.target.value.replace(/\D/g, '') })}
                  className="h-10 w-16 rounded-lg border border-stone-200 px-2 text-center text-[13px] focus:border-stone-400 focus:outline-none" />
                <input placeholder="قیمت واحد" dir="ltr" value={row.unitPrice} onChange={e => updateItem(idx, { unitPrice: e.target.value.replace(/\D/g, '') })}
                  className="h-10 w-28 rounded-lg border border-stone-200 px-2 text-[13px] focus:border-stone-400 focus:outline-none" />
                <button onClick={() => removeItem(idx)} className="flex-shrink-0 text-stone-400 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <button onClick={addItem} className="mt-2 flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800">
            <Plus size={13} /> افزودن آیتم
          </button>
        </div>

        {total > 0 && (
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[13px] text-muted-foreground">جمع کل</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{formatToman(total)} تومان</span>
          </div>
        )}

        <button onClick={handleGenerateLink} disabled={validItems.length === 0}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-900 text-[13px] font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          ساخت لینک برای مشتری
        </button>

        {link && (
          <div className="space-y-2 rounded-xl bg-stone-50 p-3">
            <p className="break-all text-[11px] text-stone-500" dir="ltr">{link}</p>
            <div className="flex gap-2">
              <button onClick={handleCopyLink} className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white text-[12px] text-stone-700 hover:bg-stone-100">
                {copiedLink ? <Check size={13} /> : <Copy size={13} />} کپی لینک
              </button>
              <a href={link} target="_blank" rel="noreferrer" className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white text-[12px] text-stone-700 hover:bg-stone-100">
                <ExternalLink size={13} /> مشاهده
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
