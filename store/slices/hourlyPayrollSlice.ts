import type { StateCreator } from 'zustand';

export interface ShiftTemplate {
  id: string;
  branchId: string | null;
  name: string;
  startTime: string;
  endTime: string;
  plannedMinutes: number;
  defaultBreakMinutes: number;
  breakPolicy: 'paid' | 'unpaid' | 'none';
  crossesMidnight: boolean;
  color: string | null;
  isActive: boolean;
}

export interface EmployeeHourlyRate {
  id: string;
  employeeId: string;
  hourlyRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string | null;
  createdAt: string;
}

export interface ShiftAssignment {
  id: string;
  employeeId: string;
  employeeName: string | null;
  branchId: string | null;
  workDate: string;
  shiftTemplateId: string | null;
  plannedStartTime: string;
  plannedEndTime: string;
  plannedMinutes: number;
  breakMinutes: number;
  breakPolicy: 'paid' | 'unpaid' | 'none';
  crossesMidnight: boolean;
  status: 'scheduled' | 'cancelled' | 'completed';
  note: string | null;
}

export interface AttendanceEntry {
  id: string;
  employeeId: string;
  employeeName: string | null;
  branchId: string | null;
  workDate: string;
  shiftAssignmentId: string | null;
  entryMode: 'time_range' | 'total_minutes';
  clockIn: string | null;
  clockOut: string | null;
  manualWorkedMinutes: number | null;
  breakMinutes: number;
  workedMinutes: number;
  regularMinutes: number;
  overtimeMinutes: number;
  overtimeApproved: boolean;
  nightMinutes: number;
  holidayMinutes: number;
  hourlyRateSnapshot: number;
  status: 'draft' | 'confirmed' | 'locked';
  attendanceType: 'present' | 'absent' | 'paid_leave' | 'unpaid_leave' | 'sick_leave' | 'holiday_work' | 'off_day_work';
  managerNote: string | null;
}

export interface HourlyPayrollSlice {
  shiftTemplates: ShiftTemplate[];
  shiftTemplatesLoaded: boolean;
  loadShiftTemplates: () => Promise<void>;
  createShiftTemplate: (p: Partial<ShiftTemplate> & { name: string; startTime: string; endTime: string }) => Promise<boolean>;
  updateShiftTemplate: (id: string, patch: Partial<ShiftTemplate>) => Promise<boolean>;
  deleteShiftTemplate: (id: string) => Promise<boolean>;

  hourlyRatesByEmployee: Record<string, EmployeeHourlyRate[]>;
  loadHourlyRates: (employeeId: string) => Promise<void>;
  createHourlyRate: (employeeId: string, p: { hourlyRate: number; effectiveFrom: string; reason?: string | null }) => Promise<boolean>;

  shiftAssignments: ShiftAssignment[];
  loadShiftAssignments: (p: { from: string; to: string; branchId?: string; employeeId?: string }) => Promise<void>;
  createShiftAssignments: (p: {
    employeeIds: string[]; workDates: string[]; branchId?: string | null; shiftTemplateId?: string | null;
    startTime: string; endTime: string; crossesMidnight?: boolean; breakMinutes?: number;
    breakPolicy?: 'paid' | 'unpaid' | 'none'; note?: string | null;
  }) => Promise<{ created: ShiftAssignment[]; conflicts: Array<{ employeeId: string; workDate: string }> } | null>;
  updateShiftAssignment: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  cancelShiftAssignment: (id: string) => Promise<boolean>;

  attendanceEntries: AttendanceEntry[];
  loadAttendanceEntries: (p: { from: string; to: string; branchId?: string; employeeId?: string }) => Promise<void>;
  createAttendanceEntry: (p: Record<string, unknown>) => Promise<AttendanceEntry | null>;
  updateAttendanceEntry: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  deleteAttendanceEntry: (id: string) => Promise<boolean>;
  confirmAttendanceEntry: (id: string) => Promise<boolean>;
  confirmAttendanceBulk: (ids: string[]) => Promise<{ confirmed: string[]; skipped: string[]; notFound: string[] } | null>;
}

function qs(p: Record<string, string | undefined>): string {
  const parts = Object.entries(p).filter(([, v]) => v !== undefined && v !== '') as [string, string][];
  return parts.length ? '?' + parts.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&') : '';
}

