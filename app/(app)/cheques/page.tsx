'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Edit2, Trash2, AlertTriangle, Clock, CheckCircle2, XCircle, RotateCcw, Banknote } from 'lucide-react';
import { useAppStore } from '@/store';
import { fmt, toFa } from '@/lib/utils';
import { getTodayJalali, jalaliToDate, isValidJalaliString } from '@/lib/jalali';
import { Button, JalaliDatePicker, PageHeader, Sheet } from '@/components/ui';
import type { Cheque, ChequeStatus, ChequeKind, Contact } from '@/types';

// ── ثوابت ──────────────────────────────────────────────────────────

const STATUS_META: Record<ChequeStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'در جریان',    color: 'bg-amber-100 text-amber-700',  icon: <Clock size={11} /> },
  cashed:   { label: 'وصول شد',     color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={11} /> },
  bounced:  { label: 'برگشت خورد',  color: 'bg-red-100 text-red-700',      icon: <XCircle size={11} /> },
  returned: { label: 'عودت داده شد',color: 'bg-slate-100 text-slate-600',  icon: <RotateCcw size={11} /> },
  spent:    { label: 'خرج شد',      color: 'bg-purple-100 text-purple-700',icon: <Banknote size={11} /> },
};

const STATUS_OPTIONS: { value: ChequeStatus; label: string }[] = [
  { value: 'pending',  label: 'در جریان' },
  { value: 'cashed',   label: 'وصول شد' },
  { value: 'bounced',  label: 'برگشت خورد' },
  { value: 'returned', label: 'عودت داده شد' },
  { value: 'spent',    label: 'خرج شد' },
];

// ── helpers ─────────────────────────────────────────────────────────

function dueDanger(dueDateJalali: string, status: ChequeStatus): 'overdue' | 'soon' | null {
  if (status !== 'pending') return null;
  const due = jalaliToDate(dueDateJalali);
  if (!due) return null;
  const now = Date.now();
  const diff = Math.ceil((due.getTime() - now) / 86_400_000);
  if (diff < 0) return 'overdue';
  if (diff <= 7) return 'soon';
  return null;
}

function errMsg(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message && !/^HTTP \d+$/.test(e.message)) return e.message;
  return fallback;
}

// ── form ─────────────────────────────────────────────────────────────

interface ChqForm {
  kind: ChequeKind;
  contactId: string;
  amount: string;
  serialNo: string;
  bankName: string;
  dueDateJalali: string;
  note: string;
  branchId: string;
}

const EMPTY_FORM: ChqForm = {
  kind: 'received', contactId: '', amount: '',
  serialNo: '', bankName: '', dueDateJalali: '',
  note: '', branchId: '',
};

// ── main component ────────────────────────────────────────────────────

