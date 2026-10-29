/**
 * بدنه‌ی POST /api/transactions که repo کلاینت می‌فرستد (ممیزی ۲۰۲۶-۱۰-۳۰).
 * فرم «ثبت تراکنش» پیش‌فاکتور و کد فاکتور را می‌گیرد و API هم `status`/`invoiceCode`
 * را می‌پذیرد، ولی repo آن‌ها را نمی‌فرستاد → پیش‌فاکتورِ مدیر کل فوراً تأیید و روی
 * موجودی صندوق اعمال می‌شد و کد فاکتور ذخیره نمی‌شد.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiRepos } from '@/lib/repos/api';
import type { TransactionInput } from '@/types/transaction';
import type { User } from '@/types';

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({
    ok: true, status: 201,
    json: async () => ({ transaction: { id: 't1' } }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

const baseInput = {
  type: 'expense', title: 'خرید گوشت', category: '00000000-0000-0000-0000-000000000001',
  amount: 1_000_000, payee: 'قصابی', branchId: '00000000-0000-0000-0000-000000000002',
  method: 'cash', receipt: '—', date: '1405/08/08', note: '', hasReceipt: false,
} as unknown as TransactionInput;

async function sentBody(input: TransactionInput) {
  await createApiRepos().transactions.create({
    input, user: { id: 'u1' } as User, categoryName: 'گوشت', branchName: 'شعبه',
  });
  return JSON.parse(fetchMock.mock.calls[0]![1].body as string);
}

describe('transactionsRepo.create — بدنه‌ی درخواست', () => {
  it('پیش‌فاکتور با status=proforma و کد فاکتور فرستاده می‌شود', async () => {
    const body = await sentBody({ ...baseInput, initialStatus: 'proforma', invoiceCode: 'INV-17' });
    expect(body.status).toBe('proforma');
    expect(body.invoiceCode).toBe('INV-17');
  });

  it('تراکنش عادی status=pending می‌فرستد (همان رفتار قبلی سرور)', async () => {
    const body = await sentBody({ ...baseInput, initialStatus: 'pending', invoiceCode: null });
    expect(body.status).toBe('pending');
    expect(body.invoiceCode).toBeUndefined();
  });
});
