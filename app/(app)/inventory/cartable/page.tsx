'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, X, Loader2, Trash2, ChevronDown, ChevronLeft, RotateCcw, ClipboardList } from 'lucide-react';
import { createRepos } from '@/lib/repos';
import { useAppStore } from '@/store';
import { canDo } from '@/lib/auth/permissions';
import { fmt } from '@/lib/utils';
import { PageHeader, EmptyState } from '@/components/ui';
import type { InventoryItem, InventoryVoucher, Account } from '@/types';

const repos = createRepos(null as never);

const VOUCHER_KIND_LABELS: Record<string, string> = {
  in: 'رسید (خرید)', out: 'حواله (مصرف)', waste: 'ضایعات',
  sale: 'فروش', produce: 'تولید', stocktake: 'انبارگردانی',
};

const UNIT_LABELS: Record<string, string> = {
  kg: 'کیلوگرم', g: 'گرم', L: 'لیتر', ml: 'میلی‌لیتر',
  pcs: 'عدد', can: 'قوطی', pack: 'بسته',
};

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message && !/^HTTP \d+$/.test(e.message)) return e.message;
  return fallback;
}

export default function CartablePage() {
  const user = useAppStore((s) => s.user);
  const accounts = useAppStore((s) => s.accounts) as Account[];
  const loadAccounts = useAppStore((s) => s.loadAccounts);
  const showToast = useAppStore((s) => s.showToast);

  const [vouchers, setVouchers] = useState<InventoryVoucher[]>([]);
  const [approvedVouchers, setApprovedVouchers] = useState<InventoryVoucher[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [reversalLoading, setReversalLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingApprove, setPendingApprove] = useState<InventoryVoucher | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  const canSeePrices = canDo(user, 'inventory.viewCosts');
  const canApprove = canDo(user, 'inventory.approve');
  const isSuperAdmin = user?.role === 'SuperAdmin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [vs, approvedVs, its] = await Promise.all([
        repos.inventory.listVouchers('pending'),
        repos.inventory.listVouchers('approved'),
        repos.inventory.listItems(),
      ]);
      setVouchers(vs);
      setApprovedVouchers(approvedVs);
      setItems(its);
    } catch {
      showToast('خطا در بارگذاری کارتابل', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  if (!user) return null;

  function itemName(id: string) { return items.find((i) => i.id === id)?.name ?? '— حذف‌شده —'; }
  function itemUnit(id: string) { return UNIT_LABELS[items.find((i) => i.id === id)?.unit ?? ''] ?? ''; }

  async function approve(v: InventoryVoucher) {
    if (v.kind === 'in') { setPendingApprove(v); setSelectedAccountId(''); return; }
    setBusy(v.id);
    try {
      const costs: Record<string, number> = {};
      for (const l of v.lines) costs[l.itemId] = l.estUnitCost ?? 0;
      await repos.inventory.approveVoucher(v.id, costs);
      showToast('برگه تأیید شد', 'success');
      await load();
    } catch (e) { showToast(errMsg(e, 'خطا در تأیید'), 'danger'); }
    finally { setBusy(null); }
  }

  async function confirmApprove() {
    if (!pendingApprove || !selectedAccountId) return;
    const v = pendingApprove;
    setPendingApprove(null);
    setBusy(v.id);
    try {
      const costs: Record<string, number> = {};
      for (const l of v.lines) costs[l.itemId] = l.estUnitCost ?? 0;
      await repos.inventory.approveVoucher(v.id, costs, selectedAccountId);
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
    if (!confirm('این برگه کامل حذف شود؟')) return;
    setBusy(v.id);
    try {
      await repos.inventory.deleteVoucher(v.id);
      showToast('برگه حذف شد', 'success');
      await load();
    } catch (e) { showToast(errMsg(e, 'خطا در حذف'), 'danger'); }
    finally { setBusy(null); }
  }

  async function handleReversal(id: string) {
    if (!confirm('یک برگه‌ی معکوس pending در کارتابل ساخته می‌شود. ادامه می‌دهید؟')) return;
    setReversalLoading(id);
    try {
      await repos.inventory.createReversal(id);
      showToast('برگه اصلاحی ساخته شد', 'success');
      await load();
    } catch (e) {
      const msg = errMsg(e, 'خطا');
      showToast(msg.includes('409') || msg.includes('قبلاً') ? 'برگه اصلاحی قبلاً ثبت شده' : msg, 'danger');
    } finally { setReversalLoading(null); }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <PageHeader title="کارتابل برگه‌ها" backHref="/inventory" />

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-muted" /></div>
      ) : (
        <>
          {/* ─── برگه‌های در انتظار ─── */}
          <div className="space-y-2">
            <div className="text-[12px] font-medium text-muted">
              برگه‌های در انتظار تأیید
              {vouchers.length > 0 && <span className="mr-1.5 text-accent">({vouchers.length})</span>}
            </div>
            {vouchers.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="برگه‌ای در انتظار تأیید نیست"
                description="وقتی برگه‌ی ورود، خروج یا ضایعات ثبت شود اینجا برای تأیید نمایش داده می‌شود."
                className="min-h-[200px] border border-border rounded-xl bg-surface"
              />
            ) : vouchers.map((v) => {
              const isOpen = expanded === v.id;
              const showPrices = canSeePrices && v.kind === 'in';
              return (
                <div key={v.id} className="bg-surface border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => setExpanded(isOpen ? null : v.id)}
                      className="flex items-center gap-2 text-right flex-1 min-w-0 min-h-[44px]"
                    >
                      {isOpen
                        ? <ChevronDown size={15} className="text-muted flex-shrink-0" />
                        : <ChevronLeft size={15} className="text-muted flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {v.parentVoucherId && (
                            <span className="text-[10px] bg-warn-subtle text-warn border border-warn/20 rounded px-1.5 py-0.5">اصلاحی</span>
                          )}
                          <span className="text-[13px] font-medium text-text">{VOUCHER_KIND_LABELS[v.kind] ?? v.kind}</span>
                          <span className="text-[11px] text-muted">{v.no} · {v.makerDate} · {v.lines.length} قلم</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {busy === v.id ? (
                        <Loader2 size={16} className="animate-spin text-muted" />
                      ) : canApprove ? (
                        <>
                          <button
                            onClick={() => approve(v)}
                            className="flex items-center gap-1 bg-ok text-white px-3 py-2 rounded-lg text-[12px] min-h-[44px]"
                          >
                            <Check size={13} />تأیید
                          </button>
                          <button
                            onClick={() => reject(v)}
                            className="flex items-center gap-1 text-danger border border-danger/20 px-3 py-2 rounded-lg text-[12px] min-h-[44px]"
                          >
                            <X size={13} />رد
                          </button>
                          <button
                            onClick={() => removeVoucher(v)}
                            className="w-11 h-11 flex items-center justify-center text-muted hover:text-danger rounded-lg"
                            title="حذف کامل"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-warn bg-warn-subtle rounded px-2 py-1">در انتظار تأیید</span>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="text-muted text-[11px]">
                            <th className="text-right pb-1.5">قلم</th>
                            <th className="text-left pb-1.5">مقدار</th>
                            {showPrices && <th className="text-left pb-1.5">قیمت واحد</th>}
                            {showPrices && <th className="text-left pb-1.5">جمع</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {v.lines.map((l, i) => (
                            <tr key={i} className="border-t border-border/50">
                              <td className="py-1.5 text-text">{itemName(l.itemId)}</td>
                              <td className="py-1.5 text-left num text-muted">{fmt(l.qtyBase)} {itemUnit(l.itemId)}</td>
                              {showPrices && <td className="py-1.5 text-left num text-muted">{fmt(l.estUnitCost)}</td>}
                              {showPrices && <td className="py-1.5 text-left num text-text">{fmt(Math.round(l.estUnitCost * l.qtyBase))}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {showPrices && (
                        <div className="flex justify-between mt-2 pt-2 border-t border-border text-[12.5px] font-medium text-text">
                          <span>جمع کل</span>
                          <span className="num">{fmt(v.estTotal)} تومان</span>
                        </div>
                      )}
                    </div>
                  )}
                  {v.note && <div className="text-[11px] text-muted mt-1.5">{v.note}</div>}
                </div>
              );
            })}
          </div>

          {/* ─── برگه‌های تأییدشده (SuperAdmin) ─── */}
          {isSuperAdmin && approvedVouchers.length > 0 && (
            <div className="space-y-2">
              <div className="text-[12px] font-medium text-muted">برگه‌های تأییدشده</div>
              {approvedVouchers.slice(0, 30).map((v) => (
                <div key={v.id} className="bg-bg border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {v.parentVoucherId && (
                        <span className="text-[10px] bg-warn-subtle text-warn border border-warn/20 rounded px-1.5 py-0.5">اصلاحی</span>
                      )}
                      <span className="text-[12.5px] font-medium text-text">{VOUCHER_KIND_LABELS[v.kind] ?? v.kind}</span>
                      <span className="text-[11px] text-muted">{v.no} · {v.makerDate}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleReversal(v.id)}
                    disabled={reversalLoading === v.id || !!v.parentVoucherId || v.kind === 'stocktake'}
                    title={
                      v.parentVoucherId
                        ? 'این برگه خودش اصلاحی است'
                        : v.kind === 'stocktake'
                        ? 'برگه‌ی انبارگردانی قابل اصلاح نیست'
                        : 'ایجاد برگه اصلاحی'
                    }
                    className="w-11 h-11 flex items-center justify-center text-muted hover:text-warn disabled:opacity-40 disabled:cursor-not-allowed rounded-lg"
                  >
                    {reversalLoading === v.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <RotateCcw size={14} strokeWidth={1.5} />}
                  </button>
                </div>
              ))}
              {approvedVouchers.length > 30 && (
                <div className="text-[11px] text-muted text-center py-1">
                  ... و {approvedVouchers.length - 30} برگه‌ی دیگر
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ─── Modal انتخاب صندوق ─── */}
      {pendingApprove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setPendingApprove(null)}
        >
          <div
            className="bg-surface rounded-xl shadow-modal p-5 w-80 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[14px] font-medium text-text mb-1">تأیید رسید خرید</h3>
            <p className="text-[11.5px] text-muted mb-4">
              برگه {pendingApprove.no} — صندوقی که هزینه از آن کسر می‌شود را انتخاب کنید.
            </p>
            <label className="text-[12px] text-muted block mb-1">صندوق پرداخت</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border text-[13px] focus:outline-none focus:ring-1 focus:ring-accent bg-surface mb-4"
            >
              <option value="">— انتخاب کنید —</option>
              {accounts.filter((a) => a.isActive).map((a) => (
                <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)} ت)</option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingApprove(null)}
                className="px-3 py-2 text-[12px] text-muted border border-border rounded-lg hover:bg-bg"
              >
                لغو
              </button>
              <button
                onClick={confirmApprove}
                disabled={!selectedAccountId || busy === pendingApprove.id}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] bg-ok text-white rounded-lg disabled:opacity-40"
              >
                <Check size={13} />
                {busy === pendingApprove.id ? 'در حال تأیید...' : 'تأیید'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
