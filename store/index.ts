import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { createRepos, type LocalDataStore } from '@/lib/repos';
import {
  DEFAULT_PREFERENCES,
  type Branch,
  type CategorySet,
  type Notification,
  type Preferences,
  type Transaction,
  type User,
} from '@/types';

import { createAuthSlice, type AuthSlice } from './slices/authSlice';
import { createTransactionsSlice, type TransactionsSlice } from './slices/transactionsSlice';
import { createUsersSlice, type UsersSlice } from './slices/usersSlice';
import {
  createBranchesSlice,
  createCategoriesSlice,
  type BranchesSlice,
  type CategoriesSlice,
} from './slices/refsSlice';
import { createNotificationsSlice, type NotificationsSlice } from './slices/notificationsSlice';
import { createPreferencesSlice, type PreferencesSlice } from './slices/preferencesSlice';
import { createUiSlice, type UiSlice } from './slices/uiSlice';
import { createAppSettingsSlice, type AppSettingsSlice } from './slices/appSettingsSlice';

import { createAccountsSlice, type AccountsSlice } from './slices/accountsSlice';
import { createContactsSlice, type ContactsSlice } from './slices/contactsSlice';
import { createMenuSlice, type MenuSlice } from './slices/menuSlice';
import { createEmployeesSlice, type EmployeesSlice } from './slices/employeesSlice';
import { createPayrollSlice, type PayrollSlice } from './slices/payrollSlice';
import { createRecruitmentSlice, type RecruitmentSlice } from './slices/recruitmentSlice';
import { createCustomersSlice, type CustomersSlice } from './slices/customersSlice';
import { createCouponsSlice, type CouponsSlice } from './slices/couponsSlice';
import { createReservationsSlice, type ReservationsSlice } from './slices/reservationsSlice';
import { createFeedbackSlice, type FeedbackSlice } from './slices/feedbackSlice';
import { createOperationsSlice, type OperationsSlice } from './slices/operationsSlice';
import { createTasksSlice, type TasksSlice } from './slices/tasksSlice';
import { createPartnersSlice, type PartnersSlice } from './slices/partnersSlice';

export type AppStore = AuthSlice &
  TransactionsSlice &
  UsersSlice &
  BranchesSlice &
  CategoriesSlice &
  NotificationsSlice &
  PreferencesSlice &
  UiSlice &
  AppSettingsSlice &
  AccountsSlice &
  ContactsSlice &
  MenuSlice &
  EmployeesSlice &
  PayrollSlice &
  RecruitmentSlice &
  CustomersSlice &
  CouponsSlice &
  ReservationsSlice &
  FeedbackSlice &
  OperationsSlice &
  TasksSlice &
  PartnersSlice & {
    bootstrapped: boolean;
    bootstrap: () => Promise<void>;
  };

let storeRef: {
  getState: () => AppStore;
  setState: (partial: Partial<AppStore>) => void;
} | null = null;

const dataStore: LocalDataStore = {
  getTransactions: () => storeRef!.getState().transactions,
  getUsers: () => storeRef!.getState().users,
  getBranches: () => storeRef!.getState().branches,
  getCategories: () => storeRef!.getState().categories,
  getNotifications: () => storeRef!.getState().notifications,
  setTransactions: (next: Transaction[]) => storeRef!.getState()._setTransactions(next),
  setUsers: (next: User[]) => storeRef!.getState()._setUsers(next),
  setBranches: (next: Branch[]) => storeRef!.getState()._setBranches(next),
  setCategories: (next: CategorySet) => storeRef!.getState()._setCategories(next),
  setNotifications: (next: Notification[]) => storeRef!.getState()._setNotifications(next),
};

const repos = createRepos(dataStore);

type PersistedState = { preferences: Preferences };

