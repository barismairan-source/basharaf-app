'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Users,
  Building2, Download, Printer, ShoppingBag, type LucideIcon,
} from 'lucide-react';
import {
  Button, Card, CardBody, CardHeader, Select, Field, JalaliDatePicker,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, cn } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';
import { ExportPanel } from '@/components/transactions/ExportPanel';

interface ReportData {
  summary: { income: number; expense: number; balance: number; count: number };
  monthly: Array<{ key: string; month: string; income: number; expense: number; balance: number; count: number }>;
  byBranch: Array<{ id: string; name: string; income: number; expense: number; balance: number }>;
  byCategory: Array<{ name: string; type: string; total: number; count: number }>;
  byUser: Array<{ userId: string; name: string; approved: number; pending: number; rejected: number; total: number }>;
  takeaway: { count: number; totalSales: number; avgBasket: number; deliveryCount: number; pickupCount: number };
}

function toMillions(v: number) {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  return `${(v / 1000).toFixed(0)}K`;
}

export default function ReportsPage() {
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);

  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const isAdmin = user?.role === 'SuperAdmin';

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranch !== 'all') params.set('branchId', selectedBranch);
      if (from) params.set('from', new Date(from).toISOString());
      if (to) params.set('to', new Date(to + 'T23:59:59').toISOString());

      const res = await fetch(`/api/reports?${params}`, { credentials: 'include' });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  if (!user) return null;

  return (
    <div className="p-4 lg:p-6 print:p-0">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">گزارش مالی</h1>
            <div className="text-[12px] text-stone-500 mt-1">محاسبات روی سرور — سریع و دقیق</div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="default" size="sm" icon={Printer} onClick={() => window.print()}>
              چاپ
            </Button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-black">گزارش مالی — با شرف</h1>
          <p className="text-sm text-gray-600 mt-1">تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p>
        </div>

        {/* Filters */}
        <div className="print:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
          {isAdmin && (
            <Field label="شعبه">
              <Select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}>
                <option value="all">همه شعب</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </Select>
            </Field>
          )}
          <Field label="از تاریخ">
            <JalaliDatePicker value={from} onChange={setFrom} />
          </Field>
          <Field label="تا تاریخ">
            <JalaliDatePicker value={to} onChange={setTo} />
          </Field>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-stone-100 rounded-lg animate-pulse" />)}
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KPICard label="مجموع درآمد" value={data.summary.income} icon={TrendingUp} color="text-emerald-700" />
              <KPICard label="مجموع هزینه" value={data.summary.expense} icon={TrendingDown} color="text-rose-700" />
              <KPICard label="موجودی خالص" value={data.summary.balance} icon={Wallet}
                color={data.summary.balance >= 0 ? 'text-stone-900' : 'text-rose-700'} />
            </div>

            {/* Monthly Bar Chart */}
            {data.monthly.length > 0 && (
              <Card>
                <CardHeader title="نمودار ماهانه" sub="درآمد و هزینه — محاسبه شده در سرور" />
                <CardBody>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={data.monthly} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#78716c' }} />
                      <YAxis tickFormatter={toMillions} tick={{ fontSize: 10, fill: '#78716c' }} width={45} />
                      <Tooltip
                        formatter={(v) => [fmt(Number(v)) + ' تومان']}
                        contentStyle={{ fontSize: 11, fontFamily: 'Vazirmatn', borderRadius: 8, border: '1px solid #e7e5e4' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'Vazirmatn' }} />
                      <Bar dataKey="income" name="درآمد" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expense" name="هزینه" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            )}

            {/* Balance trend */}
            {data.monthly.length > 1 && (
              <Card>
                <CardHeader title="روند موجودی" sub="موجودی خالص ماه به ماه" />
                <CardBody>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#78716c' }} />
                      <YAxis tickFormatter={toMillions} tick={{ fontSize: 10, fill: '#78716c' }} width={45} />
                      <Tooltip
                        formatter={(v) => [fmt(Number(v)) + ' تومان', 'موجودی']}
                        contentStyle={{ fontSize: 11, fontFamily: 'Vazirmatn', borderRadius: 8, border: '1px solid #e7e5e4' }}
                      />
                      <Line type="monotone" dataKey="balance" stroke="#1c1917" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            )}

            {/* Takeaway orders KPI */}
            {data.takeaway.count > 0 && (
              <Card>
                <CardHeader title="سفارش‌های بیرون‌بر" sub="سفارش‌های تکمیل‌شده — تحویل‌شده/کامل" />
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                    <TakeawayStat label="تعداد سفارش" value={`${fmt(data.takeaway.count)} سفارش`} icon={ShoppingBag} />
                    <TakeawayStat label="فروش بیرون‌بر" value={`${fmt(data.takeaway.totalSales)} تومان`} icon={TrendingUp} />
                    <TakeawayStat label="میانگین سبد" value={`${fmt(data.takeaway.avgBasket)} تومان`} icon={Wallet} />
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart
                      data={[
                        { name: 'ارسال', تعداد: data.takeaway.deliveryCount },
                        { name: 'تحویل حضوری', تعداد: data.takeaway.pickupCount },
                      ]}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#78716c' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#78716c' }} width={80} />
                      <Tooltip contentStyle={{ fontSize: 11, fontFamily: 'Vazirmatn', borderRadius: 8, border: '1px solid #e7e5e4' }} />
                      <Bar dataKey="تعداد" name="تعداد سفارش" fill="#0ea5e9" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
              </Card>
            )}

            {/* Branch comparison */}
            {isAdmin && data.byBranch.length > 0 && (
              <Card>
                <CardHeader title="مقایسه شعب" />
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead className="bg-stone-50/50 border-b border-stone-100">
                      <tr>
                        <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">شعبه</th>
                        <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">درآمد</th>
                        <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">هزینه</th>
                        <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">موجودی</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byBranch.map((b, i) => (
                        <tr key={i} className="border-b border-stone-50 last:border-b-0">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <Building2 size={12} strokeWidth={1.5} className="text-muted" />
                              <span className="text-[12.5px] text-stone-800">{b.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-end"><span className="text-[12.5px] text-emerald-700 tabular-nums">{fmt(b.income)}</span></td>
                          <td className="px-5 py-3 text-end"><span className="text-[12.5px] text-rose-700 tabular-nums">{fmt(b.expense)}</span></td>
                          <td className="px-5 py-3 text-end">
                            <span className={cn('text-[12.5px] tabular-nums font-medium', b.balance >= 0 ? 'text-stone-900' : 'text-rose-700')}>
                              {fmt(b.balance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )}

            {/* Category breakdown */}
            {data.byCategory.length > 0 && (
              <Card>
                <CardHeader title="تفکیک دسته‌بندی" />
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[360px]">
                    <thead className="bg-stone-50/50 border-b border-stone-100">
                      <tr>
                        <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">دسته</th>
                        <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">نوع</th>
                        <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">مجموع</th>
                        <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">تعداد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byCategory.map((c, i) => (
                        <tr key={i} className="border-b border-stone-50 last:border-b-0">
                          <td className="px-5 py-2.5"><span className="text-[12.5px] text-stone-800">{c.name}</span></td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={cn('text-[10.5px] px-2 py-0.5 rounded-full', c.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')}>
                              {c.type === 'income' ? 'درآمد' : c.type === 'expense' ? 'هزینه' : 'انتقال'}
                            </span>
                          </td>
                          <td className="px-5 py-2.5 text-end"><span className="text-[12.5px] text-stone-700 tabular-nums">{fmt(c.total)}</span></td>
                          <td className="px-3 py-2.5 text-center"><span className="text-[12px] text-stone-500 tabular-nums">{c.count}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )}

            {/* User performance */}
            {isAdmin && data.byUser.length > 0 && (
              <Card>
                <CardHeader title="عملکرد کارکنان" sub="بر اساس داده‌های سرور" />
                <CardBody className="p-0 overflow-x-auto">
                  <table className="w-full min-w-[400px]">
                    <thead className="bg-stone-50/50 border-b border-stone-100">
                      <tr>
                        <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">کاربر</th>
                        <th className="text-center text-[11px] text-stone-500 font-normal px-2 py-3">تایید</th>
                        <th className="text-center text-[11px] text-stone-500 font-normal px-2 py-3">انتظار</th>
                        <th className="text-center text-[11px] text-stone-500 font-normal px-2 py-3">رد</th>
                        <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">مجموع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.byUser.map((u, i) => (
                        <tr key={i} className="border-b border-stone-50 last:border-b-0">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <Users size={12} strokeWidth={1.5} className="text-muted" />
                              <span className="text-[12.5px] text-stone-800">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center"><span className="text-[12px] text-emerald-700 tabular-nums">{u.approved}</span></td>
                          <td className="px-2 py-2.5 text-center"><span className="text-[12px] text-amber-700 tabular-nums">{u.pending}</span></td>
                          <td className="px-2 py-2.5 text-center"><span className="text-[12px] text-rose-700 tabular-nums">{u.rejected}</span></td>
                          <td className="px-5 py-2.5 text-end"><span className="text-[12.5px] text-stone-700 tabular-nums">{fmt(u.total)}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardBody>
              </Card>
            )}

            {/* Export — print hidden */}
            <div className="print:hidden">
              <Card>
                <CardHeader title="خروجی فایل" sub="دانلود با فیلتر دلخواه" />
                <CardBody><ExportPanel /></CardBody>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

function TakeawayStat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <div className="flex items-center gap-3 bg-stone-50/60 rounded-lg px-4 py-3">
      <div className="w-8 h-8 rounded-full bg-white border border-stone-100 flex items-center justify-center shrink-0">
        <Icon size={14} strokeWidth={1.5} className="text-stone-500" />
      </div>
      <div>
        <div className="text-[11px] text-stone-500">{label}</div>
        <div className="text-[14px] font-medium text-stone-900 tabular-nums mt-0.5">{value}</div>
      </div>
    </div>
  );
}

function KPICard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: LucideIcon; color: string;
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-start justify-between mb-3">
          <div className="text-[11.5px] text-stone-500">{label}</div>
          <Icon size={14} strokeWidth={1.5} className="text-muted" />
        </div>
        <div className={cn('text-[22px] font-medium tabular-nums', color)} title={`${fmt(value)} تومان`}>
          {formatMoneyShort(value)}
        </div>
        <div className="text-[10.5px] text-muted mt-1">تومان</div>
      </CardBody>
    </Card>
  );
}
