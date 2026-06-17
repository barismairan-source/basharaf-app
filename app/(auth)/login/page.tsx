'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, AlertCircle } from 'lucide-react';

import { Button, Field, Input, PasswordInput } from '@/components/ui';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { useAppStore } from '@/store';

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore(s => s.login);
  const authLoading = useAppStore(s => s.authLoading);
  const authError = useAppStore(s => s.authError);
  const currentUser = useAppStore(s => s.user);
  const loadSettings = useAppStore(s => s._loadAppSettings);


  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  });

  const remember = watch('remember');

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { if (currentUser) router.replace('/dashboard'); }, [currentUser, router]);

  async function onSubmit(data: LoginInput) {
    const ok = await login(data.email, data.password, data.remember);
    if (ok) router.replace('/dashboard');
  }

  return (
    <div>
      {/* brand panel و لوگوی موبایل را (auth)/layout.tsx فراهم می‌کند */}
      <div>
        <div>
          <h2 className="text-[22px] font-medium text-stone-900 tracking-tight mb-1">ورود به حساب</h2>
          <p className="text-[13px] text-stone-500 mb-7">اطلاعات حساب خود را وارد کنید</p>

          {authError && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
              <div className="text-[12.5px] leading-6">{authError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="ایمیل" error={errors.email?.message}>
              <Input type="email" icon={Mail} dir="ltr" placeholder="name@example.com" hasError={!!errors.email} {...register('email')} />
            </Field>

            <Field
              label="رمز عبور"
              error={errors.password?.message}
              hint={
                <Link href="/forgot" className="text-[11px] text-muted hover:text-stone-700 transition-colors">
                  فراموش کرده‌اید؟
                </Link>
              }
            >
              <PasswordInput placeholder="رمز عبور" hasError={!!errors.password} {...register('password')} />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 rounded border-stone-300 accent-stone-900"
                checked={remember}
                onChange={e => setValue('remember', e.target.checked)}
              />
              <span className="text-[12.5px] text-stone-600">مرا به خاطر بسپار</span>
            </label>

            <Button type="submit" variant="primary" size="lg" loading={authLoading} className="w-full mt-2">
              ورود
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
