'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Landmark, QrCode, Share2, Download, X, ChevronDown, AlertCircle } from 'lucide-react';

/** اطلاعات ثابت حساب حسین شرف‌الاسلامی — فقط برای دریافت وجه، بدون CVV2/تاریخ انقضا. هیچ عددی اینجا حدسی نیست. */
const ACCOUNT = {
  cardNumber: '6037997461182769',
  iban: 'IR740170000000224294472005',
  accountNumber: '0224294472005',
  holderName: 'حسین شرف‌الاسلامی',
  bankName: 'بانک ملی ایران',
};

const PAGE_URL = 'https://basharaf.me/pay';

function formatCardNumber(raw: string): string {
  return raw.replace(/(\d{4})(?=\d)/g, '$1 ');
}
function formatIban(raw: string): string {
  return raw.replace(/(.{4})(?=.)/g, '$1 ');
}

function buildAllInfoText(): string {
  return [
    `نام صاحب حساب: ${ACCOUNT.holderName}`,
    `بانک: ${ACCOUNT.bankName}`,
    `شماره کارت: ${ACCOUNT.cardNumber}`,
    `شماره شبا: ${ACCOUNT.iban}`,
    `شماره حساب: ${ACCOUNT.accountNumber}`,
  ].join('\n');
}

type Tone = 'success' | 'error';
type Announce = (text: string, tone: Tone) => void;
const AnnounceContext = createContext<Announce>(() => {});
const useAnnounce = () => useContext(AnnounceContext);

const ToastStateContext = createContext<{ text: string; tone: Tone } | null>(null);

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ text: string; tone: Tone } | null>(null);
  const timerRef = useRef<number>();

  const announce: Announce = (text, tone) => {
    setToast({ text, tone });
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  return (
    <AnnounceContext.Provider value={announce}>
      <ToastStateContext.Provider value={toast}>{children}</ToastStateContext.Provider>
    </AnnounceContext.Provider>
  );
}

function ToastViewport() {
  const toast = useContext(ToastStateContext);
  return (
    <div aria-live="polite" role="status" className="mt-4 min-h-[20px] text-center text-[12px]">
      {toast && <span className={toast.tone === 'success' ? 'text-emerald-700' : 'text-red-600'}>{toast.text}</span>}
    </div>
  );
}

async function copyValue(value: string, label: string, announce: Announce, onFail: () => void): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    announce(`${label} کپی شد`, 'success');
    return true;
  } catch {
    announce(`کپی ${label} انجام نشد — عدد را به‌صورت دستی انتخاب و کپی کنید`, 'error');
    onFail();
    return false;
  }
}

function CopyRow({ label, value, display, big }: { label: string; value: string; display?: string; big?: boolean }) {
  const announce = useAnnounce();
  const [copied, setCopied] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (manualMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [manualMode]);

  async function handleCopy() {
    const ok = await copyValue(value, label, announce, () => setManualMode(true));
    if (ok) {
      setManualMode(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3.5 transition-colors hover:border-stone-300">
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 text-right">
          <span className="block text-[11px] text-stone-500">{label}</span>
          <span className={`mt-0.5 block break-words font-medium tabular-nums text-stone-900 ${big ? 'text-[19px]' : 'text-[15px]'}`} dir="ltr">
            {display ?? value}
          </span>
        </span>
        <button
          onClick={handleCopy}
          aria-label={`کپی ${label}`}
          className="flex h-9 flex-shrink-0 items-center gap-1.5 rounded-lg bg-stone-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'کپی شد' : 'کپی'}
        </button>
      </div>
      {manualMode && (
        <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2">
          <AlertCircle size={14} className="flex-shrink-0 text-amber-600" />
          <input
            ref={inputRef}
            readOnly
            dir="ltr"
            value={value}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 bg-transparent text-[13px] tabular-nums text-stone-800 outline-none"
          />
        </div>
      )}
    </div>
  );
}

function QrModal({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, PAGE_URL, {
        width: 320, margin: 2, color: { dark: '#1c1917', light: '#ffffff' },
      }).catch(() => {});
    }
  }, []);
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div onClick={(e) => e.stopPropagation()} className="relative rounded-2xl bg-white p-5 shadow-xl">
        <button
          onClick={onClose}
          aria-label="بستن"
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        >
          <X size={16} />
        </button>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

