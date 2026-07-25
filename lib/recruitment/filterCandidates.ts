import type { User } from '@/types';
import { isAdmin } from '@/lib/rbac';
import type { JobApplication, ApplicationStatus, ApplicationArea } from './questions';

/**
 * منطق خالص فیلتر/مرتب‌سازی/URL/شمارش داوطلبان — جدا از صفحه تا بدون
 * رندر React قابل تست باشد. صفحه فقط این توابع را روی `applications`
 * (که خودش از استور SuperAdmin-only می‌آید) صدا می‌زند.
 */

export type StatusFilter = 'all' | ApplicationStatus;
export type AreaFilter = 'all' | ApplicationArea;
export type SortKey = 'date' | 'score';

export interface CandidateFilterState {
  status: StatusFilter;
  area: AreaFilter;
  start: string; // 'all' یا مقدار StartAvailability
  search: string;
  sort: SortKey;
  /** فیلترهای فیلد داینامیک فرم‌ساز — کلید = field.key */
  dynamicFilters: Record<string, string>;
}

export const DEFAULT_FILTERS: CandidateFilterState = {
  status: 'all',
  area: 'all',
  start: 'all',
  search: '',
  sort: 'date',
  dynamicFilters: {},
};

const VALID_STATUSES: StatusFilter[] = ['all', 'new', 'shortlist', 'accepted', 'rejected'];
const VALID_AREAS: AreaFilter[] = ['all', 'hall', 'kitchen'];
const VALID_SORTS: SortKey[] = ['date', 'score'];
const DYNAMIC_PARAM_PREFIX = 'f_';

/** فیلترهایی که در شمارش «چند فیلتر فعال است» حساب می‌شوند — sort جزو فیلتر نیست. */
export function countActiveFilters(filters: CandidateFilterState): number {
  let n = 0;
  if (filters.status !== 'all') n += 1;
  if (filters.area !== 'all') n += 1;
  if (filters.start !== 'all') n += 1;
  if (filters.search.trim()) n += 1;
  for (const v of Object.values(filters.dynamicFilters)) {
    if (v && v !== 'all') n += 1;
  }
  return n;
}

/** فیلترها را به query params (فقط مقادیر غیرپیش‌فرض) تبدیل می‌کند. */
export function filtersToParams(filters: CandidateFilterState): Record<string, string> {
  const out: Record<string, string> = {};
  if (filters.status !== 'all') out.status = filters.status;
  if (filters.area !== 'all') out.area = filters.area;
  if (filters.start !== 'all') out.start = filters.start;
  if (filters.search.trim()) out.q = filters.search;
  if (filters.sort !== DEFAULT_FILTERS.sort) out.sort = filters.sort;
  for (const [key, val] of Object.entries(filters.dynamicFilters)) {
    if (val && val !== 'all') out[`${DYNAMIC_PARAM_PREFIX}${key}`] = val;
  }
  return out;
}

/** خواندن state فیلتر از URLSearchParams — مقادیر نامعتبر بی‌صدا به پیش‌فرض برمی‌گردند. */
export function paramsToFilters(params: URLSearchParams): CandidateFilterState {
  const status = params.get('status') as StatusFilter | null;
  const area = params.get('area') as AreaFilter | null;
  const sort = params.get('sort') as SortKey | null;
  const dynamicFilters: Record<string, string> = {};
  for (const [key, val] of params.entries()) {
    if (key.startsWith(DYNAMIC_PARAM_PREFIX) && val) {
      dynamicFilters[key.slice(DYNAMIC_PARAM_PREFIX.length)] = val;
    }
  }
  return {
    status: status && VALID_STATUSES.includes(status) ? status : 'all',
    area: area && VALID_AREAS.includes(area) ? area : 'all',
    start: params.get('start') ?? 'all',
    search: params.get('q') ?? '',
    sort: sort && VALID_SORTS.includes(sort) ? sort : 'date',
    dynamicFilters,
  };
}

/**
 * فیلتر داوطلبان — همه‌ی معیارها به‌جز status (برای شمارش تب‌ها جدا لازم
 * است بتوان status را نادیده گرفت؛ `filterCandidates` کامل شامل status هم می‌شود).
 */
function applyNonStatusFilters(
  applications: readonly JobApplication[],
  filters: Pick<CandidateFilterState, 'area' | 'start' | 'search' | 'dynamicFilters'>
): JobApplication[] {
  let result = [...applications];

  if (filters.area !== 'all') result = result.filter((a) => a.area === filters.area);
  if (filters.start !== 'all') result = result.filter((a) => a.startAvailability === filters.start);

  const q = filters.search.trim().toLowerCase();
  if (q) {
    result = result.filter((a) =>
      `${a.firstName} ${a.lastName} ${a.phone}`.toLowerCase().includes(q)
    );
  }

  for (const [fieldKey, filterVal] of Object.entries(filters.dynamicFilters)) {
    if (!filterVal || filterVal === 'all') continue;
    result = result.filter((a) => {
      const cf = (a.customFields as Record<string, unknown> | undefined) ?? {};
      const val = cf[fieldKey];
      if (Array.isArray(val)) return val.includes(filterVal);
      return String(val ?? '') === filterVal;
    });
  }

  return result;
}

export function filterCandidates(
  applications: readonly JobApplication[],
  filters: CandidateFilterState
): JobApplication[] {
  const nonStatus = applyNonStatusFilters(applications, filters);
  if (filters.status === 'all') return nonStatus;
  return nonStatus.filter((a) => a.status === filters.status);
}

export function sortCandidates(applications: readonly JobApplication[], sort: SortKey): JobApplication[] {
  if (sort === 'score') {
    return [...applications].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
  return [...applications]; // پیش‌فرض: ترتیب سرور (تاریخ نزولی) حفظ می‌شود
}

/**
 * شمارش داوطلبان به‌ازای هر تب وضعیت — با اعمال همه‌ی فیلترهای دیگر
 * (بخش/زمان شروع/جستجو/فیلد داینامیک) به‌جز خود status، تا شمارش هر تب
 * نسبت به فیلترهای فعلی معنادار باشد، نه فقط یک عدد کل ثابت.
 */
export function statusCounts(
  applications: readonly JobApplication[],
  filters: Pick<CandidateFilterState, 'area' | 'start' | 'search' | 'dynamicFilters'>
): Record<StatusFilter, number> {
  const nonStatus = applyNonStatusFilters(applications, filters);
  const counts: Record<StatusFilter, number> = { all: nonStatus.length, new: 0, shortlist: 0, accepted: 0, rejected: 0 };
  for (const a of nonStatus) counts[a.status] += 1;
  return counts;
}

/**
 * آیا این کاربر مجاز به دیدن/تماس با شماره‌ی داوطلب است؟
 *
 * امروز کل صفحه‌ی استخدام فقط برای SuperAdmin است (بدون نقش میانی)، پس
 * این تابع همیشه معادل رسیدن-به-صفحه است — ولی به‌عنوان یک نقطه‌ی
 * صریح و مرکزی نگه داشته می‌شود تا اگر روزی نقشی با دسترسی محدودتر به
 * این صفحه اضافه شد (بدون دیدن PII)، فقط همین‌جا تغییر کند.
 */
export function canViewPhone(user: User | null): boolean {
  return isAdmin(user);
}
