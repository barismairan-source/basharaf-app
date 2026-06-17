'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { Empty } from '@/components/ui';
import type { NotificationType } from '@/types';
import { cn } from '@/lib/utils';

/**
 * NotificationsBell — bell با dropdown برای اعلان‌ها.
 *
 * unread count به‌صورت یک badge کوچک قرمز روی bell نمایش داده می‌شود.
 * dropdown شامل لیست اعلان‌ها است:
 * - read = false → پس‌زمینه stone-50/60 (هایلایت)
 * - read = true → پس‌زمینه عادی
 *
 * کلیک روی اعلان:
 * - markRead می‌کند
 * - اگر `txId` دارد، به detail تراکنش redirect می‌کند
 *
 * یک دکمه «همه را خوانده شده علامت بزن» در بالای dropdown هست.
 */

// نگاشت نوع اعلان به آیکن و رنگ
const NOTIF_META: Record<
  NotificationType,
  { icon: LucideIcon; color: string; bg: string }
> = {
  pending: { icon: Clock, color: 'text-amber-700', bg: 'bg-amber-50' },
  approved: {
    icon: CheckCircle2,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  rejected: { icon: XCircle, color: 'text-rose-700', bg: 'bg-rose-50' },
  info: { icon: Info, color: 'text-stone-600', bg: 'bg-stone-100' },
};

export function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // فقط اعلان‌هایی که برای کاربر فعلی معنی دارند را نمایش می‌دهیم.
  // BranchUser فقط اعلان‌های شعبه خودش را می‌بیند — این filter ساده است
  // چون اعلان `sub` شامل نام شعبه است. در فاز ۱۰ یک فیلد branchId مستقل
  // به Notification اضافه می‌شود.
  const notifications = useAppStore((s) => s.notifications);
  const user = useAppStore((s) => s.user);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const openTx = useAppStore((s) => s.openTx);

  // برای BranchUser، فقط اعلان‌های مربوط به تراکنش‌های قابل مشاهده‌اش
  const visibleTxIds = useAppStore((s) => {
    if (!s.user) return new Set<string>();
    if (s.user.role === 'SuperAdmin') {
      return new Set(s.transactions.map((t) => t.id));
    }
    return new Set(
      s.transactions
        .filter((t) => t.branchId === s.user!.assignedBranch)
        .map((t) => t.id)
    );
  });

  const visible = notifications.filter((n) => {
    if (!n.txId) return true; // اعلان‌های عمومی (info)
    return visibleTxIds.has(n.txId);
  });

  const unreadCount = visible.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (!user) return null;

  async function handleClickNotif(notif: (typeof visible)[number]) {
    if (!notif.read) {
      await markRead(notif.id);
    }
    if (notif.txId) {
      openTx(notif.txId);
      router.push('/transactions');
    }
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`اعلان‌ها${
          unreadCount > 0 ? ` (${unreadCount} خوانده‌نشده)` : ''
        }`}
        className="relative w-9 h-9 rounded-md hover:bg-stone-50 transition-colors flex items-center justify-center text-stone-600"
      >
        <Bell size={16} strokeWidth={1.5} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-medium tabular-nums">
            {unreadCount > 9 ? '۹+' : new Intl.NumberFormat('fa-IR').format(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-11 w-80 max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-md shadow-dropdown z-50 animate-fade-in overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <div className="text-[13px] text-stone-800">اعلان‌ها</div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-[11px] text-stone-500 hover:text-stone-800 transition-colors"
              >
                علامت‌گذاری همه به‌عنوان خوانده‌شده
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {visible.length === 0 ? (
              <Empty title="هیچ اعلانی نیست" icon={Bell} />
            ) : (
              visible.map((n) => {
                const meta = NOTIF_META[n.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleClickNotif(n)}
                    className={cn(
                      'w-full px-4 py-3 flex items-start gap-3 text-right border-b border-stone-50 last:border-b-0 transition-colors hover:bg-stone-50',
                      !n.read && 'bg-stone-50/60'
                    )}
                  >
                    <div
                      className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                        meta.bg,
                        meta.color
                      )}
                    >
                      <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] text-stone-800 leading-6">
                        {n.title}
                      </div>
                      <div className="text-[11.5px] text-stone-500 truncate mt-0.5">
                        {n.sub}
                      </div>
                      <div className="text-[10.5px] text-stone-400 mt-1">
                        {n.time}
                      </div>
                    </div>
                    {!n.read && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-stone-900 flex-shrink-0 mt-2"
                        aria-label="خوانده‌نشده"
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
