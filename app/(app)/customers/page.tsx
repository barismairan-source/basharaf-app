'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Users, Plus, Star, ChevronLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Select,
  Empty,
  Chip,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, normalizeDigits } from '@/lib/utils';
import { tierLabel } from '@/lib/loyalty';
import { FeedbackSummaryCard } from '@/components/customers/FeedbackSummaryCard';

export default function CustomersPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const customers = useAppStore((s) => s.customers);
  const loadCustomers = useAppStore((s) => s.loadCustomers);
  const createCustomer = useAppStore((s) => s.createCustomer);
  const showToast = useAppStore((s) => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeBranchId, setHomeBranchId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setHydrated(true);
    loadCustomers();
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const term = q.trim();
    return customers.filter((c) => {
      if (branchFilter && c.homeBranchId !== branchFilter) return false;
      if (!term) return true;
      return c.name.includes(term) || c.phone.includes(term);
    });
  }, [customers, q, branchFilter]);

  if (!hydrated || !user) return null;
  const isAdmin = user.role === 'SuperAdmin';
  const branchName = (id: string | null) =>
    id ? (branches.find((b) => b.id === id)?.name ?? '—') : '—';

  async function handleAdd() {
    if (!name.trim() || !phone.trim()) return;
    setAdding(true);
    const c = await createCustomer({
      name: name.trim(),
      phone: phone.trim(),
      homeBranchId: isAdmin ? homeBranchId || null : null,
    });
    setAdding(false);
    if (c) {
      showToast('مشتری اضافه شد', 'success', c.name);
      setShowAdd(false);
      setName('');
      setPhone('');
      setHomeBranchId('');
    } else {
      showToast('خطا در ثبت مشتری', 'danger');
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">مشتریان</h1>
            <div className="text-[12px] text-stone-500 mt-1">
              پروفایل، امتیاز و سابقه‌ی مشتریان
            </div>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
            مشتری جدید
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="جستجو بر اساس نام یا تلفن…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          {isAdmin && (
            <div className="sm:w-56">
              <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">همه شعب</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        {/* Add form */}
        {showAdd && (
          <Card>
            <CardHeader title="افزودن مشتری" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="نام">
                  <Input
                    placeholder="نام مشتری"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>
                <Field label="تلفن">
                  <Input
                    placeholder="۰۹…"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(normalizeDigits(e.target.value))}
                  />
                </Field>
                {isAdmin && (
                  <Field label="شعبه">
                    <Select
                      value={homeBranchId}
                      onChange={(e) => setHomeBranchId(e.target.value)}
                    >
                      <option value="">بدون شعبه</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => setShowAdd(false)}>
                  لغو
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  loading={adding}
                  onClick={handleAdd}
                  disabled={!name.trim() || !phone.trim()}
                >
                  افزودن
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <Card>
            <CardBody>
              <Empty title="مشتری‌ای یافت نشد" icon={Users} />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="bg-stone-50/50 border-b border-stone-100">
                  <tr>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">
                      نام
                    </th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">
                      سطح
                    </th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">
                      امتیاز
                    </th>
                    {isAdmin && (
                      <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">
                        شعبه
                      </th>
                    )}
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50"
                    >
                      <td className="px-5 py-3 max-w-[200px]">
                        <Link href={`/customers/${c.id}`} className="block">
                          <div className="text-[12.5px] text-stone-800 truncate">{c.name}</div>
                          <div className="text-[10.5px] text-muted truncate" dir="ltr">
                            {c.phone}
                          </div>
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Chip tone="neutral">{tierLabel(c.tier)}</Chip>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[12px] text-amber-700 tabular-nums">
                          <Star size={12} strokeWidth={1.5} className="text-amber-500" />
                          {fmt(c.points)}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-center text-[11.5px] text-stone-500">
                          {branchName(c.homeBranchId)}
                        </td>
                      )}
                      <td className="px-3 py-3 text-center">
                        <Link
                          href={`/customers/${c.id}`}
                          className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-stone-100 text-muted hover:text-stone-700"
                        >
                          <ChevronLeft size={15} strokeWidth={1.5} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}

        {/* بازخورد مشتریان — جابجاشده از صفحه‌ی گزارش‌ها (آنجا فقط داده‌ی مالی/عددی می‌ماند) */}
        <FeedbackSummaryCard />
      </div>
    </div>
  );
}
