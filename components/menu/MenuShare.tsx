'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, QrCode, Share2, X } from 'lucide-react';
import { useLanguage } from '@/lib/menu/i18n';

/**
 * آیکون کوچک بالای منوی عمومی: با زدنش کد QR همین منو و لینکش نشان داده می‌شود تا مشتری بتواند
 * منو را به دیگری نشان بدهد یا بفرستد. کتابخانه‌ی QR فقط موقع باز شدن پنجره بار می‌شود تا منو سنگین نشود.
 */
export function MenuShare() {
  const { pick, mounted } = useLanguage();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setUrl(window.location.origin + window.location.pathname);
    setCanShare(typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    if (!open || !url) return;
    let cancelled = false;
    import('qrcode')
      .then(({ default: QRCode }) => {
        if (cancelled || !canvasRef.current) return;
        return QRCode.toCanvas(canvasRef.current, url, { width: 208, margin: 1, color: { dark: '#3A4454', light: '#FBF9F4' } });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open, url]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  function close() {
    setOpen(false);
    setCopied(false);
    openerRef.current?.focus();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // کپی مجاز نبود؛ لینک روی صفحه هست و می‌شود دستی انتخابش کرد.
    }
  }

  async function shareLink() {
    try {
      await navigator.share({ title: pick('Safasity menu', 'منوی صفاسیتی'), url });
    } catch {
      // کاربر پنجره‌ی اشتراک را بست.
    }
  }

  const label = pick('Share menu', 'اشتراک‌گذاری منو');

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
        className="fixed start-4 top-4 z-50 flex h-[2.125rem] w-[2.125rem] items-center justify-center rounded-full border border-border bg-background/80 text-muted-foreground shadow-dropdown backdrop-blur-md transition-colors duration-200 ease-out hover:text-foreground"
        style={{ opacity: mounted ? 1 : 0 }}
      >
        <QrCode className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs rounded-2xl border border-border bg-background p-6 text-center shadow-dropdown"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label={pick('Close', 'بستن')}
              className="absolute end-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>

            <canvas ref={canvasRef} width={208} height={208} className="mx-auto mt-3 rounded-lg" />
            <p className="mt-3 text-xs text-muted-foreground">{pick('Scan to see the menu', 'برای دیدن منو اسکن کنید')}</p>
            <p dir="ltr" className="mt-1 select-all break-all text-xs text-muted-foreground">{url.replace(/^https?:\/\//, '')}</p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-border text-xs font-medium text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied ? pick('Copied', 'کپی شد') : pick('Copy link', 'کپی لینک')}
              </button>
              {canShare && (
                <button
                  type="button"
                  onClick={shareLink}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary text-xs font-medium text-primary-foreground"
                >
                  <Share2 className="h-3.5 w-3.5" aria-hidden />
                  {pick('Share', 'ارسال')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
