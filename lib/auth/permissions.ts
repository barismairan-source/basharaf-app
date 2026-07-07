/**
 * سیستم دسترسی بخش‌محور (granular).
 *
 * هر کاربر می‌تواند یک لیست `permissions` داشته باشد که مشخص می‌کند کدام بخش‌ها
 * را می‌بیند. منطق backward-compatible:
 *  - SuperAdmin: همیشه همه‌ی بخش‌ها (permissions نادیده گرفته می‌شود).
 *  - کاربر با permissions غیرخالی: فقط همان بخش‌ها.
 *  - کاربر بدون permissions (null/خالی): رفتار پیش‌فرض نقش (مثل قبل).
 *
 * نکته: permissions فقط «کدام بخش» را کنترل می‌کند؛ محدوده‌ی شعبه همچنان با role
 * تعیین می‌شود (BranchUser فقط شعبه‌ی خودش).
 */

export type SectionKey =
  | 'dashboard'
  | 'transactions'
  | 'accounts'
  | 'contacts'
  | 'reports'
  | 'employees'
  | 'payroll'
  | 'inventory'
  | 'kitchen'
  | 'menu'
  | 'orders'
  | 'recruitment'
  | 'logs'
  | 'anomaly'
  | 'settings';

export interface SectionDef {
  key: SectionKey;
  label: string;
  /** بخش‌هایی که حتی بدون permission هم برای این نقش‌ها قابل دسترسی‌اند (پیش‌فرض نقش). */
  defaultRoles: ReadonlyArray<'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef'>;
}

/** فهرست کامل بخش‌ها — منبع واحد حقیقت برای sidebar، middleware، و پنل دسترسی. */
export const SECTIONS: ReadonlyArray<SectionDef> = [
  { key: 'dashboard',    label: 'داشبورد',          defaultRoles: ['SuperAdmin', 'BranchUser', 'Chef'] },
  { key: 'transactions', label: 'تراکنش‌ها',        defaultRoles: ['SuperAdmin', 'BranchUser'] },
  { key: 'accounts',     label: 'صندوق‌ها',          defaultRoles: ['SuperAdmin', 'BranchUser'] },
  { key: 'contacts',     label: 'طرف‌حساب‌ها',       defaultRoles: ['SuperAdmin', 'BranchUser'] },
  { key: 'reports',      label: 'گزارش مالی',        defaultRoles: ['SuperAdmin', 'BranchUser'] },
  { key: 'employees',    label: 'پرسنل',             defaultRoles: ['SuperAdmin'] },
  { key: 'payroll',      label: 'حقوق و دستمزد',     defaultRoles: ['SuperAdmin'] },
  // فاز ۲ جداسازی: Chef حذف شد — آشپز فقط بخش kitchen را می‌بیند، نه انبار.
  { key: 'inventory',    label: 'انبار',             defaultRoles: ['SuperAdmin', 'Warehouse', 'BranchUser'] },
  // بخش kitchen (recipes/plan). sectionForPath این مسیرها را به اینجا نگاشت می‌کند.
  { key: 'kitchen',      label: 'آشپزخانه',          defaultRoles: ['SuperAdmin', 'Chef'] },
  { key: 'menu',         label: 'مدیریت منو',        defaultRoles: ['SuperAdmin', 'Chef'] },
  { key: 'orders',       label: 'سفارش‌های بیرون‌بر', defaultRoles: ['SuperAdmin', 'BranchUser', 'Chef'] },
  { key: 'recruitment',  label: 'استخدام',           defaultRoles: ['SuperAdmin'] },
  { key: 'logs',         label: 'لاگ سیستم',         defaultRoles: ['SuperAdmin'] },
  { key: 'anomaly',      label: 'کارآگاه مالی',       defaultRoles: ['SuperAdmin'] },
  { key: 'settings',     label: 'تنظیمات',           defaultRoles: ['SuperAdmin', 'BranchUser'] },
];

export const ALL_SECTION_KEYS: ReadonlyArray<SectionKey> = SECTIONS.map((s) => s.key);

/**
 * مجوزهای عملیاتی (capability) — جدا از «دیدن بخش».
 * مثلاً «تأیید برگه‌ی انبار» یک عملیات است، نه یک بخش. این‌ها هم در همان
 * لیست user.permissions ذخیره می‌شوند ولی با پیشوند `cap:` تا با کلید بخش قاطی نشوند.
 */
export type CapabilityKey =
  | 'inventory.approve'
  | 'inventory.viewCosts'
  | 'settings.team'
  | 'settings.branches'
  | 'settings.categories'
  | 'settings.content'
  | 'settings.security';

export interface CapabilityDef {
  key: CapabilityKey;
  label: string;
  /** نقش‌هایی که این عملیات را به‌صورت پیش‌فرض دارند (وقتی permissions صریح نیست). */
  defaultRoles: ReadonlyArray<'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef'>;
}

