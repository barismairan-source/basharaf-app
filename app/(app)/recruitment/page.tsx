'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import {
  UserPlus, Phone, MapPin, FileText, Download, Trash2,
  Search, X, Star, Check, ExternalLink, Settings2, Plus, Loader2, UserCheck, Wrench,
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

const STATUS_TONE: Record<ApplicationStatus, string> = {
  new: 'bg-stone-100 text-stone-600',
  shortlist: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const STATUS_FILTERS: Array<{ value: 'all' | ApplicationStatus; label: string }> = [
  { value: 'all', label: 'همه' },
  { value: 'new', label: 'جدید' },
  { value: 'shortlist', label: 'لیست کوتاه' },
  { value: 'accepted', label: 'قبول' },
  { value: 'rejected', label: 'رد' },
];

function faDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('fa-IR'); } catch { return iso; }
}

/** نمایش مقدار فیلد داینامیک */
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

export default function RecruitmentPage() {
  const user             = useAppStore((s) => s.user);
  const applications     = useAppStore((s) => s.applications);
  const loadApplications = useAppStore((s) => s.loadApplications);
  const reviewApplication = useAppStore((s) => s.reviewApplication);
  const deleteApplication = useAppStore((s) => s.deleteApplication);
  const showToast        = useAppStore((s) => s.showToast);
  const router           = useRouter();

  const [hydrated,     setHydrated]     = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
  const [areaFilter,   setAreaFilter]   = useState<'all' | 'hall' | 'kitchen'>('all');
  const [startFilter,  setStartFilter]  = useState<string>('all');
  const [search,       setSearch]       = useState('');
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [questions,    setQuestions]    = useState<ScreeningQuestion[]>([]);
  const [qLoading,     setQLoading]     = useState(false);
  const [qSaving,      setQSaving]      = useState(false);

  // فیلدهای داینامیک از فرم‌ساز
  const [formFields,   setFormFields]   = useState<FormFieldData[]>([]);
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    setHydrated(true);
    loadApplications();
    // بارگذاری فیلدهای داینامیک
    fetch('/api/recruitment/form-builder', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: { sections: FormSectionData[] }) => {
        const fields = d.sections?.flatMap(s => s.fields) ?? [];
        setFormFields(fields);
      })
      .catch(() => setFormFields([]));
  }, [loadApplications]);

  // فیلدهای filterable و non-system
  const filterableFields = useMemo(
    () => formFields.filter(f => f.isFilterable && !f.isSystem && f.isActive && (f.type === 'select' || f.type === 'multiselect' || f.type === 'radio')),
    [formFields]
  );

  // فیلدهای سفارشی برای نمایش در کارت (غیر سیستمی و فعال)
  const customDisplayFields = useMemo(
    () => formFields.filter(f => !f.isSystem && f.isActive),
    [formFields]
  );

  const filtered = useMemo(() => {
    const q = search.trim();
    return applications.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false;
      if (areaFilter !== 'all' && a.area !== areaFilter) return false;
      if (startFilter !== 'all' && a.startAvailability !== startFilter) return false;
      if (q && !`${a.firstName} ${a.lastName} ${a.phone}`.includes(q)) return false;
      // فیلترهای داینامیک
      for (const [fieldKey, filterVal] of Object.entries(dynamicFilters)) {
        if (!filterVal || filterVal === 'all') continue;
        const cf = (a.customFields as Record<string, unknown> | undefined) ?? {};
        const val = cf[fieldKey];
        if (Array.isArray(val)) { if (!val.includes(filterVal)) return false; }
        else if (String(val ?? '') !== filterVal) return false;
      }
      return true;
    });
  }, [applications, statusFilter, areaFilter, startFilter, search, dynamicFilters]);

  const selected = useMemo(
    () => applications.find((a) => a.id === selectedId) ?? null,
    [applications, selectedId]
  );

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return (
      <div className="p-6">
        <Empty icon={UserPlus} title="دسترسی ندارید" sub="این بخش فقط برای مدیر کل است." />
      </div>
    );
  }

  function exportXlsx() {
    // ستون‌های سیستمی
    const rows = filtered.map((a) => {
      const base: Record<string, string | number> = {
        نام: a.firstName,
        'نام خانوادگی': a.lastName,
        موبایل: a.phone,
        سن: a.age ?? '',
        جنسیت: a.gender ? GENDER_LABELS[a.gender] : '',
        'محله سکونت': a.city ?? '',
        'شیفت‌ها': (a.shiftAvailability ?? []).map((s: string) => SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s).join(' / '),
        'امکان شروع': a.startAvailability ? (START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability) : '',
        'کانال آشنایی': a.referralSource ? (REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource) : '',
        بخش: a.area ? AREA_LABELS[a.area] : '',
        وضعیت: STATUS_LABELS[a.status],
        امتیاز: a.score ?? '',
        رزومه: a.resumeUrl ?? (a.manualInfo ? 'متنی' : '—'),
        یادداشت: a.reviewerNote ?? '',
        تاریخ: faDate(a.createdAt),
      };
      // سوال‌های سیستمی
      for (const q of SCREENING_QUESTIONS) base[q.title] = a.answers[q.id] ?? '';
      // فیلدهای سفارشی داینامیک
      const snap: FieldSnapshot[] = (a.fieldSnapshot as FieldSnapshot[] | undefined) ?? [];
      const cf: Record<string, unknown> = (a.customFields as Record<string, unknown> | undefined) ?? {};
      for (const s of snap) {
        const fieldDef = formFields.find(f => f.key === s.key);
        base[s.label] = renderCustomValue(cf[s.key], fieldDef);
      }
      // فیلدهای فعال که در snapshot قدیمی نیستند
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

  function convertToEmployee(a: JobApplication) {
    const params = new URLSearchParams({
      fromApplicant: '1',
      fullName: `${a.firstName} ${a.lastName}`,
      phone: a.phone,
    });
    router.push(`/employees?${params.toString()}`);
  }

  async function setStatus(a: JobApplication, status: ApplicationStatus) {
    const ok = await reviewApplication(a.id, { status });
    if (ok) showToast('وضعیت به‌روزرسانی شد', 'success');
    else showToast('خطا', 'danger');
  }

  async function setScore(a: JobApplication, score: number) {
    const next = a.score === score ? null : score;
    await reviewApplication(a.id, { score: next });
  }

  async function setAreaReview(a: JobApplication, area: 'hall' | 'kitchen' | '') {
    await reviewApplication(a.id, { area: area === '' ? null : area });
  }

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
    const id = `q${Date.now().toString(36)}`;
    setQuestions(qs => [...qs, { id, title: 'سوال جدید', prompt: '' }]);
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

  async function saveNote(a: JobApplication, note: string) {
    await reviewApplication(a.id, { reviewerNote: note.trim() || null });
    showToast('یادداشت ذخیره شد', 'success');
  }

  async function handleDelete(id: string) {
    const ok = await deleteApplication(id);
    if (ok) {
      if (selectedId === id) setSelectedId(null);
      showToast('حذف شد', 'success');
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium tracking-tight text-stone-900">استخدام</h1>
            <div className="mt-1 text-[12px] text-stone-500">
              {applications.length} درخواست · لینک فرم: <span dir="ltr">/apply</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="sm" icon={Wrench} onClick={() => router.push('/recruitment/form-builder')}>فرم‌ساز</Button>
            <Button variant="default" size="sm" icon={Settings2} onClick={openQuestions}>مدیریت سوال‌ها</Button>
            <a href="/apply" target="_blank" rel="noopener noreferrer">
              <Button variant="default" size="sm" icon={ExternalLink}>صفحه استخدام</Button>
            </a>
            <Button variant="default" size="sm" icon={Download} onClick={exportXlsx} disabled={filtered.length === 0}>
              خروجی اکسل
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-stone-200 bg-white p-0.5">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilter(f.value)}
                className={cn('rounded px-3 py-1.5 text-[12px] transition-colors',
                  statusFilter === f.value ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-50')}>
                {f.label}
              </button>
            ))}
          </div>
          <Select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value as typeof areaFilter)} className="w-32">
            <option value="all">همه بخش‌ها</option>
            <option value="hall">سالن</option>
            <option value="kitchen">آشپزخانه</option>
          </Select>
          <Select value={startFilter} onChange={(e) => setStartFilter(e.target.value)} className="w-40">
            <option value="all">همه زمان‌های شروع</option>
            <option value="immediate">فوری</option>
            <option value="within_week">تا یک هفته</option>
            <option value="after_week">بیشتر از یک هفته</option>
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
          <div className="relative flex-1 min-w-[160px]">
            <Input icon={Search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی نام یا موبایل…" />
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <Empty icon={UserPlus} title="درخواستی نیست" sub="هنوز فرمی ثبت نشده یا با این فیلتر چیزی پیدا نشد." />
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => {
              const cf: Record<string, unknown> = (a.customFields as Record<string, unknown> | undefined) ?? {};
              const snap: FieldSnapshot[] = (a.fieldSnapshot as FieldSnapshot[] | undefined) ?? [];
              return (
                <Card key={a.id}>
                  <button onClick={() => setSelectedId(selectedId === a.id ? null : a.id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-right">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-medium text-stone-900">{a.firstName} {a.lastName}</span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10.5px]', STATUS_TONE[a.status])}>{STATUS_LABELS[a.status]}</span>
                        {a.area && <Chip>{AREA_LABELS[a.area]}</Chip>}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11.5px] text-stone-500">
                        <span dir="ltr" className="inline-flex items-center gap-1"><Phone size={12} /> {a.phone}</span>
                        {a.city && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {a.city}</span>}
                        <span>{faDate(a.createdAt)}</span>
                      </div>
                    </div>
                    {a.score != null && (
                      <span className="inline-flex items-center gap-0.5 text-[12px] text-amber-600">
                        <Star size={13} fill="currentColor" /> {a.score}
                      </span>
                    )}
                    {a.resumeUrl && <FileText size={15} className="text-muted" />}
                  </button>

                  {selectedId === a.id && (
                    <CardBody className="border-t border-stone-100 space-y-4">
                      {/* اطلاعات سیستمی */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-stone-600 sm:grid-cols-4">
                        <div><span className="text-muted">سن: </span>{a.age ?? '—'}</div>
                        <div><span className="text-muted">جنسیت: </span>{a.gender ? GENDER_LABELS[a.gender] : '—'}</div>
                        <div className="col-span-2"><span className="text-muted">محله: </span>{a.city ?? '—'}</div>
                      </div>
                      <div className="grid grid-cols-1 gap-y-1.5 text-[12px] text-stone-600 sm:grid-cols-3 sm:gap-x-4">
                        <div>
                          <span className="text-muted">شیفت‌ها: </span>
                          {(a.shiftAvailability ?? []).length > 0
                            ? a.shiftAvailability!.map((s: string) => SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s).join('، ')
                            : '—'}
                        </div>
                        <div>
                          <span className="text-muted">شروع: </span>
                          {a.startAvailability ? (START_LABELS[a.startAvailability as keyof typeof START_LABELS] ?? a.startAvailability) : '—'}
                        </div>
                        <div>
                          <span className="text-muted">آشنایی: </span>
                          {a.referralSource ? (REFERRAL_LABELS[a.referralSource as keyof typeof REFERRAL_LABELS] ?? a.referralSource) : '—'}
                        </div>
                      </div>

                      {/* فیلدهای سفارشی داینامیک */}
                      {(snap.length > 0 || customDisplayFields.length > 0) && (
                        <div className="border-t border-stone-100 pt-3">
                          <div className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-widest mb-2">فیلدهای فرم‌ساز</div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px] text-stone-600 sm:grid-cols-3">
                            {/* نمایش بر اساس snapshot رکورد */}
                            {snap.map(s => {
                              const fieldDef = formFields.find(f => f.key === s.key);
                              const val = cf[s.key];
                              const displayVal = renderCustomValue(val, fieldDef);
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
                                  <span className="text-muted">{s.label}: </span>{displayVal}
                                </div>
                              );
                            })}
                            {/* فیلدهای فعال که در این رکورد نیستند */}
                            {customDisplayFields.filter(f => !snap.find(s => s.key === f.key)).map(f => (
                              <div key={f.key}><span className="text-muted">{f.label}: </span>—</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* رزومه */}
                      {a.resumeUrl ? (
                        <a href={a.resumeUrl} target="_blank" rel="noreferrer" download={a.resumeUrl.startsWith('data:') ? 'resume' : undefined}>
                          <Button variant="default" size="sm" icon={FileText}>دانلود رزومه</Button>
                        </a>
                      ) : a.manualInfo ? (
                        <div className="rounded-md bg-stone-50 p-3 text-[12px] leading-6 text-stone-700">
                          <div className="mb-1 text-[11px] text-muted">اطلاعات کلی (بدون رزومه)</div>
                          {a.manualInfo}
                        </div>
                      ) : null}

                      {/* سوال‌های مرحله ۳ */}
                      <div className="space-y-2.5">
                        {SCREENING_QUESTIONS.map((q) => (
                          <div key={q.id}>
                            <div className="text-[11.5px] text-muted">{q.title}</div>
                            <div className="text-[12.5px] leading-6 text-stone-700">{a.answers[q.id] || '—'}</div>
                          </div>
                        ))}
                      </div>

                      {/* Review controls */}
                      <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button key={n} onClick={() => setScore(a, n)} aria-label={`امتیاز ${n}`}>
                              <Star size={18} className={cn(a.score != null && n <= a.score ? 'text-amber-500' : 'text-stone-300')}
                                fill={a.score != null && n <= a.score ? 'currentColor' : 'none'} />
                            </button>
                          ))}
                        </div>
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
      </div>
    </div>
  );
}

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
