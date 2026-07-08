'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Upload, CheckCircle2, Loader2, X, ArrowRight, ChefHat, Users } from 'lucide-react';
import { normalizeDigits } from '@/lib/utils';
import type { ScreeningQuestion } from '@/lib/recruitment/questions';
import { cn } from '@/lib/utils';
import type { FormStructure, FormFieldData, FormSectionData } from '@/lib/recruitment/form-types';
import { OPTION_FIELD_TYPES, SYSTEM_FIELD_COLUMN_MAP, evaluateFieldVisibility } from '@/lib/recruitment/form-types';

type Area = 'hall' | 'kitchen';
const STEPS = ['انتخاب بخش', 'اطلاعات شخصی', 'سوال‌ها', 'مرور نهایی'];

const AREA_CARDS: Array<{ key: Area; icon: typeof ChefHat; label: string; sub: string }> = [
  { key: 'kitchen', icon: ChefHat, label: 'آشپزخانه', sub: 'آشپز، سرآشپز، کمک‌آشپز' },
  { key: 'hall',    icon: Users,   label: 'سالن',     sub: 'گارسون، مسئول سالن'      },
];

const INP = 'w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-white focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors';
const LBL = 'block text-xs font-medium text-gray-500 mb-1.5';
const ERR = 'text-[11px] text-red-500 mt-1';

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className={ERR}>{msg}</p>;
}

/** موتور ولیدیشن داینامیک بر اساس field.validation */
function validateDynamicField(field: FormFieldData, value: unknown): string | null {
  const v = field.validation;
  if (!v) return null;
  const strVal = Array.isArray(value) ? '' : String(value ?? '');
  if (v.regex && strVal) {
    try { if (!new RegExp(v.regex).test(strVal)) return `فرمت ورودی صحیح نیست`; }
    catch { /* regex invalid, skip */ }
  }
  if (v.minLength !== undefined && strVal.length < v.minLength)
    return `حداقل ${v.minLength} کاراکتر لازم است`;
  if (v.maxLength !== undefined && strVal.length > v.maxLength)
    return `حداکثر ${v.maxLength} کاراکتر مجاز است`;
  const numVal = parseFloat(strVal);
  if (!isNaN(numVal)) {
    if (v.min !== undefined && numVal < v.min) return `حداقل مقدار ${v.min} است`;
    if (v.max !== undefined && numVal > v.max) return `حداکثر مقدار ${v.max} است`;
  }
  return null;
}

