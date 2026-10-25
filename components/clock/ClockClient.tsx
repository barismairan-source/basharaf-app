'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, LogOut, Wifi, WifiOff, RefreshCw, ScanFace } from 'lucide-react';
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import { Button, Card, CardBody, InlineNotice } from '@/components/ui';
import { formatTehranTime } from '@/lib/jalali';
import { optionsStillFresh, readLinkToken } from '@/lib/attendance-clock/client-utils';

interface Status {
  device: { employeeName: string } | null;
  state?: { kind: 'out' } | { kind: 'in' | 'stale'; since: string };
  faceId?: { required: boolean; registered: boolean };
  today?: Array<{ inAt: string; outAt: string | null }>;
  network: { ok: boolean; branchName: string | null; reason: string | null };
  ip: string | null;
  serverTime: string;
}

function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40; b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const NETWORK_MESSAGES: Record<string, string> = {
  OFF_NETWORK: 'به اینترنت مغازه وصل نیستید. وای‌فای مغازه را روشن کنید و VPN را خاموش کنید.',
  NOT_CONFIGURED: 'ثبت حضور با اینترنت مغازه هنوز راه‌اندازی نشده است. به مدیر بگویید.',
  IP_UNCERTAIN: 'نشانی اینترنت شما قابل تشخیص نیست. VPN را خاموش کنید و دوباره امتحان کنید.',
};

/** خطای پنجره‌ی Face ID مرورگر → پیام فارسی ساده. */
function faceIdErrorMessage(e: unknown): string {
  const name = e instanceof Error ? e.name : '';
  if (name === 'NotAllowedError' || name === 'AbortError') return 'تأیید Face ID / اثر انگشت انجام نشد یا لغو شد. دوباره امتحان کنید.';
  if (name === 'InvalidStateError') return 'Face ID روی این گوشی قبلاً برای حساب دیگری ثبت شده است. به مدیر بگویید.';
  if (name === 'SecurityError') return 'این صفحه باید با نشانی اصلی سایت باز شود.';
  return 'Face ID / اثر انگشت روی این گوشی کار نکرد. به مدیر بگویید.';
}

async function postJson(url: string, body?: unknown): Promise<{ ok: boolean; status: number; body: any }> {
  const res = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* بدنه‌ی خالی */ }
  return { ok: res.ok, status: res.status, body: json };
}

