'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserPlus, Users, CalendarX2, ClipboardList, FileClock, ShieldAlert,
  Clock3, Timer, FileWarning, BadgeDollarSign, Calculator, CheckCircle2,
} from 'lucide-react';
import { Card, CardBody, MetricGrid, MetricCard, InlineNotice } from '@/components/ui';
import { useAppStore } from '@/store';
import { useHrBranchFilter } from '@/lib/hr/branchFilterContext';

interface HrOverview {
  period: string;
  actionNeeded: {
    newApplicants: number;
    applicantsAwaitingReview: number;
    peopleWithoutShiftToday: number;
    unrecordedAttendanceToday: number;
    draftAttendanceCount: number;
    suspiciousAttendanceDays: number;
    unscheduledAttendanceCount: number;
    unapprovedOvertimeCount: number;
    documentsExpiringSoon: number;
    employeesWithInvalidRate: number;
    payrollNotReady: boolean;
    payrollReadyToAct: boolean;
  };
  metrics: {
    activeEmployeeCount: number;
    hourlyEmployeeCount: number;
    newApplicantsCount: number;
    plannedMinutesToday: number;
    workedMinutesToday: number;
    unapprovedOvertimeCount: number;
    payrollReady: boolean;
    payrollRunStatus: string | null;
  };
}

interface ActionCard {
  key: string;
  count: number;
  label: string;
  href: string;
  icon: typeof UserPlus;
  tone?: 'warning' | 'danger';
}

function fmtHours(minutes: number): string {
  return `${Math.round((minutes / 60) * 10) / 10} ساعت`;
}

