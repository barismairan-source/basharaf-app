'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Plus, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Button, Card, CardBody, Field,
  Input, JalaliDatePicker, Label, Select, Textarea, Toggle,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { COLORS } from '@/lib/colors';
import { getTodayJalali } from '@/lib/jalali';
import { cn, formatAmountInput, parseAmount } from '@/lib/utils';
import { transactionSchema, type TransactionFormInput } from '@/lib/validations/transaction';

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = user?.role === 'SuperAdmin';
  const defaultBranchId = user?.role === 'BranchUser' ? (user.assignedBranch ?? '') : (branches[0]?.id ?? '');
  const branchLocked = user?.role === 'BranchUser';

  const {
    register, handleSubmit, setValue, watch,
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
      date: getTodayJalali(),
      note: '',
      hasReceipt: false,
      accountId: accounts[0]?.id ?? '',
      destinationAccountId: '',
    },
  });

  const type = watch('type');
  const branchId = watch('branchId');
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

  const visibleCategories = useMemo(
    () => isTransfer ? [] : (type === 'income' ? categories.income : categories.expense),
    [type, categories, isTransfer]
  );

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

  async function onSubmit(data: TransactionFormInput) {
    if (!user) return;

    const isTransferType = data.type === 'transfer';
    const cat = isTransferType ? null : visibleCategories.find(c => c.id === data.category);
    const branch = branches.find(b => b.id === data.branchId);

    if (!isTransferType && !cat) {
      showToast('یک دسته‌بندی انتخاب کنید', 'danger');
      return;
    }
    if (!branch) {
      showToast('شعبه نامعتبر است', 'danger');
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

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">ثبت تراکنش</h1>
          <div className="text-[12px] text-stone-500 mt-1">
            {isAdmin ? 'تراکنش شما فوری تایید می‌شود' : 'تراکنش برای تایید مدیر ارسال می‌شود'}
          </div>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* ─── Error ─── */}
              {txError && (
                <div className="p-3 rounded-lg bg-danger-subtle border border-danger/20 text-danger text-[12.5px]">
                  {txError}
                </div>
              )}

              {/* ─── CORE ① نوع تراکنش ─── */}
              <div>
                <Label>نوع تراکنش</Label>
                <Toggle
                  value={type}
                  onChange={v => setValue('type', v as any)}
                  className="w-full"
                  options={[
                    { value: 'expense', label: 'هزینه', dot: COLORS.expense },
                    { value: 'income', label: 'درآمد', dot: COLORS.income },
                    { value: 'transfer', label: 'انتقال وجه', dot: COLORS.neutral },
                  ]}
                />
              </div>

              {/* ─── CORE ② عنوان + مبلغ ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <Field label="عنوان تراکنش" error={errors.title?.message}>
                  <Input placeholder="مثلاً: خرید گوشت" hasError={!!errors.title} {...register('title')} />
                </Field>
                <Field label="مبلغ (تومان)" error={errors.amount?.message}>
                  <Input
                    type="text"
                    inputMode="numeric"
                    dir="ltr"
                    placeholder="۰"
                    value={amountDisplay}
                    hasError={!!errors.amount}
                    onChange={e => {
                      const formatted = formatAmountInput(e.target.value);
                      setAmountDisplay(formatted);
                      setValue('amount', parseAmount(formatted), { shouldValidate: true });
                    }}
                  />
                </Field>
              </div>

              {/* ─── CORE ③ دسته + شعبه ─── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {!isTransfer && (
                  <Field label="دسته‌بندی" error={errors.category?.message}>
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <Select hasError={!!errors.category} {...register('category')}>
                          <option value="">— انتخاب دسته —</option>
                          {visibleCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => setShowNewCatModal(true)}
                          title="دسته‌ی جدید"
                          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-md border border-dashed border-stone-300 text-stone-400 hover:border-stone-500 hover:text-stone-600 transition-colors"
                        >
                          <Plus size={14} strokeWidth={1.5} />
                        </button>
                      )}
                    </div>
                  </Field>
                )}
                <Field label="شعبه" error={errors.branchId?.message}>
                  <Select {...register('branchId')} disabled={branchLocked}>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
              </div>

              {/* ─── CORE ④ صندوق / حساب ─── */}
              <Field
                label={isTransfer ? 'صندوق مبدا' : 'صندوق / حساب'}
                helper={accounts.length === 0 ? 'ابتدا از صفحه صندوق‌ها یک حساب بسازید' : undefined}
              >
                <Select {...register('accountId' as any)}>
                  {accountOptions('— بدون صندوق (تأثیری بر موجودی ندارد) —')}
                </Select>
              </Field>

              {/* ─── CORE ⑤ صندوق مقصد (فقط transfer) ─── */}
              {isTransfer && (
                <Field label="صندوق مقصد">
                  <Select {...register('destinationAccountId' as any)}>
                    {accountOptions('— انتخاب صندوق مقصد —')}
                  </Select>
                </Field>
              )}

              {/* ─── Accordion Toggle ─── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-stone-200" />
                <button
                  type="button"
                  onClick={toggleDetails}
                  className="flex items-center gap-1 text-[11.5px] text-stone-400 hover:text-stone-600 transition-colors select-none"
                >
                  جزئیات بیشتر
                  <ChevronDown
                    size={13}
                    strokeWidth={1.5}
                    className={cn('transition-transform', detailsOpen && 'rotate-180')}
                  />
                </button>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* ─── Accordion Body ─── */}
              {detailsOpen && (
                <div className="space-y-5">

                  {/* روش پرداخت */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                    <Field label="روش پرداخت" error={errors.method?.message}>
                      <Select {...register('method')}>
                        <option value="نقد">نقد</option>
                        <option value="کارت به کارت">کارت به کارت</option>
                        <option value="دستگاه پوز">دستگاه پوز</option>
                        <option value="حواله بانکی">حواله بانکی</option>
                        <option value="چک">چک</option>
                      </Select>
                    </Field>
                  </div>

                  {/* طرف‌حساب + نسیه */}
                  {!isTransfer && contacts.length > 0 && (
                    <div className="space-y-3">
                      <Field label="طرف‌حساب (اختیاری)">
                        <Select value={contactId} onChange={e => setContactId(e.target.value)}>
                          <option value="">— بدون طرف‌حساب —</option>
                          {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </Select>
                      </Field>
                      {contactId && (
                        <label className="flex items-center gap-2 cursor-pointer pr-1">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-border accent-accent"
                            checked={isCredit}
                            onChange={e => setIsCredit(e.target.checked)}
                          />
                          <span className="text-[12.5px] text-text">
                            نسیه است ({type === 'income' ? 'طرف‌حساب بدهکار می‌شود' : 'ما بدهکار می‌شویم'})
                          </span>
                        </label>
                      )}
                    </div>
                  )}

                  {/* شماره رسید + تاریخ */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <Field label="شماره رسید (اختیاری)">
                      <Input placeholder="مثلاً: ۱۲۳۴۵۶" dir="ltr" {...register('receipt')} />
                    </Field>
                    <Field label="تاریخ (شمسی)" error={errors.date?.message}>
                      <JalaliDatePicker
                        value={watch('date')}
                        onChange={v => setValue('date', v, { shouldValidate: true })}
                        hasError={!!errors.date}
                      />
                    </Field>
                  </div>

                  {/* کد فاکتور */}
                  {!isTransfer && (
                    <Field
                      label="کد فاکتور / پیش‌فاکتور (اختیاری)"
                      helper="شماره فاکتور یا کد پیگیری را اینجا وارد کنید"
                    >
                      <Input
                        placeholder="مثلاً: INV-1401-001"
                        dir="ltr"
                        value={invoiceCode}
                        onChange={e => setInvoiceCode(e.target.value)}
                      />
                    </Field>
                  )}

                  {/* VAT */}
                  {!isTransfer && (
                    <div className="p-3 rounded-md border border-border bg-bg space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-border accent-accent"
                          checked={includeVat}
                          onChange={e => setIncludeVat(e.target.checked)}
                        />
                        <span className="text-[12.5px] text-text">
                          احتساب مالیات ارزش افزوده ({vatRate}٪)
                        </span>
                      </label>
                      {includeVat && watch('amount') > 0 && (
                        <div className="text-[11.5px] text-muted pr-6 space-y-0.5">
                          <div>
                            مبلغ مالیات:{' '}
                            <span className="text-text tabular-nums">
                              {new Intl.NumberFormat('fa-IR').format(Math.round((watch('amount') * vatRate) / 100))}
                            </span>{' '}
                            تومان
                          </div>
                          <div>
                            جمع کل:{' '}
                            <span className="text-text font-medium tabular-nums">
                              {new Intl.NumberFormat('fa-IR').format(watch('amount') + Math.round((watch('amount') * vatRate) / 100))}
                            </span>{' '}
                            تومان
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* پیش‌فاکتور (فقط SuperAdmin) */}
                  {isAdmin && !isTransfer && (
                    <div className="p-3 rounded-md border border-amber-200 bg-amber-50/60 space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-amber-300 accent-amber-600"
                          checked={isProforma}
                          onChange={e => setIsProforma(e.target.checked)}
                        />
                        <span className="text-[12.5px] text-amber-800 font-medium">ثبت به‌عنوان پیش‌فاکتور</span>
                      </label>
                      {isProforma && (
                        <p className="text-[11px] text-amber-700 pr-6">
                          پیش‌فاکتور روی موجودی صندوق یا مانده طرف‌حساب تأثیر نمی‌گذارد.
                          برای تأثیر مالی باید بعداً تأیید شود.
                        </p>
                      )}
                    </div>
                  )}

                  {/* توضیحات */}
                  <Field label="توضیحات (اختیاری)">
                    <Textarea rows={2} placeholder="یادداشت..." {...register('note')} />
                  </Field>

                </div>
              )}

              {/* ─── Footer ─── */}
              <div className="flex justify-end items-center gap-3 pt-4 mt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="h-10 px-4 text-[13px] text-muted border border-border rounded-lg hover:bg-bg transition-colors"
                >
                  انصراف
                </button>
                <Button
                  type="submit"
                  variant={isAdmin && isProforma ? 'default' : 'primary'}
                  icon={isAdmin ? Save : Plus}
                  loading={isSubmitting}
                >
                  {isAdmin && isProforma
                    ? 'ثبت پیش‌فاکتور'
                    : isAdmin
                      ? 'ثبت و تایید تراکنش'
                      : 'ارسال برای تایید'}
                </Button>
              </div>

            </form>
          </CardBody>
        </Card>
      </div>

      {/* مودال افزودن دسته‌ی جدید */}
      {showNewCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => { setShowNewCatModal(false); setNewCatName(''); }}
          />
          <div className="relative z-10 bg-white rounded-xl shadow-2xl p-6 w-full max-w-xs">
            <h3 className="text-[14px] font-medium text-stone-900 mb-4">
              دسته‌ی جدید ({type === 'income' ? 'درآمد' : 'هزینه'})
            </h3>
            <input
              autoFocus
              type="text"
              placeholder="نام دسته‌بندی"
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
    </div>
  );
}
