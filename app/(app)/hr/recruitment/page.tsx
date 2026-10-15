'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  UserPlus, Download, Search, Settings2, Wrench, ExternalLink,
  GitCompareArrows, MoreVertical, RefreshCw, X, SlidersHorizontal, BarChart3,
  List, LayoutGrid, ChevronDown,
} from 'lucide-react';
import { Button, ButtonLink, Input, Select, Empty, InlineNotice, Popover, Skeleton, useConfirm } from '@/components/ui';
import { PageShell } from '@/components/ui/PageShell';
import { Tabs } from '@/components/ui/Tabs';
import { useAppStore } from '@/store';
import {
  AREA_LABELS, STATUS_LABELS, GENDER_LABELS, SCREENING_QUESTIONS,
  SHIFT_LABELS, START_LABELS, REFERRAL_LABELS,
  type JobApplication, type ApplicationStatus, type ApplicationArea,
} from '@/lib/recruitment/questions';
import type { FieldSnapshot, FormFieldData, FormSectionData } from '@/lib/recruitment/form-types';
import { faDate } from '@/lib/recruitment/display';
import {
  DEFAULT_FILTERS, paramsToFilters, filtersToParams, canViewPhone,
  type CandidateFilterState, type StatusFilter,
} from '@/lib/recruitment/filterCandidates';
import { CandidateCard, CandidateRow, CandidateListHeader } from '@/components/recruitment/CandidateCard';
import { CandidateDetailPanel } from '@/components/recruitment/CandidateDetail';
import { faNum } from '@/components/recruitment/CandidateBits';
import { CompareModal } from '@/components/recruitment/CompareModal';
import { QuestionsModal } from '@/components/recruitment/QuestionsModal';
import { cn } from '@/lib/utils';

const STATUS_TAB_LABELS: Record<StatusFilter, string> = {
  all: 'همه', new: 'جدید', shortlist: 'لیست کوتاه', accepted: 'قبول', rejected: 'رد',
};
const STATUS_TAB_ORDER: StatusFilter[] = ['all', 'new', 'shortlist', 'accepted', 'rejected'];
const COMPARE_MIN = 2;
const COMPARE_MAX = 4;
const VIEW_KEY = 'recruitment:view';

type ViewMode = 'list' | 'cards';

interface FunnelStats {
  totalApplications: number;
  byStatus: Record<string, number>;
  hiredCount: number;
  shortlistRate: number;
  acceptRate: number;
  hireRate: number;
  avgDaysToHire: number | null;
  topReferralSources: Array<{ source: string; applications: number; hired: number }>;
  hireCountByRole: Array<{ role: string; count: number }>;
}

/** querystring فیلترها برای API — همان پارامترهای URL صفحه (بدون page/limit). */
function filtersQuery(f: CandidateFilterState): string {
  return new URLSearchParams(filtersToParams(f)).toString();
}

