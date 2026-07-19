'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  UserPlus, Phone, MapPin, FileText, Download, Trash2,
  Search, X, Star, Check, ExternalLink, Settings2, Plus,
  Loader2, UserCheck, Wrench, ChevronDown, GitCompareArrows,
} from 'lucide-react';
import { Button, Card, CardBody, Input, Select, Empty, Chip, Textarea } from '@/components/ui';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import {
  SCREENING_QUESTIONS, AREA_LABELS, STATUS_LABELS, GENDER_LABELS,
  SHIFT_LABELS, START_LABELS, REFERRAL_LABELS,
  type JobApplication, type ApplicationStatus, type ScreeningQuestion,
} from '@/lib/recruitment/questions';
import type { FormFieldData, FormSectionData, FieldSnapshot } from '@/lib/recruitment/form-types';

// ── ثابت‌ها ────────────────────────────────────────────────────────────────

const STATUS_TONE: Record<ApplicationStatus, string> = {
  new:       'bg-stone-100 text-stone-600',
  shortlist: 'bg-amber-100 text-amber-700',
  accepted:  'bg-emerald-100 text-emerald-700',
  rejected:  'bg-rose-100 text-rose-700',
};

const STATUS_FILTERS: Array<{ value: 'all' | ApplicationStatus; label: string }> = [
  { value: 'all',       label: 'همه'        },
  { value: 'new',       label: 'جدید'       },
  { value: 'shortlist', label: 'لیست کوتاه' },
  { value: 'accepted',  label: 'قبول'       },
  { value: 'rejected',  label: 'رد'         },
];

/** کلمات کلیدی برای تگ خودکار از متن پاسخ‌ها */
const KEYWORD_TAGS: Array<{ pattern: RegExp; label: string; cls: string }> = [
  { pattern: /فشار|استرس|تنش/,            label: 'فشاری',       cls: 'bg-rose-50 text-rose-600'     },
  { pattern: /شلوغ/,                       label: 'شلوغی',       cls: 'bg-orange-50 text-orange-600' },
  { pattern: /صبر|آرام|خونسرد/,            label: 'صبور',        cls: 'bg-teal-50 text-teal-600'     },
  { pattern: /تیم|همکار|گروه/,             label: 'تیمی',        cls: 'bg-blue-50 text-blue-600'     },
  { pattern: /تجربه|سابقه|کار کرده|رستوران/, label: 'باتجربه',  cls: 'bg-violet-50 text-violet-600' },
  { pattern: /مشتری|رضایت|خدمات/,          label: 'مشتری‌مدار', cls: 'bg-sky-50 text-sky-600'       },
];

// ── تابع‌های کمکی ──────────────────────────────────────────────────────────

function faDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fa-IR'); } catch { return iso; }
}

function renderCustomValue(val: unknown, field?: FormFieldData | null): string {
  if (val === undefined || val === null || val === '') return '—';
  if (Array.isArray(val)) {
    const labels = (val as string[]).map(v => {
      const opt = field?.options.find(o => o.value === v);
      return opt ? opt.label : v;
    });
    return labels.join('، ') || '—';
  }
  if (typeof val === 'string') {
    const opt = field?.options.find(o => o.value === val);
    return opt ? opt.label : val;
  }
  return String(val);
}

function detectKeywords(answers: Record<string, string>) {
  const text = Object.values(answers).join(' ');
  return KEYWORD_TAGS.filter(t => t.pattern.test(text));
}

/** خواندن مقدار اولیه فیلتر از URL */
function getUrlParam(key: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(key) ?? '';
}

// ── کامپوننت اصلی ─────────────────────────────────────────────────────────