export const CAPABILITIES: ReadonlyArray<CapabilityDef> = [
  // پیش‌فرض: فقط مدیر کل تأیید می‌کند (مثل قبل). با دادن این مجوز، حسابدار هم می‌تواند.
  { key: 'inventory.approve', label: 'تأیید برگه‌ی انبار', defaultRoles: ['SuperAdmin'] },
  // تفکیک وظایف انبار/حسابداری: انباردار فقط مقدار فیزیکی می‌بیند، نه بهای تمام‌شده/مبالغ
  { key: 'inventory.viewCosts', label: 'مشاهده‌ی بهای تمام‌شده و مبالغ مالی انبار', defaultRoles: ['SuperAdmin', 'BranchUser', 'Chef'] },
  // زیرتب‌های تنظیمات — به‌صورت گرانولار قابل اعطا به نقش‌های غیر مدیر کل
  { key: 'settings.team', label: 'مدیریت تیم (تنظیمات)', defaultRoles: ['SuperAdmin'] },
  { key: 'settings.branches', label: 'مدیریت شعب (تنظیمات)', defaultRoles: ['SuperAdmin'] },
  { key: 'settings.categories', label: 'دسته‌بندی‌ها (تنظیمات)', defaultRoles: ['SuperAdmin'] },
  { key: 'settings.content', label: 'متن‌های سامانه (تنظیمات)', defaultRoles: ['SuperAdmin'] },
  { key: 'settings.security', label: 'امنیت (تنظیمات)', defaultRoles: ['SuperAdmin'] },
];

const CAP_PREFIX = 'cap:';

/**
 * آیا کاربر این عملیات را می‌تواند انجام دهد؟
 * - SuperAdmin: همیشه بله.
 * - permissions صریح: فقط اگر `cap:<key>` در لیست باشد.
 * - بدون permissions صریح: پیش‌فرض نقش.
 */
export function canDo(user: AccessUser | null | undefined, cap: CapabilityKey): boolean {
  if (!user) return false;
  if (user.role === 'SuperAdmin') return true;
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(CAP_PREFIX + cap);
  }
  const def = CAPABILITIES.find((c) => c.key === cap);
  return def ? def.defaultRoles.includes(user.role) : false;
}

/** کلید ذخیره‌سازی یک capability در لیست permissions. */
export function capStorageKey(cap: CapabilityKey): string {
  return CAP_PREFIX + cap;
}

/** نگاشت مسیر URL → کلید بخش (برای middleware و گاردها). */
export function sectionForPath(pathname: string): SectionKey | null {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/transactions')) return 'transactions';
  if (pathname.startsWith('/accounts')) return 'accounts';
  if (pathname.startsWith('/contacts')) return 'contacts';
  if (pathname.startsWith('/reports')) return 'reports';
  if (pathname.startsWith('/employees')) return 'employees';
  if (pathname.startsWith('/payroll')) return 'payroll';
  // جداسازی آشپزخانه (فاز ۲): مسیرهای آشپزخانه باید قبل از قاعده‌ی عام /inventory بیایند
  // تا به بخش kitchen نگاشت شوند، نه inventory. ترتیب اینجا حیاتی است.
  if (pathname.startsWith('/inventory/kitchen')) return 'kitchen';
  if (pathname.startsWith('/inventory/recipes')) return 'kitchen';
  if (pathname.startsWith('/inventory/plan')) return 'kitchen';
  if (pathname.startsWith('/inventory')) return 'inventory';
  if (pathname.startsWith('/menu')) return 'menu';
  if (pathname.startsWith('/orders')) return 'orders';
  if (pathname.startsWith('/recruitment')) return 'recruitment';
  if (pathname.startsWith('/logs')) return 'logs';
  if (pathname.startsWith('/anomaly')) return 'anomaly';
  if (pathname.startsWith('/settings')) return 'settings';
  return null;
}

interface AccessUser {
  role: 'SuperAdmin' | 'BranchUser' | 'Warehouse' | 'Chef';
  permissions?: string[] | null;
}

/**
 * آیا این کاربر به این بخش دسترسی دارد؟
 * - SuperAdmin: همیشه بله.
 * - permissions غیرخالی: فقط اگر بخش در لیست باشد.
 * - بدون permissions: پیش‌فرض نقش.
 */
export function canAccessSection(user: AccessUser | null | undefined, section: SectionKey): boolean {
  if (!user) return false;
  if (user.role === 'SuperAdmin') return true;
  if (user.permissions && user.permissions.length > 0) {
    return user.permissions.includes(section);
  }
  const def = SECTIONS.find((s) => s.key === section);
  return def ? def.defaultRoles.includes(user.role) : false;
}
