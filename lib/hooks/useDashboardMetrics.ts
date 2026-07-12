'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/store';
import type { Transaction } from '@/types';

/**
 * useDashboardMetrics — محاسبات داشبورد در یک جا.
 *
 * این hook:
 * - `visibleTransactions` را از store می‌گیرد (با RBAC scope اعمال‌شده)
 * - یک filter اضافه روی branch می‌زند (اگر SuperAdmin شعبه‌ای انتخاب کرده)
 * - همه‌ی aggregates را محاسبه می‌کند
 *
 * نکته‌ی محاسبه‌ی balance: فقط `status === 'approved'` در محاسبات وارد می‌شود.
 * pending و rejected در `pendingAmount` به‌صورت جداگانه شمارش می‌شوند.
 *
 * ⚠ INVARIANT: موجودی حساب‌ها (accounts.balance) هرگز توسط این فیلتر تغییر نمی‌کند.
 *   فقط KPIهای جریان (income/expense/balance) و نمودارها تحت تأثیر قرار می‌گیرند.
 */

export interface BreakdownItem {
  name: string;
  /** category.id */
  id: string;
  amount: number;
  /** درصد از کل (۰ تا ۱۰۰) */
  percent: number;
}

export interface DashboardMetrics {
  /** تراکنش‌های قابل مشاهده پس از branch filter */
  filtered: Transaction[];
  /** approved (وارد محاسبات می‌شود) */
  approved: Transaction[];
  /** pending (در یک KPI جدا) */
  pending: Transaction[];
  /** rejected (فقط در history، نه در محاسبات) */
  rejected: Transaction[];

  // ─── aggregates برای KPI cards ───
  /** مجموع درآمد approved */
  income: number;
  /** مجموع هزینه approved */
  expense: number;
  /** درآمد - هزینه (فقط approved) */
  balance: number;
  /** مجموع تراکنش‌های pending (بدون توجه به type) */
  pendingAmount: number;
  /** تعداد pending */
  pendingCount: number;

  // ─── breakdown هزینه بر اساس دسته ───
  /** ۵ دسته‌ی بزرگ هزینه + «سایر» */
  expenseBreakdown: BreakdownItem[];

  /** هزینه‌های حذف‌شده از نمای عملیاتی (is_setup=true) — ۰ در نمای کامل */
  setupExcludedExpense: number;
}

/**
 * Hook اصلی — محاسبه با memoization.
 *
 * چرا `useMemo` با dependency روی filteredTransactions؟ چون این محاسبات
 * در هر render تکرار می‌شوند و در صفحه‌ای با ۱۰۰۰+ تراکنش، تفاوت قابل توجهی
 * در performance دارد.
 */
export function useDashboardMetrics(
  viewMode: 'operational' | 'full' = 'operational'
): DashboardMetrics {
  const user = useAppStore((s) => s.user);
  const transactions = useAppStore((s) => s.transactions);
  const branchFilter = useAppStore((s) => s.branchFilter);
  const categories = useAppStore((s) => s.categories);

  return useMemo(() => {
    const empty: DashboardMetrics = {
      filtered: [],
      approved: [],
      pending: [],
      rejected: [],
      income: 0,
      expense: 0,
      balance: 0,
      pendingAmount: 0,
      pendingCount: 0,
      expenseBreakdown: [],
      setupExcludedExpense: 0,
    };
    if (!user) return empty;

    // شناسه‌های دسته‌های راه‌اندازی — فقط در نمای عملیاتی مهم است
    const setupCategoryIds =
      viewMode === 'operational'
        ? new Set(
            [...categories.income, ...categories.expense]
              .filter((c) => c.isSetup)
              .map((c) => c.id)
          )
        : new Set<string>();

    // مرحله ۱: scope RBAC
    const scoped =
      user.role === 'SuperAdmin'
        ? transactions
        : transactions.filter((t) => t.branchId === user.assignedBranch);

    // مرحله ۲: branch filter اضافی (فقط برای SuperAdmin معنی دارد)
    const filtered =
      branchFilter && user.role === 'SuperAdmin'
        ? scoped.filter((t) => t.branchId === branchFilter)
        : scoped;

    // مرحله ۳: تفکیک بر اساس status
    const approved: Transaction[] = [];
    const pending: Transaction[] = [];
    const rejected: Transaction[] = [];
    for (const t of filtered) {
      if (t.status === 'approved') approved.push(t);
      else if (t.status === 'pending') pending.push(t);
      else rejected.push(t);
    }

    // مرحله ۴: aggregates
    let income = 0;
    let expense = 0;
    let setupExcludedExpense = 0;
    for (const t of approved) {
      const isSetupTx = setupCategoryIds.size > 0 && setupCategoryIds.has(t.category);
      if (isSetupTx) {
        // در نمای عملیاتی این هزینه حذف می‌شود — فقط ثبت می‌کنیم
        if (t.type === 'expense') setupExcludedExpense += t.amount;
        continue;
      }
      if (t.type === 'income') income += t.amount;
      else if (t.type === 'expense') expense += t.amount;
    }
    const balance = income - expense;

    let pendingAmount = 0;
    for (const t of pending) pendingAmount += t.amount;

    // مرحله ۵: breakdown هزینه بر اساس دسته
    const expenseByCategory = new Map<string, { name: string; amount: number }>();
    for (const t of approved) {
      if (t.type !== 'expense') continue;
      if (setupCategoryIds.size > 0 && setupCategoryIds.has(t.category)) continue;
      const existing = expenseByCategory.get(t.category);
      if (existing) {
        existing.amount += t.amount;
      } else {
        expenseByCategory.set(t.category, {
          name: t.categoryName,
          amount: t.amount,
        });
      }
    }

    const sortedExpense = Array.from(expenseByCategory.entries())
      .map(([id, v]) => ({ id, name: v.name, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount);

    let expenseBreakdown: BreakdownItem[];
    if (sortedExpense.length <= 5) {
      expenseBreakdown = sortedExpense.map((item) => ({
        ...item,
        percent: expense > 0 ? (item.amount / expense) * 100 : 0,
      }));
    } else {
      const top5 = sortedExpense.slice(0, 5);
      const otherAmount = sortedExpense
        .slice(5)
        .reduce((sum, item) => sum + item.amount, 0);
      expenseBreakdown = [
        ...top5.map((item) => ({
          ...item,
          percent: expense > 0 ? (item.amount / expense) * 100 : 0,
        })),
        {
          id: '__other__',
          name: 'سایر',
          amount: otherAmount,
          percent: expense > 0 ? (otherAmount / expense) * 100 : 0,
        },
      ];
    }

    return {
      filtered,
      approved,
      pending,
      rejected,
      income,
      expense,
      balance,
      pendingAmount,
      pendingCount: pending.length,
      expenseBreakdown,
      setupExcludedExpense,
    };
  }, [user, transactions, branchFilter, categories, viewMode]);
}