export const useAppStore = create<AppStore>()(
  persist(
    (set, get, api) => ({
      ...createAuthSlice({
        findUserByEmail: (email) => repos.users.findByEmail(email),
        findUserById: (id) => get().users.find((u) => u.id === id),
      })(set as any, get as any, api as any),

      ...createTransactionsSlice({
        repo: repos.transactions,
        emitPendingNotification: () => {},
        emitApprovalNotification: () => {},
        refreshAccounts: () => {
          // refresh فوری بعد از approve/create/delete — بدون setTimeout
          // هم صندوق‌ها و هم طرف‌حساب‌ها (نسیه) را تازه می‌کند تا UI
          // بعد از تغییر موجودی، stale نماند.
          storeRef?.getState().loadAccounts();
          storeRef?.getState().loadContacts();
        },
      })(set as any, get as any, api as any),

      ...createUsersSlice({ repo: repos.users })(set as any, get as any, api as any),
      ...createBranchesSlice({ repo: repos.branches })(set as any, get as any, api as any),
      ...createCategoriesSlice({ repo: repos.categories })(set as any, get as any, api as any),
      ...createNotificationsSlice({ repo: repos.notifications })(set as any, get as any, api as any),
      ...createPreferencesSlice(set as any, get as any, api as any),
      ...createUiSlice(set as any, get as any, api as any),
      ...createAppSettingsSlice(set as any, get as any, api as any),
      ...createAccountsSlice(set as any, get as any, api as any),
      ...createContactsSlice(set as any, get as any, api as any),
      ...createMenuSlice(set as any, get as any, api as any),
      ...createEmployeesSlice(set as any, get as any, api as any),
      ...createPayrollSlice(set as any, get as any, api as any),
      ...createRecruitmentSlice(set as any, get as any, api as any),
      ...createCustomersSlice(set as any, get as any, api as any),
      ...createCouponsSlice(set as any, get as any, api as any),
      ...createReservationsSlice(set as any, get as any, api as any),
      ...createFeedbackSlice(set as any, get as any, api as any),
      ...createOperationsSlice(set as any, get as any, api as any),
      ...createTasksSlice(set as any, get as any, api as any),
      ...createPartnersSlice(set as any, get as any, api as any),

      transactions: [],
      users: [],
      branches: [],
      categories: { income: [], expense: [] },
      notifications: [],
      preferences: DEFAULT_PREFERENCES,
      appSettings: {},
      appSettingsLoaded: false,
      accounts: [],
      accountsLoaded: false,
      accountsError: null,
      contacts: [],
      contactsLoaded: false,
      contactsError: null,
      menuSections: [],
      menuSettings: null,
      menuLoaded: false,
      menuError: null,
      employees: [],
      employeesLoaded: false,
      employeesError: null,
      payrollRuns: [],
      payrollRunsLoaded: false,
      payrollEvents: [],
      applications: [],
      applicationsLoaded: false,
      applicationsError: null,
      customers: [],
      customersLoaded: false,
      customersError: null,
      coupons: [],
      couponsLoaded: false,
      couponsError: null,
      reservations: [],
      reservationsLoaded: false,
      reservationsError: null,
      tables: [],
      tablesLoaded: false,
      feedbackSummary: [],
      feedbackSummaryLoaded: false,
      equipment: [],
      equipmentLoaded: false,
      equipmentError: null,
      maintenanceLogs: [],
      maintenanceLoaded: false,
      maintenanceError: null,
      purchaseOrders: [],
      poLoaded: false,
      poError: null,
      taskTemplates: [],
      taskTemplatesLoaded: false,
      taskTemplatesError: null,
      tasks: [],
      tasksLoaded: false,
      tasksError: null,
      partners: [],
      partnersLoaded: false,
      partnersError: null,
      bootstrapped: false,

      async bootstrap() {
        try {
          const meRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (!meRes.ok) {
            set({ bootstrapped: true });
            // 401/403 = session منقضی، کاربر حذف‌شده، یا حساب غیرفعال.
            // مهم: قبل از redirect باید کوکی httpOnly را server-side پاک کنیم،
            // وگرنه middleware کوکی را می‌بیند و دوباره به /dashboard redirect
            // می‌کند → حلقه‌ی ping-pong.
            if (
              (meRes.status === 401 || meRes.status === 403) &&
              typeof window !== 'undefined' &&
              // '/' = روت عمومی (صفحه‌ی همکاری) — فقط مسیر دقیق روت allowlist می‌شود
              // (startsWith('//') هرگز true نمی‌شود، پس مسیرهای دیگر تحت‌تأثیر نیستند).
              !['/', '/login', '/signup', '/forgot', '/apply', '/m', '/order'].some(
                (p) => window.location.pathname === p || window.location.pathname.startsWith(`${p}/`)
              )
            ) {
              await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
              window.location.replace('/login');
            }
            return;
          }
          const { user } = (await meRes.json()) as { user: User };
          set({ user });

          // همه data را parallel بگیر — شامل appSettings
          const [transactions, users, branches, categories, notifications] =
            await Promise.all([
              repos.transactions.list().catch(() => []),
              repos.users.list().catch(() => []),
              repos.branches.list().catch(() => []),
              repos.categories.list().catch(() => ({ income: [], expense: [] })),
              repos.notifications.list().catch(() => []),
            ]);

          set({ transactions, users, branches, categories, notifications, bootstrapped: true });

          // non-blocking loads
          get()._loadAppSettings();
          get().loadAccounts();
          get().loadContacts();
          get().loadCustomers();
        } catch (e) {
          console.error('Bootstrap failed:', e);
          set({ bootstrapped: true });
        }
      },
    }),
    {
      name: 'basharaf-app-store',
      version: 3, // bump — فاز ۱۱/۱۲
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedState => ({
        preferences: state.preferences,
      }),
    }
  )
);

storeRef = useAppStore;

export function useCurrentUser(): User | null {
  return useAppStore((s) => s.user);
}

export function useVisibleTransactions() {
  return useAppStore((s) => {
    if (!s.user) return [];
    return s.user.role === 'SuperAdmin'
      ? s.transactions
      : s.transactions.filter((t) => t.branchId === s.user!.assignedBranch);
  });
}

/** hook کوتاه برای خواندن یک setting */
export function useSetting(key: string, fallback = '') {
  return useAppStore((s) => s.appSettings[key] ?? fallback);
}
