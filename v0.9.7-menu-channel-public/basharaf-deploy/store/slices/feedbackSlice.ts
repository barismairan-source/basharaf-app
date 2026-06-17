import type { StateCreator } from 'zustand';
import type { FeedbackSummaryRow } from '@/types';

/**
 * FeedbackSlice — ثبت بازخورد و میانگین رضایت هر شعبه برای گزارش.
 * فهرست کامل بازخورد یک مشتری از طریق GET /api/customers/[id] می‌آید (تب پروفایل)،
 * این slice فقط ثبت و خلاصه‌ی گزارشی را مدیریت می‌کند.
 */
export interface FeedbackSlice {
  feedbackSummary: FeedbackSummaryRow[];
  feedbackSummaryLoaded: boolean;
  loadFeedbackSummary: () => Promise<void>;
  addFeedback: (params: {
    customerId?: string | null;
    branchId?: string | null;
    rating: number;
    comment?: string | null;
    source?: string;
    refTransactionId?: string | null;
  }) => Promise<boolean>;
}

export const createFeedbackSlice: StateCreator<FeedbackSlice> = (set) => ({
  feedbackSummary: [],
  feedbackSummaryLoaded: false,

  async loadFeedbackSummary() {
    try {
      const res = await fetch('/api/feedback/summary', { credentials: 'include' });
      if (!res.ok) return;
      const { summary } = (await res.json()) as { summary: FeedbackSummaryRow[] };
      set({ feedbackSummary: summary, feedbackSummaryLoaded: true });
    } catch {
      set({ feedbackSummaryLoaded: true });
    }
  },

  async addFeedback(params) {
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      return false;
    }
  },
});