/** رندر یک فیلد داینامیک */
function DynamicField({
  field,
  value,
  onChange,
  error,
  locked,
}: {
  field: FormFieldData;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  locked?: boolean;
}) {
  const strVal  = Array.isArray(value) ? '' : String(value ?? '');
  const arrVal  = Array.isArray(value) ? (value as string[]) : [];
  const activeOpts = field.options.filter(o => o.isActive);
  const isHalf = field.width === 'half';

  const baseInput = cn(INP, error && 'border-red-300', locked && 'opacity-60');

  function toggleMulti(v: string) {
    const next = arrVal.includes(v) ? arrVal.filter(x => x !== v) : [...arrVal, v];
    onChange(next);
  }

  if (field.type === 'select') {
    return (
      <div>
        <label className={LBL}>
          {field.label} {field.isRequired && <span className="text-red-400">*</span>}
        </label>
        {field.helpText && <p className="text-[11px] text-gray-400 mb-2">{field.helpText}</p>}
        <select
          value={strVal}
          onChange={e => onChange(e.target.value)}
          disabled={locked}
          className={cn(baseInput, 'appearance-none')}
        >
          <option value="">انتخاب کنید...</option>
          {activeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <FieldError msg={error} />
      </div>
    );
  }

  if (field.type === 'multiselect') {
    return (
      <div>
        <label className={LBL}>
          {field.label} {field.isRequired && <span className="text-red-400">*</span>}
        </label>
        {field.helpText && <p className="text-[11px] text-gray-400 mb-2">{field.helpText}</p>}
        <div className="flex flex-wrap gap-2">
          {activeOpts.map(o => {
            const active = arrVal.includes(o.value);
            return (
              <button key={o.value} type="button" disabled={locked}
                onClick={() => toggleMulti(o.value)}
                className={cn(
                  'min-h-[44px] px-4 py-2 rounded-xl text-sm border-2 transition-all font-medium',
                  active ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400',
                  error && !active && 'border-red-300',
                )}>
                {o.label}
              </button>
            );
          })}
        </div>
        <FieldError msg={error} />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div>
        <label className={LBL}>
          {field.label} {field.isRequired && <span className="text-red-400">*</span>}
        </label>
        {field.helpText && <p className="text-[11px] text-gray-400 mb-2">{field.helpText}</p>}
        <div className="flex flex-wrap gap-2">
          {activeOpts.map(o => {
            const active = strVal === o.value;
            return (
              <button key={o.value} type="button" disabled={locked}
                onClick={() => onChange(o.value)}
                className={cn(
                  'min-h-[44px] px-4 py-2 rounded-xl text-sm border-2 transition-all font-medium',
                  active ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-400',
                  error && !active && 'border-red-300',
                )}>
                {o.label}
              </button>
            );
          })}
        </div>
        <FieldError msg={error} />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className={LBL}>
          {field.label} {field.isRequired && <span className="text-red-400">*</span>}
        </label>
        {field.helpText && <p className="text-[11px] text-gray-400 mb-2">{field.helpText}</p>}
        <textarea
          value={strVal}
          onChange={e => onChange(e.target.value)}
          disabled={locked}
          placeholder={field.placeholder ?? ''}
          rows={4}
          className={cn(
            'w-full border border-gray-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors',
            error && 'border-red-300',
          )}
        />
        <FieldError msg={error} />
      </div>
    );
  }

  const inputMode =
    field.type === 'tel' || field.type === 'number' ? 'numeric' : 'text';
  const dir = field.type === 'tel' || field.type === 'number' ? 'ltr' : undefined;
  const inputType = field.type === 'date' ? 'date' : 'text';

  return (
    <div>
      <label className={LBL}>
        {field.label} {field.isRequired && <span className="text-red-400">*</span>}
      </label>
      {field.helpText && <p className="text-[11px] text-gray-400 mb-2">{field.helpText}</p>}
      <input
        value={strVal}
        onChange={e => {
          let v = e.target.value;
          if (field.type === 'tel' || field.type === 'number') v = normalizeDigits(v).replace(/\D/g, '');
          onChange(v);
        }}
        disabled={locked}
        placeholder={field.placeholder ?? ''}
        inputMode={inputMode}
        dir={dir}
        type={inputType}
        className={cn(baseInput, dir === 'ltr' && 'text-left')}
      />
      <FieldError msg={error} />
    </div>
  );
}

export default function ApplyPage() {
  const [step,       setStep]       = useState(0);
  const [done,       setDone]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors,     setErrors]     = useState<Record<string, string>>({});
  const [area,       setArea]       = useState<Area | null>(null);

  // ── فرم داینامیک ──────────────────────────────────────────────
  const [formStructure,  setFormStructure]  = useState<FormStructure | null>(null);
  const [formLoading,    setFormLoading]    = useState(false);
  const [formError,      setFormError]      = useState<string | null>(null);
  const [formValues,     setFormValues]     = useState<Record<string, unknown>>({});
  const [lockedFields,   setLockedFields]   = useState<Set<string>>(new Set());

  // ── سیستم موجود سوال‌ها (مرحله ۳) ──────────────────────────
  const [questions,  setQuestions]  = useState<ScreeningQuestion[]>([]);
  const [answers,    setAnswers]    = useState<Record<string, string>>({});

  // ── رزومه (hard-coded) ────────────────────────────────────────
  const [hasResume,  setHasResume]  = useState(true);
  const [file,       setFile]       = useState<File | null>(null);
  const [manualInfo, setManualInfo] = useState('');

  useEffect(() => {
    fetch('/api/recruitment/questions', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setQuestions(d.questions ?? []))
      .catch(() => setQuestions([]));

    // utm_source auto-fill
    const params = new URLSearchParams(window.location.search);
    const utm = params.get('utm_source');
    if (utm) {
      const src = utm.toLowerCase();
      const refVal = src.includes('instagram') ? 'instagram' : src.includes('divar') ? 'divar' : 'other';
      setFormValues(prev => ({ ...prev, referral_source: refVal }));
      setLockedFields(prev => new Set([...prev, 'referral_source']));
    }
  }, []);

  // ── بارگذاری ساختار فرم وقتی area انتخاب شد ──────────────
  const fetchFormStructure = useCallback(async (selectedArea: Area) => {
    setFormLoading(true);
    setFormError(null);
    try {
      const r = await fetch(`/api/recruitment/form-structure?area=${selectedArea}`, { cache: 'no-store' });
      if (!r.ok) throw new Error(`خطای سرور (${r.status})`);
      const s: FormStructure = await r.json();
      setFormStructure(s);
      const init: Record<string, unknown> = { ...formValues };
      for (const sec of s.sections) {
        for (const f of sec.fields) {
          if (f.defaultValue && init[f.key] === undefined) init[f.key] = f.defaultValue;
        }
      }
      setFormValues(init);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'بارگذاری فرم ناموفق بود');
      setFormStructure(null);
    } finally {
      setFormLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!area) return;
    void fetchFormStructure(area);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area]);

  // ── Section مرحله ۱ ─────────────────────────────────────────
  const personalSection: FormSectionData | null = formStructure?.sections.find(s => s.key === 'personal_info') ?? null;

  // ── فیلدهای قابل نمایش (با اعمال شرط‌ها) ─────────────────
  function getVisibleFields(section: FormSectionData): Array<{ field: FormFieldData; required: boolean }> {
    return section.fields
      .filter(f => f.isActive)
      .map(f => {
        // برای conditions، از field.id به‌عنوان کلید استفاده می‌کنیم
        const vals: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(formValues)) vals[k] = v;
        // نگاشت key → id برای conditions که به id اشاره دارند
        const valsByKey = formValues;
        // یک نگاشت ساده: conditions از dependsOnFieldId استفاده می‌کنند
        // اما evaluateFieldVisibility انتظار مقادیر indexed به id دارد
        // → یک map از id → key می‌سازیم
        if (!section) return { field: f, visible: true, required: f.isRequired };
        const allFields = section.fields;
        const valsByFieldId: Record<string, unknown> = {};
        for (const af of allFields) {
          valsByFieldId[af.id] = valsByKey[af.key];
        }
        const vis = evaluateFieldVisibility(f, valsByFieldId);
        return { field: f, visible: vis.visible, required: vis.required };
      })
      .filter(x => x.visible)
      .map(x => ({ field: x.field, required: x.required }));
  }

  function setValue(key: string, v: unknown) {
    setFormValues(prev => ({ ...prev, [key]: v }));
  }

  function next() { setErrors({}); setStep(s => s + 1); }
  function back() { setErrors({}); setStep(s => Math.max(0, s - 1)); }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};

    if (!personalSection) {
      // اگر فرم هنوز لود نشده، با validation قدیمی جلو برویم
      const vals = formValues;
      const fn = String(vals.first_name ?? '').trim();
      const ln = String(vals.last_name ?? '').trim();
      const ph = String(vals.phone ?? '').replace(/\D/g,'');
      if (fn.length < 2) e.first_name = 'نام را کامل وارد کنید';
      if (ln.length < 2) e.last_name  = 'نام خانوادگی را کامل وارد کنید';
      if (!/^09\d{9}$/.test(ph)) e.phone = 'شماره موبایل معتبر نیست';
    } else {
      const visible = getVisibleFields(personalSection);
      for (const { field, required } of visible) {
        const val = formValues[field.key];
        const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
        if (required && isEmpty) {
          e[field.key] = `${field.label} را وارد کنید`;
          continue;
        }
        if (!isEmpty) {
          const err = validateDynamicField(field, val);
          if (err) e[field.key] = err;
        }
      }
    }

    // resume validation (hard-coded)
    if (!hasResume && (manualInfo ?? '').trim().length < 10) e.manualInfo = 'اطلاعات خودتان را بنویسید (حداقل یک خط)';
    if (hasResume && !file) e.file = 'فایل رزومه را انتخاب کنید یا «رزومه ندارم» را بزنید';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleNext() {
    if (step === 1) { if (!validateStep1()) return; }
    if (step === STEPS.length - 1) { submit(); return; }
    next();
  }

  async function submit() {
    setErrors({}); setSubmitting(true);
    try {
      let resumeUrl: string | null = null, resumePath: string | null = null;
      if (hasResume && file) {
        resumeUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload  = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('خطا در خواندن فایل'));
          reader.readAsDataURL(file);
        });
        resumePath = `base64:${file.name}`;
      }

      // تبدیل فیلدهای داینامیک به فرمت مناسب
      const vals = formValues;
      const firstName = String(vals.first_name ?? '').trim();
      const lastName  = String(vals.last_name  ?? '').trim();
      const rawPhone  = String(vals.phone       ?? '').replace(/\D/g, '');
      const age       = vals.age !== undefined && vals.age !== '' ? +String(vals.age) : undefined;
      const gender    = String(vals.gender ?? '');
      const city      = String(vals.city ?? '').trim();
      const shiftAvailability = Array.isArray(vals.shift_availability) ? vals.shift_availability as string[] : null;
      const startAvailability = String(vals.start_availability ?? '') || null;
      const referralSource    = String(vals.referral_source ?? '') || null;

      // customFields = همه فیلدهایی که سیستمی نیستند
      const systemKeys = new Set(Object.keys(SYSTEM_FIELD_COLUMN_MAP));
      const customFields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(vals)) {
        if (!systemKeys.has(k)) customFields[k] = v;
      }

      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName,
          phone: rawPhone,
          age: age ?? 0,
          gender: (gender === 'male' || gender === 'female') ? gender : undefined,
          city, area,
          hasResume, resumeUrl, resumePath,
          manualInfo: hasResume ? null : manualInfo,
          answers,
          shiftAvailability,
          startAvailability,
          referralSource,
          customFields,
        }),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        setErrors({ submit: e.error ?? 'ثبت درخواست ناموفق بود' });
        return;
      }
      setDone(true);
    } catch (e) {
      setErrors({ submit: e instanceof Error ? e.message : 'خطا' });
    } finally { setSubmitting(false); }
  }

  // ── Success ────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen backdrop-blur-md bg-black/30 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl px-10 pt-10 pb-12 max-w-sm w-full text-center shadow-2xl">
          <div className="flex justify-center mb-7">
            <Image src="/logo.jpg" alt="باشرف" width={150} height={75} className="object-contain" />
          </div>
          <h1 className="text-[22px] font-bold text-gray-900 mb-4">درخواستت با موفقیت ثبت شد!</h1>
          <p className="text-sm text-gray-600 leading-[1.9]">
            دمت گرم که وقت گذاشتی و این فرم رو پر کردی. سوابقت رو با دقت بررسی می‌کنیم و خیلی زود برای مراحل بعدی باهات تماس می‌گیریم. منتظرمون باش!
          </p>
        </div>
      </div>
    );
  }

  // ── Review rows helper ─────────────────────────────────────────
  function getReviewRows(): Array<{ label: string; value: string }> {
    if (!personalSection) return [];
    return getVisibleFields(personalSection).map(({ field }) => {
      const val = formValues[field.key];
      let display = '';
      if (Array.isArray(val)) {
        const labels = (val as string[]).map(v => {
          const opt = field.options.find(o => o.value === v);
          return opt ? opt.label : v;
        });
        display = labels.join('، ');
      } else if (field.options.length > 0) {
        const opt = field.options.find(o => o.value === String(val ?? ''));
        display = opt ? opt.label : String(val ?? '');
      } else {
        display = String(val ?? '');
      }
      return { label: field.label, value: display };
    });
  }

  return (
    <div dir="rtl" className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">

      {/* Mobile stepper */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div className={cn(
                'w-[22px] h-[22px] flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold',
                step >= i ? 'bg-[#1a1a1a] text-white' : 'bg-gray-100 text-gray-400'
              )}>
                {step > i ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('flex-1 h-[2px] rounded-full', step > i ? 'bg-[#1a1a1a]' : 'bg-gray-200')} />
              )}
            </div>
          ))}
        </div>
        <p className="text-[12px] font-medium text-gray-700">{STEPS[step]}</p>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col bg-[#1a1a1a] px-6 py-10 justify-between">
        <nav className="space-y-1">
          {STEPS.map((label, i) => {
            const isDone   = step > i;
            const isActive = step === i;
            return (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isActive ? 'bg-white/10' : ''}`}>
                <div className={`w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold ${
                  isDone || isActive ? 'bg-white text-[#1a1a1a]' : 'bg-white/15 text-white/50'
                }`}>
                  {isDone ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : i + 1}
                </div>
                <span className={`text-[13px] ${isDone ? 'text-white opacity-40 line-through' : isActive ? 'text-white' : 'text-white opacity-30'}`}>{label}</span>
              </div>
            );
          })}
        </nav>
        <p className="text-[11px] text-white opacity-25">اطلاعات شما محرمانه است</p>
      </aside>

      {/* Form column */}
      <main className="bg-white min-h-screen">
        <div className="mx-auto max-w-[640px] px-5 pt-6 pb-28 lg:px-10 lg:py-12">
          <div className="flex justify-center mb-6 lg:mb-8">
            <Image src="/logo.jpg" alt="باشرف" width={130} height={65} className="object-contain" />
          </div>

          {/* STEP 0: area */}
          {step === 0 && (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">برای کدام بخش درخواست می‌دی؟</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 lg:mb-8">یکی را انتخاب کن تا ادامه بدهیم</p>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {AREA_CARDS.map(({ key, icon: Icon, label, sub }) => {
                  const selected = area === key;
                  return (
                    <button key={key} onClick={() => { setArea(key); next(); }}
                      className={`border-2 rounded-2xl p-5 lg:p-6 text-right cursor-pointer transition-all min-h-[120px] ${
                        selected ? 'border-[#1a1a1a] bg-[#1a1a1a]' : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                      }`}>
                      <Icon size={22} strokeWidth={1.5} className={selected ? 'text-white' : 'text-gray-800'} />
                      <p className={`text-base font-semibold mt-2.5 mb-1 ${selected ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                      <p className={`text-xs leading-relaxed ${selected ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 1: داینامیک */}
          {step === 1 && (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">اطلاعات شما</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 lg:mb-8">لطفاً اطلاعات خود را کامل وارد کنید</p>

              {formLoading ? (
                <div className="flex flex-col items-center gap-3 py-12">
                  <Loader2 className="animate-spin text-gray-400" size={28} />
                  <p className="text-sm text-gray-400">در حال بارگذاری فرم…</p>
                </div>
              ) : formError ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center">
                  <p className="text-sm text-red-500">{formError}</p>
                  <button
                    type="button"
                    onClick={() => area && void fetchFormStructure(area)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    تلاش مجدد
                  </button>
                </div>
              ) : !personalSection ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-gray-400" size={24} />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* رندر فیلدها در گروه‌های half/full */}
                  {renderFieldGroup(getVisibleFields(personalSection), formValues, lockedFields, errors, setValue)}

                  {/* resume block — hard-coded */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden">
                    <div className="flex">
                      <button type="button" onClick={() => { setHasResume(true); setManualInfo(''); }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${hasResume ? 'bg-[#1a1a1a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                        آپلود رزومه
                      </button>
                      <button type="button" onClick={() => { setHasResume(false); setFile(null); }}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${!hasResume ? 'bg-[#1a1a1a] text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
                        رزومه ندارم
                      </button>
                    </div>
                    {hasResume && (
                      <div className="p-4">
                        <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'} ${errors.file ? 'border-red-300' : ''}`}>
                          <Upload size={18} strokeWidth={1.5} className={file ? 'text-emerald-500' : 'text-gray-400'} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700 truncate">{file ? file.name : 'انتخاب فایل رزومه'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">PDF، Word، یا عکس</p>
                          </div>
                          {file && (
                            <span onClick={e => { e.preventDefault(); setFile(null); }}>
                              <X size={14} className="text-gray-400 hover:text-gray-600" />
                            </span>
                          )}
                          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={e => setFile(e.target.files?.[0] ?? null)} />
                        </label>
                        <FieldError msg={errors.file} />
                      </div>
                    )}
                    {!hasResume && (
                      <div className="p-4">
                        <p className="text-xs font-medium text-gray-500 mb-2">توضیحات و سوابق کاری شما</p>
                        <textarea value={manualInfo} onChange={e => setManualInfo(e.target.value)} rows={4}
                          placeholder="سابقه کاری، مهارت‌ها، و هر چیزی که فکر می‌کنی مهم است را بنویس..."
                          className={cn('w-full border border-gray-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors', errors.manualInfo && 'border-red-300')}
                        />
                        <FieldError msg={errors.manualInfo} />
                      </div>
                    )}
                  </div>

                  {errors.submit && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">{errors.submit}</div>}

                  <div className="hidden lg:flex justify-between mt-6">
                    <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                      <ArrowRight size={16} strokeWidth={1.5} /> قبلی
                    </button>
                    <button onClick={() => { if (validateStep1()) next(); }}
                      className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 transition-colors">
                      بعدی
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: سوال‌ها (سیستم موجود — بدون تغییر) */}
          {step === 2 && (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">چند سوال کوتاه</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 lg:mb-8">پاسخ‌های صادقانه بهتر از پاسخ‌های «درست» است</p>
              {questions.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center text-sm text-gray-400">سوالی تنظیم نشده</div>
              ) : (
                <div className="space-y-6 lg:space-y-8">
                  {questions.map((q, qi) => (
                    <div key={q.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-600">{qi + 1}</div>
                        <span className="text-sm font-medium text-gray-900">{q.title || `سوال ${qi + 1}`}</span>
                      </div>
                      {q.prompt && <p className="text-xs text-gray-600 mb-3 mr-8">{q.prompt}</p>}
                      <textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                        rows={3} className="w-full border border-gray-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
              {errors.submit && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mt-4">{errors.submit}</div>}
              <div className="hidden lg:flex justify-between mt-8">
                <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                  <ArrowRight size={16} strokeWidth={1.5} /> قبلی
                </button>
                <button onClick={next} className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 transition-colors">بعدی</button>
              </div>
            </div>
          )}

          {/* STEP 3: مرور نهایی */}
          {step === 3 && (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">مرور نهایی</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 lg:mb-8">اطلاعات را بررسی کن و ثبت کن</p>
              <div className="border border-gray-100 rounded-2xl overflow-hidden text-sm">
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">اطلاعات شغلی</p>
                  <ReviewRow label="بخش" value={area === 'hall' ? 'سالن' : 'آشپزخانه'} />
                </div>
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">اطلاعات شخصی</p>
                  <div className="space-y-2">
                    {getReviewRows().map(r => <ReviewRow key={r.label} label={r.label} value={r.value} />)}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">رزومه</p>
                  <ReviewRow label="نوع" value={hasResume ? (file?.name ?? '—') : 'اطلاعات دستی'} />
                </div>
              </div>
              {errors.submit && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mt-4">{errors.submit}</div>}
              <div className="hidden lg:flex justify-between mt-8">
                <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                  <ArrowRight size={16} strokeWidth={1.5} /> قبلی
                </button>
                <button onClick={submit} disabled={submitting}
                  className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2">
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} strokeWidth={1.5} />}
                  ثبت درخواست
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile sticky bottom */}
      {step > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex gap-3 max-w-[640px] mx-auto">
            <button onClick={back} className="h-12 px-5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0">
              <ArrowRight size={16} strokeWidth={1.5} />
            </button>
            <button onClick={handleNext} disabled={submitting}
              className="flex-1 h-12 bg-[#1a1a1a] text-white text-sm font-semibold rounded-xl hover:bg-black/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin" /> :
               step === STEPS.length - 1 ? <><CheckCircle2 size={15} strokeWidth={1.5} /> ثبت درخواست</> : 'بعدی'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** رندر فیلدها با چیدمان half/full */
function renderFieldGroup(
  visibleFields: Array<{ field: FormFieldData; required: boolean }>,
  formValues: Record<string, unknown>,
  lockedFields: Set<string>,
  errors: Record<string, string>,
  setValue: (k: string, v: unknown) => void
) {
  const result: React.ReactNode[] = [];
  let i = 0;
  while (i < visibleFields.length) {
    const cur = visibleFields[i];
    if (!cur) { i++; continue; }
    const { field, required } = cur;
    const fieldWithRequired = { ...field, isRequired: required };
    const next = visibleFields[i + 1];

    if (field.width === 'half' && next && next.field.width === 'half') {
      const { field: field2, required: req2 } = next;
      result.push(
        <div key={`group-${i}`} className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
          <DynamicField field={fieldWithRequired} value={formValues[field.key]} onChange={v => setValue(field.key, v)} error={errors[field.key]} locked={lockedFields.has(field.key)} />
          <DynamicField field={{ ...field2, isRequired: req2 }} value={formValues[field2.key]} onChange={v => setValue(field2.key, v)} error={errors[field2.key]} locked={lockedFields.has(field2.key)} />
        </div>
      );
      i += 2;
    } else {
      result.push(
        <DynamicField key={field.id} field={fieldWithRequired} value={formValues[field.key]} onChange={v => setValue(field.key, v)} error={errors[field.key]} locked={lockedFields.has(field.key)} />
      );
      i += 1;
    }
  }
  return result;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-left">{value || '—'}</span>
    </div>
  );
}
