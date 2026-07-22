'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell, Clock, AlertTriangle, AlertOctagon,
  ShoppingCart, Package, CheckCircle2, RefreshCw, DollarSign,
  Mail, MessageSquare, LayoutList, Inbox, RotateCcw, Loader2,
  Users, ShieldAlert, FileCheck, Search as SearchIcon,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConfirm } from '@/components/ui';
import { RecipientDrawer } from '@/components/admin/notifications/RecipientDrawer';

// ─── Types — mirror GET /api/admin/notification-audience ──────────

type Channel = 'in_app' | 'sms' | 'email';

interface CatalogInfo {
  title: string;
  description: string;
  category: string;
  trigger: string;
  thresholdType: 'amount' | 'days' | 'percent' | 'count' | null;
  thresholdUnit: string | null;
  branchAware: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  audienceConfigurable: boolean;
  hiddenFromUi: boolean;
}

interface AudienceChannelSummary { recipientCount: number; custom: boolean; }

interface TargetRow {
  channel: Channel | null;
  effect: 'include' | 'exclude';
  targetType: 'all_active' | 'role' | 'branch' | 'event_branch' | 'user';
  roleTarget: string | null;
  branchTarget: string | null;
  userTarget: string | null;
}

interface RuleWithAudience {
  key: string;
  enabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  threshold: number | null;
  updatedAt: string;
  catalog: CatalogInfo;
  audience: Record<Channel, AudienceChannelSummary>;
  targets: TargetRow[];
}

interface OutboxRow {
  id: string;
  ruleKey: string;
  channel: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  maskedRecipient?: string | null;
}

interface OutboxSummary {
  pending: number;
  processing: number;
  dead: number;
  sentToday: number;
  oldestPendingAgeSeconds: number | null;
  smsConfigured: boolean;
  emailConfigured: boolean;
}

// ─── Metadata ─────────────────────────────────────────────────────

const RULE_META: Record<string, { icon: LucideIcon; accent: string }> = {
  pending_approval:              { icon: Clock,         accent: 'text-indigo-400' },
  voucher_pending:                { icon: Package,       accent: 'text-amber-400' },
  low_stock:                      { icon: AlertTriangle, accent: 'text-amber-400' },
  inventory_clamp:                { icon: AlertOctagon,  accent: 'text-red-400' },
  po_received:                    { icon: ShoppingCart,  accent: 'text-emerald-400' },
  high_value_tx:                  { icon: DollarSign,    accent: 'text-sky-400' },
  'cheque.dueSoon':                { icon: FileCheck,     accent: 'text-sky-400' },
  'recruitment.new_application':  { icon: Bell,           accent: 'text-violet-400' },
  waste_spike:                    { icon: ShieldAlert,    accent: 'text-red-400' },
  below_approval_limit:           { icon: ShieldAlert,    accent: 'text-red-400' },
  consumption_spike:              { icon: ShieldAlert,    accent: 'text-amber-400' },
  rejection_pattern:              { icon: ShieldAlert,    accent: 'text-amber-400' },
  price_jump:                     { icon: ShieldAlert,    accent: 'text-amber-400' },
  off_hours_activity:             { icon: ShieldAlert,    accent: 'text-stone-400' },
};

function formatThreshold(catalog: CatalogInfo, threshold: number | null): string {
  if (threshold === null) return '';
  const n = new Intl.NumberFormat('fa-IR').format(threshold);
  return catalog.thresholdUnit ? `${n} ${catalog.thresholdUnit}` : n;
}

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-amber-900/30 text-amber-400',
  processing: 'bg-blue-900/30 text-blue-400',
  sent:       'bg-emerald-900/30 text-emerald-400',
  skipped:    'bg-stone-700 text-stone-400',
  failed:     'bg-red-900/30 text-red-400',
  dead:       'bg-red-900/50 text-red-300',
};

// ─── Tabs ─────────────────────────────────────────────────────────

type Tab = 'rules' | 'outbox';

const TAB_LABELS: Record<Tab, string> = {
  rules:  'قوانین',
  outbox: 'صف ارسال',
};

// ─── Rule Row ─────────────────────────────────────────────────────