export default function RecruitmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const user = useAppStore((s) => s.user);
  const applications = useAppStore((s) => s.applications);
  const applicationsLoaded = useAppStore((s) => s.applicationsLoaded);
  const refreshing = useAppStore((s) => s.applicationsRefreshing);
  const applicationsError = useAppStore((s) => s.applicationsError);
  const totalAll = useAppStore((s) => s.applicationsTotal);
  const totalFiltered = useAppStore((s) => s.applicationsFiltered);
  const counts = useAppStore((s) => s.applicationsStatusCounts);
  const loadApplications = useAppStore((s) => s.loadApplications);
  const loadMoreApplications = useAppStore((s) => s.loadMoreApplications);
  const reviewApplication = useAppStore((s) => s.reviewApplication);
  const deleteApplication = useAppStore((s) => s.deleteApplication);
  const showToast = useAppStore((s) => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<CandidateFilterState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [view, setView] = useState<ViewMode>('list');

  const [openId, setOpenId] = useState<string | null>(null);
  const openTriggerRef = useRef<HTMLElement | null>(null);

  const [formFields, setFormFields] = useState<FormFieldData[]>([]);
  const [showQuestions, setShowQuestions] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  /** انتخاب برای مقایسه/دانلود — خود رکورد نگه داشته می‌شود تا با عوض شدن فیلتر از دست نرود */
  const [selected, setSelected] = useState<Map<string, JobApplication>>(new Map());
  const [resumeZipLoading, setResumeZipLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showFunnel, setShowFunnel] = useState(false);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);

  async function openFunnel() {
    setShowFunnel(true);
    if (!funnel) {
      const res = await fetch('/api/hr/recruitment/funnel', { credentials: 'include', cache: 'no-store' });
      if (res.ok) setFunnel(await res.json());
    }
  }

  const canSeePhone = canViewPhone(user);

  // ── init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const initial = paramsToFilters(searchParams);
    setFilters(initial);
    setSearchInput(initial.search);
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === 'list' || v === 'cards') setView(v);
    } catch { /* حالت خصوصی مرورگر — پیش‌فرض فهرستی */ }
    setHydrated(true);
    fetch('/api/recruitment/form-builder', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { sections: FormSectionData[] }) => setFormFields(d.sections?.flatMap((s) => s.fields) ?? []))
      .catch(() => setFormFields([]));
  // فقط یک بار روی mount اجرا می‌شود
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── دریافت از سرور با هر تغییر فیلتر (جستجو/فیلتر/شمارش روی کل دیتابیس) ──
  const query = useMemo(() => filtersQuery(filters), [filters]);
  useEffect(() => {
    if (!hydrated) return;
    loadApplications(query);
  }, [hydrated, query, loadApplications]);

  const updateFilters = useCallback((patch: Partial<CandidateFilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      const qs = filtersQuery(next);
      router.replace(`${pathname}${qs ? '?' + qs : ''}`, { scroll: false });
      return next;
    });
  }, [router, pathname]);

  // ── جستجو: نمایش فوری، ارسال به سرور با تأخیر کوتاه ────────────────────
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => updateFilters({ search: value }), 300);
  }

  function clearAllFilters() {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    setSearchInput('');
    updateFilters({ ...DEFAULT_FILTERS, status: filters.status, sort: filters.sort }); // تب وضعیت و مرتب‌سازی حفظ می‌شوند
  }

  function changeView(v: ViewMode) {
    setView(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* بی‌اهمیت */ }
  }

  // ── فیلدهای filterable فرم‌ساز ─────────────────────────────────────────
  const filterableFields = useMemo(
    () => formFields.filter((f) => f.isFilterable && !f.isSystem && f.isActive && (f.type === 'select' || f.type === 'multiselect' || f.type === 'radio')),
    [formFields]
  );
  const customDisplayFields = useMemo(
    () => formFields.filter((f) => !f.isSystem && f.isActive),
    [formFields]
  );

  // ── فیلترهای فعال (به‌جز تب وضعیت که خودش دیده می‌شود) ──────────────────
  const activeChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; clear: () => void }> = [];
    if (filters.search.trim()) chips.push({ key: 'q', label: `جستجو: «${filters.search.trim()}»`, clear: () => { setSearchInput(''); updateFilters({ search: '' }); } });
    if (filters.area !== 'all') chips.push({ key: 'area', label: `بخش: ${AREA_LABELS[filters.area]}`, clear: () => updateFilters({ area: 'all' }) });
    if (filters.shift !== 'all') chips.push({ key: 'shift', label: `شیفت: ${SHIFT_LABELS[filters.shift]}`, clear: () => updateFilters({ shift: 'all' }) });
    if (filters.start !== 'all') chips.push({ key: 'start', label: `شروع: ${START_LABELS[filters.start as keyof typeof START_LABELS] ?? filters.start}`, clear: () => updateFilters({ start: 'all' }) });
    if (filters.gender !== 'all') chips.push({ key: 'gender', label: `جنسیت: ${GENDER_LABELS[filters.gender]}`, clear: () => updateFilters({ gender: 'all' }) });
    if (filters.referral !== 'all') chips.push({ key: 'referral', label: `آشنایی: ${REFERRAL_LABELS[filters.referral]}`, clear: () => updateFilters({ referral: 'all' }) });
    if (filters.hasResume !== 'all') chips.push({ key: 'resume', label: filters.hasResume === 'yes' ? 'دارای فایل رزومه' : 'بدون فایل رزومه', clear: () => updateFilters({ hasResume: 'all' }) });
    for (const [key, val] of Object.entries(filters.dynamicFilters)) {
      if (!val || val === 'all') continue;
      const field = formFields.find((f) => f.key === key);
      const opt = field?.options.find((o) => o.value === val);
      chips.push({
        key: `f_${key}`,
        label: `${field?.label ?? key}: ${opt?.label ?? val}`,
        clear: () => { const next = { ...filters.dynamicFilters }; delete next[key]; updateFilters({ dynamicFilters: next }); },
      });
    }
    return chips;
  }, [filters, formFields, updateFilters]);

  const moreFilterCount =
    (filters.start !== 'all' ? 1 : 0) + (filters.gender !== 'all' ? 1 : 0) +
    (filters.referral !== 'all' ? 1 : 0) + (filters.hasResume !== 'all' ? 1 : 0) +
    Object.values(filters.dynamicFilters).filter((v) => v && v !== 'all').length;

  const mobileFilterCount = moreFilterCount + (filters.area !== 'all' ? 1 : 0) + (filters.shift !== 'all' ? 1 : 0);

  // ── انتخاب ─────────────────────────────────────────────────────────────
  const selectedCandidates = useMemo(
    () => Array.from(selected.values()).map((s) => applications.find((a) => a.id === s.id) ?? s),
    [selected, applications]
  );
  const selectedWithResume = selectedCandidates.filter((a) => a.hasResume);
  const selCount = selectedCandidates.length;
  const compareDisabledReason =
    selCount < COMPARE_MIN ? `برای مقایسه حداقل ${faNum(COMPARE_MIN)} نفر را با چک‌باکس انتخاب کنید`
    : selCount > COMPARE_MAX ? `حداکثر ${faNum(COMPARE_MAX)} نفر را می‌توان مقایسه کرد`
    : null;

  function toggleSelected(a: JobApplication) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(a.id)) next.delete(a.id);
      else next.set(a.id, a);
      return next;
    });
  }

  // ── پنل جزئیات ─────────────────────────────────────────────────────────
  const openIndex = openId ? applications.findIndex((a) => a.id === openId) : -1;
  const openApp = openIndex >= 0 ? applications[openIndex]! : null;
  function openDetails(id: string, trigger: HTMLElement) {
    openTriggerRef.current = trigger;
    setOpenId(id);
  }
  const closeDetails = useCallback(() => {
    setOpenId(null);
    // فوکوس به دکمه‌ی بازکننده برمی‌گردد؛ اگر با قبلی/بعدی جابه‌جا شده، به ردیف همان داوطلب
    requestAnimationFrame(() => {
      const t = openTriggerRef.current;
      if (t && document.body.contains(t)) t.focus();
    });
  }, []);
  function stepDetails(delta: number) {
    const next = applications[openIndex + delta];
    if (!next) return;
    setOpenId(next.id);
    // trigger جدید: دکمه‌ی جزئیات ردیف همان داوطلب (برای برگشت فوکوس و دیده‌شدن در فهرست)
    // (هر داوطلب یک ردیف فهرستی و یک کارت دارد؛ فقط آن‌که الان دیده می‌شود)
    const row = Array.from(document.querySelectorAll<HTMLElement>(`[data-candidate-id="${next.id}"] button[aria-label^="مشاهدهٔ جزئیات"]`))
      .find((el) => el.offsetParent !== null);
    if (row) { openTriggerRef.current = row; row.scrollIntoView({ block: 'nearest' }); }
  }
  useEffect(() => {
    if (openId && applicationsLoaded && openIndex < 0) setOpenId(null); // حذف شد یا از فهرست خارج شد
  }, [openId, openIndex, applicationsLoaded]);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return (
      <div className="p-6">
        <Empty icon={UserPlus} title="دسترسی ندارید" sub="این بخش فقط برای مدیر کل است." />
      </div>
    );
  }

  // ── اکسل: همه‌ی نتایج فیلتر فعلی (نه فقط صفحه‌ی بارگذاری‌شده) ──────────
  async function fetchAllFiltered(): Promise<JobApplication[]> {
    const all: JobApplication[] = [];
    for (let page = 1; page <= 200; page++) {
      const params = new URLSearchParams(query);
      params.set('page', String(page));
      params.set('limit', '100');
      const res = await fetch(`/api/recruitment?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('fetch');
      const data = (await res.json()) as { applications: JobApplication[]; filteredTotal: number };
      all.push(...data.applications);
      if (data.applications.length < 100 || all.length >= data.filteredTotal) break;
    }
    return all;
  }
  async function exportXlsx() {
    setExporting(true);
    try {
      const sorted = await fetchAllFiltered();
      const rows = sorted.map((a) => {
        const base: Record<string, string | number> = {
          نام: a.firstName,
          'نام خانوادگی': a.lastName,
          موبایل: a.phone,
          سن: a.age ?? '',
          جنسیت: a.gender ? GENDER_LABELS[a.gender] : '',
          'محله سکونت': a.city ?? '',
          شیفت‌ها: (a.shiftAvailability ?? []).map((s: string) => SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s).join(' / '),
          'امکان شروع': a.startAvailability ? (START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability) : '',
          'کانال آشنایی': a.referralSource ? (REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource) : '',
          بخش: a.area ? AREA_LABELS[a.area] : '',
          وضعیت: STATUS_LABELS[a.status],
          امتیاز: a.score ?? '',
          رزومه: a.hasResume ? 'دارد' : a.manualInfo ? 'متنی' : '—',
          یادداشت: a.reviewerNote ?? '',
          تاریخ: faDate(a.createdAt),
        };
        for (const q of SCREENING_QUESTIONS) base[q.title] = a.answers[q.id] ?? '';
        const snap: FieldSnapshot[] = (a.fieldSnapshot as FieldSnapshot[] | undefined) ?? [];
        const cf: Record<string, unknown> = (a.customFields as Record<string, unknown> | undefined) ?? {};
        for (const s of snap) base[s.label] = String(cf[s.key] ?? '');
        return base;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'applications');
      XLSX.writeFile(wb, `recruitment-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      showToast('خروجی اکسل ناموفق بود', 'danger');
    } finally {
      setExporting(false);
    }
  }

  // ── اقدامات بررسی یک داوطلب ─────────────────────────────────────────────
  async function convertToEmployee(a: JobApplication) {
    if (a.hiredAt) { showToast('این داوطلب قبلاً استخدام شده', 'danger'); return; }
    const ok = await confirm({
      title: `«${a.firstName} ${a.lastName}» به پرونده‌ی پرسنلی تبدیل شود؟`,
      description: 'بعداً می‌توانید سمت/شعبه/نرخ او را تکمیل کنید.',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/hr/recruitment/${a.id}/hire`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: '{}',
      });
      const data = await res.json();
      if (!res.ok || !data.employeeId) {
        showToast(data.error ?? 'خطا در استخدام', 'danger');
        return;
      }
      showToast('پرونده‌ی پرسنلی ساخته شد', 'success');
      loadApplications();
      router.push(`/hr/people/${data.employeeId}`);
    } catch {
      showToast('خطا در ارتباط با سرور', 'danger');
    }
  }
  async function setStatus(a: JobApplication, status: ApplicationStatus) {
    const ok = await reviewApplication(a.id, { status });
    showToast(ok ? `وضعیت: ${STATUS_LABELS[status]}` : 'خطا در به‌روزرسانی وضعیت', ok ? 'success' : 'danger');
  }
  async function setScore(a: JobApplication, score: number | null) {
    const ok = await reviewApplication(a.id, { score });
    if (!ok) showToast('خطا در ثبت امتیاز', 'danger');
  }
  async function setArea(a: JobApplication, area: ApplicationArea | null) {
    const ok = await reviewApplication(a.id, { area });
    if (!ok) showToast('خطا در تغییر بخش', 'danger');
  }
  async function saveNote(a: JobApplication, note: string): Promise<boolean> {
    return reviewApplication(a.id, { reviewerNote: note.trim() || null });
  }
  async function handleDelete(a: JobApplication): Promise<boolean> {
    const ok = await deleteApplication(a.id);
    if (ok) {
      if (openId === a.id) closeDetails();
      setSelected((prev) => { const n = new Map(prev); n.delete(a.id); return n; });
      showToast('حذف شد', 'success');
    } else {
      showToast('خطا در حذف', 'danger');
    }
    return ok;
  }

  async function downloadSelectedResumes() {
    if (selectedWithResume.length === 0) return;
    setResumeZipLoading(true);
    try {
      const res = await fetch('/api/recruitment/resumes-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: selectedWithResume.map((a) => a.id) }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `resumes-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('رزومه‌ها دانلود شدند', 'success');
    } catch {
      showToast('دانلود ناموفق بود', 'danger');
    } finally {
      setResumeZipLoading(false);
    }
  }

  const loadedCount = applications.length;
  const hasFilters = activeChips.length > 0 || filters.status !== 'all';
  const noApplicationsAtAll = applicationsLoaded && !applicationsError && totalAll === 0;
  const noResults = applicationsLoaded && !applicationsError && totalAll > 0 && totalFiltered === 0;
  const menuItemCls = 'w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] text-text hover:bg-bg text-right disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40';

  return (
    <PageShell type="data" className="space-y-3 pt-3 md:pt-5">

      {/* ── هدر فشرده: عنوان + شمارش + دامنه‌ی شعبه | اقدامات ───────────── */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold tracking-tight text-text">استخدام</h1>
          <p className="text-[12px] text-muted">
            {applicationsLoaded ? `${faNum(totalAll)} درخواست` : 'در حال بارگذاری…'}
            <span aria-hidden="true"> · </span>
            <span title="درخواست‌های همکاری به شعبه‌ی خاصی وصل نیستند؛ فیلتر شعبه‌ی منابع انسانی روی این صفحه اثری ندارد.">
              مشترک برای همه‌ی شعبه‌ها
            </span>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <div className="flex items-center gap-2">
            {compareDisabledReason && (
              <span id="compare-hint" className="hidden lg:inline text-[11.5px] text-muted">{compareDisabledReason}</span>
            )}
            <Button
              variant={selCount >= COMPARE_MIN && !compareDisabledReason ? 'primary' : 'default'}
              size="sm"
              icon={GitCompareArrows}
              onClick={() => setShowCompare(true)}
              disabled={!!compareDisabledReason}
              aria-describedby={compareDisabledReason ? 'compare-hint' : undefined}
              title={compareDisabledReason ?? undefined}
            >
              مقایسه ({faNum(selCount)})
            </Button>
          </div>
          <ButtonLink href="/apply" target="_blank" rel="noopener noreferrer" variant="ghost" size="sm" icon={ExternalLink} className="hidden md:inline-flex">
            مشاهدهٔ فرم درخواست همکاری
          </ButtonLink>
          <Popover trigger={<MoreVertical size={16} strokeWidth={1.5} />} triggerLabel="اقدامات بیشتر" triggerClassName="h-8 px-2" panelRole="menu" align="end" panelClassName="top-10">
            {(close) => (
              <div className="p-1.5 w-60">
                <a role="menuitem" href="/apply" target="_blank" rel="noopener noreferrer" onClick={() => close()} className={cn(menuItemCls, 'md:hidden')}>
                  <ExternalLink size={14} strokeWidth={1.5} /> مشاهدهٔ فرم درخواست همکاری
                </a>
                <button type="button" role="menuitem" onClick={() => { close(); exportXlsx(); }} disabled={totalFiltered === 0 || exporting} className={menuItemCls}>
                  <Download size={14} strokeWidth={1.5} /> خروجی اکسل ({faNum(totalFiltered)} نتیجه)
                </button>
                <button type="button" role="menuitem" onClick={() => { close(); openFunnel(); }} className={menuItemCls}>
                  <BarChart3 size={14} strokeWidth={1.5} /> آمار قیف استخدام
                </button>
                <div className="border-t border-border my-1.5" />
                <button type="button" role="menuitem" onClick={() => { close(); router.push('/hr/recruitment/form-builder'); }} className={menuItemCls}>
                  <Wrench size={14} strokeWidth={1.5} /> فرم‌ساز
                </button>
                <button type="button" role="menuitem" onClick={() => { close(); setShowQuestions(true); }} className={menuItemCls}>
                  <Settings2 size={14} strokeWidth={1.5} /> سوال‌ها
                </button>
              </div>
            )}
          </Popover>
        </div>
      </div>

      {/* ── تب‌های وضعیت — شمارش روی کل دیتابیس با فیلترهای فعلی ─────── */}
      <div className="overflow-x-auto -mx-1 px-1">
        <Tabs
          value={filters.status}
          onChange={(status) => updateFilters({ status })}
          aria-label="فیلتر وضعیت داوطلبان"
          className="flex-nowrap [&_[role=tab]]:whitespace-nowrap [&_[role=tab]]:shrink-0"
          items={STATUS_TAB_ORDER.map((s) => ({ value: s, label: STATUS_TAB_LABELS[s], count: applicationsLoaded ? counts[s] : undefined }))}
        />
      </div>

      {/* ── جستجو + فیلترهای پرکاربرد ───────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1 sm:min-w-[220px] sm:max-w-sm">
            <Input
              icon={Search}
              type="search"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="جستجوی نام یا موبایل…"
              aria-label="جستجوی نام یا شماره موبایل"
            />
          </div>
          <Select value={filters.area} onChange={(e) => updateFilters({ area: e.target.value as CandidateFilterState['area'] })} className="hidden sm:block sm:w-32" aria-label="فیلتر بخش">
            <option value="all">همه بخش‌ها</option>
            <option value="hall">سالن</option>
            <option value="kitchen">آشپزخانه</option>
          </Select>
          <Select value={filters.shift} onChange={(e) => updateFilters({ shift: e.target.value as CandidateFilterState['shift'] })} className="hidden sm:block sm:w-36" aria-label="فیلتر شیفت">
            <option value="all">همه شیفت‌ها</option>
            <option value="morning">صبح</option>
            <option value="evening">عصر</option>
            <option value="night">شب</option>
            <option value="weekend">آخر هفته و تعطیلات</option>
          </Select>
          <Select value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value as CandidateFilterState['sort'] })} className="hidden sm:block sm:w-36" aria-label="مرتب‌سازی">
            <option value="date">جدیدترین اول</option>
            <option value="score">بیشترین امتیاز</option>
          </Select>
          <Button
            variant="default"
            size="field"
            icon={SlidersHorizontal}
            onClick={() => setShowMoreFilters((v) => !v)}
            aria-expanded={showMoreFilters}
            aria-controls="more-filters"
            className="shrink-0"
          >
            <span className="sm:hidden">فیلترها{mobileFilterCount > 0 && ` (${faNum(mobileFilterCount)})`}</span>
            <span className="hidden sm:inline">فیلترهای بیشتر{moreFilterCount > 0 && ` (${faNum(moreFilterCount)})`}</span>
            <ChevronDown size={14} className={cn('transition-transform', showMoreFilters && 'rotate-180')} aria-hidden="true" />
          </Button>

          <div role="radiogroup" aria-label="نوع نمایش" className="hidden md:inline-flex mr-auto rounded-md border border-border bg-surface p-0.5">
            {([['list', 'فهرست', List], ['cards', 'کارت', LayoutGrid]] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => changeView(v)}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-[12px] transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
                  view === v ? 'bg-accent text-white' : 'text-muted hover:text-text'
                )}
              >
                <Icon size={14} strokeWidth={1.5} aria-hidden="true" />{label}
              </button>
            ))}
          </div>
        </div>

        {showMoreFilters && (
          <div id="more-filters" className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-surface p-3 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <div className="contents sm:hidden">
            <Select value={filters.area} onChange={(e) => updateFilters({ area: e.target.value as CandidateFilterState['area'] })} aria-label="فیلتر بخش">
              <option value="all">همه بخش‌ها</option>
              <option value="hall">سالن</option>
              <option value="kitchen">آشپزخانه</option>
            </Select>
            <Select value={filters.shift} onChange={(e) => updateFilters({ shift: e.target.value as CandidateFilterState['shift'] })} aria-label="فیلتر شیفت">
              <option value="all">همه شیفت‌ها</option>
              <option value="morning">صبح</option>
              <option value="evening">عصر</option>
              <option value="night">شب</option>
              <option value="weekend">آخر هفته و تعطیلات</option>
            </Select>
            <Select value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value as CandidateFilterState['sort'] })} aria-label="مرتب‌سازی">
              <option value="date">جدیدترین اول</option>
              <option value="score">بیشترین امتیاز</option>
            </Select>
            </div>
            <Select value={filters.start} onChange={(e) => updateFilters({ start: e.target.value })} aria-label="فیلتر زمان شروع">
              <option value="all">همه زمان‌های شروع</option>
              <option value="immediate">شروع فوری</option>
              <option value="within_week">تا یک هفته</option>
              <option value="after_week">بیشتر از یک هفته</option>
            </Select>
            <Select value={filters.gender} onChange={(e) => updateFilters({ gender: e.target.value as CandidateFilterState['gender'] })} aria-label="فیلتر جنسیت">
              <option value="all">همه جنسیت‌ها</option>
              <option value="male">آقا</option>
              <option value="female">خانم</option>
            </Select>
            <Select value={filters.referral} onChange={(e) => updateFilters({ referral: e.target.value as CandidateFilterState['referral'] })} aria-label="فیلتر کانال آشنایی">
              <option value="all">همه کانال‌های آشنایی</option>
              <option value="instagram">اینستاگرام</option>
              <option value="divar">دیوار</option>
              <option value="friend">معرفی دوست یا همکار</option>
              <option value="customer">مشتری رستوران</option>
              <option value="other">سایر</option>
            </Select>
            <Select value={filters.hasResume} onChange={(e) => updateFilters({ hasResume: e.target.value as CandidateFilterState['hasResume'] })} aria-label="فیلتر فایل رزومه">
              <option value="all">با یا بدون فایل رزومه</option>
              <option value="yes">فقط دارای فایل رزومه</option>
              <option value="no">فقط بدون فایل رزومه</option>
            </Select>
            {filterableFields.map((f) => (
              <Select
                key={f.id}
                value={filters.dynamicFilters[f.key] ?? 'all'}
                onChange={(e) => updateFilters({ dynamicFilters: { ...filters.dynamicFilters, [f.key]: e.target.value } })}
                aria-label={f.label}
              >
                <option value="all">همه {f.label}</option>
                {f.options.filter((o) => o.isActive).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </Select>
            ))}
          </div>
        )}

        {/* ── خلاصه‌ی نتایج + فیلترهای فعال ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-h-[28px]">
          <p className="text-[12px] text-muted" aria-live="polite">
            {!applicationsLoaded ? 'در حال دریافت درخواست‌ها…'
              : refreshing ? 'در حال جستجو…'
              : applicationsError ? 'نتیجه دریافت نشد'
              : hasFilters
                ? <><b className="font-semibold text-text">{faNum(totalFiltered)}</b> نتیجه از {faNum(totalAll)} درخواست</>
                : <><b className="font-semibold text-text">{faNum(totalAll)}</b> درخواست</>}
            {applicationsLoaded && !refreshing && !applicationsError && loadedCount < totalFiltered && (
              <> · {faNum(loadedCount)} مورد نمایش داده شده</>
            )}
          </p>
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.clear}
              aria-label={`حذف فیلتر ${c.label}`}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11.5px] text-text hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              {c.label}<X size={12} aria-hidden="true" />
            </button>
          ))}
          {activeChips.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-[12px]">
              پاک‌کردن فیلترها ({faNum(activeChips.length)})
            </Button>
          )}
        </div>
      </div>

      {/* ── نوار انتخاب ── */}
      {selCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/30 bg-accent-subtle px-3 py-2 text-[12.5px]">
          <span className="font-medium text-text">{faNum(selCount)} داوطلب انتخاب شده</span>
          {compareDisabledReason && <span className="text-muted text-[11.5px]">— {compareDisabledReason}</span>}
          <div className="flex-1" />
          <Button variant="default" size="sm" icon={Download} onClick={downloadSelectedResumes} disabled={selectedWithResume.length === 0 || resumeZipLoading} loading={resumeZipLoading}
            title={selectedWithResume.length === 0 ? 'هیچ‌کدام از انتخاب‌شده‌ها فایل رزومه ندارند' : undefined}>
            دانلود رزومه‌ها ({faNum(selectedWithResume.length)})
          </Button>
          <Button variant="ghost" size="sm" icon={X} onClick={() => setSelected(new Map())}>لغو انتخاب</Button>
        </div>
      )}

      {/* ── خطا ── */}
      {applicationsError && (
        <InlineNotice tone="danger" title="درخواست‌ها دریافت نشد">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>اتصال یا سرور مشکل دارد. دوباره تلاش کنید.</span>
            <Button variant="default" size="sm" icon={RefreshCw} onClick={() => loadApplications()}>تلاش دوباره</Button>
          </div>
        </InlineNotice>
      )}

      {/* ── فهرست ── */}
      <div id={`tabpanel-${filters.status}`} role="tabpanel" aria-labelledby={`tab-${filters.status}`} aria-busy={refreshing}>
        {applicationsError ? null : !applicationsLoaded ? (
          <div className="space-y-2" aria-label="در حال بارگذاری">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton.Card key={i} className="h-14" />)}
          </div>
        ) : noApplicationsAtAll ? (
          <Empty
            icon={UserPlus}
            title="هنوز درخواستی ثبت نشده"
            sub="لینک فرم درخواست همکاری را برای متقاضیان بفرستید."
            action={
              <ButtonLink href="/apply" target="_blank" rel="noopener noreferrer" variant="primary" size="sm" icon={ExternalLink}>
                مشاهدهٔ فرم درخواست همکاری
              </ButtonLink>
            }
          />
        ) : noResults ? (
          <Empty
            icon={Search}
            title="نتیجه‌ای پیدا نشد"
            sub={filters.search.trim() ? `برای «${filters.search.trim()}» با این فیلترها داوطلبی نیست. املای نام یا شماره را بررسی کنید.` : 'با این فیلترها داوطلبی نیست.'}
            action={
              <Button variant="default" size="sm" icon={X} onClick={() => { clearAllFilters(); if (filters.status !== 'all') updateFilters({ status: 'all' }); }}>
                پاک‌کردن همه‌ی فیلترها
              </Button>
            }
          />
        ) : applications.length > 0 ? (
          <div className={cn('space-y-3 transition-opacity', refreshing && 'opacity-60')}>
            {view === 'list' && (
              <div className="hidden md:block rounded-lg border border-border bg-surface">
                <CandidateListHeader />
                <ul aria-label="فهرست داوطلبان">
                  {applications.map((a) => (
                    <CandidateRow
                      key={a.id}
                      application={a}
                      active={openId === a.id}
                      selected={selected.has(a.id)}
                      onToggleSelected={() => toggleSelected(a)}
                      onOpen={(el) => openDetails(a.id, el)}
                      canSeePhone={canSeePhone}
                    />
                  ))}
                </ul>
              </div>
            )}
            <ul
              aria-label="فهرست داوطلبان"
              className={cn('grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4', view === 'list' && 'md:hidden')}
            >
              {applications.map((a) => (
                <CandidateCard
                  key={a.id}
                  application={a}
                  active={openId === a.id}
                  selected={selected.has(a.id)}
                  onToggleSelected={() => toggleSelected(a)}
                  onOpen={(el) => openDetails(a.id, el)}
                  canSeePhone={canSeePhone}
                />
              ))}
            </ul>

            {loadedCount < totalFiltered && (
              <div className="flex flex-col items-center gap-1 pt-1">
                <Button
                  variant="default"
                  size="sm"
                  loading={loadingMore}
                  onClick={async () => { setLoadingMore(true); await loadMoreApplications(); setLoadingMore(false); }}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'در حال بارگذاری…' : `نمایش ${faNum(Math.min(50, totalFiltered - loadedCount))} مورد بعدی`}
                </Button>
                <span className="text-[11.5px] text-muted">{faNum(loadedCount)} از {faNum(totalFiltered)} نتیجه نمایش داده شده</span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {openApp && (
        <CandidateDetailPanel
          application={openApp}
          position={{ index: openIndex, count: totalFiltered }}
          onPrev={openIndex > 0 ? () => stepDetails(-1) : null}
          onNext={openIndex < applications.length - 1 ? () => stepDetails(1) : null}
          onClose={closeDetails}
          canSeePhone={canSeePhone}
          formFields={formFields}
          customDisplayFields={customDisplayFields}
          onScoreChange={(score) => setScore(openApp, score)}
          onStatusChange={(status) => setStatus(openApp, status)}
          onAreaChange={(area) => setArea(openApp, area)}
          onNoteSave={(note) => saveNote(openApp, note)}
          onConvert={() => convertToEmployee(openApp)}
          onDelete={() => handleDelete(openApp)}
        />
      )}

      {showQuestions && (
        <QuestionsModal
          onClose={() => setShowQuestions(false)}
          onSaved={() => setShowQuestions(false)}
          showToast={showToast}
        />
      )}

      {showCompare && !compareDisabledReason && (
        <CompareModal candidates={selectedCandidates} onClose={() => setShowCompare(false)} />
      )}

      {showFunnel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowFunnel(false)}>
          <div className="bg-white rounded-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={ev => ev.stopPropagation()}>
            <h2 className="text-[16px] font-medium text-stone-900 mb-4">آمار قیف استخدام</h2>
            {!funnel ? (
              <div className="text-[12px] text-muted">در حال بارگذاری…</div>
            ) : (
              <div className="space-y-3 text-[12.5px]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-stone-50 rounded-lg p-3">
                    <div className="text-[10.5px] text-muted mb-1">کل درخواست‌ها</div>
                    <div className="text-[16px] font-medium">{funnel.totalApplications}</div>
                  </div>
                  <div className="bg-stone-50 rounded-lg p-3">
                    <div className="text-[10.5px] text-muted mb-1">استخدام‌شده</div>
                    <div className="text-[16px] font-medium text-emerald-700">{funnel.hiredCount}</div>
                  </div>
                  <div className="bg-stone-50 rounded-lg p-3">
                    <div className="text-[10.5px] text-muted mb-1">نرخ ورود به لیست کوتاه</div>
                    <div className="text-[14px] font-medium">{Math.round(funnel.shortlistRate * 100)}٪</div>
                  </div>
                  <div className="bg-stone-50 rounded-lg p-3">
                    <div className="text-[10.5px] text-muted mb-1">نرخ استخدام واقعی</div>
                    <div className="text-[14px] font-medium">{Math.round(funnel.hireRate * 100)}٪</div>
                  </div>
                </div>
                {funnel.avgDaysToHire !== null && (
                  <div className="text-stone-700">میانگین زمان تا استخدام: <span className="font-medium">{Math.round(funnel.avgDaysToHire)} روز</span></div>
                )}
                {funnel.topReferralSources.length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted mb-1.5">کانال‌های جذب مؤثر</div>
                    <div className="space-y-1">
                      {funnel.topReferralSources.map(r => (
                        <div key={r.source} className="flex items-center justify-between bg-stone-50 rounded p-2">
                          <span className="text-stone-700">{r.source}</span>
                          <span className="text-stone-500">{r.hired} استخدام از {r.applications} درخواست</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {funnel.hireCountByRole.length > 0 && (
                  <div>
                    <div className="text-[11px] text-muted mb-1.5">استخدام به تفکیک سمت</div>
                    <div className="flex flex-wrap gap-1.5">
                      {funnel.hireCountByRole.map(r => (
                        <span key={r.role} className="bg-stone-100 rounded-full px-2.5 py-1 text-[11px] text-stone-700">{r.role}: {r.count}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex gap-2 mt-5">
              <Button variant="default" onClick={() => setShowFunnel(false)}>بستن</Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
