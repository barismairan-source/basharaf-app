'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Edit3, Tag, X, Check, AlertCircle } from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Empty,
  Field,
  Input,
  Chip,
} from '@/components/ui';
import { useAppStore } from '@/store';
import {
  categorySchema,
  type CategoryFormInput,
} from '@/lib/validations/settings';
import type { Category, TransactionType } from '@/types';
import { COLORS } from '@/lib/colors';

/**
 * CategoriesPane — مدیریت دسته‌بندی‌های درآمد و هزینه.
 *
 * فقط SuperAdmin (RouterGuard در parent).
 *
 * ساختار:
 * - دو ستون: درآمد (سبز) و هزینه (قرمز)
 * - در هر ستون لیست chip-style با inline rename + delete
 * - دکمه افزودن در هر ستون
 *
 * Reference integrity: حذف دسته‌ای که تراکنش دارد، خطا می‌دهد.
 */

export function CategoriesPane() {
  const categories = useAppStore((s) => s.categories);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[13px] text-stone-600 leading-7">
          دسته‌بندی‌ها در فرم ثبت تراکنش جدید به‌صورت dropdown نمایش داده می‌شوند.
          هر تراکنش <code className="bg-stone-100 px-1 rounded text-stone-700">categoryName</code>{' '}
          را در زمان ثبت کپی می‌کند، پس حذف یک دسته به تراکنش‌های قبلی آسیب نمی‌رساند.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CategoryColumn type="income" categories={categories.income} />
        <CategoryColumn type="expense" categories={categories.expense} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Single column (income or expense)
// ─────────────────────────────────────────────────────────────────

interface CategoryColumnProps {
  type: TransactionType;
  categories: ReadonlyArray<Category>;
}

function CategoryColumn({ type, categories }: CategoryColumnProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = useAppStore((s) => s.user);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const showToast = useAppStore((s) => s.showToast);
  const categoriesError = useAppStore((s) => s.categoriesError);

  if (!currentUser) return null;

  const isIncome = type === 'income';
  const title = isIncome ? 'دسته‌های درآمد' : 'دسته‌های هزینه';
  const toneColor = isIncome ? COLORS.success : COLORS.danger;
  const chipTone = isIncome ? 'green' : 'red';

  async function handleDelete(id: string) {
    if (!currentUser) return;
    setActionLoading(true);
    const ok = await deleteCategory(type, id, currentUser);
    setActionLoading(false);
    if (ok) {
      const c = categories.find((c) => c.id === id);
      showToast('دسته حذف شد', 'danger', c?.name);
      setDeletingId(null);
    } else {
      showToast(categoriesError ?? 'خطا در حذف دسته', 'danger');
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: toneColor }}
              aria-hidden="true"
            />
            {title}
          </span>
        }
        sub={`${categories.length} دسته`}
        action={
          <Button
            variant="default"
            size="sm"
            icon={Plus}
            onClick={() => setShowAddModal(true)}
          >
            افزودن
          </Button>
        }
      />
      <CardBody>
        {categories.length === 0 ? (
          <Empty title="دسته‌ای ثبت نشده" icon={Tag} />
        ) : (
          <div className="space-y-2">
            {categories.map((c) => {
              const isDeleting = deletingId === c.id;
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-stone-200 bg-white"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Chip tone={chipTone}>{c.name}</Chip>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isDeleting ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          loading={actionLoading}
                          onClick={() => handleDelete(c.id)}
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
                          onClick={() => setEditing(c)}
                        >
                          <Edit3 size={12} strokeWidth={1.5} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="حذف"
                          onClick={() => setDeletingId(c.id)}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={12} strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardBody>

      {showAddModal && (
        <CategoryModal
          mode="add"
          type={type}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editing && (
        <CategoryModal
          mode="edit"
          type={type}
          category={editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Category modal (add/edit)
// ─────────────────────────────────────────────────────────────────

interface CategoryModalProps {
  mode: 'add' | 'edit';
  type: TransactionType;
  category?: Category;
  onClose: () => void;
}

function CategoryModal({ mode, type, category, onClose }: CategoryModalProps) {
  const currentUser = useAppStore((s) => s.user);
  const createCategory = useAppStore((s) => s.createCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const showToast = useAppStore((s) => s.showToast);
  const categoriesError = useAppStore((s) => s.categoriesError);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '' },
  });

  async function onSubmit(data: CategoryFormInput) {
    if (!currentUser) return;
    if (mode === 'add') {
      const ok = await createCategory(type, data.name, currentUser);
      if (ok) {
        showToast('دسته اضافه شد', 'success', data.name);
        onClose();
      } else {
        showToast(categoriesError ?? 'خطا', 'danger');
      }
    } else if (category) {
      const ok = await updateCategory(type, category.id, data.name, currentUser);
      if (ok) {
        showToast('دسته به‌روز شد', 'success', data.name);
        onClose();
      } else {
        showToast(categoriesError ?? 'خطا', 'danger');
      }
    }
  }

  const isIncome = type === 'income';
  const title =
    mode === 'add'
      ? `افزودن دسته ${isIncome ? 'درآمد' : 'هزینه'}`
      : 'ویرایش دسته';

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
      <Card className="relative w-full max-w-sm shadow-modal animate-slide-up">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-[14px] font-medium text-stone-900">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="w-7 h-7 rounded-md hover:bg-stone-50 flex items-center justify-center text-stone-400"
            >
              <X size={13} strokeWidth={1.5} />
            </button>
          </div>

          {categoriesError && (
            <div className="mb-3 flex items-start gap-2 p-2.5 rounded-md bg-rose-50 border border-rose-100 text-rose-700">
              <AlertCircle
                size={13}
                strokeWidth={1.5}
                className="mt-0.5 flex-shrink-0"
              />
              <div className="text-[11.5px] leading-6">{categoriesError}</div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Field label="نام دسته" error={errors.name?.message}>
              <Input
                placeholder="مثلاً: تبلیغات"
                hasError={!!errors.name}
                autoFocus
                {...register('name')}
              />
            </Field>

            <div className="flex items-center justify-end gap-2 pt-2">
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
                size="sm"
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
