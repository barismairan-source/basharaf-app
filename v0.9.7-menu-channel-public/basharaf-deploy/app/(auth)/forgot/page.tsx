'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, CheckCircle2 } from 'lucide-react';

import { Button, Field, Input } from '@/components/ui';
import { forgotSchema, type ForgotInput } from '@/lib/validations/auth';

/**
 * صفحه فراموشی رمز عبور.
 *
 * در فاز ۹: یک پیام success ثابت نمایش می‌دهد (UX کامل) ولی ایمیل
 * واقعی ارسال نمی‌شود.
 *
 * در فاز ۱۰: به `/api/auth/forgot` متصل می‌شود که ایمیل reset link
 * را ارسال می‌کند.
 *
 * نکته امنیتی: حتی اگر ایمیل در سیستم نباشد، پاسخ مثبت می‌دهیم تا
 * email enumeration ممکن نباشد. این الگوی استاندارد امنیتی است.
 */
export default function ForgotPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: ForgotInput) {
    // simulate API call delay
    await new Promise((r) => setTimeout(r, 400));
    setSubmittedEmail(data.email);
  }

  if (submittedEmail) {
    return (
      <div>
        <div className="flex items-start gap-3 p-4 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-800">
          <CheckCircle2
            size={16}
            strokeWidth={1.5}
            className="mt-0.5 flex-shrink-0"
          />
          <div className="text-[12.5px] leading-7">
            اگر ایمیل <span dir="ltr" className="font-medium">{submittedEmail}</span>{' '}
            در سامانه ثبت شده باشد، لینک بازیابی برای آن ارسال می‌شود.
            صندوق ورودی خود را بررسی کنید.
          </div>
        </div>
        <Link
          href="/login"
          className="block mt-6 text-center text-[12.5px] text-stone-900 hover:underline"
        >
          بازگشت به صفحه ورود
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[22px] text-stone-900 font-medium tracking-tight mb-2">
        بازیابی رمز عبور
      </h2>
      <p className="text-[12.5px] text-stone-500 mb-8 leading-7">
        ایمیل خود را وارد کنید تا لینک بازیابی برای شما ارسال شود.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="ایمیل" error={errors.email?.message}>
          <Input
            type="email"
            placeholder="you@example.com"
            icon={Mail}
            dir="ltr"
            variant="auth"
            hasError={!!errors.email}
            autoComplete="email"
            {...register('email')}
          />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          loading={isSubmitting}
        >
          ارسال لینک بازیابی
        </Button>
      </form>

      <div className="text-center text-[12px] text-stone-500 mt-6">
        <Link href="/login" className="text-stone-900 hover:underline">
          بازگشت به صفحه ورود
        </Link>
      </div>
    </div>
  );
}
