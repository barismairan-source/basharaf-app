'use client';

import { useEffect, useState } from 'react';
import { Ticket, Plus, Trash2, Power } from 'lucide-react';
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
  JalaliDatePicker,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';

/** نرمال‌سازی ارقام فارسی/عربی به لاتین. */
function toLatin(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}
function num(s: string): number {
  const n = Number(toLatin(s).trim());
  return Number.isFinite(n) ? n : 0;
}

export default function CouponsPage() {
  const user = useAppStore((s) => s.user);
  const branches = useAppStore((s) => s.branches);
  const coupons = useAppStore((s) => s.coupons);
  const loadCoupons = useAppStore((s) => s.loadCoupons);
  const createCoupon = useAppStore((s) => s.createCoupon);
  const updateCoupon = useAppStore((s) => s.updateCoupon);
  const deleteCoupon = useAppStore((s) => s.deleteCoupon);
  const showToast = useAppStore((s) => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [validFrom, setValidFrom] = useState(getTodayJalali());
  const [validTo, setValidTo] = useState(getTodayJalali());
  const [usageLimit, setUsageLimit] = useState('');
  const [branchId, setBranchId] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setHydrated(true);
    loadCoupons();
  }, [loadCoupons]);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardBody>
              <Empty title="این بخش فقط برای مدیر کل در دسترس است" icon={Ticket} />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const branchName = (id: string | null) =>
    id ? (branches.find((b) => b.id === id)?.name ?? '—') : 'همه شعب';

  async function handleAdd() {
    const v = num(value);
    if (!code.trim() || v <= 0) {
      showToast('کد و مقدار را درست وارد کنید', 'danger');
      return;
    }
    setAdding(true);
    const c = await createCoupon({
      code: code.trim(),
      discountType,
      value: v,
      minOrder: minOrder ? num(minOrder) : 0,
      maxDiscount: maxDiscount ? num(maxDiscount) : null,
      validFrom,
      validTo,
      usageLimit: usageLimit ? num(usageLimit) : null,
      branchId: branchId || null,
    });
    setAdding(false);
    if (c) {
      showToast('کوپن ساخته شد', 'success', c.code);
      setShowAdd(false);
      setCode('');
      setValue('');
      setMinOrder('');
      setMaxDiscount('');
      setUsageLimit('');
      setBranchId('');
    } else {
      showToast('خطا در ساخت کوپن (کد تکراری؟)', 'danger');
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await updateCoupon(id, { isActive: !isActive });
  }

  async function handleDelete(id: string) {
    const ok = await deleteCoupon(id);
    if (ok) showToast('کوپن غیرفعال شد', 'success');
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">کوپن‌ها</h1>
            <div className="text-[12px] text-stone-500 mt-1">کدهای تخفیف و سقف مصرف</div>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
            کوپن جدید
          </Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <Card>
            <CardHeader title="افزودن کوپن" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="کد">
                  <Input
                    placeholder="WELCOME10"
                    dir="ltr"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </Field>
                <Field label="نوع">
                  <Select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
                  >
                    <option value="percent">درصدی</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </Select>
                </Field>
                <Field label={discountType === 'percent' ? 'درصد (۰–۱۰۰)' : 'مبلغ (تومان)'}>
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="حداقل سفارش (تومان)">
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="۰"
                    value={minOrder}
                    onChange={(e) => setMinOrder(e.target.value)}
                  />
                </Field>
                <Field label="سقف تخفیف (اختیاری)">
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="بدون سقف"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                  />
                </Field>
                <Field label="سقف تعداد مصرف (اختیاری)">
                  <Input
                    dir="ltr"
                    inputMode="numeric"
                    placeholder="نامحدود"
                    value={usageLimit}
                    onChange={(e) => setUsageLimit(e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="معتبر از">
                  <JalaliDatePicker value={validFrom} onChange={setValidFrom} />
                </Field>
                <Field label="معتبر تا">
                  <JalaliDatePicker value={validTo} onChange={setValidTo} />
                </Field>
                <Field label="شعبه">
                  <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                    <option value="">همه شعب</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </Field>
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
                  disabled={!code.trim() || !value.trim()}
                >
                  افزودن
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* List */}
        {coupons.length === 0 ? (
          <Card>
            <CardBody>
              <Empty title="کوپنی ثبت نشده" icon={Ticket} />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead className="bg-stone-50/50 border-b border-stone-100">
                  <tr>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">کد</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">تخفیف</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">اعتبار</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">مصرف</th>
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">شعبه</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((c) => (
                    <tr
                      key={c.id}
                      className={`border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50 ${
                        c.isActive ? '' : 'opacity-50'
                      }`}
                    >
                      <td className="px-5 py-3">
                        <span className="text-[12.5px] text-stone-800 font-medium" dir="ltr">
                          {c.code}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center text-[12px] text-stone-700 tabular-nums">
                        {c.discountType === 'percent' ? (
                          <span dir="ltr">{fmt(c.value)}٪</span>
                        ) : (
                          <span>{fmt(c.value)} ت</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center text-[10.5px] text-stone-500">
                        {c.validFrom}
                        <br />
                        تا {c.validTo}
                      </td>
                      <td className="px-3 py-3 text-center text-[11.5px] text-stone-600 tabular-nums">
                        {fmt(c.usedCount)}
                        {c.usageLimit != null ? ` / ${fmt(c.usageLimit)}` : ' / ∞'}
                      </td>
                      <td className="px-3 py-3 text-center text-[11px] text-stone-500">
                        {c.branchId ? (
                          branchName(c.branchId)
                        ) : (
                          <Chip tone="neutral">همه</Chip>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => toggleActive(c.id, c.isActive)}
                            title={c.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                            className={`w-7 h-7 flex items-center justify-center rounded hover:bg-stone-100 ${
                              c.isActive ? 'text-emerald-600' : 'text-stone-400'
                            }`}
                          >
                            <Power size={13} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-stone-400 hover:text-rose-600"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
