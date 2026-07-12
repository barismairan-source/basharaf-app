'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Trash2,
  Edit3,
  Building2,
  X,
  AlertCircle,
  Check,
} from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Empty,
  Field,
  Input,
} from '@/components/ui';
import { useAppStore } from '@/store';
import {
  branchSchema,
  type BranchFormInput,
} from '@/lib/validations/settings';
import type { Branch } from '@/types';

/**
 * BranchesPane — مدیریت شعب.
 *
 * فقط SuperAdmin (RouterGuard در parent).
 *
 * شامل:
 * - لیست کارت‌های شعب با اطلاعات کامل
 * - دکمه افزودن (modal)
 * - ویرایش inline (هر کارت modal خودش)
 * - حذف با confirm
 *
 * منطق reference integrity در repo: حذف شعبه‌ای که تراکنش یا
 * کاربری به آن ارجاع دارد، خطا می‌دهد.
 */

export function BranchesPane() {
  const branches = useAppStore((s) => s.branches);
  const currentUser = useAppStore((s) => s.user);
  const deleteBranch = useAppStore((s) => s.deleteBranch);
  const showToast = useAppStore((s) => s.showToast);
  const branchesError = useAppStore((s) => s.branchesError);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  if (!currentUser) return null;

  async function handleDelete(id: string) {
    if (!currentUser) return;
    setActionLoading(true);
    const ok = await deleteBranch(id, currentUser);
    setActionLoading(false);
    if (ok) {
      const b = branches.find((b) => b.id === id);
      showToast('شعبه حذف شد', 'danger', b?.name);
      setDeletingId(null);
    } else {
      showToast(branchesError ?? 'خطا در حذف شعبه', 'danger');
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="شعب"
          sub={`${branches.length} شعبه فعال`}
          action={
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => setShowAddModal(true)}
            >
              افزودن شعبه
            </Button>
          }
        />
        <CardBody>
          {branches.length === 0 ? (
            <Empty title="شعبه‌ای ثبت نشده" icon={Building2} />
          ) : (
            <div className="space-y-3">
              {branches.map((b) => {
                const isDeleting = deletingId === b.id;
                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-md border border-stone-200 bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-md bg-stone-100 flex items-center justify-center text-stone-700 flex-shrink-0">
                          <Building2 size={14} strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-stone-900 truncate">
                            {b.name}
                          </div>
                          <div className="text-[11.5px] text-muted mt-1 truncate">
                            {b.address}
                          </div>
                          <div className="text-[11px] text-muted mt-1.5 flex items-center gap-3 flex-wrap">
                            <span>مدیر: {b.manager}</span>
                            <span>·</span>
                            <span>افتتاح ثبتی: {b.opened}</span>
                            {b.openingDate && (
                              <>
                                <span>·</span>
                                <span>شروع بهره‌برداری: {b.openingDate}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isDeleting ? (
                          <>
                            <Button
                              variant="destructive"
                              size="sm"
                              loading={actionLoading}
                              onClick={() => handleDelete(b.id)}
                            >
                              مطمئنم
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => setDeletingId(null)}
                            >
                              لغو
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="ویرایش"
                              onClick={() => setEditingBranch(b)}
                            >
                              <Edit3 size={13} strokeWidth={1.5} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="حذف"
                              onClick={() => setDeletingId(b.id)}
                              className="text-rose-600 hover:bg-rose-50"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {showAddModal && (
        <BranchModal mode="add" onClose={() => setShowAddModal(false)} />
      )}
      {editingBranch && (
        <BranchModal
          mode="edit"
          branch={editingBranch}
          onClose={() => setEditingBranch(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Branch modal (add/edit)
// ─────────────────────────────────────────────────────────────────

interface BranchModalProps {
  mode: 'add' | 'edit';
  branch?: Branch;
  onClose: () => void;
}

function BranchModal({ mode, branch, onClose }: BranchModalProps) {
  const currentUser = useAppStore((s) => s.user);
  const createBranch = useAppStore((s) => s.createBranch);
  const updateBranch = useAppStore((s) => s.updateBranch);
  const showToast = useAppStore((s) => s.showToast);
  const branchesError = useAppStore((s) => s.branchesError);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormInput>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: branch?.name ?? '',
      address: branch?.address ?? '',
      manager: branch?.manager ?? '',
      opened: branch?.opened ?? '۱۴۰۵/۰۲/۳۱',
      openingDate: branch?.openingDate ?? undefined,
    },
  });

  async function onSubmit(data: BranchFormInput) {
    if (!currentUser) return;
    const normalized = {
      ...data,
      openingDate: data.openingDate ?? null,
    };
    if (mode === 'add') {
      const b = await createBranch(normalized, currentUser);
      if (b) {
        showToast('شعبه اضافه شد', 'success', b.name);
        onClose();
      } else {
        showToast(branchesError ?? 'خطا در ایجاد شعبه', 'danger');
      }
    } else if (branch) {
      const ok = await updateBranch(branch.id, normalized, currentUser);
      if (ok) {
        showToast('شعبه به‌روز شد', 'success', data.name);
        onClose();
      } else {
        showToast(branchesError ?? 'خطا در ویرایش شعبه', 'danger');
      }
    }
  }

  const title = mode === 'add' ? 'افزودن شعبه جدید' : `ویرایش ${branch?.name}`;
  const icon = mode === 'add' ? Plus : Edit3;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        className="absolute inset-0 bg-stone-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <Card className="relative w-full max-w-md shadow-modal animate-slide-up">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-700">
                <Building2 size={16} strokeWidth={1.5} />
              </div>
              <h2 className="text-[15px] font-medium text-stone-900">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="w-8 h-8 rounded-md hover:bg-stone-50 flex items-center justify-center text-muted"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {branchesError && (
            <div className="mb-4 flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
              <AlertCircle
                size={14}
                strokeWidth={1.5}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="text-[12px] leading-6">{branchesError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="نام شعبه" error={errors.name?.message}>
              <Input
                placeholder="مثلاً: شعبه ولیعصر"
                hasError={!!errors.name}
                {...register('name')}
              />
            </Field>
            <Field label="آدرس" error={errors.address?.message}>
              <Input
                placeholder="تهران — خیابان..."
                hasError={!!errors.address}
                {...register('address')}
              />
            </Field>
            <Field label="مدیر شعبه" error={errors.manager?.message}>
              <Input
                placeholder="نام مدیر"
                hasError={!!errors.manager}
                {...register('manager')}
              />
            </Field>
            <Field label="تاریخ افتتاح ثبتی (شمسی)" error={errors.opened?.message}>
              <Input
                placeholder="۱۴۰۵/۰۲/۳۱"
                hasError={!!errors.opened}
                {...register('opened')}
              />
            </Field>
            <Field
              label="تاریخ شروع بهره‌برداری (اختیاری)"
              error={errors.openingDate?.message}
            >
              <Input
                placeholder="۱۴۰۵/۰۴/۰۱ — از این تاریخ «از افتتاح» در گزارش‌ها فعال می‌شود"
                {...register('openingDate')}
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <Button
                type="button"
                variant="default"
                onClick={onClose}
                disabled={isSubmitting}
              >
                لغو
              </Button>
              <Button
                type="submit"
                variant="primary"
                icon={mode === 'add' ? Plus : Check}
                loading={isSubmitting}
              >
                {mode === 'add' ? 'افزودن' : 'ذخیره'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
