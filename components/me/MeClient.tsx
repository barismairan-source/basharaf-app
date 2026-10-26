'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronRight, ChevronLeft, Lock, ScanFace, Timer, CalendarClock } from 'lucide-react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Button, Chip, InlineNotice } from '@/components/ui';
import { dateToJalali, getTodayJalali, formatTehranTime } from '@/lib/jalali';
import { fmt, toFa } from '@/lib/utils';
import { optionsStillFresh } from '@/lib/attendance-clock/client-utils';
import { formatMinutes, periodLabel, shiftPeriod, toLatinDigits } from '@/lib/staff-panel/pure';
import type { StatementBasis, StatementLine, StatementWeek } from '@/lib/staff-panel/statements';
import { BottomNav, Doodle, EmptyDoodle, HoursBar, SF, SectionTitle, SfCard, Stat, WeekDays, WeekLegend } from './parts';

type Tab = 'home' | 'attendance' | 'pay' | 'profile';

interface AttEntry { id: string; workDate: string; clockIn: string | null; clockOut: string | null; workedMinutes: number; overtimeMinutes: number; overtimeApproved: boolean; attendanceType: string; status: 'draft' | 'confirmed' | 'locked' }
interface AttSummary { confirmedMinutes: number; pendingMinutes: number; days: number }
interface Shift { id: string; workDate: string; startTime: string; endTime: string; crossesMidnight: boolean; plannedMinutes: number; note: string | null }
interface SlipRow { id: string; period: string; netPay: number; paid: boolean }
interface SlipDetail { id: string; period: string; paid: boolean; netPay: number; lines: Array<{ category: string; label: string; amount: number; employerShare: boolean }> }
interface StmtRow { id: string; period: string; model: 'hourly' | 'daily'; title: string; total: number }
interface StmtDetail { id: string; period: string; title: string; total: number; basisText: string[]; basis: StatementBasis; weeks: StatementWeek[]; lines: StatementLine[]; notes: string[] }
interface Profile { fullName: string; role: string; branch: string | null; joinDate: string | null; phone: string | null; nationalIdMasked?: string | null; ibanMasked?: string | null; insuranceStatus?: string; insuranceNumberMasked?: string | null; healthCardExpiry?: string | null; compensationType?: string; hourlyRate?: number | null; baseMonthlySalary?: number | null }
interface ClockStatus { state?: { kind: 'out' } | { kind: 'in' | 'stale'; since: string }; network?: { ok: boolean }; today?: Array<{ inAt: string; outAt: string | null }> }

const TYPE_LABEL: Record<string, string> = { present: 'حضور', absent: 'غیبت', paid_leave: 'مرخصی با حقوق', unpaid_leave: 'مرخصی بدون حقوق', sick_leave: 'مرخصی استعلاجی', holiday_work: 'کار در تعطیلی', off_day_work: 'کار در روز مرخصی' };
const INSURANCE: Record<string, string> = { insured: 'بیمه‌شده', uninsured: 'بدون بیمه' };
const NAV = [
  { value: 'home', label: 'خانه', doodle: 'table' },
  { value: 'attendance', label: 'حضور', doodle: 'notebook' },
  { value: 'pay', label: 'حقوق', doodle: 'sieve' },
  { value: 'profile', label: 'من', doodle: 'chair' },
] as const;

async function call<T = any>(url: string, init?: { method?: string; body?: unknown }): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(url, {
    method: init?.method ?? 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: init?.method && init.method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  let body: any = null;
  try { body = await res.json(); } catch { /* خالی */ }
  return { ok: res.ok, status: res.status, body };
}

function isoToJalali(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return dateToJalali(new Date(y!, (m ?? 1) - 1, d ?? 1, 12));
}
function weekday(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('fa-IR', { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)));
}
const faMinutes = (m: number) => toFa(formatMinutes(m));
function faceIdError(e: unknown): string {
  const n = e instanceof Error ? e.name : '';
  if (n === 'NotAllowedError' || n === 'AbortError') return 'تأیید Face ID / اثر انگشت انجام نشد یا لغو شد. دوباره امتحان کنید.';
  return 'Face ID / اثر انگشت روی این گوشی کار نکرد. به مدیر بگویید.';
}

