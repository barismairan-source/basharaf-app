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
  loadApplications: () => Promise<void>;
  reviewApplication: (id: string, patch: RecruitmentReviewPatch) => Promise<boolean>;
  deleteApplication: (id: string) => Promise<boolean>;
}

export const createRecruitmentSlice: StateCreator<RecruitmentSlice> = (set, get) => ({
  applications: [],
  applicationsLoaded: false,
  applicationsError: null,

  async loadApplications() {
    try {
      const res = await fetch('/api/recruitment', { credentials: 'include' });
      if (!res.ok) {
        set({ applicationsLoaded: true });
        return;
      }
      const { applications } = (await res.json()) as { applications: JobApplication[] };
      set({ applications, applicationsLoaded: true });
    } catch {
      set({ applicationsLoaded: true });
    }
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
