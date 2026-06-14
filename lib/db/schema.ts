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
  date,
  jsonb,
  numeric,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

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
export const userRoleEnum = pgEnum('user_role', ['SuperAdmin', 'BranchUser', 'Warehouse']);
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
    permissions: jsonb('permissions').$type<string[] | null>(),
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

    /**
     * متادیتای فروش منو (فقط type=income، فروش‌های ثبت‌شده از طریق منو):
     * { lines: [{ menuItemId, qty }], deductedAt?: ISOString }
     * با تأیید تراکنش، رسپی هر آیتم منو expand و کسر/COGS به‌صورت سیستمی اعمال می‌شود.
     * فیلد deductedAt جلوی کسر تکراری را می‌گیرد (idempotency).
     */
    saleMeta: jsonb('sale_meta'),

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

// ─── Recruitment (استخدام) ──────────────────────────────────────
export const applicationStatusEnum = pgEnum('application_status', [
  'new', 'shortlist', 'accepted', 'rejected',
]);
export const applicationAreaEnum = pgEnum('application_area', ['hall', 'kitchen']);
export const applicantGenderEnum = pgEnum('applicant_gender', ['male', 'female']);

export const jobApplications = pgTable(
  'job_applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    phone: text('phone').notNull(),
    age: integer('age'),
    gender: applicantGenderEnum('gender'),
    city: text('city'),
    hasResume: boolean('has_resume').notNull().default(false),
    resumeUrl: text('resume_url'),
    resumePath: text('resume_path'),
    manualInfo: text('manual_info'),
    answers: jsonb('answers').notNull().default({}),
    area: applicationAreaEnum('area'),
    status: applicationStatusEnum('status').notNull().default('new'),
    score: integer('score'),
    reviewerNote: text('reviewer_note'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index('job_applications_status_idx').on(table.status),
    createdIdx: index('job_applications_created_idx').on(table.createdAt),
  })
);

export type JobApplication = typeof jobApplications.$inferSelect;

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
  price: bigint('price', { mode: 'number' }),
  priceTakeaway: bigint('price_takeaway', { mode: 'number' }),
  inHall: boolean('in_hall').notNull().default(true),
  inTakeaway: boolean('in_takeaway').notNull().default(false),
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
  showPriceHall: boolean('show_price_hall').notNull().default(true),
  showPriceTakeaway: boolean('show_price_takeaway').notNull().default(true),
  takeawaySlug: text('takeaway_slug').notNull().default('birun'),
  hallTitle: text('hall_title'),
  takeawayTitle: text('takeaway_title'),
  hallNote: text('hall_note'),
  takeawayNote: text('takeaway_note'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type MenuSettings = typeof menuSettings.$inferSelect;

// ─── System Logs (سیستم لاگ مرکزی برای تحلیل) ───────────────────
/**
 * لاگ مرکزی رویدادها و خطاها.
 * برخلاف audit_log (که فقط اعمال کاربر را ثبت می‌کند)، این جدول
 * خطاهای سیستمی، اتصال دیتابیس، و رویدادهای فنی را هم نگه می‌دارد.
 *
 * level:
 *   error = خطا (خطای سرور، اتصال، استثنا)
 *   warn  = هشدار (تلاش ناموفق ورود، دسترسی غیرمجاز)
 *   info  = اطلاع (ورود موفق، عملیات مهم)
 */
export const systemLogs = pgTable(
  'system_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    level: text('level').notNull().default('info'),
    /** دسته رویداد: auth, db, api, transaction, ... */
    category: text('category').notNull().default('general'),
    /** پیام خوانا */
    message: text('message').notNull(),
    /** مسیر API یا صفحه */
    path: text('path'),
    /** متد HTTP */
    method: text('method'),
    /** کد وضعیت HTTP */
    statusCode: integer('status_code'),
    /** کاربر مرتبط (اگر لاگین بود) */
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    userEmail: text('user_email'),
    /** جزئیات اضافه (JSON string) */
    context: text('context'),
    /** stack trace خطا */
    stack: text('stack'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    levelIdx: index('logs_level_idx').on(t.level),
    categoryIdx: index('logs_category_idx').on(t.category),
    createdIdx: index('logs_created_idx').on(t.createdAt),
  })
);

export type SystemLog = typeof systemLogs.$inferSelect;
// ─── Payroll Enums (۸ عدد) ───────────────────────────────────────
export const employeeRoleEnum = pgEnum('employee_role', [
  'manager', 'chef', 'cook', 'waiter', 'cashier',
  'dishwasher', 'delivery', 'cleaner', 'other',
]);
export const payrollEventTypeEnum = pgEnum('payroll_event_type', [
  'advance', 'deduction', 'bonus', 'settlement',
]);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other']);
export const maritalStatusEnum = pgEnum('marital_status', ['single', 'married', 'other']);
export const insuranceStatusEnum = pgEnum('insurance_status', [
  'insured', 'uninsured', 'pending', 'exempt',
]);
export const documentTypeEnum = pgEnum('document_type', [
  'national_id_card', 'birth_certificate', 'health_card', 'contract',
  'insurance_doc', 'education', 'photo', 'other',
]);
export const payrollRunStatusEnum = pgEnum('payroll_run_status', [
  'draft', 'calculated', 'approved', 'posted',
]);
export const journalVoucherStatusEnum = pgEnum('journal_voucher_status', [
  'built', 'posted', 'reversed',
]);

