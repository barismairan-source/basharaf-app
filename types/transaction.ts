export type TransactionType = 'income' | 'expense' | 'transfer';

/**
 * نوع تراکنش — درآمد یا هزینه
 */


/**
 * وضعیت تراکنش — قلب موتور مالی
 *
 * - pending: تازه ثبت شده توسط BranchUser، در انتظار تایید
 * - approved: تایید شده توسط SuperAdmin → روی موجودی اثر می‌گذارد
 * - rejected: رد شده توسط SuperAdmin → روی موجودی اثر ندارد،
 *             با `rejectionReason` همراه است
 */
export type TransactionStatus = 'pending' | 'approved' | 'rejected' | 'proforma';

/**
 * یک دسته‌بندی درآمد یا هزینه
 */
export interface Category {
  id: string;
  name: string;
  isSetup: boolean;
}

export interface CategorySet {
  income: Category[];
  expense: Category[];
}

/**
 * یک روش پرداخت (نقد، کارت، چک، ...)
 */
export interface PaymentMethod {
  id: string;
  name: string;
}

/**
 * ─────────────────────────────────────────────────────────────────
 * Audit trail — برای ردیابی تغییرات و sync با backend
 *
 * این فیلدها در پروتوتایپ نبودند ولی برای فاز ۱۰ (backend) ضروری‌اند:
 * - createdAt/updatedAt: کنترل تغییرات (optimistic concurrency)
 * - createdBy: چه کسی ثبت کرد
 * - approvedBy/rejectedBy + at: چه کسی، چه زمانی، چرا
 * ───────────────────────────────────────────────────────────────── */
interface AuditFields {
  /** ISO 8601 timestamp - زمان ثبت تراکنش (UTC) */
  createdAt: string;
  /** ISO 8601 timestamp - آخرین به‌روزرسانی */
  updatedAt: string;
  /** user.id کسی که تراکنش را ثبت کرد */
  createdBy: string;
}

/**
 * فیلدهای مشترک هر تراکنش، صرف‌نظر از وضعیت
 */
interface TransactionBase extends AuditFields {
  id: string;
  type: TransactionType;
  title: string;
  /** category.id */
  category: string;
  /** نام دسته در زمان ثبت تراکنش — denormalized تا اگر دسته بعداً حذف شد، تراکنش معنا داشته باشد */
  categoryName: string;
  /** مبلغ به تومان، به‌صورت عدد خام (بدون فرمت) */
  amount: number;
  /** طرف معامله — نام شخص/شرکت */
  payee: string;
  /** branch.id */
  branchId: string;
  /** نام شعبه — denormalized مشابه categoryName */
  branch: string;
  /** نام روش پرداخت */
  method: string;
  /** شماره رسید/فیش — '—' اگر نداشته باشد */
  receipt: string;
  /** تاریخ شمسی به شکل رشته 'YYYY/MM/DD' با ارقام فارسی (تاریخ تراکنش، نه ثبت) */
  date: string;
  /** یادداشت اختیاری */
  note: string;
  /** آیا فایل پیوست دارد؟ */
  hasReceipt: boolean;
  /** شماره فاکتور/پیش‌فاکتور — null اگر وارد نشده باشد */
  invoiceCode?: string | null;
  /** طرف‌حساب مرتبط — null اگر وارد نشده باشد */
  contactId?: string | null;
}

/**
 * تراکنش — discriminated union روی وضعیت.
 *
 * چرا discriminated؟ چون audit fields متفاوتی برای هر وضعیت معنی دارند:
 * - approved → approvedBy + approvedAt
 * - rejected → rejectedBy + rejectedAt + rejectionReason
 * - pending → هیچکدام (هنوز بررسی نشده)
 *
 * این invariant را در تایپ می‌بندیم تا کد نتواند به اشتباه فیلدهای
 * یک وضعیت را به وضعیت دیگری اعمال کند.
 */
export type Transaction =
  | (TransactionBase & { status: 'pending' })
  | (TransactionBase & { status: 'proforma' })
  | (TransactionBase & {
      status: 'approved';
      /** user.id کسی که تایید کرد */
      approvedBy: string;
      /** ISO timestamp تایید */
      approvedAt: string;
    })
  | (TransactionBase & {
      status: 'rejected';
      /** user.id کسی که رد کرد */
      rejectedBy: string;
      /** ISO timestamp رد */
      rejectedAt: string;
      /** دلیل رد — قابل نمایش به BranchUser */
      rejectionReason: string;
    });

/**
 * Helper type — ورودی فرم «ثبت تراکنش جدید».
 *
 * این آنچه از فرم می‌آید (قبل از تمام enrichment‌ها):
 * - id, createdAt, updatedAt, createdBy → repo می‌سازد
 * - status → بر اساس نقش کاربر تعیین می‌شود (rbac.ts)
 * - categoryName, branch → از category id و branch id resolve می‌شود
 */
export type TransactionInput = Omit<
  TransactionBase,
  'id' | 'categoryName' | 'branch' | 'createdAt' | 'updatedAt' | 'createdBy'
> & {
  accountId?: string;
  destinationAccountId?: string;
  contactId?: string;
  vatAmount?: number;
  isCredit?: boolean;
  invoiceCode?: string | null;
  initialStatus?: 'pending' | 'proforma';
};

/**
 * Helper type — فیلدهای قابل ویرایش بعد از ثبت.
 *
 * بعد از تایید، تنها SuperAdmin می‌تواند ویرایش کند، و فقط فیلدهای محدودی.
 * این type لیست فیلدهای مجاز را تثبیت می‌کند.
 */
export type TransactionPatch = Partial<
  Pick<
    TransactionBase,
    | 'title'
    | 'category'
    | 'categoryName'
    | 'amount'
    | 'payee'
    | 'method'
    | 'receipt'
    | 'date'
    | 'note'
  >
>;

// ─── Account ─────────────────────────────────────────────────────
export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'bank' | 'pos' | 'partner_equity' | string;
  balance: number;
  isActive: boolean;
  branchId: string | null;
  /** در Faz 3 از DB می‌آید؛ تا آن زمان null است */
  partnerId: string | null;
  createdAt: string;
  updatedAt: string;
}

// transaction type را گسترش می‌دهیم


// ─── Contact (طرف‌حساب) ──────────────────────────────────────────
export interface Contact {
  id: string;
  name: string;
  type: 'customer' | 'supplier' | 'other' | string;
  phone: string | null;
  note: string | null;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
