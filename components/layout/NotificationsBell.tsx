'use client';

import {
  useState, useRef, useEffect, useCallback, useId,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import Link from 'next/link';
import {
  Bell, Clock, CheckCircle2, XCircle, Info,
  AlertTriangle, AlertOctagon, X, CheckCheck, Archive,
  MailOpen, Loader2,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import type { NotificationType } from '@/types';

// ─── V2 API shape ─────────────────────────────────────────────────

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
  time: string;  // legacy field — use createdAt for display
}

// ─── Relative time (Farsi) ───────────────────────────────────────

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

const FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
function toFarsiDigits(n: number): string {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[parseInt(d)] ?? d);
}

function dayKey(iso: string): 'today' | 'yesterday' | 'older' {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'today';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'yesterday';
  return 'older';
}

const GROUP_LABELS: Record<'today' | 'yesterday' | 'older', string> = {
  today:     'امروز',
  yesterday: 'دیروز',
  older:     'قدیمی‌تر',
};

// ─── Type metadata ────────────────────────────────────────────────

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

// ─── Filter tabs ──────────────────────────────────────────────────

type FilterValue = 'all' | 'unread';

const FILTER_LABELS: Record<FilterValue, string> = {
  all:    'همه',
  unread: 'خوانده‌نشده',
};

// ─── API helpers ──────────────────────────────────────────────────

async function apiFetch(filter: FilterValue, signal?: AbortSignal) {
  const res = await fetch(
    `/api/notifications?filter=${filter}&limit=10`,
    { signal }
  );
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

// ─── Single notification card ─────────────────────────────────────

function NotifCard({
  n,
  onRead,
  onUnread,
  onArchive,
  onClose,
}: {
  n: V2Notification;
  onRead:    (id: string) => void;
  onUnread:  (id: string) => void;
  onArchive: (id: string) => void;
  onClose:   () => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.info;
  const Icon = meta.icon;

  const handleMainClick = () => {
    if (!n.read) onRead(n.id);
    onClose();
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleMainClick();
    }
  };

  const inner = (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5',
        'transition-colors group-hover:bg-stone-50/80',
        !n.read && meta.unreadBg,
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        !n.read ? 'bg-white shadow-sm' : 'bg-stone-100',
        meta.iconColor,
      )}>
        <Icon size={14} strokeWidth={1.8} aria-hidden />
      </div>

      <div className="flex-1 min-w-0 text-right">
        <p className={cn('text-[12.5px] leading-snug', n.read ? 'text-stone-600' : 'text-stone-900 font-medium')}>
          {n.title}
        </p>
        <p className="text-[11.5px] text-stone-500 mt-0.5 line-clamp-2">{n.sub}</p>
        <p className="text-[10.5px] text-stone-400 mt-1">{relativeTime(n.createdAt)}</p>
      </div>

      {/* Action row */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {!n.read && (
          <span className={cn('w-2 h-2 rounded-full', meta.dotColor)} aria-hidden />
        )}
        {/* Secondary actions — shown on hover */}
        <div className="hidden group-hover:flex items-center gap-0.5 mt-1">
          {n.read ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onUnread(n.id); }}
              title="علامت‌گذاری به‌عنوان خوانده‌نشده"
              className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
            >
              <MailOpen size={12} aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onArchive(n.id); }}
            title="بایگانی"
            className="w-6 h-6 flex items-center justify-center rounded text-stone-400 hover:text-stone-700 hover:bg-stone-200/70 transition-colors"
          >
            <Archive size={12} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  if (n.actionUrl) {
    return (
      <div className="relative group border-b border-stone-100 last:border-b-0">
        <Link
          href={n.actionUrl}
          onClick={handleMainClick}
          onKeyDown={handleKeyDown}
          className="block w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
        >
          {inner}
        </Link>
      </div>
    );
  }

  return (
    <div className="relative group border-b border-stone-100 last:border-b-0">
      <button
        type="button"
        onClick={handleMainClick}
        onKeyDown={handleKeyDown}
        className="w-full text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-400"
      >
        {inner}
      </button>
    </div>
  );
}

// ─── Group heading ────────────────────────────────────────────────