// ─── employees — پرونده پرسنلی ────────────────────────────────────
export const employees = pgTable(
  'employees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    nationalId: text('national_id'),
    phone: text('phone').notNull(),
    role: text('role').notNull().default('other'),

    // ── repoint به branches هسته ──
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    branchName: text('branch_name'),

    // اطلاعات شخصی
    fatherName: text('father_name'),
    birthDate: date('birth_date', { mode: 'date' }),
    gender: genderEnum('gender'),
    maritalStatus: maritalStatusEnum('marital_status'),
    address: text('address'),
    emergencyContactName: text('emergency_contact_name'),
    emergencyContactPhone: text('emergency_contact_phone'),
    iban: text('iban'),
    bankAccount: text('bank_account'),

    // بیمه
    insuranceStatus: insuranceStatusEnum('insurance_status').notNull().default('uninsured'),
    insuranceNumber: text('insurance_number'),
    insuranceStartDate: date('insurance_start_date', { mode: 'date' }),

    // کارت بهداشت
    healthCardNumber: text('health_card_number'),
    healthCardIssueDate: date('health_card_issue_date', { mode: 'date' }),
    healthCardExpiryDate: date('health_card_expiry_date', { mode: 'date' }),

    // استخدام
    joinDate: date('join_date', { mode: 'date' }).notNull(),
    terminationDate: date('termination_date', { mode: 'date' }),

    // پول — bigint تومان صحیح (منطبق با هسته)
    baseMonthlySalary: bigint('base_monthly_salary', { mode: 'number' }).notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    nationalIdUniq: uniqueIndex('employees_national_id_uniq')
      .on(t.nationalId)
      .where(sql`${t.nationalId} IS NOT NULL`),
    activeIdx: index('employees_active_idx').on(t.isActive),
    nameIdx: index('employees_full_name_idx').on(t.fullName),
    branchIdx: index('employees_branch_idx').on(t.branchId),
  })
);

// ─── employee_documents — مدارک (metadata؛ فایل در storage) ───────
export const employeeDocuments = pgTable(
  'employee_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    type: documentTypeEnum('type').notNull(),
    title: text('title').notNull(),
    storagePath: text('storage_path').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type'),
    fileSize: bigint('file_size', { mode: 'number' }),
    expiryDate: date('expiry_date', { mode: 'date' }),
    // ── repoint به users هسته ──
    uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    employeeIdx: index('employee_documents_employee_idx').on(t.employeeId),
    typeIdx: index('employee_documents_type_idx').on(t.type),
  })
);

// ─── payroll_events — مساعده/کسری/پاداش/تسویه ────────────────────
export const payrollEvents = pgTable(
  'payroll_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'restrict' }),
    type: payrollEventTypeEnum('type').notNull(),
    amount: bigint('amount', { mode: 'number' }).notNull(),
    periodYearMonth: text('period_year_month').notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    description: text('description'),
    settlementMethod: text('settlement_method'),
    settledAmount: bigint('settled_amount', { mode: 'number' }),
    // ── repoint به users هسته ──
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    voidReason: text('void_reason'),
  },
  (t) => ({
    employeePeriodIdx: index('payroll_events_employee_period_idx').on(t.employeeId, t.periodYearMonth),
    periodIdx: index('payroll_events_period_idx').on(t.periodYearMonth),
    typeIdx: index('payroll_events_type_idx').on(t.type),
    oneActiveSettlement: uniqueIndex('payroll_events_one_active_settlement_per_month')
      .on(t.employeeId, t.periodYearMonth)
      .where(sql`voided_at IS NULL AND type = 'settlement'`),
  })
);

