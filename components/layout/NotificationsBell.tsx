'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell, Clock, CheckCircle2, XCircle, Info,
  AlertTriangle, AlertOctagon, X, CheckCheck,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types';

// ─── Type metadata ───────────────────────────────────────────────

const TYPE_META: Record<
  NotificationType,
  { icon: LucideIcon; iconColor: string; dotColor: string; unreadBg: string; label: string }
> = {
  pending:  { icon: Clock,         iconColor: 'text-indigo-600',  dotColor: 'bg-indigo-500',  unreadBg: 'bg-indigo-50/70',  label: 'در انتظار تأیید' },
  approved: { icon: CheckCircle2,  iconColor: 'text-emerald-600', dotColor: 'bg-emerald-500', unreadBg: 'bg-emerald-50/70', label: 'تأیید شد' },
  rejected: { icon: XCircle,       iconColor: 'text-rose-600',    dotColor: 'bg-rose-500',    unreadBg: 'bg-rose-50/70',    label: 'رد شد' },
  info:     { icon: Info,          iconColor: 'text-sky-600',     dotColor: 'bg-sky-500',     unreadBg: 'bg-sky-50/70',     label: 'اطلاع' },
  warning:  { icon: AlertTriangle, iconColor: 'text-amber-600',   dotColor: 'bg-amber-500',   unreadBg: 'bg-amber-50/70',   label: 'هشدار' },
  critical: { icon: AlertOctagon,  iconColor: 'text-red-600',     dotColor: 'bg-red-500',     unreadBg: 'bg-red-50/70',     label: 'بحرانی' },
};

// ─── Single notification card ────────────────────────────────────

function NotifCard({
  n,
  onRead,
  onClose,
}: {
  n: Notification;
  onRead: (id: string) => void;
  onClose: () => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.info;
  const Icon = meta.icon;

  const handleClick = () => {
    if (!n.read) onRead(n.id);
    onClose();
  };

  const inner = (
    <div
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3.5 border-b border-stone-100 last:border-b-0',
        'transition-colors hover:bg-stone-50/80 active:bg-stone-100',
        !n.read && meta.unreadBg,
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        !n.read ? 'bg-white shadow-sm' : 'bg-stone-100',
        meta.iconColor,
      )}>
        <Icon size={14} strokeWidth={1.8} />
      </div>

      <div className="flex-1 min-w-0 text-right">
        <p className={cn('text-[12.5px] leading-snug', n.read ? 'text-stone-600' : 'text-stone-900 font-medium')}>
          {n.title}
        </p>
        <p className="text-[11.5px] text-stone-500 mt-0.5 line-clamp-2">{n.sub}</p>
        <p className="text-[10.5px] text-stone-400 mt-1">{n.time}</p>
      </div>

      {!n.read && (
        <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-2', meta.dotColor)} />
      )}
    </div>
  );

  if (n.actionUrl) {
    return (
      <Link href={n.actionUrl} onClick={handleClick} className="block w-full text-right">
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="w-full text-right">
      {inner}
    </button>
  );
}

// ─── Empty state ─────────────────────────────────────────────────

function EmptyNotifs() {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
        <Bell size={20} className="text-stone-400" strokeWidth={1.5} />
      </div>
      <p className="text-[13px] text-stone-500">هیچ اعلانی ندارید</p>
    </div>
  );
}

// ─── Panel header ─────────────────────────────────────────────────

function PanelHeader({
  unreadCount,
  onMarkAll,
  onClose,
  showClose,
}: {
  unreadCount: number;
  onMarkAll: () => void;
  onClose: () => void;
  showClose?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-[13.5px] font-medium text-stone-800">اعلان‌ها</span>
        {unreadCount > 0 && (
          <span className="h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
            {unreadCount > 99 ? '۹۹+' : new Intl.NumberFormat('fa-IR').format(unreadCount)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAll}
            title="علامت‌گذاری همه به‌عنوان خوانده‌شده"
            className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 transition-colors px-2 py-1 rounded hover:bg-stone-100"
          >
            <CheckCheck size={13} />
            همه خوانده شد
          </button>
        )}
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن اعلان‌ها"
            className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  // Single ref wraps bell + desktop dropdown + mobile sheet portal anchor.
  // The mobile sheet is rendered inside this ref (even though it's fixed-position)
  // so the outside-click handler doesn't fire on sheet interactions.
  const ref = useRef<HTMLDivElement>(null);

  const notifications = useAppStore((s) => s.notifications);
  const user = useAppStore((s) => s.user);
  const markRead = useAppStore((s) => s.markNotificationRead);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);

  const visible = notifications.filter(() => !!user);
  const unreadCount = visible.filter((n) => !n.read).length;

  const close = useCallback(() => setOpen(false), []);

  // Outside click — only fires when click is outside the ref (which includes both
  // the desktop dropdown AND the mobile sheet since both live inside ref).
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, close]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handle(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, close]);

  // Lock body scroll while mobile sheet is open
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (open && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!user) return null;

  // Fire-and-forget: optimistic update is handled in the slice
  const handleRead = (id: string) => { markRead(id); };
  const handleMarkAll = () => { markAllRead(); };

  return (
    // ref wraps everything — bell button + desktop dropdown + mobile sheet.
    // The mobile sheet uses `fixed inset-0` so its visual position is always
    // viewport-relative regardless of where it sits in the DOM tree.
    <div ref={ref} className="relative">

      {/* ── Bell button ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`اعلان‌ها${unreadCount > 0 ? ` (${unreadCount} خوانده‌نشده)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          'relative w-9 h-9 rounded-md transition-colors flex items-center justify-center',
          open ? 'bg-stone-100 text-stone-800' : 'hover:bg-stone-50 text-stone-600',
        )}
      >
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-medium tabular-nums">
            {unreadCount > 9 ? '۹+' : new Intl.NumberFormat('fa-IR').format(unreadCount)}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* ── Desktop dropdown (md+) ─────────────────────────── */}
          <div
            role="dialog"
            aria-label="اعلان‌ها"
            className="hidden md:flex flex-col absolute end-0 top-11 w-[360px] max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in"
            style={{ maxHeight: '480px' }}
          >
            <PanelHeader
              unreadCount={unreadCount}
              onMarkAll={handleMarkAll}
              onClose={close}
            />
            <div className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-200">
              {visible.length === 0 ? (
                <EmptyNotifs />
              ) : (
                visible.map((n) => (
                  <NotifCard key={n.id} n={n} onRead={handleRead} onClose={close} />
                ))
              )}
            </div>
          </div>

          {/* ── Mobile bottom sheet (< md) ─────────────────────── */}
          {/* fixed inset-0 means this covers the viewport regardless of DOM position.
              Being inside ref means outside-click handler won't close it on sheet taps. */}
          <div
            className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
            onClick={close}          // tap backdrop → close
            aria-modal="true"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" />

            {/* Sheet panel */}
            <div
              role="dialog"
              aria-label="اعلان‌ها"
              className="relative bg-white rounded-t-2xl flex flex-col shadow-2xl animate-slide-up"
              style={{ maxHeight: '75dvh' }}
              onClick={(e) => e.stopPropagation()}  // prevent backdrop close on sheet tap
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-stone-300" />
              </div>

              <PanelHeader
                unreadCount={unreadCount}
                onMarkAll={handleMarkAll}
                onClose={close}
                showClose
              />

              <div className="overflow-y-auto flex-1" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                {visible.length === 0 ? (
                  <EmptyNotifs />
                ) : (
                  visible.map((n) => (
                    <NotifCard key={n.id} n={n} onRead={handleRead} onClose={close} />
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
