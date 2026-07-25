import type { Transaction, TransactionStatus, TransactionType } from '@/types';
import { jalaliToDate, isValidJalaliString } from '@/lib/jalali';

/**
 * منطق خالص فیلتر/مرتب‌سازی/صفحه‌بندی لیست تراکنش‌ها — جدا از صفحه تا
 * بدون رندر React قابل تست باشد. صفحه فقط این توابع را روی
 * `useVisibleTransactions()` (که خودش RBAC را اعمال کرده) صدا می‌زند؛
 * این ماژول به‌هیچ‌وجه به scope/دسترسی کاربر دست نمی‌زند.
 */

export type StatusFilter = 'all' | TransactionStatus;
export type TypeFilterKey = 'all' | TransactionType;
export type TransactionSortKey = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export interface TransactionFilterState {
  search: string;
  type: TypeFilterKey;
  status: StatusFilter;
  /** 'all' یعنی بدون فیلتر شعبه — برای BranchUser بی‌معنی است (همیشه scope خودش) */
  branchId: string;
  /** تاریخ شمسی 'YYYY/MM/DD' یا خالی */
  dateFrom: string;
  dateTo: string;
  sort: TransactionSortKey;
  page: number;
}

export const DEFAULT_FILTERS: TransactionFilterState = {
  search: '',
  type: 'all',
  status: 'all',
  branchId: 'all',
  dateFrom: '',
  dateTo: '',
  sort: 'date-desc',
  page: 1,
};

const VALID_TYPES: TypeFilterKey[] = ['all', 'income', 'expense', 'transfer'];
const VALID_STATUSES: StatusFilter[] = ['all', 'pending', 'approved', 'rejected', 'proforma'];
const VALID_SORTS: TransactionSortKey[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];

/** فیلترهایی که روی «چند مورد فعال است» شمرده می‌شوند — sort/page جزو «فیلتر» نیستند. */
type CountableKey = 'search' | 'type' | 'status' | 'branchId' | 'dateFrom' | 'dateTo';
const COUNTABLE_KEYS: CountableKey[] = ['search', 'type', 'status', 'branchId', 'dateFrom', 'dateTo'];

export function countActiveFilters(filters: TransactionFilterState): number {
  return COUNTABLE_KEYS.filter((k) => filters[k] !== DEFAULT_FILTERS[k] && filters[k] !== '').length;
}

/**
 * فیلترها را به query params (فقط مقادیر غیرپیش‌فرض) تبدیل می‌کند — برای
 * URLSearchParams / router.replace. کلید‌های پیش‌فرض اصلاً در URL ظاهر
 * نمی‌شوند تا لینک تمیز بماند.
 */
export function filtersToParams(filters: TransactionFilterState): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.search) out.q = filters.search;
  if (filters.type !== 'all') out.type = filters.type;
  if (filters.status !== 'all') out.status = filters.status;
  if (filters.branchId !== 'all') out.branch = filters.branchId;
  if (filters.dateFrom) out.from = filters.dateFrom;
  if (filters.dateTo) out.to = filters.dateTo;
  if (filters.sort !== DEFAULT_FILTERS.sort) out.sort = filters.sort;
  if (filters.page !== 1) out.page = String(filters.page);
  return out;
}

