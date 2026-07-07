'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, ShieldCheck, ShieldOff, Filter,
  AlertTriangle, Info, X, ExternalLink, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { Sheet } from '@/components/ui/Sheet';
import { cn, toFa, fmt } from '@/lib/utils';
import { useAppStore } from '@/store';

// ─── types ──────────────────────────────────────────────────────────
type Severity = 'high' | 'medium' | 'low';
type FindingStatus = 'new' | 'investigating' | 'confirmed' | 'false_positive';

interface Finding {
  id: string;
  ruleKey: string;
  severity: Severity;
  status: FindingStatus;
  branchId: string | null;
  branchName: string | null;
  entityId: string;
  entityType: string;
  summary: string;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
}

interface CountData { high: number; medium: number; low: number; total: number }
interface BranchItem { id: string; name: string }

// ─── helpers ─────────────────────────────────────────────────────────
const SEV_LABEL: Record<Severity, string> = { high: 'بالا', medium: 'متوسط', low: 'پایین' };
const SEV_COLOR: Record<Severity, string> = {
  high:   'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low:    'bg-blue-50 text-blue-700 border-blue-200',
};
const SEV_DOT: Record<Severity, string> = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-blue-400',
};
const STATUS_LABEL: Record<FindingStatus, string> = {
  new:             'جدید',
  investigating:   'در حال بررسی',
  confirmed:       'تأیید شده',
  false_positive:  'مثبت کاذب',
};
const STATUS_COLOR: Record<FindingStatus, string> = {
  new:             'bg-red-50 text-red-600 border-red-100',
  investigating:   'bg-amber-50 text-amber-700 border-amber-100',
  confirmed:       'bg-emerald-50 text-emerald-700 border-emerald-100',
  false_positive:  'bg-stone-50 text-stone-500 border-stone-200',
};
const RULE_LABELS: Record<string, string> = {
  waste_spike:          'جهش ضایعات',
  price_jump:           'جهش قیمت خرید',
  rejection_pattern:    'تکرار ابطال',
  consumption_spike:    'مغایرت مصرف',
  below_approval_limit: 'زیر سقف تأیید',
  off_hours:            'ساعت غیرعادی',
};
const ENTITY_LINK: Record<string, (id: string) => string | null> = {
  voucher:     (id) => `/inventory/vouchers/${id}`,
  transaction: (id) => `/transactions/${id}`,
};

function formatJalali(isoDate: string) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(isoDate));
  } catch { return isoDate; }
}

