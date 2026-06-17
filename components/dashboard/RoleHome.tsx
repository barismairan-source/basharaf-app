'use client';

import Link from 'next/link';
import {
  PackageOpen, ClipboardList, Trash2, AlertTriangle,
  BookOpen, CalendarDays, ChefHat, Timer,
  TrendingDown, DollarSign, InboxIcon, ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

interface RoleCard {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  iconClass: string;
}

const WAREHOUSE_CARDS: RoleCard[] = [
  {
    href: '/inventory/receive',
    icon: PackageOpen,
    title: 'تحویل بار',
    description: 'ثبت بار دریافتی از تأمین‌کننده',
    iconClass: 'bg-warn-subtle text-warn',
  },
  {
    href: '/inventory/stocktake',
    icon: ClipboardList,
    title: 'انبارگردانی',
    description: 'شمارش و تطبیق موجودی فیزیکی',
    iconClass: 'bg-accent-subtle text-accent',
  },
  {
    href: '/inventory/exceptions',
    icon: Trash2,
    title: 'ضایعات و انقضا',
    description: 'اقلام فاسد یا منقضی‌شده',
    iconClass: 'bg-danger-subtle text-danger',
  },
  {
    href: '/inventory/exceptions',
    icon: AlertTriangle,
    title: 'زیر حداقل موجودی',
    description: 'اقلامی که به سفارش نیاز دارند',
    iconClass: 'bg-warn-subtle text-warn',
  },
];

const CHEF_CARDS: RoleCard[] = [
  {
    href: '/inventory/recipes',
    icon: BookOpen,
    title: 'رسپی‌ها',
    description: 'فرمول‌بندی و food cost هر دیش',
    iconClass: 'bg-ok-subtle text-ok',
  },
  {
    href: '/inventory/plan',
    icon: CalendarDays,
    title: 'برنامه پخت',
    description: 'برنامه‌ریزی تولید و پیش‌آماده‌سازی',
    iconClass: 'bg-accent-subtle text-accent',
  },
  {
    href: '/inventory/cartable',
    icon: ChefHat,
    title: 'تولید پیش‌آماده',
    description: 'ثبت و تأیید برگه‌های تولید',
    iconClass: 'bg-warn-subtle text-warn',
  },
  {
    href: '/inventory/exceptions',
    icon: Timer,
    title: 'انقضا و تازگی',
    description: 'اقلام نزدیک به انقضا در آشپزخانه',
    iconClass: 'bg-danger-subtle text-danger',
  },
];

const ADMIN_CARDS: RoleCard[] = [
  {
    href: '/inventory/variance',
    icon: TrendingDown,
    title: 'گزارش واریانس',
    description: 'اختلاف تئوری و واقعی مصرف',
    iconClass: 'bg-danger-subtle text-danger',
  },
  {
    href: '/inventory/recipes',
    icon: DollarSign,
    title: 'Food Cost',
    description: 'بهای تمام‌شده دیش‌ها و دسته‌بندی‌ها',
    iconClass: 'bg-ok-subtle text-ok',
  },
  {
    href: '/inventory/cartable',
    icon: InboxIcon,
    title: 'کارتابل تأیید',
    description: 'برگه‌های انبار در انتظار تأیید',
    iconClass: 'bg-accent-subtle text-accent',
  },
  {
    href: '/purchase-orders',
    icon: ShoppingCart,
    title: 'PO باز',
    description: 'سفارش‌های خرید در جریان',
    iconClass: 'bg-warn-subtle text-warn',
  },
];

function cardsForRole(role: UserRole): RoleCard[] {
  if (role === 'Warehouse') return WAREHOUSE_CARDS;
  if (role === 'Chef') return CHEF_CARDS;
  return ADMIN_CARDS;
}

function titleForRole(role: UserRole): string {
  if (role === 'Warehouse') return 'عملیات انبار';
  if (role === 'Chef') return 'آشپزخانه';
  return 'کارتابل مدیریت';
}

interface RoleHomeProps {
  role: UserRole;
}

export function RoleHome({ role }: RoleHomeProps) {
  const cards = cardsForRole(role);
  const title = titleForRole(role);

  return (
    <div className="space-y-4">
      <h2 className="text-[13px] font-medium text-muted tracking-wide">{title}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href + card.title}
              href={card.href}
              className={cn(
                'flex flex-col gap-3 p-4 rounded-xl border border-border bg-surface',
                'hover:border-stone-300 hover:shadow-sm transition-all',
              )}
            >
              <span className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', card.iconClass)}>
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-text leading-snug">{card.title}</div>
                <div className="text-[11px] text-muted mt-0.5 leading-snug">{card.description}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
