import type { StateCreator } from 'zustand';
import type {
  TaskTemplate, NewTaskTemplateInput, UpdateTaskTemplateInput,
  TaskInstance, UpdateTaskInstanceInput, TaskFilters,
} from '@/types';

/**
 * TasksSlice — وظایف روزانه (فاز ۶، Part 3).
 * هم‌سبک OperationsSlice: optimistic نیست (لیست‌ها معمولاً کوچک‌اند و
 * بعد از هر تغییر دوباره از سرور می‌آیند).
 */
export interface TasksSlice {
  taskTemplates: TaskTemplate[];
  taskTemplatesLoaded: boolean;
  taskTemplatesError: string | null;

  tasks: TaskInstance[];
  tasksLoaded: boolean;
  tasksError: string | null;

  loadTaskTemplates: () => Promise<void>;
  createTaskTemplate: (input: NewTaskTemplateInput) => Promise<TaskTemplate | null>;
  updateTaskTemplate: (id: string, patch: UpdateTaskTemplateInput) => Promise<boolean>;

  loadTasks: (filters?: TaskFilters) => Promise<void>;
  generateTodayTasks: (branchId?: string) => Promise<number>;
  updateTaskInstance: (id: string, patch: UpdateTaskInstanceInput) => Promise<TaskInstance | null>;
}

export const createTasksSlice: StateCreator<TasksSlice> = (set, get) => ({
  taskTemplates: [],
  taskTemplatesLoaded: false,
  taskTemplatesError: null,
  tasks: [],
  tasksLoaded: false,
  tasksError: null,

  async loadTaskTemplates() {
    try {
      const res = await fetch('/api/task-templates', { credentials: 'include' });
      if (!res.ok) return;
      const { templates } = (await res.json()) as { templates: TaskTemplate[] };
      set({ taskTemplates: templates, taskTemplatesLoaded: true });
    } catch {
      set({ taskTemplatesLoaded: true });
    }
  },

  async createTaskTemplate(input) {
    try {
      const res = await fetch('/api/task-templates', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(input),
      });
      const data = (await res.json()) as { template?: TaskTemplate; error?: string };
      if (!res.ok || !data.template) throw new Error(data.error ?? 'خطا');
      set(s => ({ taskTemplates: [...s.taskTemplates, data.template!] }));
      return data.template;
    } catch (e) {
      set({ taskTemplatesError: e instanceof Error ? e.message : 'خطا' });
      return null;
    }
  },

  async updateTaskTemplate(id, patch) {
    try {
      const res = await fetch(`/api/task-templates/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { template?: TaskTemplate; error?: string };
      if (!res.ok || !data.template) throw new Error(data.error ?? 'خطا');
      set(s => ({ taskTemplates: s.taskTemplates.map(t => t.id === id ? data.template! : t) }));
      return true;
    } catch (e) {
      set({ taskTemplatesError: e instanceof Error ? e.message : 'خطا' });
      return false;
    }
  },

  async loadTasks(filters) {
    try {
      const params = new URLSearchParams();
      if (filters?.branchId) params.set('branchId', filters.branchId);
      if (filters?.date) params.set('date', filters.date);
      if (filters?.assignedUserId) params.set('assignedUserId', filters.assignedUserId);
      if (filters?.mine) params.set('mine', '1');

      const res = await fetch(`/api/tasks?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        set({ tasksError: data.error ?? 'خطا در دریافت وظایف', tasksLoaded: true });
        return;
      }
      const { tasks } = (await res.json()) as { tasks: TaskInstance[] };
      set({ tasks, tasksLoaded: true, tasksError: null });
    } catch {
      set({ tasksLoaded: true, tasksError: 'خطا در دریافت وظایف' });
    }
  },

  async generateTodayTasks(branchId) {
    try {
      const res = await fetch('/api/tasks/generate-today', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(branchId ? { branchId } : {}),
      });
      const data = (await res.json()) as { created?: number; tasks?: TaskInstance[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'خطا');
      if (data.tasks && data.tasks.length > 0) {
        set(s => ({ tasks: [...s.tasks, ...data.tasks!] }));
      }
      return data.created ?? 0;
    } catch (e) {
      set({ tasksError: e instanceof Error ? e.message : 'خطا' });
      return -1;
    }
  },

  async updateTaskInstance(id, patch) {
    const snapshot = get().tasks.find(t => t.id === id);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { task?: TaskInstance; error?: string };
      if (!res.ok || !data.task) throw new Error(data.error ?? 'خطا');
      set(s => ({ tasks: s.tasks.map(t => t.id === id ? data.task! : t) }));
      return data.task;
    } catch (e) {
      set({ tasksError: e instanceof Error ? e.message : 'خطا' });
      if (snapshot) set(s => ({ tasks: s.tasks.map(t => t.id === id ? snapshot : t) }));
      return null;
    }
  },
});
