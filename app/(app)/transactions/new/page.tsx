'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Button, Card, CardBody, Checkbox, Disclosure, Field,
  Input, InlineNotice, JalaliDatePicker, Label, PageHeader, PageShell,
  Select, StickyActionBar, Textarea, Toggle,
} from '@/components/ui';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useAppStore } from '@/store';
import { COLORS } from '@/lib/colors';
import { getTodayJalali } from '@/lib/jalali';
import { cn, fmt, formatAmountInput, parseAmount } from '@/lib/utils';
import { transactionSchema, type TransactionFormInput } from '@/lib/validations/transaction';

/** ترتیب رفتن فوکوس به اولین فیلد نامعتبر — فقط فیلدهایی که ref واقعی RHF دارند (JalaliDatePicker ref ندارد). */
const FOCUS_ORDER: Array<keyof TransactionFormInput> = ['amount', 'title', 'category', 'branchId', 'method'];

const FIELD_LABELS: Partial<Record<keyof TransactionFormInput, string>> = {
  amount: 'مبلغ',
  title: 'عنوان تراکنش',
  category: 'دسته‌بندی',
  branchId: 'شعبه',
  method: 'روش پرداخت',
  date: 'تاریخ',
};

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirm = useConfirm();
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const categories = useAppStore(s => s.categories);
  const accounts = useAppStore(s => s.accounts);
  const contacts = useAppStore(s => s.contacts);
  const loadAccounts = useAppStore(s => s.loadAccounts);
  const loadContacts = useAppStore(s => s.loadContacts);
  const submitTransaction = useAppStore(s => s.submitTransaction);
  const createCategory = useAppStore(s => s.createCategory);
  const showToast = useAppStore(s => s.showToast);
  const txError = useAppStore(s => s.txError);
  const vatRate = useAppStore(s => Number(s.appSettings['finance.vat_rate'] ?? '10'));

  const [hydrated, setHydrated] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [includeVat, setIncludeVat] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [contactId, setContactId] = useState('');
  const [invoiceCode, setInvoiceCode] = useState('');
  const [isProforma, setIsProforma] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const isSubmittingRef = useRef(false);

  useEffect(() => {
    setHydrated(true);
    loadAccounts();
    loadContacts();
    try {
      if (localStorage.getItem('ba-tx-details-open') === '1') setDetailsOpen(true);
    } catch {}
  }, [loadAccounts, loadContacts]);

  // pre-fill از پارامترهای URL
  useEffect(() => {
    const prefillType = searchParams.get('prefill_type') as 'income' | 'expense' | 'transfer' | null;
    const prefillAmount = searchParams.get('prefill_amount');
    const prefillTitle = searchParams.get('prefill_title');
    const prefillNote = searchParams.get('prefill_note');
    const prefillContactId = searchParams.get('prefill_contactId');
    const prefillAccountId = searchParams.get('prefill_accountId');
    const prefillDestAccountId = searchParams.get('prefill_destAccountId');

    if (prefillType) setValue('type' as any, prefillType);
    if (prefillAmount) {
      const n = parseInt(prefillAmount, 10);
      if (!isNaN(n)) {
        setValue('amount' as any, n);
        setAmountDisplay(new Intl.NumberFormat('fa-IR').format(n));
      }
    }
    if (prefillTitle) setValue('title' as any, prefillTitle);
    if (prefillNote) setValue('note' as any, prefillNote);
    if (prefillContactId) setContactId(prefillContactId);
    if (prefillAccountId) setValue('accountId' as any, prefillAccountId);
    if (prefillDestAccountId) setValue('destinationAccountId' as any, prefillDestAccountId);

    if (prefillType || prefillAmount || prefillTitle || prefillNote || prefillContactId || prefillAccountId || prefillDestAccountId) {
      setDetailsOpen(true);
    }
  // فقط یک بار روی mount اجرا می‌شود
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = user?.role === 'SuperAdmin';
  const defaultBranchId = user?.role === 'BranchUser' ? (user.assignedBranch ?? '') : (branches[0]?.id ?? '');
  const branchLocked = user?.role === 'BranchUser';
  const initialDate = useMemo(() => getTodayJalali(), []);

  const {
    register, handleSubmit, setValue, watch, setFocus,
    formState: { errors, isSubmitting }, reset,
  } = useForm<TransactionFormInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      title: '',
      category: '',
      amount: 0,
      branchId: defaultBranchId,
      method: 'نقد',
      receipt: '',
      date: initialDate,
      note: '',
      hasReceipt: false,
      accountId: accounts[0]?.id ?? '',
      destinationAccountId: '',
    },
  });

  const type = watch('type');
  const branchId = watch('branchId');
  const categoryValue = watch('category');
  const isTransfer = type === 'transfer';

  // حساب‌های محدوده‌ی شعبه انتخابی: ستادی (null) + همان شعبه
  const scopedAccounts = useMemo(() => {
    if (!branchId) return accounts;
    return accounts.filter(a => a.branchId === null || a.branchId === branchId);
  }, [accounts, branchId]);

  const operationalAccounts = useMemo(
    () => scopedAccounts.filter(a => a.type !== 'partner_equity'),
    [scopedAccounts]
  );

  const equityInScope = useMemo(
    () => scopedAccounts.filter(a => a.type === 'partner_equity'),
    [scopedAccounts]
  );

  // وقتی accounts لود شد، accountId را ست کن
  useEffect(() => {
    if (accounts.length > 0 && !watch('accountId' as any)) {
      setValue('accountId' as any, accounts[0]?.id ?? '');
    }
  }, [accounts, setValue, watch]);

  // وقتی شعبه عوض می‌شود، حساب‌های خارج از scope را پاک کن
  useEffect(() => {
    const currentId = watch('accountId' as any);
    if (currentId && !scopedAccounts.some(a => a.id === currentId)) {
      setValue('accountId' as any, '');
    }
    const currentDestId = watch('destinationAccountId' as any);
    if (currentDestId && !scopedAccounts.some(a => a.id === currentDestId)) {
      setValue('destinationAccountId' as any, '');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    if (!isTransfer) setValue('category', '');
  }, [type, setValue, isTransfer]);

  // خطای دسته‌بندی با تغییر نوع/انتخاب دسته پاک می‌شود
  useEffect(() => {
    setCategoryError(null);
  }, [type, categoryValue]);

  const visibleCategories = useMemo(
    () => isTransfer ? [] : (type === 'income' ? categories.income : categories.expense),
    [type, categories, isTransfer]
  );

  // ─── تشخیص تغییرات ذخیره‌نشده — برای هشدار خروج ───────────────────
  const watchedTitle = watch('title');
  const watchedNote = watch('note');
  const watchedReceipt = watch('receipt');
  const watchedMethod = watch('method');
  const watchedDestAccount = watch('destinationAccountId' as any);
  const watchedDate = watch('date');

  const isFormDirty = Boolean(
    watchedTitle?.trim() ||
    amountDisplay ||
    categoryValue ||
    watchedNote?.trim() ||
    watchedReceipt?.trim() ||
    watchedDestAccount ||
    includeVat || isCredit || contactId || invoiceCode || isProforma ||
    (watchedMethod && watchedMethod !== 'نقد') ||
    (watchedDate && watchedDate !== initialDate)
  );

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (!isFormDirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFormDirty]);

  async function handleCancel() {
    if (isFormDirty) {
      const ok = await confirm({
        title: 'تغییرات ذخیره‌نشده از بین می‌رود',
        description: 'اگر خارج شوید، اطلاعاتی که در این فرم وارد کرده‌اید ذخیره نخواهد شد.',
        confirmLabel: 'خروج بدون ذخیره',
        cancelLabel: 'ادامه ویرایش',
        danger: true,
      });
      if (!ok) return;
    }
    router.back();
  }

  function toggleDetails() {
    setDetailsOpen(prev => {
      const next = !prev;
      try { localStorage.setItem('ba-tx-details-open', next ? '1' : '0'); } catch {}
      return next;
    });
  }

  async function handleCreateCategory() {
    if (!user || !newCatName.trim()) return;
    const catType = type === 'income' ? 'income' : 'expense';
    setCreatingCat(true);
    const ok = await createCategory(catType, newCatName.trim(), user);
    setCreatingCat(false);
    if (ok) {
      const fresh = useAppStore.getState().categories;
      const list = catType === 'income' ? fresh.income : fresh.expense;
      const newCat = [...list].reverse().find(c => c.name === newCatName.trim());
      if (newCat) setValue('category', newCat.id, { shouldValidate: true });
      setNewCatName('');
      setShowNewCatModal(false);
    } else {
      showToast('خطا در ساخت دسته', 'danger');
    }
  }

  /** اولین فیلد نامعتبر (خطای zod) را فوکوس می‌کند — برای دسترس‌پذیری «رفتن به خطا». */
  function onInvalid(errs: typeof errors) {
    setCategoryError(null);
    const firstKey = FOCUS_ORDER.find(k => errs[k]);
    if (firstKey) setFocus(firstKey);
  }

  async function onSubmit(data: TransactionFormInput) {
    if (!user || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const isTransferType = data.type === 'transfer';
      const cat = isTransferType ? null : visibleCategories.find(c => c.id === data.category);
      const branch = branches.find(b => b.id === data.branchId);

      if (!isTransferType && !cat) {
        setCategoryError('یک دسته‌بندی انتخاب کنید');
        showToast('یک دسته‌بندی انتخاب کنید', 'danger');
        setFocus('category');
        return;
      }
      setCategoryError(null);
      if (!branch) {
        showToast('شعبه نامعتبر است', 'danger');
        setFocus('branchId');
        return;
      }

      const vatAmount = includeVat ? Math.round((data.amount * vatRate) / 100) : 0;

      const selectedContact = contacts.find((c) => c.id === contactId);
      const payeeValue = selectedContact?.name || data.title || '—';

      const tx = await submitTransaction(
        {
          type: data.type,
          title: data.title,
          category: data.category ?? '',
          amount: data.amount,
          payee: payeeValue,
          branchId: data.branchId,
          method: data.method,
          receipt: data.receipt,
          date: data.date,
          note: data.note,
          hasReceipt: data.hasReceipt ?? false,
          accountId: (data as any).accountId || undefined,
          destinationAccountId: (data as any).destinationAccountId || undefined,
          contactId: contactId || undefined,
          vatAmount,
          isCredit,
          invoiceCode: invoiceCode.trim() || null,
          initialStatus: isAdmin && isProforma ? 'proforma' : 'pending',
        },
        user,
        cat?.name ?? 'انتقال وجه',
        branch.name
      );

      if (tx) {
        const msg = tx.status === 'proforma'
          ? 'پیش‌فاکتور ثبت شد'
          : tx.status === 'approved'
            ? 'تراکنش ثبت و تایید شد'
            : 'تراکنش ثبت شد — در انتظار تایید';
        showToast(msg, 'success', tx.title);
        reset();
        setAmountDisplay('');
        setIncludeVat(false);
        setIsCredit(false);
        setContactId('');
        setInvoiceCode('');
        setIsProforma(false);
        router.push('/transactions');
      }
      // اگر tx null بود (خطای API/سرور)، هیچ مقداری پاک نمی‌شود — txError از استور نمایش داده می‌شود
    } finally {
      isSubmittingRef.current = false;
    }
  }

  if (!hydrated || !user) return null;

  // گزینه‌های select حساب — با optgroup اگر equity وجود دارد
  function accountOptions(emptyLabel: string) {
    if (equityInScope.length === 0) {
      return (
        <>
          <option value="">{emptyLabel}</option>
          {operationalAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </>
      );
    }
    return (
      <>
        <option value="">{emptyLabel}</option>
        {operationalAccounts.length > 0 && (
          <optgroup label="عملیاتی">
            {operationalAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </optgroup>
        )}
        <optgroup label="آورده شرکا">
          {equityInScope.map(a => <option key={a.id} value={a.id}>آورده: {a.name}</option>)}
        </optgroup>
      </>
    );
  }

  // ─── پیام زمینه‌ی تایید — بدون افشای جزئیات سیاست داخلی ───────────
  const approvalNotice = isAdmin && isProforma
    ? 'به‌عنوان پیش‌فاکتور ثبت می‌شود — تا تایید نهایی، روی موجودی صندوق یا مانده‌ی طرف‌حساب تأثیری ندارد.'
    : isAdmin
      ? 'این تراکنش بلافاصله ثبت و روی موجودی صندوق اعمال می‌شود.'
      : 'این تراکنش برای تایید مدیر ارسال می‌شود؛ تا تایید نهایی روی موجودی صندوق اثر نمی‌گذارد.';

  const watchedAmount = watch('amount');
  const vatPreview = includeVat ? Math.round((watchedAmount * vatRate) / 100) : 0;

  const errorEntries = FOCUS_ORDER
    .map(k => ({
      key: k,
      label: FIELD_LABELS[k] ?? k,
      message: k === 'category' ? (categoryError ?? errors.category?.message) : (errors as Record<string, { message?: string } | undefined>)[k]?.message,
    }))
    .filter(e => Boolean(e.message));

  return (
    <PageShell type="detail" className="space-y-4">
      <PageHeader title="ثبت تراکنش" backHref="/transactions" />

      <InlineNotice tone="info">{approvalNotice}</InlineNotice>

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate>
        <Card>
          <CardBody>
            <div className="space-y-5">

              {/* ─── خطای سرور ─── */}
              {txError && <InlineNotice tone="danger">{txError}</InlineNotice>}

              {/* ─── خلاصه‌ی خطاهای اعتبارسنجی (پس از تلاش ناموفق) ─── */}
              {errorEntries.length > 0 && (
                <InlineNotice tone="danger" title="لطفاً موارد زیر را برطرف کنید">
                  <ul className="list-disc pr-4 space-y-0.5">
                    {errorEntries.map(e => (
                      <li key={e.key}>{e.label}: {e.message}</li>
                    ))}
                  </ul>
                </InlineNotice>
              )}

              {/* ─── ① اطلاعات اصلی تراکنش ─── */}
              <div className="space-y-4">
                <div>
                  <Label>نوع تراکنش</Label>
                  <Toggle
                    value={type}
                    onChange={v => setValue('type', v as any, { shouldDirty: true })}
                    aria-label="نوع تراکنش"
                    className="w-full"
                    options={[
                      { value: 'expense', label: 'هزینه', dot: COLORS.expense },
                      { value: 'income', label: 'درآمد', dot: COLORS.income },
                      { value: 'transfer', label: 'انتقال وجه', dot: COLORS.neutral },
                    ]}
                  />
                </div>

                {/* مبلغ — قوی‌ترین فیلد فرم */}
                <Field label="مبلغ" error={errors.amount?.message}>
                  <div className="relative">
                    <Input
                      {...register('amount')}
                      type="text"
                      inputMode="numeric"
                      dir="ltr"
                      placeholder="۰"
                      aria-label="مبلغ (تومان)"
                      value={amountDisplay}
                      hasError={!!errors.amount}
                      onChange={e => {
                        const formatted = formatAmountInput(e.target.value);
                        setAmountDisplay(formatted);
                        setValue('amount', parseAmount(formatted), { shouldValidate: true, shouldDirty: true });
                      }}
                      className="h-14 sm:h-16 pl-16 text-[22px] sm:text-[26px] font-semibold tabular-nums text-left"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[12.5px] text-muted pointer-events-none">
                      تومان
                    </span>
                  </div>
                </Field>

                <div className={cn('grid grid-cols-1 gap-x-6 gap-y-4', !isTransfer && 'md:grid-cols-2')}>
                  <Field label="عنوان تراکنش" error={errors.title?.message}>
                    <Input placeholder="مثلاً: خرید گوشت" aria-label="عنوان تراکنش" hasError={!!errors.title} {...register('title')} />
                  </Field>
                  {!isTransfer && (
                    <Field label="دسته‌بندی" error={categoryError ?? errors.category?.message}>
                      <div className="flex gap-1.5">
                        <div className="flex-1">
                          <Select aria-label="دسته‌بندی" hasError={!!(categoryError ?? errors.category)} {...register('category')}>
                            <option value="">— انتخاب دسته —</option>
                            {visibleCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </Select>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => setShowNewCatModal(true)}
                            title="افزودن دسته‌بندی جدید"
                            aria-label="افزودن دسته‌بندی جدید"
                            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-md border border-dashed border-stone-300 text-stone-400 hover:border-stone-500 hover:text-stone-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1"
                          >
                            <Plus size={14} strokeWidth={1.5} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </Field>
                  )}
                </div>
              </div>

              {/* ─── ② مسیر مالی ─── */}
              <div className="space-y-4 border-t border-border pt-5">
                <h2 className="text-[13px] font-medium text-text">مسیر مالی</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <Field label="شعبه" error={errors.branchId?.message}>
                    <Select aria-label="شعبه" {...register('branchId')} disabled={branchLocked}>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="روش پرداخت" error={errors.method?.message}>
                    <Select aria-label="روش پرداخت" {...register('method')}>
                      <option value="نقد">نقد</option>
                      <option value="کارت به کارت">کارت به کارت</option>
                      <option value="دستگاه پوز">دستگاه پوز</option>
                      <option value="حواله بانکی">حواله بانکی</option>
                      <option value="چک">چک</option>
                    </Select>
                  </Field>
                </div>

                <div className={cn('grid grid-cols-1 gap-x-6 gap-y-4', isTransfer && 'md:grid-cols-2')}>
                  <Field
                    label={isTransfer ? 'صندوق مبدا' : 'صندوق / حساب'}
                    helper={accounts.length === 0 ? 'ابتدا از صفحه صندوق‌ها یک حساب بسازید' : undefined}
                  >
                    <Select aria-label={isTransfer ? 'صندوق مبدا' : 'صندوق / حساب'} {...register('accountId' as any)}>
                      {accountOptions('— بدون صندوق (تأثیری بر موجودی ندارد) —')}
                    </Select>
                  </Field>
                  {isTransfer && (
                    <Field label="صندوق مقصد">
                      <Select aria-label="صندوق مقصد" {...register('destinationAccountId' as any)}>
                        {accountOptions('— انتخاب صندوق مقصد —')}
                      </Select>
                    </Field>
                  )}
                </div>

                {!isTransfer && contacts.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                    <Field label="طرف‌حساب (اختیاری)">
                      <Select aria-label="طرف‌حساب" value={contactId} onChange={e => setContactId(e.target.value)}>
                        <option value="">— بدون طرف‌حساب —</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </Select>
                    </Field>
                    {contactId && (
                      <div className="flex items-center min-h-[44px] md:pt-6">
                        <Checkbox
                          checked={isCredit}
                          onChange={e => setIsCredit(e.target.checked)}
                          label={`نسیه است (${type === 'income' ? 'طرف‌حساب بدهکار می‌شود' : 'ما بدهکار می‌شویم'})`}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ─── ③ تاریخ ─── */}
              <div className="border-t border-border pt-5">
                <Field label="تاریخ (شمسی)" error={errors.date?.message} className="max-w-[220px]">
                  <JalaliDatePicker
                    value={watch('date')}
                    onChange={v => setValue('date', v, { shouldValidate: true, shouldDirty: true })}
                    hasError={!!errors.date}
                  />
                </Field>
              </div>

              {/* ─── ④ مالیات و وضعیت ویژه ─── */}
              {!isTransfer && (
                <div className="space-y-2.5 border-t border-border pt-5">
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 min-h-[44px]">
                    <Checkbox
                      checked={includeVat}
                      onChange={e => setIncludeVat(e.target.checked)}
                      label={`احتساب مالیات ارزش افزوده (${vatRate}٪)`}
                    />
                    {includeVat && watchedAmount > 0 && (
                      <div className="text-[11px] text-muted shrink-0 text-left tabular-nums">
                        مالیات: <span className="text-text">{fmt(vatPreview)}</span> · جمع:{' '}
                        <span className="text-text font-medium">{fmt(watchedAmount + vatPreview)}</span> تومان
                      </div>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5">
                      <div className="flex items-center min-h-[44px]">
                        <Checkbox
                          checked={isProforma}
                          onChange={e => setIsProforma(e.target.checked)}
                          label="ثبت به‌عنوان پیش‌فاکتور"
                        />
                      </div>
                      {isProforma && (
                        <p className="text-[11px] text-amber-700 pr-6 -mt-1">
                          پیش‌فاکتور روی موجودی صندوق یا مانده طرف‌حساب تأثیر نمی‌گذارد. برای تأثیر مالی باید بعداً تایید شود.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ─── ⑤ جزئیات بیشتر (اختیاری) ─── */}
              <Disclosure open={detailsOpen} onToggle={toggleDetails} label="جزئیات بیشتر" className="pt-1">
                <Field label="شماره رسید" hint="اختیاری">
                  <Input placeholder="مثلاً: ۱۲۳۴۵۶" dir="ltr" aria-label="شماره رسید" {...register('receipt')} />
                </Field>

                {!isTransfer && (
                  <Field
                    label="کد فاکتور / پیش‌فاکتور"
                    hint="اختیاری"
                    helper="شماره فاکتور یا کد پیگیری را اینجا وارد کنید"
                  >
                    <Input
                      placeholder="مثلاً: INV-1401-001"
                      dir="ltr"
                      aria-label="کد فاکتور"
                      value={invoiceCode}
                      onChange={e => setInvoiceCode(e.target.value)}
                    />
                  </Field>
                )}

                <Field label="توضیحات" hint="اختیاری">
                  <Textarea rows={2} placeholder="یادداشت..." aria-label="توضیحات" {...register('note')} />
                </Field>
              </Disclosure>

            </div>
          </CardBody>
        </Card>

        {/* ─── ⑥ نوار اکشن ثابت ─── */}
        <StickyActionBar>
          <Button
            type="submit"
            variant={isAdmin && isProforma ? 'default' : 'primary'}
            icon={isAdmin ? Save : Plus}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            {isAdmin && isProforma
              ? 'ثبت پیش‌فاکتور'
              : isAdmin
                ? 'ثبت و تایید تراکنش'
                : 'ارسال برای تایید'}
          </Button>
          <Button type="button" variant="default" onClick={handleCancel} disabled={isSubmitting}>
            انصراف
          </Button>
        </StickyActionBar>
      </form>

      {/* مودال افزودن دسته‌ی جدید */}
      {showNewCatModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={e => { if (e.key === 'Escape') { setShowNewCatModal(false); setNewCatName(''); } }}
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => { setShowNewCatModal(false); setNewCatName(''); }}
          />
          <div role="dialog" aria-modal="true" aria-label="دسته‌ی جدید" className="relative z-10 bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs">
            <h3 className="text-[14px] font-medium text-stone-900 mb-4">
              دسته‌ی جدید ({type === 'income' ? 'درآمد' : 'هزینه'})
            </h3>
            <input
              autoFocus
              type="text"
              placeholder="نام دسته‌بندی"
              aria-label="نام دسته‌بندی"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
              className="w-full h-10 px-3 rounded-md border border-stone-200 text-[13px] focus:outline-none focus:border-stone-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowNewCatModal(false); setNewCatName(''); }}
                disabled={creatingCat}
                className="h-9 px-4 text-[13px] text-muted border border-border rounded-lg hover:bg-bg transition-colors disabled:opacity-50"
              >
                لغو
              </button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCreateCategory}
                loading={creatingCat}
                disabled={!newCatName.trim()}
              >
                افزودن
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