/** صفحه‌ی ثبت ورود/خروج روی گوشی پرسنل — همه‌ی تصمیم‌ها (زمان، شبکه، ترتیب، Face ID) در سرور گرفته می‌شود. */
export function ClockClient() {
  const router = useRouter();
  // توکن لینک بعد از # است (به سرور/لاگ نمی‌رسد)؛ فقط سمت مرورگر خوانده می‌شود.
  const [linkToken, setLinkToken] = useState<string | null | undefined>(undefined);
  // گزینه‌های Face ID از قبل گرفته می‌شوند تا پنجره‌ی Face ID بلافاصله بعد از لمس دکمه باز شود
  // (Safari اگر بین لمس و درخواست Face ID معطلی باشد ممکن است آن را رد کند).
  const authOpts = useRef<{ options: unknown; at: number } | null>(null);
  const regOpts = useRef<{ options: unknown; at: number } | null>(null);

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const [webauthnOk, setWebauthnOk] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [justActivated, setJustActivated] = useState(false);
  const activating = useRef(false);

  useEffect(() => {
    setLinkToken(readLinkToken(window.location.search, window.location.hash));
    setWebauthnOk(browserSupportsWebAuthn());
    setStandalone(Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      || window.matchMedia?.('(display-mode: standalone)').matches);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clock/status', { cache: 'no-store', credentials: 'same-origin' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'خطا در دریافت وضعیت');
      setStatus(body as Status);
      void prefetchFaceId(body as Status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'اتصال برقرار نشد. اینترنت را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  }, []);

  // وقتی کاربر به صفحه برمی‌گردد (مثلاً وای‌فای را روشن کرده) و هر دقیقه، وضعیت تازه شود.
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [load]);

  useEffect(() => {
    if (linkToken === undefined) return;
    if (!linkToken) { load(); return; }
    if (activating.current) return;
    activating.current = true;
    (async () => {
      try {
        const r = await postJson('/api/clock/activate', { token: linkToken });
        if (!r.ok) setError(r.body?.error ?? 'فعال‌سازی ناموفق بود');
        else if (r.body.alreadyActive) setDone(`این گوشی از قبل برای ${r.body.employeeName} فعال است. از این به بعد فقط همین صفحه را باز کنید؛ لینک لازم نیست.`);
        else { setDone(`این گوشی برای ${r.body.employeeName} فعال شد.`); setJustActivated(true); }
      } catch {
        setError('اتصال برقرار نشد. اینترنت را بررسی کنید و لینک را دوباره باز کنید.');
      } finally {
        // لینک یک‌بارمصرف از نوار نشانی پاک شود
        router.replace('/clock');
        load();
      }
    })();
  }, [linkToken, load, router]);

  async function prefetchFaceId(s: Status) {
    if (!s.device || !s.faceId?.required || !browserSupportsWebAuthn()) return;
    const now = Date.now();
    try {
      if (!s.faceId.registered) {
        if (optionsStillFresh(regOpts.current?.at ?? null, now)) return;
        const r = await postJson('/api/clock/passkey/register-options');
        regOpts.current = r.ok ? { options: r.body.options, at: now } : null;
      } else {
        if (optionsStillFresh(authOpts.current?.at ?? null, now)) return;
        const r = await postJson('/api/clock/passkey/auth-options');
        authOpts.current = r.ok && r.body?.required ? { options: r.body.options, at: now } : null;
      }
    } catch { /* هنگام لمس دوباره امتحان می‌شود */ }
  }

  /** گزینه‌ی تازه (از قبل گرفته‌شده)؛ اگر نبود یا کهنه بود، همین حالا بگیر. */
  async function takeOptions(kind: 'reg' | 'auth'): Promise<unknown | null> {
    const ref = kind === 'reg' ? regOpts : authOpts;
    const cached = ref.current;
    ref.current = null; // هر challenge یک‌بارمصرف است
    if (cached && optionsStillFresh(cached.at, Date.now())) return cached.options;
    const r = await postJson(kind === 'reg' ? '/api/clock/passkey/register-options' : '/api/clock/passkey/auth-options');
    if (!r.ok) { setError(r.body?.error ?? 'شروع Face ID ناموفق بود'); return null; }
    if (kind === 'auth' && !r.body?.required) return undefined;
    return r.body.options;
  }

  async function registerFaceId() {
    setBusy(true); setError(null); setDone(null);
    try {
      const options = await takeOptions('reg');
      if (!options) return;
      let response;
      try {
        response = await startRegistration({ optionsJSON: options as Parameters<typeof startRegistration>[0]['optionsJSON'] });
      } catch (e) {
        setError(faceIdErrorMessage(e)); return;
      }
      const fin = await postJson('/api/clock/passkey/register', { response });
      if (!fin.ok) setError(fin.body?.error ?? 'فعال‌سازی Face ID ناموفق بود');
      else setDone('Face ID / اثر انگشت فعال شد. از این به بعد هر ثبت با آن تأیید می‌شود.');
    } catch {
      setError('اتصال برقرار نشد. اینترنت را بررسی کنید.');
    } finally {
      setBusy(false);
      load();
    }
  }

  async function punch(action: 'clock_in' | 'clock_out') {
    setBusy(true); setError(null); setDone(null); setConfirmOut(false);
    const key = uuid();
    try {
      let assertion: unknown;
      if (status?.faceId?.required) {
        const options = await takeOptions('auth');
        if (options === null) return;
        if (options !== undefined) {
          try {
            assertion = await startAuthentication({ optionsJSON: options as Parameters<typeof startAuthentication>[0]['optionsJSON'] });
          } catch (e) {
            setError(faceIdErrorMessage(e)); return;
          }
        }
      }
      let r: Awaited<ReturnType<typeof postJson>> | null = null;
      // یک تلاش دوباره با همان کلید اگر شبکه قطع شد — سرور تکرار را یک ثبت حساب می‌کند.
      for (let attempt = 0; attempt < 2 && !r; attempt++) {
        try {
          r = await postJson('/api/clock/punch', { action, key, assertion });
        } catch {
          if (attempt === 1) throw new Error('network');
        }
      }
      if (!r!.ok) {
        setError(r!.body?.error ?? 'ثبت انجام نشد');
      } else {
        const time = formatTehranTime(r!.body.occurredAt);
        setDone(`${action === 'clock_in' ? 'ورود' : 'خروج'} شما ساعت ${time} در ${r!.body.branchName} ثبت شد.`);
      }
    } catch {
      setError('ثبت انجام نشد چون اتصال قطع شد. صفحه را تازه کنید و وضعیت را ببینید.');
    } finally {
      setBusy(false);
      load();
    }
  }

  const state = status?.state;
  const isIn = state?.kind === 'in';
  const needsFaceIdSetup = !!status?.device && !!status.faceId?.required && !status.faceId.registered;
  const punchDisabled = busy || !status?.network.ok || needsFaceIdSetup || (!!status?.faceId?.required && !webauthnOk);

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-[18px] font-semibold text-text">ثبت حضور</h1>
        {status?.device && <p className="text-[14px] text-muted">{status.device.employeeName}</p>}
      </div>

      {done && <InlineNotice tone="success">{done}</InlineNotice>}
      {justActivated && (
        <InlineNotice tone="info" title="دسترسی سریع از صفحه‌ی اصلی گوشی">
          آیفون: در Safari دکمه‌ی اشتراک‌گذاری (مربع با فلش) ← «Add to Home Screen».
          اندروید: در Chrome منوی ⋮ ← «Add to Home screen».
          از این به بعد همان آیکن را بزنید؛ لینک دیگر لازم نیست و ورود به حساب هم نمی‌خواهد.
        </InlineNotice>
      )}
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      {loading && !status ? (
        <p className="text-center text-[13px] text-muted">در حال بررسی…</p>
      ) : status && !status.device ? (
        <InlineNotice tone="warning" title="این گوشی فعال نشده است">
          {standalone
            ? 'این آیکن قدیمی است و حافظه‌اش از مرورگر جداست. آن را از صفحه‌ی اصلی حذف کنید، همین صفحه را در Safari (یا Chrome) باز کنید و دوباره «Add to Home Screen» بزنید.'
            : 'لینک شخصی ثبت حضور را از مدیر بگیرید و روی همین گوشی باز کنید.'}
        </InlineNotice>
      ) : status ? (
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center gap-2 text-[13px]" aria-live="polite">
              {status.network.ok ? (
                <><Wifi size={16} className="text-ok" aria-hidden /> <span>وصل به اینترنت {status.network.branchName}</span></>
              ) : (
                <><WifiOff size={16} className="text-danger" aria-hidden /> <span>{NETWORK_MESSAGES[status.network.reason ?? 'OFF_NETWORK']}</span></>
              )}
            </div>

            {status.faceId?.required && !webauthnOk && (
              <InlineNotice tone="warning">این گوشی یا مرورگر از Face ID / اثر انگشت پشتیبانی نمی‌کند. به مدیر بگویید.</InlineNotice>
            )}

            {needsFaceIdSetup ? (
              <div className="space-y-2">
                <p className="text-[13px] text-text">
                  یک بار Face ID یا اثر انگشت همین گوشی را فعال کنید. از این به بعد هر ورود و خروج با آن تأیید می‌شود.
                </p>
                <p className="text-[12px] text-muted">صورت یا اثر انگشت شما به سرور فرستاده نمی‌شود؛ فقط خود گوشی بررسی می‌کند.</p>
                <Button variant="primary" size="lg" className="w-full" icon={ScanFace} loading={busy}
                  disabled={busy || !webauthnOk} onClick={registerFaceId}>فعال‌سازی Face ID / اثر انگشت</Button>
              </div>
            ) : (
              <>
                <div className="text-[13px] text-muted">
                  {state?.kind === 'in' && <>از ساعت {formatTehranTime(state.since)} داخل هستید.</>}
                  {state?.kind === 'out' && <>الان ورود فعالی ندارید.</>}
                  {state?.kind === 'stale' && <>ورود قبلی شما ({formatTehranTime(state.since)}) ناقص مانده است؛ به مدیر بگویید. حالا می‌توانید ورود جدید بزنید.</>}
                </div>

                {isIn ? (
                  confirmOut ? (
                    <div className="space-y-2">
                      <p className="text-[13px] text-text">خروج ثبت شود؟</p>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="lg" className="flex-1" icon={LogOut} loading={busy}
                          disabled={punchDisabled} onClick={() => punch('clock_out')}>بله، خروج</Button>
                        <Button size="lg" className="flex-1" disabled={busy} onClick={() => setConfirmOut(false)}>نه</Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="destructive" size="lg" className="w-full" icon={LogOut}
                      disabled={punchDisabled} onClick={() => setConfirmOut(true)}>ثبت خروج</Button>
                  )
                ) : (
                  <Button variant="success" size="lg" className="w-full" icon={LogIn} loading={busy}
                    disabled={punchDisabled} onClick={() => punch('clock_in')}>ثبت ورود</Button>
                )}
                {status.faceId?.required && (
                  <p className="text-[11.5px] text-muted flex items-center gap-1"><ScanFace size={13} aria-hidden /> با Face ID / اثر انگشت تأیید می‌شود</p>
                )}
              </>
            )}

            {status.today && status.today.length > 0 && (
              <div className="border-t border-border pt-3">
                <p className="text-[12px] text-muted mb-1">امروز</p>
                <ul className="text-[13px] space-y-0.5">
                  {status.today.map((s) => (
                    <li key={s.inAt}>ورود {formatTehranTime(s.inAt)} — {s.outAt ? `خروج ${formatTehranTime(s.outAt)}` : 'هنوز داخل'}</li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="ghost" size="sm" className="w-full" icon={RefreshCw} disabled={loading || busy} onClick={load}>
              تازه‌سازی وضعیت
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {status && !status.network.ok && (
        <p className="text-center text-[11.5px] text-muted" dir="ltr">IP: {status.ip ?? '—'}</p>
      )}
      <p className="text-center text-[11.5px] text-muted">
        ساعت ثبت از سرور گرفته می‌شود، نه از گوشی. اگر نتوانستید ثبت کنید، به مدیر بگویید تا دستی ثبت کند.
      </p>
    </div>
  );
}
