'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, User as UserIcon, Info } from 'lucide-react';

import {
  Button,
  Checkbox,
  Field,
  Input,
  PasswordInput,
} from '@/components/ui';
import { signupSchema, type SignupInput } from '@/lib/validations/auth';

/**
 * صفحه ثبت‌نام.
 *
 * در فاز ۹: ثبت‌نام آزاد فعال نیست — فقط SuperAdmin می‌تواند کاربر اضافه کند
 * (از طریق صفحه تنظیمات > تیم). این صفحه فقط برای نمایش UI ساخته شده.
 *
 * در فاز ۱۰: می‌توان این را به یکی از این دو حالت تبدیل کرد:
 * 1. ثبت‌نام آزاد با تایید email (مدل B2C)
 * 2. ثبت‌نام با کد دعوت که SuperAdmin می‌سازد (مدل B2B — احتمالاً برای این پروژه)
 *
 * هنگام submit، یک پیام نشان داده می‌شود که می‌گوید ثبت‌نام فعال نیست.
 */
export default function SignupPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordConfirm: '',
      acceptTerms: false,
    },
  });

  const acceptTerms = watch('acceptTerms');

  function onSubmit(_data: SignupInput) {
    // در فاز ۹ فقط پیام نشان می‌دهیم. در فاز ۱۰ به API می‌رود.
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div>
        <div className="flex items-start gap-2 p-4 rounded-md bg-amber-50 border border-amber-100 text-amber-800">
          <Info size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
          <div className="text-[12.5px] leading-7">
            ثبت‌نام آزاد در حال حاضر فعال نیست. برای ساخت حساب جدید با
            مدیر کل سازمان خود تماس بگیرید.
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
        ساخت حساب
      </h2>
      <p className="text-[12.5px] text-stone-500 mb-8 leading-7">
        برای دسترسی به سامانه، یک حساب کاربری بسازید.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="نام و نام خانوادگی" error={errors.name?.message}>
          <Input
            type="text"
            placeholder="مثلاً علی باقری"
            icon={UserIcon}
            variant="auth"
            hasError={!!errors.name}
            autoComplete="name"
            {...register('name')}
          />
        </Field>

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

        <Field
          label="رمز عبور"
          error={errors.password?.message}
        >
          <PasswordInput
            placeholder="حداقل ۸ کاراکتر"
            hasError={!!errors.password}
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>

        <Field label="تکرار رمز عبور" error={errors.passwordConfirm?.message}>
          <PasswordInput
            placeholder="••••••••"
            hasError={!!errors.passwordConfirm}
            autoComplete="new-password"
            {...register('passwordConfirm')}
          />
        </Field>

        <div>
          <Checkbox
            checked={!!acceptTerms}
            onChange={(e) =>
              setValue('acceptTerms', e.target.checked, { shouldValidate: true })
            }
            label="قوانین و حریم خصوصی را می‌پذیرم"
          />
          {errors.acceptTerms && (
            <div className="text-[11px] text-rose-600 mt-1.5">
              {errors.acceptTerms.message}
            </div>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
        >
          ساخت حساب
        </Button>
      </form>

      <div className="text-center text-[12px] text-stone-500 mt-6">
        قبلاً ثبت‌نام کرده‌اید؟{' '}
        <Link href="/login" className="text-stone-900 hover:underline">
          وارد شوید
        </Link>
      </div>
    </div>
  );
}
