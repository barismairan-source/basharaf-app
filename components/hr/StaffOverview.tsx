'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, Users, Search, Link2 } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Chip, Empty, Input, InlineNotice, Select, Sheet } from '@/components/ui';
import { useHrBranchFilter } from '@/lib/hr/branchFilterContext';
import { getTodayJalali, formatTehranTime } from '@/lib/jalali';
import { fmt, toFa } from '@/lib/utils';
import { formatMinutes, periodLabel, shiftPeriod, toLatinDigits } from '@/lib/staff-panel/pure';
import { StatementView } from '@/components/me/MeClient';
import type { StatementBasis, StatementLine, StatementWeek } from '@/lib/staff-panel/statements';

interface Person {
  id: string; fullName: string; section: string | null; compensationType: string;
  panel: 'none' | 'pending' | 'active'; faceId: 'on' | 'off' | 'exempt'; lastUsedAt: string | null;
  inNow: boolean; inSince: string | null;
  attendance: { confirmedMinutes: number; pendingMinutes: number; days: number };
  hourlyRate?: number | null; baseMonthlySalary?: number | null;
  statement?: { id: string; total: number; model: string } | null;
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

  useEffect(() => {
    setData(null); setError(null);
    const qs = new URLSearchParams({ period, ...(branchId ? { branchId } : {}) });
    fetch(`/api/hr/staff-overview?${qs}`, { credentials: 'include', cache: 'no-store' })
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw new Error(b?.error ?? 'خطا'); setData(b); })
      .catch((e) => setError(e.message));
  }, [period, branchId]);

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
