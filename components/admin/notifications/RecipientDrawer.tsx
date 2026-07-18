'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Loader2, Search, Plus, Copy, RotateCcw,
  CheckCircle2, AlertTriangle, ShieldAlert, Mail, MessageSquare, LayoutList,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types (mirror the API shapes in app/api/admin/notification-audience) ──

type Channel = 'in_app' | 'sms' | 'email';
type Effect = 'include' | 'exclude';
type TargetType = 'all_active' | 'role' | 'branch' | 'event_branch' | 'user';

interface TargetRow {
  channel: Channel | null;
  effect: Effect;
  targetType: TargetType;
  roleTarget: string | null;
  branchTarget: string | null;
  userTarget: string | null;
}

interface OptionUser {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
  branchId: string | null;
  branchName: string | null;
  emailReady: boolean;
  smsReady: boolean;
  maskedEmail: string | null;
  maskedPhone: string | null;
}

interface OptionRole { value: string; label: string; }
interface OptionBranch { id: string; name: string; }

interface PreviewRecipient {
  userId: string;
  name: string;
  role: string;
  branchName: string | null;
  isActive: boolean;
  eligible: boolean;
  reason: string | null;
  emailReady: boolean;
  smsReady: boolean;
  maskedEmail: string | null;
  maskedPhone: string | null;
}

export interface RecipientDrawerProps {
  ruleKey: string;
  ruleTitle: string;
  branchAware: boolean;
  currentTargets: TargetRow[];
  currentUpdatedAt: string;
  onClose: () => void;
  onSaved: (newUpdatedAt: string) => void;
}

const CHANNEL_TABS: Array<{ key: Channel; label: string; icon: typeof LayoutList }> = [
  { key: 'in_app', label: 'داخل‌برنامه', icon: LayoutList },
  { key: 'email', label: 'ایمیل', icon: Mail },
  { key: 'sms', label: 'پیامک', icon: MessageSquare },
];

const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'مدیر کل',
  BranchUser: 'کاربر شعبه',
  Warehouse: 'انباردار',
  Chef: 'سرآشپز',
};

const REASON_LABELS: Record<string, string> = {
  inactive: 'غیرفعال',
  missing_email: 'بدون ایمیل ثبت‌شده',
  missing_phone: 'بدون شماره ثبت‌شده',
  missing_access: 'بدون دسترسی بخش لازم',
};

function targetLabel(t: TargetRow, users: OptionUser[], branches: OptionBranch[]): string {
  switch (t.targetType) {
    case 'all_active': return 'همه‌ی کاربران فعال';
    case 'role': return `نقش: ${ROLE_LABELS[t.roleTarget ?? ''] ?? t.roleTarget}`;
    case 'branch': return `شعبه: ${branches.find((b) => b.id === t.branchTarget)?.name ?? '—'}`;
    case 'event_branch': return 'همان شعبه‌ی رویداد';
    case 'user': return `کاربر: ${users.find((u) => u.id === t.userTarget)?.name ?? '—'}`;
    default: return '—';
  }
}

function sameTarget(a: TargetRow, b: TargetRow): boolean {
  return (
    a.channel === b.channel && a.effect === b.effect && a.targetType === b.targetType &&
    a.roleTarget === b.roleTarget && a.branchTarget === b.branchTarget && a.userTarget === b.userTarget
  );
}