// ─── payroll_parameters — پارامترهای قانونی نسخه‌دار به سال شمسی ──
export const payrollParameters = pgTable('payroll_parameters', {
  id: uuid('id').primaryKey().defaultRandom(),
  jalaliYear: integer('jalali_year').notNull().unique(),
  minDailyWage: bigint('min_daily_wage', { mode: 'number' }).notNull(),
  minMonthlyWage: bigint('min_monthly_wage', { mode: 'number' }).notNull(),
  housingAllowance: bigint('housing_allowance', { mode: 'number' }).notNull(),
  groceryAllowance: bigint('grocery_allowance', { mode: 'number' }).notNull(),
  marriageAllowance: bigint('marriage_allowance', { mode: 'number' }).notNull(),
  seniorityDaily: bigint('seniority_daily', { mode: 'number' }).notNull(),
  childAllowancePer: bigint('child_allowance_per', { mode: 'number' }).notNull(),
  taxExemptMonthly: bigint('tax_exempt_monthly', { mode: 'number' }).notNull(),
  taxBrackets: jsonb('tax_brackets').notNull(),
  insuranceEmployeeRate: numeric('insurance_employee_rate', { precision: 5, scale: 4 }).notNull(),
  insuranceEmployerRate: numeric('insurance_employer_rate', { precision: 5, scale: 4 }).notNull(),
  overtimeMultiplier: numeric('overtime_multiplier', { precision: 4, scale: 2 }).notNull(),
  nightShiftPremium: numeric('night_shift_premium', { precision: 4, scale: 2 }).notNull(),
  holidayMultiplier: numeric('holiday_multiplier', { precision: 4, scale: 2 }).notNull(),
  childMinInsuranceDays: integer('child_min_insurance_days').notNull().default(720),
  standardMonthlyHours: numeric('standard_monthly_hours', { precision: 6, scale: 2 }).notNull().default('192'),
  effectiveFrom: date('effective_from', { mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── payroll_runs — اجرای حقوق یک دوره ───────────────────────────
export const payrollRuns = pgTable(
  'payroll_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // ── repoint به branches هسته ──
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    branchName: text('branch_name'),
    periodYearMonth: text('period_year_month').notNull(),
    parametersId: uuid('parameters_id').notNull().references(() => payrollParameters.id),
    status: payrollRunStatusEnum('status').notNull().default('draft'),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }),
    // ── repoint به users هسته ──
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    postedToBasharafAt: timestamp('posted_to_basharaf_at', { withTimezone: true }),
    journalVoucherId: uuid('journal_voucher_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    branchPeriodUniq: uniqueIndex('payroll_runs_branch_period_uniq').on(t.branchId, t.periodYearMonth),
    periodIdx: index('payroll_runs_period_idx').on(t.periodYearMonth),
  })
);

// ─── payslips — فیش حقوقی هر کارمند در هر اجرا ────────────────────
export const payslips = pgTable(
  'payslips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
    employeeId: uuid('employee_id').notNull().references(() => employees.id, { onDelete: 'restrict' }),
    periodYearMonth: text('period_year_month').notNull(),
    workedDays: numeric('worked_days', { precision: 5, scale: 2 }).notNull(),
    grossEarnings: bigint('gross_earnings', { mode: 'number' }).notNull(),
    taxableBase: bigint('taxable_base', { mode: 'number' }).notNull(),
    insuranceBase: bigint('insurance_base', { mode: 'number' }).notNull(),
    insuranceEmployee: bigint('insurance_employee', { mode: 'number' }).notNull(),
    insuranceEmployer: bigint('insurance_employer', { mode: 'number' }).notNull(),
    incomeTax: bigint('income_tax', { mode: 'number' }).notNull(),
    totalDeductions: bigint('total_deductions', { mode: 'number' }).notNull(),
    netPay: bigint('net_pay', { mode: 'number' }).notNull(),
    calcSnapshot: jsonb('calc_snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    runIdx: index('payslips_run_idx').on(t.payrollRunId),
    employeePeriodIdx: index('payslips_employee_period_idx').on(t.employeeId, t.periodYearMonth),
  })
);

