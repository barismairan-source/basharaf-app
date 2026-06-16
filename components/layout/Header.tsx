'use client';

import { UserMenu } from './UserMenu';
import { NotificationsBell } from './NotificationsBell';
import { MobileMenu } from './MobileMenu';
import { RealtimeIndicator } from './RealtimeIndicator';

/**
 * Header — sticky top bar.
 *
 * موبایل: [Hamburger] .......... [Realtime] [Bell] [User]
 * دسکتاپ: [empty] ............ [Realtime] [Bell] [User]
 *
 * Sidebar در موبایل از طریق MobileMenu drawer باز می‌شود.
 */
export function Header() {
  return (
    <header className="h-14 px-3 md:px-6 border-b border-border bg-surface flex items-center justify-between sticky top-0 z-30 print:hidden">
      {/* موبایل: hamburger / دسکتاپ: خالی */}
      <div className="flex items-center">
        <MobileMenu />
      </div>

      {/* سمت چپ — action items */}
      <div className="flex items-center gap-1">
        <RealtimeIndicator />
        <NotificationsBell />
        <UserMenu />
      </div>
    </header>
  );
}
