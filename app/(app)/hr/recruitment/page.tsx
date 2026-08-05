'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  UserPlus, Download, Search, Settings2, Wrench, ExternalLink,
  GitCompareArrows, MoreVertical, Loader2, RefreshCw, X, SlidersHorizontal,
} from 'lucide-react';
import { Button, ButtonLink, Input, Select, Empty, InlineNotice, Popover, Skeleton } from '@/components/ui';
import { PageShell } from '@/components/ui/PageShell';
import { PageToolbar } from '@/components/ui/PageToolbar';
import { FilterToolbar } from '@/components/ui/FilterToolbar';
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
  DEFAULT_FILTERS, filterCandidates, sortCandidates, statusCounts,
  paramsToFilters, filtersToParams, countActiveFilters, canViewPhone,
  type CandidateFilterState, type StatusFilter,
} from '@/lib/recruitment/filterCandidates';
import { CandidateCard } from '@/components/recruitment/CandidateCard';
import { SelectionToolbar } from '@/components/recruitment/SelectionToolbar';
import { CompareModal } from '@/components/recruitment/CompareModal';
import { QuestionsModal } from '@/components/recruitment/QuestionsModal';

const STATUS_TAB_LABELS: Record<StatusFilter, string> = {
  all: 'همه', new: 'جدید', shortlist: 'لیست کوتاه', accepted: 'قبول', rejected: 'رد',
};
const STATUS_TAB_ORDER: StatusFilter[] = ['all', 'new', 'shortlist', 'accepted', 'rejected'];

