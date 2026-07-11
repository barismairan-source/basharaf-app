import type { StateCreator } from 'zustand';
import type { Account } from '@/types';

/**
 * AccountsSlice — مدیریت صندوق‌ها و حساب‌های بانکی.
 *
 * Optimistic:
 * - createAccount: فوری اضافه می‌شود
 * - updateAccount: فوری آپدیت می‌شود
 * - deleteAccount (soft): فوری مخفی می‌شود
 */
export interface AccountsSlice {
  accounts: Account[];
  accountsLoaded: boolean;
  accountsError: string | null;
  _setAccounts: (next: Account[]) => void;
  loadAccounts: () => Promise<void>;
  createAccount: (params: { name: string; type: string; branchId?: string | null }) => Promise<Account | null>;
  updateAccount: (id: string, patch: Partial<Pick<Account, 'name' | 'type' | 'isActive'>>) => Promise<boolean>;
  deleteAccount: (id: string) => Promise<boolean>;
}

export const createAccountsSlice: StateCreator<AccountsSlice> = (set, get) => ({
  accounts: [],
  accountsLoaded: false,
  accountsError: null,

  _setAccounts(next) { set({ accounts: next }); },

  async loadAccounts() {
    try {
      const res = await fetch('/api/accounts', { credentials: 'include' });
      if (!res.ok) return;
      const { accounts } = (await res.json()) as { accounts: Account[] };
      set({ accounts, accountsLoaded: true });
    } catch {
      set({ accountsLoaded: true });
    }
  },

  async createAccount(params) {
    const tempId = `optimistic-${Date.now()}`;
    const optimistic: Account = {
      id: tempId,
      name: params.name,
      type: params.type,
      balance: 0,
      isActive: true,
      branchId: params.branchId ?? null,
      partnerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set(s => ({ accounts: [...s.accounts, optimistic], accountsError: null }));

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      const data = (await res.json()) as { account?: Account; error?: string };
      if (!res.ok || !data.account) throw new Error(data.error ?? 'خطا');
      set(s => ({ accounts: s.accounts.map(a => a.id === tempId ? data.account! : a) }));
      return data.account;
    } catch (e) {
      set(s => ({
        accounts: s.accounts.filter(a => a.id !== tempId),
        accountsError: e instanceof Error ? e.message : 'خطا',
      }));
      return null;
    }
  },

  async updateAccount(id, patch) {
    const snapshot = get().accounts.find(a => a.id === id);
    if (!snapshot) return false;

    set(s => ({ accounts: s.accounts.map(a => a.id === id ? { ...a, ...patch } : a) }));

    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch (e) {
      set(s => ({ accounts: s.accounts.map(a => a.id === id ? snapshot : a) }));
      return false;
    }
  },

  async deleteAccount(id) {
    const snapshot = get().accounts.find(a => a.id === id);
    if (!snapshot) return false;

    set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));

    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('خطا');
      return true;
    } catch {
      set(s => ({ accounts: [snapshot, ...s.accounts] }));
      return false;
    }
  },
});
