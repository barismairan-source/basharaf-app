'use client';

import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Wifi, Link2, Trash2, Plus, Copy, MapPin } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Empty, Chip, JalaliDatePicker, InlineNotice, useConfirm } from '@/components/ui';
import { useAppStore } from '@/store';
import { getTodayJalali, jalaliToDate, formatTehranTime } from '@/lib/jalali';
import { useHrBranchFilter } from '@/lib/hr/branchFilterContext';
import { canDo } from '@/lib/auth/permissions';

interface Network { id: string; branchId: string; branchName: string; cidr: string; label: string | null }
interface Person { employeeId: string; fullName: string; branchId: string | null; deviceId: string | null; status: 'none' | 'pending' | 'expired' | 'active'; lastUsedAt: string | null }
interface Session {
  id: string; employeeName: string; branchName: string; inAt: string; outAt: string | null;
  status: 'present' | 'incomplete' | 'converted' | 'needs_review'; conversionError: string | null;
}

const SESSION_STATUS: Record<Session['status'], { label: string; tone: 'green' | 'amber' | 'red' | 'neutral' }> = {
  present: { label: 'حاضر', tone: 'green' },
  incomplete: { label: 'خروج ثبت نشده', tone: 'red' },
  converted: { label: 'پیش‌نویس حضور ساخته شد', tone: 'neutral' },
  needs_review: { label: 'نیاز به ثبت دستی', tone: 'amber' },
};

const LINK_STATUS: Record<Person['status'], string> = {
  none: 'بدون لینک', pending: 'لینک ساخته شده، هنوز باز نشده', expired: 'مهلت لینک تمام شده', active: 'گوشی فعال',
};

function jalaliToIso(jalali: string): string | null {
  const d = jalaliToDate(jalali);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: 'include', cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? 'خطا');
  return body as T;
}

/**
 * تب «ثبت با اینترنت مغازه» — ورود/خروج‌هایی که پرسنل با گوشی خودشان زده‌اند،
 * تنظیم IP ثابت هر شعبه و ساخت لینک شخصی. هر خروج یک «پیش‌نویس» در تب ثبت حضور
 * می‌سازد که مثل همیشه باید تأیید شود.
 */