function GroupHeading({ label }: { label: string }) {
  return (
    <div className="px-4 py-1.5 bg-stone-50/60 border-b border-stone-100">
      <span className="text-[10.5px] font-medium text-stone-400 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-0" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3.5 border-b border-stone-100 last:border-b-0 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-stone-200 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-stone-200 rounded w-3/4" />
            <div className="h-2.5 bg-stone-100 rounded w-full" />
            <div className="h-2 bg-stone-100 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────

function EmptyNotifs({ filter }: { filter: FilterValue }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-center">
      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
        <Bell size={20} className="text-stone-400" strokeWidth={1.5} aria-hidden />
      </div>
      <p className="text-[13px] text-stone-500">
        {filter === 'unread' ? 'همه اعلان‌ها خوانده شده‌اند' : 'هیچ اعلانی ندارید'}
      </p>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 gap-3 text-center">
      <p className="text-[12.5px] text-stone-500">خطا در بارگذاری اعلان‌ها</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-[12px] text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
      >
        تلاش مجدد
      </button>
    </div>
  );
}

// ─── Panel header ─────────────────────────────────────────────────

function PanelHeader({
  unreadCount,
  loading,
  filter,
  onFilterChange,
  onMarkAll,
  onClose,
  showClose,
  headingId,
}: {
  unreadCount: number;
  loading: boolean;
  filter: FilterValue;
  onFilterChange: (f: FilterValue) => void;
  onMarkAll: () => void;
  onClose: () => void;
  showClose?: boolean;
  headingId: string;
}) {
  return (
    <div className="flex flex-col flex-shrink-0 border-b border-stone-200">
      {/* Top row: title + actions */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span id={headingId} className="text-[13.5px] font-medium text-stone-800">اعلان‌ها</span>
          {loading ? (
            <Loader2 size={12} className="text-stone-400 animate-spin" aria-label="در حال بارگذاری" />
          ) : unreadCount > 0 ? (
            <span
              aria-live="polite"
              aria-atomic="true"
              className="h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums"
            >
              {unreadCount > 99 ? '۹۹+' : toFarsiDigits(unreadCount)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAll}
              title="علامت‌گذاری همه به‌عنوان خوانده‌شده"
              className="flex items-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 transition-colors px-2 py-1 rounded hover:bg-stone-100"
            >
              <CheckCheck size={13} aria-hidden />
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
              <X size={16} aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 pb-2" role="tablist" aria-label="فیلتر اعلان‌ها">
        {(Object.keys(FILTER_LABELS) as FilterValue[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => onFilterChange(f)}
            className={cn(
              'px-3 py-1 rounded-md text-[11.5px] transition-colors font-medium',
              filter === f
                ? 'bg-stone-800 text-white'
                : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700',
            )}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Notifications list with grouping ────────────────────────────

function NotifList({
  items,
  filter,
  loading,
  error,
  onRead,
  onUnread,
  onArchive,
  onRetry,
  onClose,
}: {
  items: V2Notification[];
  filter: FilterValue;
  loading: boolean;
  error: boolean;
  onRead:    (id: string) => void;
  onUnread:  (id: string) => void;
  onArchive: (id: string) => void;
  onRetry:   () => void;
  onClose:   () => void;
}) {
  if (loading && items.length === 0) return <LoadingSkeleton />;
  if (error && items.length === 0)   return <ErrorState onRetry={onRetry} />;
  if (items.length === 0)            return <EmptyNotifs filter={filter} />;

  // Group by day
  const groups: { key: 'today' | 'yesterday' | 'older'; items: V2Notification[] }[] = [];
  const seen = new Set<'today' | 'yesterday' | 'older'>();

  for (const n of items) {
    const k = dayKey(n.createdAt);
    if (!seen.has(k)) {
      seen.add(k);
      groups.push({ key: k, items: [] });
    }
    groups[groups.length - 1]!.items.push(n);
  }

  return (
    <>
      {groups.map((g) => (
        <div key={g.key}>
          <GroupHeading label={GROUP_LABELS[g.key]} />
          {g.items.map((n) => (
            <NotifCard
              key={n.id}
              n={n}
              onRead={onRead}
              onUnread={onUnread}
              onArchive={onArchive}
              onClose={onClose}
            />
          ))}
        </div>
      ))}
    </>
  );
}

// ─── Main component ────────────────────────────────────────────────

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const ref        = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);

  const headingId = useId();

  // Single source of truth: normalized store
  const setViewPage    = useAppStore((s) => s.setViewPage);
  const viewIds        = useAppStore((s) => s.viewIds);
  const byId           = useAppStore((s) => s.byId);
  const serverUnread   = useAppStore((s) => s.serverUnreadCount);
  const markRead       = useAppStore((s) => s.markNotificationRead);
  const markUnread     = useAppStore((s) => s.markNotificationUnread);
  const archiveNotif   = useAppStore((s) => s.archiveNotification);
  const markAllRead    = useAppStore((s) => s.markAllNotificationsRead);
  const user           = useAppStore((s) => s.user);

  // Bell uses its own view namespace so it never clears the page's cursor
  const bellViewKey = `bell:${filter}`;
  const items: V2Notification[] = (viewIds[bellViewKey] ?? [])
    .slice(0, 10)
    .map((id) => byId[id])
    .filter((n): n is V2Notification => n !== undefined && !n.archivedAt);

  const displayUnread = serverUnread;

  const close = useCallback(() => {
    setOpen(false);
    bellBtnRef.current?.focus();
  }, []);

  // ── Fetch on open / filter change — results land in isolated bell view ──
  const fetchNotifications = useCallback(async (f: FilterValue, signal?: AbortSignal) => {
    setLoading(true);
    setError(false);
    try {
      const data = await apiFetch(f, signal);
      // setViewPage('bell:unread', ...) does NOT touch the page's cursor or list
      setViewPage(`bell:${f}`, data.notifications as V2Notification[], data.nextCursor, data.unreadCount);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(true);
    } finally {
      setLoading(false);
    }
  }, [setViewPage]);

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    fetchNotifications(filter, ctrl.signal);
    return () => ctrl.abort();
  }, [open, filter, fetchNotifications]);

  // ── Outside click ─────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, close]);

  // ── Escape key ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function handle(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, close]);

  // ── Body scroll lock (mobile) ─────────────────────────────────────
  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    if (open && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // ── Focus: move to panel on open ─────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      const firstFocusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 50);
    return () => clearTimeout(t);
  }, [open]);

  if (!user) return null;

  // ── Actions — all go through store (rollback handled in slice) ────

  const handleRead    = useCallback((id: string) => { markRead(id).catch(() => {}); }, [markRead]);
  const handleUnread  = useCallback((id: string) => { markUnread(id).catch(() => {}); }, [markUnread]);
  const handleArchive = useCallback((id: string) => { archiveNotif(id).catch(() => {}); }, [archiveNotif]);
  const handleMarkAll = useCallback(() => { markAllRead().catch(() => {}); }, [markAllRead]);

  const handleFilterChange = useCallback((f: FilterValue) => {
    setFilter(f);
  }, []);

  // ── Bell panel content ────────────────────────────────────────────

  const panelContent = (
    <>
      <PanelHeader
        unreadCount={displayUnread}
        loading={loading}
        filter={filter}
        onFilterChange={handleFilterChange}
        onMarkAll={handleMarkAll}
        onClose={close}
        showClose
        headingId={headingId}
      />
      <div
        className="overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-stone-200"
        role="tabpanel"
      >
        <NotifList
          items={items}
          filter={filter}
          loading={loading}
          error={error}
          onRead={handleRead}
          onUnread={handleUnread}
          onArchive={handleArchive}
          onRetry={() => fetchNotifications(filter)}
          onClose={close}
        />
      </div>
      <div className="flex-shrink-0 border-t border-stone-100 px-4 py-2.5">
        <Link
          href="/notifications"
          onClick={close}
          className="block text-center text-[12px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
        >
          مشاهده همه اعلان‌ها
        </Link>
      </div>
    </>
  );

  return (
    <div ref={ref} className="relative">

      {/* ── Bell button ─────────────────────────────────────────── */}
      <button
        ref={bellBtnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`اعلان‌ها${displayUnread > 0 ? ` (${displayUnread} خوانده‌نشده)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `notif-panel` : undefined}
        className={cn(
          'relative w-9 h-9 rounded-md transition-colors flex items-center justify-center',
          open ? 'bg-stone-100 text-stone-800' : 'hover:bg-stone-50 text-stone-600',
        )}
      >
        <Bell size={16} strokeWidth={1.5} aria-hidden />
        {displayUnread > 0 && (
          <span
            aria-hidden
            className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-medium tabular-nums"
          >
            {displayUnread > 9 ? '۹+' : toFarsiDigits(displayUnread)}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* ── Desktop dropdown (md+) ─────────────────────────── */}
          <div
            ref={panelRef}
            id="notif-panel"
            role="dialog"
            aria-labelledby={headingId}
            aria-modal="false"
            className="hidden md:flex flex-col absolute end-0 top-11 w-[380px] max-w-[calc(100vw-2rem)] bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden motion-safe:animate-fade-in"
            style={{ maxHeight: '520px' }}
          >
            {panelContent}
          </div>

          {/* ── Mobile bottom sheet (< md) ─────────────────────── */}
          <div
            className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
            onClick={close}
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-black/50" />
            <div
              ref={panelRef}
              id="notif-panel"
              role="dialog"
              aria-labelledby={headingId}
              aria-modal="true"
              className="relative bg-white rounded-t-2xl flex flex-col shadow-2xl motion-safe:animate-slide-up"
              style={{ maxHeight: '80dvh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 flex-shrink-0" aria-hidden>
                <div className="w-10 h-1 rounded-full bg-stone-300" />
              </div>
              {panelContent}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
