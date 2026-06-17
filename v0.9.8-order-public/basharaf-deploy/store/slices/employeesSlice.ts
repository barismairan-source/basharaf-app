import type { StateCreator } from 'zustand';
import type { Employee } from '@/types';

export interface EmployeesSlice {
  employees: Employee[];
  employeesLoaded: boolean;
  employeesError: string | null;
  loadEmployees: () => Promise<void>;
  createEmployee: (params: Record<string, unknown>) => Promise<Employee | null>;
  updateEmployee: (id: string, patch: Record<string, unknown>) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;
}

export const createEmployeesSlice: StateCreator<EmployeesSlice> = (set, get) => ({
  employees: [],
  employeesLoaded: false,
  employeesError: null,

  async loadEmployees() {
    try {
      const res = await fetch('/api/employees', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) return;
      const { employees } = (await res.json()) as { employees: Employee[] };
      set({ employees, employeesLoaded: true });
    } catch {
      set({ employeesLoaded: true });
    }
  },

  async createEmployee(params) {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(params),
      });
      const data = (await res.json()) as { employee?: Employee; error?: string };
      if (!res.ok || !data.employee) throw new Error(data.error ?? 'خطا در ثبت');
      set(s => ({ employees: [data.employee!, ...s.employees], employeesError: null }));
      return data.employee;
    } catch (e) {
      set({ employeesError: e instanceof Error ? e.message : 'خطا' });
      return null;
    }
  },

  async updateEmployee(id, patch) {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { employee?: Employee; error?: string };
      if (!res.ok || !data.employee) throw new Error(data.error ?? 'خطا');
      set(s => ({ employees: s.employees.map(e => e.id === id ? data.employee! : e) }));
      return true;
    } catch (e) {
      set({ employeesError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async deleteEmployee(id) {
    const snapshot = get().employees;
    set(s => ({ employees: s.employees.filter(e => e.id !== id) }));
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      set({ employees: snapshot, employeesError: 'خطا در حذف' });
      return false;
    }
  },
});
