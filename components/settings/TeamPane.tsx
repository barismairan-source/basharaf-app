'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus, Trash2, Mail, User as UserIcon, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import {
  Avatar, Button, Card, CardBody, CardHeader, Chip, Empty,
  Field, Input, Select, Th, Td, TableContainer,
} from '@/components/ui';
import { useAppStore } from '@/store';

const createSchema = z.object({
  name: z.string().min(2, 'نام الزامی است').max(80).transform(v => v.trim()),
  email: z.string().email('ایمیل معتبر وارد کنید').max(254).transform(v => v.trim().toLowerCase()),
  password: z.string().min(8, 'رمز باید حداقل ۸ کاراکتر باشد').max(128),
  role: z.enum(['SuperAdmin', 'BranchUser']),
  assignedBranchId: z.string().nullable(),
}).refine(d => !(d.role === 'BranchUser' && !d.assignedBranchId), {
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

  if (!currentUser) return null;

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
        {users.length === 0 ? (
          <CardBody><Empty title="کاربری ثبت نشده" icon={UserIcon} /></CardBody>
        ) : (
          <TableContainer>
            <table className="w-full">
              <thead className="bg-stone-50/50 border-b border-stone-100">
                <tr>
                  <Th>کاربر</Th>
                  <Th>نقش</Th>
                  <Th className="hidden md:table-cell">شعبه</Th>
                  <Th className="text-end">عملیات</Th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isSelf = u.id === currentUser.id;
                  const isDeleting = deletingId === u.id;
                  const branch = u.role === 'BranchUser'
                    ? branches.find(b => b.id === u.assignedBranch)?.name ?? '—'
                    : '—';
                  return (
                    <tr key={u.id} className="border-b border-stone-50 last:border-b-0">
                      <Td>
                        <div className="flex items-center gap-3">
                          <Avatar initials={u.initials} role={u.role} size="md" />
                          <div className="min-w-0">
                            <div className="text-[12.5px] text-stone-800 truncate">
                              {u.name}{isSelf && <span className="text-[10.5px] text-stone-400 mx-1">(شما)</span>}
                            </div>
                            <div className="text-[10.5px] text-stone-400 truncate" dir="ltr">{u.email}</div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Chip tone={u.role === 'SuperAdmin' ? 'neutral' : 'green'}>
                          {u.role === 'SuperAdmin' ? 'مدیر کل' : 'کاربر شعبه'}
                        </Chip>
                      </Td>
                      <Td className="hidden md:table-cell">
                        <span className="text-[11.5px] text-stone-600">{branch}</span>
                      </Td>
                      <Td className="text-end">
                        {isSelf ? (
                          <span className="text-[10.5px] text-stone-400">—</span>
                        ) : isDeleting ? (
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="destructive" size="sm" loading={actionLoading} onClick={() => handleDelete(u.id)}>مطمئنم</Button>
                            <Button variant="default" size="sm" disabled={actionLoading} onClick={() => setDeletingId(null)}>لغو</Button>
                          </div>
                        ) : (
                          <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeletingId(u.id)}>حذف</Button>
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableContainer>
        )}
      </Card>
      {showAdd && <AddUserModal onClose={() => setShowAdd(false)} />}
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

  function handleRoleChange(r: 'SuperAdmin' | 'BranchUser') {
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
            <button type="button" onClick={onClose} aria-label="بستن" className="w-8 h-8 rounded-md hover:bg-stone-50 flex items-center justify-center text-stone-400">
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
                  className="absolute inset-y-0 left-3 flex items-center text-stone-400 hover:text-stone-600"
                >
                  {showPw ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
                </button>
              </div>
            </Field>
            <Field label="نقش" error={errors.role?.message}>
              <Select value={role} onChange={e => handleRoleChange(e.target.value as any)}>
                <option value="BranchUser">کاربر شعبه</option>
                <option value="SuperAdmin">مدیر کل</option>
              </Select>
            </Field>
            {role === 'BranchUser' && (
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
