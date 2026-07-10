import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Receipt, BarChart3, Landmark, Users, UtensilsCrossed, ScrollText,
  Briefcase, Calculator, Package, UserPlus, Settings as SettingsIcon, UserCircle, Ticket,
  CalendarClock, Wrench, ShoppingCart, ClipboardList, Truck, TrendingUp, PackageOpen, ChefHat,
  FileCheck, ShieldAlert,
} from 'lucide-react';
import type { UserRole } from '@/types';
import type { SectionKey } from '@/lib/auth/permissions';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: ReadonlyArray<UserRole>;
  matchPrefix?: boolean;
  /** اگر true، در sidebar دسکتاپ زیر تاگ «بیشتر» پنهان می‌ماند */
  rarely?: boolean;
  /** اگر true، sidebar برای این آیتم badge count کارآگاه را نشان می‌دهد */
  hasBadge?: boolean;
}

export interface NavGroup {
  label: string;
  items: ReadonlyArray<NavItem>;
}

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  href: string;
  section: SectionKey;
  iconClass: string;
}

// hrefs that live in the bottom tab bar; SidebarContent with secondaryOnly=true excludes them
export const BOTTOM_NAV_HREFS = new Set([
  '/dashboard', '/transactions', '/inventory', '/reports',
]);

export const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    label: 'عملیات اصلی',
    items: [
      { href: '/dashboard',     label: 'داشبورد',           icon: LayoutDashboard, roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/transactions',  label: 'تراکنش‌ها',          icon: Receipt,         roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/orders',        label: 'سفارش‌های بیرون‌بر', icon: Truck,           roles: ['SuperAdmin', 'BranchUser', 'Chef'], matchPrefix: true },
      { href: '/accounts',      label: 'صندوق‌ها',           icon: Landmark,        roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/cheques',       label: 'چک‌ها',              icon: FileCheck,       roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/contacts',      label: 'طرف‌حساب‌ها',        icon: Users,           roles: ['SuperAdmin', 'BranchUser'] },
    ],
  },
  {
    label: 'پشت صحنه',
    items: [
      { href: '/inventory',          label: 'انبار',      icon: Package,         roles: ['SuperAdmin', 'Warehouse', 'BranchUser'] },
      { href: '/inventory/kitchen',  label: 'آشپزخانه',   icon: ChefHat,         roles: ['SuperAdmin', 'Chef'], matchPrefix: true },
      { href: '/menu',            label: 'مدیریت منو',        icon: UtensilsCrossed, roles: ['SuperAdmin', 'Chef'] },
      { href: '/equipment',       label: 'تجهیزات',           icon: Wrench,          roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/purchase-orders', label: 'سفارش خرید',        icon: ShoppingCart,    roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/tasks',           label: 'وظایف روزانه',      icon: ClipboardList,   roles: ['SuperAdmin', 'BranchUser', 'Warehouse', 'Chef'] },
    ],
  },
  {
    label: 'روابط و منابع',
    items: [
      { href: '/customers',    label: 'امور مشتریان',  icon: UserCircle,    roles: ['SuperAdmin', 'BranchUser'], matchPrefix: true },
      { href: '/reservations', label: 'رزرو میز',      icon: CalendarClock, roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/coupons',      label: 'کوپن‌ها',        icon: Ticket,        roles: ['SuperAdmin'], rarely: true },
      { href: '/employees',    label: 'پرسنل',          icon: Briefcase,     roles: ['SuperAdmin'], rarely: true },
      { href: '/payroll',      label: 'حقوق و دستمزد', icon: Calculator,    roles: ['SuperAdmin'], rarely: true },
      { href: '/recruitment',  label: 'استخدام',        icon: UserPlus,      roles: ['SuperAdmin'], rarely: true },
    ],
  },
  {
    label: 'تحلیل و گزارش',
    items: [
      { href: '/reports',  label: 'گزارش‌ها',      icon: BarChart3,   roles: ['SuperAdmin', 'BranchUser'] },
      { href: '/anomaly',  label: 'دستیار مالی',    icon: ShieldAlert, roles: ['SuperAdmin'], hasBadge: true },
      { href: '/logs',     label: 'لاگ سیستم',     icon: ScrollText,  roles: ['SuperAdmin'] },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  href: '/settings', label: 'تنظیمات', icon: SettingsIcon,
  roles: ['SuperAdmin', 'BranchUser'],
};

export const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'ثبت تراکنش',
    icon: Receipt,
    href: '/transactions/new',
    section: 'transactions',
    iconClass: 'text-accent bg-accent-subtle',
  },
  {
    label: 'ثبت فروش روز',
    icon: TrendingUp,
    href: '/transactions/new',
    section: 'transactions',
    iconClass: 'text-ok bg-ok-subtle',
  },
  {
    label: 'دریافت بار',
    icon: PackageOpen,
    href: '/inventory/receive',
    section: 'inventory',
    iconClass: 'text-warn bg-warn-subtle',
  },
];

// مسیرهای آشپزخانه که زیر /inventory/* پراکنده‌اند ولی به آیتم nav «آشپزخانه» تعلق دارند
const KITCHEN_PATHS = ['/inventory/kitchen', '/inventory/recipes', '/inventory/plan', '/inventory/menu-engineering'];

export function isNavItemActive(href: string, pathname: string, matchPrefix?: boolean): boolean {
  if (matchPrefix) {
    if (href === '/transactions')
      return pathname === '/transactions' || pathname.startsWith('/transactions/');
    // آیتم آشپزخانه روی همه‌ی صفحات آشپزخانه (hub + recipes + plan) فعال می‌شود
    if (href === '/inventory/kitchen')
      return KITCHEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
    return pathname.startsWith(href);
  }
  return pathname === href;
}
