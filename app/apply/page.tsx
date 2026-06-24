'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload, CheckCircle2, Loader2, X, ArrowRight, ChefHat, Users, PenLine } from 'lucide-react';
import type { ScreeningQuestion } from '@/lib/recruitment/questions';

type Area = 'hall' | 'kitchen';

const STEPS = ['انتخاب بخش', 'اطلاعات شخصی', 'سوال‌ها', 'مرور نهایی'];

const AREA_CARDS: Array<{ key: Area; icon: typeof ChefHat; label: string; sub: string }> = [
  { key: 'kitchen', icon: ChefHat, label: 'آشپزخانه', sub: 'آشپز، سرآشپز، کمک‌آشپز' },
  { key: 'hall',    icon: Users,   label: 'سالن',     sub: 'گارسون، مسئول سالن'      },
];

// ── shared input class ────────────────────────────────────────────────────
const INP = 'w-full h-11 border border-gray-200 rounded-xl px-4 text-sm bg-white focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors';
const LBL = 'block text-xs font-medium text-gray-500 mb-1.5';

export default function ApplyPage() {
  const [step,       setStep]       = useState(0);
  const [done,       setDone]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const [area,       setArea]       = useState<Area | null>(null);
  const [firstName,  setFirstName]  = useState('');
  const [lastName,   setLastName]   = useState('');
  const [phone,      setPhone]      = useState('');
  const [age,        setAge]        = useState('');
  const [gender,     setGender]     = useState('');
  const [city,       setCity]       = useState('');
  const [hasResume,  setHasResume]  = useState(true);
  const [file,       setFile]       = useState<File | null>(null);
  const [manualInfo, setManualInfo] = useState('');
  const [answers,    setAnswers]    = useState<Record<string, string>>({});
  const [questions,  setQuestions]  = useState<ScreeningQuestion[]>([]);

  useEffect(() => {
    fetch('/api/recruitment/questions', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setQuestions(d.questions ?? []))
      .catch(() => setQuestions([]));
  }, []);

  function next() { setError(''); setStep(s => s + 1); }
  function back() { setError(''); setStep(s => Math.max(0, s - 1)); }

  function validateStep1(): boolean {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) { setError('نام و نام خانوادگی را کامل وارد کنید'); return false; }
    if (!/^09\d{9}$/.test(phone.replace(/\D/g, '')))               { setError('شماره موبایل معتبر نیست (مثل 09123456789)'); return false; }
    if (!age || +age < 14 || +age > 80)                            { setError('سن معتبر نیست'); return false; }
    if (!gender)                                                    { setError('جنسیت را انتخاب کنید'); return false; }
    if (city.trim().length < 2)                                     { setError('محل سکونت را وارد کنید'); return false; }
    if (!hasResume && manualInfo.trim().length < 10)                { setError('اطلاعات خودتان را بنویسید (حداقل یک خط)'); return false; }
    if (hasResume && !file)                                         { setError('فایل رزومه را انتخاب کنید یا «رزومه ندارم» را بزنید'); return false; }
    return true;
  }

  async function submit() {
    setError(''); setSubmitting(true);
    try {
      let resumeUrl: string | null = null, resumePath: string | null = null;
      if (hasResume && file) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch('/api/recruitment/upload', { method: 'POST', body: fd });
        if (!up.ok) throw new Error('آپلود رزومه ناموفق بود');
        const u = await up.json() as { url: string; path: string };
        resumeUrl = u.url; resumePath = u.path;
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
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(e.error ?? 'ثبت درخواست ناموفق بود');
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally { setSubmitting(false); }
  }

  // ── Success ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl px-10 pt-10 pb-12 max-w-sm w-full text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.jpg"
              alt="باشرف"
              width={150}
              height={75}
              className="object-contain"
            />
          </div>

          {/* Illustration */}
          <div className="flex justify-center mb-8">
            <Image
              src="/success-illustration.png"
              alt="ثبت موفق"
              width={200}
              height={200}
              className="rounded-2xl object-cover"
            />
          </div>

          {/* Text */}
          <h1 className="text-[22px] font-bold text-gray-900 mb-4">
            درخواستت با موفقیت ثبت شد!
          </h1>
          <p className="text-sm text-gray-600 leading-[1.9]">
            دمت گرم که وقت گذاشتی و این فرم رو پر کردی. سوابقت رو با دقت بررسی می‌کنیم و خیلی زود برای مراحل بعدی باهات تماس می‌گیریم. منتظرمون باش!
          </p>
        </div>
      </div>
    );
  }

  const progressPct = (step / (STEPS.length - 1)) * 100;

  return (
    <div dir="rtl" className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">

      {/* ── Mobile: thin progress bar ──────────────────────────────── */}
      <div className="lg:hidden fixed top-0 inset-x-0 h-[3px] bg-gray-100 z-50">
        <div
          className="h-full bg-[#1a1a1a] transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col bg-[#1a1a1a] px-6 py-10 justify-between">
        <nav className="space-y-1">
          {STEPS.map((label, i) => {
            const isDone   = step > i;
            const isActive = step === i;
            return (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isActive ? 'bg-white/10' : ''}`}
              >
                {/* step circle */}
                <div className={`w-[22px] h-[22px] rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold ${
                  isDone || isActive ? 'bg-white text-[#1a1a1a]' : 'bg-white/15 text-white/50'
                }`}>
                  {isDone ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : i + 1}
                </div>
                {/* label */}
                <span className={`text-[13px] ${
                  isDone   ? 'text-white opacity-40 line-through' :
                  isActive ? 'text-white' :
                             'text-white opacity-30'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </nav>
        <p className="text-[11px] text-white opacity-25">اطلاعات شما محرمانه است</p>
      </aside>

      {/* ── Form column ────────────────────────────────────────────── */}
      <main className="bg-white min-h-screen flex items-center justify-center pt-8 pb-12 lg:pt-0 lg:pb-0">
        <div className="max-w-md w-full px-8 py-8">

          {/* Logo — ثابت در بالای همه مراحل */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.jpg"
              alt="باشرف"
              width={150}
              height={75}
              className="object-contain"
            />
          </div>

          {/* ────────────────── STEP 0: area ────────────────────── */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">برای کدام بخش درخواست می‌دی؟</h2>
              <p className="text-sm text-gray-400 mt-3 mb-8">یکی را انتخاب کن تا ادامه بدهیم</p>
              <div className="grid grid-cols-2 gap-4">
                {AREA_CARDS.map(({ key, icon: Icon, label, sub }) => {
                  const selected = area === key;
                  return (
                    <button
                      key={key}
                      onClick={() => { setArea(key); next(); }}
                      className={`border-2 rounded-2xl p-6 text-right cursor-pointer transition-all ${
                        selected
                          ? 'border-[#1a1a1a] bg-[#1a1a1a]'
                          : 'border-gray-200 bg-white hover:border-gray-400 hover:shadow-sm'
                      }`}
                    >
                      <Icon size={24} strokeWidth={1.5} className={selected ? 'text-white' : 'text-gray-800'} />
                      <p className={`text-base font-semibold mt-3 mb-1 ${selected ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                      <p className={`text-xs leading-relaxed ${selected ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ────────────────── STEP 1: personal info ───────────── */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">اطلاعات شما</h2>
              <p className="text-sm text-gray-400 mt-3 mb-8">لطفاً اطلاعات خود را کامل وارد کنید</p>

              <div className="space-y-5">
                {/* name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LBL}>نام</label>
                    <input value={firstName} onChange={e => setFirstName(e.target.value)} className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>نام خانوادگی</label>
                    <input value={lastName} onChange={e => setLastName(e.target.value)} className={INP} />
                  </div>
                </div>

                {/* phone */}
                <div>
                  <label className={LBL}>موبایل</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    dir="ltr" placeholder="09123456789"
                    className={`${INP} text-left`} />
                </div>

                {/* age + gender + city */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={LBL}>سن</label>
                    <input value={age} onChange={e => setAge(e.target.value.replace(/\D/g, ''))}
                      dir="ltr" className={INP} />
                  </div>
                  <div>
                    <label className={LBL}>جنسیت</label>
                    <select value={gender} onChange={e => setGender(e.target.value)}
                      className={`${INP} appearance-none`}>
                      <option value="">—</option>
                      <option value="male">آقا</option>
                      <option value="female">خانم</option>
                    </select>
                  </div>
                  <div>
                    <label className={LBL}>شهر</label>
                    <input value={city} onChange={e => setCity(e.target.value)} className={INP} />
                  </div>
                </div>

                {/* resume block */}
                <div className="border border-gray-100 rounded-2xl overflow-hidden">
                  {/* header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">رزومه</span>
                  </div>

                  {/* uploader — slide in when hasResume */}
                  <div className={`grid transition-all duration-300 ease-in-out ${hasResume ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                    <div className="overflow-hidden">
                      <div className="p-4 space-y-3">
                        <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors ${
                          file ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
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
                        <button
                          type="button"
                          onClick={() => { setHasResume(false); setFile(null); }}
                          className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 py-2 rounded-xl border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          <PenLine size={12} strokeWidth={2} />
                          رزومه ندارم، خودم توضیح می‌دهم
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* manual textarea — slide in when !hasResume */}
                  <div className={`grid transition-all duration-300 ease-in-out ${!hasResume ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'}`}>
                    <div className="overflow-hidden">
                      <div className="p-4 space-y-3">
                        <button
                          type="button"
                          onClick={() => { setHasResume(true); setManualInfo(''); }}
                          className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 transition-colors"
                        >
                          <ArrowRight size={12} strokeWidth={2} />
                          بازگشت به آپلود فایل
                        </button>
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">توضیحات و سوابق کاری شما</p>
                          <textarea
                            value={manualInfo} onChange={e => setManualInfo(e.target.value)} rows={4}
                            placeholder="سابقه کاری، مهارت‌ها، و هر چیزی که فکر می‌کنی مهم است را بنویس..."
                            className="w-full border border-gray-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600">{error}</div>}

                <div className="flex justify-between mt-8">
                  <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                    <ArrowRight size={16} strokeWidth={1.5} />
                    قبلی
                  </button>
                  <button onClick={() => { if (validateStep1()) next(); }}
                    className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 transition-colors">
                    بعدی
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ────────────────── STEP 2: questions ───────────────── */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">چند سوال کوتاه</h2>
              <p className="text-sm text-gray-400 mt-3 mb-8">پاسخ‌های صادقانه بهتر از پاسخ‌های «درست» است</p>

              {questions.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center text-sm text-gray-400">سوالی تنظیم نشده</div>
              ) : (
                <div className="space-y-8">
                  {questions.map((q, qi) => (
                    <div key={q.id}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-gray-100 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-600">
                          {qi + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{q.title}</span>
                      </div>
                      {q.prompt && <p className="text-xs text-gray-400 mb-4 mr-8">{q.prompt}</p>}
                      <textarea
                        value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                        rows={3}
                        className="w-full border border-gray-200 rounded-xl p-3.5 text-sm resize-none focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mt-4">{error}</div>}

              <div className="flex justify-between mt-8">
                <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                  <ArrowRight size={16} strokeWidth={1.5} />
                  قبلی
                </button>
                <button onClick={next}
                  className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 transition-colors">
                  بعدی
                </button>
              </div>
            </div>
          )}

          {/* ────────────────── STEP 3: review ──────────────────── */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">مرور نهایی</h2>
              <p className="text-sm text-gray-400 mt-3 mb-8">اطلاعات را بررسی کن و ثبت کن</p>

              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                {/* job info */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">اطلاعات شغلی</p>
                  <ReviewRow label="بخش" value={area === 'hall' ? 'سالن' : 'آشپزخانه'} />
                </div>
                {/* personal info */}
                <div className="px-5 py-4 border-b border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">اطلاعات شخصی</p>
                  <div className="space-y-2">
                    <ReviewRow label="نام"      value={`${firstName} ${lastName}`} />
                    <ReviewRow label="موبایل"   value={phone} />
                    <ReviewRow label="سن"        value={age} />
                    <ReviewRow label="جنسیت"    value={gender === 'male' ? 'آقا' : 'خانم'} />
                    <ReviewRow label="شهر"      value={city} />
                  </div>
                </div>
                {/* resume */}
                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-3">رزومه</p>
                  <ReviewRow label="نوع" value={hasResume ? (file?.name ?? '—') : 'اطلاعات دستی'} />
                </div>
              </div>

              {error && <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-600 mt-4">{error}</div>}

              <div className="flex justify-between mt-8">
                <button onClick={back} className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5 transition-colors">
                  <ArrowRight size={16} strokeWidth={1.5} />
                  قبلی
                </button>
                <button
                  onClick={submit} disabled={submitting}
                  className="bg-[#1a1a1a] text-white text-sm font-medium px-8 py-2.5 rounded-xl hover:bg-black/80 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {submitting
                    ? <Loader2 size={15} className="animate-spin" />
                    : <CheckCircle2 size={15} strokeWidth={1.5} />}
                  ثبت درخواست
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}
