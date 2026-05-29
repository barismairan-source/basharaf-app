'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button, Field, Input, PasswordInput } from '@/components/ui';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
import { useAppStore, useSetting } from '@/store';

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore(s => s.login);
  const authLoading = useAppStore(s => s.authLoading);
  const authError = useAppStore(s => s.authError);
  const currentUser = useAppStore(s => s.user);
  const loadSettings = useAppStore(s => s._loadAppSettings);

  const brandName = useSetting('brand.name', 'با شرف');
  const loginTitle = useSetting('login.title', 'حسابداری شعب، ساده و یکجا');
  const loginSubtitle = useSetting('login.subtitle', 'مدیریت درآمد و هزینه چند شعبه با یک نگاه');
  const feature1 = useSetting('login.feature1', 'گزارش لحظه‌ای تمام شعب');
  const feature2 = useSetting('login.feature2', 'کنترل و تایید تراکنش‌ها');
  const feature3 = useSetting('login.feature3', 'تفکیک دقیق درآمد و هزینه');

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
    <div className="min-h-screen flex flex-col lg:flex-row" dir="rtl">

      {/* ─── Brand panel — فقط دسکتاپ ─── */}
      <div className="hidden lg:flex lg:w-[420px] flex-shrink-0 bg-stone-900 flex-col justify-between p-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center text-white font-bold text-[14px]">ب</div>
          <span className="text-white text-[16px] font-medium">{brandName}</span>
        </div>
        <div>
          <h1 className="text-white text-[26px] font-medium leading-tight">{loginTitle}</h1>
          <p className="text-stone-400 text-[13px] mt-3 leading-7">{loginSubtitle}</p>
          <div className="mt-8 space-y-3">
            {[feature1, feature2, feature3].filter(Boolean).map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle2 size={14} className="text-stone-500 flex-shrink-0" strokeWidth={1.5} />
                <span className="text-stone-400 text-[13px]">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-stone-600 text-[11px]">© ۱۴۰۵ {brandName}</div>
      </div>

      {/* ─── Form panel ─── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-md bg-stone-900 flex items-center justify-center text-white font-bold text-[14px]">ب</div>
            <span className="text-[15px] font-medium text-stone-900">{brandName}</span>
          </div>

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
                <Link href="/forgot" className="text-[11px] text-stone-400 hover:text-stone-700 transition-colors">
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
