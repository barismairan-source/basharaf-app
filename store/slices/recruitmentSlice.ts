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

export interface RecruitmentSlice {
  applications: JobApplication[];
  applicationsLoaded: boolean;
  applicationsError: string | null;
  applicationsTotal: number;
  applicationsPage: number;
  loadApplications: () => Promise<void>;
  loadMoreApplications: () => Promise<void>;
  reviewApplication: (id: string, patch: RecruitmentReviewPatch) => Promise<boolean>;
  deleteApplication: (id: string) => Promise<boolean>;
}

const PAGE_LIMIT = 50;

export const createRecruitmentSlice: StateCreator<RecruitmentSlice> = (set, get) => ({
  applications: [],
  applicationsLoaded: false,
  applicationsError: null,
  applicationsTotal: 0,
  applicationsPage: 1,

  async loadApplications() {
    try {
      const res = await fetch(`/api/recruitment?page=1&limit=${PAGE_LIMIT}`, { credentials: 'include' });
      if (!res.ok) {
        set({ applicationsLoaded: true });
        return;
      }
      const data = (await res.json()) as { applications: JobApplication[]; total: number };
      set({ applications: data.applications, applicationsTotal: data.total, applicationsPage: 1, applicationsLoaded: true });
    } catch {
      set({ applicationsLoaded: true });
    }
  },

  async loadMoreApplications() {
    const { applicationsPage, applicationsTotal, applications } = get();
    if (applications.length >= applicationsTotal) return;
    const nextPage = applicationsPage + 1;
    try {
      const res = await fetch(`/api/recruitment?page=${nextPage}&limit=${PAGE_LIMIT}`, { credentials: 'include' });
      if (!res.ok) return;
      const data = (await res.json()) as { applications: JobApplication[]; total: number };
      set((s) => ({
        applications: [...s.applications, ...data.applications],
        applicationsPage: nextPage,
        applicationsTotal: data.total,
      }));
    } catch { /* silent */ }
  },

  async reviewApplication(id, patch) {
    const snapshot = get().applications.find((a) => a.id === id);
    if (!snapshot) return false;
    set((s) => ({
      applications: s.applications.map((a) => (a.id === id ? { ...a, ...patch } : a)),
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
      }));
      return false;
    }
  },

  async deleteApplication(id) {
    const snapshot = get().applications.find((a) => a.id === id);
    if (!snapshot) return false;
    set((s) => ({ applications: s.applications.filter((a) => a.id !== id) }));
    try {
      const res = await fetch(`/api/recruitment/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set((s) => ({ applications: [snapshot, ...s.applications] }));
      return false;
    }
  },
});
