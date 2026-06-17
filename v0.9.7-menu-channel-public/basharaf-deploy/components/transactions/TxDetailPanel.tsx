'use client';

import { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Receipt as ReceiptIcon,
  Clock,
  User as UserIcon,
  Building2,
  Tag,
  CreditCard,
  Calendar,
  type LucideIcon,
} from 'lucide-react';

import {
  Button,
  Chip,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { can } from '@/lib/rbac';
import { fmt, formatAmountInput, parseAmount } from '@/lib/utils';
import { RejectModal } from './RejectModal';
import { ReceiptUploader } from './ReceiptUploader';
import type { Transaction, TransactionPatch } from '@/types';
import { cn } from '@/lib/utils';

/**
 * TxDetailPanel — slide-out panel با جزئیات تراکنش.
 *
 * سه حالت:
 * 1. View (پیش‌فرض): نمایش read-only
 * 2. Edit: فرم ویرایش inline (فقط SuperAdmin یا صاحب pending)
 * 3. Reject confirmation: RejectModal باز است
 *
 * نمایش دکمه‌ها بر اساس RBAC:
 * - Approve/Reject: فقط SuperAdmin، فقط وقتی status === 'pending'
 * - Edit: SuperAdmin همیشه، BranchUser فقط روی pending خودش
 * - Delete: فقط SuperAdmin
 *
 * انیمیشن: از سمت start (راست در RTL) slide-in.
 */

interface TxDetailPanelProps {
  tx: Transaction;
  onClose: () => void;
}

export function TxDetailPanel({ tx, onClose }: TxDetailPanelProps) {
  const user = useAppStore((s) => s.user);
  const users = useAppStore((s) => s.users);
  const categories = useAppStore((s) => s.categories);
  const approveTransaction = useAppStore((s) => s.approveTransaction);
  const rejectTransaction = useAppStore((s) => s.rejectTransaction);
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const deleteTransaction = useAppStore((s) => s.deleteTransaction);
  const showToast = useAppStore((s) => s.showToast);

  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Escape برای بستن
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !actionLoading) {
        if (editMode) setEditMode(false);
        else onClose();
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, actionLoading, editMode]);

  if (!user) return null;

  // ─── Permission flags ───
  const isPending = tx.status === 'pending';
  const isAdmin = user.role === 'SuperAdmin';
  const isOwnPending =
    user.role === 'BranchUser' &&
    isPending &&
    tx.createdBy === user.id;

  const canApprove = isAdmin && isPending;
  const canReject = isAdmin && isPending;
  const canEdit = isAdmin || isOwnPending;
  const canDelete = can(user, 'delete:transaction');

  // ─── Lookup helpers ───
  const createdByUser = users.find((u) => u.id === tx.createdBy);
  const approvedByUser =
    tx.status === 'approved'
      ? users.find((u) => u.id === tx.approvedBy)
      : null;
  const rejectedByUser =
    tx.status === 'rejected'
      ? users.find((u) => u.id === tx.rejectedBy)
      : null;

  // ─── Handlers ───
  async function handleApprove() {
    setActionLoading(true);
    const ok = await approveTransaction(tx.id, user!);
    setActionLoading(false);
    if (ok) {
      showToast('تراکنش تایید شد', 'success', tx.title);
      onClose();
    }
  }

  async function handleReject(reason: string) {
    setActionLoading(true);
    const ok = await rejectTransaction(tx.id, user!, reason);
    setActionLoading(false);
    if (ok) {
      showToast('تراکنش رد شد', 'danger', tx.title);
      setShowRejectModal(false);
      onClose();
    }
  }

  async function handleDelete() {
    setActionLoading(true);
    const ok = await deleteTransaction(tx.id, user!);
    setActionLoading(false);
    if (ok) {
      showToast('تراکنش حذف شد', 'danger', tx.title);
      onClose();
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-stone-900/30 animate-fade-in"
        onClick={() => !actionLoading && onClose()}
        aria-hidden="true"
      />

      {/* Panel — slides from start (راست در RTL) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="tx-detail-title"
        // در RTL، start = راست. می‌خواهیم panel از راست بیاید.
        // ms-auto در flex parent یا inset-y-0 end-0 برای ثابت کردن.
        // ولی fixed: باید start-auto end-0 یا right-0/left-auto استفاده کنیم.
        // برای RTL، `right-0` (که فیزیکی است) همان «end فیزیکی» است.
        // می‌خواهیم سمت start فیزیکی (راست در RTL) → `right-0` در RTL یا `left-0` در LTR
        // راه RTL-aware: inset-y-0 start-0 (که در RTL راست می‌شود)
        className="fixed inset-y-0 start-0 z-50 w-full max-w-md bg-white shadow-panel animate-slide-left overflow-y-auto"
      >
        {/* ─── Header ─── */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Chip
                tone={
                  tx.status === 'approved'
                    ? 'green'
                    : tx.status === 'pending'
                      ? 'amber'
                      : 'red'
                }
              >
                {tx.status === 'approved'
                  ? 'تایید شده'
                  : tx.status === 'pending'
                    ? 'در انتظار'
                    : 'رد شده'}
              </Chip>
              <Chip tone={tx.type === 'income' ? 'green' : 'red'}>
                {tx.type === 'income' ? 'درآمد' : 'هزینه'}
              </Chip>
            </div>
            <h2
              id="tx-detail-title"
              className="text-[15px] font-medium text-stone-900 truncate"
            >
              {tx.title}
            </h2>
            <div
              className={cn(
                'mt-1 text-[18px] font-medium tabular-nums',
                tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
              )}
            >
              {tx.type === 'income' ? '+' : '−'} {fmt(tx.amount)}
              <span className="text-[11px] text-stone-400 me-1.5"> تومان</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !actionLoading && onClose()}
            aria-label="بستن"
            className="w-8 h-8 rounded-md hover:bg-stone-50 flex items-center justify-center text-stone-400 transition-colors flex-shrink-0"
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* ─── Body ─── */}
        <div className="px-6 py-5 space-y-5">
          {editMode ? (
            <EditForm
              tx={tx}
              categories={
                tx.type === 'income' ? categories.income : categories.expense
              }
              onCancel={() => setEditMode(false)}
              onSave={async (patch) => {
                setActionLoading(true);
                const ok = await updateTransaction(tx.id, patch, user!);
                setActionLoading(false);
                if (ok) {
                  showToast('تراکنش ویرایش شد', 'success', tx.title);
                  setEditMode(false);
                }
              }}
              loading={actionLoading}
            />
          ) : (
            <ViewBody
              tx={tx}
              createdByName={createdByUser?.name ?? '—'}
              approvedByName={approvedByUser?.name ?? null}
              rejectedByName={rejectedByUser?.name ?? null}
              canEdit={canEdit}
            />
          )}
        </div>

        {/* ─── Actions footer ─── */}
        {!editMode && (
          <div className="sticky bottom-0 bg-white border-t border-stone-100 px-6 py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button
                  variant="default"
                  size="sm"
                  icon={Edit3}
                  onClick={() => setEditMode(true)}
                  disabled={actionLoading}
                >
                  ویرایش
                </Button>
              )}
              {canDelete && (
                <>
                  {deleteConfirm ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        loading={actionLoading}
                      >
                        مطمئنم
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => setDeleteConfirm(false)}
                        disabled={actionLoading}
                      >
                        لغو
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      icon={Trash2}
                      onClick={() => setDeleteConfirm(true)}
                      disabled={actionLoading}
                    >
                      حذف
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canReject && (
                <Button
                  variant="danger"
                  icon={XCircle}
                  onClick={() => setShowRejectModal(true)}
                  disabled={actionLoading}
                >
                  رد
                </Button>
              )}
              {canApprove && (
                <Button
                  variant="success"
                  icon={CheckCircle2}
                  onClick={handleApprove}
                  loading={actionLoading}
                >
                  تایید
                </Button>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Reject modal */}
      {showRejectModal && (
        <RejectModal
          tx={tx}
          onCancel={() => setShowRejectModal(false)}
          onConfirm={handleReject}
          loading={actionLoading}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// View body — نمایش read-only
// ─────────────────────────────────────────────────────────────────

interface ViewBodyProps {
  tx: Transaction;
  createdByName: string;
  approvedByName: string | null;
  rejectedByName: string | null;
  canEdit: boolean;
}

function ViewBody({
  tx,
  createdByName,
  approvedByName,
  rejectedByName,
  canEdit,
}: ViewBodyProps) {
  const updateTransaction = useAppStore((s) => s.updateTransaction);
  const user = useAppStore((s) => s.user);

  return (
    <>
      {/* Rejection reason */}
      {tx.status === 'rejected' && (
        <div className="p-4 rounded-md bg-rose-50 border border-rose-100">
          <div className="flex items-center gap-2 text-rose-700 mb-1">
            <XCircle size={14} strokeWidth={1.5} />
            <div className="text-[12px] font-medium">دلیل رد</div>
          </div>
          <div className="text-[12.5px] text-rose-800 leading-7">
            {tx.rejectionReason}
          </div>
        </div>
      )}

      {/* Detail rows */}
      <div className="space-y-3">
        <DetailRow icon={Building2} label="شعبه" value={tx.branch} />
        <DetailRow icon={Tag} label="دسته" value={tx.categoryName} />
        <DetailRow icon={UserIcon} label="طرف معامله" value={tx.payee} />
        <DetailRow icon={CreditCard} label="روش پرداخت" value={tx.method} />
        <DetailRow icon={Calendar} label="تاریخ تراکنش" value={tx.date} />
        <DetailRow
          icon={ReceiptIcon}
          label="شماره رسید"
          value={tx.receipt}
          monospace
        />
      </div>

      {/* Receipt uploader */}
      <div>
        <div className="text-[11px] text-stone-500 mb-2">فایل رسید</div>
        <ReceiptUploader
          txId={tx.id}
          existingUrl={(tx as any).receiptUrl ?? null}
          disabled={!canEdit}
          onUploadSuccess={(url) => {
            if (user) {
              updateTransaction(tx.id, { hasReceipt: true } as any, user);
            }
          }}
          onDeleteSuccess={() => {
            if (user) {
              updateTransaction(tx.id, { hasReceipt: false } as any, user);
            }
          }}
        />
      </div>

      {/* Note */}
      {tx.note && (
        <div>
          <div className="text-[11px] text-stone-500 mb-1.5">یادداشت</div>
          <div className="text-[12.5px] text-stone-700 leading-7 p-3 bg-stone-50 rounded-md border border-stone-100">
            {tx.note}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="pt-2 border-t border-stone-100">
        <div className="text-[11px] text-stone-500 mb-3">تاریخچه</div>
        <div className="space-y-3">
          <TimelineRow
            icon={Clock}
            label="ثبت شده"
            by={createdByName}
            at={tx.createdAt}
          />
          {tx.status === 'approved' && approvedByName && (
            <TimelineRow
              icon={CheckCircle2}
              label="تایید شده"
              by={approvedByName}
              at={tx.approvedAt}
              tone="success"
            />
          )}
          {tx.status === 'rejected' && rejectedByName && (
            <TimelineRow
              icon={XCircle}
              label="رد شده"
              by={rejectedByName}
              at={tx.rejectedAt}
              tone="danger"
            />
          )}
        </div>
      </div>
    </>
  );
}

interface DetailRowProps {
  icon: LucideIcon;
  label: string;
  value: string;
  monospace?: boolean;
}

function DetailRow({ icon: Icon, label, value, monospace }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-md bg-stone-50 flex items-center justify-center text-stone-500 flex-shrink-0">
        <Icon size={12} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10.5px] text-stone-400">{label}</div>
        <div
          className={cn(
            'text-[12.5px] text-stone-800 mt-0.5 break-words',
            monospace && 'tabular-nums'
          )}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

interface TimelineRowProps {
  icon: LucideIcon;
  label: string;
  by: string;
  at: string;
  tone?: 'success' | 'danger';
}

function TimelineRow({ icon: Icon, label, by, at, tone }: TimelineRowProps) {
  // فرمت تاریخ ISO به یک شکل قابل خواندن
  // در فاز ۹ این به یک formatter شمسی بهتر ارتقا می‌یابد
  const date = new Date(at);
  const formatted = isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('fa-IR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date);

  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
          tone === 'success'
            ? 'bg-emerald-50 text-emerald-700'
            : tone === 'danger'
              ? 'bg-rose-50 text-rose-700'
              : 'bg-stone-100 text-stone-500'
        )}
      >
        <Icon size={11} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] text-stone-700">
          {label} توسط <span className="text-stone-900">{by}</span>
        </div>
        <div className="text-[10.5px] text-stone-400 mt-0.5">{formatted}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Edit form
// ─────────────────────────────────────────────────────────────────

interface EditFormProps {
  tx: Transaction;
  categories: ReadonlyArray<{ id: string; name: string }>;
  onCancel: () => void;
  onSave: (patch: TransactionPatch) => Promise<void>;
  loading: boolean;
}

function EditForm({ tx, categories, onCancel, onSave, loading }: EditFormProps) {
  const [title, setTitle] = useState(tx.title);
  const [category, setCategory] = useState(tx.category);
  const [amount, setAmount] = useState(tx.amount);
  const [payee, setPayee] = useState(tx.payee);
  const [method, setMethod] = useState(tx.method);
  const [receipt, setReceipt] = useState(tx.receipt);
  const [date, setDate] = useState(tx.date);
  const [note, setNote] = useState(tx.note);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cat = categories.find((c) => c.id === category);
    onSave({
      title: title.trim(),
      category,
      categoryName: cat?.name ?? tx.categoryName,
      amount,
      payee: payee.trim(),
      method,
      receipt: receipt.trim() || '—',
      date,
      note: note.trim(),
    });
  }

  const methods = ['نقد', 'کارت به کارت', 'دستگاه پوز', 'چک', 'حواله بانکی'];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="عنوان">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <Field label="دسته">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="مبلغ (تومان)">
        <Input
          type="text"
          inputMode="numeric"
          dir="ltr"
          value={amount > 0 ? formatAmountInput(String(amount)) : ''}
          onChange={(e) => setAmount(parseAmount(e.target.value))}
        />
      </Field>

      <Field label="طرف معامله">
        <Input value={payee} onChange={(e) => setPayee(e.target.value)} />
      </Field>

      <Field label="روش پرداخت">
        <Select value={method} onChange={(e) => setMethod(e.target.value)}>
          {methods.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="شماره رسید">
        <Input
          dir="ltr"
          value={receipt}
          onChange={(e) => setReceipt(e.target.value)}
        />
      </Field>

      <Field label="تاریخ (شمسی)">
        <Input value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="یادداشت">
        <Textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
        <Button
          type="button"
          variant="default"
          onClick={onCancel}
          disabled={loading}
        >
          لغو
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}
