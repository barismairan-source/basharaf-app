'use client';

import { useState } from 'react';
import { Check, Copy, Landmark } from 'lucide-react';

/** اطلاعات ثابت حساب حسین شرف‌الاسلامی — فقط برای دریافت وجه، بدون CVV2/تاریخ انقضا. */
const ACCOUNT = {
  cardNumber: '6037997461182769',
  iban: 'IR740170000000224294472005',
  accountNumber: '0224294472005',
  holderName: 'حسین شرف‌الاسلامی',
  bankName: 'بانک ملی ایران',
  status: 'فعال',
};

function formatCardNumber(raw: string): string {
  return raw.replace(/(\d{4})(?=\d)/g, '$1 ');
}
function formatIban(raw: string): string {
  return raw.replace(/(.{4})(?=.)/g, '$1 ');
}

function CopyRow({ label, value, display }: { label: string; value: string; display?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <button onClick={handleCopy}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3.5 text-right transition-all hover:border-stone-300 hover:shadow-sm active:scale-[0.99]">
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] text-muted-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-[15px] font-medium tabular-nums text-foreground" dir="ltr">{display ?? value}</span>
      </span>
      <span className={`flex-shrink-0 ${copied ? 'text-emerald-600' : 'text-stone-300'}`}>
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </span>
    </button>
  );
}

export default function PayCard() {
  return (
    <div className="mx-auto max-w-md px-6 pb-20 pt-14 sm:pt-16">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900">
          <Landmark size={20} className="text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-semibold text-foreground">اطلاعات واریز</h1>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          حساب {ACCOUNT.status}
        </span>
      </header>

      <div className="mt-6 space-y-2.5 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <CopyRow label="شماره کارت" value={ACCOUNT.cardNumber} display={formatCardNumber(ACCOUNT.cardNumber)} />
        <CopyRow label="شماره شبا" value={ACCOUNT.iban} display={formatIban(ACCOUNT.iban)} />
        <CopyRow label="شماره حساب" value={ACCOUNT.accountNumber} />
        <div className="rounded-xl bg-stone-50 px-4 py-3">
          <span className="block text-[11px] text-muted-foreground">به نام</span>
          <span className="mt-0.5 block font-medium text-foreground">{ACCOUNT.holderName} — {ACCOUNT.bankName}</span>
        </div>
      </div>
    </div>
  );
}
