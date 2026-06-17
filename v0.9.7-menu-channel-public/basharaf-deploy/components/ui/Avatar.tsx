import * as React from 'react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

/**
 * Avatar — نمایش حرف‌های اول کاربر در یک دایره.
 *
 * رنگ‌بندی بر اساس نقش (یک قرارداد بصری از پروتوتایپ):
 * - SuperAdmin: stone-900 سیاه با متن سفید (تاکید بر مدیریت)
 * - BranchUser: stone-100 خنثی با حاشیه نازک
 *
 * استفاده در sidebar، user menu، لیست team، و detail panel.
 */
export interface AvatarProps {
  /** حرف‌های اول قبلاً محاسبه‌شده (مثلاً «ع‌ب» از علی باقری) */
  initials: string;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-[10px]',
  md: 'w-7 h-7 text-[10.5px]',
  lg: 'w-8 h-8 text-[11.5px]',
  xl: 'w-10 h-10 text-[13px]',
} as const;

export function Avatar({
  initials,
  role = 'BranchUser',
  size = 'md',
  className,
}: AvatarProps) {
  const isAdmin = role === 'SuperAdmin';
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium flex-shrink-0 select-none',
        sizeClasses[size],
        isAdmin
          ? 'bg-stone-900 text-white'
          : 'bg-stone-100 text-stone-700 border border-stone-200',
        className
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

/**
 * extractInitials — استخراج دو حرف اول از یک نام کامل.
 *
 * - `extractInitials('علی باقری')` → 'ع‌ب' (با ZWNJ، نه ZWJ — حروف فاصله بصری دارند)
 * - `extractInitials('Ali B')` → 'AB'
 *
 * فقط برای زمانی استفاده می‌شود که کاربر جدید ساخته می‌شود.
 * در دیتای موجود `user.initials` از قبل ست شده.
 */
export function extractInitials(name: string): string {
  if (!name.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts[1]?.[0] ?? '';
  if (!first) return '?';
  if (!second) return first;
  // ZWNJ (\u200C) برای جلوگیری از چسبیدن دو حرف فارسی به هم
  return `${first}\u200C${second}`;
}