export const createHourlyPayrollSlice: StateCreator<HourlyPayrollSlice> = (set, get) => ({
  shiftTemplates: [],
  shiftTemplatesLoaded: false,
  hourlyRatesByEmployee: {},
  shiftAssignments: [],
  attendanceEntries: [],

  async loadShiftTemplates() {
    try {
      const res = await fetch('/api/shift-templates', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) { set({ shiftTemplatesLoaded: true }); return; }
      const { shiftTemplates } = await res.json();
      set({ shiftTemplates, shiftTemplatesLoaded: true });
    } catch { set({ shiftTemplatesLoaded: true }); }
  },

  async createShiftTemplate(p) {
    try {
      const res = await fetch('/api/shift-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(p),
      });
      if (!res.ok) return false;
      const { shiftTemplate } = await res.json();
      set(s => ({ shiftTemplates: [shiftTemplate, ...s.shiftTemplates] }));
      return true;
    } catch { return false; }
  },

  async updateShiftTemplate(id, patch) {
    try {
      const res = await fetch(`/api/shift-templates/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) return false;
      const { shiftTemplate } = await res.json();
      set(s => ({ shiftTemplates: s.shiftTemplates.map(t => t.id === id ? shiftTemplate : t) }));
      return true;
    } catch { return false; }
  },

  async deleteShiftTemplate(id) {
    try {
      const res = await fetch(`/api/shift-templates/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ shiftTemplates: s.shiftTemplates.filter(t => t.id !== id) }));
      return true;
    } catch { return false; }
  },

  async loadHourlyRates(employeeId) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/hourly-rates`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const { rates } = await res.json();
      set(s => ({ hourlyRatesByEmployee: { ...s.hourlyRatesByEmployee, [employeeId]: rates } }));
    } catch { /* ignore */ }
  },

  async createHourlyRate(employeeId, p) {
    try {
      const res = await fetch(`/api/employees/${employeeId}/hourly-rates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(p),
      });
      if (!res.ok) return false;
      await get().loadHourlyRates(employeeId);
      return true;
    } catch { return false; }
  },

  async loadShiftAssignments(p) {
    try {
      const res = await fetch(`/api/shift-assignments${qs(p)}`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const { assignments } = await res.json();
      set({ shiftAssignments: assignments });
    } catch { /* ignore */ }
  },

  async createShiftAssignments(p) {
    try {
      const res = await fetch('/api/shift-assignments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(p),
      });
      const data = await res.json();
      if (!res.ok) return null;
      set(s => ({ shiftAssignments: [...s.shiftAssignments, ...data.created] }));
      return data;
    } catch { return null; }
  },

  async updateShiftAssignment(id, patch) {
    try {
      const res = await fetch(`/api/shift-assignments/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) return false;
      const { assignment } = await res.json();
      set(s => ({ shiftAssignments: s.shiftAssignments.map(a => a.id === id ? { ...a, ...assignment } : a) }));
      return true;
    } catch { return false; }
  },

  async cancelShiftAssignment(id) {
    try {
      const res = await fetch(`/api/shift-assignments/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ shiftAssignments: s.shiftAssignments.map(a => a.id === id ? { ...a, status: 'cancelled' } : a) }));
      return true;
    } catch { return false; }
  },

  async loadAttendanceEntries(p) {
    try {
      const res = await fetch(`/api/attendance${qs(p)}`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const { entries } = await res.json();
      set({ attendanceEntries: entries });
    } catch { /* ignore */ }
  },

  async createAttendanceEntry(p) {
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(p),
      });
      const data = await res.json();
      if (!res.ok) return null;
      set(s => ({ attendanceEntries: [...s.attendanceEntries, data.entry] }));
      return data.entry;
    } catch { return null; }
  },

  async updateAttendanceEntry(id, patch) {
    try {
      const res = await fetch(`/api/attendance/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(patch),
      });
      if (!res.ok) return false;
      const { entry } = await res.json();
      set(s => ({ attendanceEntries: s.attendanceEntries.map(e => e.id === id ? { ...e, ...entry } : e) }));
      return true;
    } catch { return false; }
  },

  async deleteAttendanceEntry(id) {
    try {
      const res = await fetch(`/api/attendance/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ attendanceEntries: s.attendanceEntries.filter(e => e.id !== id) }));
      return true;
    } catch { return false; }
  },

  async confirmAttendanceEntry(id) {
    try {
      const res = await fetch(`/api/attendance/${id}/confirm`, { method: 'POST', credentials: 'include' });
      if (!res.ok) return false;
      set(s => ({ attendanceEntries: s.attendanceEntries.map(e => e.id === id ? { ...e, status: 'confirmed' } : e) }));
      return true;
    } catch { return false; }
  },

  async confirmAttendanceBulk(ids) {
    try {
      const res = await fetch('/api/attendance/confirm-bulk', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok) return null;
      set(s => ({
        attendanceEntries: s.attendanceEntries.map(e => data.confirmed.includes(e.id) ? { ...e, status: 'confirmed' } : e),
      }));
      return data;
    } catch { return null; }
  },
});