export default function RecruitmentPage() {
  const user                 = useAppStore((s) => s.user);
  const applications         = useAppStore((s) => s.applications);
  const applicationsTotal    = useAppStore((s) => s.applicationsTotal);
  const loadApplications     = useAppStore((s) => s.loadApplications);
  const loadMoreApplications = useAppStore((s) => s.loadMoreApplications);
  const reviewApplication    = useAppStore((s) => s.reviewApplication);
  const deleteApplication    = useAppStore((s) => s.deleteApplication);
  const showToast            = useAppStore((s) => s.showToast);
  const router               = useRouter();

  // ── state اصلی ─────────────────────────────────────────────────────────
  const [hydrated,      setHydrated]      = useState(false);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [statusFilter,  setStatusFilter]  = useState<'all' | ApplicationStatus>('all');
  const [areaFilter,    setAreaFilter]    = useState<'all' | 'hall' | 'kitchen'>('all');
  const [startFilter,   setStartFilter]   = useState<string>('all');
  const [sortBy,        setSortBy]        = useState<'date' | 'score'>('date');
  const [search,        setSearch]        = useState('');
  const [selectedId,    setSelectedId]    = useState<string | null>(null);

  // ── فیلدهای داینامیک ───────────────────────────────────────────────────
  const [formFields,     setFormFields]     = useState<FormFieldData[]>([]);
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});

  // ── مدیریت سوال‌ها ──────────────────────────────────────────────────────
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions,     setQuestions]     = useState<ScreeningQuestion[]>([]);
  const [qLoading,      setQLoading]      = useState(false);
  const [qSaving,       setQSaving]       = useState(false);

  // ── حالت مقایسه ────────────────────────────────────────────────────────
  const [compareMode,  setCompareMode]  = useState(false);
  const [compareIds,   setCompareIds]   = useState<Set<string>>(new Set());
  const [showCompare,  setShowCompare]  = useState(false);

  // ── دانلود گروهی رزومه ─────────────────────────────────────────────────
  const [resumeSelectMode, setResumeSelectMode] = useState(false);
  const [selectedResumeIds, setSelectedResumeIds] = useState<Set<string>>(new Set());
  const [resumeZipLoading, setResumeZipLoading] = useState(false);

  // ── init + بارگذاری ────────────────────────────────────────────────────
  useEffect(() => {
    // خواندن فیلترهای اولیه از URL
    const status = getUrlParam('status') as 'all' | ApplicationStatus;
    const area   = getUrlParam('area')   as 'all' | 'hall' | 'kitchen';
    const start  = getUrlParam('start');
    const q      = getUrlParam('q');
    const sort   = getUrlParam('sort') as 'date' | 'score';
    if (status) setStatusFilter(status);
    if (area)   setAreaFilter(area);
    if (start)  setStartFilter(start);
    if (q)      setSearch(q);
    if (sort)   setSortBy(sort);

    setHydrated(true);
    loadApplications();
    fetch('/api/recruitment/form-builder', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { sections: FormSectionData[] }) => {
        setFormFields(d.sections?.flatMap(s => s.fields) ?? []);
      })
      .catch(() => setFormFields([]));
  }, [loadApplications]);

  // ── sync URL هنگام تغییر فیلترها ───────────────────────────────────────
  const updateUrl = useCallback((overrides: Partial<{
    status: string; area: string; start: string; q: string; sort: string;
  }>) => {
    const sp = new URLSearchParams();
    const vals = {
      status: statusFilter, area: areaFilter, start: startFilter,
      q: search, sort: sortBy, ...overrides,
    };
    for (const [k, v] of Object.entries(vals)) {
      if (v && v !== 'all' && v !== '' && v !== 'date') sp.set(k, v);
    }
    const qs = sp.toString();
    router.replace(`/recruitment${qs ? '?' + qs : ''}`, { scroll: false });
  }, [statusFilter, areaFilter, startFilter, search, sortBy, router]);

  // ── فیلدهای filterable ─────────────────────────────────────────────────
  const filterableFields = useMemo(
    () => formFields.filter(f =>
      f.isFilterable && !f.isSystem && f.isActive &&
      (f.type === 'select' || f.type === 'multiselect' || f.type === 'radio')
    ),
    [formFields]
  );
  const customDisplayFields = useMemo(
    () => formFields.filter(f => !f.isSystem && f.isActive),
    [formFields]
  );

  // ── لیست مقایسه (باید قبل از early return باشد — قانون Hooks) ──────────
  const compareList = useMemo(
    () => applications.filter(a => compareIds.has(a.id)),
    [applications, compareIds]
  );

  // ── لیست فیلترشده + مرتب‌شده ───────────────────────────────────────────
  const sorted = useMemo(() => {
    const q = search.trim();
    const result = applications.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (areaFilter !== 'all' && a.area !== areaFilter) return false;
      if (startFilter !== 'all' && a.startAvailability !== startFilter) return false;
      if (q && !`${a.firstName} ${a.lastName} ${a.phone}`.includes(q)) return false;
      for (const [fieldKey, filterVal] of Object.entries(dynamicFilters)) {
        if (!filterVal || filterVal === 'all') continue;
        const cf = (a.customFields as Record<string, unknown> | undefined) ?? {};
        const val = cf[fieldKey];
        if (Array.isArray(val)) { if (!val.includes(filterVal)) return false; }
        else if (String(val ?? '') !== filterVal) return false;
      }
      return true;
    });
    if (sortBy === 'score') {
      return [...result].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    return result; // ترتیب پیش‌فرض: تاریخ نزولی (از سرور)
  }, [applications, statusFilter, areaFilter, startFilter, search, dynamicFilters, sortBy]);

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
        نام:           a.firstName,
        'نام خانوادگی': a.lastName,
        موبایل:        a.phone,
        سن:            a.age ?? '',
        جنسیت:         a.gender ? GENDER_LABELS[a.gender] : '',
        'محله سکونت':  a.city ?? '',
        'شیفت‌ها':     (a.shiftAvailability ?? []).map((s: string) => SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s).join(' / '),
        'امکان شروع':  a.startAvailability ? (START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability) : '',
        'کانال آشنایی': a.referralSource ? (REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource) : '',
        بخش:           a.area ? AREA_LABELS[a.area] : '',
        وضعیت:         STATUS_LABELS[a.status],
        امتیاز:        a.score ?? '',
        رزومه:         a.hasResume ? 'دارد' : (a.manualInfo ? 'متنی' : '—'),
        یادداشت:       a.reviewerNote ?? '',
        تاریخ:         faDate(a.createdAt),
      };
      for (const q of SCREENING_QUESTIONS) base[q.title] = a.answers[q.id] ?? '';
      const snap: FieldSnapshot[] = (a.fieldSnapshot as FieldSnapshot[] | undefined) ?? [];
      const cf: Record<string, unknown> = (a.customFields as Record<string, unknown> | undefined) ?? {};
      for (const s of snap) {
        const fieldDef = formFields.find(f => f.key === s.key);
        base[s.label] = renderCustomValue(cf[s.key], fieldDef);
      }
      for (const f of customDisplayFields) {
        if (!snap.find(s => s.key === f.key)) base[f.label] = '';
      }
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'applications');
    XLSX.writeFile(wb, `recruitment-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // ── توابع action ────────────────────────────────────────────────────────
  function convertToEmployee(a: JobApplication) {
    router.push(`/employees?${new URLSearchParams({ fromApplicant: '1', fullName: `${a.firstName} ${a.lastName}`, phone: a.phone })}`);
  }
  async function setStatus(a: JobApplication, status: ApplicationStatus) {
    const ok = await reviewApplication(a.id, { status });
    if (ok) showToast('وضعیت به‌روزرسانی شد', 'success');
    else showToast('خطا', 'danger');
  }
  async function setScore(a: JobApplication, score: number, e: React.MouseEvent) {
    e.stopPropagation();
    const next = a.score === score ? null : score;
    await reviewApplication(a.id, { score: next });
  }
  async function setAreaReview(a: JobApplication, area: 'hall' | 'kitchen' | '') {
    await reviewApplication(a.id, { area: area === '' ? null : area });
  }
  async function saveNote(a: JobApplication, note: string) {
    await reviewApplication(a.id, { reviewerNote: note.trim() || null });
    showToast('یادداشت ذخیره شد', 'success');
  }
  async function handleDelete(id: string) {
    const ok = await deleteApplication(id);
    if (ok) { if (selectedId === id) setSelectedId(null); showToast('حذف شد', 'success'); }
  }

  // ── مدیریت سوال‌ها ──────────────────────────────────────────────────────
  async function openQuestions() {
    setShowQuestions(true); setQLoading(true);
    try {
      const r = await fetch('/api/recruitment/questions', { cache: 'no-store' });
      const d = await r.json();
      setQuestions(d.questions ?? []);
    } catch { setQuestions([...SCREENING_QUESTIONS]); }
    finally { setQLoading(false); }
  }
  function updateQuestion(i: number, patch: Partial<ScreeningQuestion>) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }
  function addQuestion() {
    setQuestions(qs => [...qs, { id: `q${Date.now().toString(36)}`, title: 'سوال جدید', prompt: '' }]);
  }
  function removeQuestion(i: number) {
    setQuestions(qs => qs.filter((_, idx) => idx !== i));
  }
  async function saveQuestions() {
    if (questions.some(q => !q.title.trim() || !q.prompt.trim())) {
      showToast('عنوان و متن همه سوال‌ها را پر کنید', 'danger'); return;
    }
    setQSaving(true);
    try {
      const r = await fetch('/api/recruitment/questions', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions }),
      });
      if (!r.ok) throw new Error();
      showToast('سوال‌ها ذخیره شد', 'success'); setShowQuestions(false);
    } catch { showToast('خطا در ذخیره سوال‌ها', 'danger'); }
    finally { setQSaving(false); }
  }

  // ── مقایسه ─────────────────────────────────────────────────────────────
  function toggleCompare(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setCompareIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 4) next.add(id);
      return next;
    });
  }
  function exitCompare() {
    setCompareMode(false);
    setCompareIds(new Set());
    setShowCompare(false);
  }

  // ── دانلود گروهی رزومه ─────────────────────────────────────────────────
  function toggleResumeSelect(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedResumeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllWithResume() {
    setSelectedResumeIds(new Set(sorted.filter(a => a.hasResume).map(a => a.id)));
  }
  function exitResumeSelect() {
    setResumeSelectMode(false);
    setSelectedResumeIds(new Set());
  }
  async function downloadSelectedResumes() {
    if (selectedResumeIds.size === 0) return;
    setResumeZipLoading(true);
    try {
      const res = await fetch('/api/recruitment/resumes-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ids: [...selectedResumeIds] }),
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

  // ── رندر ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-5xl space-y-5">

        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium tracking-tight text-stone-900">استخدام</h1>
            <div className="mt-1 text-[12px] text-stone-500">
              {sorted.length !== (applicationsTotal || applications.length)
                ? `${sorted.length} از ${applicationsTotal || applications.length} درخواست`
                : `${applicationsTotal || applications.length} درخواست`}
              {' '}· <span dir="ltr">/apply</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={compareMode ? 'primary' : 'default'}
              size="sm"
              icon={GitCompareArrows}
              onClick={() => { if (compareMode) exitCompare(); else setCompareMode(true); }}
            >
              {compareMode ? 'خروج از مقایسه' : 'مقایسه'}
            </Button>
            <Button
              variant={resumeSelectMode ? 'primary' : 'default'}
              size="sm"
              icon={FileText}
              onClick={() => { if (resumeSelectMode) exitResumeSelect(); else setResumeSelectMode(true); }}
            >
              {resumeSelectMode ? 'خروج از انتخاب رزومه' : 'دانلود رزومه‌ها'}
            </Button>
            <Button variant="default" size="sm" icon={Wrench} onClick={() => router.push('/recruitment/form-builder')}>فرم‌ساز</Button>
            <Button variant="default" size="sm" icon={Settings2} onClick={openQuestions}>سوال‌ها</Button>
            <a href="/apply" target="_blank" rel="noopener noreferrer">
              <Button variant="default" size="sm" icon={ExternalLink}>فرم</Button>
            </a>
            <Button variant="default" size="sm" icon={Download} onClick={exportXlsx} disabled={sorted.length === 0}>
              اکسل
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* وضعیت */}
          <div className="flex rounded-md border border-stone-200 bg-white p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value}
                onClick={() => { setStatusFilter(f.value); updateUrl({ status: f.value }); }}
                className={cn('rounded px-3 py-1.5 text-[12px] transition-colors',
                  statusFilter === f.value ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50')}>
                {f.label}
              </button>
            ))}
          </div>

          {/* بخش */}
          <Select value={areaFilter} onChange={(e) => { const v = e.target.value as typeof areaFilter; setAreaFilter(v); updateUrl({ area: v }); }} className="w-32">
            <option value="all">همه بخش‌ها</option>
            <option value="hall">سالن</option>
            <option value="kitchen">آشپزخانه</option>
          </Select>

          {/* زمان شروع */}
          <Select value={startFilter} onChange={(e) => { setStartFilter(e.target.value); updateUrl({ start: e.target.value }); }} className="w-40">
            <option value="all">همه زمان‌های شروع</option>
            <option value="immediate">فوری</option>
            <option value="within_week">تا یک هفته</option>
            <option value="after_week">بیشتر از یک هفته</option>
          </Select>

          {/* مرتب‌سازی */}
          <Select value={sortBy} onChange={(e) => { const v = e.target.value as 'date' | 'score'; setSortBy(v); updateUrl({ sort: v }); }} className="w-36">
            <option value="date">جدیدترین اول</option>
            <option value="score">امتیاز (نزولی)</option>
          </Select>

          {/* فیلترهای داینامیک */}
          {filterableFields.map(f => (
            <Select key={f.id}
              value={dynamicFilters[f.key] ?? 'all'}
              onChange={e => setDynamicFilters(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-36">
              <option value="all">همه {f.label}</option>
              {f.options.filter(o => o.isActive).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          ))}

          {/* جستجو */}
          <div className="relative flex-1 min-w-[160px]">
            <Input icon={Search} value={search}
              onChange={(e) => { setSearch(e.target.value); updateUrl({ q: e.target.value }); }}
              placeholder="جستجوی نام یا موبایل…" />
          </div>
        </div>

        {/* نوار مقایسه */}
        {compareMode && (
          <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5">
            <span className="text-[12px] text-stone-600">
              {compareIds.size === 0
                ? 'روی کارت‌ها کلیک کنید تا داوطلبان را برای مقایسه انتخاب کنید (حداکثر ۴ نفر)'
                : `${compareIds.size} داوطلب انتخاب شده`}
            </span>
            <div className="flex-1" />
            {compareIds.size >= 2 && (
              <Button variant="primary" size="sm" icon={GitCompareArrows} onClick={() => setShowCompare(true)}>
                مقایسه {compareIds.size} داوطلب
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={X} onClick={exitCompare}>انصراف</Button>
          </div>
        )}

        {/* نوار دانلود گروهی رزومه */}
        {resumeSelectMode && (
          <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5">
            <span className="text-[12px] text-stone-600">
              {selectedResumeIds.size === 0
                ? 'روی کارت‌های دارای رزومه کلیک کنید تا انتخاب شوند'
                : `${selectedResumeIds.size} رزومه انتخاب شده`}
            </span>
            <div className="flex-1" />
            <Button variant="default" size="sm" onClick={selectAllWithResume} disabled={sorted.filter(a => a.hasResume).length === 0}>
              انتخاب همه ({sorted.filter(a => a.hasResume).length})
            </Button>
            <Button
              variant="primary" size="sm" icon={Download}
              onClick={downloadSelectedResumes}
              disabled={selectedResumeIds.size === 0 || resumeZipLoading}
              loading={resumeZipLoading}
            >
              دانلود ZIP ({selectedResumeIds.size})
            </Button>
            <Button variant="ghost" size="sm" icon={X} onClick={exitResumeSelect}>انصراف</Button>
          </div>
        )}

        {/* لیست داوطلبان */}
        {sorted.length === 0 ? (
          <Empty icon={UserPlus} title="درخواستی نیست" sub="هنوز فرمی ثبت نشده یا با این فیلتر چیزی پیدا نشد." />
        ) : (
          <div className="space-y-2">
            {sorted.map((a) => {
              const cf: Record<string, unknown> = (a.customFields as Record<string, unknown> | undefined) ?? {};
              const snap: FieldSnapshot[] = (a.fieldSnapshot as FieldSnapshot[] | undefined) ?? [];
              const isOpen = selectedId === a.id;
              const keywords = detectKeywords(a.answers);
              const isSelected = compareIds.has(a.id);
              const isResumeSelected = selectedResumeIds.has(a.id);

              return (
                <Card key={a.id} className={cn((isSelected || isResumeSelected) && 'ring-2 ring-stone-400')}>
                  {/* ── هدر کارت ──────────────────────────────── */}
                  <div
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-right cursor-pointer select-none',
                      (compareMode || resumeSelectMode) && 'pl-3'
                    )}
                    onClick={() => {
                      if (compareMode || resumeSelectMode) return;
                      setSelectedId(isOpen ? null : a.id);
                    }}
                  >
                    {/* چک‌باکس مقایسه */}
                    {compareMode && (
                      <button
                        onClick={(e) => toggleCompare(a.id, e)}
                        className={cn(
                          'mt-0.5 h-4 w-4 flex-shrink-0 rounded border-2 transition-colors',
                          isSelected ? 'border-stone-700 bg-stone-700' : 'border-stone-300 bg-white'
                        )}
                        aria-label="انتخاب برای مقایسه"
                      >
                        {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </button>
                    )}

                    {/* چک‌باکس انتخاب رزومه — فقط اگر رزومه دارد */}
                    {resumeSelectMode && (
                      a.hasResume ? (
                        <button
                          onClick={(e) => toggleResumeSelect(a.id, e)}
                          className={cn(
                            'mt-0.5 h-4 w-4 flex-shrink-0 rounded border-2 transition-colors',
                            isResumeSelected ? 'border-stone-700 bg-stone-700' : 'border-stone-300 bg-white'
                          )}
                          aria-label="انتخاب برای دانلود رزومه"
                        >
                          {isResumeSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                        </button>
                      ) : (
                        <div className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                      )
                    )}

                    <div className="min-w-0 flex-1">
                      {/* ردیف اول: نام + badge‌ها */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[13.5px] font-medium text-stone-900">{a.firstName} {a.lastName}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10.5px]', STATUS_TONE[a.status])}>{STATUS_LABELS[a.status]}</span>
                        {a.area && <Chip>{AREA_LABELS[a.area]}</Chip>}
                        {a.age && <span className="text-[11px] text-stone-400">{a.age} ساله</span>}
                        {a.hasResume && <FileText size={13} className="text-stone-400" />}
                      </div>

                      {/* ردیف دوم: اطلاعات تماس + تاریخ */}
                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[11.5px] text-stone-500">
                        <span dir="ltr" className="inline-flex items-center gap-1"><Phone size={11} />{a.phone}</span>
                        {a.city && <span className="inline-flex items-center gap-1"><MapPin size={11} />{a.city}</span>}
                        {(a.shiftAvailability ?? []).slice(0, 2).map((s: string) => (
                          <span key={s} className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] text-amber-700">
                            {SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s}
                          </span>
                        ))}
                        {(a.shiftAvailability ?? []).length > 2 && (
                          <span className="text-[10.5px] text-stone-400">+{(a.shiftAvailability ?? []).length - 2}</span>
                        )}
                        <span>{faDate(a.createdAt)}</span>
                      </div>

                      {/* ردیف سوم: تگ‌های کلیدواژه */}
                      {keywords.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {keywords.map(k => (
                            <span key={k.label} className={cn('rounded-full px-2 py-0.5 text-[10px]', k.cls)}>
                              {k.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* امتیاز سریع — بدون باز کردن کارت */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            onClick={(e) => setScore(a, n, e)}
                            aria-label={`امتیاز ${n}`}
                            className="p-0.5 touch-manipulation"
                          >
                            <Star
                              size={14}
                              className={cn(a.score != null && n <= a.score ? 'text-amber-500' : 'text-stone-200')}
                              fill={a.score != null && n <= a.score ? 'currentColor' : 'none'}
                            />
                          </button>
                        ))}
                      </div>
                      {!compareMode && (
                        <ChevronDown
                          size={15}
                          className={cn('text-stone-400 transition-transform', isOpen && 'rotate-180')}
                        />
                      )}
                    </div>
                  </div>

                  {/* ── جزئیات کارت ────────────────────────────── */}
                  {isOpen && (
                    <CardBody className="border-t border-stone-100 space-y-4">

                      {/* chips اطلاعات کلیدی */}
                      <div className="flex flex-wrap gap-1.5">
                        {a.gender && (
                          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11.5px] text-stone-700">
                            {GENDER_LABELS[a.gender]}
                          </span>
                        )}
                        {a.city && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11.5px] text-stone-700">
                            <MapPin size={10} />{a.city}
                          </span>
                        )}
                        {(a.shiftAvailability ?? []).map((s: string) => (
                          <span key={s} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11.5px] text-amber-700">
                            {SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s}
                          </span>
                        ))}
                        {a.startAvailability && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] text-emerald-700">
                            شروع: {START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability}
                          </span>
                        )}
                        {a.referralSource && (
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11.5px] text-sky-700">
                            {REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource}
                          </span>
                        )}
                      </div>

                      {/* فیلدهای سفارشی داینامیک */}
                      {(snap.length > 0 || customDisplayFields.length > 0) && (
                        <div className="border-t border-stone-100 pt-3">
                          <div className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-widest mb-2">فیلدهای فرم‌ساز</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-stone-600 sm:grid-cols-3">
                            {snap.map(s => {
                              const fieldDef = formFields.find(f => f.key === s.key);
                              const val = cf[s.key];
                              if (fieldDef?.type === 'multiselect' && Array.isArray(val)) {
                                return (
                                  <div key={s.key} className="col-span-2 sm:col-span-3">
                                    <span className="text-muted">{s.label}: </span>
                                    <span className="inline-flex flex-wrap gap-1">
                                      {(val as string[]).map(v => {
                                        const opt = fieldDef?.options.find(o => o.value === v);
                                        return <Chip key={v}>{opt ? opt.label : v}</Chip>;
                                      })}
                                    </span>
                                  </div>
                                );
                              }
                              return (
                                <div key={s.key}>
                                  <span className="text-muted">{s.label}: </span>{renderCustomValue(val, fieldDef)}
                                </div>
                              );
                            })}
                            {customDisplayFields.filter(f => !snap.find(s => s.key === f.key)).map(f => (
                              <div key={f.key}><span className="text-muted">{f.label}: </span>—</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* رزومه / اطلاعات متنی */}
                      {a.hasResume ? (
                        <a href={`/api/recruitment/${a.id}/resume`} download>
                          <Button variant="default" size="sm" icon={FileText}>دانلود رزومه</Button>
                        </a>
                      ) : a.manualInfo ? (
                        <div className="rounded-md bg-stone-50 p-3 text-[12px] leading-6 text-stone-700">
                          <div className="mb-1 text-[11px] text-muted">اطلاعات کلی (بدون رزومه)</div>
                          {a.manualInfo}
                        </div>
                      ) : null}

                      {/* سوال‌وجواب‌ها — هر بلوک جداگانه */}
                      {SCREENING_QUESTIONS.filter(q => a.answers[q.id]).length > 0 && (
                        <div className="border-t border-stone-100 pt-3 space-y-2">
                          {SCREENING_QUESTIONS.map((q) => {
                            const ans = a.answers[q.id];
                            if (!ans) return null;
                            return (
                              <div key={q.id} className="rounded-lg bg-stone-50 px-3.5 py-2.5">
                                <div className="text-[11px] leading-5 text-stone-400 mb-1">{q.prompt}</div>
                                <div className="text-[13px] font-medium leading-6 text-stone-800">{ans}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* کنترل‌های بررسی */}
                      <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
                        <Select value={a.area ?? ''} onChange={(e) => setAreaReview(a, e.target.value as 'hall' | 'kitchen' | '')} className="w-32">
                          <option value="">بخش (تعیین نشده)</option>
                          <option value="hall">سالن</option>
                          <option value="kitchen">آشپزخانه</option>
                        </Select>
                      </div>

                      <NoteEditor key={`note-${a.id}`} initial={a.reviewerNote ?? ''} onSave={(v) => saveNote(a, v)} />

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button variant="success" size="sm" icon={Check} onClick={() => setStatus(a, 'accepted')}>قبول</Button>
                        <Button variant="default" size="sm" icon={Star} onClick={() => setStatus(a, 'shortlist')}>لیست کوتاه</Button>
                        <Button variant="danger" size="sm" icon={X} onClick={() => setStatus(a, 'rejected')}>رد</Button>
                        {a.status === 'accepted' && (
                          <Button variant="primary" size="sm" icon={UserCheck} onClick={() => convertToEmployee(a)}>تبدیل به پرسنل</Button>
                        )}
                        <div className="flex-1" />
                        <Button variant="ghost" size="sm" icon={Trash2} onClick={() => handleDelete(a.id)}>حذف</Button>
                      </div>
                    </CardBody>
                  )}
                </Card>
              );
            })}

            {/* بارگذاری بیشتر */}
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

        {/* Modal مدیریت سوال‌ها */}
        {showQuestions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowQuestions(false)}>
            <div className="bg-white rounded-xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-[16px] font-medium text-stone-900">مدیریت سوال‌های فرم</h2>
                <button onClick={() => setShowQuestions(false)} className="text-muted hover:text-stone-700"><X size={18} /></button>
              </div>
              <p className="text-[11.5px] text-stone-500 mb-4">سوال‌ها در فرم استخدام به همین ترتیب نمایش داده می‌شوند.</p>
              {qLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-muted" /></div>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="border border-stone-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-muted w-5 flex-shrink-0 text-center">{i + 1}</span>
                        <Input className="flex-1" value={q.title} onChange={e => updateQuestion(i, { title: e.target.value })} placeholder="عنوان کوتاه سوال" />
                        <button onClick={() => removeQuestion(i)} className="flex-shrink-0 p-1.5 rounded-md text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors">
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <Textarea className="mr-7" value={q.prompt} onChange={e => updateQuestion(i, { prompt: e.target.value })} rows={2} placeholder="متن کامل سوال که متقاضی می‌بیند" />
                    </div>
                  ))}
                  <button onClick={addQuestion} className="flex items-center gap-1.5 text-[12.5px] text-stone-600 hover:text-stone-900">
                    <Plus size={14} />افزودن سوال
                  </button>
                </div>
              )}
              <div className="flex gap-2 mt-5">
                <Button variant="primary" onClick={saveQuestions} loading={qSaving} icon={Check}>ذخیره</Button>
                <Button variant="default" onClick={() => setShowQuestions(false)}>انصراف</Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal مقایسه */}
        {showCompare && compareList.length >= 2 && (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={() => setShowCompare(false)}>
            <div className="bg-white rounded-xl w-full max-w-4xl mt-8 mb-8 overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <h2 className="text-[16px] font-medium text-stone-900">مقایسه داوطلبان</h2>
                <button onClick={() => setShowCompare(false)} className="text-muted hover:text-stone-700"><X size={18} /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] text-right" dir="rtl">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="px-4 py-3 font-medium text-stone-500 w-32">فیلد</th>
                      {compareList.map(a => (
                        <th key={a.id} className="px-4 py-3 font-medium text-stone-900">
                          {a.firstName} {a.lastName}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {([
                      ['وضعیت', (a: JobApplication) => STATUS_LABELS[a.status]],
                      ['امتیاز', (a: JobApplication) => a.score ? '★'.repeat(a.score) : '—'],
                      ['بخش', (a: JobApplication) => a.area ? AREA_LABELS[a.area] : '—'],
                      ['سن', (a: JobApplication) => a.age ? `${a.age} ساله` : '—'],
                      ['جنسیت', (a: JobApplication) => a.gender ? GENDER_LABELS[a.gender] : '—'],
                      ['محله', (a: JobApplication) => a.city ?? '—'],
                      ['شیفت‌ها', (a: JobApplication) => (a.shiftAvailability ?? []).map((s: string) => SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s).join('، ') || '—'],
                      ['شروع', (a: JobApplication) => a.startAvailability ? (START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability) : '—'],
                      ['آشنایی', (a: JobApplication) => a.referralSource ? (REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource) : '—'],
                      ['رزومه', (a: JobApplication) => a.hasResume ? 'دارد' : (a.manualInfo ? 'متنی' : '—')],
                      ['تاریخ', (a: JobApplication) => faDate(a.createdAt)],
                    ] as [string, (a: JobApplication) => string][]).map(([label, fn]) => (
                      <tr key={label} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5 text-stone-500 font-medium">{label}</td>
                        {compareList.map(a => (
                          <td key={a.id} className="px-4 py-2.5 text-stone-800">{fn(a)}</td>
                        ))}
                      </tr>
                    ))}
                    {/* سوال‌های مشترک */}
                    {SCREENING_QUESTIONS.filter(q => compareList.some(a => a.answers[q.id])).map(q => (
                      <tr key={q.id} className="hover:bg-stone-50">
                        <td className="px-4 py-2.5 text-stone-500 font-medium align-top">{q.title}</td>
                        {compareList.map(a => (
                          <td key={a.id} className="px-4 py-2.5 text-stone-800 leading-5 align-top">
                            {a.answers[q.id] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-stone-100">
                <Button variant="default" onClick={exitCompare} icon={X}>بستن و خروج از مقایسه</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── کامپوننت یادداشت ───────────────────────────────────────────────────────
function NoteEditor({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(initial);
  return (
    <div className="space-y-1.5">
      <div className="text-[11.5px] text-muted">یادداشت بررسی</div>
      <div className="flex items-start gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="یادداشت داخلی…" />
        <Button variant="default" size="md" onClick={() => onSave(val)} disabled={val === initial}>ذخیره</Button>
      </div>
    </div>
  );
}
