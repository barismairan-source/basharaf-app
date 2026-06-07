'use client';

import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, X, ChevronRight, ChevronLeft, UtensilsCrossed, Users } from 'lucide-react';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from '@/components/ui';
import type { ScreeningQuestion } from '@/lib/recruitment/questions';
import { cn } from '@/lib/utils';

type Area = 'hall' | 'kitchen';

export default function ApplyPage() {
  const [step, setStep] = useState(0);          // 0=بخش 1=اطلاعات+رزومه 2=سوالات 3=مرور
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // داده‌ها
  const [area, setArea] = useState<Area | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [hasResume, setHasResume] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [manualInfo, setManualInfo] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // سوالات پویا
  const [questions, setQuestions] = useState<ScreeningQuestion[]>([]);
  useEffect(() => {
    fetch('/api/recruitment/questions', { cache: 'no-store' })
      .then(r => r.json()).then(d => setQuestions(d.questions ?? [])).catch(() => setQuestions([]));
  }, []);

  function next() { setError(''); setStep(s => s + 1); }
  function back() { setError(''); setStep(s => Math.max(0, s - 1)); }

  function validateStep1(): boolean {
    if (firstName.trim().length < 2 || lastName.trim().length < 2) { setError('نام و نام خانوادگی را کامل وارد کنید'); return false; }
    if (!/^09\d{9}$/.test(phone.replace(/\D/g, ''))) { setError('شماره موبایل معتبر نیست (مثل 09123456789)'); return false; }
    if (!age || +age < 14 || +age > 80) { setError('سن معتبر نیست'); return false; }
    if (!gender) { setError('جنسیت را انتخاب کنید'); return false; }
    if (city.trim().length < 2) { setError('محل سکونت را وارد کنید'); return false; }
    if (!hasResume && manualInfo.trim().length < 10) { setError('اطلاعات خودتان را بنویسید (حداقل یک خط)'); return false; }
    if (hasResume && !file) { setError('فایل رزومه را انتخاب کنید یا «رزومه ندارم» را بزنید'); return false; }
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
        const u = await up.json();
        resumeUrl = u.url; resumePath = u.path;
      }
      const res = await fetch('/api/recruitment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, phone: phone.replace(/\D/g, ''),
          age: +age, gender, city, area,
          hasResume, resumeUrl, resumePath,
          manualInfo: hasResume ? null : manualInfo,
          answers,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error ?? 'ثبت درخواست ناموفق بود');
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا');
    } finally { setSubmitting(false); }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-sm w-full"><CardBody>
          <div className="text-center py-6">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
            <h1 className="text-[18px] font-medium text-stone-900">درخواستت ثبت شد</h1>
            <p className="text-[13px] text-stone-500 mt-2">ممنون که وقت گذاشتی. اگر مناسب باشی، باهات تماس می‌گیریم.</p>
          </div>
        </CardBody></Card>
      </div>
    );
  }

  const STEPS = ['بخش', 'اطلاعات', 'سوال‌ها', 'مرور'];

  return (
    <div className="min-h-screen p-4 flex items-start justify-center">
      <div className="w-full max-w-md mt-6">
        {/* progress */}
        <div className="flex items-center gap-1.5 mb-5">
          {STEPS.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={cn('h-1 rounded-full transition-colors', i <= step ? 'bg-stone-900' : 'bg-stone-200')} />
              <div className={cn('text-[10px] mt-1 text-center', i === step ? 'text-stone-900 font-medium' : 'text-stone-400')}>{label}</div>
            </div>
          ))}
        </div>

        <Card><CardBody>
          {/* ── قدم ۰: انتخاب بخش ── */}
          {step === 0 && (
            <div>
              <h2 className="text-[16px] font-medium text-stone-900 mb-1">برای کدام بخش درخواست می‌دهی؟</h2>
              <p className="text-[12px] text-stone-500 mb-4">یکی را انتخاب کن تا ادامه دهیم.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => { setArea('hall'); setStep(1); }}
                  className={cn('border rounded-xl p-5 flex flex-col items-center gap-2 transition-colors', area === 'hall' ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300')}>
                  <Users size={28} strokeWidth={1.5} className="text-stone-700" />
                  <span className="text-[14px] font-medium text-stone-800">سالن</span>
                </button>
                <button onClick={() => { setArea('kitchen'); setStep(1); }}
                  className={cn('border rounded-xl p-5 flex flex-col items-center gap-2 transition-colors', area === 'kitchen' ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300')}>
                  <UtensilsCrossed size={28} strokeWidth={1.5} className="text-stone-700" />
                  <span className="text-[14px] font-medium text-stone-800">آشپزخانه</span>
                </button>
              </div>
            </div>
          )}

          {/* ── قدم ۱: اطلاعات + رزومه ── */}
          {step === 1 && (
            <div className="space-y-3">
              <h2 className="text-[16px] font-medium text-stone-900 mb-1">اطلاعات شما</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field label="نام"><Input value={firstName} onChange={e => setFirstName(e.target.value)} /></Field>
                <Field label="نام خانوادگی"><Input value={lastName} onChange={e => setLastName(e.target.value)} /></Field>
              </div>
              <Field label="موبایل"><Input value={phone} onChange={e => setPhone(e.target.value)} dir="ltr" placeholder="09123456789" /></Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="سن"><Input value={age} onChange={e => setAge(e.target.value.replace(/\D/g, ''))} dir="ltr" /></Field>
                <Field label="جنسیت">
                  <Select value={gender} onChange={e => setGender(e.target.value)}>
                    <option value="">—</option><option value="male">آقا</option><option value="female">خانم</option>
                  </Select>
                </Field>
                <Field label="شهر"><Input value={city} onChange={e => setCity(e.target.value)} /></Field>
              </div>

              {/* رزومه */}
              <div className="border-t border-stone-100 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12.5px] font-medium text-stone-700">رزومه</span>
                  <button onClick={() => { setHasResume(!hasResume); setFile(null); }} className="text-[11.5px] text-stone-500 underline">
                    {hasResume ? 'رزومه ندارم' : 'رزومه دارم'}
                  </button>
                </div>
                {hasResume ? (
                  <label className="flex items-center gap-2 border border-dashed border-stone-300 rounded-lg p-3 cursor-pointer hover:border-stone-400">
                    <Upload size={16} className="text-stone-400" />
                    <span className="text-[12px] text-stone-500 flex-1 truncate">{file ? file.name : 'فایل PDF، عکس یا Word'}</span>
                    {file && <X size={14} className="text-stone-400" onClick={e => { e.preventDefault(); setFile(null); }} />}
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  </label>
                ) : (
                  <Textarea value={manualInfo} onChange={e => setManualInfo(e.target.value)} rows={4}
                    placeholder="سابقه کاری، مهارت‌ها، و هر چیزی که فکر می‌کنی مهم است را بنویس..." />
                )}
              </div>

              {error && <div className="text-[12px] text-rose-600">{error}</div>}
              <div className="flex justify-between pt-2">
                <Button variant="default" icon={ChevronRight} onClick={back}>قبلی</Button>
                <Button variant="primary" onClick={() => { if (validateStep1()) next(); }}>بعدی</Button>
              </div>
            </div>
          )}

          {/* ── قدم ۲: سوال‌ها ── */}
          {step === 2 && (
            <div className="space-y-3">
              <h2 className="text-[16px] font-medium text-stone-900 mb-1">چند سوال کوتاه</h2>
              {questions.map(q => (
                <Field key={q.id} label={q.title}>
                  <div className="text-[11.5px] text-stone-500 mb-1.5">{q.prompt}</div>
                  <Textarea value={answers[q.id] ?? ''} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} rows={3} />
                </Field>
              ))}
              {error && <div className="text-[12px] text-rose-600">{error}</div>}
              <div className="flex justify-between pt-2">
                <Button variant="default" icon={ChevronRight} onClick={back}>قبلی</Button>
                <Button variant="primary" onClick={next}>بعدی</Button>
              </div>
            </div>
          )}

          {/* ── قدم ۳: مرور و نهایی ── */}
          {step === 3 && (
            <div className="space-y-3">
              <h2 className="text-[16px] font-medium text-stone-900 mb-1">مرور و ثبت</h2>
              <div className="bg-stone-50 rounded-lg p-3 text-[12.5px] space-y-1.5">
                <Row k="بخش" v={area === 'hall' ? 'سالن' : 'آشپزخانه'} />
                <Row k="نام" v={`${firstName} ${lastName}`} />
                <Row k="موبایل" v={phone} />
                <Row k="سن / جنسیت" v={`${age} · ${gender === 'male' ? 'آقا' : 'خانم'}`} />
                <Row k="شهر" v={city} />
                <Row k="رزومه" v={hasResume ? (file?.name ?? '—') : 'اطلاعات دستی'} />
              </div>
              {error && <div className="text-[12px] text-rose-600">{error}</div>}
              <div className="flex justify-between pt-2">
                <Button variant="default" icon={ChevronRight} onClick={back}>قبلی</Button>
                <Button variant="primary" onClick={submit} loading={submitting} icon={CheckCircle2}>ثبت نهایی</Button>
              </div>
            </div>
          )}
        </CardBody></Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-stone-400">{k}</span><span className="text-stone-800">{v}</span></div>;
}