function RuleRow({
  rule,
  onToggle,
  onThreshold,
  onChannelToggle,
  onOpenRecipients,
  saving,
}: {
  rule: RuleWithAudience;
  onToggle: (key: string, enabled: boolean) => void;
  onThreshold: (key: string, value: number | null) => void;
  onChannelToggle: (key: string, field: 'inAppEnabled' | 'emailEnabled' | 'smsEnabled', value: boolean) => void;
  onOpenRecipients: (key: string) => void;
  saving: string | null;
}) {
  const meta = RULE_META[rule.key] ?? { icon: Bell, accent: 'text-stone-400' };
  const Icon = meta.icon;
  const isSaving = saving === rule.key;

  const [localThreshold, setLocalThreshold] = useState(
    rule.threshold !== null ? String(rule.threshold) : ''
  );

  const lastUpdated = new Date(rule.updatedAt).toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'short', day: 'numeric',
  });

  return (
    <div className={cn(
      'flex items-start gap-4 px-5 py-4 border-b border-stone-800/60 last:border-b-0 transition-opacity',
      isSaving && 'opacity-60'
    )}>
      <div className="w-9 h-9 rounded-lg bg-stone-800 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={16} className={meta.accent} aria-hidden />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[13.5px] font-medium text-stone-100">{rule.catalog.title}</p>
          {!rule.enabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-700 text-stone-400">غیرفعال</span>
          )}
        </div>
        {rule.catalog.trigger && (
          <p className="text-[12px] text-stone-500 mt-0.5">{rule.catalog.trigger}</p>
        )}

        {/* Channel toggles (V2) */}
        {rule.enabled && (
          <div className="flex items-center gap-3 mt-2.5">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rule.inAppEnabled}
                onChange={(e) => onChannelToggle(rule.key, 'inAppEnabled', e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
              />
              <LayoutList size={11} className="text-stone-400" aria-hidden />
              <span className="text-[11px] text-stone-400">داخل‌برنامه ({rule.audience.in_app.recipientCount})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rule.emailEnabled}
                onChange={(e) => onChannelToggle(rule.key, 'emailEnabled', e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
              />
              <Mail size={11} className="text-stone-400" aria-hidden />
              <span className="text-[11px] text-stone-400">ایمیل ({rule.audience.email.recipientCount})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rule.smsEnabled}
                onChange={(e) => onChannelToggle(rule.key, 'smsEnabled', e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-500 cursor-pointer"
              />
              <MessageSquare size={11} className="text-stone-400" aria-hidden />
              <span className="text-[11px] text-stone-400">پیامک ({rule.audience.sms.recipientCount})</span>
            </label>
          </div>
        )}

        {/* Threshold input */}
        {rule.threshold !== null && rule.enabled && (
          <div className="mt-2.5 flex items-center gap-2">
            <label className="text-[11.5px] text-stone-400">آستانه:</label>
            <input
              type="number"
              value={localThreshold}
              onChange={(e) => setLocalThreshold(e.target.value)}
              onBlur={() => {
                const v = parseInt(localThreshold, 10);
                if (!isNaN(v) && v >= 0) onThreshold(rule.key, v);
              }}
              className="w-36 h-7 px-2 rounded-md bg-stone-800 border border-stone-700 text-stone-200 text-[12px] text-right focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40"
              dir="ltr"
            />
            {rule.threshold !== null && (
              <span className="text-[11px] text-stone-500">
                {formatThreshold(rule.catalog, rule.threshold)}
              </span>
            )}
          </div>
        )}

        {/* Recipients button + last update */}
        <div className="flex items-center gap-3 mt-2.5">
          {rule.catalog.audienceConfigurable ? (
            <button
              type="button"
              onClick={() => onOpenRecipients(rule.key)}
              className="flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-md border border-stone-700 text-stone-300 hover:border-indigo-500/60 hover:text-indigo-300 transition-colors"
            >
              <Users size={11} aria-hidden /> گیرندگان
            </button>
          ) : (
            <span className="text-[11px] text-stone-600">اعلان شخصی — قابل تنظیم گیرنده نیست</span>
          )}
          <span className="text-[10.5px] text-stone-600">آخرین به‌روزرسانی: {lastUpdated}</span>
        </div>
      </div>

      {/* Master enable toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={rule.enabled}
        onClick={() => onToggle(rule.key, !rule.enabled)}
        disabled={isSaving}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 mt-1 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
          rule.enabled ? 'bg-indigo-600' : 'bg-stone-700'
        )}
      >
        <span
          style={{ width: '18px', height: '18px', transform: rule.enabled ? 'translateX(-4px)' : 'translateX(-18px)' }}
          className="inline-block rounded-full bg-white shadow-sm transition-transform"
        />
      </button>
    </div>
  );
}

// ─── Outbox tab ────────────────────────────────────────────────────

function OutboxTab() {
  const confirm = useConfirm();
  const [summary, setSummary] = useState<OutboxSummary | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<OutboxRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [retryingOne, setRetryingOne] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryMsg, setRetryMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/notification-outbox', { credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      const data = await res.json();
      setSummary(data.summary ?? null);
      setCounts(data.counts ?? {});
      setRows(data.recentProblematic ?? []);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setError('بارگذاری ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/admin/notification-outbox?cursor=${encodeURIComponent(nextCursor)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('خطا');
      const data = await res.json();
      setRows((prev) => [...prev, ...(data.recentProblematic ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      setError('بارگذاری بیشتر ناموفق بود.');
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => { load(); }, [load]);

  const handleRetryDead = useCallback(async () => {
    if (!(await confirm({ title: 'تلاش مجدد برای همه ردیف‌های مُرده؟', confirmLabel: 'تلاش مجدد' }))) return;
    setRetrying(true);
    try {
      const res = await fetch('/api/admin/notification-outbox', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry-dead' }),
      });
      if (!res.ok) throw new Error('خطا');
      const data = await res.json();
      setRetryMsg(`${data.retried ?? 0} ردیف مجدداً در صف قرار گرفت`);
      setTimeout(() => setRetryMsg(null), 3000);
      await load();
    } catch {
      setError('تلاش مجدد ناموفق بود.');
    } finally {
      setRetrying(false);
    }
  }, [load, confirm]);

  const handleRetryOne = useCallback(async (id: string) => {
    setRetryingOne(id);
    try {
      const res = await fetch('/api/admin/notification-outbox', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'retry-one', id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'خطا');
      }
      setRetryMsg('ردیف مجدداً در صف قرار گرفت');
      setTimeout(() => setRetryMsg(null), 3000);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError((e as Error).message || 'تلاش مجدد ناموفق بود.');
    } finally {
      setRetryingOne(null);
    }
  }, []);

  const statusOrder: Array<string> = ['pending', 'processing', 'sent', 'skipped', 'failed', 'dead'];
  const deadCount = counts['dead'] ?? 0;
  const total = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-medium text-stone-200 flex items-center gap-2">
            <Inbox size={15} className="text-indigo-400" aria-hidden />
            صف ارسال اعلان
          </h2>
          <p className="text-[11.5px] text-stone-500 mt-0.5">
            وضعیت کانال SMS و ایمیل — پردازش توسط processor داخلی
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="بارگذاری مجدد"
          className="w-8 h-8 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden />
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-[12px]">{error}</div>
      )}
      {retryMsg && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-[12px]">
          <CheckCircle2 size={13} aria-hidden />
          {retryMsg}
        </div>
      )}

      {/* Status counts */}
      <div className="grid grid-cols-3 gap-2">
        {statusOrder.map((s) => (
          <div key={s} className="bg-stone-900 border border-stone-800 rounded-lg px-3 py-2.5">
            <p className="text-[10px] text-stone-500 mb-1">{s}</p>
            <p className="text-[17px] font-semibold text-stone-200 tabular-nums">{counts[s] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Retry dead */}
      {deadCount > 0 && (
        <button
          type="button"
          onClick={handleRetryDead}
          disabled={retrying}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900/20 border border-red-800/50 text-red-400 hover:bg-red-900/40 transition-colors text-[12.5px] w-full justify-center"
        >
          {retrying ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <RotateCcw size={13} aria-hidden />}
          تلاش مجدد {deadCount} ردیف مُرده
        </button>
      )}

      {/* Provider readiness */}
      {summary && (
        <div className="flex flex-wrap gap-3 text-[11px]">
          <span className={cn('px-2 py-1 rounded', summary.smsConfigured ? 'bg-emerald-900/30 text-emerald-400' : 'bg-stone-800 text-stone-500')}>
            SMS: {summary.smsConfigured ? 'پیکربندی‌شده' : 'پیکربندی‌نشده'}
          </span>
          <span className={cn('px-2 py-1 rounded', summary.emailConfigured ? 'bg-emerald-900/30 text-emerald-400' : 'bg-stone-800 text-stone-500')}>
            ایمیل: {summary.emailConfigured ? 'پیکربندی‌شده' : 'پیکربندی‌نشده'}
          </span>
          {summary.oldestPendingAgeSeconds !== null && summary.oldestPendingAgeSeconds > 300 && (
            <span className="px-2 py-1 rounded bg-amber-900/30 text-amber-400">
              قدیمی‌ترین pending: {Math.round(summary.oldestPendingAgeSeconds / 60)} دقیقه
            </span>
          )}
          <span className="px-2 py-1 rounded bg-stone-800 text-stone-400">
            ارسال امروز: {summary.sentToday}
          </span>
        </div>
      )}

      {/* Recent problematic rows */}
      {rows.length > 0 && (
        <div>
          <p className="text-[11.5px] text-stone-500 mb-2">ردیف‌های ناموفق/مرده</p>
          <div className="rounded-xl border border-stone-800 bg-stone-900 overflow-hidden divide-y divide-stone-800/60">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3 text-right">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_COLOR[r.status] ?? 'bg-stone-700 text-stone-400')}>
                    {r.status}
                  </span>
                  <span className="text-[11px] text-stone-300">{r.ruleKey}</span>
                  <span className="text-[10px] text-stone-500">{r.channel}</span>
                  {r.maskedRecipient && (
                    <span className="text-[10px] text-stone-600 font-mono">{r.maskedRecipient}</span>
                  )}
                  <span className="text-[10px] text-stone-600 ms-auto tabular-nums">
                    {r.attempts}/{r.maxAttempts} تلاش
                  </span>
                  {(r.status === 'dead' || r.status === 'failed') && (
                    <button
                      type="button"
                      onClick={() => handleRetryOne(r.id)}
                      disabled={retryingOne === r.id}
                      title="تلاش مجدد این ردیف"
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600 transition-colors disabled:opacity-40"
                    >
                      {retryingOne === r.id
                        ? <Loader2 size={10} className="animate-spin" aria-hidden />
                        : <RotateCcw size={10} aria-hidden />}
                      مجدد
                    </button>
                  )}
                </div>
                {r.lastError && (
                  <p className="text-[10.5px] text-red-400/80 mt-1 font-mono break-all line-clamp-2">
                    {r.lastError}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Load more */}
          {nextCursor && (
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-1.5 text-[11.5px] text-stone-500 hover:text-stone-200 transition-colors disabled:opacity-40"
              >
                {loadingMore ? <Loader2 size={12} className="animate-spin" aria-hidden /> : null}
                بارگذاری بیشتر
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && total === 0 && rows.length === 0 && (
        <div className="text-center py-10 text-[12.5px] text-stone-500">
          صف خالی است — هیچ اعلانی برای ارسال در انتظار نیست.
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────

export default function NotificationRulesPage() {
  const [tab, setTab] = useState<Tab>('rules');
  const [rules, setRules] = useState<RuleWithAudience[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [drawerRuleKey, setDrawerRuleKey] = useState<string | null>(null);
  const [ruleSearch, setRuleSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/notification-audience', { credentials: 'include' });
      if (!res.ok) throw new Error('خطا در بارگذاری');
      const data = await res.json();
      setRules(data.rules ?? []);
      setCategories(data.categories ?? []);
    } catch {
      setError('بارگذاری قوانین ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = useCallback(async (key: string, body: Record<string, unknown>) => {
    setSaving(key);
    try {
      const res = await fetch('/api/admin/notification-rules', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...body }),
      });
      if (!res.ok) throw new Error('خطا');
      const data = await res.json();
      setRules((prev) => prev.map((r) => (r.key === key ? {
        ...r,
        enabled: data.rule.enabled,
        smsEnabled: data.rule.smsEnabled,
        inAppEnabled: data.rule.inAppEnabled,
        emailEnabled: data.rule.emailEnabled,
        threshold: data.rule.threshold,
        updatedAt: data.rule.updatedAt,
      } : r)));
      setLastSaved(key);
      setTimeout(() => setLastSaved(null), 2000);
    } catch {
      setError('ذخیره‌سازی ناموفق بود.');
    } finally {
      setSaving(null);
    }
  }, []);

  const handleToggle         = (key: string, enabled: boolean) => patch(key, { enabled });
  const handleThreshold      = (key: string, value: number | null) => patch(key, { threshold: value });
  const handleChannelToggle  = (key: string, field: 'inAppEnabled' | 'emailEnabled' | 'smsEnabled', value: boolean) =>
    patch(key, { [field]: value });

  const drawerRule = rules.find((r) => r.key === drawerRuleKey) ?? null;

  const visibleRules = rules.filter((r) => !r.catalog.hiddenFromUi);
  const filteredRules = ruleSearch.trim()
    ? visibleRules.filter((r) => r.catalog.title.toLowerCase().includes(ruleSearch.trim().toLowerCase()))
    : visibleRules;
  const grouped = categories
    .map((cat) => ({ category: cat, items: filteredRules.filter((r) => r.catalog.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-2xl space-y-6" dir="rtl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold text-stone-100 flex items-center gap-2">
            <Bell size={18} className="text-indigo-400" aria-hidden />
            مرکز اعلان V2
          </h1>
          <p className="text-[12.5px] text-stone-500 mt-1">
            قوانین، کانال‌ها، گیرندگان، و وضعیت صف ارسال
          </p>
        </div>
        {tab === 'rules' && (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="w-8 h-8 flex items-center justify-center rounded-md text-stone-500 hover:text-stone-200 hover:bg-stone-800 transition-colors"
            title="بارگذاری مجدد"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} aria-hidden />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-800 pb-0" role="tablist" aria-label="بخش‌های تنظیمات اعلان">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors',
              tab === t
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-stone-500 hover:text-stone-300',
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Tab: Rules */}
      {tab === 'rules' && (
        <>
          {lastSaved && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-[12px]">
              <CheckCircle2 size={13} aria-hidden />
              تغییرات ذخیره شد
            </div>
          )}
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-[12px]">
              {error}
            </div>
          )}

          {!loading && rules.length > 0 && (
            <div className="relative">
              <SearchIcon size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden />
              <input
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                placeholder="جست‌وجوی قانون..."
                className="w-full h-9 pr-9 pl-3 rounded-lg bg-stone-900 border border-stone-800 text-[12.5px] text-stone-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {loading ? (
            <div className="rounded-xl border border-stone-800 bg-stone-900 overflow-hidden">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-stone-800/60 last:border-b-0">
                  <div className="w-9 h-9 rounded-lg bg-stone-800 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-36 bg-stone-800 rounded animate-pulse" />
                    <div className="h-3 w-52 bg-stone-800/60 rounded animate-pulse" />
                  </div>
                  <div className="w-11 h-6 rounded-full bg-stone-800 animate-pulse" />
                </div>
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-xl border border-stone-800 bg-stone-900 p-10 text-center">
              <Bell size={28} className="text-stone-600 mx-auto mb-3" aria-hidden />
              <p className="text-[13px] text-stone-500">هیچ قانونی یافت نشد. Migration را اجرا کنید.</p>
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-xl border border-stone-800 bg-stone-900 p-8 text-center">
              <p className="text-[12.5px] text-stone-500">قانونی با این عبارت پیدا نشد.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <div key={g.category}>
                  <h2 className="text-[12px] font-semibold text-stone-400 mb-2 px-1">{g.category}</h2>
                  <div className="rounded-xl border border-stone-800 bg-stone-900 overflow-hidden">
                    {g.items.map((rule) => (
                      <RuleRow
                        key={rule.key}
                        rule={rule}
                        onToggle={handleToggle}
                        onThreshold={handleThreshold}
                        onChannelToggle={handleChannelToggle}
                        onOpenRecipients={setDrawerRuleKey}
                        saving={saving}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-stone-600">
            تغییرات بلافاصله اعمال می‌شوند — هیچ نیازی به ری‌استارت سرور نیست.
          </p>
        </>
      )}

      {/* Tab: Outbox */}
      {tab === 'outbox' && <OutboxTab />}

      {/* Recipients drawer */}
      {drawerRule && (
        <RecipientDrawer
          ruleKey={drawerRule.key}
          ruleTitle={drawerRule.catalog.title}
          branchAware={drawerRule.catalog.branchAware}
          currentTargets={drawerRule.targets}
          currentUpdatedAt={drawerRule.updatedAt}
          onClose={() => setDrawerRuleKey(null)}
          onSaved={() => { load(); }}
        />
      )}
    </div>
  );
}
