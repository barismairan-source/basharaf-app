'use client';

import { UserMenu } from './UserMenu';
import { NotificationsBell } from './NotificationsBell';
import { RealtimeIndicator } from './RealtimeIndicator';

/**
 * Top Header — sticky enterprise nav bar.
 *
 * RTL layout (justify-between):
 *   Right (flex-start): slot for future GlobalBranchSelector
 *   Left  (flex-end):   Realtime indicator · Notifications · User menu
 *
 * bg-surface/95 + backdrop-blur-sm: glass effect when content scrolls behind it.
 * shrink-0: prevents the header from compressing in the flex-col content column.
 */
export function Header() {
  return (
    <header className="h-16 shrink-0 px-4 md:px-6 border-b border-border bg-surface/95 backdrop-blur-sm flex items-center justify-between sticky top-0 z-30 print:hidden">

      {/* ── Right (start in RTL) — Global Branch Selector slot ── */}
      <div className="flex items-center gap-2">
        {/* GlobalBranchSelector will be mounted here */}
      </div>

      {/* ── Left (end in RTL) — User context actions ── */}
      <div className="flex items-center gap-1">
        <RealtimeIndicator />
        <NotificationsBell />
        <UserMenu />
      </div>

    </header>
  );
}
