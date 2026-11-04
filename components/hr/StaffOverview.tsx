'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, Users, Search, Link2, Settings2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Chip, Empty, Field as FormField, Input, InlineNotice, Select, Sheet, Switch } from '@/components/ui';
import { useHrBranchFilter } from '@/lib/hr/branchFilterContext';
import { useAppStore } from '@/store';
import { canDo } from '@/lib/auth/permissions';
import { getTodayJalali, formatTehranTime } from '@/lib/jalali';
import { fmt, toFa } from '@/lib/utils';
import { formatMinutes, periodLabel, shiftPeriod, toLatinDigits } from '@/lib/staff-panel/pure';
import { PaymentHistory, StatementView } from '@/components/me/MeClient';
import type { StatementBasis, StatementLine, StatementWeek } from '@/lib/staff-panel/statements';
import type { PaymentItem } from '@/lib/staff-panel/payments';

interface Person {
  id: string; fullName: string; section: string | null; compensationType: string;
  panel: 'none' | 'pending' | 'active'; faceId: 'on' | 'off' | 'exempt'; lastUsedAt: string | null;
  inNow: boolean; inSince: string | null;
  attendance: { confirmedMinutes: number; pendingMinutes: number; days: number };
  hourlyRate?: number | null; baseMonthlySalary?: number | null;
  statement?: { id: string; total: number; model: string } | null;
  payments?: { count: number; paidInPeriod: number };
}
interface StmtDetail { id: string; period: string; title: string; total: number; basisText: string[]; basis: StatementBasis; weeks: StatementWeek[]; lines: StatementLine[]; notes: string[] }

const PANEL: Record<Person['panel'], { label: string; tone: 'green' | 'amber' | 'neutral' }> = {
  active: { label: 'پنل فعال', tone: 'green' }, pending: { label: 'لینک باز نشده', tone: 'amber' }, none: { label: 'بدون لینک', tone: 'neutral' },
};
const fa = (m: number) => toFa(formatMinutes(m));

/**
 * «پرسنل و حقوق» — نمای مدیر از همه‌ی بچه‌ها: بخش، الان داخل است یا نه، حضور ماه، وضعیت پنل/Face ID و
 * (با مجوز مشاهده‌ی حقوق) نرخ و جمع ریز کارکرد ماه. با کلیک روی هر نفر همان صفحه‌ای را می‌بینید که خودش در پنلش می‌بیند.
 */
