import type { Transaction, User } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────
 * RBAC — Role-Based Access Control
 *
 * این فایل تنها مرجع منطق دسترسی در کل برنامه است.
 * سه لایه دفاعی:
 *   1. `scopeForUser`     → داده‌ها قبل از رسیدن به view فیلتر می‌شوند
 *   2. `can(user, action)`→ UI به‌صورت conditional عناصر مجاز را نمایش می‌دهد
 *   3. `RouterGuard`      → اگر کاربری مستقیماً به route ممنوع رفت، fallback
 *
 * این الگوی defense-in-depth همان است که در پروتوتایپ بود.
 * ───────────────────────────────────────────────────────────────── */

/**
 * فیلتر کردن لیست تراکنش‌ها به آنچه کاربر فعلی مجاز به دیدنش است.
 *
 * - SuperAdmin: همه تراکنش‌ها (همه شعب)
 * - BranchUser: فقط تراکنش‌های شعبه‌ای که به او تخصیص داده شده
 *
 * این تابع باید **در یک نقطه** فراخوانی شود (در layout اپ یا selector ذخیره‌ساز)،
 * نه در هر کامپوننت جداگانه. بعد همه کامپوننت‌های پایین‌دستی فقط با
 * `visibleTransactions` کار می‌کنند و نگران فیلتر کردن نیستند.
 */
export function scopeForUser(
  transactions: readonly Transaction[],
  user: User | null
): Transaction[] {
  if (!user) return [];
  if (user.role === 'SuperAdmin') return [...transactions];
  // BranchUser: discriminated union تضمین می‌کند assignedBranch یک رشته است
  return transactions.filter((t) => t.branchId === user.assignedBranch);
}

/**
 * مجموعه‌ی action‌های قابل کنترل دسترسی.
 *
 * هرچه به این لیست اضافه کنید، کامپایلر مجبور می‌شود `can()` را
 * برای آن مدیریت کند — این یعنی هرگز یک permission gap ایجاد نمی‌شود.
 */
export type Action =
  | 'view:dashboard'
  | 'view:transactions'
  | 'view:all-branches'
  | 'create:transaction'
  | 'approve:transaction'
  | 'reject:transaction'
  | 'edit:transaction'
  | 'delete:transaction'
  | 'view:settings.profile'
  | 'view:settings.preferences'
  | 'view:settings.team'
  | 'view:settings.branches'
  | 'view:settings.categories'
  | 'manage:users'
  | 'manage:branches'
  | 'manage:categories';

/**
 * ماتریس دسترسی — هر action با نقش مجاز.
 *
 * نکته‌ی مهم: BranchUser می‌تواند `create:transaction` انجام دهد،
 * اما تراکنش او وضعیت `pending` می‌گیرد. این منطق در slice تراکنش‌ها
 * پیاده می‌شود، نه اینجا. این فایل فقط می‌گوید "آیا اجازه دارد یا نه".
 */
const PERMISSIONS: Record<Action, ReadonlyArray<User['role']>> = {
  // همه می‌توانند دیدن کنند
  'view:dashboard': ['SuperAdmin', 'BranchUser'],
  'view:transactions': ['SuperAdmin', 'BranchUser'],
  'create:transaction': ['SuperAdmin', 'BranchUser'],
  'view:settings.profile': ['SuperAdmin', 'BranchUser'],
  'view:settings.preferences': ['SuperAdmin', 'BranchUser'],

  // فقط SuperAdmin
  'view:all-branches': ['SuperAdmin'],
  'approve:transaction': ['SuperAdmin'],
  'reject:transaction': ['SuperAdmin'],
  'edit:transaction': ['SuperAdmin'],
  'delete:transaction': ['SuperAdmin'],
  'view:settings.team': ['SuperAdmin'],
  'view:settings.branches': ['SuperAdmin'],
  'view:settings.categories': ['SuperAdmin'],
  'manage:users': ['SuperAdmin'],
  'manage:branches': ['SuperAdmin'],
  'manage:categories': ['SuperAdmin'],
};

/**
 * بررسی اینکه آیا کاربر اجازه‌ی این action را دارد.
 *
 * استفاده:
 *   {can(user, 'approve:transaction') && <ApproveButton />}
 *   if (!can(user, 'manage:users')) throw new Error('Forbidden');
 */
export function can(user: User | null, action: Action): boolean {
  if (!user) return false;
  return PERMISSIONS[action].includes(user.role);
}

/**
 * helper: آیا کاربر یک BranchUser است؟
 * (برای readability در view‌ها — به جای `user.role === 'BranchUser'`)
 */
export function isBranchUser(user: User | null): boolean {
  return user?.role === 'BranchUser';
}

/**
 * helper: آیا کاربر یک SuperAdmin است؟
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === 'SuperAdmin';
}

/**
 * تعیین وضعیت اولیه تراکنش بر اساس نقش ثبت‌کننده.
 *
 * این یک قانون کسب‌وکار است:
 * - SuperAdmin تراکنش‌هایش را خودش تایید می‌کند → 'approved'
 * - BranchUser منتظر تایید مدیر می‌ماند → 'pending'
 *
 * چرا اینجا و نه در slice؟ چون این یک تصمیم RBAC است نه data mutation.
 */
export function initialTransactionStatus(
  user: User
): 'approved' | 'pending' {
  return user.role === 'SuperAdmin' ? 'approved' : 'pending';
}