export default function HrOverviewPage() {
  const user = useAppStore(s => s.user);
  const { branchId } = useHrBranchFilter();
  const [data, setData] = useState<HrOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const qs = branchId ? `?branchId=${branchId}` : '';
    fetch(`/api/hr/overview${qs}`, { credentials: 'include', cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .finally(() => setLoading(false));
  }, [branchId]);

  if (!user) return null;

  const a = data?.actionNeeded;
  const allCards: ActionCard[] = a ? [
    { key: 'newApplicants', count: a.newApplicants, label: 'متقاضی جدید', href: '/hr/recruitment?status=new', icon: UserPlus },
    { key: 'awaitingReview', count: a.applicantsAwaitingReview, label: 'داوطلب منتظر بررسی', href: '/hr/recruitment?status=shortlist', icon: ClipboardList },
    { key: 'noShift', count: a.peopleWithoutShiftToday, label: 'کارمند ساعتی بدون شیفت امروز', href: '/hr/time?tab=schedule', icon: CalendarX2 },
    { key: 'unrecorded', count: a.unrecordedAttendanceToday, label: 'شیفت امروز بدون ثبت حضور', href: '/hr/time?tab=attendance', icon: FileClock },
    { key: 'draft', count: a.draftAttendanceCount, label: 'حضور تأییدنشده (پیش‌نویس)', href: '/hr/time?tab=attendance', icon: Clock3 },
    { key: 'suspicious', count: a.suspiciousAttendanceDays, label: 'حضور مشکوک/هم‌پوشان', href: '/hr/time?tab=attendance', icon: ShieldAlert, tone: 'danger' },
    { key: 'unscheduled', count: a.unscheduledAttendanceCount, label: 'حضور بدون شیفت برنامه‌ریزی‌شده', href: '/hr/time?tab=attendance', icon: Timer },
    { key: 'overtime', count: a.unapprovedOvertimeCount, label: 'اضافه‌کاری منتظر تأیید', href: '/hr/time?tab=attendance', icon: Timer, tone: 'warning' },
    { key: 'docs', count: a.documentsExpiringSoon, label: 'مدرک نزدیک انقضا', href: '/hr/people', icon: FileWarning, tone: 'warning' },
    { key: 'invalidRate', count: a.employeesWithInvalidRate, label: 'کارمند بدون نرخ/حقوق پایه‌ی معتبر', href: '/hr/people', icon: BadgeDollarSign, tone: 'danger' },
  ] : [];
  const cards = allCards.filter(c => c.count > 0);

  return (
    <div className="p-4 lg:p-6 pt-2">
      <div className="max-w-5xl mx-auto space-y-5">
        {loading ? (
          <Card><CardBody><div className="text-[12.5px] text-muted">در حال بارگذاری…</div></CardBody></Card>
        ) : !data ? (
          <Card><CardBody><InlineNotice tone="danger">خطا در دریافت خلاصه‌ی منابع انسانی</InlineNotice></CardBody></Card>
        ) : (
          <>
            {/* ── نیازمند اقدام ── */}
            <div>
              <div className="text-[13px] font-medium text-stone-700 mb-2">نیازمند اقدام</div>
              {cards.length === 0 ? (
                <Card><CardBody>
                  <div className="flex items-center gap-2 text-[12.5px] text-emerald-700">
                    <CheckCircle2 size={16} strokeWidth={1.5} />
                    فعلاً هیچ موردی نیازمند اقدام نیست.
                  </div>
                </CardBody></Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {cards.map(c => {
                    const Icon = c.icon;
                    return (
                      <Link key={c.key} href={c.href}
                        className="flex items-center gap-3 bg-white border border-stone-200 rounded-lg p-3 hover:border-stone-300 transition-colors">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          c.tone === 'danger' ? 'bg-rose-50 text-rose-600' : c.tone === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-stone-100 text-stone-600'
                        }`}>
                          <Icon size={16} strokeWidth={1.5} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-stone-800">{c.label}</div>
                        </div>
                        <div className="text-[15px] font-medium tabular-nums text-stone-900">{c.count}</div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── شاخص‌ها ── */}
            <div>
              <div className="text-[13px] font-medium text-stone-700 mb-2">شاخص‌ها</div>
              <MetricGrid minCardWidth={180}>
                <MetricCard label="پرسنل فعال" value={data.metrics.activeEmployeeCount} unit="count" />
                <MetricCard label="پرسنل ساعتی" value={data.metrics.hourlyEmployeeCount} unit="count" />
                <MetricCard label="متقاضی جدید" value={data.metrics.newApplicantsCount} unit="count" />
                <MetricCard label="اضافه‌کاری تأییدنشده" value={data.metrics.unapprovedOvertimeCount} unit="count" />
              </MetricGrid>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                <Card><CardBody className="py-3">
                  <div className="text-[10.5px] text-muted mb-1">ساعت برنامه‌ریزی‌شده امروز</div>
                  <div className="text-[15px] font-medium text-stone-900">{fmtHours(data.metrics.plannedMinutesToday)}</div>
                </CardBody></Card>
                <Card><CardBody className="py-3">
                  <div className="text-[10.5px] text-muted mb-1">ساعت حضور واقعی امروز</div>
                  <div className="text-[15px] font-medium text-stone-900">{fmtHours(data.metrics.workedMinutesToday)}</div>
                </CardBody></Card>
                <Card><CardBody className="py-3">
                  <div className="text-[10.5px] text-muted mb-1">دوره‌ی جاری</div>
                  <div className="text-[13px] font-medium text-stone-900" dir="ltr">{data.period}</div>
                </CardBody></Card>
                <Link href="/hr/payroll">
                  <Card><CardBody className="py-3">
                    <div className="text-[10.5px] text-muted mb-1">وضعیت آمادگی حقوق</div>
                    <div className={`text-[13px] font-medium flex items-center gap-1.5 ${data.metrics.payrollReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                      <Calculator size={13} strokeWidth={1.5} />
                      {data.metrics.payrollReady ? 'آماده' : 'نیازمند بررسی'}
                    </div>
                  </CardBody></Card>
                </Link>
              </div>
            </div>

            <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
              <Users size={12} strokeWidth={1.5} />
              از تب‌های بالا برای دسترسی مستقیم به استخدام، افراد، زمان و حضور، و حقوق استفاده کنید.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
