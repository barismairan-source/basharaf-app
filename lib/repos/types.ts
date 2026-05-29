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

/**
 * ─────────────────────────────────────────────────────────────────
 * Repository interfaces — قراردادهای بین store و دیتاسورس.
 *
 * در فاز ۹: implementations در `local.ts` هستند که داده را در حافظه نگه می‌دارند
 *           و از طریق Zustand persist، در localStorage کش می‌کنند.
 *
 * در فاز ۱۰: implementations جدید (مثلاً `supabase.ts` یا `rest.ts`) همین
 *            interfaces را پیاده می‌کنند. کافی است در `index.ts` یک خط
 *            export را عوض کنیم. هیچ slice، هیچ component نیاز به تغییر ندارد.
 *
 * طراحی: همه عملیات async هستند تا از همان فاز ۹، component‌ها با
 * loading/error state کار کنند و در انتقال به فاز ۱۰ تغییری لازم نباشد.
 * ───────────────────────────────────────────────────────────────── */

// ─────────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────────

export interface TransactionsRepo {
  /** خواندن همه تراکنش‌ها (در پایان scope توسط user اعمال می‌شود) */
  list(): Promise<Transaction[]>;

  /**
   * ثبت تراکنش جدید.
   * - status بر اساس نقش کاربر تعیین می‌شود (rbac.initialTransactionStatus)
   * - id، timestamps، createdBy خودکار از repo می‌آیند
   * - categoryName و branch از resolver‌ها (دسته و شعبه را به نام تبدیل می‌کند)
   */
  create(params: {
    input: TransactionInput;
    user: User;
    categoryName: string;
    branchName: string;
  }): Promise<Transaction>;

  /** تایید یک تراکنش pending — فقط SuperAdmin مجاز است (در slice چک می‌شود) */
  approve(id: string, approvedBy: string): Promise<Transaction>;

  /** رد یک تراکنش pending با دلیل اختیاری */
  reject(
    id: string,
    rejectedBy: string,
    reason: string
  ): Promise<Transaction>;

  /** ویرایش بخشی از فیلدهای یک تراکنش */
  update(id: string, patch: TransactionPatch): Promise<Transaction>;

  /** حذف یک تراکنش — فقط SuperAdmin مجاز است */
  delete(id: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────

export interface UsersRepo {
  list(): Promise<User[]>;
  findByEmail(email: string): Promise<User | null>;
  create(params: {
    name: string;
    email: string;
    role: UserRole;
    assignedBranch: string | null;
    password?: string;
  }): Promise<User>;
  update(id: string, patch: Partial<Omit<User, 'id'>>): Promise<User>;
  delete(id: string): Promise<void>;
}

/** شبه-data-store برای backward compat با store/index.ts */
export interface LocalDataStore {
  getTransactions: () => Transaction[];
  getUsers: () => User[];
  getBranches: () => Branch[];
  getCategories: () => CategorySet;
  getNotifications: () => Notification[];
  setTransactions: (next: Transaction[]) => void;
  setUsers: (next: User[]) => void;
  setBranches: (next: Branch[]) => void;
  setCategories: (next: CategorySet) => void;
  setNotifications: (next: Notification[]) => void;
}

// ─────────────────────────────────────────────────────────────────
// Branches
// ─────────────────────────────────────────────────────────────────

export interface BranchesRepo {
  list(): Promise<Branch[]>;
  create(params: Omit<Branch, 'id'>): Promise<Branch>;
  update(id: string, patch: Partial<Omit<Branch, 'id'>>): Promise<Branch>;
  delete(id: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Categories
// ─────────────────────────────────────────────────────────────────

export interface CategoriesRepo {
  list(): Promise<CategorySet>;
  /** افزودن یک دسته به یک نوع (income یا expense) */
  create(type: TransactionType, name: string): Promise<Category>;
  /** تغییر نام */
  update(type: TransactionType, id: string, name: string): Promise<Category>;
  /** حذف */
  delete(type: TransactionType, id: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────

export interface NotificationsRepo {
  list(): Promise<Notification[]>;
  /** علامت‌گذاری یک اعلان به‌عنوان خوانده‌شده */
  markRead(id: string): Promise<void>;
  /** علامت‌گذاری همه به‌عنوان خوانده‌شده */
  markAllRead(): Promise<void>;
  /**
   * افزودن اعلان جدید — معمولاً توسط system در نتیجه‌ی workflow.
   * مثلاً وقتی BranchUser تراکنش ثبت می‌کند، یک اعلان pending برای admin می‌سازد.
   */
  create(params: Omit<Notification, 'id'>): Promise<Notification>;
}

// ─────────────────────────────────────────────────────────────────
// Aggregate — همه repo‌ها در یک جا
// ─────────────────────────────────────────────────────────────────

export interface Repos {
  transactions: TransactionsRepo;
  users: UsersRepo;
  branches: BranchesRepo;
  categories: CategoriesRepo;
  notifications: NotificationsRepo;
}
