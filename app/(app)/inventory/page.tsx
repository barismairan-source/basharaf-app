'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Package, ClipboardList, AlertTriangle, Check, X, Loader2, Plus, FileText, ChefHat, TrendingUp, Trash2, Calculator, FileSpreadsheet, Download, Upload, ChevronDown, ChevronLeft, Printer, CalendarClock } from 'lucide-react';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { canDo } from '@/lib/auth/permissions';
import { fmt } from '@/lib/utils';
import { JalaliDatePicker } from '@/components/ui';
import { getTodayJalali, isValidJalaliString } from '@/lib/jalali';
import type { InventoryItem, InventoryVoucher, InventoryRecipe, ForecastResult, InvVoucherKind, InvUnit, RecipeCosting, ExpiryWarning } from '@/types';

const repos = createRepos(null as never);

/**
 * پیام خطای واقعی را از Error استخراج می‌کند (apiFetch پیام سرور را در .message
 * می‌گذارد) و در کنسول لاگ می‌کند — به‌جای نمایش کور یک toast عمومی که علت
 * واقعی (مثلاً «numeric field overflow» سمت دیتابیس) را پنهان می‌کند.
 */
function errMsg(e: unknown, fallback: string): string {
  console.error(fallback, e);
  if (e instanceof Error && e.message && !/^HTTP \d+$/.test(e.message)) return e.message;
  return fallback;
}

type Tab = 'items' | 'cartable' | 'voucher' | 'quickbuy' | 'stocktake' | 'recipes' | 'sales' | 'plan';

const UNIT_LABELS: Record<string, string> = { kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر', pcs: 'عدد', can: 'قوطی', pack: 'بسته' };
const VOUCHER_KIND_LABELS: Record<string, string> = { in: 'رسید (خرید)', out: 'حواله (مصرف)', waste: 'ضایعات', sale: 'فروش', produce: 'تولید', stocktake: 'انبارگردانی' };

export default function InventoryPage() {
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const showToast = useAppStore(s => s.showToast);

  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vouchers, setVouchers] = useState<InventoryVoucher[]>([]);
  const [recipes, setRecipes] = useState<InventoryRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [its, vs, rs] = await Promise.all([
        repos.inventory.listItems(),
        repos.inventory.listVouchers('pending'),
        repos.inventory.listRecipes(),
      ]);
      setItems(its); setVouchers(vs); setRecipes(rs);
    } catch {
      showToast('خطا در بارگذاری انبار', 'danger');
    } finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  if (user && user.role !== 'SuperAdmin' && user.role !== 'Warehouse' && user.role !== 'BranchUser') {
    return <div className="p-6 text-center text-stone-500">دسترسی ندارید</div>;
  }
  // انباردار قیمت‌ها را نمی‌بیند و وارد نمی‌کند
  // تفکیک وظایف انبار/حسابداری: انباردار (یا کاربر بدون مجوز مالی) بهای تمام‌شده/مبالغ را نمی‌بیند
  const canSeePrices = canDo(user, 'inventory.viewCosts');
  const isWarehouse = user?.role === 'Warehouse';
  const canApprove = canDo(user, 'inventory.approve');

  async function approve(v: InventoryVoucher) {
    setBusy(v.id);
    try {
      const finalUnitCosts: Record<string, number> = {};
      for (const l of v.lines) finalUnitCosts[l.itemId] = l.estUnitCost ?? 0;
      await repos.inventory.approveVoucher(v.id, finalUnitCosts);
      showToast('برگه تأیید شد', 'success');
      await load();
    } catch (e) { showToast(errMsg(e, 'خطا در تأیید'), 'danger'); }
    finally { setBusy(null); }
  }

  async function reject(v: InventoryVoucher) {
    const reason = prompt('دلیل رد؟') ?? '';
    setBusy(v.id);
    try {
      await repos.inventory.rejectVoucher(v.id, reason);
      showToast('برگه رد شد', 'success');
      await load();
    } catch (e) { showToast(errMsg(e, 'خطا در رد'), 'danger'); }
    finally { setBusy(null); }
  }

  async function removeVoucher(v: InventoryVoucher) {
    if (!confirm('این برگه کامل حذف شود؟ (برای پاک‌کردن برگه‌های اشتباه)')) return;
    setBusy(v.id);
    try {
      await repos.inventory.deleteVoucher(v.id);
      showToast('برگه حذف شد', 'success');
      await load();
    } catch (e) { showToast(errMsg(e, 'خطا در حذف برگه'), 'danger'); }
    finally { setBusy(null); }
  }

  const ALL_TABS: { id: Tab; label: string; icon: typeof Package; warehouseOk: boolean }[] = [
    { id: 'items', label: 'موجودی', icon: Package, warehouseOk: true },
    { id: 'cartable', label: `کارتابل${vouchers.length ? ` (${vouchers.length})` : ''}`, icon: ClipboardList, warehouseOk: false },
    { id: 'voucher', label: 'ثبت برگه', icon: FileText, warehouseOk: true },
    { id: 'quickbuy', label: 'خرید سریع', icon: Plus, warehouseOk: false },
    { id: 'stocktake', label: 'انبارگردانی', icon: ClipboardList, warehouseOk: true },
    { id: 'recipes', label: 'رسپی‌ها', icon: ChefHat, warehouseOk: false },
    { id: 'sales', label: 'ثبت فروش', icon: TrendingUp, warehouseOk: false },
    { id: 'plan', label: 'برنامه پخت', icon: TrendingUp, warehouseOk: false },
  ];
  // انباردار فقط تب‌های مجاز را می‌بیند
  const TABS = isWarehouse ? ALL_TABS.filter(t => t.warehouseOk) : ALL_TABS;

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">انبار و آشپزخانه</h1>
          <div className="text-[12px] text-stone-500 mt-1">مدیریت موجودی، رسپی، و برنامه‌ی پخت</div>
        </div>

        {/* tabs */}
        <div className="flex gap-1 border-b border-stone-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12.5px] border-b-2 -mb-px whitespace-nowrap transition-colors ${tab === t.id ? 'border-stone-900 text-stone-900 font-medium' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
              <t.icon size={14} strokeWidth={1.5} />{t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-stone-400" /></div>
        ) : tab === 'items' ? (
          <ItemsTab items={items} branches={branches} onChange={load} showToast={showToast} canSeePrices={canSeePrices} />
        ) : tab === 'cartable' ? (
          <CartableTab vouchers={vouchers} items={items} canSeePrices={canSeePrices} canApprove={canApprove} busy={busy} onApprove={approve} onReject={reject} onDelete={removeVoucher} />
        ) : tab === 'voucher' ? (
          <VoucherTab items={items} branches={branches} onDone={load} showToast={showToast} canSeePrices={canSeePrices} isWarehouse={isWarehouse} />
        ) : tab === 'recipes' ? (
          <RecipesTab recipes={recipes} items={items} branches={branches} onDone={load} showToast={showToast} canSeePrices={canSeePrices} />
        ) : tab === 'sales' ? (
          <SalesTab recipes={recipes} branches={branches} onDone={load} showToast={showToast} />
        ) : tab === 'stocktake' ? (
          <StocktakeTab items={items} branches={branches} onDone={load} showToast={showToast} />
        ) : tab === 'quickbuy' ? (
          <QuickBuyTab items={items} branches={branches} onDone={load} showToast={showToast} />
        ) : (
          <PlanTab />
        )}
      </div>
    </div>
  );
}

