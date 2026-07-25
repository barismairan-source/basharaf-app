import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FILTERS, filterTransactions, sortTransactions, summarizeTransactions,
  paginateItems, paramsToFilters, filtersToParams, countActiveFilters,
  type TransactionFilterState,
} from '@/lib/transactions/filterTransactions';
import type { Transaction } from '@/types';

let seq = 0;
/** فیکسچر حداقلی تراکنش — فقط فیلدهایی که تست به آن‌ها نیاز دارد را override می‌کند. */
function makeTx(overrides: Partial<Transaction> & { status?: Transaction['status'] } = {}): Transaction {
  seq += 1;
  const base = {
    id: `tx-${seq}`,
    type: 'expense' as const,
    title: `تراکنش ${seq}`,
    category: 'cat-1',
    categoryName: 'دسته',
    amount: 100_000,
    payee: 'طرف حساب',
    branchId: 'branch-1',
    branch: 'شعبه مرکزی',
    method: 'cash',
    receipt: '—',
    date: '1404/01/01',
    note: '',
    hasReceipt: false,
    invoiceCode: null,
    contactId: null,
    createdAt: '2025-03-21T10:00:00.000Z',
    updatedAt: '2025-03-21T10:00:00.000Z',
    createdBy: 'user-1',
  };
  const status = overrides.status ?? 'approved';
  const extra =
    status === 'approved' ? { approvedBy: 'user-2', approvedAt: '2025-03-21T11:00:00.000Z' } :
    status === 'rejected' ? { rejectedBy: 'user-2', rejectedAt: '2025-03-21T11:00:00.000Z', rejectionReason: 'نامعتبر' } :
    {};
  return { ...base, ...extra, ...overrides, status } as Transaction;
}

describe('filtersToParams / paramsToFilters — round-trip URL persistence', () => {
  it('پیش‌فرض‌ها هیچ پارامتری در URL تولید نمی‌کنند (لینک تمیز)', () => {
    expect(filtersToParams(DEFAULT_FILTERS)).toEqual({});
  });

  it('round-trip: filters → params → filters دقیقاً برابر با اصل است', () => {
    const filters: TransactionFilterState = {
      search: 'قبض برق',
      type: 'expense',
      status: 'pending',
      branchId: 'branch-2',
      dateFrom: '1404/01/01',
      dateTo: '1404/01/31',
      sort: 'amount-desc',
      page: 3,
    };
    const params = new URLSearchParams(filtersToParams(filters));
    expect(paramsToFilters(params)).toEqual(filters);
  });

  it('مقادیر نامعتبر در URL بی‌صدا به پیش‌فرض برمی‌گردند (نه throw)', () => {
    const params = new URLSearchParams('type=bogus&status=bogus&sort=bogus&page=-5');
    expect(paramsToFilters(params)).toEqual(DEFAULT_FILTERS);
  });
});

describe('countActiveFilters', () => {
  it('حالت پیش‌فرض = صفر فیلتر فعال', () => {
    expect(countActiveFilters(DEFAULT_FILTERS)).toBe(0);
  });

  it('sort و page جزو «فیلتر فعال» شمرده نمی‌شوند (view-state نه scope)', () => {
    expect(countActiveFilters({ ...DEFAULT_FILTERS, sort: 'amount-desc', page: 5 })).toBe(0);
  });

  it('هر فیلتر غیرپیش‌فرض جدا شمرده می‌شود', () => {
    expect(countActiveFilters({ ...DEFAULT_FILTERS, type: 'income', status: 'pending' })).toBe(2);
  });
});

describe('filterTransactions', () => {
  const txs = [
    makeTx({ type: 'income', status: 'approved', branchId: 'b1', title: 'فروش نقدی', payee: 'مشتری', categoryName: 'فروش', date: '1404/01/05' }),
    makeTx({ type: 'expense', status: 'pending', branchId: 'b2', title: 'خرید مواد اولیه', payee: 'تامین‌کننده', categoryName: 'خرید', date: '1404/02/10' }),
    makeTx({ type: 'expense', status: 'rejected', branchId: 'b1', title: 'اجاره', payee: 'مالک', categoryName: 'اجاره', date: '1404/03/01' }),
  ];

  it('فیلتر بر اساس نوع', () => {
    expect(filterTransactions(txs, { ...DEFAULT_FILTERS, type: 'income' })).toHaveLength(1);
  });

  it('فیلتر بر اساس وضعیت', () => {
    expect(filterTransactions(txs, { ...DEFAULT_FILTERS, status: 'pending' })).toHaveLength(1);
  });

  it('فیلتر بر اساس شعبه', () => {
    expect(filterTransactions(txs, { ...DEFAULT_FILTERS, branchId: 'b1' })).toHaveLength(2);
  });

  it('جستجو در عنوان/طرف‌حساب/دسته', () => {
    expect(filterTransactions(txs, { ...DEFAULT_FILTERS, search: 'اجاره' })).toHaveLength(1);
  });

  it('بازه‌ی تاریخ شمسی (from/to) — هر دو طرف شامل است', () => {
    const result = filterTransactions(txs, { ...DEFAULT_FILTERS, dateFrom: '1404/02/01', dateTo: '1404/02/28' });
    expect(result).toHaveLength(1);
    expect(result[0]!.title).toBe('خرید مواد اولیه');
  });

  it('تاریخ نامعتبر نادیده گرفته می‌شود، نه throw', () => {
    expect(() => filterTransactions(txs, { ...DEFAULT_FILTERS, dateFrom: 'غلط' })).not.toThrow();
    expect(filterTransactions(txs, { ...DEFAULT_FILTERS, dateFrom: 'غلط' })).toHaveLength(3);
  });

  it('آرایه‌ی ورودی و فیلد status هرگز mutate نمی‌شوند', () => {
    const original = txs.map(t => ({ ...t }));
    filterTransactions(txs, { ...DEFAULT_FILTERS, status: 'approved' });
    expect(txs).toEqual(original);
  });
});