export function RecipientDrawer({
  ruleKey, ruleTitle, branchAware, currentTargets, currentUpdatedAt, onClose, onSaved,
}: RecipientDrawerProps) {
  const [tab, setTab] = useState<Channel>('in_app');
  const [draft, setDraft] = useState<TargetRow[]>(currentTargets);
  const [updatedAt, setUpdatedAt] = useState(currentUpdatedAt);

  const [users, setUsers] = useState<OptionUser[]>([]);
  const [branches, setBranches] = useState<OptionBranch[]>([]);
  const [roles, setRoles] = useState<OptionRole[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);

  const [preview, setPreview] = useState<Record<Channel, PreviewRecipient[]>>({ in_app: [], sms: [], email: [] });
  const [previewLoading, setPreviewLoading] = useState(false);

  const [pickerOpen, setPickerOpen] = useState<Effect | null>(null);
  const [pickerType, setPickerType] = useState<TargetType>('role');
  const [pickerSearch, setPickerSearch] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const dirty = useMemo(() => {
    if (draft.length !== currentTargets.length) return true;
    return !draft.every((d) => currentTargets.some((c) => sameTarget(d, c)));
  }, [draft, currentTargets]);

  // ── Load options once ──────────────────────────────────────────
  useEffect(() => {
    setOptionsLoading(true);
    fetch('/api/admin/notification-audience/options', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setBranches(d.branches ?? []);
        setRoles(d.roles ?? []);
      })
      .catch(() => setError('بارگذاری فهرست کاربران ناموفق بود.'))
      .finally(() => setOptionsLoading(false));
  }, []);

  // ── Live preview on draft change (debounced) ───────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreviewLoading(true);
      fetch('/api/admin/notification-audience', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', ruleKey, targets: draft }),
      })
        .then((r) => r.json())
        .then((d) => setPreview(d.recipients ?? { in_app: [], sms: [], email: [] }))
        .catch(() => {})
        .finally(() => setPreviewLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, ruleKey]);

  const channelTargets = useCallback(
    (ch: Channel, effect: Effect) => draft.filter((t) => t.channel === ch && t.effect === effect),
    [draft]
  );
  const sharedTargets = useMemo(() => draft.filter((t) => t.channel === null), [draft]);
  const isCustom = channelTargets(tab, 'include').length > 0 || channelTargets(tab, 'exclude').length > 0;

  function addTarget(effect: Effect, targetType: TargetType, value: string | null) {
    const row: TargetRow = {
      channel: tab, effect, targetType,
      roleTarget: targetType === 'role' ? value : null,
      branchTarget: targetType === 'branch' ? value : null,
      userTarget: targetType === 'user' ? value : null,
    };
    setDraft((prev) => (prev.some((t) => sameTarget(t, row)) ? prev : [...prev, row]));
    setPickerOpen(null);
    setPickerSearch('');
  }

  function removeTarget(row: TargetRow) {
    setDraft((prev) => prev.filter((t) => !sameTarget(t, row)));
  }

  function enableCustom() {
    addTarget('include', 'all_active', null);
  }

  function revertToDefault() {
    setDraft((prev) => prev.filter((t) => t.channel !== tab));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setConflict(false);
    try {
      const res = await fetch('/api/admin/notification-audience', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'replace', ruleKey, targets: draft, expectedUpdatedAt: updatedAt }),
      });
      if (res.status === 409) { setConflict(true); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error ?? 'خطا در ذخیره'); }
      const d = await res.json();
      setUpdatedAt(d.rule.updatedAt);
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
      onSaved(d.rule.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy(fromChannel: Channel) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/notification-audience', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'copy', ruleKey, fromChannel, toChannel: tab, expectedUpdatedAt: updatedAt }),
      });
      if (res.status === 409) { setConflict(true); return; }
      if (!res.ok) throw new Error('کپی ناموفق بود');
      const d = await res.json();
      setUpdatedAt(d.rule.updatedAt);
      const copied = draft.filter((t) => t.channel === fromChannel).map((t) => ({ ...t, channel: tab }));
      setDraft((prev) => [...prev.filter((t) => t.channel !== tab), ...copied]);
      // copy already persisted server-side (unlike include/exclude edits) — refresh the
      // parent's rule list so `currentTargets` catches up and `dirty` clears correctly.
      onSaved(d.rule.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'کپی ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!window.confirm('گیرندگان این قانون به حالت پیش‌فرض (مدیران کل فعال) بازگردانده شود؟')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/notification-audience', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', ruleKey, expectedUpdatedAt: updatedAt }),
      });
      if (res.status === 409) { setConflict(true); return; }
      if (!res.ok) throw new Error('بازگردانی ناموفق بود');
      const d = await res.json();
      setUpdatedAt(d.rule.updatedAt);
      setDraft([]);
      onSaved(d.rule.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'بازگردانی ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    if (dirty && !window.confirm('تغییرات ذخیره‌نشده از بین می‌روند. بستن؟')) return;
    onClose();
  }

  const filteredUsers = users.filter((u) =>
    !pickerSearch || u.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );
  const currentTab = CHANNEL_TABS.find((c) => c.key === tab)!;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={handleClose}
        className="fixed inset-0 z-40 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`گیرندگان — ${ruleTitle}`}
        className="fixed inset-y-0 left-0 right-0 sm:right-0 sm:left-auto z-50 w-full sm:w-[560px] sm:max-w-[92vw] bg-stone-950 border-r-0 sm:border-l border-stone-800 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 h-14 border-b border-stone-800 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-[13.5px] font-medium text-stone-100 truncate">گیرندگان — {ruleTitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="بستن"
            className="w-8 h-8 flex items-center justify-center rounded-md text-stone-400 hover:bg-stone-800 hover:text-stone-100 transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Channel tabs */}
        <div className="flex gap-1 px-4 sm:px-5 pt-3 border-b border-stone-800" role="tablist">
          {CHANNEL_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-medium border-b-2 -mb-px transition-colors',
                tab === t.key ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-stone-500 hover:text-stone-300'
              )}
            >
              <t.icon size={13} aria-hidden />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-5">
          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-900/30 border border-red-800/50 text-red-400 text-[12px]">{error}</div>
          )}
          {conflict && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-900/30 border border-amber-800/50 text-amber-300 text-[12px]">
              <ShieldAlert size={14} className="flex-shrink-0" aria-hidden />
              این قانون توسط جلسه‌ی دیگری تغییر کرده — صفحه را رفرش کنید تا آخرین نسخه را ببینید.
            </div>
          )}
          {savedMsg && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/30 border border-emerald-800/50 text-emerald-400 text-[12px]">
              <CheckCircle2 size={13} aria-hidden /> ذخیره شد
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={revertToDefault}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
                  !isCustom ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                )}
              >
                پیش‌فرض (مدیران کل فعال)
              </button>
              <button
                type="button"
                onClick={enableCustom}
                className={cn(
                  'px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors',
                  isCustom ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                )}
              >
                سفارشی
              </button>
            </div>
            <div className="flex items-center gap-1">
              {CHANNEL_TABS.filter((c) => c.key !== tab).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleCopy(c.key)}
                  disabled={saving || dirty}
                  title={dirty ? 'ابتدا تغییرات ذخیره‌نشده را ذخیره کنید' : `کپی تنظیمات از ${c.label}`}
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded border border-stone-700 text-stone-500 hover:text-stone-200 hover:border-stone-600 transition-colors disabled:opacity-40"
                >
                  <Copy size={11} aria-hidden /> از {c.label}
                </button>
              ))}
            </div>
          </div>

          {sharedTargets.length > 0 && (
            <div className="px-3 py-2 rounded-lg bg-stone-900 border border-stone-800 text-[11.5px] text-stone-500">
              {sharedTargets.length} هدف مشترک (روی همه‌ی کانال‌های بدون تنظیم اختصاصی) از نسخه‌های قبلی موجود است.
            </div>
          )}

          {isCustom && (
            <>
              {/* Include list */}
              <div className="space-y-2">
                <p className="text-[11.5px] font-medium text-stone-400">شامل شود</p>
                <div className="flex flex-wrap gap-1.5">
                  {channelTargets(tab, 'include').map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-full bg-emerald-950/50 border border-emerald-800/40 text-emerald-300">
                      {targetLabel(t, users, branches)}
                      <button type="button" onClick={() => removeTarget(t)} aria-label="حذف" className="hover:text-red-400">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(pickerOpen === 'include' ? null : 'include')}
                    className="flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-full border border-dashed border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-colors"
                  >
                    <Plus size={11} /> افزودن
                  </button>
                </div>
              </div>

              {/* Exclude list */}
              <div className="space-y-2">
                <p className="text-[11.5px] font-medium text-stone-400">استثنا شود (همیشه برنده است)</p>
                <div className="flex flex-wrap gap-1.5">
                  {channelTargets(tab, 'exclude').map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-[11.5px] px-2 py-1 rounded-full bg-red-950/50 border border-red-800/40 text-red-300">
                      {targetLabel(t, users, branches)}
                      <button type="button" onClick={() => removeTarget(t)} aria-label="حذف" className="hover:text-red-200">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(pickerOpen === 'exclude' ? null : 'exclude')}
                    className="flex items-center gap-1 text-[11.5px] px-2 py-1 rounded-full border border-dashed border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-colors"
                  >
                    <Plus size={11} /> افزودن استثنا
                  </button>
                </div>
              </div>

              {/* Picker */}
              {pickerOpen && (
                <div className="rounded-lg border border-stone-700 bg-stone-900 p-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {(['role', 'branch', 'user', ...(branchAware ? ['event_branch'] as TargetType[] : [])] as TargetType[]).map((tt) => (
                      <button
                        key={tt}
                        type="button"
                        onClick={() => setPickerType(tt)}
                        className={cn(
                          'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                          pickerType === tt ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-stone-400'
                        )}
                      >
                        {tt === 'role' ? 'نقش' : tt === 'branch' ? 'شعبه' : tt === 'user' ? 'کاربر خاص' : 'همان شعبه‌ی رویداد'}
                      </button>
                    ))}
                  </div>

                  {pickerType === 'role' && (
                    <div className="flex flex-wrap gap-1.5">
                      {roles.map((r) => (
                        <button key={r.value} type="button" onClick={() => addTarget(pickerOpen, 'role', r.value)}
                          className="px-2.5 py-1 rounded-md text-[11.5px] bg-stone-800 text-stone-300 hover:bg-stone-700">
                          {r.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {pickerType === 'branch' && (
                    <div className="flex flex-wrap gap-1.5">
                      {branches.map((b) => (
                        <button key={b.id} type="button" onClick={() => addTarget(pickerOpen, 'branch', b.id)}
                          className="px-2.5 py-1 rounded-md text-[11.5px] bg-stone-800 text-stone-300 hover:bg-stone-700">
                          {b.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {pickerType === 'event_branch' && (
                    <button type="button" onClick={() => addTarget(pickerOpen, 'event_branch', null)}
                      className="px-2.5 py-1 rounded-md text-[11.5px] bg-stone-800 text-stone-300 hover:bg-stone-700">
                      افزودن «همان شعبه‌ی رویداد»
                    </button>
                  )}
                  {pickerType === 'user' && (
                    <div className="space-y-2">
                      <div className="relative">
                        <Search size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500" aria-hidden />
                        <input
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="جست‌وجوی نام..."
                          className="w-full h-8 pr-8 pl-2 rounded-md bg-stone-800 border border-stone-700 text-[12px] text-stone-200 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {optionsLoading ? (
                          <p className="text-[11px] text-stone-500 p-2">در حال بارگذاری...</p>
                        ) : filteredUsers.length === 0 ? (
                          <p className="text-[11px] text-stone-500 p-2">کاربری یافت نشد</p>
                        ) : filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => addTarget(pickerOpen, 'user', u.id)}
                            className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-stone-800 text-right"
                          >
                            <span className="text-[12px] text-stone-200 truncate">{u.name}</span>
                            <span className="text-[10px] text-stone-500 flex-shrink-0">{ROLE_LABELS[u.role] ?? u.role}{u.branchName ? ` · ${u.branchName}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Live preview */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <div className="flex items-center gap-2">
              <p className="text-[11.5px] font-medium text-stone-400">پیش‌نمایش گیرندگان — {currentTab.label}</p>
              {previewLoading && <Loader2 size={11} className="animate-spin text-stone-600" aria-hidden />}
            </div>
            {preview[tab].length === 0 ? (
              <p className="text-[11.5px] text-stone-600 px-1 py-2">هیچ گیرنده‌ای — هیچ اعلانی از این کانال ارسال نمی‌شود.</p>
            ) : (
              <ul className="space-y-1">
                {preview[tab].map((r) => (
                  <li key={r.userId} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-stone-900 border border-stone-800/60">
                    <div className="min-w-0">
                      <p className="text-[12px] text-stone-200 truncate">{r.name}</p>
                      <p className="text-[10px] text-stone-500">{ROLE_LABELS[r.role] ?? r.role}{r.branchName ? ` · ${r.branchName}` : ''}</p>
                    </div>
                    {r.eligible ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 flex-shrink-0">
                        <CheckCircle2 size={11} aria-hidden /> ارسال می‌شود
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[10px] text-amber-400 flex-shrink-0" title={r.reason ?? undefined}>
                        <AlertTriangle size={11} aria-hidden /> {REASON_LABELS[r.reason ?? ''] ?? 'نامشخص'}
                        {r.reason === 'missing_access' && (
                          <a
                            href="/admin/users"
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-amber-300 hover:text-amber-200"
                          >
                            مدیریت دسترسی
                          </a>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Footer — explicit save/cancel */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-stone-800 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            <RotateCcw size={12} aria-hidden /> بازگردانی کل قانون به پیش‌فرض
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-2 rounded-lg text-[12.5px] text-stone-400 hover:text-stone-200 transition-colors"
            >
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className="px-4 py-2 rounded-lg text-[12.5px] font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors flex items-center gap-1.5"
            >
              {saving && <Loader2 size={12} className="animate-spin" aria-hidden />}
              ذخیره
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