/* ───── بخش هشدار انقضا ───── */
function ExpiryWarningsSection() {
  const [warnings, setWarnings] = useState<ExpiryWarning[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    createRepos(null as never).inventory.expiryWarnings()
      .then(w => { setWarnings(w); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || warnings.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-amber-800">
        <CalendarClock size={14} strokeWidth={1.5} />
        نزدیک به انقضا ({warnings.length} مورد)
      </div>
      <div className="space-y-1.5">
        {warnings.map((w, i) => (
          <div key={i} className="flex items-center justify-between text-[12px]">
            <span className="text-stone-700">{w.itemName}</span>
            <div className="flex items-center gap-2">
              <span className="text-stone-500 tabular-nums text-[11px]">{w.expiryDate}</span>
              {w.isExpired ? (
                <span className="bg-rose-100 text-rose-700 text-[10.5px] font-medium px-2 py-0.5 rounded-full">منقضی شده</span>
              ) : (
                <span className="bg-amber-100 text-amber-700 text-[10.5px] font-medium px-2 py-0.5 rounded-full">
                  {w.daysUntilExpiry === 1 ? 'فردا' : `${w.daysUntilExpiry} روز دیگر`}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───── تب موجودی + افزودن قلم ───── */
function ItemsTab({ items, branches, onChange, showToast, canSeePrices }: {
  items: InventoryItem[]; branches: { id: string; name: string }[]; onChange: () => void;
  showToast: (m: string, t?: any) => void; canSeePrices: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<InvUnit>('kg');
  const [kind, setKind] = useState<'raw' | 'prep'>('raw');
  const [branchId, setBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim() || !code.trim()) { showToast('کد و نام الزامی است', 'danger'); return; }
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    setSaving(true);
    try {
      await createRepos(null as never).inventory.createItem({ code: code.trim(), name: name.trim(), unit, branchId, kind });
      showToast('قلم اضافه شد', 'success');
      setCode(''); setName(''); setKind('raw'); setShowAdd(false); onChange();
    } catch { showToast('خطا در افزودن', 'danger'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <ExpiryWarningsSection />
      <div className="flex justify-end gap-2">
        {canSeePrices && <ItemsImport onDone={onChange} showToast={showToast} />}
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-[12.5px]">
          <Plus size={14} />افزودن قلم
        </button>
      </div>
      {items.length === 0 ? (
        <div className="text-center text-stone-400 py-10 text-[13px]">هنوز قلمی ثبت نشده</div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-[12.5px]">
            <thead className="bg-stone-50 text-stone-500 text-[11px]">
              <tr><th className="px-3 py-2 text-right">کد</th><th className="px-3 py-2 text-right">نام</th><th className="px-3 py-2 text-right">واحد</th><th className="px-3 py-2 text-left">
                <span
                  className="cursor-help border-b border-dotted border-stone-400"
                  title="موجودی (qtyBase) صرفاً از طریق تراکنش‌های انبار محاسبه می‌شود — برای اصلاح آن باید از «انبارگردانی» یا «رسید خرید» استفاده کنید، نه ویرایش مستقیم."
                >
                  موجودی
                </span>
              </th>{canSeePrices && <th className="px-3 py-2 text-left">میانگین بها</th>}{canSeePrices && <th className="px-3 py-2 w-10"></th>}</tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id} className="border-t border-stone-100">
                  <td className="px-3 py-2.5 text-stone-400 tabular-nums">{it.code}</td>
                  <td className="px-3 py-2.5 text-stone-800">{it.name}{it.kind === 'prep' && <span className="mr-1.5 text-[10px] bg-amber-50 text-amber-600 rounded px-1.5 py-0.5">نیمه‌آماده</span>}</td>
                  <td className="px-3 py-2.5 text-stone-500">{UNIT_LABELS[it.unit] ?? it.unit}</td>
                  <td className="px-3 py-2.5 text-left tabular-nums">{fmt(Math.round(it.qtyBase))}</td>
                  {canSeePrices && <td className="px-3 py-2.5 text-left tabular-nums text-stone-600">{fmt(Math.round(it.avgCostPerBase * it.basePerUnit))}</td>}
                  {canSeePrices && <td className="px-3 py-2.5 text-left">
                    <button onClick={async () => {
                      if (!confirm(`«${it.name}» حذف شود؟`)) return;
                      try { await createRepos(null as never).inventory.deleteItem(it.id); showToast('حذف شد', 'success'); onChange(); }
                      catch { showToast('خطا در حذف', 'danger'); }
                    }} className="text-stone-400 hover:text-rose-600"><Trash2 size={14} strokeWidth={1.5} /></button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium mb-4">افزودن قلم انبار</h2>
            <div className="space-y-3">
              <div><label className="text-[11.5px] text-stone-500">کد</label><input value={code} onChange={e => setCode(e.target.value)} dir="ltr" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" placeholder="R-001" /></div>
              <div><label className="text-[11.5px] text-stone-500">نام</label><input value={name} onChange={e => setName(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" placeholder="گوشت چرخ‌کرده" /></div>
              <div><label className="text-[11.5px] text-stone-500">نوع قلم</label>
                <select value={kind} onChange={e => setKind(e.target.value as 'raw' | 'prep')} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
                  <option value="raw">ماده اولیه (خرید مستقیم)</option>
                  <option value="prep">نیمه‌آماده (تولید داخلی)</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[11.5px] text-stone-500">واحد</label>
                  <select value={unit} onChange={e => setUnit(e.target.value as InvUnit)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
                    {Object.entries(UNIT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="text-[11.5px] text-stone-500">شعبه</label>
                  <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
                    <option value="">— انتخاب —</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={add} disabled={saving} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}افزودن</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-[13px] border border-stone-200">لغو</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── تب کارتابل ───── */
function CartableTab({ vouchers, items, canSeePrices, canApprove, busy, onApprove, onReject, onDelete }: {
  vouchers: InventoryVoucher[]; items: InventoryItem[]; canSeePrices: boolean; canApprove: boolean; busy: string | null;
  onApprove: (v: InventoryVoucher) => void; onReject: (v: InventoryVoucher) => void;
  onDelete: (v: InventoryVoucher) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const itemName = (id: string) => items.find(i => i.id === id)?.name ?? '— حذف‌شده —';
  const itemUnit = (id: string) => items.find(i => i.id === id)?.unit ?? '';

  if (vouchers.length === 0) return <div className="text-center text-stone-400 py-10 text-[13px]">برگه‌ای در انتظار تأیید نیست</div>;
  return (
    <div className="space-y-2">
      {vouchers.map(v => {
        const isOpen = expanded === v.id;
        // قیمت فقط برای رسید خرید معنی دارد و فقط اگر کاربر مجاز به دیدن قیمت باشد
        const showPrices = canSeePrices && v.kind === 'in';
        return (
          <div key={v.id} className="bg-white border border-stone-200 rounded-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setExpanded(isOpen ? null : v.id)} className="flex items-center gap-2 text-right flex-1 min-w-0">
                {isOpen ? <ChevronDown size={15} className="text-stone-400 flex-shrink-0" /> : <ChevronLeft size={15} className="text-stone-400 flex-shrink-0" />}
                <div className="min-w-0">
                  <span className="text-[13px] font-medium text-stone-800">{VOUCHER_KIND_LABELS[v.kind] ?? v.kind}</span>
                  <span className="text-[11px] text-stone-400 mr-2">{v.no} · {v.makerDate} · {v.lines.length} قلم</span>
                </div>
              </button>
              <div className="flex gap-2 flex-shrink-0">
                {busy === v.id ? <Loader2 size={16} className="animate-spin text-stone-400" /> : canApprove ? (
                  <>
                    <button onClick={() => onApprove(v)} className="flex items-center gap-1 bg-emerald-600 text-white px-2.5 py-1 rounded text-[11.5px]"><Check size={13} />تأیید</button>
                    <button onClick={() => onReject(v)} className="flex items-center gap-1 text-rose-600 border border-rose-200 px-2.5 py-1 rounded text-[11.5px]"><X size={13} />رد</button>
                    <button onClick={() => onDelete(v)} className="flex items-center gap-1 text-stone-400 hover:text-rose-600 px-1.5 py-1 rounded text-[11.5px]" title="حذف کامل"><Trash2 size={13} /></button>
                  </>
                ) : (
                  <span className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1">در انتظار تأیید</span>
                )}
              </div>
            </div>

            {/* جزئیات قابل بازشدن — تأییدکننده ببیند چه چیزی را تأیید می‌کند */}
            {isOpen && (
              <div className="mt-3 pt-3 border-t border-stone-100">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-stone-400 text-[11px]">
                      <th className="text-right pb-1.5">قلم</th>
                      <th className="text-left pb-1.5">مقدار</th>
                      {showPrices && <th className="text-left pb-1.5">قیمت واحد</th>}
                      {showPrices && <th className="text-left pb-1.5">جمع</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {v.lines.map((l, i) => (
                      <tr key={i} className="border-t border-stone-50">
                        <td className="py-1.5 text-stone-800">{itemName(l.itemId)}</td>
                        <td className="py-1.5 text-left tabular-nums text-stone-600">{fmt(l.qtyBase)} {itemUnit(l.itemId)}</td>
                        {showPrices && <td className="py-1.5 text-left tabular-nums text-stone-600">{fmt(l.estUnitCost)}</td>}
                        {showPrices && <td className="py-1.5 text-left tabular-nums text-stone-700">{fmt(Math.round(l.estUnitCost * l.qtyBase))}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {showPrices && (
                  <div className="flex justify-between mt-2 pt-2 border-t border-stone-100 text-[12.5px] font-medium text-stone-800">
                    <span>جمع کل</span>
                    <span className="tabular-nums">{fmt(v.estTotal)} تومان</span>
                  </div>
                )}
              </div>
            )}

            {v.note && <div className="text-[11px] text-stone-500 mt-1.5">{v.note}</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ───── تب ثبت برگه (رسید/حواله/ضایعات) ───── */
function VoucherTab({ items, branches, onDone, showToast, canSeePrices, isWarehouse }: {
  items: InventoryItem[]; branches: { id: string; name: string }[]; onDone: () => void;
  showToast: (m: string, t?: any) => void; canSeePrices: boolean; isWarehouse: boolean;
}) {
  const [kind, setKind] = useState<InvVoucherKind>(isWarehouse ? 'out' : 'in');
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [note, setNote] = useState('');
  const [lines, setLines] = useState<{ itemId: string; qty: string; cost: string }[]>([{ itemId: '', qty: '', cost: '' }]);
  const [saving, setSaving] = useState(false);

  function setLine(i: number, patch: Partial<{ itemId: string; qty: string; cost: string }>) {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ شمسی نامعتبر است', 'danger'); return; }
    const valid = lines.filter(l => l.itemId && parseInt(l.qty.replace(/\D/g, ''), 10) > 0);
    if (valid.length === 0) { showToast('حداقل یک قلم با مقدار', 'danger'); return; }
    setSaving(true);
    try {
      await createRepos(null as never).inventory.createVoucher({
        kind, branchId, date, note: note || undefined,
        lines: valid.map(l => ({
          itemId: l.itemId,
          qtyBase: parseInt(l.qty.replace(/\D/g, ''), 10),
          estUnitCost: l.cost ? parseInt(l.cost.replace(/\D/g, ''), 10) : undefined,
        })),
      });
      showToast('برگه ثبت شد (در انتظار تأیید)', 'success');
      setLines([{ itemId: '', qty: '', cost: '' }]); setNote(''); onDone();
    } catch (e) { showToast(errMsg(e, 'خطا در ثبت برگه'), 'danger'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-4">
      {!isWarehouse && (
        <div className="flex justify-end">
          <VouchersImport onDone={onDone} showToast={showToast} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-3">
        <div><label className="text-[11.5px] text-stone-500">نوع برگه</label>
          <select value={kind} onChange={e => setKind(e.target.value as InvVoucherKind)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
            {!isWarehouse && <option value="in">رسید (خرید)</option>}
            <option value="out">حواله (مصرف)</option>
            <option value="waste">ضایعات</option>
          </select>
        </div>
        <div><label className="text-[11.5px] text-stone-500">شعبه</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
            <option value="">— انتخاب —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div><label className="text-[11.5px] text-stone-500">تاریخ (شمسی)</label>
          <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11.5px] text-stone-500">اقلام</label>
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2">
            <select value={l.itemId} onChange={e => setLine(i, { itemId: e.target.value })} className="flex-1 border border-stone-200 rounded-lg px-2 py-2 text-[12.5px]">
              <option value="">— قلم —</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.name} ({UNIT_LABELS[it.unit]})</option>)}
            </select>
            <input value={l.qty} onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; setLine(i, { qty: n ? n.toLocaleString('en-US') : '' }); }} dir="ltr" placeholder="مقدار (واحد پایه)" className="w-32 border border-stone-200 rounded-lg px-2 py-2 text-[12.5px]" />
            {kind === 'in' && canSeePrices && <input value={l.cost} onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; setLine(i, { cost: n ? n.toLocaleString('en-US') : '' }); }} dir="ltr" placeholder="بهای واحد" className="w-28 border border-stone-200 rounded-lg px-2 py-2 text-[12.5px]" />}
            {lines.length > 1 && <button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="text-stone-400 hover:text-rose-600 px-1"><Trash2 size={15} /></button>}
          </div>
        ))}
        <button onClick={() => setLines(prev => [...prev, { itemId: '', qty: '', cost: '' }])} className="text-[12px] text-stone-500 flex items-center gap-1"><Plus size={13} />افزودن قلم</button>
      </div>

      <div><label className="text-[11.5px] text-stone-500">توضیح (اختیاری)</label>
        <input value={note} onChange={e => setNote(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" />
      </div>

      <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}ثبت برگه
      </button>
    </div>
  );
}

/* ───── تب رسپی‌ها ───── */
function RecipesTab({ recipes, items, branches, onDone, showToast, canSeePrices }: {
  recipes: InventoryRecipe[]; items: InventoryItem[]; branches: { id: string; name: string }[]; onDone: () => void;
  showToast: (m: string, t?: any) => void; canSeePrices: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [branchId, setBranchId] = useState('');
  const [portions, setPortions] = useState('1');
  const [price, setPrice] = useState('');
  const [lines, setLines] = useState<{ itemId: string; qty: string }[]>([{ itemId: '', qty: '' }]);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { showToast('نام رسپی الزامی است', 'danger'); return; }
    const valid = lines.filter(l => l.itemId && parseInt(l.qty.replace(/\D/g, ''), 10) > 0);
    if (valid.length === 0) { showToast('حداقل یک ماده', 'danger'); return; }
    setSaving(true);
    try {
      await createRepos(null as never).inventory.saveRecipe({
        id: null, name: name.trim(), branchId: branchId || null,
        portions: parseInt(portions, 10) || 1,
        targetFcPct: 30, price: price ? parseInt(price.replace(/\D/g, ''), 10) : 0,
        cookMode: 'daily', shelfLifeDays: 1,
        lines: valid.map(l => ({ itemId: l.itemId, qtyBase: parseInt(l.qty.replace(/\D/g, ''), 10) })),
      } as InventoryRecipe);
      showToast('رسپی ذخیره شد', 'success');
      setName(''); setPrice(''); setLines([{ itemId: '', qty: '' }]); setShowAdd(false); onDone();
    } catch { showToast('خطا در ذخیره', 'danger'); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 bg-stone-900 text-white px-3 py-1.5 rounded-lg text-[12.5px]"><Plus size={14} />رسپی جدید</button>
      </div>
      {recipes.length === 0 ? (
        <div className="text-center text-stone-400 py-10 text-[13px]">هنوز رسپی‌ای ثبت نشده</div>
      ) : (
        <div className="space-y-2">
          {recipes.map(r => (
            <RecipeCard key={r.id} recipe={r} items={items} onDelete={async () => {
              if (!confirm(`رسپی «${r.name}» حذف شود؟`)) return;
              try { await createRepos(null as never).inventory.deleteRecipe(r.id!); showToast('حذف شد', 'success'); onDone(); }
              catch { showToast('خطا در حذف', 'danger'); }
            }} canSeePrices={canSeePrices} />
          ))}
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-[16px] font-medium mb-4">رسپی جدید</h2>
            <div className="space-y-3">
              <div><label className="text-[11.5px] text-stone-500">نام غذا</label><input value={name} onChange={e => setName(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" placeholder="چلوکباب کوبیده" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[11.5px] text-stone-500">تعداد پرس</label><input value={portions} onChange={e => setPortions(e.target.value.replace(/\D/g, ''))} dir="ltr" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" /></div>
                <div className="col-span-2"><label className="text-[11.5px] text-stone-500">قیمت فروش (تومان)</label><input value={price} onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; setPrice(n ? n.toLocaleString('en-US') : ''); }} dir="ltr" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" /></div>
              </div>
              <div><label className="text-[11.5px] text-stone-500">شعبه</label>
                <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
                  <option value="">— همه —</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[11.5px] text-stone-500">مواد (مقدار به واحد پایه برای کل رسپی)</label>
                {lines.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={l.itemId} onChange={e => setLines(prev => prev.map((x, idx) => idx === i ? { ...x, itemId: e.target.value } : x))} className="flex-1 border border-stone-200 rounded-lg px-2 py-2 text-[12.5px]">
                      <option value="">— ماده —</option>
                      {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                    </select>
                    <input value={l.qty} onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; setLines(prev => prev.map((x, idx) => idx === i ? { ...x, qty: n ? n.toLocaleString('en-US') : '' } : x)); }} dir="ltr" placeholder="مقدار" className="w-28 border border-stone-200 rounded-lg px-2 py-2 text-[12.5px]" />
                    {lines.length > 1 && <button onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))} className="text-stone-400 hover:text-rose-600 px-1"><Trash2 size={15} /></button>}
                  </div>
                ))}
                <button onClick={() => setLines(prev => [...prev, { itemId: '', qty: '' }])} className="text-[12px] text-stone-500 flex items-center gap-1"><Plus size={13} />افزودن ماده</button>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} disabled={saving} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}ذخیره</button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-[13px] border border-stone-200">لغو</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── تب برنامه‌ی پخت / پیش‌بینی ───── */
function PlanTab() {
  const showToast = useAppStore(s => s.showToast);
  const [horizon, setHorizon] = useState('7');
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await createRepos(null as never).inventory.forecast({ mode: 'weekday', horizon: parseInt(horizon, 10) || 7 });
      setResult(r);
    } catch { showToast('خطا در پیش‌بینی — شاید داده‌ی فروش کافی نیست', 'danger'); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-lg p-4 flex items-end gap-3">
        <div className="flex-1">
          <label className="text-[11.5px] text-stone-500">افق پیش‌بینی (روز)</label>
          <input value={horizon} onChange={e => setHorizon(e.target.value.replace(/\D/g, ''))} dir="ltr" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" />
        </div>
        <button onClick={run} disabled={loading} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}محاسبه
        </button>
      </div>
      {result && (() => {
        const shortfalls = result.rawCoverage
          .filter(c => c.shortfall > 0)
          .sort((a, b) => a.coverDays - b.coverDays);
        return (
        <div className="bg-white border border-stone-200 rounded-lg p-4">
          <div className="text-[12px] text-stone-500 mb-3">
            پیش‌بینی نیاز مواد برای {horizon} روز آینده
            {shortfalls.length ? ` · ${shortfalls.length} قلم نیاز به خرید` : ''}
          </div>
          {shortfalls.length > 0 ? (
            <div className="space-y-1.5">
              {shortfalls.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-[12.5px] border-b border-stone-50 pb-1.5">
                  <span className="text-stone-800 flex items-center gap-1.5">
                    {s.coverDays < 2 && <AlertTriangle size={13} className="text-amber-500" />}
                    {s.name}
                  </span>
                  <span className="text-stone-500">پوشش {Math.round(s.coverDays)} روز · کمبود {fmt(Math.round(s.shortfall))}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[13px] text-stone-400 text-center py-4">موجودی برای افق انتخاب‌شده کافی است</div>
          )}
        </div>
        );
      })()}
    </div>
  );
}

/* ───── کارت رسپی با بهای تمام‌شده + ماشین‌حساب پرس + چاپ ───── */
function RecipeCard({ recipe, items, onDelete, canSeePrices }: {
  recipe: InventoryRecipe; items: InventoryItem[]; onDelete: () => void; canSeePrices: boolean;
}) {
  const [costing, setCosting] = useState<RecipeCosting | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  /* ماشین‌حساب پرس: با موجودی فعلی چند پرس ممکن است؟ */
  const portionCalc = useMemo(() => {
    if (!recipe.lines.length || !items.length) return null;
    const byId = new Map(items.map(i => [i.id, i]));
    let min = Infinity;
    let bottleneck = '';
    for (const line of recipe.lines) {
      const item = byId.get(line.itemId);
      if (!item) continue;
      const yieldPct = (line.overridePct != null ? line.overridePct : item.yieldPct) || 100;
      const netUsable = item.qtyBase * yieldPct / 100;
      const netPerPortion = line.qtyBase / Math.max(1, recipe.portions);
      if (netPerPortion <= 0) continue;
      const possible = Math.floor(netUsable / netPerPortion);
      if (possible < min) { min = possible; bottleneck = item.name; }
    }
    return min === Infinity ? null : { portions: min, bottleneck };
  }, [recipe, items]);

  async function loadCosting() {
    if (costing) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const c = await createRepos(null as never).inventory.recipeCosting(recipe.id!);
      setCosting(c); setOpen(true);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  /* کارت رسپی چاپ‌پذیر برای آشپزخانه */
  function handlePrint() {
    const byId = new Map(items.map(i => [i.id, i]));
    const rows = recipe.lines.map(line => {
      const item = byId.get(line.itemId);
      const name = item?.name ?? '—';
      const unit = UNIT_LABELS[item?.unit ?? ''] ?? (item?.unit ?? '');
      const perPortion = (line.qtyBase / Math.max(1, recipe.portions));
      const perPortionStr = perPortion >= 1 ? Math.round(perPortion).toLocaleString('en-US') : perPortion.toFixed(2);
      const totalStr = Math.round(line.qtyBase).toLocaleString('en-US');
      return `<tr><td>${name}</td><td>${perPortionStr} ${unit}</td><td>${totalStr} ${unit}</td></tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head>
<meta charset="UTF-8"><title>${recipe.name} — کارت رسپی</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;padding:2cm;direction:rtl;font-size:14pt;color:#111}
  h1{font-size:20pt;border-bottom:2px solid #333;padding-bottom:.3cm;margin-bottom:.4cm}
  .meta{color:#555;font-size:11pt;margin-bottom:.8cm}
  table{width:100%;border-collapse:collapse;font-size:13pt}
  th{background:#eee;padding:7px 12px;text-align:right;border:1px solid #bbb;font-weight:bold}
  td{padding:7px 12px;border:1px solid #ddd}
  tr:nth-child(even) td{background:#f9f9f9}
  .footer{margin-top:1cm;font-size:10pt;color:#999;border-top:1px solid #eee;padding-top:.3cm}
  @media print{@page{margin:1.5cm}button{display:none}}
</style></head><body>
<h1>${recipe.name}</h1>
<div class="meta">هر پخت: ${recipe.portions} پرس · ${recipe.lines.length} ماده</div>
<table>
  <tr><th>ماده اولیه</th><th>هر پرس</th><th>کل پخت (${recipe.portions} پرس)</th></tr>
  ${rows}
</table>
<div class="footer">بشارف · کارت رسپی آشپزخانه · بدون قیمت</div>
<script>setTimeout(()=>{window.print();},250)</script>
</body></html>`;

    const w = window.open('', '_blank', 'width=750,height=820');
    if (w) { w.document.write(html); w.document.close(); }
  }

  const marginPct = costing?.foodCostPct != null
    ? Math.round((100 - costing.foodCostPct) * 10) / 10
    : null;

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-3">
      {/* سرتیتر کارت */}
      <div className="flex justify-between items-start gap-2">
        <div className="min-w-0">
          <span className="text-[13px] font-medium text-stone-800">{recipe.name}</span>
          <span className="text-[11px] text-stone-400 mr-2">{recipe.portions} پرس · {recipe.lines.length} ماده</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {portionCalc !== null && (
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-md tabular-nums font-medium ${portionCalc.portions === 0 ? 'bg-rose-50 text-rose-600' : portionCalc.portions < recipe.portions ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}
              title={`گلوگاه: ${portionCalc.bottleneck}`}
            >
              {portionCalc.portions} پرس
            </span>
          )}
          <button onClick={handlePrint} className="text-stone-400 hover:text-stone-700" title="چاپ کارت رسپی آشپزخانه">
            <Printer size={14} strokeWidth={1.5} />
          </button>
          {canSeePrices && (
            <button onClick={loadCosting} className="text-stone-400 hover:text-stone-700" title="بهای تمام‌شده">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} strokeWidth={1.5} />}
            </button>
          )}
          <button onClick={onDelete} className="text-stone-400 hover:text-rose-600"><Trash2 size={14} strokeWidth={1.5} /></button>
        </div>
      </div>

      {/* نمایش گلوگاه کمبود */}
      {portionCalc !== null && portionCalc.portions === 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-rose-600">
          <AlertTriangle size={11} />
          موجودی کافی نیست · گلوگاه: {portionCalc.bottleneck}
        </div>
      )}
      {portionCalc !== null && portionCalc.portions > 0 && portionCalc.portions < recipe.portions && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-600">
          <AlertTriangle size={11} />
          کمتر از یک پخت کامل · گلوگاه: {portionCalc.bottleneck}
        </div>
      )}

      {/* جزئیات بهای تمام‌شده */}
      {open && costing && (
        <div className="mt-3 pt-3 border-t border-stone-100 space-y-2">
          {/* ۴ آمار اصلی */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-stone-50 rounded-lg p-2">
              <div className="text-[10px] text-stone-400">بهای هر پرس</div>
              <div className="text-[13px] font-medium text-stone-800 tabular-nums">{fmt(costing.costPerPortion)}</div>
            </div>
            <div className="bg-stone-50 rounded-lg p-2">
              <div className="text-[10px] text-stone-400">قیمت فروش</div>
              <div className="text-[13px] font-medium text-stone-800 tabular-nums">{costing.price > 0 ? fmt(costing.price) : '—'}</div>
            </div>
            <div className="bg-stone-50 rounded-lg p-2">
              <div className="text-[10px] text-stone-400">food cost</div>
              <div className={`text-[13px] font-medium tabular-nums ${costing.foodCostPct != null && costing.foodCostPct > costing.targetFcPct ? 'text-rose-600' : 'text-emerald-600'}`}>
                {costing.foodCostPct != null ? `٪${costing.foodCostPct}` : '—'}
              </div>
            </div>
            <div className="bg-stone-50 rounded-lg p-2">
              <div className="text-[10px] text-stone-400">حاشیه سود</div>
              {marginPct !== null
                ? <div className={`text-[13px] font-medium tabular-nums ${marginPct < 30 ? 'text-rose-600' : 'text-emerald-600'}`}>٪{marginPct}</div>
                : <div className="text-[13px] text-stone-400">—</div>}
            </div>
          </div>

          {/* قیمت پیشنهادی اگر با قیمت فعلی فرق دارد */}
          {costing.price > 0 && Math.abs(costing.suggestedPrice - costing.price) > costing.price * 0.05 && (
            <div className="text-[11px] text-stone-500 flex items-center gap-1">
              قیمت پیشنهادی (بر اساس ٪{costing.targetFcPct} food cost):
              <span className="font-medium text-stone-700 tabular-nums">{fmt(costing.suggestedPrice)}</span>
            </div>
          )}

          {costing.hasMissingCosts && (
            <div className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} /> بعضی مواد هنوز قیمت ندارند (با ثبت رسید خرید قیمت می‌گیرند).
            </div>
          )}

          <div className="space-y-1">
            {costing.lines.map((l, i) => (
              <div key={i} className="flex justify-between text-[11.5px] text-stone-600">
                <span>{l.name} <span className="text-stone-400">({fmt(l.qtyBase)} {l.unit})</span></span>
                <span className="tabular-nums">{fmt(l.lineCost)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[12px] font-medium text-stone-800 pt-1.5 border-t border-stone-50">
            <span>جمع کل پخت ({costing.portions} پرس)</span>
            <span className="tabular-nums">{fmt(costing.totalCost)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───── تب ثبت فروش روزانه ───── */
function SalesTab({ recipes, branches, onDone, showToast }: {
  recipes: InventoryRecipe[]; branches: { id: string; name: string }[]; onDone: () => void;
  showToast: (m: string, t?: any) => void;
}) {
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const sold = recipes
    .map(r => ({ recipe: r, count: parseInt((qtys[r.id!] ?? '').replace(/\D/g, ''), 10) || 0 }))
    .filter(x => x.count > 0);

  const revenue = sold.reduce((s, x) => s + x.recipe.price * x.count, 0);

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ شمسی نامعتبر است', 'danger'); return; }
    if (sold.length === 0) { showToast('حداقل یک فروش وارد کنید', 'danger'); return; }

    // جمع مواد لازم از روی رسپی‌ها: برای هر رسپی، مواد × (تعداد فروش ÷ پرس رسپی)
    const itemTotals: Record<string, number> = {};
    for (const { recipe, count } of sold) {
      const perPortionFactor = count / Math.max(1, recipe.portions);
      for (const line of recipe.lines) {
        itemTotals[line.itemId] = (itemTotals[line.itemId] ?? 0) + line.qtyBase * perPortionFactor;
      }
    }
    const lines = Object.entries(itemTotals).map(([itemId, qtyBase]) => ({ itemId, qtyBase: Math.round(qtyBase) }));
    if (lines.length === 0) { showToast('رسپی‌های انتخابی ماده ندارند', 'danger'); return; }

    setSaving(true);
    try {
      await createRepos(null as never).inventory.createVoucher({
        kind: 'sale', branchId, date,
        note: `فروش روزانه — ${sold.length} نوع غذا`,
        lines,
        saleMeta: {
          revenue,
          lines: sold.map(x => ({ recipeId: x.recipe.id, name: x.recipe.name, count: x.count, unitPrice: x.recipe.price })),
        },
      } as any);
      showToast('فروش ثبت شد (در انتظار تأیید)', 'success');
      setQtys({}); onDone();
    } catch { showToast('خطا در ثبت فروش', 'danger'); }
    finally { setSaving(false); }
  }

  if (recipes.length === 0) {
    return <div className="text-center text-stone-400 py-10 text-[13px]">اول باید رسپی بسازید تا بتوانید فروش ثبت کنید</div>;
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11.5px] text-stone-500">شعبه</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
            <option value="">— انتخاب —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div><label className="text-[11.5px] text-stone-500">تاریخ (شمسی)</label>
          <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11.5px] text-stone-500">تعداد فروش هر غذا</label>
        {recipes.map(r => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="flex-1 text-[12.5px] text-stone-800">{r.name}</span>
            <span className="text-[11px] text-stone-400">{fmt(r.price)} ت</span>
            <input value={qtys[r.id!] ?? ''} onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; setQtys(q => ({ ...q, [r.id!]: n ? String(n) : '' })); }}
              dir="ltr" placeholder="۰" className="w-20 border border-stone-200 rounded-lg px-2 py-1.5 text-[12.5px] text-center" />
          </div>
        ))}
      </div>

      {sold.length > 0 && (
        <div className="bg-stone-50 rounded-lg p-3 flex justify-between text-[13px]">
          <span className="text-stone-600">جمع فروش ({sold.reduce((s, x) => s + x.count, 0)} پرس)</span>
          <span className="font-medium text-stone-900 tabular-nums">{fmt(revenue)} تومان</span>
        </div>
      )}

      <button onClick={submit} disabled={saving} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}ثبت فروش
      </button>
      <p className="text-[11px] text-stone-400">با تأیید این برگه در کارتابل، مواد لازم خودکار از موجودی انبار کم می‌شوند.</p>
    </div>
  );
}

/* ───── ورود دسته‌ای اقلام از اکسل ───── */
function ItemsImport({ onDone, showToast }: { onDone: () => void; showToast: (m: string, t?: any) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  async function downloadTemplate() {
    try {
      const res = await fetch('/api/inventory/items/import/template', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'basharaf-items-template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch { showToast('خطا در دانلود تمپلیت', 'danger'); }
  }

  async function doImport() {
    if (!file) { showToast('فایل اکسل را انتخاب کنید', 'danger'); return; }
    setBusy(true); setErrors([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/inventory/items/import', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (res.ok && data.ok) {
        showToast(`${data.imported} قلم وارد شد`, 'success');
        setFile(null); setOpen(false); onDone();
      } else {
        setErrors(data.errors ?? ['خطای نامشخص']);
      }
    } catch { showToast('خطا در ورود فایل', 'danger'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 border border-stone-200 px-3 py-1.5 rounded-lg text-[12.5px] text-stone-600 hover:bg-stone-50">
        <FileSpreadsheet size={14} />ورود دسته‌ای
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[16px] font-medium">ورود دسته‌ای اقلام انبار</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <p className="text-[11.5px] text-stone-500 mb-4 leading-relaxed">
              اول تمپلیت را دانلود و پر کنید. نام شعبه باید دقیقاً مثل سیستم باشد. کد هر قلم در هر شعبه یکتاست. اگر ردیفی خطا داشته باشد، هیچ قلمی وارد نمی‌شود.
            </p>
            <div className="space-y-3">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 border border-stone-200 px-3 py-2 rounded-lg text-[12.5px] text-stone-600 hover:bg-stone-50">
                <Download size={14} />دانلود تمپلیت اکسل
              </button>
              <label className="flex items-center gap-2 border border-dashed border-stone-300 rounded-lg p-3 cursor-pointer hover:border-stone-400">
                <Upload size={16} className="text-stone-400" />
                <span className="text-[12px] text-stone-600 flex-1 truncate">{file ? file.name : 'فایل اکسل پرشده'}</span>
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] ?? null); setErrors([]); }} />
              </label>
              {errors.length > 0 && (
                <div className="bg-rose-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-rose-700 font-medium mb-1"><AlertTriangle size={14} />هیچ قلمی وارد نشد:</div>
                  <ul className="text-[11px] text-rose-600 space-y-0.5 max-h-40 overflow-y-auto">
                    {errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={doImport} disabled={busy || !file} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}ورود به سیستم
              </button>
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-[13px] border border-stone-200">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───── ورود دسته‌ای رسید خرید از اکسل ───── */
function VouchersImport({ onDone, showToast }: { onDone: () => void; showToast: (m: string, t?: any) => void }) {
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
    } catch { showToast('خطا در دانلود تمپلیت', 'danger'); }
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
    } catch { showToast('خطا در ورود فایل', 'danger'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex items-center gap-1.5 border border-stone-200 px-3 py-1.5 rounded-lg text-[12.5px] text-stone-600 hover:bg-stone-50">
        <FileSpreadsheet size={14} />ورود دسته‌ای رسید
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[16px] font-medium">ورود دسته‌ای رسید خرید</h2>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            <p className="text-[11.5px] text-stone-500 mb-4 leading-relaxed">
              هر ردیف = یک قلم. ردیف‌هایی با «شماره فاکتور» یکسان در یک برگه جمع می‌شوند. کد قلم باید از قبل در سیستم باشد. برگه‌ها در کارتابل منتظر تأیید می‌مانند. اگر ردیفی خطا داشته باشد، هیچ برگه‌ای ساخته نمی‌شود.
            </p>
            <div className="space-y-3">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 border border-stone-200 px-3 py-2 rounded-lg text-[12.5px] text-stone-600 hover:bg-stone-50">
                <Download size={14} />دانلود تمپلیت اکسل
              </button>
              <label className="flex items-center gap-2 border border-dashed border-stone-300 rounded-lg p-3 cursor-pointer hover:border-stone-400">
                <Upload size={16} className="text-stone-400" />
                <span className="text-[12px] text-stone-600 flex-1 truncate">{file ? file.name : 'فایل اکسل پرشده'}</span>
                <input type="file" className="hidden" accept=".xlsx,.xls" onChange={e => { setFile(e.target.files?.[0] ?? null); setErrors([]); }} />
              </label>
              {errors.length > 0 && (
                <div className="bg-rose-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[12px] text-rose-700 font-medium mb-1"><AlertTriangle size={14} />هیچ برگه‌ای ساخته نشد:</div>
                  <ul className="text-[11px] text-rose-600 space-y-0.5 max-h-40 overflow-y-auto">
                    {errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={doImport} disabled={busy || !file} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}ساخت برگه‌ها
              </button>
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-[13px] border border-stone-200">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───── تب انبارگردانی (مغایرت‌گیری بدون قیمت) ───── */
function StocktakeTab({ items, branches, onDone, showToast }: {
  items: InventoryItem[]; branches: { id: string; name: string }[]; onDone: () => void;
  showToast: (m: string, t?: any) => void;
}) {
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // اقلام شعبه‌ی انتخابی
  const branchItems = items.filter(it => it.isActive && (!branchId || it.branchId === branchId));

  // اقلامی که موجودی واقعی واردشده دارند و با سیستم فرق دارند
  const changes = branchItems
    .map(it => {
      const raw = (counted[it.id] ?? '').replace(/[^0-9.]/g, '');
      if (raw === '') return null;
      const real = parseFloat(raw);
      if (isNaN(real)) return null;
      const diff = real - it.qtyBase;
      return { it, real, diff };
    })
    .filter((x): x is { it: InventoryItem; real: number; diff: number } => x !== null && Math.abs(x.diff) > 1e-6);

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ نامعتبر', 'danger'); return; }
    if (changes.length === 0) { showToast('هیچ اختلافی وارد نشده', 'danger'); return; }

    setSaving(true);
    try {
      // برگه‌ی انبارگردانی: qtyBase هر خط = موجودی شمرده‌شده (نه حرکت). بدون قیمت.
      await createRepos(null as never).inventory.createVoucher({
        kind: 'stocktake', branchId, date,
        note: `انبارگردانی — ${changes.length} قلم مغایرت`,
        lines: changes.map(c => ({ itemId: c.it.id, qtyBase: c.real, estUnitCost: 0 })),
      } as any);
      showToast('برگه انبارگردانی ثبت شد (در انتظار تأیید)', 'success');
      setCounted({}); onDone();
    } catch { showToast('خطا در ثبت انبارگردانی', 'danger'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11.5px] text-stone-500">شعبه</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
            <option value="">— انتخاب —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div><label className="text-[11.5px] text-stone-500">تاریخ</label>
          <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
        </div>
      </div>

      {!branchId ? (
        <div className="text-center text-stone-400 py-8 text-[13px]">برای شروع، شعبه را انتخاب کنید</div>
      ) : branchItems.length === 0 ? (
        <div className="text-center text-stone-400 py-8 text-[13px]">این شعبه قلمی ندارد</div>
      ) : (
        <>
          <div className="text-[11.5px] text-stone-500">
            موجودی واقعیِ شمرده‌شده را وارد کنید. فقط اقلامی که عدد بزنید و با سیستم فرق داشته باشند ثبت می‌شوند. قیمت لازم نیست.
          </div>
          <div className="border border-stone-100 rounded-lg overflow-hidden">
            <table className="w-full text-[12.5px]">
              <thead className="bg-stone-50 text-stone-400 text-[11px]">
                <tr>
                  <th className="text-right px-3 py-2">قلم</th>
                  <th className="text-left px-3 py-2">سیستم</th>
                  <th className="text-left px-3 py-2">شمارش واقعی</th>
                  <th className="text-left px-3 py-2">اختلاف</th>
                </tr>
              </thead>
              <tbody>
                {branchItems.map(it => {
                  const raw = (counted[it.id] ?? '').replace(/[^0-9.]/g, '');
                  const real = raw === '' ? null : parseFloat(raw);
                  const diff = real == null || isNaN(real) ? null : real - it.qtyBase;
                  return (
                    <tr key={it.id} className="border-t border-stone-50">
                      <td className="px-3 py-2 text-stone-800">{it.name} <span className="text-stone-400 text-[11px]">({it.unit})</span></td>
                      <td className="px-3 py-2 text-left tabular-nums text-stone-500">{fmt(it.qtyBase)}</td>
                      <td className="px-3 py-2 text-left">
                        <input value={counted[it.id] ?? ''} onChange={e => setCounted(c => ({ ...c, [it.id]: e.target.value }))}
                          dir="ltr" placeholder="—" className="w-24 border border-stone-200 rounded px-2 py-1 text-[12px] text-left" />
                      </td>
                      <td className={`px-3 py-2 text-left tabular-nums ${diff == null ? 'text-stone-300' : diff === 0 ? 'text-stone-400' : diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {diff == null ? '—' : diff > 0 ? `+${fmt(diff)}` : fmt(diff)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {changes.length > 0 && (
            <div className="bg-amber-50 rounded-lg p-3 text-[12px] text-amber-700">
              {changes.length} قلم مغایرت دارد — با تأیید برگه در کارتابل، موجودی این اقلام اصلاح می‌شود.
            </div>
          )}

          <button onClick={submit} disabled={saving || changes.length === 0} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <ClipboardList size={14} />}ثبت انبارگردانی
          </button>
        </>
      )}
    </div>
  );
}

/* ───── تب خرید سریع (برای خریدهای کوچک و فوری) ───── */
function QuickBuyTab({ items, branches, onDone, showToast }: {
  items: InventoryItem[]; branches: { id: string; name: string }[]; onDone: () => void;
  showToast: (m: string, t?: any) => void;
}) {
  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [rows, setRows] = useState<Array<{ itemId: string; qty: string }>>([{ itemId: '', qty: '' }]);
  const [totalAmount, setTotalAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const branchItems = items.filter(it => it.isActive && (!branchId || it.branchId === branchId));

  function setRow(i: number, patch: Partial<{ itemId: string; qty: string }>) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addRow() { setRows(prev => [...prev, { itemId: '', qty: '' }]); }
  function removeRow(i: number) { setRows(prev => prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev); }

  const validRows = rows
    .map(r => ({ itemId: r.itemId, qty: parseFloat((r.qty || '').replace(/[^0-9.]/g, '')) || 0 }))
    .filter(r => r.itemId && r.qty > 0);
  const total = parseInt((totalAmount || '').replace(/\D/g, ''), 10) || 0;

  async function submit() {
    if (!branchId) { showToast('شعبه را انتخاب کنید', 'danger'); return; }
    if (!isValidJalaliString(date)) { showToast('تاریخ نامعتبر', 'danger'); return; }
    if (validRows.length === 0) { showToast('حداقل یک قلم با مقدار وارد کنید', 'danger'); return; }

    // مبلغ کل را به نسبت مقدار بین اقلام پخش می‌کنیم تا estUnitCost هر خط ساخته شود.
    // (اگر مبلغ کل صفر باشد، خرید بدون قیمت ثبت می‌شود.)
    const totalQty = validRows.reduce((s, r) => s + r.qty, 0);
    const lines = validRows.map(r => {
      const share = total > 0 && totalQty > 0 ? (total * (r.qty / totalQty)) : 0;
      const unitCost = r.qty > 0 ? Math.round(share / r.qty) : 0;
      return { itemId: r.itemId, qtyBase: r.qty, estUnitCost: unitCost };
    });

    setSaving(true);
    try {
      await createRepos(null as never).inventory.createVoucher({
        kind: 'in', branchId, date,
        note: total > 0 ? `خرید سریع — جمع ${fmt(total)} تومان` : 'خرید سریع',
        lines,
      } as any);
      showToast('خرید سریع ثبت شد (در انتظار تأیید)', 'success');
      setRows([{ itemId: '', qty: '' }]); setTotalAmount(''); onDone();
    } catch { showToast('خطا در ثبت خرید', 'danger'); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-4">
      <div className="text-[12px] text-stone-500">
        برای خریدهای کوچک و سریع: قلم و مقدار را بزنید، یک مبلغ کل وارد کنید (اختیاری)، و ثبت کنید. مبلغ بین اقلام به نسبت مقدار پخش می‌شود.
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-[11.5px] text-stone-500">شعبه</label>
          <select value={branchId} onChange={e => setBranchId(e.target.value)} className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1">
            <option value="">— انتخاب —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div><label className="text-[11.5px] text-stone-500">تاریخ</label>
          <div className="mt-1"><JalaliDatePicker value={date} onChange={setDate} /></div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[11.5px] text-stone-500">اقلام خریداری‌شده</label>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={r.itemId} onChange={e => setRow(i, { itemId: e.target.value })} disabled={!branchId}
              className="flex-1 border border-stone-200 rounded-lg px-2 py-1.5 text-[12.5px] disabled:bg-stone-50">
              <option value="">— انتخاب قلم —</option>
              {branchItems.map(it => <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>)}
            </select>
            <input value={r.qty} onChange={e => setRow(i, { qty: e.target.value })} dir="ltr" placeholder="مقدار"
              className="w-24 border border-stone-200 rounded-lg px-2 py-1.5 text-[12.5px] text-center" />
            <button onClick={() => removeRow(i)} className="text-stone-400 hover:text-rose-600 p-1"><X size={15} /></button>
          </div>
        ))}
        <button onClick={addRow} className="flex items-center gap-1 text-[12px] text-stone-500 hover:text-stone-800"><Plus size={13} />افزودن قلم</button>
      </div>

      <div>
        <label className="text-[11.5px] text-stone-500">مبلغ کل خرید (تومان، اختیاری)</label>
        <input value={totalAmount} onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0; setTotalAmount(n ? n.toLocaleString('en-US') : ''); }}
          dir="ltr" placeholder="مثلاً ۲۵۰٬۰۰۰" className="w-full border border-stone-200 rounded-lg px-3 py-2 text-[13px] mt-1" />
      </div>

      <button onClick={submit} disabled={saving || validRows.length === 0} className="flex items-center gap-1.5 bg-stone-900 text-white px-4 py-2 rounded-lg text-[13px] disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}ثبت خرید سریع
      </button>
      <p className="text-[11px] text-stone-400">این خرید به‌صورت رسید در کارتابل ثبت می‌شود و با تأیید، موجودی اقلام بالا می‌رود و سند هزینه ساخته می‌شود.</p>
    </div>
  );
}
