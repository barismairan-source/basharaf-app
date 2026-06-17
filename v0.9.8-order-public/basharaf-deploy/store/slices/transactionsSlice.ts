import type { StateCreator } from 'zustand';
import type {
  Transaction,
  TransactionInput,
  TransactionPatch,
  User,
} from '@/types';
import type { TransactionsRepo } from '@/lib/repos';
import { can, scopeForUser } from '@/lib/rbac';

/**
 * ─────────────────────────────────────────────────────────────────
 * TransactionsSlice — فاز ۱۱ با Optimistic UI.
 *
 * الگوی Optimistic:
 * ۱. state را فوری آپدیت کن (کاربر تغییر را می‌بیند)
 * ۲. API call را در background بفرست
 * ۳. اگر موفق: state را با داده‌ی server sync کن
 * ۴. اگر خطا: state را به حالت قبل برگردان (rollback) + toast
 *
 * این یعنی هیچ spinner ای برای approve/reject/delete نمی‌بینیم.
 * ───────────────────────────────────────────────────────────────── */

export interface TransactionsSlice {
  transactions: Transaction[];
  txLoading: boolean;
  txError: string | null;

  /** ID تراکنشی که detail panel آن باز است */
  openTxId: string | null;
  openTx: (id: string | null) => void;

  _setTransactions: (next: Transaction[]) => void;

  submitTransaction: (
    input: TransactionInput,
    user: User,
    categoryName: string,
    branchName: string
  ) => Promise<Transaction | null>;

  approveTransaction: (id: string, user: User) => Promise<boolean>;
  rejectTransaction: (id: string, user: User, reason: string) => Promise<boolean>;
  updateTransaction: (id: string, patch: TransactionPatch, user: User) => Promise<boolean>;
  deleteTransaction: (id: string, user: User) => Promise<boolean>;
  visibleTransactions: (user: User | null) => Transaction[];
}

interface TxSliceDeps {
  repo: TransactionsRepo;
  emitPendingNotification: (tx: Transaction) => void;
  emitApprovalNotification: (tx: Transaction, approved: boolean) => void;
  refreshAccounts?: () => void;
}

