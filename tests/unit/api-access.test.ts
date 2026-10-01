/**
 * گاردهای دسترسی سمت API (lib/auth/apiAccess.ts) — رفع یافته‌ی B1 گزارش
 * بررسی کامل ۲۰۲۶-۱۰: قبلاً فقط نقش BranchUser به شعبه محدود می‌شد و
 * Chef/Warehouse داده‌ی همه‌ی شعب را از API می‌گرفتند.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => {
  class ForbiddenError extends Error {
    constructor() { super('Forbidden'); this.name = 'ForbiddenError'; }
  }
  return { ForbiddenError, requireSession: vi.fn() };
});

import {
  assertSection, assertAnySection, assertCan, branchScope, canUseBranch, assertBranch,
} from '@/lib/auth/apiAccess';

type Role = 'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef';
const s = (role: Role, branchId: string | null = 'b1', permissions: string[] | null = null) =>
  ({ role, branchId, permissions });

describe('branchScope — هر نقش غیر SuperAdmin به شعبه‌ی خودش محدود است', () => {
  it('SuperAdmin بدون محدودیت', () => {
    expect(branchScope(s('SuperAdmin', null))).toBeNull();
  });
  it.each(['BranchUser', 'Warehouse', 'Chef'] as const)('%s → شعبه‌ی خودش', (role) => {
    expect(branchScope(s(role, 'b1'))).toBe('b1');
  });
  it('کاربر غیر SuperAdmin بدون شعبه → رد (نه «همه‌ی شعب»)', () => {
    expect(() => branchScope(s('BranchUser', null))).toThrow('Forbidden');
  });
});

describe('canUseBranch / assertBranch', () => {
  it('SuperAdmin هر شعبه‌ای', () => {
    expect(canUseBranch(s('SuperAdmin', null), 'b2')).toBe(true);
  });
  it('شعبه‌ی خودش مجاز، شعبه‌ی دیگر و null ممنوع', () => {
    expect(canUseBranch(s('Chef', 'b1'), 'b1')).toBe(true);
    expect(canUseBranch(s('Chef', 'b1'), 'b2')).toBe(false);
    expect(canUseBranch(s('Chef', 'b1'), null)).toBe(false);
    expect(() => assertBranch(s('Warehouse', 'b1'), 'b2')).toThrow('Forbidden');
  });
});

describe('assertSection — پیش‌فرض نقش و دسترسی صریح', () => {
  it('آشپز به‌طور پیش‌فرض به تراکنش‌ها دسترسی ندارد', () => {
    expect(() => assertSection(s('Chef'), 'transactions')).toThrow('Forbidden');
  });
  it('مدیر شعبه به‌طور پیش‌فرض دارد', () => {
    expect(() => assertSection(s('BranchUser'), 'transactions')).not.toThrow();
  });
  it('دسترسی صریح بر پیش‌فرض نقش غلبه می‌کند', () => {
    expect(() => assertSection(s('Chef', 'b1', ['transactions']), 'transactions')).not.toThrow();
    expect(() => assertSection(s('BranchUser', 'b1', ['reservations']), 'transactions')).toThrow('Forbidden');
  });
  it('assertAnySection: کافی است یکی از بخش‌ها مجاز باشد', () => {
    expect(() => assertAnySection(s('BranchUser', 'b1', ['reports']), ['reports', 'transactions'])).not.toThrow();
    expect(() => assertAnySection(s('Chef'), ['reports', 'transactions'])).toThrow('Forbidden');
  });
});

describe('assertCan — قابلیت‌های منابع انسانی واقعاً اعمال می‌شوند', () => {
  it('اطلاعات حقوق پیش‌فرض فقط برای SuperAdmin', () => {
    expect(() => assertCan(s('BranchUser'), 'hr.compensation.view')).toThrow('Forbidden');
    expect(() => assertCan(s('SuperAdmin', null), 'hr.compensation.view')).not.toThrow();
  });
  it('گرفتن قابلیت از مدیر شعبه، دسترسی را واقعاً قطع می‌کند', () => {
    expect(() => assertCan(s('BranchUser'), 'hr.schedule.manage')).not.toThrow();
    expect(() => assertCan(s('BranchUser', 'b1', ['hr', 'cap:hr.schedule.view']), 'hr.schedule.manage')).toThrow('Forbidden');
  });
});
