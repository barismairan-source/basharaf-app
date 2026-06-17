import * as React from 'react';
import { cn } from '@/lib/utils';

export interface FieldProps {
  /** متن label در بالا */
  label: React.ReactNode;
  /** input یا هر کنترل دیگری */
  children: React.ReactNode;
  /** متن کوچک سمت چپ label (مثلاً «حداقل ۸ کاراکتر» یا یک لینک) */
  hint?: React.ReactNode;
  /** متن خطا — اگر set باشد، با رنگ rose زیر فیلد نمایش */
  error?: React.ReactNode;
  /**
   * متن کمکی زیر input (مثلاً «معادل: ۱،۲۳۴ تومان»).
   * اگر `error` ست باشد، helper مخفی می‌شود (تا overlap نشود).
   */
  helper?: React.ReactNode;
  className?: string;
}

/**
 * Field — یک wrapper برای ترکیب «label + input + hint + error + helper» در فرم.
 *
 * تفاوت بین hint، error، و helper:
 * - hint: متن کوچک کنار label در بالا (مثلاً «فراموش کرده‌اید؟»)
 * - error: پیام validation با رنگ rose، زیر input
 * - helper: متن کمکی neutral، زیر input. اگر error هم باشد، helper مخفی می‌شود.
 *
 * استفاده:
 *   <Field label="ایمیل">
 *     <Input icon={Mail} dir="ltr" />
 *   </Field>
 *
 *   <Field label="رمز عبور" hint={<a>فراموش کرده‌اید؟</a>}>
 *     <PasswordInput />
 *   </Field>
 *
 *   <Field label="رمز عبور" error="رمز عبور حداقل ۸ کاراکتر">
 *     <PasswordInput hasError />
 *   </Field>
 *
 *   <Field label="مبلغ" helper="معادل: ۱،۲۳۴،۵۶۷ تومان">
 *     <Input />
 *   </Field>
 */
export function Field({
  label,
  children,
  hint,
  error,
  helper,
  className,
}: FieldProps) {
  return (
    <div className={cn(className)}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[12px] text-stone-600">{label}</div>
        {hint && <div className="text-[11px] text-stone-400">{hint}</div>}
      </div>
      {children}
      {error ? (
        <div className="text-[11px] text-rose-600 mt-1" role="alert">
          {error}
        </div>
      ) : helper ? (
        <div className="text-[11px] text-stone-400 mt-1">{helper}</div>
      ) : null}
    </div>
  );
}