describe('summarizeTransactions — periodNetFlow، نه balance', () => {
  it('فقط approved در income/expense شمرده می‌شود', () => {
    const txs = [
      makeTx({ type: 'income', status: 'approved', amount: 500_000 }),
      makeTx({ type: 'expense', status: 'approved', amount: 200_000 }),
      makeTx({ type: 'income', status: 'pending', amount: 999_999 }),
      makeTx({ type: 'expense', status: 'rejected', amount: 111_111 }),
    ];
    const s = summarizeTransactions(txs);
    expect(s.approvedIncome).toBe(500_000);
    expect(s.approvedExpense).toBe(200_000);
    expect(s.periodNetFlow).toBe(300_000);
  });

  it('نام فیلد صراحتاً periodNetFlow است — نه balance/موجودی', () => {
    const s = summarizeTransactions([]);
    expect(s).toHaveProperty('periodNetFlow');
    expect(s).not.toHaveProperty('balance');
  });

  it('pendingCount فقط وضعیت pending را می‌شمارد', () => {
    const txs = [
      makeTx({ status: 'pending' }),
      makeTx({ status: 'pending' }),
      makeTx({ status: 'approved' }),
      makeTx({ status: 'proforma' }),
    ];
    expect(summarizeTransactions(txs).pendingCount).toBe(2);
  });

  it('لیست خالی: همه صفر — نه undefined نه NaN', () => {
    expect(summarizeTransactions([])).toEqual({
      approvedIncome: 0, approvedExpense: 0, periodNetFlow: 0, pendingCount: 0,
    });
  });
});

describe('sortTransactions', () => {
  const txs = [
    makeTx({ amount: 100, createdAt: '2025-01-01T00:00:00.000Z' }),
    makeTx({ amount: 300, createdAt: '2025-03-01T00:00:00.000Z' }),
    makeTx({ amount: 200, createdAt: '2025-02-01T00:00:00.000Z' }),
  ];

  it('date-desc: جدیدترین اول', () => {
    expect(sortTransactions(txs, 'date-desc').map(t => t.amount)).toEqual([300, 200, 100]);
  });

  it('amount-asc: کمترین مبلغ اول', () => {
    expect(sortTransactions(txs, 'amount-asc').map(t => t.amount)).toEqual([100, 200, 300]);
  });

  it('آرایه‌ی ورودی را mutate نمی‌کند', () => {
    const original = [...txs];
    sortTransactions(txs, 'amount-asc');
    expect(txs).toEqual(original);
  });
});

describe('paginateItems', () => {
  const items = Array.from({ length: 45 }, (_, i) => i);

  it('صفحه‌ی معمولی', () => {
    const p = paginateItems(items, 2, 20);
    expect(p.items).toEqual(items.slice(20, 40));
    expect(p.totalPages).toBe(3);
  });

  it('صفحه‌ی خارج از بازه به نزدیک‌ترین صفحه‌ی معتبر می‌چسبد', () => {
    const p = paginateItems(items, 99, 20);
    expect(p.page).toBe(3);
    expect(p.items).toEqual(items.slice(40, 45));
  });

  it('صفحه‌ی صفر یا منفی به صفحه‌ی ۱ می‌چسبد', () => {
    expect(paginateItems(items, 0, 20).page).toBe(1);
    expect(paginateItems(items, -5, 20).page).toBe(1);
  });

  it('لیست خالی: یک صفحه‌ی خالی معتبر (نه صفر صفحه)', () => {
    const p = paginateItems([], 1, 20);
    expect(p.totalPages).toBe(1);
    expect(p.items).toEqual([]);
  });
});
