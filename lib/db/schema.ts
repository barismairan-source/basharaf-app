import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  bigint,
  pgEnum,
  primaryKey,
  index,
  integer,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * ─────────────────────────────────────────────────────────────────
 * Drizzle schema برای Postgres.
 *
 * طراحی این schema مطابق دقیق types/ موجود است تا swap از local
 * به API بدون تغییر در types ممکن باشد.
 *
 * تصمیمات کلیدی:
 * - UUID به‌جای auto-increment (سازگار با crypto.randomUUID فعلی)
 * - amount به‌عنوان bigint (تومان به‌صورت عدد صحیح، بدون float)
 * - audit fields در همه جدول‌ها (createdAt/updatedAt)
 * - denormalized fields حفظ می‌شوند (branch، categoryName در transaction)
 *   چون اگر شعبه یا دسته حذف شود، تاریخچه‌ی تراکنش حفظ شود
 * - status به‌جای enum، text با check constraint (انعطاف بیشتر در migration)
 *   ولی pgEnum برای type-safety بهتر است
 * - indexes روی فیلدهای پرتکرار query (branchId, status, createdAt)
 *
 * Foreign keys:
 * - transactions.branchId → branches.id (با onDelete: restrict، چون اگر شعبه
 *   تراکنش دارد نباید حذف شود — این invariant در API هم چک می‌شود)
 * - transactions.createdBy → users.id (با onDelete: restrict)
 * - notifications.txId → transactions.id (با onDelete: cascade، اگر تراکنش
 *   حذف شد، اعلان مرتبط هم حذف شود)
 * ───────────────────────────────────────────────────────────────── */

// ─── Enums ───
export const userRoleEnum = pgEnum('user_role', ['SuperAdmin', 'BranchUser']);
export const txTypeEnum = pgEnum('tx_type', ['income', 'expense', 'transfer']);
export const txStatusEnum = pgEnum('tx_status', [
  'pending',
  'approved',
  'rejected',
]);
export const notifTypeEnum = pgEnum('notif_type', [
  'pending',
  'approved',
  'rejected',
  'info',
]);

// ─── Branches ───
export const branches = pgTable('branches', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  manager: text('manager').notNull(),
  opened: text('opened').notNull(), // Jalali string
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ─── Users ───
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    /** bcrypt hash — نه plaintext */
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull(),
    /** برای BranchUser الزامی، برای SuperAdmin null */
    assignedBranchId: uuid('assigned_branch_id').references(() => branches.id, {
      onDelete: 'restrict',
    }),
    initials: text('initials').notNull(),
    lastSeen: text('last_seen').notNull().default('هم اکنون'),
    joined: text('joined').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.email),
  })
);

// ─── Categories ───
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: txTypeEnum('type').notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    typeIdx: index('categories_type_idx').on(table.type),
  })
);

// ─── Transactions ───
export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: txTypeEnum('type').notNull(),
    title: text('title').notNull(),

    // category reference + denormalized name
    // برای transfer می‌تواند null باشد
    categoryId: uuid('category_id')
      .references(() => categories.id, { onDelete: 'restrict' }),
    categoryName: text('category_name').notNull().default(''),

    // amount as bigint to avoid float precision issues
    amount: bigint('amount', { mode: 'number' }).notNull(),

    payee: text('payee').notNull(),

    // branch reference + denormalized name
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    branchName: text('branch_name').notNull(),

    method: text('method').notNull(),
    receipt: text('receipt').notNull().default('—'),
    receiptUrl: text('receipt_url'),
    /** صندوق / حساب مرتبط با این تراکنش */
    accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
    /** فقط برای transfer: حساب مقصد */
    destinationAccountId: uuid('destination_account_id').references(() => accounts.id, { onDelete: 'set null' }),
    /** طرف‌حساب (بدهکار/بستانکار) — اختیاری */
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    /** مبلغ مالیات ارزش افزوده (تومان) — اگر صفر یعنی بدون مالیات */
    vatAmount: bigint('vat_amount', { mode: 'number' }).notNull().default(0),
    /** آیا این تراکنش نسیه است (پرداخت نشده) */
    isCredit: boolean('is_credit').notNull().default(false),
    date: text('date').notNull(), // Jalali string
    note: text('note').notNull().default(''),
    hasReceipt: boolean('has_receipt').notNull().default(false),

    // status — pending/approved/rejected
    status: txStatusEnum('status').notNull().default('pending'),

    // audit
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    // approval fields — nullable, populated when status changes
    approvedBy: uuid('approved_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),

    rejectedBy: uuid('rejected_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
  },
  (table) => ({
    branchIdx: index('tx_branch_idx').on(table.branchId),
    statusIdx: index('tx_status_idx').on(table.status),
    createdAtIdx: index('tx_created_at_idx').on(table.createdAt),
    branchStatusIdx: index('tx_branch_status_idx').on(
      table.branchId,
      table.status
    ),
  })
);

// ─── Notifications ───
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: notifTypeEnum('type').notNull(),
    title: text('title').notNull(),
    sub: text('sub').notNull(),
    time: text('time').notNull(), // human-friendly relative time
    read: boolean('read').notNull().default(false),
    txId: uuid('tx_id').references(() => transactions.id, {
      onDelete: 'cascade',
    }),

    // برای فیلتر بهتر در فاز ۱۰: notification به‌جای text matching
    // می‌تواند به user/branch مستقیم ارجاع داده شود.
    // فعلاً null تا backwards compat با فاز ۹ حفظ شود.
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'cascade',
    }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index('notif_user_idx').on(table.userId),
    txIdx: index('notif_tx_idx').on(table.txId),
    readIdx: index('notif_read_idx').on(table.read),
  })
);

