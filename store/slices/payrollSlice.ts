import type { StateCreator } from 'zustand';

export interface PayrollRun {
  id: string;
  periodYearMonth: string;
  branchId: string | null;
  branchName: string | null;
  status: 'draft' | 'calculated' | 'approved' | 'posted';
  calculatedAt: string | null;
  approvedAt: string | null;
  postedToBasharafAt: string | null;
  journalVoucherId?: string | null;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  grossEarnings: number;
  insuranceEmployee: number;
  incomeTax: number;
  totalDeductions: number;
  netPay: number;
  workedDays: number;
  deductionLines?: Array<{ label: string; amount: number }>;
}

export interface PayrollSlice {
  payrollRuns: PayrollRun[];
  payrollRunsLoaded: boolean;
  loadPayrollRuns: () => Promise<void>;
  createPayrollRun: (p: { periodYearMonth: string; branchId?: string | null; branchName?: string | null }) => Promise<PayrollRun | null>;
  calculateRun: (id: string, workingDays: number, overrides?: Record<string, { insuranceEmployee?: number; incomeTax?: number }>) => Promise<boolean>;
  approveRun: (id: string) => Promise<boolean>;
  postRun: (id: string, accountId: string, date: string) => Promise<boolean>;
  reverseRun: (id: string) => Promise<boolean>;
  deleteRun: (id: string) => Promise<boolean>;
  getRunDetail: (id: string) => Promise<{ run: PayrollRun; payslips: Payslip[] } | null>;
  payrollEvents: PayrollEvent[];
  loadEvents: (period?: string) => Promise<void>;
  createEvent: (p: { employeeId: string; type: string; amount: number; periodYearMonth: string; description?: string | null }) => Promise<boolean>;
  voidEvent: (id: string) => Promise<boolean>;
}

export interface PayrollEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  type: string;
  typeLabel: string;
  amount: number;
  periodYearMonth: string;
  description: string | null;
  createdAt: string;
}

export const createPayrollSlice: StateCreator<PayrollSlice> = (set) => ({
  payrollRuns: [],
  payrollRunsLoaded: false,
  payrollEvents: [],

  async loadPayrollRuns() {
    try {
      const res = await fetch('/api/payroll/runs', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const { runs } = await res.json();
      set({ payrollRuns: runs, payrollRunsLoaded: true });
    } catch { set({ payrollRunsLoaded: true }); }
  },

  async createPayrollRun(p) {
    try {
      const res = await fetch('/api/payroll/runs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(p),
      });
      const data = await res.json();
      if (!res.ok || !data.run) throw new Error(data.error ?? 'خطا');
      set(s => ({ payrollRuns: [data.run, ...s.payrollRuns] }));
      return data.run;
    } catch { return null; }
  },

  async calculateRun(id, workingDays, overrides) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/calculate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ workingDays, overrides }),
      });
      if (!res.ok) return false;
      set(s => ({ payrollRuns: s.payrollRuns.map(r => r.id === id ? { ...r, status: 'calculated' } : r) }));
      return true;
    } catch { return false; }
  },

  async approveRun(id) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/approve`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ payrollRuns: s.payrollRuns.map(r => r.id === id ? { ...r, status: 'approved' } : r) }));
      return true;
    } catch { return false; }
  },

  async postRun(id, accountId, date) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/post`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify({ accountId, date }),
      });
      if (!res.ok) return false;
      set(s => ({ payrollRuns: s.payrollRuns.map(r => r.id === id ? { ...r, status: 'posted' } : r) }));
      return true;
    } catch { return false; }
  },

  async reverseRun(id) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}/reverse`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ payrollRuns: s.payrollRuns.map(r => r.id === id ? { ...r, status: 'approved' } : r) }));
      return true;
    } catch { return false; }
  },

  async deleteRun(id) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ payrollRuns: s.payrollRuns.filter(r => r.id !== id) }));
      return true;
    } catch { return false; }
  },

  async getRunDetail(id) {
    try {
      const res = await fetch(`/api/payroll/runs/${id}`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return null;
      return await res.json();
    } catch { return null; }
  },
async loadEvents(period) {
    try {
      const url = period ? `/api/payroll/events?period=${period}` : '/api/payroll/events';
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const { events } = await res.json();
      set({ payrollEvents: events });
    } catch { /* ignore */ }
  },

  async createEvent(p) {
    try {
      const res = await fetch('/api/payroll/events', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(p),
      });
      if (!res.ok) return false;
      return true;
    } catch { return false; }
  },

  async voidEvent(id) {
    const snap = (globalThis as any).__noop;
    void snap;
    try {
      const res = await fetch(`/api/payroll/events/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ payrollEvents: s.payrollEvents.filter(e => e.id !== id) }));
      return true;
    } catch { return false; }
  },
});
