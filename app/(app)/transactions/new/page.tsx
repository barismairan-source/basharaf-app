'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  Button, Card, CardBody, CardHeader, Field,
  Input, JalaliDatePicker, Label, Select, Textarea, Toggle,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { COLORS } from '@/lib/colors';
import { getTodayJalali } from '@/lib/jalali';
import { formatAmountInput, parseAmount } from '@/lib/utils';
import { transactionSchema, type TransactionFormInput } from '@/lib/validations/transaction';

export default function NewTransactionPage() {
  const router = useRouter();
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const categories = useAppStore(s => s.categories);
  const accounts = useAppStore(s => s.accounts);
  const contacts = useAppStore(s => s.contacts);
  const loadAccounts = useAppStore(s => s.loadAccounts);
  const loadContacts = useAppStore(s => s.loadContacts);
  const submitTransaction = useAppStore(s => s.submitTransaction);
  const showToast = useAppStore(s => s.showToast);
  const txError = useAppStore(s => s.txError);
  const vatRate = useAppStore(s => Number(s.appSettings['finance.vat_rate'] ?? '10'));

  const [hydrated, setHydrated] = useState(false);
  const [amountDisplay, setAmountDisplay] = useState('');
  const [includeVat, setIncludeVat] = useState(false);
  const [isCredit, setIsCredit] = useState(false);
  const [contactId, setContactId] = useState('');

  useEffect(() => {
    setHydrated(true);
    loadAccounts();
    loadContacts();
  }, [loadAccounts, loadContacts]);

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
      payee: '',
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

  // وقتی accounts لود شد، accountId را ست کن
  useEffect(() => {
    if (accounts.length > 0 && !watch('accountId' as any)) {
      setValue('accountId' as any, accounts[0]?.id ?? '');
    }
  }, [accounts, setValue, watch]);

  useEffect(() => {
    if (!isTransfer) setValue('category', '');
  }, [type, setValue, isTransfer]);

  const visibleCategories = useMemo(
    () => isTransfer ? [] : (type === 'income' ? categories.income : categories.expense),
    [type, categories, isTransfer]
  );

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

    // محاسبه VAT — اگر فعال باشد، vatAmount = amount * rate / 100
    const vatAmount = includeVat ? Math.round((data.amount * vatRate) / 100) : 0;

    const tx = await submitTransaction(
      {
        type: data.type,
        title: data.title,
        category: data.category ?? '',
        amount: data.amount,
        payee: data.payee,
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
      },
      user,
      cat?.name ?? 'انتقال وجه',
      branch.name
    );

    if (tx) {
      const msg = tx.status === 'approved' ? 'تراکنش ثبت و تایید شد' : 'تراکنش ثبت شد — در انتظار تایید';
      showToast(msg, 'success', tx.title);
      reset();
      setAmountDisplay('');
      setIncludeVat(false);
      setIsCredit(false);
      setContactId('');
      router.push('/transactions');
    }
  }

  if (!hydrated || !user) return null;

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">ثبت تراکنش</h1>
          <div className="text-[12px] text-stone-500 mt-1">
            {isAdmin ? 'تراکنش شما فوری تایید می‌شود' : 'تراکنش برای تایید مدیر ارسال می‌شود'}
          </div>
        </div>

        <Card>
          <CardBody>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Error */}
              {txError && (
                <div className="p-3 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-[12.5px]">
                  {txError}
                </div>
              )}

              {/* Type */}
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

              {/* Title */}
              <Field label="عنوان تراکنش" error={errors.title?.message}>
                <Input placeholder="مثلاً: خرید گوشت" hasError={!!errors.title} {...register('title')} />
              </Field>

              {/* Amount */}
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

              {/* Payee */}
              <Field label="طرف معامله" error={errors.payee?.message}>
                <Input placeholder="مثلاً: قصاب کریمی" hasError={!!errors.payee} {...register('payee')} />
              </Field>

              {/* Category (فقط برای غیر transfer) */}
              {!isTransfer && (
                <Field label="دسته‌بندی" error={errors.category?.message}>
                  <Select hasError={!!errors.category} {...register('category')}>
                    <option value="">— انتخاب دسته —</option>
                    {visibleCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
              )}

              {/* Branch */}
              <Field label="شعبه" error={errors.branchId?.message}>
                <Select {...register('branchId')} disabled={branchLocked}>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </Select>
              </Field>

              {/* Account — اجباری برای محاسبه موجودی */}
              <Field
                label={isTransfer ? 'صندوق مبدا' : 'صندوق / حساب'}
                helper={accounts.length === 0 ? 'ابتدا از صفحه صندوق‌ها یک حساب بسازید' : undefined}
              >
                <Select {...register('accountId' as any)}>
                  <option value="">— بدون صندوق (تأثیری بر موجودی ندارد) —</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </Select>
              </Field>

              {/* Destination account (فقط transfer) */}
              {isTransfer && (
                <Field label="صندوق مقصد">
                  <Select {...register('destinationAccountId' as any)}>
                    <option value="">— انتخاب صندوق مقصد —</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </Select>
                </Field>
              )}

              {/* Method */}
              <Field label="روش پرداخت" error={errors.method?.message}>
                <Select {...register('method')}>
                  <option value="نقد">نقد</option>
                  <option value="کارت به کارت">کارت به کارت</option>
                  <option value="دستگاه پوز">دستگاه پوز</option>
                  <option value="حواله بانکی">حواله بانکی</option>
                  <option value="چک">چک</option>
                </Select>
              </Field>

              {/* VAT — فقط برای income/expense */}
              {!isTransfer && (
                <div className="p-3 rounded-md border border-stone-200 bg-stone-50/50 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                      checked={includeVat}
                      onChange={e => setIncludeVat(e.target.checked)}
                    />
                    <span className="text-[12.5px] text-stone-700">احتساب مالیات ارزش افزوده ({vatRate}٪)</span>
                  </label>
                  {includeVat && watch('amount') > 0 && (
                    <div className="text-[11.5px] text-stone-500 pr-6 space-y-0.5">
                      <div>مبلغ مالیات: <span className="text-stone-800 tabular-nums">{new Intl.NumberFormat('fa-IR').format(Math.round((watch('amount') * vatRate) / 100))}</span> تومان</div>
                      <div>جمع کل: <span className="text-stone-900 font-medium tabular-nums">{new Intl.NumberFormat('fa-IR').format(watch('amount') + Math.round((watch('amount') * vatRate) / 100))}</span> تومان</div>
                    </div>
                  )}
                </div>
              )}

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
                        className="w-4 h-4 rounded border-stone-300 accent-stone-900"
                        checked={isCredit}
                        onChange={e => setIsCredit(e.target.checked)}
                      />
                      <span className="text-[12.5px] text-stone-700">
                        نسیه است ({type === 'income' ? 'طرف‌حساب بدهکار می‌شود' : 'ما بدهکار می‌شویم'})
                      </span>
                    </label>
                  )}
                </div>
              )}

              {/* Receipt */}
              <Field label="شماره رسید (اختیاری)">
                <Input placeholder="مثلاً: ۱۲۳۴۵۶" dir="ltr" {...register('receipt')} />
              </Field>

              {/* Date */}
              <Field label="تاریخ (شمسی)" error={errors.date?.message}>
                <JalaliDatePicker
                  value={watch('date')}
                  onChange={v => setValue('date', v, { shouldValidate: true })}
                  hasError={!!errors.date}
                />
              </Field>

              {/* Note */}
              <Field label="توضیحات (اختیاری)">
                <Textarea rows={2} placeholder="یادداشت..." {...register('note')} />
              </Field>

              {/* Submit */}
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  icon={isAdmin ? Save : Plus}
                  loading={isSubmitting}
                  className="w-full"
                >
                  {isAdmin ? 'ثبت و تایید تراکنش' : 'ارسال برای تایید'}
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
