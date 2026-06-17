'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Trash2, Mail, User as UserIcon, X, Eye, EyeOff, AlertCircle, SlidersHorizontal } from 'lucide-react';
import {
  Avatar, Button, Card, CardBody, CardHeader, Chip, DataList, Empty,
  Field, Input, Select,
} from '@/components/ui';
import type { DataColumn } from '@/components/ui/DataList';
import { useAppStore } from '@/store';
import { SECTIONS, CAPABILITIES, capStorageKey } from '@/lib/auth/permissions';
import type { User } from '@/types';

const createSchema = z.object({
  name: z.string().min(2, 'نام الزامی است').max(80).transform(v => v.trim()),
  email: z.string().email('ایمیل معتبر وارد کنید').max(254).transform(v => v.trim().toLowerCase()),
  password: z.string().min(8, 'رمز باید حداقل ۸ کاراکتر باشد').max(128),
  role: z.enum(['SuperAdmin', 'BranchUser', 'Warehouse', 'Chef']),
  assignedBranchId: z.string().nullable(),
}).refine(d => !((d.role === 'BranchUser' || d.role === 'Warehouse' || d.role === 'Chef') && !d.assignedBranchId), {
  message: 'برای کاربر شعبه یک شعبه انتخاب کنید',
  path: ['assignedBranchId'],
});

type CreateInput = z.infer<typeof createSchema>;

