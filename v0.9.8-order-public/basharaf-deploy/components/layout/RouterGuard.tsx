'use client';

import Link from 'next/link';
import { ShieldOff } from 'lucide-react';
import { Button } from '@/components/ui';
import type { Action } from '@/lib/rbac';
import { can } from '@/lib/rbac';
import { canDo, type CapabilityKey } from '@/lib/auth/permissions';
import { useAppStore } from '@/store';

/**
 * RouterGuard — wrapper برای صفحه‌هایی که نیاز به permission خاص دارند.
 *
 * استفاده در client components (در page):
 *
 *   <RouterGuard requires="manage:users">
 *     <TeamManagement />
 *   </RouterGuard>
 *
 * تفاوت با middleware:
 * - middleware فقط حضور session را چک می‌کند (auth)
 * - RouterGuard نقش را چک می‌کند (authz)
 *
 * چرا fallback به‌جای redirect؟
 * - تجربه کاربری بهتر — کاربر می‌فهمد چرا اجازه ندارد
 * - URL تغییر نمی‌کند، کاربر سردرگم نمی‌شود
 * - در فاز ۱۰، API هم همین رفتار را خواهد داشت (403 با پیام)
 */
interface RouterGuardProps {
  /** بررسی مبتنی بر نقش (سیستم قدیمی‌تر) — یکی از requires/cap باید داده شود */
  requires?: Action;
  /** بررسی مبتنی بر مجوز گرانولار (cap:) — اولویت با این است اگر داده شود */
  cap?: CapabilityKey;
  children: React.ReactNode;
  /** پیام سفارشی — در صورتی که خواستید پیام پیش‌فرض را override کنید */
  fallbackTitle?: string;
  fallbackMessage?: string;
}

export function RouterGuard({
  requires,
  cap,
  children,
  fallbackTitle = 'دسترسی غیرمجاز',
  fallbackMessage = 'برای مشاهده این بخش، باید با حساب مدیر کل وارد شوید.',
}: RouterGuardProps) {
  const user = useAppStore((s) => s.user);

  if (!user) {
    // middleware باید جلوی این را می‌گرفت ولی محتاطانه
    return null;
  }

  // اولویت با مجوز گرانولار (cap:) — اگر داده شده باشد، بررسی نقشِ ثابت نادیده گرفته می‌شود
  const allowed = cap ? canDo(user, cap) : (requires ? can(user, requires) : true);

  if (!allowed) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
            <ShieldOff size={20} strokeWidth={1.5} aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-[16px] text-stone-900 font-medium tracking-tight">
            {fallbackTitle}
          </h2>
          <p className="mt-2 text-[12.5px] text-stone-500 leading-7">
            {fallbackMessage}
          </p>
          <div className="mt-5">
            <Link href="/dashboard">
              <Button variant="default">بازگشت به داشبورد</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