// ─── SummaryCard ─────────────────────────────────────────────────────
function SummaryCard({ label, count, color, icon: Icon }: {
  label: string; count: number; color: string; icon: React.ElementType;
}) {
  return (
    <div className={cn('bg-white border rounded-lg p-4 flex items-center gap-3', color)}>
      <div className="flex-shrink-0">
        <Icon size={18} strokeWidth={1.5} />
      </div>
      <div>
        <div className="text-[20px] font-semibold leading-tight">{toFa(count)}</div>
        <div className="text-[11.5px] mt-0.5 opacity-80">{label}</div>
      </div>
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────
export default function AnomalyPage() {
  const user = useAppStore((s) => s.user);
  const [counts, setCounts] = useState<CountData>({ high: 0, medium: 0, low: 0, total: 0 });
  const [findings, setFindings] = useState<Finding[]>([]);
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [loading, setLoading] = useState(true);

  // فیلترها
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterRule, setFilterRule] = useState('');

  // drawer
  const [selected, setSelected] = useState<Finding | null>(null);
  const [drawerNote, setDrawerNote] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterSeverity) params.set('severity', filterSeverity);
      if (filterStatus)   params.set('status', filterStatus);
      if (filterBranch)   params.set('branchId', filterBranch);
      if (filterRule)     params.set('ruleKey', filterRule);

      const [cRes, fRes] = await Promise.all([
        fetch('/api/anomaly/findings/counts'),
        fetch(`/api/anomaly/findings?${params}`),
      ]);
      if (cRes.ok) setCounts(await cRes.json());
      if (fRes.ok) {
        const data = await fRes.json();
        setFindings(data.findings ?? []);
        setBranches(data.branches ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [filterSeverity, filterStatus, filterBranch, filterRule]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function changeStatus(id: string, status: FindingStatus) {
    setChangingStatus(true);
    try {
      const res = await fetch(`/api/anomaly/findings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note: drawerNote || undefined }),
      });
      if (res.ok) {
        await fetchData();
        setSelected(null);
        setDrawerNote('');
      }
    } finally {
      setChangingStatus(false);
    }
  }

  const sourceLink = selected
    ? (ENTITY_LINK[selected.entityType]?.(selected.entityId) ?? null)
    : null;

  return (
    <div className="p-4 lg:p-6 space-y-5" dir="rtl">
      {/* ─── header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} strokeWidth={1.5} className="text-stone-600" />
        <div>
          <h1 className="text-[18px] font-medium text-stone-900">کارآگاه مالی</h1>
          <p className="text-[11.5px] text-muted mt-0.5">یافته‌های مشکوک شناسایی‌شده توسط موتور تحلیل</p>
        </div>
      </div>

      {/* ─── summary cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="شدت بالا" count={counts.high}   color="border-red-200 text-red-700"   icon={ShieldAlert} />
        <SummaryCard label="شدت متوسط" count={counts.medium} color="border-amber-200 text-amber-700" icon={AlertTriangle} />
        <SummaryCard label="شدت پایین" count={counts.low}    color="border-blue-200 text-blue-700"   icon={Info} />
        <SummaryCard label="کل باز" count={counts.total}  color="border-stone-200 text-stone-700"  icon={ShieldCheck} />
      </div>

      {/* ─── filters ────────────────────────────────────────────────── */}
      <div className="bg-white border border-stone-100 rounded-lg p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <Filter size={13} className="text-muted flex-shrink-0" strokeWidth={1.5} />

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="h-8 text-[12px] border border-stone-200 rounded-md px-2 bg-white text-stone-700 focus:outline-none focus:border-accent"
          >
            <option value="">همه شدت‌ها</option>
            <option value="high">بالا</option>
            <option value="medium">متوسط</option>
            <option value="low">پایین</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-8 text-[12px] border border-stone-200 rounded-md px-2 bg-white text-stone-700 focus:outline-none focus:border-accent"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="new">جدید</option>
            <option value="investigating">در حال بررسی</option>
            <option value="confirmed">تأیید شده</option>
            <option value="false_positive">مثبت کاذب</option>
          </select>

          {branches.length > 0 && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="h-8 text-[12px] border border-stone-200 rounded-md px-2 bg-white text-stone-700 focus:outline-none focus:border-accent"
            >
              <option value="">همه شعب</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}

          <select
            value={filterRule}
            onChange={(e) => setFilterRule(e.target.value)}
            className="h-8 text-[12px] border border-stone-200 rounded-md px-2 bg-white text-stone-700 focus:outline-none focus:border-accent"
          >
            <option value="">همه قوانین</option>
            {Object.entries(RULE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          {(filterSeverity || filterStatus || filterBranch || filterRule) && (
            <button
              type="button"
              onClick={() => { setFilterSeverity(''); setFilterStatus(''); setFilterBranch(''); setFilterRule(''); }}
              className="flex items-center gap-1 h-8 px-2 text-[11.5px] text-muted hover:text-danger transition-colors"
            >
              <X size={12} strokeWidth={2} />
              پاک کردن
            </button>
          )}

          <span className="mr-auto text-[11px] text-muted">{toFa(findings.length)} یافته</span>
        </div>
      </div>

      {/* ─── table ──────────────────────────────────────────────────── */}
      <div className="bg-white border border-stone-100 rounded-lg overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="h-14 border-b border-stone-50 bg-stone-50 animate-pulse" />
            ))}
          </div>
        ) : findings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted">
            <ShieldOff size={32} strokeWidth={1} className="mb-3 opacity-30" />
            <span className="text-[13px]">یافته‌ای موجود نیست</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-muted text-right">
                  <th className="px-4 py-2.5 font-medium">شدت</th>
                  <th className="px-4 py-2.5 font-medium">قانون</th>
                  <th className="px-4 py-2.5 font-medium hidden lg:table-cell">شعبه</th>
                  <th className="px-4 py-2.5 font-medium">خلاصه</th>
                  <th className="px-4 py-2.5 font-medium">وضعیت</th>
                  <th className="px-4 py-2.5 font-medium hidden md:table-cell">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => { setSelected(f); setDrawerNote(''); }}
                    className="border-b border-stone-50 last:border-0 hover:bg-stone-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border', SEV_COLOR[f.severity])}>
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', SEV_DOT[f.severity])} />
                        {SEV_LABEL[f.severity]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">{RULE_LABELS[f.ruleKey] ?? f.ruleKey}</td>
                    <td className="px-4 py-3 text-stone-600 hidden lg:table-cell">{f.branchName ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-800 max-w-[200px] truncate">{f.summary}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full border', STATUS_COLOR[f.status])}>
                        {STATUS_LABEL[f.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted hidden md:table-cell">{formatJalali(f.detectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── detail drawer ─────────────────────────────────────────── */}
      <Sheet
        open={!!selected}
        onClose={() => { setSelected(null); setDrawerNote(''); }}
        title="جزئیات یافته"
        maxHeight="90vh"
      >
        {selected && (
          <div className="px-5 pb-6 pt-2 space-y-4 overflow-y-auto" dir="rtl">

            {/* badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-medium', SEV_COLOR[selected.severity])}>
                <span className={cn('w-1.5 h-1.5 rounded-full', SEV_DOT[selected.severity])} />
                شدت {SEV_LABEL[selected.severity]}
              </span>
              <span className={cn('inline-block text-[11px] px-2.5 py-1 rounded-full border', STATUS_COLOR[selected.status])}>
                {STATUS_LABEL[selected.status]}
              </span>
              <span className="text-[11px] text-muted px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-full">
                {RULE_LABELS[selected.ruleKey] ?? selected.ruleKey}
              </span>
            </div>

            {/* خلاصه */}
            <div className="bg-stone-50 border border-stone-100 rounded-lg p-4">
              <div className="text-[11px] text-muted mb-1">خلاصه یافته</div>
              <p className="text-[13px] text-stone-800 leading-relaxed">{selected.summary}</p>
            </div>

            {/* متادیتا */}
            {selected.metadata && Object.keys(selected.metadata).length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-muted mb-2">اطلاعات تکمیلی</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.entries(selected.metadata).map(([k, v]) => (
                    <div key={k} className="flex flex-col bg-stone-50 border border-stone-100 rounded-md px-3 py-2">
                      <span className="text-[10px] text-muted">{k}</span>
                      <span className="text-[12px] text-stone-800 font-medium mt-0.5">
                        {typeof v === 'number' ? toFa(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* لینک به رکورد منبع */}
            {sourceLink && (
              <Link
                href={sourceLink}
                className="flex items-center gap-2 text-[12.5px] text-accent hover:text-accent/80 transition-colors"
              >
                <ExternalLink size={13} strokeWidth={1.5} />
                مشاهده رکورد منبع ({selected.entityType} #{selected.entityId.slice(-6)})
              </Link>
            )}

            {/* زمان */}
            <div className="flex items-center gap-4 text-[11px] text-muted">
              <span>شناسایی: {formatJalali(selected.detectedAt)}</span>
              {selected.resolvedAt && (
                <span>حل‌شده: {formatJalali(selected.resolvedAt)}</span>
              )}
            </div>

            {/* یادداشت قبلی */}
            {selected.note && (
              <div className="text-[12px] text-stone-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                یادداشت: {selected.note}
              </div>
            )}

            {/* تغییر وضعیت */}
            {(selected.status === 'new' || selected.status === 'investigating') && (
              <div className="border-t border-stone-100 pt-4 space-y-3">
                <div className="text-[12px] font-medium text-stone-700">تغییر وضعیت</div>

                <textarea
                  value={drawerNote}
                  onChange={(e) => setDrawerNote(e.target.value)}
                  placeholder="یادداشت (اختیاری)..."
                  rows={2}
                  className="w-full text-[12px] border border-stone-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:border-accent text-stone-800"
                />

                <div className="flex gap-2 flex-wrap">
                  {selected.status === 'new' && (
                    <button
                      type="button"
                      onClick={() => changeStatus(selected.id, 'investigating')}
                      disabled={changingStatus}
                      className="flex-1 h-9 text-[12.5px] bg-amber-50 text-amber-700 border border-amber-200 rounded-md hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      در حال بررسی
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => changeStatus(selected.id, 'confirmed')}
                    disabled={changingStatus}
                    className="flex-1 h-9 text-[12.5px] bg-red-50 text-red-700 border border-red-200 rounded-md hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    تأیید مشکل
                  </button>
                  <button
                    type="button"
                    onClick={() => changeStatus(selected.id, 'false_positive')}
                    disabled={changingStatus}
                    className="flex-1 h-9 text-[12.5px] bg-stone-50 text-stone-600 border border-stone-200 rounded-md hover:bg-stone-100 transition-colors disabled:opacity-50"
                  >
                    مثبت کاذب
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