// ─── journal_vouchers — سند کل (posting به GL: مرحله‌ی بعد) ───────
export const journalVouchers = pgTable('journal_vouchers', {
  id: uuid('id').primaryKey().defaultRandom(),
  payrollRunId: uuid('payroll_run_id').notNull().references(() => payrollRuns.id, { onDelete: 'cascade' }),
  period: text('period').notNull(),
  // ── repoint به branches هسته (set null) ──
  branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
  lines: jsonb('lines').notNull(),
  totalDebit: bigint('total_debit', { mode: 'number' }).notNull(),
  totalCredit: bigint('total_credit', { mode: 'number' }).notNull(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  basharafVoucherId: text('basharaf_voucher_id'),
  status: journalVoucherStatusEnum('status').notNull().default('built'),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Types ───────────────────────────────────────────────────────
export type Employee = typeof employees.$inferSelect;
export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type PayrollEvent = typeof payrollEvents.$inferSelect;
export type PayrollParameter = typeof payrollParameters.$inferSelect;
export type PayrollRun = typeof payrollRuns.$inferSelect;
export type Payslip = typeof payslips.$inferSelect;
export type JournalVoucher = typeof journalVouchers.$inferSelect;
// ─── Inventory Enums (۵ عدد) ─────────────────────────────────────
export const invItemKindEnum = pgEnum('inv_item_kind', ['raw', 'prep']);
//   raw  = ماده خام (از خرید وارد می‌شود)
//   prep = نیمه‌آماده (از تولید ساخته می‌شود؛ prepRecipe دارد)

export const invVoucherKindEnum = pgEnum('inv_voucher_kind', [
  'in',       // رسید ورود
  'out',      // حواله خروج/مصرف
  'waste',    // ضایعات
  'sale',     // مصرف ناشی از فروش روزانه
  'produce',  // تولید نیمه‌آماده
  'stocktake',// اصلاح انبارگردانی
]);

// منطبق با txStatusEnum هسته (همان Maker-Checker)
export const invVoucherStatusEnum = pgEnum('inv_voucher_status', [
  'pending',  // ثبت انباردار، در انتظار حسابدار — فقط موجودی فیزیکی
  'approved', // تأیید حسابدار — موجودی قطعی + میانگین موزون
  'rejected', // ارجاع با دلیل
]);

export const invUnitEnum = pgEnum('inv_unit', [
  'kg', 'g', 'L', 'ml', 'pcs', 'can', 'pack',
]);

export const invCookModeEnum = pgEnum('inv_cook_mode', ['daily', 'batch']);
//   daily = روزانه تازه (به‌سفارش، ماندگاری ۱ روز)
//   batch = دسته‌ای (قابل نگهداری چند روز)

// ─── inv_items — کالا (خام و نیمه‌آماده) ──────────────────────────
export const invItems = pgTable(
  'inv_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),            // کد یکتا در هر شعبه (MEAT-01)
    name: text('name').notNull(),
    category: text('category').notNull().default('سایر'),
    kind: invItemKindEnum('kind').notNull().default('raw'),

    // ── repoint به branches هسته ──
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),

    // واحد طبیعی + ضریب تبدیل به پایه
    unit: invUnitEnum('unit').notNull().default('kg'),
    basePerUnit: numeric('base_per_unit', { precision: 14, scale: 4 }).notNull().default('1000'),

    // افت بار (درصد قابل‌استفاده): ۱۰۰ یعنی بدون افت
    yieldPct: numeric('yield_pct', { precision: 5, scale: 2 }).notNull().default('100'),

    // موجودی دو لایه (واحد پایه)
    //   qtyPhysical = فیزیکی (با ثبت انباردار فوری آپدیت)
    //   qtyBase     = قطعی (فقط با تأیید حسابدار)
    qtyPhysical: numeric('qty_physical', { precision: 16, scale: 4 }).notNull().default('0'),
    qtyBase: numeric('qty_base', { precision: 16, scale: 4 }).notNull().default('0'),

    // میانگین موزون — ریال/تومان هر واحد پایه (numeric برای دقت اعشاری)
    // precision=24 (به‌جای ۱۸) تا داده‌ی خراب/بزرگ (مثلاً avgCost اشتباهاً وارد شده در حد میلیاردها)
    // هنگام ضرب در qtyBase باعث «numeric field overflow» نشود — سقف امن تا ~10^18.
    avgCostPerBase: numeric('avg_cost_per_base', { precision: 24, scale: 6 }).notNull().default('0'),

    // حداقل موجودی برای هشدار (واحد پایه)
    minBase: numeric('min_base', { precision: 16, scale: 4 }).notNull().default('0'),

    // فقط نیمه‌آماده‌ها:
    batchYieldBase: numeric('batch_yield_base', { precision: 16, scale: 4 }), // مقدار هر بَچ
    shelfLifeDays: integer('shelf_life_days').notNull().default(1),           // ماندگاری
    // دستور تولید نیمه‌آماده: [{ code, qtyBase }] — JSON ساده
    prepRecipe: jsonb('prep_recipe'),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchCodeUniq: uniqueIndex('inv_items_branch_code_uniq').on(t.branchId, t.code),
    kindIdx: index('inv_items_kind_idx').on(t.kind),
    branchIdx: index('inv_items_branch_idx').on(t.branchId),
    activeIdx: index('inv_items_active_idx').on(t.isActive),
  })
);

// ─── inv_recipes — رسپی غذاها ─────────────────────────────────────
export const invRecipes = pgTable(
  'inv_recipes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),

    portions: integer('portions').notNull().default(1),       // تعداد پرس هر پخت
    targetFcPct: numeric('target_fc_pct', { precision: 5, scale: 2 }).notNull().default('30'),
    price: bigint('price', { mode: 'number' }).notNull().default(0), // قیمت فروش (تومان)

    cookMode: invCookModeEnum('cook_mode').notNull().default('daily'),
    shelfLifeDays: integer('shelf_life_days').notNull().default(1),

    // اتصال اختیاری به آیتم منوی دیجیتال موجود (menu_items هسته)
    menuItemId: uuid('menu_item_id').references(() => menuItems.id, { onDelete: 'set null' }),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchIdx: index('inv_recipes_branch_idx').on(t.branchId),
    activeIdx: index('inv_recipes_active_idx').on(t.isActive),
  })
);

// ─── inv_recipe_lines — مواد هر رسپی ──────────────────────────────
export const invRecipeLines = pgTable(
  'inv_recipe_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    recipeId: uuid('recipe_id').notNull().references(() => invRecipes.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull().references(() => invItems.id, { onDelete: 'restrict' }),
    qtyBase: numeric('qty_base', { precision: 16, scale: 4 }).notNull(), // مقدار (واحد پایه) هر پخت
    overridePct: numeric('override_pct', { precision: 5, scale: 2 }),    // افت override (اختیاری)
  },
  (t) => ({
    recipeIdx: index('inv_recipe_lines_recipe_idx').on(t.recipeId),
    itemIdx: index('inv_recipe_lines_item_idx').on(t.itemId),
  })
);

// ─── inv_vouchers — برگه (Maker-Checker) ──────────────────────────
/**
 * برگه = سند مقداری انبار. انباردار ثبت می‌کند (pending، فقط فیزیکی)،
 * حسابدار قیمت نهایی می‌زند و تأیید می‌کند (approved، قطعی + میانگین موزون).
 * این دقیقاً همان state machine تراکنش‌های هسته است.
 *
 * invariant: موجودی قطعی (qtyBase) و میانگین موزون فقط روی approved تغییر می‌کند.
 * هر approve/reject باید atomic باشد (مثل balanceHelpers هسته).
 */
