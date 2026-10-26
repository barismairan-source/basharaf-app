'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Clock, CalendarDays, Wallet, UserRound, ScanFace, Lock, ChevronRight, ChevronLeft, Timer } from 'lucide-react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Button, Card, CardBody, Chip, Empty, InlineNotice, Tabs, TabPanel } from '@/components/ui';
import { dateToJalali, getTodayJalali } from '@/lib/jalali';
import { fmt } from '@/lib/utils';
import { optionsStillFresh } from '@/lib/attendance-clock/client-utils';
import { formatMinutes, periodLabel, shiftPeriod, toLatinDigits } from '@/lib/staff-panel/pure';

type Tab = 'attendance' | 'shifts' | 'pay' | 'profile';

interface AttEntry { id: string; workDate: string; clockIn: string | null; clockOut: string | null; workedMinutes: number; overtimeMinutes: number; overtimeApproved: boolean; attendanceType: string; status: 'draft' | 'confirmed' | 'locked' }
interface Shift { id: string; workDate: string; startTime: string; endTime: string; crossesMidnight: boolean; plannedMinutes: number; breakMinutes: number; note: string | null }
interface SlipRow { id: string; period: string; grossEarnings: number; totalDeductions: number; netPay: number; paid: boolean }
interface SlipDetail { id: string; period: string; paid: boolean; grossEarnings: number; totalDeductions: number; netPay: number; lines: Array<{ category: string; label: string; amount: number; employerShare: boolean }> }
interface Profile { fullName: string; role: string; branch: string | null; joinDate: string | null; phone: string | null; nationalIdMasked?: string | null; ibanMasked?: string | null; insuranceStatus?: string; insuranceNumberMasked?: string | null; healthCardExpiry?: string | null; compensationType?: string; hourlyRate?: number | null; baseMonthlySalary?: number | null }

const TYPE_LABEL: Record<string, string> = { present: 'حضور', absent: 'غیبت', paid_leave: 'مرخصی با حقوق', unpaid_leave: 'مرخصی بدون حقوق', sick_leave: 'مرخصی استعلاجی', holiday_work: 'کار در تعطیلی', off_day_work: 'کار در روز مرخصی' };
const INSURANCE: Record<string, string> = { insured: 'بیمه‌شده', uninsured: 'بدون بیمه' };

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
function faceIdError(e: unknown): string {
  const n = e instanceof Error ? e.name : '';
  if (n === 'NotAllowedError' || n === 'AbortError') return 'تأیید Face ID / اثر انگشت انجام نشد یا لغو شد. دوباره امتحان کنید.';
  return 'Face ID / اثر انگشت روی این گوشی کار نکرد. به مدیر بگویید.';
}

