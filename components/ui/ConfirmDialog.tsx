'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';

export interface ConfirmOptions {
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true → دکمه‌ی تأیید قرمز (برای اقدامات مخرب/غیرقابل‌بازگشت) */
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<ConfirmFn | null>(null);

/**
 * useConfirm — جایگزین `window.confirm()` بومی.
 *
 * نمونه استفاده (شکل تقریباً یکسان با window.confirm قدیمی):
 *   const confirm = useConfirm();
 *   ...
 *   if (!(await confirm({ title: 'این سفارش حذف شود؟', danger: true }))) return;
 *
 * باید داخل <ConfirmProvider> (در layout ریشه) استفاده شود.
 */
export function useConfirm(): ConfirmFn {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm باید داخل <ConfirmProvider> استفاده شود.');
  }
  return ctx;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export interface ConfirmProviderProps {
  children: React.ReactNode;
  /** تم دیالوگ — پنل ادمین تیره است، بقیه‌ی اپ روشن. */
  theme?: 'light' | 'dark';
}

/**
 * ConfirmProvider — یک‌بار در layout ریشه mount شود (هم اپ اصلی، هم پنل ادمین
 * با theme="dark" جداگانه، چون پنل ادمین از سیستم توکن رنگی مشترک استفاده
 * نمی‌کند و رنگ‌های stone-900/950 را مستقیم دارد).
 */
export function ConfirmProvider({ children, theme = 'light' }: ConfirmProviderProps) {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const confirmBtnRef = React.useRef<HTMLButtonElement>(null);

  const confirm = React.useCallback<ConfirmFn>((options) => {
    triggerRef.current = document.activeElement as HTMLElement | null;
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const close = React.useCallback((result: boolean) => {
    setPending((p) => {
      p?.resolve(result);
      return null;
    });
    // فوکس را به همان عنصری که دیالوگ را باز کرده برگردان
    triggerRef.current?.focus?.();
  }, []);

  React.useEffect(() => {
    if (!pending) return;
    confirmBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [pending, close]);

  const dark = theme === 'dark';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <>
          <div
            aria-hidden="true"
            onClick={() => close(false)}
            className="fixed inset-0 z-[60] bg-black/50"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            className={cn(
              'fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none'
            )}
          >
            <div
              className={cn(
                'w-full max-w-sm rounded-xl shadow-modal p-5 pointer-events-auto',
                dark
                  ? 'bg-stone-900 border border-stone-700'
                  : 'bg-surface border border-border'
              )}
            >
              <div className="flex items-start gap-3">
                {pending.danger && (
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0',
                    dark ? 'bg-red-950/50 text-red-400' : 'bg-danger-subtle text-danger'
                  )}>
                    <AlertTriangle size={16} aria-hidden />
                  </div>
                )}
                <div className="min-w-0">
                  <p
                    id="confirm-dialog-title"
                    className={cn('text-[14px] font-medium', dark ? 'text-stone-100' : 'text-text')}
                  >
                    {pending.title}
                  </p>
                  {pending.description && (
                    <p className={cn('text-[12.5px] mt-1.5 leading-relaxed', dark ? 'text-stone-400' : 'text-muted')}>
                      {pending.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => close(false)}
                  className={dark ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-800' : undefined}
                >
                  {pending.cancelLabel ?? 'انصراف'}
                </Button>
                <Button
                  ref={confirmBtnRef}
                  type="button"
                  variant={pending.danger ? 'destructive' : 'primary'}
                  size="sm"
                  onClick={() => close(true)}
                >
                  {pending.confirmLabel ?? 'تأیید'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </ConfirmContext.Provider>
  );
}
