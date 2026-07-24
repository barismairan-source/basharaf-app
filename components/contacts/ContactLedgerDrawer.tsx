'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Printer, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, FileText, Banknote, CreditCard, FileCheck, Plus, FileSignature } from 'lucide-react';
import { cn, fmt } from '@/lib/utils';
import { formatMoneyShort, formatSignedMoney } from '@/lib/design/format';
import type { ContactLedgerEntry } from '@/lib/db/contactLedger';

interface ContactInfo {
  id: string;
  name: string;
  type: string;
  phone: string | null;
}

interface Props {
  contactId: string | null;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  customer: 'مشتری',
  supplier: 'تأمین‌کننده',
  other: 'سایر',
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  approved: { label: 'تأیید شده', color: 'text-ok' },
  pending:  { label: 'در انتظار', color: 'text-amber-600' },
  proforma: { label: 'پیش‌فاکتور', color: 'text-amber-600' },
  rejected: { label: 'رد شده',    color: 'text-danger' },
};

function EntryRow({ entry }: { entry: ContactLedgerEntry }) {
  const isIncome = entry.type === 'income';
  const Icon = isIncome ? ArrowUpRight : ArrowDownLeft;
  const amtColor = isIncome ? 'text-ok' : 'text-danger';
  const statusMeta = STATUS_LABEL[entry.status] ?? { label: entry.status, color: 'text-muted' };

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <Icon size={14} strokeWidth={1.5} className={cn('mt-0.5 flex-shrink-0', amtColor)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[12.5px] text-text truncate">{entry.title}</span>
          <span className={cn('text-[12.5px] font-medium num shrink-0', amtColor)}>
            {formatSignedMoney(isIncome ? entry.amount : -entry.amount, { showPlus: true, short: true })}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10.5px] text-muted num">{entry.date}</span>
          {entry.invoiceCode && (
            <span className="text-[10.5px] text-muted">· {entry.invoiceCode}</span>
          )}
          <span className={cn('text-[10.5px]', statusMeta.color)}>{statusMeta.label}</span>
        </div>
      </div>
    </li>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 px-5 py-2 bg-stone-50/80 border-y border-border">
      <Icon size={12} strokeWidth={1.5} className="text-muted" />
      <span className="text-[10.5px] text-muted font-medium">{label}</span>
    </div>
  );
}

type ChequeMini = { id: string; kind: 'received' | 'issued'; amount: number; serialNo: string; bankName: string; dueDateJalali: string; status: string };

const CHQ_STATUS_LABEL: Record<string, string> = {
  pending: 'در جریان', cashed: 'وصول', bounced: 'برگشتی', returned: 'عودت', spent: 'خرج‌شده',
};
const CHQ_STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600', cashed: 'text-green-700', bounced: 'text-danger',
  returned: 'text-muted', spent: 'text-purple-700',
};

