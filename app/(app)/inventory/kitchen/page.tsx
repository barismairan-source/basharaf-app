'use client';

import Link from 'next/link';
import { ChefHat, CalendarClock, ChevronLeft, Soup, type LucideIcon } from 'lucide-react';
import { useAppStore } from '@/store';
import { canAccessSection } from '@/lib/auth/permissions';

interface KitchenCard {
  href: string;
  label: string;
  sub: string;
  icon: LucideIcon;
}

const KITCHEN_CARDS: KitchenCard[] = [
  { href: '/inventory/recipes',      label: 'دستور پخت',    sub: 'رسپی‌ها و بهای تمام‌شده',         icon: ChefHat },
  { href: '/inventory/kitchen/prep', label: 'نیمه‌آماده‌ها', sub: 'سس‌ها، خمیرها و مواد آماده‌سازی', icon: Soup },
  { href: '/inventory/plan',         label: 'برنامه تولید', sub: 'پیش‌بینی و برنامه‌ریزی پخت',      icon: CalendarClock },
];

export default function KitchenHubPage() {
  const user = useAppStore((s) => s.user);

  if (!user) return null;
  if (!canAccessSection(user, 'kitchen')) {
    return <div className="p-6 text-center text-muted">دسترسی ندارید</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-2">
        <ChefHat size={20} strokeWidth={1.5} className="text-accent" />
        <h1 className="text-[17px] font-semibold text-text">آشپزخانه</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {KITCHEN_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface hover:bg-bg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97]"
            >
              <span className="w-10 h-10 rounded-full flex items-center justify-center bg-bg flex-shrink-0">
                <Icon size={20} strokeWidth={1.5} className="text-accent" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-medium text-text">{card.label}</div>
                <div className="text-[11px] text-muted mt-0.5">{card.sub}</div>
              </div>
              <ChevronLeft size={16} className="text-border flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