export function TeamPane() {
  const users = useAppStore(s => s.users);
  const branches = useAppStore(s => s.branches);
  const currentUser = useAppStore(s => s.user);
  const deleteUser = useAppStore(s => s.deleteUser);
  const showToast = useAppStore(s => s.showToast);
  const usersError = useAppStore(s => s.usersError);

  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [permUser, setPermUser] = useState<User | null>(null);

  if (!currentUser) return null;

  const columns: DataColumn<User>[] = [
    {
      key: 'user',
      label: 'کاربر',
      render: (u) => {
        const isSelf = u.id === currentUser!.id;
        return (
          <div className="flex items-center gap-3">
            <Avatar initials={u.initials} role={u.role} size="md" />
            <div className="min-w-0">
              <div className="text-[12.5px] text-stone-800 truncate">
                {u.name}{isSelf && <span className="text-[10.5px] text-muted mx-1">(شما)</span>}
              </div>
              <div className="text-[10.5px] text-muted truncate" dir="ltr">{u.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      label: 'نقش',
      render: (u) => (
        <Chip tone={u.role === 'SuperAdmin' ? 'neutral' : 'green'}>
          {u.role === 'SuperAdmin' ? 'مدیر کل' : u.role === 'Warehouse' ? 'انباردار' : u.role === 'Chef' ? 'سرآشپز' : 'کاربر شعبه'}
        </Chip>
      ),
    },
    {
      key: 'branch',
      label: 'شعبه',
      mobileHide: true,
      render: (u) => {
        const branch = (u.role === 'BranchUser' || u.role === 'Warehouse' || u.role === 'Chef')
          ? branches.find(b => b.id === u.assignedBranch)?.name ?? '—'
          : '—';
        return <span className="text-[11.5px] text-stone-600">{branch}</span>;
      },
    },
    {
      key: 'actions',
      label: '',
      mobileLabel: '',
      cellClassName: 'text-end',
      headerClassName: 'text-end',
      render: (u) => {
        const isSelf = u.id === currentUser!.id;
        const isDeleting = deletingId === u.id;
        if (isSelf) return <span className="text-[10.5px] text-muted">—</span>;
        if (isDeleting) return (
          <div className="flex items-center gap-1 justify-end">
            <Button variant="destructive" size="sm" loading={actionLoading} onClick={() => handleDelete(u.id)}>مطمئنم</Button>
            <Button variant="default" size="sm" disabled={actionLoading} onClick={() => setDeletingId(null)}>لغو</Button>
          </div>
        );
        return (
          <div className="flex items-center gap-1 justify-end">
            {u.role !== 'SuperAdmin' && (
              <Button variant="default" size="sm" icon={SlidersHorizontal} onClick={() => setPermUser(u)}>دسترسی‌ها</Button>
            )}
            <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeletingId(u.id)}>حذف</Button>
          </div>
        );
      },
    },
  ];

  async function handleDelete(id: string) {
    setActionLoading(true);
    const ok = await deleteUser(id, currentUser!);
    setActionLoading(false);
    if (ok) {
      showToast('کاربر حذف شد', 'danger');
      setDeletingId(null);
    } else {
      showToast(usersError ?? 'خطا در حذف', 'danger');
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="تیم و کاربران"
          sub={`${users.length} کاربر`}
          action={
            <Button variant="primary" size="sm" icon={UserPlus} onClick={() => setShowAdd(true)}>
              افزودن کاربر
            </Button>
          }
        />
        <DataList
          columns={columns}
          data={users}
          keyExtractor={u => u.id}
          empty={<CardBody><Empty title="کاربری ثبت نشده" icon={UserIcon} /></CardBody>}
        />
      </Card>
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
      {permUser && <PermissionsModal user={permUser} onClose={() => setPermUser(null)} />}
    </div>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  const branches = useAppStore(s => s.branches);
  const currentUser = useAppStore(s => s.user);
  const createUser = useAppStore(s => s.createUser);
  const showToast = useAppStore(s => s.showToast);
  const usersError = useAppStore(s => s.usersError);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<CreateInput>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'BranchUser', assignedBranchId: branches[0]?.id ?? null },
  });

  const role = watch('role');

  function handleRoleChange(r: 'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef') {
    setValue('role', r);
    setValue('assignedBranchId', r === 'SuperAdmin' ? null : (branches[0]?.id ?? null));
  }

  async function onSubmit(data: CreateInput) {
    if (!currentUser) return;
    const u = await createUser(
      { name: data.name, email: data.email, role: data.role, assignedBranch: data.assignedBranchId },
      currentUser,
      data.password
    );
    if (u) { showToast('کاربر اضافه شد', 'success', u.name); onClose(); }
    else showToast(usersError ?? 'خطا', 'danger');
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} aria-hidden="true" />
      <Card className="relative w-full max-w-md shadow-modal animate-slide-up">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-[15px] font-medium text-stone-900">افزودن کاربر جدید</h2>
            <button type="button" onClick={onClose} aria-label="بستن" className="w-8 h-8 rounded-md hover:bg-stone-50 flex items-center justify-center text-muted">
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
          {usersError && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
              <AlertCircle size={14} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
              <div className="text-[12px]">{usersError}</div>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="نام و نام خانوادگی" error={errors.name?.message}>
              <Input icon={UserIcon} hasError={!!errors.name} {...register('name')} />
            </Field>
            <Field label="ایمیل" error={errors.email?.message}>
              <Input type="email" icon={Mail} dir="ltr" hasError={!!errors.email} {...register('email')} />
            </Field>
            <Field label="رمز عبور" error={errors.password?.message} helper="حداقل ۸ کاراکتر">
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="رمز اولیه کاربر"
                  hasError={!!errors.password}
                  dir="ltr"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 left-3 flex items-center text-muted hover:text-stone-600"
                >
                  {showPw ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                </button>
              </div>
            </Field>
            <Field label="نقش" error={errors.role?.message}>
              <Select value={role} onChange={e => handleRoleChange(e.target.value as any)}>
                <option value="BranchUser">کاربر شعبه</option>
                <option value="Warehouse">انباردار</option>
                <option value="Chef">سرآشپز</option>
                <option value="SuperAdmin">مدیر کل</option>
              </Select>
            </Field>
            {(role === 'BranchUser' || role === 'Warehouse' || role === 'Chef') && (
              <Field label="شعبه" error={errors.assignedBranchId?.message}>
                <Select {...register('assignedBranchId')}>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>
            )}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button type="button" variant="default" onClick={onClose} disabled={isSubmitting}>لغو</Button>
              <Button type="submit" variant="primary" icon={UserPlus} loading={isSubmitting}>افزودن</Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}

/* ───── modal مدیریت دسترسی بخش‌های یک کاربر ───── */
function PermissionsModal({ user, onClose }: { user: User; onClose: () => void }) {
  const updateUser = useAppStore(s => s.updateUser);
  const currentUser = useAppStore(s => s.user);
  const showToast = useAppStore(s => s.showToast);

  // اگر کاربر permissions صریح ندارد، خالی شروع کن (یعنی پیش‌فرض نقش)
  const [selected, setSelected] = useState<string[]>(user.permissions ?? []);
  const [saving, setSaving] = useState(false);
  const [useDefault, setUseDefault] = useState(!user.permissions || user.permissions.length === 0);

  function toggle(key: string) {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  }

  async function save() {
    if (!currentUser) return;
    setSaving(true);
    // اگر «پیش‌فرض نقش» انتخاب شده، permissions را null کن
    const perms = useDefault ? null : selected;
    const ok = await updateUser(user.id, { permissions: perms }, currentUser);
    setSaving(false);
    if (ok) { showToast('دسترسی‌ها ذخیره شد', 'success'); onClose(); }
    else showToast('خطا در ذخیره دسترسی‌ها', 'danger');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[16px] font-medium text-stone-900">دسترسی‌های {user.name}</h2>
          <button onClick={onClose} className="text-muted hover:text-stone-700"><X size={18} /></button>
        </div>
        <p className="text-[11.5px] text-muted mb-4 leading-relaxed">
          مشخص کنید این کاربر کدام بخش‌ها را ببیند. تغییرات از <b>ورود بعدی</b> کاربر اعمال می‌شود.
        </p>

        <label className="flex items-center gap-2 mb-3 cursor-pointer">
          <input type="checkbox" checked={useDefault} onChange={e => setUseDefault(e.target.checked)} className="accent-stone-900" />
          <span className="text-[12.5px] text-stone-700">دسترسی پیش‌فرض نقش (توصیه‌شده)</span>
        </label>

        {!useDefault && (
          <div className="space-y-1.5 border-t border-stone-100 pt-3">
            <div className="text-[11.5px] text-muted mb-1">بخش‌های مجاز را تیک بزنید:</div>
            {SECTIONS.map(s => (
              <label key={s.key} className="flex items-center gap-2 py-1 cursor-pointer">
                <input type="checkbox" checked={selected.includes(s.key)} onChange={() => toggle(s.key)} className="accent-stone-900" />
                <span className="text-[12.5px] text-stone-800">{s.label}</span>
              </label>
            ))}
            {selected.length === 0 && (
              <div className="text-[11px] text-amber-600 mt-1">هیچ بخشی انتخاب نشده — کاربر فقط داشبورد را می‌بیند.</div>
            )}

            <div className="text-[11.5px] text-muted mt-3 mb-1 pt-3 border-t border-stone-100">اجازه‌های ویژه:</div>
            {CAPABILITIES.map(c => {
              const key = capStorageKey(c.key);
              return (
                <label key={c.key} className="flex items-center gap-2 py-1 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(key)} onChange={() => toggle(key)} className="accent-stone-900" />
                  <span className="text-[12.5px] text-stone-800">{c.label}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 mt-5">
          <Button variant="primary" onClick={save} loading={saving}>ذخیره</Button>
          <Button variant="default" onClick={onClose}>انصراف</Button>
        </div>
      </div>
    </div>
  );
}