export default function RecruitmentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppStore((s) => s.user);
  const applications = useAppStore((s) => s.applications);
  const applicationsLoaded = useAppStore((s) => s.applicationsLoaded);
  const applicationsError = useAppStore((s) => s.applicationsError);
  const applicationsTotal = useAppStore((s) => s.applicationsTotal);
  const loadApplications = useAppStore((s) => s.loadApplications);
  const loadMoreApplications = useAppStore((s) => s.loadMoreApplications);
  const reviewApplication = useAppStore((s) => s.reviewApplication);
  const deleteApplication = useAppStore((s) => s.deleteApplication);
  const showToast = useAppStore((s) => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filters, setFilters] = useState<CandidateFilterState>(DEFAULT_FILTERS);
  const [searchInput, setSearchInput] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const [formFields, setFormFields] = useState<FormFieldData[]>([]);

  const [showQuestions, setShowQuestions] = useState(false);
  const [showCompare, setShowCompare] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [resumeZipLoading, setResumeZipLoading] = useState(false);

  const canSeePhone = canViewPhone(user);

  // ── init + بارگذاری ────────────────────────────────────────────────────
  useEffect(() => {
    const initial = paramsToFilters(searchParams);
    setFilters(initial);
    setSearchInput(initial.search);
    setHydrated(true);
    loadApplications();
    fetch('/api/recruitment/form-builder', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { sections: FormSectionData[] }) => setFormFields(d.sections?.flatMap((s) => s.fields) ?? []))
      .catch(() => setFormFields([]));
  // فقط یک بار روی mount اجرا می‌شود
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── sync URL هنگام تغییر فیلترها ───────────────────────────────────────
  const updateFilters = useCallback((patch: Partial<CandidateFilterState>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      const params = new URLSearchParams(filtersToParams(next));
      const qs = params.toString();
      router.replace(`/recruitment${qs ? '?' + qs : ''}`, { scroll: false });
      return next;
    });
  }, [router]);

  // ── جستجو: نمایش فوری، اعمال فیلتر با تأخیر کوتاه ─────────────────────
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => updateFilters({ search: value }), 300);
  }

  function clearAllFilters() {
    setSearchInput('');
    updateFilters({ ...DEFAULT_FILTERS, status: filters.status }); // وضعیت تب فعلی حفظ می‌شود، بقیه پاک می‌شوند
  }

  // ── فیلدهای filterable ─────────────────────────────────────────────────
  const filterableFields = useMemo(
    () => formFields.filter((f) => f.isFilterable && !f.isSystem && f.isActive && (f.type === 'select' || f.type === 'multiselect' || f.type === 'radio')),
    [formFields]
  );
  const customDisplayFields = useMemo(
    () => formFields.filter((f) => !f.isSystem && f.isActive),
    [formFields]
  );

  // ── لیست فیلترشده + مرتب‌شده ───────────────────────────────────────────
  const filtered = useMemo(() => filterCandidates(applications, filters), [applications, filters]);
  const sorted = useMemo(() => sortCandidates(filtered, filters.sort), [filtered, filters.sort]);
  const counts = useMemo(
    () => statusCounts(applications, filters),
    [applications, filters]
  );
  const activeFilterCount = countActiveFilters(filters);
  const advancedFilterCount =
    (filters.gender !== 'all' ? 1 : 0) +
    (filters.shift !== 'all' ? 1 : 0) +
    (filters.referral !== 'all' ? 1 : 0) +
    (filters.hasResume !== 'all' ? 1 : 0);

  const selectedCandidates = useMemo(
    () => applications.filter((a) => selectedIds.has(a.id)),
    [applications, selectedIds]
  );
  const selectedWithResume = selectedCandidates.filter((a) => a.hasResume);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return (
      <div className="p-6">
        <Empty icon={UserPlus} title="دسترسی ندارید" sub="این بخش فقط برای مدیر کل است." />
      </div>
    );
  }

  // ── اکسل ───────────────────────────────────────────────────────────────
  function exportXlsx() {
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
  }

  // ── اقدامات بررسی یک داوطلب ─────────────────────────────────────────────
  function convertToEmployee(a: JobApplication) {
    router.push(`/hr/people?${new URLSearchParams({ fromApplicant: '1', fullName: `${a.firstName} ${a.lastName}`, phone: a.phone })}`);
  }
  async function setStatus(a: JobApplication, status: ApplicationStatus) {
    const ok = await reviewApplication(a.id, { status });
    showToast(ok ? 'وضعیت به‌روزرسانی شد' : 'خطا در به‌روزرسانی وضعیت', ok ? 'success' : 'danger');
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
      if (openId === a.id) setOpenId(null);
      showToast('حذف شد', 'success');
    } else {
      showToast('خطا در حذف', 'danger');
    }
    return ok;
  }

  // ── حالت انتخاب (مقایسه/دانلود رزومه یکپارچه) ───────────────────────────
  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }
  function exitSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
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

  const compareDisabledReason = selectedCandidates.length < 2 ? 'حداقل ۲ داوطلب انتخاب کنید' : null;
  const downloadDisabledReason =
    selectedCandidates.length === 0 ? 'حداقل یک داوطلب انتخاب کنید'
    : selectedWithResume.length === 0 ? 'هیچ‌کدام از انتخاب‌شده‌ها رزومه ندارند'
    : null;

  const hasAnyApplications = applications.length > 0;
  const isNoFilterResults = hasAnyApplications && sorted.length === 0;

  return (
    <PageShell type="data" className="space-y-4">

      {/* ── هدر و اقدامات ─────────────────────────────────────────── */}
      <PageToolbar
        title="استخدام"
        sub={
          <>
            {sorted.length !== applicationsTotal ? `${sorted.length} از ${applicationsTotal} درخواست` : `${applicationsTotal} درخواست`}
            {' '}· <bdi dir="ltr">/apply</bdi>
          </>
        }
        actions={
          <>
            <ButtonLink href="/apply" target="_blank" rel="noopener noreferrer" variant="primary" size="sm" icon={ExternalLink}>
              فرم عمومی
            </ButtonLink>
            <Button
              variant={selectionMode ? 'primary' : 'default'}
              size="sm"
              icon={GitCompareArrows}
              onClick={() => (selectionMode ? exitSelection() : setSelectionMode(true))}
            >
              {selectionMode ? 'خروج از انتخاب' : 'مقایسه'}
            </Button>
            <Popover trigger={<MoreVertical size={16} strokeWidth={1.5} />} triggerLabel="اقدامات بیشتر" panelRole="menu" align="end">
              {(close) => (
                <div className="p-1.5 w-56">
                  {!selectionMode && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { close(); setSelectionMode(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] text-text hover:bg-bg text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                    >
                      <Download size={14} strokeWidth={1.5} /> دانلود رزومه‌ها
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { close(); router.push('/recruitment/form-builder'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] text-text hover:bg-bg text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                  >
                    <Wrench size={14} strokeWidth={1.5} /> فرم‌ساز
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { close(); setShowQuestions(true); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] text-text hover:bg-bg text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                  >
                    <Settings2 size={14} strokeWidth={1.5} /> سوال‌ها
                  </button>
                  <div className="border-t border-border my-1.5" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => { close(); exportXlsx(); }}
                    disabled={sorted.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-[12.5px] text-text hover:bg-bg text-right disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40"
                  >
                    <Download size={14} strokeWidth={1.5} /> خروجی اکسل
                  </button>
                </div>
              )}
            </Popover>
          </>
        }
      />

      {/* ── تب‌های خط‌لوله (وضعیت) ────────────────────────────────── */}
      <Tabs
        value={filters.status}
        onChange={(status) => updateFilters({ status })}
        aria-label="فیلتر وضعیت داوطلبان"
        items={STATUS_TAB_ORDER.map((s) => ({ value: s, label: STATUS_TAB_LABELS[s], count: counts[s] }))}
      />

      {/* ── نوار فیلتر فشرده ──────────────────────────────────────── */}
      <FilterToolbar onClearFilters={clearAllFilters} activeFilterCount={activeFilterCount}>
        <Select value={filters.area} onChange={(e) => updateFilters({ area: e.target.value as CandidateFilterState['area'] })} className="w-32" aria-label="فیلتر بخش">
          <option value="all">همه بخش‌ها</option>
          <option value="hall">سالن</option>
          <option value="kitchen">آشپزخانه</option>
        </Select>

        <Select value={filters.start} onChange={(e) => updateFilters({ start: e.target.value })} className="w-40" aria-label="فیلتر زمان شروع">
          <option value="all">همه زمان‌های شروع</option>
          <option value="immediate">فوری</option>
          <option value="within_week">تا یک هفته</option>
          <option value="after_week">بیشتر از یک هفته</option>
        </Select>

        <Select value={filters.sort} onChange={(e) => updateFilters({ sort: e.target.value as CandidateFilterState['sort'] })} className="w-36" aria-label="مرتب‌سازی">
          <option value="date">جدیدترین اول</option>
          <option value="score">امتیاز (نزولی)</option>
        </Select>

        <Popover
          trigger={<span className="inline-flex items-center gap-1"><SlidersHorizontal size={13} strokeWidth={1.5} />فیلتر بیشتر</span>}
          badge={advancedFilterCount}
        >
          <div className="p-3 w-64 space-y-2.5">
            <Select value={filters.gender} onChange={(e) => updateFilters({ gender: e.target.value as CandidateFilterState['gender'] })} className="w-full" aria-label="فیلتر جنسیت">
              <option value="all">همه جنسیت‌ها</option>
              <option value="male">آقا</option>
              <option value="female">خانم</option>
            </Select>
            <Select value={filters.shift} onChange={(e) => updateFilters({ shift: e.target.value as CandidateFilterState['shift'] })} className="w-full" aria-label="فیلتر شیفت">
              <option value="all">همه شیفت‌ها</option>
              <option value="morning">صبح</option>
              <option value="evening">عصر</option>
              <option value="night">شب</option>
              <option value="weekend">آخر هفته و تعطیلات</option>
            </Select>
            <Select value={filters.referral} onChange={(e) => updateFilters({ referral: e.target.value as CandidateFilterState['referral'] })} className="w-full" aria-label="فیلتر کانال آشنایی">
              <option value="all">همه کانال‌های آشنایی</option>
              <option value="instagram">اینستاگرام</option>
              <option value="divar">دیوار</option>
              <option value="friend">معرفی دوست یا همکار</option>
              <option value="customer">مشتری رستوران</option>
              <option value="other">سایر</option>
            </Select>
            <Select value={filters.hasResume} onChange={(e) => updateFilters({ hasResume: e.target.value as CandidateFilterState['hasResume'] })} className="w-full" aria-label="فیلتر وجود رزومه">
              <option value="all">دارد/ندارد رزومه</option>
              <option value="yes">فقط دارای رزومه</option>
              <option value="no">فقط بدون رزومه</option>
            </Select>
          </div>
        </Popover>

        {filterableFields.map((f) => (
          <Select
            key={f.id}
            value={filters.dynamicFilters[f.key] ?? 'all'}
            onChange={(e) => updateFilters({ dynamicFilters: { ...filters.dynamicFilters, [f.key]: e.target.value } })}
            className="w-36"
            aria-label={f.label}
          >
            <option value="all">همه {f.label}</option>
            {f.options.filter((o) => o.isActive).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        ))}

        <div className="relative flex-1 min-w-[160px]">
          <Input icon={Search} value={searchInput} onChange={(e) => handleSearchChange(e.target.value)} placeholder="جستجوی نام یا موبایل…" />
        </div>
      </FilterToolbar>

      {/* ── نوار انتخاب یکپارچه (مقایسه/دانلود رزومه) ────────────── */}
      {selectionMode && (
        <SelectionToolbar
          count={selectedCandidates.length}
          onCompare={() => setShowCompare(true)}
          compareDisabledReason={compareDisabledReason}
          onDownloadResumes={downloadSelectedResumes}
          downloadDisabledReason={downloadDisabledReason}
          downloading={resumeZipLoading}
          onClearSelection={() => setSelectedIds(new Set())}
          onExit={exitSelection}
        />
      )}

      {/* ── خطای بارگذاری ────────────────────────────────────────── */}
      {applicationsError && (
        <InlineNotice tone="danger" title="خطا در دریافت داوطلبان">
          <div className="flex items-center justify-between gap-3">
            <span>{applicationsError}</span>
            <Button variant="default" size="sm" icon={RefreshCw} onClick={() => loadApplications()}>تلاش دوباره</Button>
          </div>
        </InlineNotice>
      )}

      {/* ── لیست داوطلبان ─────────────────────────────────────────── */}
      <div id={`tabpanel-${filters.status}`} role="tabpanel" aria-labelledby={`tab-${filters.status}`}>
        {!applicationsLoaded ? (
          <div className="grid grid-cols-1 gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton.Card key={i} className="h-20" />)}
          </div>
        ) : !hasAnyApplications ? (
          !applicationsError && (
            <Empty
              icon={UserPlus}
              title="هنوز درخواستی ثبت نشده"
              sub="لینک فرم عمومی را برای متقاضیان به اشتراک بگذارید."
              action={
                <ButtonLink href="/apply" target="_blank" rel="noopener noreferrer" variant="primary" size="sm" icon={ExternalLink}>
                  مشاهده‌ی فرم
                </ButtonLink>
              }
            />
          )
        ) : isNoFilterResults ? (
          <Empty
            icon={Search}
            title="نتیجه‌ای برای این فیلترها نیست"
            sub="فیلترها را تغییر دهید یا پاک کنید."
            action={<Button variant="default" size="sm" icon={X} onClick={clearAllFilters}>پاک کردن فیلترها</Button>}
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:[grid-template-columns:repeat(auto-fit,minmax(360px,1fr))] gap-2.5">
              {sorted.map((a) => (
                <CandidateCard
                  key={a.id}
                  application={a}
                  isOpen={openId === a.id}
                  onToggleOpen={() => setOpenId((cur) => (cur === a.id ? null : a.id))}
                  selectionMode={selectionMode}
                  selected={selectedIds.has(a.id)}
                  onToggleSelected={() => toggleSelected(a.id)}
                  canSeePhone={canSeePhone}
                  formFields={formFields}
                  customDisplayFields={customDisplayFields}
                  onScoreChange={(score) => setScore(a, score)}
                  onStatusChange={(status) => setStatus(a, status)}
                  onAreaChange={(area) => setArea(a, area)}
                  onNoteSave={(note) => saveNote(a, note)}
                  onConvert={() => convertToEmployee(a)}
                  onDelete={() => handleDelete(a)}
                />
              ))}
            </div>

            {applications.length < applicationsTotal && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="default"
                  size="sm"
                  icon={loadingMore ? Loader2 : undefined}
                  onClick={async () => { setLoadingMore(true); await loadMoreApplications(); setLoadingMore(false); }}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'در حال بارگذاری…' : `بارگذاری بیشتر (${applicationsTotal - applications.length} درخواست دیگر)`}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {showQuestions && (
        <QuestionsModal
          onClose={() => setShowQuestions(false)}
          onSaved={() => setShowQuestions(false)}
          showToast={showToast}
        />
      )}

      {showCompare && selectedCandidates.length >= 2 && (
        <CompareModal candidates={selectedCandidates} onClose={() => setShowCompare(false)} />
      )}
    </PageShell>
  );
}