export function MeClient() {
  const [tab, setTab] = useState<Tab>('attendance');
  const [noDevice, setNoDevice] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [period, setPeriod] = useState(() => { const [y, m] = toLatinDigits(getTodayJalali()).split('/'); return `${y}-${m}`; });
  const [att, setAtt] = useState<{ entries: AttEntry[]; summary: { confirmedMinutes: number; pendingMinutes: number; days: number } } | null>(null);
  const [shifts, setShifts] = useState<{ shifts: Shift[]; today: string } | null>(null);
  const [slips, setSlips] = useState<SlipRow[] | null>(null);
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
    call(`/api/me/attendance?period=${period}`).then((r) => { if (r.ok) setAtt(r.body); else if (r.status !== 401) setError(r.body?.error ?? 'خطا'); });
  }, [period, noDevice]);

  useEffect(() => {
    if (noDevice || tab !== 'shifts' || shifts) return;
    call('/api/me/shifts').then((r) => { if (r.ok) setShifts(r.body); else if (r.status !== 401) setError(r.body?.error ?? 'خطا'); });
  }, [tab, noDevice, shifts]);

  const loadSlips = useCallback(async () => {
    const r = await call<{ payslips: SlipRow[] }>('/api/me/payslips');
    if (r.status === 403) { setUnlocked(false); setSlips(null); return; }
    if (r.ok) setSlips(r.body.payslips); else setError((r.body as any)?.error ?? 'خطا');
  }, []);
  useEffect(() => { if (tab === 'pay' && unlocked && !slips) void loadSlips(); }, [tab, unlocked, slips, loadSlips]);

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
      setUnlocked(true); setSlips(null); await loadProfile();
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
    setUnlocked(false); setSlips(null); setSlip(null); void loadProfile();
  }

  async function openSlip(id: string) {
    setError(null);
    const r = await call<{ payslip: SlipDetail }>(`/api/me/payslips/${id}`);
    if (r.status === 403) { setUnlocked(false); setSlips(null); return; }
    if (r.ok) setSlip(r.body.payslip); else setError((r.body as any)?.error ?? 'خطا');
  }

  if (noDevice) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-center text-[18px] font-semibold text-text">پنل من</h1>
        <InlineNotice tone="warning" title="این گوشی فعال نشده است">
          لینک شخصی را از مدیر بگیرید و روی همین گوشی باز کنید؛ بعد این پنل برای شما باز می‌شود.
        </InlineNotice>
      </div>
    );
  }

  const LockBox = (
    <Card>
      <CardBody className="space-y-3 text-center">
        <Lock size={22} className="mx-auto text-muted" aria-hidden />
        <p className="text-[13px] text-text">این بخش اطلاعات شخصی شماست و با Face ID یا اثر انگشت باز می‌شود.</p>
        {!webauthnOk ? (
          <InlineNotice tone="warning">این گوشی یا مرورگر از Face ID / اثر انگشت پشتیبانی نمی‌کند. به مدیر بگویید.</InlineNotice>
        ) : needsRegister ? (
          <>
            <p className="text-[12px] text-muted">اول یک بار Face ID این گوشی را فعال کنید. صورت یا انگشت شما به سرور فرستاده نمی‌شود.</p>
            <Button variant="primary" size="lg" className="w-full" icon={ScanFace} loading={busy} disabled={busy} onClick={registerFaceId}>فعال‌سازی Face ID / اثر انگشت</Button>
          </>
        ) : (
          <Button variant="primary" size="lg" className="w-full" icon={ScanFace} loading={busy} disabled={busy} onClick={unlock}>باز کردن با Face ID</Button>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="text-center space-y-0.5">
        <h1 className="text-[18px] font-semibold text-text">{profile ? profile.fullName : 'پنل من'}</h1>
        {profile && <p className="text-[13px] text-muted">{[profile.role, profile.branch].filter(Boolean).join(' · ')}</p>}
        <a href="/clock" className="inline-flex items-center gap-1 text-[12.5px] text-accent underline underline-offset-2"><Timer size={13} aria-hidden />ثبت ورود و خروج</a>
      </div>

      {error && <InlineNotice tone="danger" onDismiss={() => setError(null)}>{error}</InlineNotice>}

      <Tabs value={tab} onChange={setTab} aria-label="بخش‌های پنل من"
        items={[{ value: 'attendance', label: 'حضور' }, { value: 'shifts', label: 'شیفت' }, { value: 'pay', label: 'حقوق' }, { value: 'profile', label: 'مشخصات' }]} />

      <TabPanel value="attendance" active={tab === 'attendance'}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="ماه قبل">ماه قبل</Button>
            <span className="text-[14px] font-medium">{periodLabel(period)}</span>
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="ماه بعد">ماه بعد</Button>
          </div>
          {att === null ? <p className="text-center text-[13px] text-muted">در حال بارگذاری…</p> : (
            <>
              <Card><CardBody className="grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[17px] font-semibold">{fmt(att.summary.days)}</div><div className="text-[11.5px] text-muted">روز کاری</div></div>
                <div><div className="text-[13px] font-semibold">{formatMinutes(att.summary.confirmedMinutes)}</div><div className="text-[11.5px] text-muted">تأییدشده</div></div>
                <div><div className="text-[13px] font-semibold">{formatMinutes(att.summary.pendingMinutes)}</div><div className="text-[11.5px] text-muted">در انتظار تأیید مدیر</div></div>
              </CardBody></Card>
              {att.entries.length === 0 ? <Empty icon={Clock} title="در این ماه حضوری ثبت نشده" /> : (
                <ul className="space-y-2">
                  {att.entries.map((e) => (
                    <li key={e.id}><Card><CardBody className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                      <span className="font-medium min-w-[110px]">{weekday(e.workDate)} {isoToJalali(e.workDate)}</span>
                      {e.clockIn && <span>{e.clockIn} تا {e.clockOut ?? '—'}</span>}
                      <span className="text-muted">{formatMinutes(e.workedMinutes)}</span>
                      {e.attendanceType !== 'present' && <Chip>{TYPE_LABEL[e.attendanceType] ?? e.attendanceType}</Chip>}
                      <Chip tone={e.status === 'draft' ? 'amber' : 'green'}>{e.status === 'draft' ? 'در انتظار تأیید' : 'تأییدشده'}</Chip>
                      {e.overtimeMinutes > 0 && <Chip tone={e.overtimeApproved ? 'green' : 'neutral'}>اضافه‌کاری {formatMinutes(e.overtimeMinutes)}{e.overtimeApproved ? '' : ' (تأییدنشده)'}</Chip>}
                    </CardBody></Card></li>
                  ))}
                </ul>
              )}
              <p className="text-[11.5px] text-muted">اگر ساعتی اشتباه است، به مدیر بگویید تا اصلاح کند.</p>
            </>
          )}
        </div>
      </TabPanel>

      <TabPanel value="shifts" active={tab === 'shifts'}>
        {shifts === null ? <p className="text-center text-[13px] text-muted">در حال بارگذاری…</p> : shifts.shifts.length === 0 ? (
          <Empty icon={CalendarDays} title="برای ۲ هفته‌ی آینده شیفتی ثبت نشده" sub="اگر برنامه‌ی هفته را نمی‌دانید از مدیر بپرسید." />
        ) : (
          <ul className="space-y-2">
            {shifts.shifts.map((s) => (
              <li key={s.id}><Card><CardBody className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                <span className="font-medium min-w-[110px]">{weekday(s.workDate)} {isoToJalali(s.workDate)}</span>
                <span>{s.startTime} تا {s.endTime}{s.crossesMidnight ? ' (فردا)' : ''}</span>
                <span className="text-muted">{formatMinutes(s.plannedMinutes)}</span>
                {s.workDate === shifts.today && <Chip tone="green">امروز</Chip>}
                {s.note && <span className="text-[12px] text-muted">{s.note}</span>}
              </CardBody></Card></li>
            ))}
          </ul>
        )}
      </TabPanel>

      <TabPanel value="pay" active={tab === 'pay'}>
        {!unlocked ? LockBox : slip ? (
          <div className="space-y-3">
            <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => setSlip(null)}>همه‌ی فیش‌ها</Button>
            <Card><CardBody className="space-y-3">
              <div className="flex items-center justify-between"><span className="text-[15px] font-semibold">فیش {periodLabel(slip.period)}</span><Chip tone={slip.paid ? 'green' : 'amber'}>{slip.paid ? 'پرداخت‌شده' : 'تأییدشده'}</Chip></div>
              <ul className="divide-y divide-border text-[13px]">
                {slip.lines.map((l, i) => {
                  const minus = !l.employerShare && (l.category === 'deduction' || l.category === 'statutory');
                  return (
                    <li key={i} className={`flex justify-between gap-3 py-1.5 ${l.employerShare ? 'text-muted' : ''}`}>
                      <span>{l.label}{l.employerShare ? ' (از حقوق شما کم نمی‌شود)' : ''}</span>
                      <span className={minus ? 'text-danger' : ''}>{minus ? '−' : ''}{fmt(l.amount)} تومان</span>
                    </li>
                  );
                })}
              </ul>
              <div className="flex justify-between border-t border-border pt-2 text-[14px] font-semibold"><span>خالص پرداختی</span><span>{fmt(slip.netPay)} تومان</span></div>
            </CardBody></Card>
          </div>
        ) : slips === null ? <p className="text-center text-[13px] text-muted">در حال بارگذاری…</p> : slips.length === 0 ? (
          <Empty icon={Wallet} title="هنوز فیشی برای شما تأیید نشده" sub="فیش بعد از تأیید مدیر اینجا نشان داده می‌شود." />
        ) : (
          <div className="space-y-2">
            {slips.map((s) => (
              <button key={s.id} type="button" onClick={() => openSlip(s.id)} className="block w-full text-start">
                <Card><CardBody className="flex items-center justify-between text-[13px]">
                  <span className="font-medium">{periodLabel(s.period)}</span>
                  <span className="flex items-center gap-2"><span>{fmt(s.netPay)} تومان</span><Chip tone={s.paid ? 'green' : 'amber'}>{s.paid ? 'پرداخت‌شده' : 'تأییدشده'}</Chip></span>
                </CardBody></Card>
              </button>
            ))}
          </div>
        )}
        {unlocked && <div className="mt-3 text-center"><Button size="sm" variant="ghost" icon={Lock} onClick={lockAgain}>قفل کردن</Button></div>}
      </TabPanel>

      <TabPanel value="profile" active={tab === 'profile'}>
        {!profile ? <p className="text-center text-[13px] text-muted">در حال بارگذاری…</p> : (
          <div className="space-y-3">
            <Card><CardBody>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
                <dt className="text-muted">نام</dt><dd>{profile.fullName}</dd>
                <dt className="text-muted">سمت</dt><dd>{profile.role || '—'}</dd>
                <dt className="text-muted">شعبه</dt><dd>{profile.branch ?? '—'}</dd>
                <dt className="text-muted">شروع همکاری</dt><dd>{profile.joinDate ? isoToJalali(profile.joinDate) : '—'}</dd>
                <dt className="text-muted">تلفن</dt><dd dir="ltr" className="text-start">{profile.phone ?? '—'}</dd>
              </dl>
            </CardBody></Card>
            {!unlocked ? LockBox : (
              <Card><CardBody>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[13px]">
                  <dt className="text-muted">کد ملی</dt><dd dir="ltr" className="text-start">{profile.nationalIdMasked ?? '—'}</dd>
                  <dt className="text-muted">شماره شبا</dt><dd dir="ltr" className="text-start">{profile.ibanMasked ?? '—'}</dd>
                  <dt className="text-muted">بیمه</dt><dd>{INSURANCE[profile.insuranceStatus ?? ''] ?? '—'}{profile.insuranceNumberMasked ? ` (${profile.insuranceNumberMasked})` : ''}</dd>
                  <dt className="text-muted">اعتبار کارت بهداشت</dt><dd>{profile.healthCardExpiry ? isoToJalali(profile.healthCardExpiry) : '—'}</dd>
                  <dt className="text-muted">نوع دستمزد</dt><dd>{profile.compensationType === 'hourly' ? 'ساعتی' : 'ماهانه'}</dd>
                  {profile.hourlyRate ? (<><dt className="text-muted">نرخ ساعتی</dt><dd>{fmt(profile.hourlyRate)} تومان</dd></>) : null}
                  {profile.baseMonthlySalary ? (<><dt className="text-muted">حقوق ماهانه</dt><dd>{fmt(profile.baseMonthlySalary)} تومان</dd></>) : null}
                </dl>
                <p className="mt-3 text-[11.5px] text-muted">برای امنیت، فقط چند رقم آخر نشان داده می‌شود. اگر اطلاعاتی اشتباه است به مدیر بگویید.</p>
                <div className="mt-2 text-center"><Button size="sm" variant="ghost" icon={Lock} onClick={lockAgain}>قفل کردن</Button></div>
              </CardBody></Card>
            )}
          </div>
        )}
      </TabPanel>

      <p className="text-center text-[11.5px] text-muted"><UserRound size={12} className="inline" aria-hidden /> فقط اطلاعات خودتان را می‌بینید.</p>
    </div>
  );
}