/** خواندن state فیلتر از URLSearchParams — مقادیر نامعتبر بی‌صدا به پیش‌فرض برمی‌گردند. */
export function paramsToFilters(params: URLSearchParams): TransactionFilterState {
  const type = params.get('type') as TypeFilterKey | null;
  const status = params.get('status') as StatusFilter | null;
  const sort = params.get('sort') as TransactionSortKey | null;
  const pageRaw = Number(params.get('page'));

  return {
    search: params.get('q') ?? '',
    type: type && VALID_TYPES.includes(type) ? type : 'all',
    status: status && VALID_STATUSES.includes(status) ? status : 'all',
    branchId: params.get('branch') ?? 'all',
    dateFrom: params.get('from') ?? '',
    dateTo: params.get('to') ?? '',
    sort: sort && VALID_SORTS.includes(sort) ? sort : 'date-desc',
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

/** تاریخ شمسی تراکنش را به Date واقعی تبدیل می‌کند — null اگر نامعتبر (نه throw). */
function txDateToDate(jalali: string): Date | null {
  return jalaliToDate(jalali);
}

/**
 * فیلتر + جستجو + بازه‌ی تاریخ روی لیست تراکنش‌ها. `sort` را جدا صدا بزنید
 * (`sortTransactions`) — این دو تابع عمداً جدا هستند چون خلاصه‌های مالی
 * باید روی نتیجه‌ی فیلترشده (نه لزوماً مرتب‌شده) محاسبه شوند.
 */
export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilterState
): Transaction[] {
  let result = [...transactions];

  if (filters.type !== 'all') result = result.filter((t) => t.type === filters.type);
  if (filters.status !== 'all') result = result.filter((t) => t.status === filters.status);
  if (filters.branchId !== 'all') result = result.filter((t) => t.branchId === filters.branchId);

  const q = filters.search.trim().toLowerCase();
  if (q) {
    result = result.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.payee.toLowerCase().includes(q) ||
      t.categoryName.toLowerCase().includes(q) ||
      String(t.amount).includes(q)
    );
  }

  if (filters.dateFrom && isValidJalaliString(filters.dateFrom)) {
    const from = txDateToDate(filters.dateFrom);
    if (from) {
      result = result.filter((t) => {
        const d = txDateToDate(t.date);
        return d ? d.getTime() >= from.getTime() : true;
      });
    }
  }
  if (filters.dateTo && isValidJalaliString(filters.dateTo)) {
    const to = txDateToDate(filters.dateTo);
    if (to) {
      // پایان روز — یعنی خود روزِ «تا تاریخ» هم شامل باشد
      const toEnd = new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1);
      result = result.filter((t) => {
        const d = txDateToDate(t.date);
        return d ? d.getTime() <= toEnd.getTime() : true;
      });
    }
  }

  return result;
}

export function sortTransactions(transactions: readonly Transaction[], sort: TransactionSortKey): Transaction[] {
  const result = [...transactions];
  switch (sort) {
    case 'date-desc':   result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    case 'date-asc':    result.sort((a, b) => a.createdAt.localeCompare(b.createdAt)); break;
    case 'amount-desc': result.sort((a, b) => b.amount - a.amount); break;
    case 'amount-asc':  result.sort((a, b) => a.amount - b.amount); break;
  }
  return result;
}

export interface TransactionSummary {
  approvedIncome: number;
  approvedExpense: number;
  /** approvedIncome - approvedExpense — یک FLOW روی نتیجه‌ی فیلترشده، نه موجودی حساب */
  periodNetFlow: number;
  pendingCount: number;
}

/** خلاصه‌ی مالی روی نتیجه‌ی فیلترشده (نه لزوماً همه‌ی تراکنش‌های قابل‌مشاهده). */
export function summarizeTransactions(transactions: readonly Transaction[]): TransactionSummary {
  let approvedIncome = 0;
  let approvedExpense = 0;
  let pendingCount = 0;
  for (const t of transactions) {
    if (t.status === 'approved') {
      if (t.type === 'income') approvedIncome += t.amount;
      else if (t.type === 'expense') approvedExpense += t.amount;
    } else if (t.status === 'pending') {
      pendingCount += 1;
    }
  }
  return {
    approvedIncome,
    approvedExpense,
    periodNetFlow: approvedIncome - approvedExpense,
    pendingCount,
  };
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** صفحه‌بندی ساده‌ی client-side — page خارج از بازه به نزدیک‌ترین صفحه‌ی معتبر می‌چسبد. */
export function paginateItems<T>(items: readonly T[], page: number, pageSize: number): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
  };
}