export default function ChequesPage() {
  const user      = useAppStore((s) => s.user);
  const branches  = useAppStore((s) => s.branches);
  const showToast = useAppStore((s) => s.showToast);
  const router    = useRouter();

  const [cheques, setCheques]     = useState<Cheque[]>([]);
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState<ChequeKind>('received');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem]   = useState<Cheque | null>(null);
  const [form, setForm]           = useState<ChqForm>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [statusChanging, setStatusChanging] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'SuperAdmin';

  // ── load ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chqRes, ctRes] = await Promise.all([
        fetch('/api/cheques', { credentials: 'include' }),
        fetch('/api/contacts', { credentials: 'include' }),
      ]);
      const [chqData, ctData] = await Promise.all([chqRes.json(), ctRes.json()]);
      setCheques(chqData.cheques ?? []);
      setContacts(ctData.contacts ?? []);
    } catch {
      showToast('خطا در بارگذاری', 'danger');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  // ── form ──────────────────────────────────────────────────────────

  function openAdd() {
    setEditItem(null);
    setForm({
      ...EMPTY_FORM,
      kind: tab,
      dueDateJalali: getTodayJalali(),
      branchId: branches[0]?.id ?? '',
    });
    setSheetOpen(true);
  }

  function openEdit(c: Cheque) {
    setEditItem(c);
    setForm({
      kind: c.kind,
      contactId: c.contactId ?? '',
      amount: String(c.amount),
      serialNo: c.serialNo,
      bankName: c.bankName,
      dueDateJalali: c.dueDateJalali,
      note: c.note,
      branchId: c.branchId ?? '',
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    const amt = parseInt(form.amount.replace(/\D/g, ''), 10);
    if (!amt || amt <= 0) { showToast('مبلغ معتبر وارد کنید', 'danger'); return; }
    if (!isValidJalaliString(form.dueDateJalali)) { showToast('تاریخ سررسید نامعتبر', 'danger'); return; }

    setSaving(true);
    try {
      const body = {
        kind: form.kind,
        contactId: form.contactId || null,
        amount: amt,
        serialNo: form.serialNo,
        bankName: form.bankName,
        dueDateJalali: form.dueDateJalali,
        note: form.note,
        branchId: form.branchId || null,
      };
      const url  = editItem ? `/api/cheques/${editItem.id}` : '/api/cheques';
      const method = editItem ? 'PATCH' : 'POST';
      const res  = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(editItem ? 'چک به‌روز شد' : 'چک ثبت شد', 'success');
      setSheetOpen(false);
      await load();
    } catch (e) {
      showToast(errMsg(e, 'خطا در ذخیره'), 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, newStatus: ChequeStatus) {
    setStatusChanging(id);
    try {
      const res = await fetch(`/api/cheques/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCheques((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
    } catch (e) {
      showToast(errMsg(e, 'خطا در تغییر وضعیت'), 'danger');
    } finally {
      setStatusChanging(null);
    }
  }

  async function handleDelete(c: Cheque) {
    if (!confirm(`حذف چک شماره «${c.serialNo || c.id.slice(0, 8)}»؟`)) return;
    setDeleting(c.id);
    try {
      await fetch(`/api/cheques/${c.id}`, { method: 'DELETE', credentials: 'include' });
      showToast('چک حذف شد', 'success');
      setCheques((prev) => prev.filter((x) => x.id !== c.id));
    } catch {
      showToast('خطا در حذف', 'danger');
    } finally {
      setDeleting(null);
    }
  }

  // ── مسیر به فرم تراکنش برای ثبت وصول ────────────────────────────

  function goToNewTransaction(c: Cheque) {
    const type = c.kind === 'received' ? 'income' : 'expense';
    const title = c.kind === 'received'
      ? `وصول چک ${c.serialNo || ''} - ${c.bankName || ''}`
      : `پرداخت چک ${c.serialNo || ''} - ${c.bankName || ''}`;
    const params = new URLSearchParams({
      prefill_type:      type,
      prefill_amount:    String(c.amount),
      prefill_title:     title.trim(),
      prefill_note:      `چک شماره ${c.serialNo || c.id.slice(0, 8)} بانک ${c.bankName}`.trim(),
      ...(c.contactId ? { prefill_contactId: c.contactId } : {}),
    });
    router.push(`/transactions/new?${params.toString()}`);
  }

  // ── filters + summary ─────────────────────────────────────────────

  const received = cheques.filter((c) => c.kind === 'received');
  const issued   = cheques.filter((c) => c.kind === 'issued');
  const current  = tab === 'received' ? received : issued;

  const pendingReceived = received.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
  const pendingIssued   = issued.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
  const dueSoonCount    = cheques.filter((c) => dueDanger(c.dueDateJalali, c.status) !== null).length;

  if (!user) return null;

  return (
    <>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
        <PageHeader
          title="مدیریت چک"
          actions={<Button variant="primary" icon={Plus} onClick={openAdd}>چک جدید</Button>}
        />

        {/* ─── Summary cards ─── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-[11px] text-muted mb-1">دریافتی در جریان</div>
            <div className="num text-[14px] font-semibold text-ok">{fmt(pendingReceived)} ت</div>
          </div>
          <div className="bg-surface border border-border rounded-lg px-4 py-3">
            <div className="text-[11px] text-muted mb-1">پرداختی در جریان</div>
            <div className="num text-[14px] font-semibold text-danger">{fmt(pendingIssued)} ت</div>
          </div>
          <div className={`rounded-lg px-4 py-3 border ${dueSoonCount > 0 ? 'bg-amber-50 border-amber-200' : 'bg-surface border-border'}`}>
            <div className="text-[11px] text-muted mb-1">نزدیک/گذشته سررسید</div>
            <div className={`num text-[14px] font-semibold ${dueSoonCount > 0 ? 'text-amber-700' : 'text-muted'}`}>
              {toFa(dueSoonCount)} چک
            </div>
          </div>
        </div>

        {/* ─── Tabs ─── */}
        <div className="flex gap-1 border-b border-border">
          {(['received', 'issued'] as ChequeKind[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2.5 text-[12.5px] border-b-2 -mb-px transition-colors ${tab === k ? 'border-text text-text font-medium' : 'border-transparent text-muted'}`}
            >
              {k === 'received' ? `دریافتی (${toFa(received.length)})` : `پرداختی (${toFa(issued.length)})`}
            </button>
          ))}
        </div>

        {/* ─── Table ─── */}
        {loading ? (
          <div className="py-12 text-center text-[13px] text-muted">در حال بارگذاری...</div>
        ) : current.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-muted">
            چکی ثبت نشده
            <button onClick={openAdd} className="block mx-auto mt-3 text-accent text-[12px] underline">+ ثبت اولین چک</button>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-muted text-[11px]">
                  <th className="text-right px-4 py-2.5 font-normal">شماره</th>
                  <th className="text-right px-3 py-2.5 font-normal">طرف‌حساب</th>
                  <th className="text-left px-3 py-2.5 font-normal">مبلغ</th>
                  <th className="text-right px-3 py-2.5 font-normal hidden md:table-cell">بانک</th>
                  <th className="text-right px-3 py-2.5 font-normal">سررسید</th>
                  <th className="text-right px-3 py-2.5 font-normal">وضعیت</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {current.map((c) => {
                  const danger = dueDanger(c.dueDateJalali, c.status);
                  const rowCls = danger === 'overdue' ? 'bg-red-50/60' : danger === 'soon' ? 'bg-amber-50/60' : '';
                  const sm = STATUS_META[c.status];
                  return (
                    <tr key={c.id} className={`hover:bg-bg/50 ${rowCls}`}>
                      <td className="px-4 py-3 num">{c.serialNo || <span className="text-muted">—</span>}</td>
                      <td className="px-3 py-3 truncate max-w-[120px]">{c.contactName ?? <span className="text-muted">—</span>}</td>
                      <td className="px-3 py-3 text-left num font-medium">{fmt(c.amount)} ت</td>
                      <td className="px-3 py-3 hidden md:table-cell text-muted">{c.bankName || '—'}</td>
                      <td className="px-3 py-3 num">
                        <span className={danger === 'overdue' ? 'text-danger font-medium' : danger === 'soon' ? 'text-amber-600 font-medium' : ''}>
                          {c.dueDateJalali}
                          {danger === 'overdue' && <AlertTriangle size={11} className="inline mr-1 text-danger" />}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={c.status}
                          onChange={(e) => handleStatusChange(c.id, e.target.value as ChequeStatus)}
                          disabled={statusChanging === c.id}
                          className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent ${sm.color}`}
                        >
                          {STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-0.5">
                          {c.status === 'pending' && (
                            <button
                              onClick={() => goToNewTransaction(c)}
                              title="ثبت تراکنش"
                              className="w-8 h-8 flex items-center justify-center text-muted hover:text-ok transition-colors"
                            >
                              <Banknote size={14} strokeWidth={1.5} />
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(c)}
                            className="w-8 h-8 flex items-center justify-center text-muted hover:text-text transition-colors"
                          >
                            <Edit2 size={13} strokeWidth={1.5} />
                          </button>
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDelete(c)}
                              disabled={deleting === c.id}
                              className="w-8 h-8 flex items-center justify-center text-muted hover:text-danger transition-colors"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* ─── Create / Edit Sheet ─── */}
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editItem ? 'ویرایش چک' : 'ثبت چک جدید'}
        maxHeight="90vh"
      >
        <div className="space-y-4 pb-6">
          {/* نوع */}
          <div>
            <label className="block text-[12px] text-muted mb-1">نوع چک</label>
            <div className="flex gap-2">
              {(['received', 'issued'] as ChequeKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, kind: k }))}
                  className={`flex-1 py-2.5 rounded-lg text-[13px] border transition-colors ${form.kind === k ? 'border-accent bg-accent-subtle text-accent font-medium' : 'border-border text-muted hover:text-text'}`}
                >
                  {k === 'received' ? 'دریافتی' : 'پرداختی'}
                </button>
              ))}
            </div>
          </div>

          {/* مبلغ */}
          <div>
            <label className="block text-[12px] text-muted mb-1">مبلغ (تومان) <span className="text-danger">*</span></label>
            <input
              type="text"
              inputMode="numeric"
              dir="ltr"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^\d]/g, '') }))}
              placeholder="مثلاً ۵۰۰۰۰۰۰"
              className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent num"
            />
          </div>

          {/* سررسید */}
          <div>
            <label className="block text-[12px] text-muted mb-1">تاریخ سررسید <span className="text-danger">*</span></label>
            <JalaliDatePicker
              value={form.dueDateJalali}
              onChange={(v) => setForm((f) => ({ ...f, dueDateJalali: v }))}
            />
          </div>

          {/* شماره + بانک */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-muted mb-1">شماره چک</label>
              <input
                value={form.serialNo}
                onChange={(e) => setForm((f) => ({ ...f, serialNo: e.target.value }))}
                placeholder="مثلاً ۱۲۳۴۵۶"
                className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-[12px] text-muted mb-1">بانک</label>
              <input
                value={form.bankName}
                onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                placeholder="مثلاً ملت"
                className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* طرف‌حساب */}
          <div>
            <label className="block text-[12px] text-muted mb-1">طرف‌حساب</label>
            <select
              value={form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
              className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">— بدون طرف‌حساب —</option>
              {contacts.map((ct) => (
                <option key={ct.id} value={ct.id}>{ct.name}</option>
              ))}
            </select>
          </div>

          {/* شعبه (SuperAdmin) */}
          {isSuperAdmin && (
            <div>
              <label className="block text-[12px] text-muted mb-1">شعبه</label>
              <select
                value={form.branchId}
                onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">— بدون شعبه —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          {/* توضیح */}
          <div>
            <label className="block text-[12px] text-muted mb-1">توضیح</label>
            <input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full h-11 px-3 text-[13px] border border-border rounded-lg bg-surface focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 bg-text text-surface py-3 rounded-lg text-[13px] disabled:opacity-50 font-medium"
          >
            {saving ? 'در حال ذخیره...' : editItem ? 'ذخیره تغییرات' : 'ثبت چک'}
          </button>
        </div>
      </Sheet>
    </>
  );
}
