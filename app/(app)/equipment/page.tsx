'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Plus } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Field, Input, Select, Empty, Chip, JalaliDatePicker, Textarea } from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, formatAmountInput, parseAmount } from '@/lib/utils';
import type { EquipmentStatus } from '@/types';

const STATUS_LABELS: Record<EquipmentStatus, string> = {
  active: 'فعال',
  maintenance: 'در تعمیر',
  retired: 'بازنشسته',
};

const STATUS_TONES: Record<EquipmentStatus, 'green' | 'amber' | 'neutral'> = {
  active: 'green',
  maintenance: 'amber',
  retired: 'neutral',
};

export default function EquipmentPage() {
  const router = useRouter();
  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const equipment = useAppStore(s => s.equipment);
  const loadEquipment = useAppStore(s => s.loadEquipment);
  const createEquipment = useAppStore(s => s.createEquipment);
  const equipmentError = useAppStore(s => s.equipmentError);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [branchId, setBranchId] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchaseCostDisplay, setPurchaseCostDisplay] = useState('');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => { setHydrated(true); loadEquipment(); }, [loadEquipment]);

  useEffect(() => {
    if (user?.role !== 'SuperAdmin' && user?.assignedBranch) setBranchId(user.assignedBranch);
    else if (branches[0] && !branchId) setBranchId(branches[0].id);
  }, [user, branches, branchId]);

  if (!hydrated || !user) return null;
  const isAdmin = user.role === 'SuperAdmin';

  function branchName(id: string) {
    return branches.find(b => b.id === id)?.name ?? '—';
  }

  function resetForm() {
    setCode(''); setName(''); setCategory(''); setPurchaseDate('');
    setPurchaseCostDisplay(''); setWarrantyExpiry(''); setNote('');
    if (!isAdmin && user?.assignedBranch) setBranchId(user.assignedBranch);
  }

  async function handleAdd() {
    if (!code.trim() || !name.trim() || !branchId) return;
    setAdding(true);
    const created = await createEquipment({
      branchId,
      code: code.trim(),
      name: name.trim(),
      category: category.trim() || undefined,
      purchaseDate: purchaseDate || null,
      purchaseCost: parseAmount(purchaseCostDisplay),
      warrantyExpiry: warrantyExpiry || null,
      note: note.trim() || null,
    });
    setAdding(false);
    if (created) {
      showToast('تجهیز اضافه شد', 'success', created.name);
      setShowAdd(false);
      resetForm();
    } else {
      showToast(equipmentError || 'خطا در ثبت تجهیز', 'danger');
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">تجهیزات</h1>
            <div className="text-[12px] text-stone-500 mt-1">دستگاه‌ها و تجهیزات شعب و سوابق نگهداری</div>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>تجهیز جدید</Button>
        </div>

        {/* Add form */}
        {showAdd && (
          <Card>
            <CardHeader title="افزودن تجهیز" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isAdmin && (
                  <Field label="شعبه">
                    <Select value={branchId} onChange={e => setBranchId(e.target.value)}>
                      {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </Select>
                  </Field>
                )}
                <Field label="کد تجهیز">
                  <Input placeholder="مثلاً: EQ-001" dir="ltr" value={code} onChange={e => setCode(e.target.value)} />
                </Field>
                <Field label="نام تجهیز">
                  <Input placeholder="مثلاً: یخچال فریزر" value={name} onChange={e => setName(e.target.value)} />
                </Field>
                <Field label="دسته (اختیاری)">
                  <Input placeholder="مثلاً: آشپزخانه" value={category} onChange={e => setCategory(e.target.value)} />
                </Field>
                <Field label="تاریخ خرید (اختیاری)">
                  <JalaliDatePicker value={purchaseDate} onChange={setPurchaseDate} />
                </Field>
                <Field label="بهای خرید (تومان، اختیاری)">
                  <Input
                    type="text" inputMode="numeric" dir="ltr" placeholder="۰"
                    value={purchaseCostDisplay}
                    onChange={e => setPurchaseCostDisplay(formatAmountInput(e.target.value))}
                  />
                </Field>
                <Field label="پایان گارانتی (اختیاری)">
                  <JalaliDatePicker value={warrantyExpiry} onChange={setWarrantyExpiry} />
                </Field>
              </div>
              <Field label="یادداشت (اختیاری)">
                <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} />
              </Field>
              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => { setShowAdd(false); resetForm(); }}>لغو</Button>
                <Button variant="primary" size="sm" icon={Plus} loading={adding} onClick={handleAdd} disabled={!code.trim() || !name.trim()}>افزودن</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* List */}
        {equipment.length === 0 ? (
          <Card><CardBody><Empty title="تجهیزی ثبت نشده" icon={Wrench} /></CardBody></Card>
        ) : (
          <Card>
            <CardBody className="p-0 overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead className="bg-stone-50/50 border-b border-stone-100">
                  <tr>
                    <th className="text-right text-[11px] text-stone-500 font-normal px-5 py-3">تجهیز</th>
                    {isAdmin && <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">شعبه</th>}
                    <th className="text-center text-[11px] text-stone-500 font-normal px-3 py-3">وضعیت</th>
                    <th className="text-end text-[11px] text-stone-500 font-normal px-5 py-3">بهای خرید</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map(eq => (
                    <tr
                      key={eq.id}
                      className="border-b border-stone-50 last:border-b-0 hover:bg-stone-50/50 cursor-pointer"
                      onClick={() => router.push(`/equipment/${eq.id}`)}
                    >
                      <td className="px-5 py-3">
                        <div className="text-[12.5px] text-stone-800">{eq.name}</div>
                        <div className="text-[10.5px] text-muted" dir="ltr">{eq.code} · {eq.category}</div>
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-center">
                          <span className="text-[11.5px] text-stone-500">{branchName(eq.branchId)}</span>
                        </td>
                      )}
                      <td className="px-3 py-3 text-center">
                        <Chip tone={STATUS_TONES[eq.status]}>{STATUS_LABELS[eq.status]}</Chip>
                      </td>
                      <td className="px-5 py-3 text-end">
                        <span className="text-[12.5px] text-stone-700 tabular-nums">{fmt(eq.purchaseCost)}</span>
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
