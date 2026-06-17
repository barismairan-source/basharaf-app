'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { XCircle, X } from 'lucide-react';

import { Button, Card, Field, Textarea } from '@/components/ui';
import {
  rejectionSchema,
  type RejectionInput,
} from '@/lib/validations/transaction';
import type { Transaction } from '@/types';
import { fmt } from '@/lib/utils';

/**
 * RejectModal — مودال تایید رد تراکنش.
 *
 * منطق:
 * - عنوان واضح: «رد تراکنش»
 * - نمایش خلاصه تراکنش (عنوان + مبلغ + شعبه)
 * - فیلد دلیل (اختیاری)
 * - دو دکمه: «لغو» و «رد قطعی»
 *
 * دلیل به submit پاس داده می‌شود؛ اگر خالی باشد، repo خودش
 * «بدون دلیل ذکرشده» را به‌جای آن ذخیره می‌کند.
 *
 * دسترس‌پذیری:
 * - role="dialog" + aria-modal
 * - Escape برای بستن
 * - Focus trap ساده (input داخل modal اولین focus)
 */
interface RejectModalProps {
  tx: Transaction;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  loading?: boolean;
}

export function RejectModal({
  tx,
  onCancel,
  onConfirm,
  loading = false,
}: RejectModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectionInput>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: '' },
  });

  // Escape برای بستن
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel, loading]);

  // Lock body scroll هنگامی که modal باز است
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  async function onSubmit(data: RejectionInput) {
    await onConfirm(data.reason ?? '');
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40"
        onClick={() => !loading && onCancel()}
        aria-hidden="true"
      />

      {/* Modal */}
      <Card className="relative w-full max-w-md shadow-modal animate-slide-up">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <XCircle size={18} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="reject-modal-title"
                  className="text-[15px] font-medium text-stone-900"
                >
                  رد تراکنش
                </h2>
                <div className="text-[11.5px] text-stone-500 mt-0.5">
                  این عمل قابل بازگشت نیست
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !loading && onCancel()}
              disabled={loading}
              aria-label="بستن"
              className="w-8 h-8 rounded-md hover:bg-stone-50 flex items-center justify-center text-muted transition-colors disabled:opacity-40"
            >
              <X size={14} strokeWidth={1.5} aria-hidden="true" />
            </button>
          </div>

          {/* Transaction summary */}
          <div className="mt-4 p-3 rounded-md bg-stone-50 border border-stone-100">
            <div className="text-[13px] text-stone-800">{tx.title}</div>
            <div className="text-[11.5px] text-stone-500 mt-1 flex items-center gap-2">
              <span>{tx.branch}</span>
              <span>·</span>
              <span
                className={
                  tx.type === 'income'
                    ? 'text-emerald-700 tabular-nums'
                    : 'text-rose-700 tabular-nums'
                }
              >
                {tx.type === 'income' ? '+' : '−'} {fmt(tx.amount)} تومان
              </span>
            </div>
          </div>

          {/* Reason form */}
          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <Field
              label="دلیل رد (اختیاری)"
              error={errors.reason?.message}
              helper="این دلیل برای کاربر ثبت‌کننده تراکنش قابل مشاهده خواهد بود"
            >
              <Textarea
                rows={3}
                placeholder="مثلاً: مبلغ نادرست، فاقد رسید، تکراری..."
                hasError={!!errors.reason}
                autoFocus
                {...register('reason')}
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="default"
                onClick={onCancel}
                disabled={loading}
              >
                لغو
              </Button>
              <Button
                type="submit"
                variant="destructive"
                loading={loading}
                icon={XCircle}
              >
                رد قطعی
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