export const invVouchers = pgTable(
  'inv_vouchers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    no: text('no').notNull(),                 // شماره خوانا (R-140304-001)
    kind: invVoucherKindEnum('kind').notNull(),
    status: invVoucherStatusEnum('status').notNull().default('pending'),

    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),

    // مبالغ (تومان) — برآوردی هنگام ثبت، نهایی هنگام تأیید
    estTotal: bigint('est_total', { mode: 'number' }).notNull().default(0),
    finalTotal: bigint('final_total', { mode: 'number' }),

    note: text('note').notNull().default(''),

    // متادیتای فروش (فقط kind=sale): { lines:[{recipeId,name,qty,price}], revenue, date }
    saleMeta: jsonb('sale_meta'),

    // ── Maker (انباردار) ──
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    makerDate: text('maker_date').notNull(),  // Jalali string
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),

    // ── Checker (حسابدار) ──
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectedBy: uuid('rejected_by').references(() => users.id, { onDelete: 'set null' }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),

    // اتصال اختیاری به تراکنش مالی هسته (وقتی برگه به سند مالی تبدیل شد)
    linkedTransactionId: uuid('linked_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),

    // برگه‌ی اصلی که این برگه اصلاحی (reversal) آن است — فقط برای برگه‌های reversal مقدار دارد
    parentVoucherId: uuid('parent_voucher_id').references((): AnyPgColumn => invVouchers.id),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchNoUniq: uniqueIndex('inv_vouchers_branch_no_uniq').on(t.branchId, t.no),
    statusIdx: index('inv_vouchers_status_idx').on(t.status),
    kindIdx: index('inv_vouchers_kind_idx').on(t.kind),
    branchStatusIdx: index('inv_vouchers_branch_status_idx').on(t.branchId, t.status),
  })
);

// ─── inv_voucher_lines — خطوط هر برگه ─────────────────────────────
export const invVoucherLines = pgTable(
  'inv_voucher_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voucherId: uuid('voucher_id').notNull().references(() => invVouchers.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id').notNull().references(() => invItems.id, { onDelete: 'restrict' }),
    qtyBase: numeric('qty_base', { precision: 16, scale: 4 }).notNull(),
    // قیمت هر واحد پایه: برآوردی (انباردار) و نهایی (حسابدار)
    // precision=24 (هم‌سو با inv_items.avg_cost_per_base) — جلوگیری از numeric field overflow
    // وقتی هزینه‌ی واحد بزرگ/خراب در qtyBase ضرب می‌شود.
    estUnitCost: numeric('est_unit_cost', { precision: 24, scale: 6 }).notNull().default('0'),
    finalUnitCost: numeric('final_unit_cost', { precision: 24, scale: 6 }),
    // ردیابی/انقضا (زمینه‌ساز FIFO آینده): تاریخ انقضای محموله — رشته‌ی جلالی، اختیاری
    expiryDate: text('expiry_date'),
  },
  (t) => ({
    voucherIdx: index('inv_voucher_lines_voucher_idx').on(t.voucherId),
    itemIdx: index('inv_voucher_lines_item_idx').on(t.itemId),
  })
);

// ─── inv_stock_tx — دفتر حرکت موجودی (لاگ) ────────────────────────
/**
 * هر ورود/خروج قطعی یک ردیف اینجا ثبت می‌کند (مثل دفتر کل برای انبار).
 * grams مثبت = ورود، منفی = خروج. value به تومان.
 */
export const invStockTx = pgTable(
  'inv_stock_tx',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id').notNull().references(() => invItems.id, { onDelete: 'cascade' }),
    voucherId: uuid('voucher_id').references(() => invVouchers.id, { onDelete: 'set null' }),
    kind: invVoucherKindEnum('kind').notNull(),
    deltaBase: numeric('delta_base', { precision: 16, scale: 4 }).notNull(), // +ورود / -خروج
    value: bigint('value', { mode: 'number' }).notNull().default(0),         // تومان
    note: text('note').notNull().default(''),
    // ردیابی/انقضا: از خط برگه به دفتر کل حرکت موجودی منتقل می‌شود (زمینه‌ساز FIFO آینده)
    expiryDate: text('expiry_date'),
    jalaliDate: text('jalali_date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    itemIdx: index('inv_stock_tx_item_idx').on(t.itemId),
    createdIdx: index('inv_stock_tx_created_idx').on(t.createdAt),
  })
);

// ─── inv_daily_sales — گزارش فروش روزانه (تأییدشده) ───────────────
/**
 * وقتی برگه‌ی فروش (kind=sale) تأیید شد، یک ردیف اینجا ثبت می‌شود
 * تا گزارش فروش/سود ساخته شود. COGS نهایی از میانگین موزون لحظه تأیید.
 */
export const invDailySales = pgTable(
  'inv_daily_sales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    voucherId: uuid('voucher_id').references(() => invVouchers.id, { onDelete: 'set null' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    jalaliDate: text('jalali_date').notNull(),
    // خطوط: [{ recipeId, name, qty, price, cogs }]
    lines: jsonb('lines').notNull(),
    totalCogs: bigint('total_cogs', { mode: 'number' }).notNull().default(0),
    totalRevenue: bigint('total_revenue', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    branchDateIdx: index('inv_daily_sales_branch_date_idx').on(t.branchId, t.jalaliDate),
  })
);