export function MeClient() {
  const [tab, setTab] = useState<Tab>('home');
  const [noDevice, setNoDevice] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState(() => { const [y, m] = toLatinDigits(getTodayJalali()).split('/'); return `${y}-${m}`; });
  const currentPeriod = useRef(period).current;
  const [att, setAtt] = useState<{ entries: AttEntry[]; summary: AttSummary } | null>(null);
  const [monthSummary, setMonthSummary] = useState<AttSummary | null>(null);
  const [shifts, setShifts] = useState<{ shifts: Shift[]; today: string } | null>(null);
  const [clock, setClock] = useState<ClockStatus | null>(null);

  const [stmts, setStmts] = useState<StmtRow[] | null>(null);
  const [slips, setSlips] = useState<SlipRow[] | null>(null);
  const [stmt, setStmt] = useState<StmtDetail | null>(null);
  const [slip, setSlip] = useState<SlipDetail | null>(null);

  const [busy, setBusy] = useState(false);
  const [needsRegister, setNeedsRegister] = useState(false);
  const [webauthnOk, setWebauthnOk] = useState(true);
  const prefetched = useRef<{ options: unknown; at: number } | null>(null);

  useEffect(() => { setWebauthnOk(browserSupportsWebAuthn()); }, []);

  const loadProfile = useCallback(async () => {
    const r = await call<{ unlocked: boolean; profile: Profile; error?: string }>('/api/me/profile');
    if (r.status === 401) { setNoDevice(true); return; }
    if (r.ok) { setProfile(r.body.profile); setUnlocked(r.body.unlocked); } else setError(r.body?.error ?? 'خطا');
  }, []);
  useEffect(() => { void loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (noDevice) return;
    setAtt(null);
    call(`/api/me/attendance?period=${period}`).then((r) => {
      if (r.ok) { setAtt(r.body); if (period === currentPeriod) setMonthSummary(r.body.summary); } else if (r.status !== 401) setError(r.body?.error ?? 'خطا');
    });
  }, [period, noDevice, currentPeriod]);

  useEffect(() => {
    if (noDevice) return;
    call('/api/me/shifts').then((r) => { if (r.ok) setShifts(r.body); else if (r.status !== 401) setError(r.body?.error ?? 'خطا'); });
    call('/api/clock/status').then((r) => { if (r.ok) setClock(r.body); });
  }, [noDevice]);

  const loadPay = useCallback(async () => {
    const [a, b] = await Promise.all([call<{ statements: StmtRow[] }>('/api/me/statements'), call<{ payslips: SlipRow[] }>('/api/me/payslips')]);
    if (a.status === 403 || b.status === 403) { setUnlocked(false); setStmts(null); setSlips(null); return; }
    if (a.ok) setStmts(a.body.statements); else setError((a.body as any)?.error ?? 'خطا');
    if (b.ok) setSlips(b.body.payslips); else setError((b.body as any)?.error ?? 'خطا');
  }, []);
  useEffect(() => { if (tab === 'pay' && unlocked && stmts === null) void loadPay(); }, [tab, unlocked, stmts, loadPay]);

  // گزینه‌های Face ID از قبل گرفته شود تا پنجره‌ی Face ID بلافاصله بعد از لمس باز شود (Safari)
  useEffect(() => {
    if (unlocked || noDevice || (tab !== 'pay' && tab !== 'profile') || !webauthnOk) return;
    if (optionsStillFresh(prefetched.current?.at ?? null, Date.now())) return;
    call('/api/me/unlock/options', { method: 'POST' }).then((r) => {
      if (r.ok) prefetched.current = { options: r.body.options, at: Date.now() };
      else if (r.body?.code === 'PASSKEY_NOT_REGISTERED') setNeedsRegister(true);
    });
  }, [tab, unlocked, noDevice, webauthnOk]);

  async function unlock() {
    setBusy(true); setError(null);
    try {
      let options: unknown;
      const cached = prefetched.current; prefetched.current = null;
      if (cached && optionsStillFresh(cached.at, Date.now())) options = cached.options;
      else {
        const o = await call('/api/me/unlock/options', { method: 'POST' });
        if (!o.ok) { if (o.body?.code === 'PASSKEY_NOT_REGISTERED') setNeedsRegister(true); setError(o.body?.error ?? 'شروع تأیید ناموفق بود'); return; }
        options = o.body.options;
      }
      let assertion;
      try { assertion = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]['optionsJSON'] }); }
      catch (e) { setError(faceIdError(e)); return; }
      const r = await call('/api/me/unlock', { method: 'POST', body: { assertion } });
      if (!r.ok) { setError(r.body?.error ?? 'تأیید ناموفق بود'); return; }
      setUnlocked(true); setStmts(null); setSlips(null); await loadProfile();
    } catch { setError('اتصال برقرار نشد. اینترنت را بررسی کنید.'); }
    finally { setBusy(false); }
  }

  async function registerFaceId() {
    setBusy(true); setError(null);
    try {
      const o = await call('/api/clock/passkey/register-options', { method: 'POST' });
      if (!o.ok) { setError(o.body?.error ?? 'شروع فعال‌سازی ناموفق بود'); return; }
      let response;
      try { response = await startRegistration({ optionsJSON: o.body.options }); } catch (e) { setError(faceIdError(e)); return; }
      const r = await call('/api/clock/passkey/register', { method: 'POST', body: { response } });
      if (!r.ok) { setError(r.body?.error ?? 'فعال‌سازی ناموفق بود'); return; }
      setNeedsRegister(false);
      await unlock();
    } catch { setError('اتصال برقرار نشد. اینترنت را بررسی کنید.'); }
    finally { setBusy(false); }
  }

  async function lockAgain() {
    await call('/api/me/unlock', { method: 'DELETE' });
    setUnlocked(false); setStmts(null); setSlips(null); setStmt(null); setSlip(null); void loadProfile();
  }

  async function openStmt(id: string) {
    setError(null);
    const r = await call<{ statement: StmtDetail }>(`/api/me/statements/${id}`);
    if (r.status === 403) { setUnlocked(false); return; }
    if (r.ok) setStmt(r.body.statement); else setError((r.body as any)?.error ?? 'خطا');
  }
  async function openSlip(id: string) {
    setError(null);
    const r = await call<{ payslip: SlipDetail }>(`/api/me/payslips/${id}`);
    if (r.status === 403) { setUnlocked(false); return; }
    if (r.ok) setSlip(r.body.payslip); else setError((r.body as any)?.error ?? 'خطا');
  }

  if (noDevice) {
    return (
      <div className="mx-auto max-w-sm space-y-4 pt-10 text-center">
        <Image src="/safasity/wordmark.png" alt="صفاسیتی" width={600} height={213} priority className="mx-auto h-auto w-[130px]" />
        <Doodle name="chair" size={64} className="mx-auto" faint />
        <h1 className="sf-hand text-[20px]" style={{ color: SF.navy }}>پنل من</h1>
        <InlineNotice tone="warning" title="این گوشی هنوز فعال نشده">
          لینک شخصی را از مدیر بگیرید و روی همین گوشی باز کنید؛ بعد این پنل برای شما باز می‌شود.
        </InlineNotice>
      </div>
    );
  }

  const firstName = (profile?.fullName ?? '').split(' ')[0] ?? '';
  const today = shifts?.today;
  const todayShifts = shifts?.shifts.filter((s) => s.workDate === today) ?? [];
  const upcoming = shifts?.shifts.filter((s) => s.workDate !== today) ?? [];
  const inNow = clock?.state?.kind === 'in';

  const LockBox = (
    <SfCard className="space-y-3 text-center">
      <Doodle name="cat" size={96} className="mx-auto" faint />
      <p className="text-[13.5px]" style={{ color: SF.navy }}>این بخش اطلاعات شخصی شماست و با Face ID یا اثر انگشت باز می‌شود.</p>
      {!webauthnOk ? (
        <InlineNotice tone="warning">این گوشی یا مرورگر از Face ID / اثر انگشت پشتیبانی نمی‌کند. به مدیر بگویید.</InlineNotice>
      ) : needsRegister ? (
        <>
          <p className="text-[12px]" style={{ color: '#5E6676' }}>اول یک بار Face ID این گوشی را فعال کنید. صورت یا انگشت شما به سرور فرستاده نمی‌شود.</p>
          <Button variant="primary" size="lg" className="w-full" icon={ScanFace} loading={busy} disabled={busy} onClick={registerFaceId}>فعال‌سازی Face ID / اثر انگشت</Button>
        </>
      ) : (
        <Button variant="primary" size="lg" className="w-full" icon={ScanFace} loading={busy} disabled={busy} onClick={unlock}>باز کردن با Face ID</Button>
      )}
    </SfCard>
  );

  return (
    <div className="mx-auto w-full max-w-md space-y-4 pb-28">
      <header className="flex flex-col items-center gap-1 pt-2">
        <Image src="/safasity/wordmark.png" alt="صفاسیتی" width={600} height={213} priority className="h-auto w-[104px]" />
      </header>

      {error && <InlineNotice tone="danger" onDismiss={() => setError(null)}>{error}</InlineNotice>}

      {tab === 'home' && (
        <div className="space-y-4">
          <div className="px-1">
            <h1 className="sf-hand text-[24px] leading-snug" style={{ color: SF.navy }}>{firstName ? `سلام ${firstName}` : 'سلام'}</h1>
            <p className="text-[13px]" style={{ color: '#5E6676' }}>{[profile?.role, profile?.branch].filter(Boolean).join(' · ') || ' '}</p>
          </div>

          <SfCard tone="navy" className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] opacity-80">{today ? `${weekday(today)} ${toFa(isoToJalali(today))}` : 'امروز'}</p>
                <p className="sf-hand text-[19px]">
                  {inNow && clock?.state && 'since' in clock.state ? `از ساعت ${formatTehranTime(clock.state.since)} داخل هستید` : 'ورود فعالی ندارید'}
                </p>
              </div>
              <Doodle name="cutleryCream" size={34} className="opacity-90" />
            </div>
            {todayShifts.length > 0 ? (
              <ul className="space-y-1 text-[13px]">
                {todayShifts.map((s) => (
                  <li key={s.id} className="flex items-center gap-2"><CalendarClock size={15} aria-hidden />شیفت امروز: {toFa(s.startTime)} تا {toFa(s.endTime)}{s.crossesMidnight ? ' (فردا)' : ''}</li>
                ))}
              </ul>
            ) : <p className="text-[12.5px] opacity-80">امروز شیفتی برای شما ثبت نشده.</p>}
            <a href="/clock" className="flex h-12 items-center justify-center gap-2 rounded-xl text-[14px] font-semibold" style={{ background: SF.cream, color: SF.navy }}>
              <Timer size={17} aria-hidden />{inNow ? 'ثبت خروج' : 'ثبت ورود'}
            </a>
          </SfCard>

          <SfCard className="grid grid-cols-3 gap-2">
            <Stat value={toFa(monthSummary?.days ?? 0)} label="روز کاری این ماه" />
            <Stat value={faMinutes(monthSummary?.confirmedMinutes ?? 0)} label="تأییدشده" />
            <Stat value={faMinutes(monthSummary?.pendingMinutes ?? 0)} label="منتظر تأیید مدیر" />
          </SfCard>

          <div className="space-y-2">
            <SectionTitle>شیفت‌های پیش رو</SectionTitle>
            {shifts === null ? <p className="px-1 text-[13px] text-muted">در حال بارگذاری…</p> : upcoming.length === 0 ? (
              <SfCard><EmptyDoodle doodle="table" title="شیفت دیگری برای ۲ هفته‌ی آینده نیست" sub="برنامه‌ی هفته را از مدیر بپرسید." /></SfCard>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((s) => (
                  <li key={s.id}><SfCard className="flex items-center justify-between gap-3 !py-3">
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: SF.ink }}>{weekday(s.workDate)}</p>
                      <p className="text-[12px]" style={{ color: '#5E6676' }}>{toFa(isoToJalali(s.workDate))}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-[14px]" style={{ color: SF.navy }}>{toFa(s.startTime)} تا {toFa(s.endTime)}{s.crossesMidnight ? ' (فردا)' : ''}</p>
                      <p className="text-[11.5px]" style={{ color: '#5E6676' }}>{faMinutes(s.plannedMinutes)}</p>
                    </div>
                  </SfCard></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="space-y-3">
          <SectionTitle>حضور و غیاب</SectionTitle>
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="ماه قبل">ماه قبل</Button>
            <span className="sf-hand text-[17px]" style={{ color: SF.navy }}>{toFa(periodLabel(period))}</span>
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="ماه بعد">ماه بعد</Button>
          </div>
          {att === null ? <p className="text-center text-[13px] text-muted">در حال بارگذاری…</p> : (
            <>
              <SfCard className="grid grid-cols-3 gap-2">
                <Stat value={toFa(att.summary.days)} label="روز کاری" />
                <Stat value={faMinutes(att.summary.confirmedMinutes)} label="تأییدشده" />
                <Stat value={faMinutes(att.summary.pendingMinutes)} label="منتظر تأیید مدیر" />
              </SfCard>
              {att.entries.length === 0 ? <SfCard><EmptyDoodle doodle="notebook" title="در این ماه حضوری ثبت نشده" /></SfCard> : (
                <ul className="space-y-2">
                  {att.entries.map((e) => (
                    <li key={e.id}><SfCard className="flex flex-wrap items-center justify-between gap-2 !py-3">
                      <div>
                        <p className="text-[14px] font-medium" style={{ color: SF.ink }}>{weekday(e.workDate)}</p>
                        <p className="text-[12px]" style={{ color: '#5E6676' }}>{toFa(isoToJalali(e.workDate))}</p>
                      </div>
                      <div className="text-end">
                        {e.clockIn && <p className="text-[13.5px]" style={{ color: SF.navy }}>{toFa(e.clockIn)} تا {e.clockOut ? toFa(e.clockOut) : '—'}</p>}
                        <p className="text-[11.5px]" style={{ color: '#5E6676' }}>{faMinutes(e.workedMinutes)}</p>
                      </div>
                      <div className="flex w-full flex-wrap gap-1.5">
                        {e.attendanceType !== 'present' && <Chip>{TYPE_LABEL[e.attendanceType] ?? e.attendanceType}</Chip>}
                        <Chip tone={e.status === 'draft' ? 'amber' : 'green'}>{e.status === 'draft' ? 'منتظر تأیید مدیر' : 'تأییدشده'}</Chip>
                        {e.overtimeMinutes > 0 && <Chip tone={e.overtimeApproved ? 'green' : 'neutral'}>اضافه‌کاری {faMinutes(e.overtimeMinutes)}{e.overtimeApproved ? '' : ' (تأییدنشده)'}</Chip>}
                      </div>
                    </SfCard></li>
                  ))}
                </ul>
              )}
              <p className="px-1 text-[11.5px]" style={{ color: '#5E6676' }}>اگر ساعتی اشتباه است، به مدیر بگویید تا اصلاح کند.</p>
            </>
          )}
        </div>
      )}

      {tab === 'pay' && (
        <div className="space-y-3">
          {!unlocked ? (<><SectionTitle>حقوق من</SectionTitle>{LockBox}</>) : stmt ? (
            <StatementView s={stmt} onBack={() => setStmt(null)} />
          ) : slip ? (
            <PayslipView s={slip} onBack={() => setSlip(null)} />
          ) : (
            <>
              <SectionTitle aside={<Button size="sm" variant="ghost" icon={Lock} onClick={lockAgain}>قفل کردن</Button>}>حقوق من</SectionTitle>
              {stmts === null || slips === null ? <p className="text-center text-[13px] text-muted">در حال بارگذاری…</p> : stmts.length + slips.length === 0 ? (
                <SfCard><EmptyDoodle doodle="sieve" title="هنوز ریز حقوقی برای شما ثبت نشده" sub="بعد از ثبت یا تأیید مدیر اینجا نشان داده می‌شود." /></SfCard>
              ) : (
                <ul className="space-y-2">
                  {stmts.map((s) => (
                    <li key={s.id}><PayRow title={toFa(periodLabel(s.period))} sub="ریز کارکرد و محاسبه" amount={s.total} onClick={() => openStmt(s.id)} /></li>
                  ))}
                  {slips.filter((s) => !stmts.some((t) => t.period === s.period)).map((s) => (
                    <li key={s.id}><PayRow title={toFa(periodLabel(s.period))} sub={s.paid ? 'فیش پرداخت‌شده' : 'فیش تأییدشده'} amount={s.netPay} onClick={() => openSlip(s.id)} /></li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'profile' && (
        <div className="space-y-3">
          <SectionTitle>مشخصات من</SectionTitle>
          {!profile ? <p className="text-center text-[13px] text-muted">در حال بارگذاری…</p> : (
            <>
              <SfCard>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13.5px]">
                  <dt style={{ color: '#5E6676' }}>نام</dt><dd>{profile.fullName}</dd>
                  <dt style={{ color: '#5E6676' }}>سمت</dt><dd>{profile.role || '—'}</dd>
                  <dt style={{ color: '#5E6676' }}>شعبه</dt><dd>{profile.branch ?? '—'}</dd>
                  <dt style={{ color: '#5E6676' }}>شروع همکاری</dt><dd>{profile.joinDate ? toFa(isoToJalali(profile.joinDate)) : '—'}</dd>
                  <dt style={{ color: '#5E6676' }}>تلفن</dt><dd dir="ltr" className="text-start">{profile.phone ? toFa(profile.phone) : '—'}</dd>
                </dl>
              </SfCard>
              {!unlocked ? LockBox : (
                <SfCard>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5 text-[13.5px]">
                    <dt style={{ color: '#5E6676' }}>کد ملی</dt><dd dir="ltr" className="text-start">{profile.nationalIdMasked ?? '—'}</dd>
                    <dt style={{ color: '#5E6676' }}>شماره شبا</dt><dd dir="ltr" className="text-start">{profile.ibanMasked ?? '—'}</dd>
                    <dt style={{ color: '#5E6676' }}>بیمه</dt><dd>{INSURANCE[profile.insuranceStatus ?? ''] ?? '—'}{profile.insuranceNumberMasked ? ` (${profile.insuranceNumberMasked})` : ''}</dd>
                    <dt style={{ color: '#5E6676' }}>کارت بهداشت</dt><dd>{profile.healthCardExpiry ? `تا ${toFa(isoToJalali(profile.healthCardExpiry))}` : '—'}</dd>
                    <dt style={{ color: '#5E6676' }}>نوع دستمزد</dt><dd>{profile.compensationType === 'hourly' ? 'ساعتی' : 'ماهانه'}</dd>
                    {profile.hourlyRate ? (<><dt style={{ color: '#5E6676' }}>نرخ ساعتی</dt><dd>{fmt(profile.hourlyRate)} تومان</dd></>) : null}
                    {profile.baseMonthlySalary ? (<><dt style={{ color: '#5E6676' }}>حقوق ماهانه</dt><dd>{fmt(profile.baseMonthlySalary)} تومان</dd></>) : null}
                  </dl>
                  <p className="mt-3 text-[11.5px]" style={{ color: '#5E6676' }}>برای امنیت، فقط چند رقم آخر نشان داده می‌شود. اگر اطلاعاتی اشتباه است به مدیر بگویید.</p>
                  <div className="mt-2 text-center"><Button size="sm" variant="ghost" icon={Lock} onClick={lockAgain}>قفل کردن</Button></div>
                </SfCard>
              )}
            </>
          )}
          <p className="text-center text-[11.5px]" style={{ color: '#5E6676' }}>فقط اطلاعات خودتان را می‌بینید.</p>
        </div>
      )}

      <BottomNav value={tab} onChange={(t) => { setTab(t); window.scrollTo({ top: 0 }); }} items={NAV} />
    </div>
  );
}

function PayRow({ title, sub, amount, onClick }: { title: string; sub: string; amount: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="block w-full text-start">
      <SfCard className="flex items-center justify-between gap-3 !py-3.5">
        <div className="flex items-center gap-3">
          <Doodle name="sieve" size={22} />
          <div>
            <p className="sf-hand text-[16px]" style={{ color: SF.navy }}>{title}</p>
            <p className="text-[11.5px]" style={{ color: '#5E6676' }}>{sub}</p>
          </div>
        </div>
        <span className="text-[14.5px] font-semibold" style={{ color: SF.ink }}>{fmt(amount)} <span className="text-[11px] font-normal">تومان</span></span>
      </SfCard>
    </button>
  );
}

export function StatementView({ s, onBack }: { s: StmtDetail; onBack: () => void }) {
  const hourly = s.basis.model === 'hourly';
  const maxHours = Math.max(1, ...s.weeks.map((w) => w.hours ?? 0));
  const totalHours = s.weeks.reduce((a, w) => a + (w.hours ?? 0), 0);
  return (
    <div className="space-y-3">
      <Button size="sm" variant="ghost" icon={ChevronRight} onClick={onBack}>همه‌ی ماه‌ها</Button>
      <SfCard tone="navy" className="space-y-1 text-center">
        <p className="text-[12.5px] opacity-80">{toFa(periodLabel(s.period))}</p>
        <p className="sf-hand text-[30px] leading-tight">{fmt(s.total)} <span className="font-sans text-[14px]" style={{ fontFamily: 'var(--font-vazir), system-ui, sans-serif' }}>تومان</span></p>
        <p className="text-[12px] opacity-80">جمع این ماه</p>
      </SfCard>

      <SfCard tone="gold" className="space-y-2">
        <h3 className="sf-hand text-[16px]" style={{ color: SF.goldText }}>حقوق من بر چه اساسی است؟</h3>
        <ul className="list-disc space-y-1.5 ps-5 text-[13px] leading-6" style={{ color: SF.ink }}>
          {s.basisText.map((t, i) => <li key={i}>{toFa(t)}</li>)}
        </ul>
      </SfCard>

      <SfCard className="space-y-2">
        <h3 className="sf-hand text-[16px]" style={{ color: SF.navy }}>محاسبه‌ی این ماه</h3>
        <ul className="divide-y text-[13.5px]" style={{ borderColor: '#E6DFD1' }}>
          {hourly && (
            <li className="flex justify-between gap-3 py-2"><span>ساعت کار این ماه</span><span>{toFa(totalHours)} ساعت</span></li>
          )}
          {s.lines.map((l, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2">
              <span>{toFa(l.label)}{l.detail && <span className="block text-[11.5px]" style={{ color: '#5E6676' }}>{toFa(l.detail)}</span>}</span>
              <span className="whitespace-nowrap font-medium" style={{ color: l.kind === 'deduction' ? SF.burgundy : SF.ink }}>{l.kind === 'deduction' ? '−' : ''}{fmt(l.amount)}</span>
            </li>
          ))}
          <li className="flex justify-between gap-3 py-2 text-[14.5px] font-semibold"><span>جمع</span><span>{fmt(s.total)} تومان</span></li>
        </ul>
        {s.notes.map((n, i) => <p key={i} className="text-[12px]" style={{ color: SF.goldText }}>{toFa(n)}</p>)}
      </SfCard>

      {s.weeks.length > 0 && (
        <SfCard className="space-y-3">
          <h3 className="sf-hand text-[16px]" style={{ color: SF.navy }}>ریز کارکرد هفته‌به‌هفته</h3>
          <WeekLegend />
          <ul className="space-y-4">
            {s.weeks.map((w, i) => (
              <li key={i} className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[13px] font-medium" style={{ color: SF.ink }}>{toFa(w.label.replace('-', ' تا '))}</span>
                  <span className="text-[13px]" style={{ color: SF.navy }}>{toFa(w.hours ?? 0)} ساعت</span>
                </div>
                <HoursBar value={w.hours ?? 0} max={maxHours} />
                {w.days && <WeekDays days={w.days} />}
              </li>
            ))}
          </ul>
          <p className="text-[11.5px]" style={{ color: '#5E6676' }}>اگر روزی یا ساعتی اشتباه است، به مدیر بگویید.</p>
        </SfCard>
      )}
    </div>
  );
}

export function PayslipView({ s, onBack }: { s: SlipDetail; onBack: () => void }) {
  return (
    <div className="space-y-3">
      <Button size="sm" variant="ghost" icon={ChevronRight} onClick={onBack}>همه‌ی ماه‌ها</Button>
      <SfCard tone="navy" className="space-y-1 text-center">
        <p className="text-[12.5px] opacity-80">{toFa(periodLabel(s.period))} · {s.paid ? 'پرداخت‌شده' : 'تأییدشده'}</p>
        <p className="sf-hand text-[30px] leading-tight">{fmt(s.netPay)} <span className="text-[14px]" style={{ fontFamily: 'var(--font-vazir), system-ui, sans-serif' }}>تومان</span></p>
        <p className="text-[12px] opacity-80">خالص پرداختی</p>
      </SfCard>
      <SfCard>
        <ul className="divide-y text-[13.5px]" style={{ borderColor: '#E6DFD1' }}>
          {s.lines.map((l, i) => {
            const minus = !l.employerShare && (l.category === 'deduction' || l.category === 'statutory');
            return (
              <li key={i} className="flex justify-between gap-3 py-2" style={{ color: l.employerShare ? '#7A8090' : undefined }}>
                <span>{l.label}{l.employerShare ? ' (از حقوق شما کم نمی‌شود)' : ''}</span>
                <span style={{ color: minus ? SF.burgundy : undefined }}>{minus ? '−' : ''}{fmt(l.amount)}</span>
              </li>
            );
          })}
        </ul>
      </SfCard>
    </div>
  );
}
