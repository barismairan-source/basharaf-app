'use client';

import { UserMenu } from './UserMenu';
import { NotificationsBell } from './NotificationsBell';
import { RealtimeIndicator } from './RealtimeIndicator';

/**
 * Header — sticky top bar.
 *
 * موبایل: .............. [Realtime] [Bell] [User]
 * دسکتاپ: .............. [Realtime] [Bell] [User]
 *
 * ناوبری موبایل از طریق BottomTabBar (نوار پایین) و تب «⋮ بیشتر» انجام می‌شود.
 */
export function Header() {
  return (
    <header className="h-14 px-3 md:px-6 border-b border-border bg-surface flex items-center justify-end sticky top-0 z-30 print:hidden">
      <div className="flex items-center gap-1">
        <RealtimeIndicator />
        <NotificationsBell />
        <UserMenu />
      </div>
    </header>
  );
}
