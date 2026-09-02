import { describe, it, expect } from 'vitest';
import { buildInvoiceHtml } from '@/lib/transactions/printInvoice';
import { toFa } from '@/lib/utils';
import type { Transaction, Branch, Contact } from '@/types';

let seq = 0;
function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  seq += 1;
  const base = {
    id: `tx-${seq}`,
    type: 'income' as const,
    title: `تراکنش ${seq}`,
    category: 'cat-1',
    categoryName: 'فروش',
    amount: 110_000,
    payee: 'مشتری تستی',
    branchId: 'branch-1',
    branch: 'شعبه مرکزی',
    method: 'cash',
    receipt: '—',
    date: '1404/01/01',
    note: '',
    hasReceipt: false,
    invoiceCode: null,
    contactId: null,
    vatAmount: 0,
    createdAt: '2025-03-21T10:00:00.000Z',
    updatedAt: '2025-03-21T10:00:00.000Z',
    createdBy: 'user-1',
    status: 'approved' as const,
    approvedBy: 'user-2',
    approvedAt: '2025-03-21T11:00:00.000Z',
  };
  return { ...base, ...overrides } as Transaction;
}

/** مطابق fmt() در lib/utils.ts — ارقام فارسی با جداکننده‌ی هزارگان. */
function fa(n: number): string {
  return toFa(n.toLocaleString('en-US'));
}

const branch: Pick<Branch, 'name' | 'address' | 'manager'> = {
  name: 'شعبه مرکزی',
  address: 'خیابان ولیعصر',
  manager: 'علی رضایی',
};

describe('buildInvoiceHtml', () => {
  it('escapes HTML in user-controlled fields (title, note, payee) — no raw injection', () => {
    const tx = makeTx({ title: '<script>alert(1)</script>', note: '<img src=x onerror=alert(2)>' });
    const html = buildInvoiceHtml(tx, branch, null);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toContain('<img src=x onerror=alert(2)>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('shows the linked contact name instead of payee when a contact is set', () => {
    const tx = makeTx({ payee: 'نام آزاد', contactId: 'c1' });
    const contact: Pick<Contact, 'name'> = { name: 'شرکت پخش الف' };
    const html = buildInvoiceHtml(tx, branch, contact);
    expect(html).toContain('شرکت پخش الف');
  });

  it('falls back to payee when no contact is linked', () => {
    const tx = makeTx({ payee: 'نام آزاد', contactId: null });
    const html = buildInvoiceHtml(tx, branch, null);
    expect(html).toContain('نام آزاد');
  });

  it('splits amount into net + VAT when vatAmount is set, and shows the VAT line', () => {
    const tx = makeTx({ amount: 110_000, vatAmount: 10_000 });
    const html = buildInvoiceHtml(tx, branch, null);
    expect(html).toContain(fa(100_000)); // net
    expect(html).toContain(fa(10_000));  // vat
    expect(html).toContain('مالیات ارزش‌افزوده');
  });

  it('hides the VAT line entirely when vatAmount is zero/undefined', () => {
    const tx = makeTx({ amount: 50_000, vatAmount: 0 });
    const html = buildInvoiceHtml(tx, branch, null);
    expect(html).not.toContain('مالیات ارزش‌افزوده');
  });

  it('shows پیش‌فاکتور title and badge for proforma status', () => {
    const tx = makeTx({ status: 'proforma' } as Partial<Transaction>);
    const html = buildInvoiceHtml(tx, branch, null);
    expect(html).toContain('پیش‌فاکتور');
  });

  it('shows a dash for missing invoice code instead of blank/undefined', () => {
    const tx = makeTx({ invoiceCode: null });
    const html = buildInvoiceHtml(tx, branch, null);
    expect(html).toContain('شماره فاکتور:</b> —');
  });

  it('renders without a branch (undefined) without throwing', () => {
    const tx = makeTx();
    expect(() => buildInvoiceHtml(tx, undefined, null)).not.toThrow();
  });
});
