'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload, CheckCircle2, Loader2, X, ArrowRight, ChefHat, Users } from 'lucide-react';
import { normalizeDigits } from '@/lib/utils';
import type { ScreeningQuestion } from '@/lib/recruitment/questions';
import { SHIFT_LABELS, START_LABELS, REFERRAL_LABELS } from '@/lib/recruitment/questions';
import { cn } from '@/lib/utils';

type Area = 'hall' | 'kitchen';

const STEPS = ['انتخاب بخش', 'اطلاعات شخصی', 'سوال‌ها', 'مرور نهایی'];

const AREA_CARDS: Array<{ key: Area; icon: typeof ChefHat; label: string; sub: string }> = [
  { key: 'kitchen', icon: ChefHat, label: 'آشپزخانه', sub: 'آشپز، سرآشپز، کمک‌آشپز' },
  { key: 'hall',    icon: Users,   label: 'سالن',     sub: 'گارسون، مسئول سالن'      },
];

const SHIFT_OPTIONS = Object.entries(SHIFT_LABELS) as [keyof typeof SHIFT_LABELS, string][];
const START_OPTIONS = Object.entries(START_LABELS) as [keyof typeof START_LABELS, string][];
const REFERRAL_OPTIONS = Object.entries(REFERRAL_LABELS) as [keyof typeof REFERRAL_LABELS, string][];

// ── shared classes ────────────────────────────────────────────────────────
const INP = 'w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-white focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors';
const LBL = 'block text-xs font-medium text-gray-500 mb-1.5';
const ERR = 'text-[11px] text-red-500 mt-1';

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className={ERR}>{msg}</p>;
}

