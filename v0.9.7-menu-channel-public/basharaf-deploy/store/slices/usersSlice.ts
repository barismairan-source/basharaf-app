import type { StateCreator } from 'zustand';
import type { User, UserRole } from '@/types';
import type { UsersRepo } from '@/lib/repos';
import { can } from '@/lib/rbac';

export interface UsersSlice {
  users: User[];
  _setUsers: (next: User[]) => void;
  createUser: (
    params: { name: string; email: string; role: UserRole; assignedBranch: string | null },
    actingUser: User,
    password?: string
  ) => Promise<User | null>;
  updateUser: (
    id: string,
    patch: Partial<Pick<User, 'name' | 'email' | 'lastSeen' | 'permissions'>>,
    actingUser: User
  ) => Promise<boolean>;
  deleteUser: (id: string, actingUser: User) => Promise<boolean>;
  usersError: string | null;
}

export const createUsersSlice =
  (deps: { repo: UsersRepo }): StateCreator<UsersSlice> =>
  (set, get) => ({
    users: [],
    usersError: null,

    _setUsers(next) { set({ users: next }); },

    async createUser(params, actingUser, password) {
      if (!can(actingUser, 'manage:users')) {
        set({ usersError: 'فقط مدیر کل می‌تواند کاربر اضافه کند' });
        return null;
      }
      const tempId = `optimistic-${Date.now()}`;
      const optimisticUser = {
        id: tempId,
        name: params.name,
        email: params.email,
        role: params.role,
        assignedBranch: params.assignedBranch,
        initials: params.name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? '').join('\u200C'),
        lastSeen: 'هم اکنون',
        joined: new Date().toLocaleDateString('fa-IR'),
      } as User;

      set(s => ({ users: [...s.users, optimisticUser], usersError: null }));

      try {
        const u = await deps.repo.create({ ...params, password });
        set(s => ({ users: s.users.map(user => user.id === tempId ? u : user) }));
        return u;
      } catch (e) {
        set(s => ({
          users: s.users.filter(u => u.id !== tempId),
          usersError: e instanceof Error ? e.message : 'خطا در ساخت کاربر',
        }));
        return null;
      }
    },

    async updateUser(id, patch, actingUser) {
      if (!can(actingUser, 'manage:users') && actingUser.id !== id) {
        set({ usersError: 'دسترسی ندارید' });
        return false;
      }
      const snapshot = get().users.find(u => u.id === id);
      if (!snapshot) return false;

      set(s => ({
        users: s.users.map(u => u.id === id ? { ...u, ...patch } : u),
        usersError: null,
      }));

      try {
        await deps.repo.update(id, patch);
        return true;
      } catch (e) {
        set(s => ({
          users: s.users.map(u => u.id === id ? snapshot : u),
          usersError: e instanceof Error ? e.message : 'خطا در ویرایش',
        }));
        return false;
      }
    },

    async deleteUser(id, actingUser) {
      if (!can(actingUser, 'manage:users')) {
        set({ usersError: 'دسترسی ندارید' });
        return false;
      }
      if (actingUser.id === id) {
        set({ usersError: 'نمی‌توانید حساب خودتان را حذف کنید' });
        return false;
      }
      const snapshot = get().users.find(u => u.id === id);
      if (!snapshot) return false;

      set(s => ({ users: s.users.filter(u => u.id !== id), usersError: null }));

      try {
        await deps.repo.delete(id);
        return true;
      } catch (e) {
        set(s => ({
          users: [snapshot, ...s.users],
          usersError: e instanceof Error ? e.message : 'خطا در حذف',
        }));
        return false;
      }
    },
  });
