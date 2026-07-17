'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore } from '@/store';
import {
  Bell, CheckCheck, Archive, MailOpen, Loader2,
  AlertTriangle, Info, AlertOctagon, Clock, CheckCircle2, XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { NotificationType } from '@/types';

// ─── Types ────────────────────────────────────────────────────────

interface V2Notification {
  id: string;
  type: NotificationType;
  title: string;
  sub: string;
  read: boolean;
  readAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  txId: string | null;
  actionUrl: string | null;
  entityId: string | null;
  ruleKey: string | null;
  priority: number;
  time: string;
}

type FilterValue = 'all' | 'unread' | 'archived' | 'info' | 'warning' | 'critical';

const FILTER_LABELS: Record<FilterValue, string> = {
  all:      'همه',
  unread:   'خوانده‌نشده',
  archived: 'بایگانی',
  info:     'اطلاع',
  warning:  'هشدار',
  critical: 'بحرانی',
};

// ─── Helpers ──────────────────────────────────────────────────────

const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
function toFarsiDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[parseInt(d)] ?? d);
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60)                     return 'همین الان';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)                     return `${toFarsiDigits(diffMin)} دقیقه پیش`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)                      return `${toFarsiDigits(diffHr)} ساعت پیش`;
  if (diffHr < 48)                      return 'دیروز';
  const diffDay = Math.floor(diffHr / 24);
  return `${toFarsiDigits(diffDay)} روز پیش`;
}

// ─── Type metadata ────────────────────────────────────────────────

const TYPE_META: Record<
  NotificationType,
  { icon: LucideIcon; iconColor: string; dotColor: string; unreadBg: string; label: string }
> = {
  pending:  { icon: Clock,         iconColor: 'text-indigo-600',  dotColor: 'bg-indigo-500',  unreadBg: 'bg-indigo-50/40',  label: 'در انتظار تأیید' },
  approved: { icon: CheckCircle2,  iconColor: 'text-emerald-600', dotColor: 'bg-emerald-500', unreadBg: 'bg-emerald-50/40', label: 'تأیید شد' },
  rejected: { icon: XCircle,       iconColor: 'text-rose-600',    dotColor: 'bg-rose-500',    unreadBg: 'bg-rose-50/40',    label: 'رد شد' },
  info:     { icon: Info,          iconColor: 'text-sky-600',     dotColor: 'bg-sky-500',     unreadBg: 'bg-sky-50/40',     label: 'اطلاع' },
  warning:  { icon: AlertTriangle, iconColor: 'text-amber-600',   dotColor: 'bg-amber-500',   unreadBg: 'bg-amber-50/40',   label: 'هشدار' },
  critical: { icon: AlertOctagon,  iconColor: 'text-red-600',     dotColor: 'bg-red-500',     unreadBg: 'bg-red-50/40',     label: 'بحرانی' },
};

// ─── API helpers ──────────────────────────────────────────────────

