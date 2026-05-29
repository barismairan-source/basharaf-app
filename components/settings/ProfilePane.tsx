'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Key, Mail, User as UserIcon, CheckCircle2, AlertCircle } from 'lucide-react';

import {
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Field,
  Input,
  PasswordInput,
} from '@/components/ui';
import { useAppStore } from '@/store';
import {
  profileSchema,
  type ProfileFormInput,
} from '@/lib/validations/settings';

/**
 * ProfilePane — فاز ۱۵.
 *
 * تغییر رمز عبور حالا واقعی است:
 * - باید رمز فعلی را بداند
 * - رمز جدید حداقل ۸ کاراکتر با حرف و عدد
 * - تکرار رمز باید مطابقت داشته باشد
 */

// schema تغییر رمز
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز فعلی الزامی است'),
  newPassword: z
    .string()
    .min(8, 'حداقل ۸ کاراکتر')
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, 'باید حداقل یک حرف و یک عدد داشته باشد'),
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'رمز جدید و تکرار آن یکسان نیستند',
  path: ['confirmPassword'],
});

type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export function ProfilePane() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const updateUser = useAppStore((s) => s.updateUser);
  const showToast = useAppStore((s) => s.showToast);

  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // ─── Profile form ───
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting, isDirty: profileDirty },
    reset: resetProfile,
  } = useForm<ProfileFormInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  // ─── Password form ───
  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    formState: { errors: pwErrors, isSubmitting: pwSubmitting },
    reset: resetPw,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (!user) return null;

  const branchName =
    user.role === 'BranchUser'
      ? branches.find((b) => b.id === user.assignedBranch)?.name ?? '—'
      : null;

  async function onProfileSubmit(data: ProfileFormInput) {
    if (!user) return;
    const ok = await updateUser(user.id, { name: data.name, email: data.email }, user);
    if (ok) {
      showToast('پروفایل به‌روز شد', 'success');
      resetProfile(data);
    } else {
      showToast('خطا در به‌روزرسانی', 'danger');
    }
  }

  async function onPasswordSubmit(data: ChangePasswordInput) {
    setPwError(null);
    setPwSuccess(false);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword,
        }),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };

      if (!res.ok || !json.ok) {
        setPwError(json.error ?? 'خطا در تغییر رمز');
        return;
      }

      setPwSuccess(true);
      resetPw();
      showToast('رمز عبور با موفقیت تغییر کرد', 'success');

      // بعد از ۳ ثانیه success را پاک کن
      setTimeout(() => setPwSuccess(false), 3000);
    } catch {
      setPwError('خطای شبکه — دوباره تلاش کنید');
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── Header card ─── */}
      <Card>
        <CardBody>
          <div className="flex items-center gap-4">
            <Avatar initials={user.initials} role={user.role} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] text-stone-900 font-medium truncate">{user.name}</div>
              <div className="text-[11.5px] text-stone-500 mt-1 truncate" dir="ltr">{user.email}</div>
              <div className="mt-2 flex items-center gap-2">
                <Chip tone={user.role === 'SuperAdmin' ? 'neutral' : 'green'}>
                  {user.role === 'SuperAdmin' ? 'مدیر کل' : 'کاربر شعبه'}
                </Chip>
                {branchName && (
                  <span className="text-[11px] text-stone-500">{branchName}</span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ─── Edit profile ─── */}
      <Card>
        <CardHeader title="اطلاعات شخصی" sub="نام و ایمیل خود را ویرایش کنید" />
        <CardBody>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <Field label="نام و نام خانوادگی" error={profileErrors.name?.message}>
              <Input icon={UserIcon} hasError={!!profileErrors.name} {...registerProfile('name')} />
            </Field>
            <Field label="ایمیل" error={profileErrors.email?.message}>
              <Input type="email" icon={Mail} dir="ltr" hasError={!!profileErrors.email} {...registerProfile('email')} />
            </Field>
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                icon={Save}
                loading={profileSubmitting}
                disabled={!profileDirty}
              >
                ذخیره تغییرات
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* ─── Change password — واقعی ─── */}
      <Card>
        <CardHeader title="تغییر رمز عبور" />
        <CardBody>
          {/* Success */}
          {pwSuccess && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-100 text-emerald-700">
              <CheckCircle2 size={14} strokeWidth={1.5} className="flex-shrink-0" />
              <span className="text-[12.5px]">رمز عبور با موفقیت تغییر کرد</span>
            </div>
          )}

          {/* Error */}
          {pwError && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
              <span className="text-[12.5px]">{pwError}</span>
            </div>
          )}

          <form onSubmit={handlePwSubmit(onPasswordSubmit)} className="space-y-4">
            <Field label="رمز عبور فعلی" error={pwErrors.currentPassword?.message}>
              <PasswordInput
                placeholder="رمز فعلی"
                hasError={!!pwErrors.currentPassword}
                autoComplete="current-password"
                {...registerPw('currentPassword')}
              />
            </Field>
            <Field
              label="رمز عبور جدید"
              error={pwErrors.newPassword?.message}
              helper="حداقل ۸ کاراکتر، شامل حرف و عدد"
            >
              <PasswordInput
                placeholder="رمز جدید"
                hasError={!!pwErrors.newPassword}
                autoComplete="new-password"
                {...registerPw('newPassword')}
              />
            </Field>
            <Field label="تکرار رمز جدید" error={pwErrors.confirmPassword?.message}>
              <PasswordInput
                placeholder="تکرار رمز جدید"
                hasError={!!pwErrors.confirmPassword}
                autoComplete="new-password"
                {...registerPw('confirmPassword')}
              />
            </Field>
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="default"
                icon={Key}
                loading={pwSubmitting}
              >
                تغییر رمز
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
