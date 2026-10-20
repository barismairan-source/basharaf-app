'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LogIn, LogOut, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button, Card, CardBody, InlineNotice } from '@/components/ui';
import { formatTehranTime } from '@/lib/jalali';

interface Status {
  device: { employeeName: string } | null;
  state?: { kind: 'out' } | { kind: 'in' | 'stale'; since: string };
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

/** صفحه‌ی ثبت ورود/خروج روی گوشی پرسنل — همه‌ی تصمیم‌ها (زمان، شبکه، ترتیب) در سرور گرفته می‌شود. */
export function ClockClient() {
  const router = useRouter();
  const params = useSearchParams();
  const linkToken = params.get('t');

  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [confirmOut, setConfirmOut] = useState(false);
  const activating = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/clock/status', { cache: 'no-store', credentials: 'same-origin' });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? 'خطا در دریافت وضعیت');
      setStatus(body as Status);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'اتصال برقرار نشد. اینترنت را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!linkToken) { load(); return; }
    if (activating.current) return;
    activating.current = true;
    (async () => {
      try {
        const res = await fetch('/api/clock/activate', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin', body: JSON.stringify({ token: linkToken }),
        });
        const body = await res.json();
        if (!res.ok) setError(body?.error ?? 'فعال‌سازی ناموفق بود');
        else setDone(`این گوشی برای ${body.employeeName} فعال شد. این صفحه را به صفحه‌ی اصلی گوشی اضافه کنید.`);
      } catch {
        setError('اتصال برقرار نشد. اینترنت را بررسی کنید و لینک را دوباره باز کنید.');
      } finally {
        // لینک یک‌بارمصرف از نوار نشانی پاک شود
        router.replace('/clock');
        load();
      }
    })();
  }, [linkToken, load, router]);

  async function punch(action: 'clock_in' | 'clock_out') {
    setBusy(true); setError(null); setDone(null); setConfirmOut(false);
    const key = uuid();
    try {
      let res: Response | null = null;
      // یک تلاش دوباره با همان کلید اگر شبکه قطع شد — سرور تکرار را یک ثبت حساب می‌کند.
      for (let attempt = 0; attempt < 2 && !res; attempt++) {
        try {
          res = await fetch('/api/clock/punch', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin', body: JSON.stringify({ action, key }),
          });
        } catch {
          if (attempt === 1) throw new Error('network');
        }
      }
      const body = await res!.json();
      if (!res!.ok) {
        setError(body?.error ?? 'ثبت انجام نشد');
      } else {
        const time = formatTehranTime(body.occurredAt);
        setDone(`${action === 'clock_in' ? 'ورود' : 'خروج'} شما ساعت ${time} در ${body.branchName} ثبت شد.`);
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

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="text-center space-y-1">
        <h1 className="text-[18px] font-semibold text-text">ثبت حضور</h1>
        {status?.device && <p className="text-[14px] text-muted">{status.device.employeeName}</p>}
      </div>

      {done && <InlineNotice tone="success">{done}</InlineNotice>}
      {error && <InlineNotice tone="danger">{error}</InlineNotice>}

      {loading && !status ? (
        <p className="text-center text-[13px] text-muted">در حال بررسی…</p>
      ) : status && !status.device ? (
        <InlineNotice tone="warning" title="این گوشی فعال نشده است">
          لینک شخصی ثبت حضور را از مدیر بگیرید و روی همین گوشی باز کنید.
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
                      disabled={busy || !status.network.ok} onClick={() => punch('clock_out')}>بله، خروج</Button>
                    <Button size="lg" className="flex-1" disabled={busy} onClick={() => setConfirmOut(false)}>نه</Button>
                  </div>
                </div>
              ) : (
                <Button variant="destructive" size="lg" className="w-full" icon={LogOut}
                  disabled={busy || !status.network.ok} onClick={() => setConfirmOut(true)}>ثبت خروج</Button>
              )
            ) : (
              <Button variant="success" size="lg" className="w-full" icon={LogIn} loading={busy}
                disabled={busy || !status.network.ok} onClick={() => punch('clock_in')}>ثبت ورود</Button>
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