export function ClockView() {
  const confirm = useConfirm();
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const showToast = useAppStore(s => s.showToast);
  const { branchId: sharedBranch } = useHrBranchFilter();
  const canSetup = canDo(user, 'hr.attendance.clockSetup');

  const [dateJalali, setDateJalali] = useState(getTodayJalali());
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [newBranch, setNewBranch] = useState(user?.assignedBranch ?? '');
  const [newCidr, setNewCidr] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [myIp, setMyIp] = useState<{ ip: string | null; reason: string | null; headers: { xRealIp: string | null; xForwardedFor: string | null } } | null>(null);
  const [issued, setIssued] = useState<{ name: string; url: string; qr: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateIso = jalaliToIso(dateJalali);
  const branchQs = sharedBranch ? `&branchId=${sharedBranch}` : '';

  const loadSessions = useCallback(() => {
    if (!dateIso) return;
    setSessions(null);
    api<{ sessions: Session[] }>(`/api/hr/clock/events?date=${dateIso}${branchQs}`)
      .then(b => setSessions(b.sessions)).catch(e => { setSessions([]); setError(e.message); });
  }, [dateIso, branchQs]);

  const loadSetup = useCallback(() => {
    api<{ networks: Network[] }>('/api/hr/clock/networks').then(b => setNetworks(b.networks)).catch(e => setError(e.message));
    api<{ people: Person[] }>(`/api/hr/clock/links?x=1${branchQs}`).then(b => setPeople(b.people)).catch(e => setError(e.message));
  }, [branchQs]);

  useEffect(() => { loadSessions(); }, [loadSessions]);
  useEffect(() => { loadSetup(); }, [loadSetup]);

  async function addNetwork() {
    setError(null);
    try {
      await api('/api/hr/clock/networks', { method: 'POST', body: JSON.stringify({ branchId: newBranch, cidr: newCidr, label: newLabel || null }) });
      setNewCidr(''); setNewLabel('');
      showToast('IP شعبه ثبت شد', 'success');
      loadSetup();
    } catch (e) { setError((e as Error).message); }
  }

  async function removeNetwork(n: Network) {
    const ok = await confirm({ title: 'غیرفعال‌کردن IP', description: `ثبت حضور از ${n.cidr} برای ${n.branchName} دیگر پذیرفته نمی‌شود.`, confirmLabel: 'غیرفعال کن', danger: true });
    if (!ok) return;
    try { await api(`/api/hr/clock/networks/${n.id}`, { method: 'DELETE' }); loadSetup(); } catch (e) { setError((e as Error).message); }
  }

  async function checkMyIp() {
    setError(null);
    try { setMyIp(await api('/api/hr/clock/my-ip')); } catch (e) { setError((e as Error).message); }
  }

  async function issueLink(p: Person) {
    if (p.deviceId) {
      const ok = await confirm({ title: 'لینک جدید', description: `لینک/گوشی فعلی ${p.fullName} لغو می‌شود و باید لینک جدید را روی گوشی باز کند.`, confirmLabel: 'بساز', danger: true });
      if (!ok) return;
    }
    setError(null);
    try {
      const b = await api<{ path: string; employeeName: string }>('/api/hr/clock/links', { method: 'POST', body: JSON.stringify({ employeeId: p.employeeId }) });
      const url = `${window.location.origin}${b.path}`;
      const qr = await QRCode.toDataURL(url, { margin: 1, width: 240 });
      setIssued({ name: b.employeeName, url, qr });
      loadSetup();
    } catch (e) { setError((e as Error).message); }
  }

  async function revokeLink(p: Person) {
    if (!p.deviceId) return;
    const ok = await confirm({ title: 'لغو لینک', description: `${p.fullName} دیگر با این گوشی نمی‌تواند حضور بزند.`, confirmLabel: 'لغو کن', danger: true });
    if (!ok) return;
    try { await api(`/api/hr/clock/links/${p.deviceId}`, { method: 'DELETE' }); loadSetup(); } catch (e) { setError((e as Error).message); }
  }

  const presentCount = sessions?.filter(s => s.status === 'present').length ?? 0;

  return (
    <div className="space-y-4">
      {error && <InlineNotice tone="danger" onDismiss={() => setError(null)}>{error}</InlineNotice>}

      <Card>
        <CardHeader title="ورود و خروج با اینترنت مغازه" sub={sessions ? `${presentCount} نفر الان داخل‌اند` : undefined}
          action={<div className="w-[150px]"><JalaliDatePicker value={dateJalali} onChange={setDateJalali} /></div>} />
        <CardBody>
          {sessions === null ? (
            <p className="text-[13px] text-muted">در حال بارگذاری…</p>
          ) : sessions.length === 0 ? (
            <Empty icon={Wifi} title="ثبتی برای این روز نیست" />
          ) : (
            <ul className="divide-y divide-border">
              {sessions.map(s => (
                <li key={s.id} className="py-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                  <span className="font-medium text-text min-w-[120px]">{s.employeeName}</span>
                  <span className="text-muted">{s.branchName}</span>
                  <span>ورود {formatTehranTime(s.inAt)}</span>
                  <span>{s.outAt ? `خروج ${formatTehranTime(s.outAt)}` : '—'}</span>
                  <Chip tone={SESSION_STATUS[s.status].tone}>{SESSION_STATUS[s.status].label}</Chip>
                  {s.conversionError && <span className="text-[12px] text-warn">{s.conversionError}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[12px] text-muted">
            هر خروج یک «پیش‌نویس» در تب «ثبت حضور» می‌سازد؛ تأیید و حقوق مثل قبل است. ردیف‌های «نیاز به ثبت دستی» یا «خروج ثبت نشده» را در تب «ثبت حضور» دستی ثبت کنید.
          </p>
        </CardBody>
      </Card>

      {canSetup && (
        <>
          <Card>
            <CardHeader title="IP ثابت شعبه‌ها" sub="فقط از این نشانی‌ها ثبت حضور پذیرفته می‌شود" />
            <CardBody className="space-y-4">
              {networks.length === 0 ? (
                <InlineNotice tone="warning">هنوز هیچ IPی ثبت نشده؛ تا وقتی ثبت نشود، پرسنل نمی‌توانند حضور بزنند.</InlineNotice>
              ) : (
                <ul className="divide-y divide-border">
                  {networks.map(n => (
                    <li key={n.id} className="py-2 flex items-center gap-3 text-[13px]">
                      <span className="font-medium min-w-[110px]">{n.branchName}</span>
                      <span dir="ltr" className="font-mono">{n.cidr}</span>
                      {n.label && <span className="text-muted">{n.label}</span>}
                      <Button size="sm" variant="danger" icon={Trash2} className="ms-auto" onClick={() => removeNetwork(n)}>غیرفعال</Button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" icon={MapPin} onClick={checkMyIp}>IP همین‌جا را نشان بده</Button>
                  <span className="text-[12px] text-muted">وقتی داخل مغازه و روی وای‌فای مغازه هستید بزنید.</span>
                </div>
                {myIp && (
                  <div className="text-[12.5px] space-y-1">
                    {myIp.ip ? (
                      <div className="flex items-center gap-2">
                        <span>IP شما از دید سرور:</span>
                        <span dir="ltr" className="font-mono font-medium">{myIp.ip}</span>
                        <Button size="sm" variant="ghost" onClick={() => setNewCidr(myIp.ip!)}>استفاده</Button>
                      </div>
                    ) : (
                      <InlineNotice tone="danger">IP قابل تشخیص نیست ({myIp.reason}). سرآیندها را برای پشتیبانی بفرستید.</InlineNotice>
                    )}
                    <div dir="ltr" className="font-mono text-[11px] text-muted break-all">
                      x-real-ip: {myIp.headers.xRealIp ?? '—'} · x-forwarded-for: {myIp.headers.xForwardedFor ?? '—'}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <Field label="شعبه">
                  <Select value={newBranch} onChange={e => setNewBranch(e.target.value)} disabled={user?.role !== 'SuperAdmin'}>
                    <option value="">انتخاب شعبه</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </Select>
                </Field>
                <Field label="IP ثابت" hint="مثل 5.6.7.8">
                  <Input dir="ltr" value={newCidr} onChange={e => setNewCidr(e.target.value)} placeholder="5.6.7.8" />
                </Field>
                <Field label="توضیح (اختیاری)">
                  <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="مثلاً خط اصلی" />
                </Field>
                <Button variant="primary" icon={Plus} disabled={!newBranch || !newCidr.trim()} onClick={addNetwork}>ثبت IP</Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="لینک شخصی پرسنل" sub="هر نفر یک بار لینک خودش را روی گوشی‌اش باز می‌کند؛ لینک فقط روی همان گوشی کار می‌کند" />
            <CardBody className="space-y-3">
              {issued && (
                <InlineNotice tone="info" title={`لینک ${issued.name}`} onDismiss={() => setIssued(null)}>
                  <div className="space-y-2">
                    <p>این لینک فقط یک بار و فقط روی گوشی خود او باز شود. بعد از بستن این پیام دیگر نمایش داده نمی‌شود.</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={issued.qr} alt={`کد QR لینک ثبت حضور ${issued.name}`} width={180} height={180} className="bg-white rounded" />
                    <div className="flex items-center gap-2">
                      <span dir="ltr" className="font-mono text-[11px] break-all">{issued.url}</span>
                      <Button size="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(issued.url).then(() => showToast('کپی شد', 'success'))}>کپی</Button>
                    </div>
                  </div>
                </InlineNotice>
              )}
              {people.length === 0 ? (
                <Empty icon={Link2} title="پرسنل فعالی پیدا نشد" />
              ) : (
                <ul className="divide-y divide-border">
                  {people.map(p => (
                    <li key={p.employeeId} className="py-2 flex flex-wrap items-center gap-3 text-[13px]">
                      <span className="font-medium min-w-[140px]">{p.fullName}</span>
                      <Chip tone={p.status === 'active' ? 'green' : p.status === 'none' ? 'neutral' : 'amber'}>{LINK_STATUS[p.status]}</Chip>
                      {p.lastUsedAt && <span className="text-[12px] text-muted">آخرین ثبت {formatTehranTime(p.lastUsedAt)}</span>}
                      <div className="ms-auto flex gap-2">
                        <Button size="sm" icon={Link2} onClick={() => issueLink(p)}>{p.deviceId ? 'لینک جدید' : 'ساخت لینک'}</Button>
                        {p.deviceId && <Button size="sm" variant="danger" icon={Trash2} onClick={() => revokeLink(p)}>لغو</Button>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
