import { z } from 'zod';

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'transfer']),

  title: z.string().min(2, 'عنوان باید حداقل ۲ کاراکتر باشد').max(120).transform(v => v.trim()),

  // برای transfer، category اختیاری است
  category: z.string().optional().default(''),

  amount: z.number().positive('مبلغ باید بزرگ‌تر از صفر باشد').max(999_999_999_999),

  payee: z.string().max(120).optional().transform(v => (v ?? '').trim()),

  branchId: z.string().min(1, 'یک شعبه انتخاب کنید'),

  method: z.string().min(1, 'روش پرداخت الزامی است'),

  receipt: z.string().max(40).optional().transform(v => v?.trim() || '—'),

  date: z.string().min(1, 'تاریخ الزامی است'),

  note: z.string().max(500).optional().transform(v => v?.trim() ?? ''),

  hasReceipt: z.boolean().optional().default(false),

  // account fields — اختیاری
  accountId: z.string().optional().default(''),
  destinationAccountId: z.string().optional().default(''),
});

export type TransactionFormInput = z.infer<typeof transactionSchema>;

export const rejectionSchema = z.object({
  reason: z.string().max(300).optional().transform(v => v?.trim() ?? ''),
});

export type RejectionInput = z.infer<typeof rejectionSchema>;
