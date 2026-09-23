'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Copy, Receipt, AlertCircle } from 'lucide-react';

/** همان اطلاعات ثابت حساب — فقط شماره کارت، شبا و نام صاحب حساب (بدون CVV2/انقضا). */
const PAYMENT_ACCOUNT = {
  cardNumber: '6037991241845449',
  iban: 'IR660170000000122394357002',
  cardHolderName: 'حسین شرف الاسلامی',
  bankName: 'بانک ملی ایران',
};

interface ReceiptItem { name: string; qty: number; unitPrice: number }
interface ReceiptData { customerName?: string; items: ReceiptItem[]; date?: string }

function formatCardNumber(raw: string): string {
  return raw.replace(/(\d{4})(?=\d)/g, '$1 ');
}
function formatIban(raw: string): string {
  return raw.replace(/(.{4})(?=.)/g, '$1 ');
}
function formatToman(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}

/**
 * base64url → base64 استاندارد. لینک با base64url ساخته می‌شود (بخش «ساخت
 * لینک» در app/receipts/page.tsx) تا کاراکترهای «+» و «/» داخل query string
 * جابه‌جا/خراب نشوند («+» در query معمولاً به space تبدیل می‌شود).
 */
function decodeReceipt(encoded: string | null): ReceiptData | null {
  if (!encoded) return null;
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4 !== 0) base64 += '=';
    const json = decodeURIComponent(escape(atob(base64)));
    const data = JSON.parse(json);
    if (!Array.isArray(data.items)) return null;
    return data;
  } catch {
    return null;
  }
}

function CopyRow({ label, value, display, big }: { label: string; value: string; display?: string; big?: boolean }) {
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
        <span className={`mt-0.5 block truncate font-medium text-foreground ${big ? 'text-xl' : ''}`} dir="ltr">{display ?? value}</span>
      </span>
      <span className={`flex-shrink-0 ${copied ? 'text-emerald-600' : 'text-stone-300'}`}>
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </span>
    </button>
  );
}

function ReceiptViewContent() {
  const params = useSearchParams();
  const data = useMemo(() => decodeReceipt(params.get('d')), [params]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <AlertCircle size={28} className="mx-auto mb-3 text-stone-300" />
          <p className="text-sm text-muted-foreground">این لینک فیش معتبر نیست یا ناقص است.</p>
        </div>
      </div>
    );
  }

  const total = data.items.reduce((sum, it) => sum + it.qty * it.unitPrice, 0);
  const totalRial = total * 10;

  return (
    <div className="mx-auto max-w-md px-6 pb-20 pt-14 sm:pt-16">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900">
          <Receipt size={20} className="text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-semibold text-foreground">فیش پرداخت صفاسیتی</h1>
        {data.date && <p className="mt-1 text-[12px] text-muted-foreground">{data.date}</p>}
      </header>

      {data.customerName && (
        <div className="mt-6 rounded-2xl border border-border bg-white px-5 py-3.5 text-center shadow-sm">
          <span className="text-[12px] text-muted-foreground">مشتری گرامی</span>
          <p className="mt-0.5 font-medium text-foreground">{data.customerName}</p>
        </div>
      )}

      {/* آیتم‌ها */}
      <div className="mt-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <p className="mb-3 text-[12px] font-medium text-muted-foreground">اقلام</p>
        <div className="space-y-2.5">
          {data.items.map((it, i) => (
            <div key={i} className="flex items-baseline gap-2 text-[13px]">
              <span className="flex-1 text-foreground">{it.name}</span>
              {it.qty > 1 && <span className="text-muted-foreground">×{it.qty}</span>}
              <span className="tabular-nums text-foreground">{formatToman(it.qty * it.unitPrice)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-[13px] font-medium text-foreground">جمع کل</span>
          <span className="text-lg font-semibold tabular-nums text-foreground">{formatToman(total)} تومان</span>
        </div>
      </div>

      {/* پرداخت */}
      <div className="mt-4 space-y-2.5 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <p className="mb-1 text-[12px] font-medium text-muted-foreground">اطلاعات پرداخت</p>
        <CopyRow label="مبلغ قابل پرداخت" value={String(total)} display={`${formatToman(total)} تومان`} big />
        <CopyRow label="مبلغ به ریال (برای فرم بانکی)" value={String(totalRial)} display={`${formatToman(totalRial)} ریال`} />
        <CopyRow label="شماره کارت" value={PAYMENT_ACCOUNT.cardNumber} display={formatCardNumber(PAYMENT_ACCOUNT.cardNumber)} />
        <CopyRow label="شماره شبا" value={PAYMENT_ACCOUNT.iban} display={formatIban(PAYMENT_ACCOUNT.iban)} />
        <div className="rounded-xl bg-stone-50 px-4 py-3">
          <span className="block text-[11px] text-muted-foreground">به نام</span>
          <span className="mt-0.5 block font-medium text-foreground">{PAYMENT_ACCOUNT.cardHolderName} — {PAYMENT_ACCOUNT.bankName}</span>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted-foreground">
        بعد از واریز، لطفاً رسید پرداخت را برای ما ارسال کنید.
      </p>
    </div>
  );
}

export default function PublicReceiptViewPage() {
  return (
    <Suspense fallback={null}>
      <ReceiptViewContent />
    </Suspense>
  );
}