async function apiFetch(filter: FilterValue, cursor: string | null, signal?: AbortSignal) {
  const params = new URLSearchParams({ filter, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`/api/notifications?${params}`, { signal });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<{
    notifications: V2Notification[];
    unreadCount: number;
    nextCursor: string | null;
  }>;
}

async function apiPatch(body: Record<string, string>): Promise<{ ok: boolean; unreadCount: number }> {
  const res = await fetch('/api/notifications', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ─── Notification row ─────────────────────────────────────────────

function NotifRow({
  n,
  onRead,
  onUnread,
  onArchive,
}: {
  n: V2Notification;
  onRead:    (id: string) => void;
  onUnread:  (id: string) => void;
  onArchive: (id: string) => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.info;
  const Icon = meta.icon;
  const isArchived = n.archivedAt !== null;

  const content = (
    <div
      className={cn(
        'flex items-start gap-4 px-5 py-4 border-b border-stone-100 last:border-b-0',
        'transition-colors group-hover:bg-stone-50/80',
        !n.read && !isArchived && meta.unreadBg,
        isArchived && 'opacity-60',
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        !n.read && !isArchived ? 'bg-white shadow-sm' : 'bg-stone-100',
        meta.iconColor,
      )}>
        <Icon size={16} strokeWidth={1.8} aria-hidden />
      </div>

      <div className="flex-1 min-w-0 text-right">
        <p className={cn('text-[13px] leading-snug', n.read || isArchived ? 'text-stone-600' : 'text-stone-900 font-semibold')}>
          {n.title}
        </p>
        <p className="text-[12px] text-stone-500 mt-0.5 line-clamp-3">{n.sub}</p>
        <div className="flex items-center gap-2 mt-1.5 justify-end">
          <span className="text-[11px] text-stone-400">{relativeTime(n.createdAt)}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 font-medium">{meta.label}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0 pt-0.5">
        {!n.read && !isArchived && (
          <span className={cn('w-2.5 h-2.5 rounded-full', meta.dotColor)} aria-hidden />
        )}
        {/* Action buttons — always visible on larger screens */}
        <div className="flex items-center gap-1 mt-1">
          {!isArchived && (
            n.read ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnread(n.id); }}
                title="علامت‌گذاری به‌عنوان خوانده‌نشده"
                className="w-7 h-7 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
              >
                <MailOpen size={13} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRead(n.id); }}
                title="علامت‌گذاری به‌عنوان خوانده‌شده"
                className="w-7 h-7 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
              >
                <CheckCheck size={13} aria-hidden />
              </button>
            )
          )}
          {!isArchived && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onArchive(n.id); }}
              title="بایگانی"
              className="w-7 h-7 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
            >
              <Archive size={13} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (n.actionUrl) {
    return (
      <div className="group">
        <Link
          href={n.actionUrl}
          onClick={() => { if (!n.read) onRead(n.id); }}
          className="block w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
        >
          {content}
        </Link>
      </div>
    );
  }

  return (
    <div className="group">
      <button
        type="button"
        onClick={() => { if (!n.read) onRead(n.id); }}
        className="w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
      >
        {content}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // Single source of truth: store
  const storeNotifs    = useAppStore((s) => s.notifications);
  const nextCursor     = useAppStore((s) => s.notifNextCursor);
  const _setNotifs     = useAppStore((s) => s._setNotifications);
  const _appendNotifs  = useAppStore((s) => s._appendNotifications);
  const markRead       = useAppStore((s) => s.markNotificationRead);
  const markUnread     = useAppStore((s) => s.markNotificationUnread);
  const archiveNotif   = useAppStore((s) => s.archiveNotification);
  const markAllRead    = useAppStore((s) => s.markAllNotificationsRead);
  // Authoritative count from server — not derived from locally-loaded items.
  // The page may only have loaded the first 20 items; this count covers ALL.
  const unreadCount    = useAppStore((s) => s.serverUnreadCount);

  // Derive display list from store, filtered by current tab
  const items: V2Notification[] = useMemo(() => {
    switch (filter) {
      case 'unread':   return storeNotifs.filter((n) => !n.read && !n.archivedAt) as V2Notification[];
      case 'archived': return storeNotifs.filter((n) => !!n.archivedAt) as V2Notification[];
      case 'info':     return storeNotifs.filter((n) => !n.archivedAt && n.type === 'info') as V2Notification[];
      case 'warning':  return storeNotifs.filter((n) => !n.archivedAt && n.type === 'warning') as V2Notification[];
      case 'critical': return storeNotifs.filter((n) => !n.archivedAt && n.type === 'critical') as V2Notification[];
      default:         return storeNotifs.filter((n) => !n.archivedAt) as V2Notification[];
    }
  }, [storeNotifs, filter]);

  const abortRef = useRef<AbortController | null>(null);

  const loadPage = useCallback(async (f: FilterValue, cursor: string | null, append: boolean) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!append) setLoading(true);
    else         setLoadingMore(true);
    setError(false);

    try {
      const data = await apiFetch(f, cursor, ctrl.signal);
      if (append) {
        // Pagination: preserve existing authoritative count
        _appendNotifs(data.notifications as V2Notification[], data.nextCursor);
      } else {
        // Initial load / filter change: accept server's authoritative count
        _setNotifs(data.notifications as V2Notification[], data.nextCursor, data.unreadCount);
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(true);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [_setNotifs, _appendNotifs]);

  // Initial load + filter change
  useEffect(() => {
    loadPage(filter, null, false);
    return () => abortRef.current?.abort();
  }, [filter, loadPage]);

  // ── Actions — all go through store (rollback handled in slice) ────

  const handleRead    = useCallback((id: string) => { markRead(id).catch(() => {}); }, [markRead]);
  const handleUnread  = useCallback((id: string) => { markUnread(id).catch(() => {}); }, [markUnread]);
  const handleArchive = useCallback((id: string) => { archiveNotif(id).catch(() => {}); }, [archiveNotif]);
  const handleMarkAll = useCallback(() => { markAllRead().catch(() => {}); }, [markAllRead]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) loadPage(filter, nextCursor, true);
  }, [nextCursor, filter, loadPage]);

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50/50" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
              <Bell size={18} className="text-stone-600" strokeWidth={1.5} aria-hidden />
            </div>
            <div>
              <h1 className="text-[17px] font-semibold text-stone-900">اعلان‌ها</h1>
              {unreadCount > 0 && (
                <p className="text-[12px] text-stone-500">
                  {toFarsiDigits(unreadCount)} خوانده‌نشده
                </p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="flex items-center gap-1.5 text-[12px] text-stone-600 hover:text-stone-900 transition-colors bg-white border border-stone-200 hover:border-stone-300 rounded-lg px-3 py-1.5 shadow-sm"
            >
              <CheckCheck size={14} aria-hidden />
              همه را خوانده کن
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div
          className="flex flex-wrap gap-1.5 mb-4"
          role="tablist"
          aria-label="فیلتر اعلان‌ها"
        >
          {(Object.keys(FILTER_LABELS) as FilterValue[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors',
                filter === f
                  ? 'bg-stone-800 text-white shadow-sm'
                  : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:text-stone-800',
              )}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-white border border-stone-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col" aria-busy="true" aria-label="در حال بارگذاری">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-stone-100 last:border-b-0 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-stone-200 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-stone-200 rounded w-3/4" />
                    <div className="h-2.5 bg-stone-100 rounded w-full" />
                    <div className="h-2 bg-stone-100 rounded w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center">
              <p className="text-[13px] text-stone-500">خطا در بارگذاری اعلان‌ها</p>
              <button
                type="button"
                onClick={() => loadPage(filter, null, false)}
                className="text-[12.5px] text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
              >
                تلاش مجدد
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center">
                <Bell size={22} className="text-stone-400" strokeWidth={1.5} aria-hidden />
              </div>
              <p className="text-[13.5px] text-stone-500">
                {filter === 'unread'   ? 'همه اعلان‌ها خوانده شده‌اند' :
                 filter === 'archived' ? 'هیچ اعلانی بایگانی نشده' :
                                        'هیچ اعلانی ندارید'}
              </p>
            </div>
          ) : (
            <>
              {items.map((n) => (
                <NotifRow
                  key={n.id}
                  n={n}
                  onRead={handleRead}
                  onUnread={handleUnread}
                  onArchive={handleArchive}
                />
              ))}

              {nextCursor && (
                <div className="flex justify-center py-4 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="flex items-center gap-2 text-[12.5px] text-stone-600 hover:text-stone-900 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 size={14} className="animate-spin" aria-hidden />
                    ) : null}
                    بارگذاری بیشتر
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Back link */}
        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="text-[12px] text-stone-400 hover:text-stone-600 transition-colors"
          >
            بازگشت به داشبورد
          </Link>
        </div>

      </div>
    </div>
  );
}