// ─── Types ───────────────────────────────────────────────────────
export type InvItem = typeof invItems.$inferSelect;
export type InvRecipe = typeof invRecipes.$inferSelect;
export type InvRecipeLine = typeof invRecipeLines.$inferSelect;
export type InvVoucher = typeof invVouchers.$inferSelect;
export type InvVoucherLine = typeof invVoucherLines.$inferSelect;
export type InvStockTx = typeof invStockTx.$inferSelect;
export type InvDailySale = typeof invDailySales.$inferSelect;

// ════════════════════════════════════════════════════════════════
// ماژول مشتریان — customers / loyalty / coupons / reservations / feedback
// پول bigint تومان. type/status متنی با کامنت مقادیر مجاز. تاریخ کاربری شمسی text.
// ════════════════════════════════════════════════════════════════

export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    phone: text('phone').notNull(),
    birthday: text('birthday'), // Jalali string
    homeBranchId: uuid('home_branch_id').references(() => branches.id, { onDelete: 'set null' }),
    /** برای مشتریان دارای حساب نسیه → contacts هسته */
    contactId: uuid('contact_id').references(() => contacts.id, { onDelete: 'set null' }),
    tier: text('tier').notNull().default('bronze'), // bronze | silver | gold | platinum
    points: bigint('points', { mode: 'number' }).notNull().default(0),
    visitCount: integer('visit_count').notNull().default(0),
    totalSpent: bigint('total_spent', { mode: 'number' }).notNull().default(0),
    note: text('note'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    phoneUniq: uniqueIndex('customers_phone_uniq').on(t.phone),
    branchIdx: index('customers_branch_idx').on(t.homeBranchId),
    activeIdx: index('customers_active_idx').on(t.isActive),
  })
);

// customers.points مانده‌ی denormalized است؛ فقط با helper اتمیک تغییر می‌کند.
export const loyaltyEntries = pgTable(
  'loyalty_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    type: text('type').notNull(), // earn | redeem | adjust
    points: integer('points').notNull(), // +earn / -redeem / ±adjust
    reason: text('reason').notNull().default(''),
    refTransactionId: uuid('ref_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    customerIdx: index('loyalty_entries_customer_idx').on(t.customerId),
    branchIdx: index('loyalty_entries_branch_idx').on(t.branchId),
    createdIdx: index('loyalty_entries_created_idx').on(t.createdAt),
  })
);

// branch_id = null یعنی همه شعب
export const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    discountType: text('discount_type').notNull(), // percent | fixed
    value: bigint('value', { mode: 'number' }).notNull(),
    minOrder: bigint('min_order', { mode: 'number' }).notNull().default(0),
    maxDiscount: bigint('max_discount', { mode: 'number' }),
    validFrom: text('valid_from').notNull(), // Jalali string
    validTo: text('valid_to').notNull(),     // Jalali string
    usageLimit: integer('usage_limit'),
    usedCount: integer('used_count').notNull().default(0),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    codeUniq: uniqueIndex('coupons_code_uniq').on(t.code),
    branchIdx: index('coupons_branch_idx').on(t.branchId),
    activeIdx: index('coupons_active_idx').on(t.isActive),
  })
);

export const couponRedemptions = pgTable(
  'coupon_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    couponId: uuid('coupon_id').notNull().references(() => coupons.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    discountAmount: bigint('discount_amount', { mode: 'number' }).notNull(),
    refTransactionId: uuid('ref_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    couponIdx: index('coupon_redemptions_coupon_idx').on(t.couponId),
    customerIdx: index('coupon_redemptions_customer_idx').on(t.customerId),
    branchIdx: index('coupon_redemptions_branch_idx').on(t.branchId),
  })
);

// جدول DB اسمش `tables` است؛ export را restaurantTables گذاشتم تا با کلمه‌ی رایج TS تداخل نکند.
export const restaurantTables = pgTable(
  'tables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    capacity: integer('capacity').notNull().default(0),
    area: text('area'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    branchIdx: index('tables_branch_idx').on(t.branchId),
  })
);

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    tableId: uuid('table_id').references(() => restaurantTables.id, { onDelete: 'set null' }),
    date: text('date').notNull(), // Jalali string
    time: text('time').notNull(),
    partySize: integer('party_size').notNull().default(1),
    status: text('status').notNull().default('pending'), // pending|confirmed|seated|cancelled|no_show
    note: text('note'),
    createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    branchIdx: index('reservations_branch_idx').on(t.branchId),
    customerIdx: index('reservations_customer_idx').on(t.customerId),
    statusIdx: index('reservations_status_idx').on(t.status),
    branchDateIdx: index('reservations_branch_date_idx').on(t.branchId, t.date),
  })
);

export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    rating: integer('rating').notNull(), // 1..5
    comment: text('comment'),
    source: text('source').notNull().default('in_store'),
    refTransactionId: uuid('ref_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    branchIdx: index('feedback_branch_idx').on(t.branchId),
    customerIdx: index('feedback_customer_idx').on(t.customerId),
    createdIdx: index('feedback_created_idx').on(t.createdAt),
  })
);

export type Customer = typeof customers.$inferSelect;
export type LoyaltyEntry = typeof loyaltyEntries.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type CouponRedemption = typeof couponRedemptions.$inferSelect;
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;

