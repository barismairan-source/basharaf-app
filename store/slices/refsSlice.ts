import type { StateCreator } from 'zustand';
import type { Branch, Category, CategorySet, TransactionType, User } from '@/types';
import type { BranchesRepo, CategoriesRepo } from '@/lib/repos';
import { can } from '@/lib/rbac';

// ─────────────────────────────────────────────────────────────────
// Branches — Optimistic
// ─────────────────────────────────────────────────────────────────

export interface BranchesSlice {
  branches: Branch[];
  branchFilter: string | null;
  branchesError: string | null;
  _setBranches: (next: Branch[]) => void;
  setBranchFilter: (id: string | null) => void;
  createBranch: (params: Omit<Branch, 'id'>, actingUser: User) => Promise<Branch | null>;
  updateBranch: (id: string, patch: Partial<Omit<Branch, 'id'>>, actingUser: User) => Promise<boolean>;
  deleteBranch: (id: string, actingUser: User) => Promise<boolean>;
}

export const createBranchesSlice =
  (deps: { repo: BranchesRepo }): StateCreator<BranchesSlice> =>
  (set, get) => ({
    branches: [],
    branchFilter: null,
    branchesError: null,

    _setBranches(next) { set({ branches: next }); },
    setBranchFilter(id) { set({ branchFilter: id }); },

    async createBranch(params, actingUser) {
      if (!can(actingUser, 'manage:branches')) {
        set({ branchesError: 'دسترسی ندارید' });
        return null;
      }

      const tempId = `optimistic-${Date.now()}`;
      const optimistic: Branch = { id: tempId, ...params };

      set((s) => ({
        branches: [...s.branches, optimistic],
        branchesError: null,
      }));

      try {
        const b = await deps.repo.create(params);
        set((s) => ({
          branches: s.branches.map((br) => (br.id === tempId ? b : br)),
        }));
        return b;
      } catch (e) {
        set((s) => ({
          branches: s.branches.filter((br) => br.id !== tempId),
          branchesError: e instanceof Error ? e.message : 'خطا در ساخت شعبه',
        }));
        return null;
      }
    },

    async updateBranch(id, patch, actingUser) {
      if (!can(actingUser, 'manage:branches')) {
        set({ branchesError: 'دسترسی ندارید' });
        return false;
      }

      const snapshot = get().branches.find((b) => b.id === id);
      if (!snapshot) return false;

      set((s) => ({
        branches: s.branches.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        branchesError: null,
      }));

      try {
        await deps.repo.update(id, patch);
        return true;
      } catch (e) {
        set((s) => ({
          branches: s.branches.map((b) => (b.id === id ? snapshot : b)),
          branchesError: e instanceof Error ? e.message : 'خطا در ویرایش شعبه',
        }));
        return false;
      }
    },

    async deleteBranch(id, actingUser) {
      if (!can(actingUser, 'manage:branches')) {
        set({ branchesError: 'دسترسی ندارید' });
        return false;
      }

      const snapshot = get().branches.find((b) => b.id === id);
      if (!snapshot) return false;

      set((s) => ({
        branches: s.branches.filter((b) => b.id !== id),
        branchFilter: s.branchFilter === id ? null : s.branchFilter,
        branchesError: null,
      }));

      try {
        await deps.repo.delete(id);
        return true;
      } catch (e) {
        set((s) => ({
          branches: [...s.branches, snapshot],
          branchesError: e instanceof Error ? e.message : 'خطا در حذف شعبه',
        }));
        return false;
      }
    },
  });

// ─────────────────────────────────────────────────────────────────
// Categories — Optimistic
// ─────────────────────────────────────────────────────────────────

export interface CategoriesSlice {
  categories: CategorySet;
  categoriesError: string | null;
  _setCategories: (next: CategorySet) => void;
  createCategory: (type: TransactionType, name: string, actingUser: User) => Promise<boolean>;
  updateCategory: (type: TransactionType, id: string, patch: { name?: string; isSetup?: boolean }, actingUser: User) => Promise<boolean>;
  deleteCategory: (type: TransactionType, id: string, actingUser: User) => Promise<boolean>;
}

export const createCategoriesSlice =
  (deps: { repo: CategoriesRepo }): StateCreator<CategoriesSlice> =>
  (set, get) => ({
    categories: { income: [], expense: [] },
    categoriesError: null,

    _setCategories(next) { set({ categories: next }); },

    async createCategory(type, name, actingUser) {
      if (!can(actingUser, 'manage:categories')) {
        set({ categoriesError: 'دسترسی ندارید' });
        return false;
      }

      const tempId = `optimistic-${Date.now()}`;
      const optimistic: Category = { id: tempId, name, isSetup: false };

      set((s) => ({
        categories: {
          ...s.categories,
          [type]: [...s.categories[type as 'income' | 'expense'], optimistic],
        },
        categoriesError: null,
      }));

      try {
        const real = await deps.repo.create(type, name);
        set((s) => ({
          categories: {
            ...s.categories,
            [type]: s.categories[type as 'income' | 'expense'].map((c) => (c.id === tempId ? real : c)),
          },
        }));
        return true;
      } catch (e) {
        set((s) => ({
          categories: {
            ...s.categories,
            [type]: s.categories[type as 'income' | 'expense'].filter((c) => c.id !== tempId),
          },
          categoriesError: e instanceof Error ? e.message : 'خطا در ساخت دسته',
        }));
        return false;
      }
    },

    async updateCategory(type, id, patch, actingUser) {
      if (!can(actingUser, 'manage:categories')) {
        set({ categoriesError: 'دسترسی ندارید' });
        return false;
      }

      const snapshot = get().categories[type as 'income' | 'expense'].find((c) => c.id === id);
      if (!snapshot) return false;

      set((s) => ({
        categories: {
          ...s.categories,
          [type]: s.categories[type as 'income' | 'expense'].map((c) => (c.id === id ? { ...c, ...patch } : c)),
        },
        categoriesError: null,
      }));

      try {
        await deps.repo.update(type, id, patch);
        return true;
      } catch (e) {
        set((s) => ({
          categories: {
            ...s.categories,
            [type]: s.categories[type as 'income' | 'expense'].map((c) => (c.id === id ? snapshot : c)),
          },
          categoriesError: e instanceof Error ? e.message : 'خطا در ویرایش دسته',
        }));
        return false;
      }
    },

    async deleteCategory(type, id, actingUser) {
      if (!can(actingUser, 'manage:categories')) {
        set({ categoriesError: 'دسترسی ندارید' });
        return false;
      }

      const snapshot = get().categories[type as 'income' | 'expense'].find((c) => c.id === id);
      if (!snapshot) return false;

      set((s) => ({
        categories: {
          ...s.categories,
          [type]: s.categories[type as 'income' | 'expense'].filter((c) => c.id !== id),
        },
        categoriesError: null,
      }));

      try {
        await deps.repo.delete(type, id);
        return true;
      } catch (e) {
        set((s) => ({
          categories: {
            ...s.categories,
            [type]: [...s.categories[type as 'income' | 'expense'], snapshot],
          },
          categoriesError: e instanceof Error ? e.message : 'خطا در حذف دسته',
        }));
        return false;
      }
    },
  });