// ─────────────────────────────────────────────────────────────────
// Relations — for type-safe joins with Drizzle
// ─────────────────────────────────────────────────────────────────

export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  transactions: many(transactions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  assignedBranch: one(branches, {
    fields: [users.assignedBranchId],
    references: [branches.id],
  }),
  createdTransactions: many(transactions, { relationName: 'createdBy' }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  branch: one(branches, {
    fields: [transactions.branchId],
    references: [branches.id],
  }),
  creator: one(users, {
    fields: [transactions.createdBy],
    references: [users.id],
    relationName: 'createdBy',
  }),
  approver: one(users, {
    fields: [transactions.approvedBy],
    references: [users.id],
    relationName: 'approvedBy',
  }),
  rejecter: one(users, {
    fields: [transactions.rejectedBy],
    references: [users.id],
    relationName: 'rejectedBy',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  transaction: one(transactions, {
    fields: [notifications.txId],
    references: [transactions.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// ─── App Settings (Dynamic Content) ──────────────────────────────
/**
 * جدول app_settings — ذخیره متن‌های قابل تنظیم UI.
 *
 * هر ردیف یک key/value است که SuperAdmin می‌تواند از Settings تغییر دهد.
 * داده‌ها در store cache می‌شوند و فقط هنگام bootstrap fetch می‌شوند.
 *
 * مثال:
 *   key: 'login.title'     → 'حسابداری شعب، ساده و یکجا'
 *   key: 'login.subtitle'  → 'سامانه یکپارچه مدیریت مالی'
 *   key: 'brand.name'      → 'با شرف'
 */
export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  /** label فارسی برای نمایش در Settings UI */
  label: text('label').notNull(),
  /** گروه‌بندی برای نمایش در Settings */
  group: text('group').notNull().default('general'),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type AppSetting = typeof appSettings.$inferSelect;

// ─── Audit Log ───────────────────────────────────────────────────
/**
 * جدول audit_log — ثبت همه عملیات مهم.
 *
 * چه چیزهایی ثبت می‌شوند:
 * - login موفق و ناموفق
 * - تغییر رمز
 * - تایید/رد تراکنش
 * - حذف کاربر یا تراکنش
 *
 * این log فقط append است — هیچ‌وقت حذف نمی‌شود.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** کاربری که عملیات را انجام داده (null برای failed login) */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    /** جزئیات اضافه (JSON) */
    meta: text('meta'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    actionIdx: index('audit_log_action_idx').on(table.action),
    userIdx: index('audit_log_user_idx').on(table.userId),
    createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
  })
);

export type AuditLogEntry = typeof auditLog.$inferSelect;

// ─── Accounts (صندوق‌ها و حساب‌های بانکی) ────────────────────────
/**
 * جدول accounts — صندوق‌های نقدی و حساب‌های بانکی.
 *
 * هر تراکنش approved باید به یک حساب وصل باشد:
 * - income: موجودی account_id بالا می‌رود
 * - expense: موجودی account_id پایین می‌رود
 * - transfer: account_id کم، destination_account_id زیاد می‌شود
 */
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull().default('cash'), // 'cash' | 'bank' | 'pos'
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Account = typeof accounts.$inferSelect;

// ─── Contacts (طرف‌حساب‌ها — بدهکار/بستانکار) ────────────────────
/**
 * جدول contacts — اشخاص و شرکت‌هایی که با ما معامله دارند.
 *
 * balance:
 *   مثبت  = او به ما بدهکار است (طلب ما)
 *   منفی  = ما به او بدهکار هستیم
 *
 * type:
 *   customer = مشتری (معمولاً بدهکار)
 *   supplier = تأمین‌کننده (معمولاً بستانکار)
 *   other    = سایر
 */
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull().default('customer'),
  phone: text('phone'),
  note: text('note'),
  balance: bigint('balance', { mode: 'number' }).notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;

// ─── Menu (منوی دیجیتال صفاسیتی) ─────────────────────────────────
/**
 * منوی دیجیتال دوزبانه — کاتالوگ نمایشی.
 * فعلاً تراکنش مالی نمی‌سازد (فقط نمایش).
 */
export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  labelEn: text('label_en').notNull(),
  labelFa: text('label_fa').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const menuItems = pgTable('menu_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').notNull().references(() => menuCategories.id, { onDelete: 'restrict' }),
  titleEn: text('title_en').notNull(),
  titleFa: text('title_fa').notNull(),
  descriptionEn: text('description_en').notNull().default(''),
  descriptionFa: text('description_fa').notNull().default(''),
  price: bigint('price', { mode: 'number' }).notNull().default(0),
  isAvailable: boolean('is_available').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const menuSettings = pgTable('menu_settings', {
  id: integer('id').primaryKey().default(1),
  faFont: text('fa_font').notNull().default('IRANMarker'),
  phone: text('phone').notNull().default(''),
  addressFa: text('address_fa').notNull().default(''),
  addressEn: text('address_en').notNull().default(''),
  instagram: text('instagram').notNull().default(''),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type MenuSettings = typeof menuSettings.$inferSelect;
