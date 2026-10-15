import type { StateCreator } from 'zustand';
import type {
  JobApplication,
  ApplicationStatus,
  ApplicationArea,
} from '@/lib/recruitment/questions';

/**
 * RecruitmentSlice — درخواست‌های استخدام برای پنل (فقط SuperAdmin).
 * load + review (optimistic) + remove. الگو: contactsSlice.
 */
export interface RecruitmentReviewPatch {
  status?: ApplicationStatus;
  score?: number | null;
  area?: ApplicationArea | null;
  reviewerNote?: string | null;
}

export type RecruitmentStatusCounts = Record<'all' | ApplicationStatus, number>;

const EMPTY_COUNTS: RecruitmentStatusCounts = { all: 0, new: 0, shortlist: 0, accepted: 0, rejected: 0 };

export interface RecruitmentSlice {
  /** درخواست‌های بارگذاری‌شده‌ی فهرست فعلی (صفحه‌های ۱..n با فیلترهای فعلی) */
  applications: JobApplication[];
  applicationsLoaded: boolean;
  /** در حال دریافت نتیجه‌ی فیلتر جدید (فهرست قبلی هنوز نمایش داده می‌شود) */
  applicationsRefreshing: boolean;
  applicationsError: string | null;
  /** کل درخواست‌های دیتابیس، بدون فیلتر */
  applicationsTotal: number;
  /** تعداد نتایج با فیلترهای فعلی — روی کل دیتابیس */
  applicationsFiltered: number;
  /** شمارش هر وضعیت با بقیه‌ی فیلترها — روی کل دیتابیس */
  applicationsStatusCounts: RecruitmentStatusCounts;
  applicationsPage: number;
  /** querystring فیلترهای فهرست فعلی (همان پارامترهای URL صفحه) */
  applicationsQuery: string;
  loadApplications: (query?: string) => Promise<void>;
  loadMoreApplications: () => Promise<void>;
  reviewApplication: (id: string, patch: RecruitmentReviewPatch) => Promise<boolean>;
  deleteApplication: (id: string) => Promise<boolean>;
}

const PAGE_LIMIT = 50;

interface ListResponse {
  applications: JobApplication[];
  total: number;
  filteredTotal: number;
  statusCounts: RecruitmentStatusCounts;
}

/** شماره‌ی آخرین درخواست — پاسخ‌های قدیمی‌تر (تایپ سریع در جستجو) نادیده گرفته می‌شوند. */
let requestSeq = 0;

function listUrl(query: string, page: number) {
  const params = new URLSearchParams(query);
  params.set('page', String(page));
  params.set('limit', String(PAGE_LIMIT));
  return `/api/recruitment?${params.toString()}`;
}

export const createRecruitmentSlice: StateCreator<RecruitmentSlice> = (set, get) => ({
  applications: [],
  applicationsLoaded: false,
  applicationsRefreshing: false,
  applicationsError: null,
  applicationsTotal: 0,
  applicationsFiltered: 0,
  applicationsStatusCounts: EMPTY_COUNTS,
  applicationsPage: 1,
  applicationsQuery: '',

  async loadApplications(query) {
    const q = query ?? get().applicationsQuery;
    const seq = ++requestSeq;
    set({ applicationsError: null, applicationsRefreshing: true, applicationsQuery: q });
    try {
      const res = await fetch(listUrl(q, 1), { credentials: 'include', cache: 'no-store' });
      if (seq !== requestSeq) return;
      if (!res.ok) {
        set({ applicationsLoaded: true, applicationsRefreshing: false, applicationsError: 'خطا در دریافت لیست داوطلبان' });
        return;
      }
      const data = (await res.json()) as ListResponse;
      if (seq !== requestSeq) return;
      set({
        applications: data.applications,
        applicationsTotal: data.total,
        applicationsFiltered: data.filteredTotal ?? data.total,
        applicationsStatusCounts: data.statusCounts ?? EMPTY_COUNTS,
        applicationsPage: 1,
        applicationsLoaded: true,
        applicationsRefreshing: false,
      });
    } catch {
      if (seq !== requestSeq) return;
      set({ applicationsLoaded: true, applicationsRefreshing: false, applicationsError: 'خطا در دریافت لیست داوطلبان' });
    }
  },

  async loadMoreApplications() {
    const { applicationsPage, applicationsFiltered, applications, applicationsQuery } = get();
    if (applications.length >= applicationsFiltered) return;
    const nextPage = applicationsPage + 1;
    const seq = requestSeq;
    try {
      const res = await fetch(listUrl(applicationsQuery, nextPage), { credentials: 'include', cache: 'no-store' });
      if (!res.ok || seq !== requestSeq) return;
      const data = (await res.json()) as ListResponse;
      if (seq !== requestSeq) return;
      set((s) => {
        const seen = new Set(s.applications.map((a) => a.id));
        return {
          applications: [...s.applications, ...data.applications.filter((a) => !seen.has(a.id))],
          applicationsPage: nextPage,
          applicationsTotal: data.total,
          applicationsFiltered: data.filteredTotal ?? data.total,
          applicationsStatusCounts: data.statusCounts ?? s.applicationsStatusCounts,
        };
      });
    } catch { /* silent */ }
  },

  async reviewApplication(id, patch) {
    const snapshot = get().applications.find((a) => a.id === id);
    if (!snapshot) return false;
    const prevCounts = get().applicationsStatusCounts;
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      applicationsStatusCounts: patch.status && patch.status !== snapshot.status
        ? { ...s.applicationsStatusCounts, [snapshot.status]: Math.max(0, s.applicationsStatusCounts[snapshot.status] - 1), [patch.status]: s.applicationsStatusCounts[patch.status] + 1 }
        : s.applicationsStatusCounts,
    }));
    try {
      const res = await fetch(`/api/recruitment/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({
        applications: s.applications.map((a) => (a.id === id ? snapshot : a)),
        applicationsStatusCounts: prevCounts,
      }));
      return false;
    }
  },

  async deleteApplication(id) {
    const snapshot = get().applications.find((a) => a.id === id);
    if (!snapshot) return false;
    const prev = get();
    const prevCounts = prev.applicationsStatusCounts;
    const prevTotals = { applicationsTotal: prev.applicationsTotal, applicationsFiltered: prev.applicationsFiltered };
    set((s) => ({
      applications: s.applications.filter((a) => a.id !== id),
      applicationsStatusCounts: {
        ...s.applicationsStatusCounts,
        all: Math.max(0, s.applicationsStatusCounts.all - 1),
        [snapshot.status]: Math.max(0, s.applicationsStatusCounts[snapshot.status] - 1),
      },
      applicationsTotal: Math.max(0, s.applicationsTotal - 1),
      applicationsFiltered: Math.max(0, s.applicationsFiltered - 1),
    }));
    try {
      const res = await fetch(`/api/recruitment/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ applications: [snapshot, ...s.applications], applicationsStatusCounts: prevCounts, ...prevTotals }));
      return false;
    }
  },
});