// ════════════════════════════════════════════════════════════════
// ماژول عملیات — Operations: سفارش خرید، تجهیزات/نگهداری، وظایف
// تطبیق سه‌ضلعی: purchase_orders <-> inv_vouchers (GRN) <-> transactions (پرداخت)
// پول bigint تومان. تاریخ کاربری شمسی text.
// ════════════════════════════════════════════════════════════════

// ─── Operations Enums ────────────────────────────────────────────
export const poStatusEnum = pgEnum('po_status', [
  'draft', 'sent', 'partial', 'received', 'cancelled',
]);
export const equipmentStatusEnum = pgEnum('equipment_status', [
  'active', 'maintenance', 'retired',
]);
export const maintTypeEnum = pgEnum('maint_type', [
  'preventive', 'corrective', 'inspection',
]);
export const taskStatusEnum = pgEnum('task_status', [
  'pending', 'done', 'skipped',
]);

// ─── purchase_orders — سفارش خرید ─────────────────────────────────
// تأمین‌کننده = contacts با type='supplier'. تطبیق سه‌ضلعی با
// ref_inv_voucher_id (برگه‌ی in/GRN) و ref_transaction_id (پرداخت).
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    no: text('no').notNull(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    supplierId: uuid('supplier_id').references(() => contacts.id, { onDelete: 'set null' }),
    status: poStatusEnum('status').notNull().default('draft'),
    expectedDate: text('expected_date'), // Jalali string
    note: text('note').notNull().default(''),
    estTotal: bigint('est_total', { mode: 'number' }).notNull().default(0),
    finalTotal: bigint('final_total', { mode: 'number' }),
    refTransactionId: uuid('ref_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    refInvVoucherId: uuid('ref_inv_voucher_id').references(() => invVouchers.id, { onDelete: 'set null' }),
    receivedBy: uuid('received_by').references(() => users.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchNoUniq: uniqueIndex('po_branch_no_uidx').on(t.branchId, t.no),
    branchIdx: index('po_branch_idx').on(t.branchId),
    supplierIdx: index('po_supplier_idx').on(t.supplierId),
    statusIdx: index('po_status_idx').on(t.status),
  })
);

// ─── purchase_order_items — اقلام سفارش خرید ──────────────────────
export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    inventoryItemId: uuid('inventory_item_id').references(() => invItems.id, { onDelete: 'set null' }),
    description: text('description').notNull().default(''),
    qty: numeric('qty', { precision: 16, scale: 4 }).notNull().default('0'),
    unitCost: bigint('unit_cost', { mode: 'number' }).notNull().default(0),
    totalCost: bigint('total_cost', { mode: 'number' }).notNull().default(0),
  },
  (t) => ({
    orderIdx: index('poi_order_idx').on(t.orderId),
    itemIdx: index('poi_item_idx').on(t.inventoryItemId),
  })
);

// ─── equipment — تجهیزات ───────────────────────────────────────────
export const equipment = pgTable(
  'equipment',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    category: text('category').notNull().default('general'),
    status: equipmentStatusEnum('status').notNull().default('active'),
    purchaseDate: text('purchase_date'), // Jalali string
    purchaseCost: bigint('purchase_cost', { mode: 'number' }).notNull().default(0),
    warrantyExpiry: text('warranty_expiry'), // Jalali string
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchCodeUniq: uniqueIndex('equipment_branch_code_uidx').on(t.branchId, t.code),
    branchIdx: index('equipment_branch_idx').on(t.branchId),
    statusIdx: index('equipment_status_idx').on(t.status),
  })
);

// ─── maintenance_logs — سوابق نگهداری/تعمیر ───────────────────────
export const maintenanceLogs = pgTable(
  'maintenance_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    equipmentId: uuid('equipment_id').notNull().references(() => equipment.id, { onDelete: 'cascade' }),
    type: maintTypeEnum('type').notNull().default('preventive'),
    date: text('date').notNull(), // Jalali string
    cost: bigint('cost', { mode: 'number' }).notNull().default(0),
    vendor: text('vendor'),
    note: text('note').notNull().default(''),
    refTransactionId: uuid('ref_transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    equipmentIdx: index('mlog_equipment_idx').on(t.equipmentId),
    dateIdx: index('mlog_date_idx').on(t.date),
  })
);

// ─── task_templates — قالب وظایف روزانه/دوره‌ای ───────────────────
// branchId خالی یعنی برای همه شعب.
export const taskTemplates = pgTable(
  'task_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
    category: text('category').notNull().default('ops'),
    assignedRole: text('assigned_role').notNull().default('BranchUser'),
    frequency: text('frequency').notNull().default('daily'),
    estimatedMinutes: integer('estimated_minutes').notNull().default(0),
    checklistJson: jsonb('checklist_json'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchIdx: index('tmpl_branch_idx').on(t.branchId),
    activeIdx: index('tmpl_active_idx').on(t.isActive),
  })
);

// ─── task_instances — نمونه‌های اجرای وظیفه (هر روز/دوره) ─────────
export const taskInstances = pgTable(
  'task_instances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    templateId: uuid('template_id').references(() => taskTemplates.id, { onDelete: 'set null' }),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    dueDate: text('due_date').notNull(), // Jalali string
    completedAt: timestamp('completed_at', { withTimezone: true }),
    status: taskStatusEnum('status').notNull().default('pending'),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchIdx: index('tinst_branch_idx').on(t.branchId),
    templateIdx: index('tinst_template_idx').on(t.templateId),
    statusIdx: index('tinst_status_idx').on(t.status),
    dueIdx: index('tinst_due_idx').on(t.dueDate),
  })
);