export function ContactLedgerDrawer({ contactId, onClose }: Props) {
  const open = contactId !== null;
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [entries, setEntries] = useState<ContactLedgerEntry[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [cheques, setCheques] = useState<ChequeMini[]>([]);

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setContact(null);
    setEntries([]);
    setCheques([]);
    try {
      const [ledgerRes, chqRes] = await Promise.all([
        fetch(`/api/contacts/${id}/ledger`),
        fetch(`/api/contacts/${id}/cheques`),
      ]);
      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setContact(data.contact);
        setEntries(data.entries);
        setBalance(data.balance);
      }
      if (chqRes.ok) {
        const data = await chqRes.json();
        setCheques(data.cheques ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (contactId) load(contactId);
  }, [contactId, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const cashEntries   = entries.filter(e => !e.isCredit);
  const creditEntries = entries.filter(e => e.isCredit);

  const approvedCash    = cashEntries.filter(e => e.status === 'approved');
  const cashIncome      = approvedCash.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const cashExpense     = approvedCash.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed top-0 right-0 z-50 h-full w-full max-w-md bg-surface shadow-modal',
          'flex flex-col transition-transform duration-300 ease-out print:static print:shadow-none print:max-w-none',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            {contact ? (
              <>
                <div className="text-[14px] font-medium text-text truncate">{contact.name}</div>
                <div className="text-[11px] text-muted">
                  {TYPE_LABELS[contact.type] ?? contact.type}
                  {contact.phone && <span className="mr-2" dir="ltr">{contact.phone}</span>}
                </div>
              </>
            ) : (
              <div className="text-[14px] font-medium text-text">دفتر حساب</div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted hover:text-text hover:bg-bg transition-colors print:hidden"
              title="چاپ"
            >
              <Printer size={15} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-md text-muted hover:text-text hover:bg-bg transition-colors print:hidden"
              aria-label="بستن"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* مانده نسیه */}
        {!loading && contact && (
          <div className="px-5 py-3 border-b border-border shrink-0 bg-bg/60">
            <div className="text-[10.5px] text-muted mb-0.5">مانده‌ی نسیه (تأییدشده)</div>
            {balance === 0 ? (
              <div className="text-[15px] font-medium text-muted">تسویه</div>
            ) : balance > 0 ? (
              <div>
                <span className="text-[15px] font-medium text-emerald-700 num" title={`${fmt(balance)} تومان`}>
                  {formatMoneyShort(balance)}
                </span>
                <span className="text-[10.5px] text-muted mr-1.5">بدهکار به ما</span>
              </div>
            ) : (
              <div>
                <span className="text-[15px] font-medium text-rose-700 num" title={`${fmt(Math.abs(balance))} تومان`}>
                  {formatMoneyShort(Math.abs(balance))}
                </span>
                <span className="text-[10.5px] text-muted mr-1.5">طلبکار از ما</span>
              </div>
            )}
          </div>
        )}

        {/* entries */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-2 p-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-lg bg-stone-100 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-muted">
              <FileText size={28} strokeWidth={1} className="mb-2 opacity-40" />
              <div className="text-[12.5px]">هیچ تراکنشی برای این طرف‌حساب ثبت نشده</div>
            </div>
          )}

          {!loading && entries.length > 0 && (
            <>
              {/* بخش مبادلات نقدی */}
              {cashEntries.length > 0 && (
                <>
                  <SectionHeader icon={Banknote} label="مبادلات نقدی" />
                  <ul className="divide-y divide-border">
                    {cashEntries.map(entry => <EntryRow key={entry.id} entry={entry} />)}
                  </ul>
                  {(cashIncome > 0 || cashExpense > 0) && (
                    <div className="flex gap-4 px-5 py-2.5 border-b border-border bg-stone-50/50">
                      {cashIncome > 0 && (
                        <div>
                          <div className="text-[9.5px] text-muted mb-0.5">جمع دریافتی نقدی</div>
                          <span className="text-[12px] font-medium text-emerald-700 num" title={`${fmt(cashIncome)} تومان`}>
                            {formatMoneyShort(cashIncome)}
                          </span>
                        </div>
                      )}
                      {cashExpense > 0 && (
                        <div>
                          <div className="text-[9.5px] text-muted mb-0.5">جمع پرداختی نقدی</div>
                          <span className="text-[12px] font-medium text-rose-700 num" title={`${fmt(cashExpense)} تومان`}>
                            {formatMoneyShort(cashExpense)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* بخش حساب‌های نسیه */}
              {creditEntries.length > 0 && (
                <>
                  <SectionHeader icon={CreditCard} label="حساب‌های نسیه" />
                  <ul className="divide-y divide-border">
                    {creditEntries.map(entry => <EntryRow key={entry.id} entry={entry} />)}
                  </ul>
                </>
              )}

              {creditEntries.length === 0 && (
                <div className="px-5 py-3 text-[11px] text-muted italic border-t border-border/60">
                  هیچ تراکنش نسیه‌ای ثبت نشده
                </div>
              )}
            </>
          )}

          {/* بخش چک‌ها */}
          {!loading && cheques.length > 0 && (
            <>
              <SectionHeader icon={FileCheck} label="چک‌ها" />
              <ul className="divide-y divide-border">
                {cheques.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div>
                      <div className="text-[12px] text-text">
                        {c.kind === 'received' ? 'دریافتی' : 'پرداختی'}
                        {c.serialNo ? ` · ${c.serialNo}` : ''}
                        {c.bankName ? ` · ${c.bankName}` : ''}
                      </div>
                      <div className="text-[10.5px] text-muted num mt-0.5">سررسید {c.dueDateJalali}</div>
                    </div>
                    <div className="text-left shrink-0">
                      <div className="num text-[12px] font-medium">{fmt(c.amount)} ت</div>
                      <div className={`text-[10.5px] mt-0.5 ${CHQ_STATUS_COLOR[c.status] ?? 'text-muted'}`}>
                        {CHQ_STATUS_LABEL[c.status] ?? c.status}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* اقدامات سریع */}
          {!loading && contact && (
            <div className="border-t border-border px-5 py-4 mt-auto">
              <div className="text-[10.5px] text-muted mb-2.5 font-medium">اقدامات سریع</div>
              <div className="flex flex-col gap-2">
                <a
                  href={`/transactions/new?prefill_contactId=${contactId}`}
                  className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-[12.5px] text-text hover:bg-bg transition-colors"
                >
                  <Plus size={13} strokeWidth={1.5} className="text-muted" />
                  ثبت تراکنش با این طرف‌حساب
                </a>
                <a
                  href={`/cheques`}
                  className="flex items-center gap-2 h-9 px-3 rounded-lg border border-border text-[12.5px] text-text hover:bg-bg transition-colors"
                >
                  <FileSignature size={13} strokeWidth={1.5} className="text-muted" />
                  ثبت / مشاهده چک‌ها
                </a>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