export function StaffOverview() {
  const { branchId } = useHrBranchFilter();
  const [period, setPeriod] = useState(() => { const [y, m] = toLatinDigits(getTodayJalali()).split('/'); return `${y}-${m}`; });
  const [data, setData] = useState<{ canSeePay: boolean; people: Person[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [section, setSection] = useState('');
  const [open, setOpen] = useState<{ name: string; s: StmtDetail } | null>(null);
  const [paid, setPaid] = useState<{ name: string; items: PaymentItem[] } | null>(null);
  const user = useAppStore((st) => st.user);
  const canManagePay = canDo(user, 'hr.compensation.manage');
  const [payFor, setPayFor] = useState<Person | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setData(null); setError(null);
    const qs = new URLSearchParams({ period, ...(branchId ? { branchId } : {}) });
    fetch(`/api/hr/staff-overview?${qs}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b?.error ?? 'خطا'); setData(b); })
      .catch((e) => setError(e.message));
  }, [period, branchId, reload]);

  const sections = useMemo(() => [...new Set((data?.people ?? []).map((p) => p.section).filter(Boolean))] as string[], [data]);
  const shown = useMemo(() => (data?.people ?? []).filter((p) =>
    (!section || p.section === section) && (!q.trim() || p.fullName.includes(q.trim()))), [data, q, section]);
  const totals = useMemo(() => ({
    inNow: shown.filter((p) => p.inNow).length,
    active: shown.filter((p) => p.panel === 'active').length,
    pay: shown.reduce((a, p) => a + (p.statement?.total ?? 0), 0),
    withStatement: shown.filter((p) => p.statement).length,
  }), [shown]);

  async function openStatement(p: Person) {
    if (!p.statement) return;
    const r = await fetch(`/api/hr/staff-overview/${p.statement.id}`, { credentials: 'include', cache: 'no-store' });
    const b = await r.json();
    if (!r.ok) { setError(b?.error ?? 'خطا'); return; }
    setOpen({ name: b.fullName, s: b.statement });
  }

  async function openPayments(p: Person) {
    const r = await fetch(`/api/hr/staff-payments?employeeId=${p.id}`, { credentials: 'include', cache: 'no-store' });
    const b = await r.json();
    if (!r.ok) { setError(b?.error ?? 'خطا'); return; }
    setPaid({ name: b.fullName, items: b.payments });
  }

  return (
    <div className="space-y-4">
      {error && <InlineNotice tone="danger" onDismiss={() => setError(null)}>{error}</InlineNotice>}

      <Card>
        <CardHeader title="پرسنل و حقوق" sub="همه‌ی بچه‌ها در یک نگاه؛ با کلیک روی هر نفر، ریز کارکرد و حقوقش را همان‌طور که خودش می‌بیند ببینید" />
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="ghost" icon={ChevronRight} onClick={() => setPeriod(shiftPeriod(period, -1))}>ماه قبل</Button>
            <span className="text-[14px] font-medium min-w-[90px] text-center">{toFa(periodLabel(period))}</span>
            <Button size="sm" variant="ghost" icon={ChevronLeft} onClick={() => setPeriod(shiftPeriod(period, 1))}>ماه بعد</Button>
            <div className="ms-auto flex gap-2">
              <Select value={section} onChange={(e) => setSection(e.target.value)} aria-label="بخش" className="max-w-[140px]">
                <option value="">همه‌ی بخش‌ها</option>
                {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی نام" icon={Search} className="max-w-[170px]" aria-label="جستجوی نام" />
            </div>
          </div>
          {data && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Summary label="پرسنل" value={toFa(shown.length)} />
              <Summary label="الان داخل" value={toFa(totals.inNow)} />
              <Summary label="پنل فعال" value={`${toFa(totals.active)} از ${toFa(shown.length)}`} />
              {data.canSeePay && <Summary label={`جمع حقوق ${toFa(periodLabel(period))}`} value={totals.withStatement ? `${fmt(totals.pay)} ت` : '—'} hint={totals.withStatement ? `${toFa(totals.withStatement)} نفر ثبت‌شده` : 'ریز کارکردی ثبت نشده'} />}
            </div>
          )}
        </CardBody>
      </Card>

      {data === null ? <p className="text-[13px] text-muted">در حال بارگذاری…</p> : shown.length === 0 ? (
        <Empty icon={Users} title="کسی پیدا نشد" />
      ) : (
        <ul className="space-y-2">
          {shown.map((p) => (
            <li key={p.id}>
              <Card>
                <CardBody className="space-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-[14px] font-medium">{p.fullName}</span>
                    {p.section && <Chip>{p.section}</Chip>}
                    {p.inNow && <Chip tone="green">داخل از {formatTehranTime(p.inSince!)}</Chip>}
                    <Chip tone={PANEL[p.panel].tone}>{PANEL[p.panel].label}</Chip>
                    {p.panel === 'active' && <Chip tone={p.faceId === 'on' ? 'green' : 'amber'}>{p.faceId === 'on' ? 'Face ID فعال' : p.faceId === 'exempt' ? 'بدون Face ID (استثنا)' : 'Face ID فعال نشده'}</Chip>}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-4">
                    <Field k="روز کاری" v={toFa(p.attendance.days)} />
                    <Field k="ساعت تأییدشده" v={fa(p.attendance.confirmedMinutes)} />
                    <Field k="منتظر تأیید" v={fa(p.attendance.pendingMinutes)} warn={p.attendance.pendingMinutes > 0} />
                    {data.canSeePay && (
                      <Field k="دستمزد" v={p.hourlyRate ? `${fmt(p.hourlyRate)} ت/ساعت` : p.baseMonthlySalary ? `${fmt(p.baseMonthlySalary)} ت/ماه` : 'ثبت نشده'} warn={!p.hourlyRate && !p.baseMonthlySalary} />
                    )}
                  </div>
                  {data.canSeePay && (
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                      <span className="text-[12.5px] text-muted">{p.statement ? `ریز کارکرد ${toFa(periodLabel(period))}` : 'ریز کارکرد این ماه ثبت نشده'}</span>
                      {p.statement && (
                        <Button size="sm" onClick={() => openStatement(p)}>{fmt(p.statement.total)} تومان — جزئیات</Button>
                      )}
                    </div>
                  )}
                  {canManagePay && (
                    <div className="flex justify-end">
                      <Button size="sm" variant="ghost" icon={Settings2} onClick={() => setPayFor(p)}>تنظیم حقوق</Button>
                    </div>
                  )}
                  {data.canSeePay && p.payments && p.payments.count > 0 && (
                    <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
                      <span className="text-[12.5px] text-muted">
                        {p.payments.paidInPeriod > 0 ? `واریز بابت ${toFa(periodLabel(period))}: ${fmt(p.payments.paidInPeriod)} تومان` : `واریزی بابت ${toFa(periodLabel(period))} ثبت نشده`}
                      </span>
                      <Button size="sm" variant="ghost" onClick={() => openPayments(p)}>تاریخچه‌ی واریز ({toFa(p.payments.count)})</Button>
                    </div>
                  )}
                </CardBody>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[12px] text-muted flex items-center gap-1">
        <Link2 size={13} aria-hidden /> لینک شخصی، IP شعبه و Face ID از «زمان و حضور ← ورود با مودم» مدیریت می‌شود.
      </p>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name} maxHeight="92vh">
        {open && (
          <div className="safasity-root rounded-xl px-3 py-3">
            <StatementView s={open.s} onBack={() => setOpen(null)} />
          </div>
        )}
      </Sheet>

      <Sheet open={!!payFor} onClose={() => setPayFor(null)} title={payFor ? `تنظیم حقوق ${payFor.fullName}` : undefined} maxHeight="92vh">
        {payFor && <PaySettingsForm person={payFor} onDone={() => { setPayFor(null); setReload((n) => n + 1); }} />}
      </Sheet>

      <Sheet open={!!paid} onClose={() => setPaid(null)} title={paid ? `واریزی‌های ${paid.name}` : undefined} maxHeight="92vh">
        {paid && (
          <div className="safasity-root rounded-xl px-3 py-3">
            <PaymentHistory items={paid.items} />
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** فرم تنظیم حقوق یک نفر: همان چیزی که خودش در پنلش می‌بیند. */
function PaySettingsForm({ person, onDone }: { person: Person; onDone: () => void }) {
  const showToast = useAppStore((st) => st.showToast);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [payTitle, setPayTitle] = useState('');
  const [model, setModel] = useState<'hourly' | 'daily'>(person.section === 'سالن' ? 'daily' : 'hourly');
  const [salary, setSalary] = useState('');
  const [standardHours, setStandardHours] = useState('208');
  const [multiplier, setMultiplier] = useState('1.4');
  const [baseDays, setBaseDays] = useState('24');
  const [bonusEvery, setBonusEvery] = useState('6');
  const [fullSalary, setFullSalary] = useState(false);

  useEffect(() => {
    fetch(`/api/hr/staff-pay?employeeId=${person.id}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b?.error ?? 'خطا');
        setPayTitle(b.payTitle ?? '');
        if (b.basis) {
          setModel(b.basis.model); setSalary(String(b.basis.agreedSalary));
          if (b.basis.standardHours) setStandardHours(String(b.basis.standardHours));
          if (b.basis.overtimeMultiplier) setMultiplier(String(b.basis.overtimeMultiplier));
          if (b.basis.baseDays) setBaseDays(String(b.basis.baseDays));
          if (b.basis.bonusEveryShifts) setBonusEvery(String(b.basis.bonusEveryShifts));
          setFullSalary(!!b.basis.fullSalary);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [person.id]);

  const salaryN = Number(salary.replace(/[,\s]/g, ''));
  const hourly = model === 'hourly';
  const rate = hourly && salaryN > 0 && Number(standardHours) > 0 ? Math.round(salaryN / Number(standardHours)) : 0;
  const daily = !hourly && salaryN > 0 && Number(baseDays) > 0 ? Math.round(salaryN / Number(baseDays)) : 0;

  async function save() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/hr/staff-pay', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: person.id, payTitle: payTitle || null, model, agreedSalary: salaryN,
          standardHours: Number(standardHours), overtimeMultiplier: Number(multiplier),
          baseDays: Number(baseDays), bonusEveryShifts: Number(bonusEvery), fullSalary,
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b?.error ?? 'خطا');
      showToast('حقوق ذخیره شد', 'success');
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  if (!loaded) return <p className="text-[13px] text-muted">در حال بارگذاری…</p>;
  return (
    <div className="space-y-3 pb-2">
      {error && <InlineNotice tone="danger" onDismiss={() => setError(null)}>{error}</InlineNotice>}
      <FormField label="عنوان حقوق (اختیاری)" hint="در پنل خودش دیده می‌شود">
        <Input value={payTitle} onChange={(e) => setPayTitle(e.target.value)} placeholder="مثلاً حقوق پایه‌ی آشپزخانه" />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="روش محاسبه">
          <Select value={model} onChange={(e) => setModel(e.target.value as 'hourly' | 'daily')}>
            <option value="hourly">ساعتی (حقوق ثابت + اضافه‌کاری)</option>
            <option value="daily">روزانه</option>
          </Select>
        </FormField>
        <FormField label={hourly ? 'حقوق ثابت ماهانه (تومان)' : 'حقوق توافقی ماهانه (تومان)'}>
          <Input dir="ltr" inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="30000000" />
        </FormField>
      </div>
      {hourly ? (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="ساعت مبنای ماه"><Input dir="ltr" inputMode="numeric" value={standardHours} onChange={(e) => setStandardHours(e.target.value)} /></FormField>
          <FormField label="ضریب اضافه‌کاری"><Input dir="ltr" inputMode="decimal" value={multiplier} onChange={(e) => setMultiplier(e.target.value)} /></FormField>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="روز مبنای ماه"><Input dir="ltr" inputMode="numeric" value={baseDays} onChange={(e) => setBaseDays(e.target.value)} /></FormField>
            <FormField label="هر چند شیفت، یک روز تشویقی"><Input dir="ltr" inputMode="numeric" value={bonusEvery} onChange={(e) => setBonusEvery(e.target.value)} /></FormField>
          </div>
          <div className="flex items-center gap-3 text-[13px]">
            <Switch checked={fullSalary} onCheckedChange={setFullSalary} aria-label="حقوق کامل" />
            <span>حقوق کامل ماه، بدون توجه به روز حضور</span>
          </div>
        </>
      )}
      {salaryN > 0 && (
        <div className="rounded-lg border border-border bg-bg px-3 py-2 text-[12.5px] space-y-0.5">
          {hourly ? (
            <>
              <p>نرخ هر ساعت: <b>{fmt(rate)}</b> تومان</p>
              <p>هر ساعت اضافه‌کاری: <b>{fmt(Math.round(rate * Number(multiplier)))}</b> تومان</p>
            </>
          ) : fullSalary ? <p>هر ماه <b>{fmt(salaryN)}</b> تومان</p> : <p>مبلغ هر روز: <b>{fmt(daily)}</b> تومان</p>}
        </div>
      )}
      <p className="text-[11.5px] text-muted">از امروز در پنل این نفر اعمال می‌شود. ریز کارکرد ماه‌های گذشته، فیش‌ها و حسابداری عوض نمی‌شوند.</p>
      <Button variant="primary" className="w-full" disabled={busy || !(salaryN > 0)} onClick={save}>{busy ? 'در حال ذخیره…' : 'ذخیره'}</Button>
    </div>
  );
}

function Summary({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg px-3 py-2">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className="text-[15px] font-semibold">{value}</div>
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

function Field({ k, v, warn }: { k: string; v: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-2 sm:block">
      <span className="text-muted">{k}</span>
      <span className={warn ? 'text-warn' : ''}> {v}</span>
    </div>
  );
}
