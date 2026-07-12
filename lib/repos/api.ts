import type {
  Branch,
  Category,
  CategorySet,
  Notification,
  Transaction,
  TransactionInput,
  TransactionPatch,
  TransactionType,
  User,
  UserRole,
} from '@/types';
import { inventoryRepo } from './inventory.api';
import type {
  BranchesRepo,
  CategoriesRepo,
  NotificationsRepo,
  Repos,
  TransactionsRepo,
  UsersRepo,
} from './types';

/**
 * ─────────────────────────────────────────────────────────────────
 * API repository — fetch-based implementation.
 *
 * این فایل جایگزین local.ts می‌شود (با swap در index.ts).
 *
 * هر متد:
 * 1. fetch به endpoint مناسب
 * 2. parse JSON
 * 3. throw در صورت error response
 * 4. بازگشت data
 *
 * چرا data store callback نمی‌گیرد؟ چون state از server می‌آید، نه از
 * یک in-memory store. هر fetch جدید، تازه‌ترین داده را برمی‌گرداند.
 *
 * Caching: در فاز ۱۰ از Next.js cache استفاده نمی‌کنیم — هر fetch مستقیم
 * به DB می‌رود. در آینده می‌توان از revalidateTag یا SWR/TanStack Query
 * برای client cache استفاده کرد.
 * ───────────────────────────────────────────────────────────────── */

const BASE_URL =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    : ''; // relative URLs در browser

export async function apiFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    credentials: 'include', // برای cookie session
  });

  // تلاش parse JSON حتی در error
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // اگر response JSON نیست (مثلاً 502 از proxy)، رشته empty
  }

  if (!res.ok) {
    // ── Global 401 interceptor ──────────────────────────────────────────
    // هر 401 یعنی session منقضی یا revoke شده. به‌جای نشان دادن خطا
    // به کاربر، فوری به login redirect می‌کنیم تا session مرده باقی نماند.
    // چک pathname برای جلوگیری از redirect loop روی صفحات عمومی.
    if (
      res.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login')
    ) {
      window.location.replace('/login');
      // promise هرگز resolve نمی‌شود — navigation در حال انجام است
      return new Promise<T>(() => {});
    }

    const errorMsg =
      (data as { error?: string })?.error ?? `HTTP ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

// ─────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────

const transactionsRepo: TransactionsRepo = {
  async list() {
    const data = await apiFetch<{ transactions: Transaction[] }>(
      '/api/transactions'
    );
    return data.transactions;
  },

  async create({ input, categoryName, branchName }) {
    // categoryName و branchName در API resolve می‌شوند، ولی برای حفظ
    // sig interface اینجا نگه می‌داریم (پارامتر unused).
    void categoryName;
    void branchName;

    const data = await apiFetch<{ transaction: Transaction }>(
      '/api/transactions',
      {
        method: 'POST',
        body: JSON.stringify({
          type: input.type,
          title: input.title,
          categoryId: input.category || undefined, // در client `category` = id
          amount: input.amount,
          payee: input.payee,
          branchId: input.branchId,
          method: input.method,
          receipt: input.receipt,
          date: input.date,
          note: input.note,
          hasReceipt: input.hasReceipt,
          // فیلدهای فاز ۱۷ و ۱۸
          accountId: input.accountId || undefined,
          destinationAccountId: input.destinationAccountId || undefined,
          contactId: input.contactId || undefined,
          vatAmount: input.vatAmount ?? 0,
          isCredit: input.isCredit ?? false,
        }),
      }
    );
    return data.transaction;
  },

  async approve(id) {
    const data = await apiFetch<{ transaction: Transaction }>(
      `/api/transactions/${id}/approve`,
      { method: 'POST' }
    );
    return data.transaction;
  },

  async reject(id, _rejectedBy, reason) {
    void _rejectedBy; // server خودش از session می‌گیرد
    const data = await apiFetch<{ transaction: Transaction }>(
      `/api/transactions/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }
    );
    return data.transaction;
  },

  async update(id, patch) {
    // تبدیل patch shape به shape API
    const apiPatch: Record<string, unknown> = {};
    if (patch.title !== undefined) apiPatch.title = patch.title;
    if (patch.category !== undefined) apiPatch.categoryId = patch.category;
    if (patch.amount !== undefined) apiPatch.amount = patch.amount;
    if (patch.payee !== undefined) apiPatch.payee = patch.payee;
    if (patch.method !== undefined) apiPatch.method = patch.method;
    if (patch.receipt !== undefined) apiPatch.receipt = patch.receipt;
    if (patch.date !== undefined) apiPatch.date = patch.date;
    if (patch.note !== undefined) apiPatch.note = patch.note;

    const data = await apiFetch<{ transaction: Transaction }>(
      `/api/transactions/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(apiPatch),
      }
    );
    return data.transaction;
  },

  async delete(id) {
    await apiFetch(`/api/transactions/${id}`, { method: 'DELETE' });
  },
};

// ─────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────

const usersRepo: UsersRepo = {
  async list() {
    const data = await apiFetch<{ users: User[] }>('/api/users');
    return data.users;
  },

  async findByEmail(email) {
    // در فاز ۱۰، findByEmail فقط در login server-side استفاده می‌شود
    // در client از /api/auth/me برای بازیابی session استفاده می‌کنیم
    const users = await this.list();
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
  },

  async create({ name, email, role, assignedBranch, password }) {
    const data = await apiFetch<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify({
        name,
        email,
        password: password ?? 'basharaf123',
        role,
        assignedBranchId: assignedBranch,
      }),
    });
    return data.user;
  },

  async update(id, patch) {
    const data = await apiFetch<{ user: User }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return data.user;
  },

  async delete(id) {
    await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
  },
};

// ─────────────────────────────────────────────────────────────────
// Branches
// ─────────────────────────────────────────────────────────────────

const branchesRepo: BranchesRepo = {
  async list() {
    const data = await apiFetch<{ branches: Branch[] }>('/api/branches');
    return data.branches;
  },

  async create(params) {
    const data = await apiFetch<{ branch: Branch }>('/api/branches', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return data.branch;
  },

  async update(id, patch) {
    const data = await apiFetch<{ branch: Branch }>(`/api/branches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    return data.branch;
  },

  async delete(id) {
    await apiFetch(`/api/branches/${id}`, { method: 'DELETE' });
  },
};