function QrSection() {
  const announce = useAnnounce();
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, PAGE_URL, {
        width: 176, margin: 2, color: { dark: '#1c1917', light: '#ffffff' },
      }).catch(() => {});
    }
  }, [open]);

  async function handleDownload() {
    try {
      const size = 512;
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, PAGE_URL, { width: size, margin: 2, color: { dark: '#1c1917', light: '#ffffff' } });

      const padding = 40;
      const textBlockHeight = 96;
      const out = document.createElement('canvas');
      out.width = size + padding * 2;
      out.height = size + padding * 2 + textBlockHeight;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('no-ctx');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(qrCanvas, padding, padding);

      ctx.textAlign = 'center';
      ctx.direction = 'rtl';
      ctx.fillStyle = '#1c1917';
      ctx.font = '600 26px sans-serif';
      ctx.fillText(ACCOUNT.holderName, out.width / 2, size + padding + 38);

      ctx.direction = 'ltr';
      ctx.fillStyle = '#78716c';
      ctx.font = '400 18px sans-serif';
      ctx.fillText(PAGE_URL, out.width / 2, size + padding + 68);

      const link = document.createElement('a');
      link.download = 'basharaf-pay-qr.png';
      link.href = out.toDataURL('image/png');
      link.click();
      announce('تصویر کد اسکن دانلود شد', 'success');
    } catch {
      announce('دانلود تصویر انجام نشد', 'error');
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-white shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-2.5 rounded-2xl px-5 py-4 text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
        aria-expanded={open}
      >
        <QrCode size={16} strokeWidth={1.5} className="flex-shrink-0 text-stone-500" />
        <span className="flex-1 text-[13px] font-medium text-stone-800">نمایش کد اسکن</span>
        <ChevronDown size={15} className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-border p-5 text-center">
          <p className="mb-3 text-[12px] text-stone-500">اسکن برای مشاهده اطلاعات واریز</p>
          <button
            onClick={() => setZoomed(true)}
            className="mx-auto block rounded-xl border border-stone-200 p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label="بزرگ‌نمایی کد اسکن"
          >
            <canvas ref={canvasRef} />
          </button>
          <p className="mt-2 text-[11px] text-stone-400">اسکن این کد، همین صفحه‌ی اطلاعات واریز را باز می‌کند</p>
          <button
            onClick={handleDownload}
            className="mx-auto mt-3 flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-[12px] text-stone-700 hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
          >
            <Download size={13} />
            دانلود تصویر کد
          </button>
        </div>
      )}
      {zoomed && <QrModal onClose={() => setZoomed(false)} />}
    </div>
  );
}

function PayCardBody() {
  const announce = useAnnounce();
  const [copyingAll, setCopyingAll] = useState(false);

  async function handleCopyAll() {
    setCopyingAll(true);
    await copyValue(buildAllInfoText(), 'همه‌ی اطلاعات', announce, () => {});
    setCopyingAll(false);
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'اطلاعات واریز | با شرف', url: PAGE_URL });
      } catch {
        /* کاربر لغو کرد — نیازی به پیام خطا نیست */
      }
      return;
    }
    await copyValue(PAGE_URL, 'لینک صفحه', announce, () => {});
  }

  return (
    <div className="mx-auto max-w-md px-6 pb-20 pt-14 sm:pt-16">
      <header className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-900">
          <Landmark size={20} className="text-white" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-semibold text-stone-900">اطلاعات واریز</h1>
      </header>

      <div className="mt-6 rounded-xl bg-stone-100 px-4 py-3.5 text-center">
        <span className="block text-[11px] text-stone-500">به نام</span>
        <span className="mt-0.5 block text-[15px] font-medium text-stone-900">{ACCOUNT.holderName}</span>
        <span className="mt-0.5 block text-[12px] text-stone-500">{ACCOUNT.bankName}</span>
      </div>

      <div className="mt-3">
        <CopyRow label="شماره کارت" value={ACCOUNT.cardNumber} display={formatCardNumber(ACCOUNT.cardNumber)} big />
      </div>

      <div className="mt-3 space-y-2.5">
        <CopyRow label="شماره شبا" value={ACCOUNT.iban} display={formatIban(ACCOUNT.iban)} />
        <CopyRow label="شماره حساب" value={ACCOUNT.accountNumber} />
      </div>

      <button
        onClick={handleCopyAll}
        disabled={copyingAll}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white text-[13px] font-medium text-stone-800 transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 disabled:opacity-50"
      >
        <Copy size={14} />
        کپی همه اطلاعات
      </button>

      <QrSection />

      <button
        onClick={handleShare}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-stone-900 text-[13px] font-medium text-white transition-colors hover:bg-stone-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2"
      >
        <Share2 size={14} />
        اشتراک‌گذاری صفحه
      </button>

      <ToastViewport />
    </div>
  );
}

export default function PayCard() {
  return (
    <ToastProvider>
      <PayCardBody />
    </ToastProvider>
  );
}