export default function ApplyPage() {
  const [step,              setStep]              = useState(0);
  const [done,              setDone]              = useState(false);
  const [submitting,        setSubmitting]        = useState(false);
  const [errors,            setErrors]            = useState<Record<string, string>>({});

  const [area,              setArea]              = useState<Area | null>(null);
  const [firstName,         setFirstName]         = useState('');
  const [lastName,          setLastName]          = useState('');
  const [phone,             setPhone]             = useState('');
  const [age,               setAge]               = useState('');
  const [gender,            setGender]            = useState('');
  const [city,              setCity]              = useState('');
  const [shiftAvailability, setShiftAvailability] = useState<string[]>([]);
  const [startAvailability, setStartAvailability] = useState('');
  const [referralSource,    setReferralSource]    = useState('');
  const [referralLocked,    setReferralLocked]    = useState(false);
  const [hasResume,         setHasResume]         = useState(true);
  const [file,              setFile]              = useState<File | null>(null);
  const [manualInfo,        setManualInfo]        = useState('');
  const [answers,           setAnswers]           = useState<Record<string, string>>({});
  const [questions,         setQuestions]         = useState<ScreeningQuestion[]>([]);

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
      setReferralSource(
        src.includes('instagram') ? 'instagram' :
        src.includes('divar')     ? 'divar'     : 'other'
      );
      setReferralLocked(true);
    }
  }, []);

  function next() { setErrors({}); setStep(s => s + 1); }
  function back() { setErrors({}); setStep(s => Math.max(0, s - 1)); }

  function toggleShift(s: string) {
    setShiftAvailability(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (firstName.trim().length < 2) e.firstName = 'نام را کامل وارد کنید';
    if (lastName.trim().length < 2)  e.lastName  = 'نام خانوادگی را کامل وارد کنید';
    if (!/^09\d{9}$/.test(phone.replace(/\D/g, ''))) e.phone = 'شماره موبایل معتبر نیست (مثل ۰۹۱۲۳۴۵۶۷۸۹)';
    if (!age || +age < 14 || +age > 80) e.age = 'سن معتبر نیست (۱۴ تا ۸۰)';
    if (!gender)  e.gender = 'جنسیت را انتخاب کنید';
    if (city.trim().length < 2) e.city = 'محله را وارد کنید';
    if (shiftAvailability.length === 0) e.shift = 'حداقل یک شیفت را انتخاب کنید';
    if (!startAvailability) e.start = 'امکان شروع را انتخاب کنید';
    if (!referralSource)    e.referral = 'کانال آشنایی را انتخاب کنید';
    if (!hasResume && manualInfo.trim().length < 10) e.manualInfo = 'اطلاعات خودتان را بنویسید (حداقل یک خط)';
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
      const res = await fetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, phone: phone.replace(/\D/g, ''),
          age: +age, gender, city, area,
          hasResume, resumeUrl, resumePath,
          manualInfo: hasResume ? null : manualInfo,
          answers,
          shiftAvailability: shiftAvailability.length > 0 ? shiftAvailability : null,
          startAvailability: startAvailability || null,
          referralSource: referralSource || null,
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

  // ── Success ───────────────────────────────────────────────────────────
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

  return (
    <div dir="rtl" className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">

      {/* ── Mobile: horizontal stepper ──────────────────────────────────── */}
      <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-1">
              <div className={cn(
                'w-[22px] h-[22px] flex-shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold',
                step > i  ? 'bg-[#1a1a1a] text-white' :
                step === i ? 'bg-[#1a1a1a] text-white' :
                             'bg-gray-100 text-gray-400'
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

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
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
                <span className={`text-[13px] ${
                  isDone   ? 'text-white opacity-40 line-through' :
                  isActive ? 'text-white' :
                             'text-white opacity-30'
                }`}>{label}</span>
              </div>
            );
          })}
        </nav>
        <p className="text-[11px] text-white opacity-25">اطلاعات شما محرمانه است</p>
      </aside>

      {/* ── Form column ──────────────────────────────────────────────────── */}
      <main className="bg-white min-h-screen">
        {/* inner: centered, max-w-[640px], pb-28 on mobile for sticky footer */}
        <div className="mx-auto max-w-[640px] px-5 pt-6 pb-28 lg:px-10 lg:py-12">

          {/* Logo */}
          <div className="flex justify-center mb-6 lg:mb-8">
            <Image src="/logo.jpg" alt="باشرف" width={130} height={65} className="object-contain" />
          </div>

          {/* ── STEP 0: area ────────────────────────────────────────────── */}
          {step === 0 && (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">برای کدام بخش درخواست می‌دی؟</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 lg:mb-8">یکی را انتخاب کن تا ادامه بدهیم</p>
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {AREA_CARDS.map(({ key, icon: Icon, label, sub }) => {
                  const selected = area === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setArea(key); next(); }}
                      className={`border-2 rounded-2xl p-5 lg:p-6 text-right cursor-pointer transition-all min-h-[120px] ${
                        selected
                          ? 'border-[#1a1a1a] bg-[#1a1a1a]'
                          : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      <Icon size={22} strokeWidth={1.5} className={selected ? 'text-white' : 'text-gray-800'} />
                      <p className={`text-base font-semibold mt-2.5 mb-1 ${selected ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                      <p className={`text-xs leading-relaxed ${selected ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 1: personal info ────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">اطلاعات شما</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 lg:mb-8">لطفاً اطلاعات خود را کامل وارد کنید</p>

              <div className="space-y-4">
                {/* name row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                  <div>
                    <label className={LBL}>نام <span className="text-red-400">*</span></label>
                    <input
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className={cn(INP, errors.firstName && 'border-red-300')}
                    />
                    <FieldError msg={errors.firstName} />
                  </div>
                  <div>
                    <label className={LBL}>نام خانوادگی <span className="text-red-400">*</span></label>
                    <input
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className={cn(INP, errors.lastName && 'border-red-300')}
                    />
                    <FieldError msg={errors.lastName} />
                  </div>
                </div>

                {/* phone */}
                <div>
                  <label className={LBL}>موبایل <span className="text-red-400">*</span></label>
                  <input
                    value={phone}
                    onChange={e => setPhone(normalizeDigits(e.target.value))}
                    dir="ltr"
                    placeholder="09123456789"
                    inputMode="numeric"
                    className={cn(INP, 'text-left', errors.phone && 'border-red-300')}
                  />
                  <FieldError msg={errors.phone} />
                </div>

                {/* age + gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={LBL}>سن <span className="text-red-400">*</span></label>
                    <input
                      value={age}
                      onChange={e => setAge(normalizeDigits(e.target.value).replace(/\D/g, ''))}
                      dir="ltr"
                      inputMode="numeric"
                      className={cn(INP, errors.age && 'border-red-300')}
                    />
                    <FieldError msg={errors.age} />
                  </div>
                  <div>
                    <label className={LBL}>جنسیت <span className="text-red-400">*</span></label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className={cn(INP, 'appearance-none', errors.gender && 'border-red-300')}
                    >
                      <option value="">—</option>
                      <option value="male">آقا</option>
                      <option value="female">خانم</option>
                    </select>
                    <FieldError msg={errors.gender} />
                  </div>
                </div>

                {/* محله */}
                <div>
                  <label className={LBL}>محله / منطقه سکونت <span className="text-red-400">*</span></label>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="مثلاً سعادت‌آباد"
                    className={cn(INP, errors.city && 'border-red-300')}
                  />
                  <FieldError msg={errors.city} />
                </div>

                {/* دسترسی شیفت — chips */}
                <div>
                  <label className={LBL}>دسترسی شیفت <span className="text-red-400">*</span></label>
                  <p className="text-[11px] text-gray-400 mb-2">می‌توانی چند گزینه انتخاب کنی</p>
                  <div className="flex flex-wrap gap-2">
                    {SHIFT_OPTIONS.map(([key, label]) => {
                      const active = shiftAvailability.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleShift(key)}
                          className={cn(
                            'min-h-[44px] px-4 py-2 rounded-xl text-sm border-2 transition-all font-medium',
                            active
                              ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                              : 'border-gray-200 text-gray-600 hover:border-gray-400'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError msg={errors.shift} />
                </div>

                {/* امکان شروع — radio */}
                <div>
                  <label className={LBL}>امکان شروع <span className="text-red-400">*</span></label>
                  <div className="flex flex-wrap gap-2">
                    {START_OPTIONS.map(([key, label]) => {
                      const active = startAvailability === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStartAvailability(key)}
                          className={cn(
                            'min-h-[44px] px-4 py-2 rounded-xl text-sm border-2 transition-all font-medium',
                            active
                              ? 'border-[#1a1a1a] bg-[#1a1a1a] text-white'
                              : 'border-gray-200 text-gray-600 hover:border-gray-400'
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <FieldError msg={errors.start} />
                </div>

                {/* آشنایی با ما */}
                <div>
                  <label className={LBL}>چطور با ما آشنا شدی؟ <span className="text-red-400">*</span></label>
                  <select
                    value={referralSource}
                    onChange={e => setReferralSource(e.target.value)}
                    disabled={referralLocked}
                    className={cn(INP, 'appearance-none', errors.referral && 'border-red-300', referralLocked && 'opacity-60')}
                  >
                    <option value="">انتخاب کنید...</option>
                    {REFERRAL_OPTIONS.map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  {referralLocked && <p className="text-[11px] text-gray-400 mt-1">از طریق لینک پیشنهادی پر شده</p>}
                  <FieldError msg={errors.referral} />
                </div>

                {/* resume block */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                  <div className="flex">
                    <button
                      type="button"
                      onClick={() => { setHasResume(true); setManualInfo(''); }}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        hasResume ? 'bg-[#1a1a1a] text-white' : 'bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      آپلود رزومه
                    </button>
                    <button
                      type="button"
                      onClick={() => { setHasResume(false); setFile(null); }}
                      className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        !hasResume ? 'bg-[#1a1a1a] text-white' : 'bg-gray-50 text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      رزومه ندارم
                    </button>
                  </div>

                  {hasResume && (
                    <div className="p-4">
                      <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${
                        file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                      } ${errors.file ? 'border-red-300' : ''}`}>
                        <Upload size={18} strokeWidth={1.5} className={file ? 'text-emerald-500' : 'text-gray-400'} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{file ? file.name : 'انتخاب فایل رزومه'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">PDF، Word، یا عکس</p>
                        </div>
                        {file && (
                          <span onClick={e => { e.preventDefault(); setFile(null); }} className="cursor-pointer">
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
                      <textarea
                        value={manualInfo}
                        onChange={e => setManualInfo(e.target.value)}
                        rows={4}
                        placeholder="سابقه کاری، مهارت‌ها، و هر چیزی که فکر می‌کنی مهم است را بنویس..."
                        className={cn(
                          'w-full border border-gray-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors',
                          errors.manualInfo && 'border-red-300'
                        )}
                      />
                      <FieldError msg={errors.manualInfo} />
                    </div>
                  )}
                </div>

                {errors.submit && (
                  <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">{errors.submit}</div>
                )}

                {/* Desktop nav buttons */}
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
            </div>
          )}

          {/* ── STEP 2: questions ─────────────────────────────────────────── */}
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
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {qi + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{q.title || `سوال ${qi + 1}`}</span>
                      </div>
                      {q.prompt && <p className="text-xs text-gray-600 mb-3 mr-8">{q.prompt}</p>}
                      <textarea
                        value={answers[q.id] ?? ''}
                        onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}

              {errors.submit && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mt-4">{errors.submit}</div>
              )}

              {/* Desktop nav */}
              <div className="hidden lg:flex justify-between mt-8">
                <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                  <ArrowRight size={16} strokeWidth={1.5} /> قبلی
                </button>
                <button onClick={next}
                  className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 transition-colors">
                  بعدی
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: review ───────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">مرور نهایی</h2>
              <p className="text-sm text-gray-400 mt-2 mb-6 lg:mb-8">اطلاعات را بررسی کن و ثبت کن</p>

              <div className="border border-gray-100 rounded-2xl overflow-hidden text-sm">
                {/* job */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">اطلاعات شغلی</p>
                  <ReviewRow label="بخش" value={area === 'hall' ? 'سالن' : 'آشپزخانه'} />
                </div>
                {/* personal */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">اطلاعات شخصی</p>
                  <div className="space-y-2">
                    <ReviewRow label="نام"      value={`${firstName} ${lastName}`} />
                    <ReviewRow label="موبایل"   value={phone} />
                    <ReviewRow label="سن"       value={age} />
                    <ReviewRow label="جنسیت"   value={gender === 'male' ? 'آقا' : 'خانم'} />
                    <ReviewRow label="محله"     value={city} />
                  </div>
                </div>
                {/* availability */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">دسترسی</p>
                  <div className="space-y-2">
                    <ReviewRow
                      label="شیفت‌ها"
                      value={shiftAvailability.map(s => SHIFT_LABELS[s as keyof typeof SHIFT_LABELS] ?? s).join('، ')}
                    />
                    <ReviewRow
                      label="شروع"
                      value={START_LABELS[startAvailability as keyof typeof START_LABELS] ?? startAvailability}
                    />
                    <ReviewRow
                      label="آشنایی"
                      value={REFERRAL_LABELS[referralSource as keyof typeof REFERRAL_LABELS] ?? referralSource}
                    />
                  </div>
                </div>
                {/* resume */}
                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">رزومه</p>
                  <ReviewRow label="نوع" value={hasResume ? (file?.name ?? '—') : 'اطلاعات دستی'} />
                </div>
              </div>

              {errors.submit && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mt-4">{errors.submit}</div>
              )}

              {/* Desktop nav */}
              <div className="hidden lg:flex justify-between mt-8">
                <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                  <ArrowRight size={16} strokeWidth={1.5} /> قبلی
                </button>
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} strokeWidth={1.5} />}
                  ثبت درخواست
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile sticky bottom nav (step > 0 only) ─────────────────────── */}
      {step > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100 px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          <div className="flex gap-3 max-w-[640px] mx-auto">
            <button
              onClick={back}
              className="h-12 px-5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <ArrowRight size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={handleNext}
              disabled={submitting}
              className="flex-1 h-12 bg-[#1a1a1a] text-white text-sm font-semibold rounded-xl hover:bg-black/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : step === STEPS.length - 1 ? (
                <><CheckCircle2 size={15} strokeWidth={1.5} /> ثبت درخواست</>
              ) : 'بعدی'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium text-gray-800 text-left">{value || '—'}</span>
    </div>
  );
}