export const createTransactionsSlice =
  (deps: TxSliceDeps): StateCreator<TransactionsSlice> =>
  (set, get) => ({
    transactions: [],
    txLoading: false,
    txError: null,
    openTxId: null,

    openTx(id) {
      set({ openTxId: id });
    },

    _setTransactions(next) {
      set({ transactions: next });
    },

    // ─── Submit — Optimistic ───────────────────────────────────────
    async submitTransaction(input, user, categoryName, branchName) {
      if (user.role === 'BranchUser' && input.branchId !== user.assignedBranch) {
        set({ txError: 'شما فقط می‌توانید برای شعبه‌ی خود تراکنش ثبت کنید' });
        return null;
      }
      if (!can(user, 'create:transaction')) {
        set({ txError: 'دسترسی به ثبت تراکنش ندارید' });
        return null;
      }

      // Optimistic: یک ID موقت می‌سازیم تا قبل از server response UI آپدیت شود
      const tempId = `optimistic-${Date.now()}`;
      const now = new Date().toISOString();
      const isAdmin = user.role === 'SuperAdmin';

      const optimisticTx: Transaction = {
        id: tempId,
        type: input.type,
        title: input.title,
        category: input.category,
        categoryName,
        amount: input.amount,
        payee: input.payee,
        branchId: input.branchId,
        branch: branchName,
        method: input.method,
        receipt: input.receipt || '—',
        date: input.date,
        note: input.note || '',
        hasReceipt: input.hasReceipt || false,
        status: isAdmin ? 'approved' : 'pending',
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
        ...(isAdmin
          ? { approvedBy: user.id, approvedAt: now }
          : {}),
      } as Transaction;

      // فوری به لیست اضافه کن
      set((s) => ({
        transactions: [optimisticTx, ...s.transactions],
        txError: null,
      }));

      try {
        const tx = await deps.repo.create({ input, user, categoryName, branchName });

        // جایگزین temp با real
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === tempId ? tx : t
          ),
        }));

        if (tx.status === 'pending') {
          deps.emitPendingNotification(tx);
        } else {
          // تراکنش admin بلافاصله approved است — موجودی صندوق/طرف‌حساب
          // همان لحظه روی سرور اعمال شده؛ UI را هم sync کن.
          deps.refreshAccounts?.();
        }

        return tx;
      } catch (e) {
        // Rollback
        set((s) => ({
          transactions: s.transactions.filter((t) => t.id !== tempId),
          txError: e instanceof Error ? e.message : 'خطا در ثبت تراکنش',
        }));
        return null;
      }
    },

    // ─── Approve — Optimistic ─────────────────────────────────────
    async approveTransaction(id, user) {
      if (!can(user, 'approve:transaction')) {
        set({ txError: 'فقط مدیر کل می‌تواند تایید کند' });
        return false;
      }

      // snapshot برای rollback
      const snapshot = get().transactions.find((t) => t.id === id);
      if (!snapshot) return false;

      const now = new Date().toISOString();

      // فوری آپدیت
      set((s) => ({
        transactions: s.transactions.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'approved' as const,
                approvedBy: user.id,
                approvedAt: now,
                updatedAt: now,
              }
            : t
        ),
        txError: null,
      }));

      try {
        const tx = await deps.repo.approve(id, user.id);
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? tx : t)),
        }));
        deps.emitApprovalNotification(tx, true);
        // sync موجودی حساب‌ها پس از approve
        deps.refreshAccounts?.();
        return true;
      } catch (e) {
        set((s) => ({
          transactions: s.transactions.map((t) => t.id === id ? snapshot : t),
          txError: e instanceof Error ? e.message : 'خطا در تایید',
        }));
        return false;
      }
    },

    // ─── Reject — Optimistic ──────────────────────────────────────
    async rejectTransaction(id, user, reason) {
      if (!can(user, 'reject:transaction')) {
        set({ txError: 'فقط مدیر کل می‌تواند رد کند' });
        return false;
      }

      const snapshot = get().transactions.find((t) => t.id === id);
      if (!snapshot) return false;

      const now = new Date().toISOString();
      const finalReason = reason.trim() || 'بدون دلیل ذکرشده';

      set((s) => ({
        transactions: s.transactions.map((t) =>
          t.id === id
            ? {
                ...t,
                status: 'rejected' as const,
                rejectedBy: user.id,
                rejectedAt: now,
                rejectionReason: finalReason,
                updatedAt: now,
              }
            : t
        ),
        txError: null,
      }));

      try {
        const tx = await deps.repo.reject(id, user.id, reason);
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? tx : t)),
        }));
        deps.emitApprovalNotification(tx, false);
        return true;
      } catch (e) {
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? snapshot : t
          ),
          txError: e instanceof Error ? e.message : 'خطا در رد تراکنش',
        }));
        return false;
      }
    },

    // ─── Update — Optimistic ──────────────────────────────────────
    async updateTransaction(id, patch, user) {
      const current = get().transactions.find((t) => t.id === id);
      if (!current) {
        set({ txError: 'تراکنش پیدا نشد' });
        return false;
      }

      const isAdmin = user.role === 'SuperAdmin';
      const isOwnPending =
        user.role === 'BranchUser' &&
        current.status === 'pending' &&
        current.createdBy === user.id;

      if (!isAdmin && !isOwnPending) {
        set({ txError: 'دسترسی به ویرایش این تراکنش ندارید' });
        return false;
      }

      const snapshot = current;

      // فوری آپدیت
      set((s) => ({
        transactions: s.transactions.map((t) =>
          t.id === id
            ? { ...t, ...patch, updatedAt: new Date().toISOString() }
            : t
        ),
        txError: null,
      }));

      try {
        await deps.repo.update(id, patch);
        return true;
      } catch (e) {
        // Rollback
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id ? snapshot : t
          ),
          txError: e instanceof Error ? e.message : 'خطا در ویرایش',
        }));
        return false;
      }
    },

    // ─── Delete — Optimistic ──────────────────────────────────────
    async deleteTransaction(id, user) {
      if (!can(user, 'delete:transaction')) {
        set({ txError: 'فقط مدیر کل می‌تواند حذف کند' });
        return false;
      }

      const snapshot = get().transactions.find((t) => t.id === id);
      if (!snapshot) return false;

      // فوری از لیست حذف کن
      set((s) => ({
        transactions: s.transactions.filter((t) => t.id !== id),
        openTxId: s.openTxId === id ? null : s.openTxId,
        txError: null,
      }));

      try {
        await deps.repo.delete(id);
        // اگر approved بود، حذف اتمیک سرور موجودی صندوق/طرف‌حساب را
        // برگردانده — UI را هم sync کن.
        if (snapshot.status === 'approved') {
          deps.refreshAccounts?.();
        }
        return true;
      } catch (e) {
        // Rollback — دوباره اضافه کن
        set((s) => ({
          transactions: [snapshot, ...s.transactions],
          txError: e instanceof Error ? e.message : 'خطا در حذف',
        }));
        return false;
      }
    },

    visibleTransactions(user) {
      return scopeForUser(get().transactions, user);
    },
  });