// ─────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────

const categoriesRepo: CategoriesRepo = {
  async list() {
    const data = await apiFetch<{ categories: CategorySet }>(
      '/api/categories'
    );
    return data.categories;
  },

  async create(type, name) {
    const data = await apiFetch<{ category: Category }>('/api/categories', {
      method: 'POST',
      body: JSON.stringify({ type, name }),
    });
    return data.category;
  },

  async update(_type, id, patch) {
    void _type; // type در API لازم نیست چون id منحصربه‌فرد است
    const data = await apiFetch<{ category: Category }>(
      `/api/categories/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }
    );
    return data.category;
  },

  async delete(_type, id) {
    void _type;
    await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
  },
};

// ─────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────

const notificationsRepo: NotificationsRepo = {
  async list() {
    const data = await apiFetch<{ notifications: Notification[] }>(
      '/api/notifications'
    );
    return data.notifications;
  },

  async markRead(id) {
    await apiFetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ id }),
    });
  },

  async markAllRead() {
    await apiFetch('/api/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ markAllRead: true }),
    });
  },

  async create(params) {
    // در فاز ۱۰ notifications از API ساخته می‌شوند (server-side در approve/reject)
    // پس این متد در client استفاده نمی‌شود. ولی برای backwards compat
    // یک endpoint dummy می‌سازیم که از session استفاده می‌کند.
    // فعلاً throw تا اگر فراخوانی شد، توسعه‌دهنده متوجه شود.
    void params;
    throw new Error(
      'notifications.create در فاز ۱۰ از سمت client فراخوانی نمی‌شود؛ ' +
        'این کار توسط API server انجام می‌شود.'
    );
  },
};

// ─────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────

export function createApiRepos(): Repos {
  return {
    transactions: transactionsRepo,
    users: usersRepo,
    branches: branchesRepo,
    categories: categoriesRepo,
    notifications: notificationsRepo,
    inventory: inventoryRepo,
  };
}
