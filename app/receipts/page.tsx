'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Plus, Trash2, Receipt, ExternalLink, Search, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/store';

interface ItemRow { name: string; qty: string; unitPrice: string }
interface MenuItemLite { id: string; titleFa: string; price: number | null }
interface MenuSectionLite { id: string; labelFa: string; items: MenuItemLite[] }

function formatToman(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

function isRowEmpty(r: ItemRow): boolean {
  return !r.name.trim() && !r.unitPrice.trim();
}

export default function ReceiptsAdminPage() {
  const user = useAppStore(s => s.user);
  const [hydrated, setHydrated] = useState(false);
  useMemo(() => { setHydrated(true); }, []);

  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ name: '', qty: '1', unitPrice: '' }]);
  const [link, setLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // ── افزودن سریع از منوی واقعی ────────────────────────────────
  const [menuSections, setMenuSections] = useState<MenuSectionLite[]>([]);
  const [menuOpen, setMenuOpen] = useState(true);
  const [menuQuery, setMenuQuery] = useState('');

  useEffect(() => {
    fetch('/api/menu?channel=hall', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : { sections: [] })
      .then(d => setMenuSections(d.sections ?? []))
      .catch(() => {});
  }, []);

  const filteredSections = useMemo(() => {
    const q = menuQuery.trim();
    if (!q) return menuSections;
    return menuSections
      .map(s => ({ ...s, items: s.items.filter(it => it.titleFa.includes(q)) }))
      .filter(s => s.items.length > 0);
  }, [menuSections, menuQuery]);

  function addFromMenu(menuItem: MenuItemLite) {
    if (menuItem.price == null) return;
    setLink(null);
    setItems(rows => {
      const existingIdx = rows.findIndex(r => r.name.trim() === menuItem.titleFa);
      if (existingIdx >= 0) {
        return rows.map((r, i) => (i === existingIdx ? { ...r, qty: String((Number(r.qty) || 0) + 1) } : r));
      }
      const newRow: ItemRow = { name: menuItem.titleFa, qty: '1', unitPrice: String(menuItem.price) };
      // ردیف خالیِ پیش‌فرض اول کار را جایگزین کن، نه این‌که کنارش اضافه شود.
      if (rows.length === 1 && isRowEmpty(rows[0]!)) return [newRow];
      return [...rows, newRow];
    });
  }

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

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  async function handleGenerateLink() {
    if (validItems.length === 0) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch('/api/receipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ customerName: customerName.trim() || undefined, items: validItems }),
      });
      const d = await res.json();
      if (!res.ok) { setGenError(d.error ?? 'خطا در ساخت لینک'); return; }
      setLink(`${window.location.origin}/r/${d.id}`);
    } catch {
      setGenError('خطا در ارتباط با سرور');
    } finally {
      setGenerating(false);
    }
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
        <p className="mt-1 text-[12px] text-muted-foreground">آیتم را از منو انتخاب کنید یا دستی وارد کنید، بعد لینک بسازید</p>
      </header>

      {/* افزودن سریع از منو */}
      <div className="mt-7 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <button onClick={() => setMenuOpen(o => !o)} className="flex w-full items-center gap-2.5 px-5 py-4 text-right">
          <Search size={15} strokeWidth={1.5} className="flex-shrink-0 text-amber-600" />
          <span className="flex-1 text-[13px] font-medium text-foreground">افزودن سریع از منو</span>
          <ChevronDown size={15} className={`text-stone-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>
        {menuOpen && (
          <div className="border-t border-border p-4">
            <input value={menuQuery} onChange={e => setMenuQuery(e.target.value)} placeholder="جست‌وجوی آیتم منو…"
              className="h-10 w-full rounded-lg border border-stone-200 px-3 text-[13px] focus:border-stone-400 focus:outline-none" />
            <div className="mt-3 max-h-72 space-y-4 overflow-y-auto">
              {menuSections.length === 0 && <p className="py-4 text-center text-[12px] text-stone-400">در حال بارگذاری منو…</p>}
              {filteredSections.map(section => (
                <div key={section.id}>
                  <p className="mb-1.5 text-[11px] font-medium text-stone-400">{section.labelFa}</p>
                  <div className="space-y-1">
                    {section.items.map(it => (
                      <button key={it.id} onClick={() => addFromMenu(it)} disabled={it.price == null}
                        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-right text-[13px] hover:bg-stone-50 disabled:opacity-40">
                        <span className="text-foreground">{it.titleFa}</span>
                        <span className="flex items-center gap-1.5 text-stone-500">
                          {it.price != null ? `${formatToman(it.price)} ت` : 'بدون قیمت'}
                          <Plus size={13} className="text-amber-600" />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
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
            <Plus size={13} /> افزودن ردیف دستی
          </button>
        </div>

        {total > 0 && (
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[13px] text-muted-foreground">جمع کل</span>
            <span className="text-lg font-semibold tabular-nums text-foreground">{formatToman(total)} تومان</span>
          </div>
        )}

        <button onClick={handleGenerateLink} disabled={validItems.length === 0 || generating}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-stone-900 text-[13px] font-medium text-white hover:bg-stone-800 disabled:opacity-50">
          {generating ? 'در حال ساخت لینک…' : 'ساخت لینک برای مشتری'}
        </button>

        {genError && <p className="rounded-lg bg-red-50 p-2.5 text-[12px] text-red-600">{genError}</p>}

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
