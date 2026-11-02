import { describe, expect, it } from 'vitest';
import { buildSql, nameFromDescription, normName, parseBatchText, parseTable, rialToToman } from '../../scripts/staff-payments-sql';
import { sortPayments, summarizePayments } from '@/lib/staff-panel/payments';

describe('staff payments import', () => {
  it('normalizes names from bank files', () => {
    expect(normName('ستایش پاك نیت')).toBe('ستایش پاک نیت');
    expect(normName('عاطفه‌ ‌عظیمی‌')).toBe('عاطفه عظیمی');
    expect(normName('کریم ناطقیان (صدرا)')).toBe('کریم ناطقیان');
    expect(nameFromDescription('اضافه‌کاری شهریور - امیرمحمد خرسندیان')).toBe('امیرمحمد خرسندیان');
    expect(nameFromDescription('کیمیا وحدی')).toBe('کیمیا وحدی');
  });

  it('converts rial amounts to toman', () => {
    expect(rialToToman('300,000,000 ریال')).toBe(30_000_000);
    expect(rialToToman(43333333)).toBe(4_333_333);
    expect(rialToToman('۱۰۰')).toBe(10);
    expect(rialToToman('')).toBeNull();
  });

  it('reads a bank receipt table and skips the IBAN column', () => {
    const rows = [
      ['رسید ثبت انتقال وجه گروهی'], [''],
      ['ردیف', 'شماره شبا', 'مبلغ (ریال)', 'شرح مقصد', 'شناسه', 'بانک', 'نام صاحب شبا'],
      ['1', 'IR000000000000000000000001', '300,000,000 ریال', 'حقوق مهر - روشا کریمی', '', 'سامان', 'روشا کریمی'],
      ['', '', '', '', '', '', ''],
    ];
    expect(parseTable(rows)).toEqual([{ name: 'روشا کریمی', amount: 30_000_000, row: 4 }]);
  });

  it('reads the text batch file', () => {
    const rows = parseBatchText('300000000,IR000000000000000000000001,,حقوق مهر - کیمیا وحدی\n\n');
    expect(rows).toEqual([{ name: 'کیمیا وحدی', amount: 30_000_000, row: 1 }]);
  });

  it('builds idempotent SQL without any IBAN', () => {
    const sql = buildSql([{ entry: { file: 'a.xlsx', period: '1405-07', kind: 'salary', paidOn: '1405/08/02', title: 'حقوق مهر', hasReceipt: true }, rows: [{ name: 'فاطمه کلبادی‌نژاد', amount: 29_000_000, row: 5 }] }]);
    expect(sql).toContain("ILIKE '%فاطمه%' AND full_name ILIKE '%کلبادی%'");
    expect(sql).toContain("'a.xlsx#5'");
    expect(sql).toContain('ON CONFLICT (source_key)');
    expect(sql).not.toMatch(/IR\d{10,}/);
  });
});

describe('staff payments view helpers', () => {
  const items = [
    { id: '1', period: '1405-06', kind: 'salary' as const, amount: 30, paidOn: '1405/07/04', title: '', hasReceipt: true },
    { id: '2', period: '1405-07', kind: 'salary' as const, amount: 20, paidOn: null, title: '', hasReceipt: false },
    { id: '3', period: '1405-06', kind: 'overtime' as const, amount: 5, paidOn: '1405/07/06', title: '', hasReceipt: true },
  ];
  it('sorts newest first by payment date, then month', () => {
    expect(sortPayments(items).map((p) => p.id)).toEqual(['3', '1', '2']);
  });
  it('totals overall and per month', () => {
    expect(summarizePayments(items)).toEqual({ total: 55, byPeriod: { '1405-06': 35, '1405-07': 20 } });
  });
});