// ─── Types ───────────────────────────────────────────────────────
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type Equipment = typeof equipment.$inferSelect;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type TaskTemplate = typeof taskTemplates.$inferSelect;
export type TaskInstance = typeof taskInstances.$inferSelect;

// ════════════════════════════════════════════════════════════════
// ماژول سفارش بیرون‌بر — Ordering: ارسال + پیکاپ، نقدی + آنلاین، guest checkout
// کاتالوگ = کانال بیرونِ منوی موجود (menu_items با in_takeaway=true).
// طبق قرارداد پروژه: بدون pgEnum — service_type/pay_method/pay_status به‌صورت
// text با CHECK constraint در migration. status بدون CHECK (state machine
// در لایه‌ی اپ؛ order_events تاریخچه‌ی تغییر وضعیت را نگه می‌دارد).
// پول bigint تومان. تاریخ کاربری شمسی text.
// ════════════════════════════════════════════════════════════════

// ─── ord_settings — تنظیمات سفارش بیرون‌بر هر شعبه (یک ردیف به ازای هر شعبه) ───
export const ordSettings = pgTable(
  'ord_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    isOpen: boolean('is_open').notNull().default(true),
    openTime: text('open_time').notNull().default('09:00'),
    closeTime: text('close_time').notNull().default('23:00'),
    deliveryEnabled: boolean('delivery_enabled').notNull().default(true),
    pickupEnabled: boolean('pickup_enabled').notNull().default(true),
    payCash: boolean('pay_cash').notNull().default(true),
    payOnline: boolean('pay_online').notNull().default(false),
    minOrder: bigint('min_order', { mode: 'number' }).notNull().default(0),
    prepBufferMin: integer('prep_buffer_min').notNull().default(30),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchUidx: uniqueIndex('ord_settings_branch_uidx').on(t.branchId),
  })
);

// ─── ord_zones — محدوده‌های ارسال نام‌دار + هزینه ──────────────────
export const ordZones = pgTable(
  'ord_zones',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    deliveryFee: bigint('delivery_fee', { mode: 'number' }).notNull(),
    minOrder: bigint('min_order', { mode: 'number' }).notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    branchIdx: index('ord_zones_branch_idx').on(t.branchId),
  })
);

// ─── orders — سفارش بیرون‌بر (ارسال/پیکاپ، نقدی/آنلاین، guest checkout) ───
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    branchId: uuid('branch_id').notNull().references(() => branches.id, { onDelete: 'restrict' }),
    orderNo: text('order_no').notNull(),
    trackToken: text('track_token').notNull(),
    serviceType: text('service_type').notNull(), // delivery | pickup — CHECK در migration
    status: text('status').notNull().default('received'), // received|... (بدون CHECK — order_events تاریخچه را نگه می‌دارد)
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    address: text('address'),
    zoneId: uuid('zone_id').references(() => ordZones.id, { onDelete: 'set null' }),
    subtotal: bigint('subtotal', { mode: 'number' }).notNull(),
    deliveryFee: bigint('delivery_fee', { mode: 'number' }).notNull().default(0),
    discount: bigint('discount', { mode: 'number' }).notNull().default(0),
    total: bigint('total', { mode: 'number' }).notNull(),
    payMethod: text('pay_method').notNull(), // cash | online — CHECK در migration
    payStatus: text('pay_status').notNull().default('unpaid'), // unpaid|paid|failed|refunded — CHECK در migration
    payRef: text('pay_ref'),
    pickupTime: text('pickup_time'), // فقط pickup — زمان دریافت دلخواه مشتری
    clientToken: text('client_token'), // idempotency key از /order/checkout
    jalaliDate: text('jalali_date').notNull(),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (t) => ({
    orderNoUidx: uniqueIndex('orders_order_no_uidx').on(t.orderNo),
    trackTokenUidx: uniqueIndex('orders_track_token_uidx').on(t.trackToken),
    clientTokenUidx: uniqueIndex('orders_client_token_uidx').on(t.clientToken),
    branchStatusIdx: index('orders_branch_status_idx').on(t.branchId, t.status),
  })
);

// ─── order_lines — اقلام سفارش (snapshot از menu_items هنگام ثبت) ─
export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    itemName: text('item_name').notNull(),
    unitPrice: bigint('unit_price', { mode: 'number' }).notNull(),
    qty: integer('qty').notNull(),
    lineTotal: bigint('line_total', { mode: 'number' }).notNull(),
  },
  (t) => ({
    orderIdx: index('order_lines_order_idx').on(t.orderId),
  })
);

// ─── order_events — تاریخچه‌ی تغییر وضعیت سفارش ────────────────────
export const orderEvents = pgTable(
  'order_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdx: index('order_events_order_idx').on(t.orderId),
  })
);

// ─── Types ───
export type OrdSettings = typeof ordSettings.$inferSelect;
export type OrdZone = typeof ordZones.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderLine = typeof orderLines.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
