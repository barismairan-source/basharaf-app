'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, Building2, Calendar, Edit3, Phone, Plus, Save, Trash2,
  X, Handshake, TrendingDown,
} from 'lucide-react';
import {
  Button, Card, CardBody, CardHeader, Field, Input, Select,
  JalaliDatePicker, Empty,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt, normalizeDigits, cn } from '@/lib/utils';
import { formatMoneyShort } from '@/lib/design/format';

export default function PartnerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const user = useAppStore(s => s.user);
  const branches = useAppStore(s => s.branches);
  const partners = useAppStore(s => s.partners);
  const partnersLoaded = useAppStore(s => s.partnersLoaded);
  const accounts = useAppStore(s => s.accounts);
  const loadPartners = useAppStore(s => s.loadPartners);
  const loadAccounts = useAppStore(s => s.loadAccounts);
  const updatePartner = useAppStore(s => s.updatePartner);
  const deletePartner = useAppStore(s => s.deletePartner);
  const addPartnerBranch = useAppStore(s => s.addPartnerBranch);
  const removePartnerBranch = useAppStore(s => s.removePartnerBranch);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [saving, setSaving] = useState(false);

  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchId, setNewBranchId] = useState<string>('__hq__');
  const [newJoinedDate, setNewJoinedDate] = useState('');
  const [addingBranch, setAddingBranch] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    setHydrated(true);
    loadPartners();
    loadAccounts();
  }, [loadPartners, loadAccounts]);

  const partner = useMemo(
    () => partners.find(p => p.id === params.id),
    [partners, params.id]
  );

  // حساب‌های نوع partner_equity متعلق به این شریک
  const equityAccounts = useMemo(
    () => accounts.filter(a => a.type === 'partner_equity' && a.partnerId === partner?.id),
    [accounts, partner?.id]
  );
  const totalEquity = equityAccounts.reduce((s, a) => s + a.balance, 0);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') {
    return <div className="p-6 text-center text-[13px] text-muted">دسترسی ندارید</div>;
  }
  if (partnersLoaded && !partner) {
    return (
      <div className="p-6 text-center text-[13px] text-muted">
        شریک پیدا نشد.{' '}
        <button className="underline" onClick={() => router.push('/partners')}>بازگشت</button>
      </div>
    );
  }
  if (!partner) {
    return <div className="p-6 text-center text-[13px] text-muted">در حال بارگذاری…</div>;
  }

  function startEdit() {
    setEditName(partner!.fullName);
    setEditPhone(partner!.phone ?? '');
    setEditNationalId(partner!.nationalId ?? '');
    setEditNote(partner!.note ?? '');
    setEditing(true);
  }

  async function handleSave() {
    if (!editName.trim()) return;
    setSaving(true);
    const ok = await updatePartner(partner!.id, {
      fullName: editName.trim(),
      phone: editPhone.trim() || null,
      nationalId: editNationalId.trim() || null,
      note: editNote.trim() || null,
    });
    setSaving(false);
    if (ok) { showToast('ذخیره شد', 'success'); setEditing(false); }
    else showToast('خطا در ذخیره', 'danger');
  }

  async function handleDelete() {
    if (!confirm(`شریک «${partner!.fullName}» غیرفعال شود؟`)) return;
    const ok = await deletePartner(partner!.id);
    if (ok) { showToast('شریک غیرفعال شد', 'success'); router.push('/partners'); }
    else showToast('خطا', 'danger');
  }

  async function handleAddBranch() {
    setAddingBranch(true);
    const branchId = newBranchId === '__hq__' ? null : newBranchId;
    const ok = await addPartnerBranch(partner!.id, {
      branchId,
      joinedDate: newJoinedDate || undefined,
    });
    setAddingBranch(false);
    if (ok) {
      showToast('شعبه اضافه شد', 'success');
      setShowAddBranch(false);
      setNewBranchId('__hq__');
      setNewJoinedDate('');
    } else {
      showToast(useAppStore.getState().partnersError ?? 'خطا', 'danger');
    }
  }

  async function handleRemoveBranch(pbId: string, label: string) {
    if (!confirm(`رابطه شریک با «${label}» حذف شود؟`)) return;
    setRemovingId(pbId);
    const ok = await removePartnerBranch(partner!.id, pbId);
    setRemovingId(null);
    if (ok) showToast('حذف شد', 'success');
    else showToast('خطا', 'danger');
  }

  const availableBranches = branches.filter(
    b => !partner.branches.some(pb => pb.branchId === b.id)
  );
  const hasHq = partner.branches.some(pb => pb.branchId === null);

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Back */}
        <button
          onClick={() => router.push('/partners')}
          className="flex items-center gap-1.5 text-[12px] text-muted hover:text-stone-700"
        >
          <ArrowRight size={14} strokeWidth={1.5} />
          بازگشت به شرکا
        </button>

        {/* Partner info card */}
        <Card>
          <CardHeader
            title={partner.fullName}
            action={
              <div className="flex gap-1.5">
                {!editing && (
                  <>
                    <Button variant="default" size="sm" icon={Edit3} onClick={startEdit}>
                      ویرایش
                    </Button>
                    {partner.isActive && (
                      <Button variant="danger" size="sm" icon={Trash2} onClick={handleDelete}>
                        غیرفعال
                      </Button>
                    )}
                  </>
                )}
              </div>
            }
          />
          <CardBody>
            {!partner.isActive && (
              <div className="mb-4 px-3 py-2 bg-stone-100 rounded-md text-[12px] text-stone-500">
                این شریک غیرفعال است
              </div>
            )}

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="نام و نام خانوادگی *">
                    <Input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                    />
                  </Field>
                  <Field label="تلفن">
                    <Input
                      dir="ltr"
                      value={editPhone}
                      onChange={e => setEditPhone(normalizeDigits(e.target.value))}
                    />
                  </Field>
                  <Field label="کد ملی">
                    <Input
                      dir="ltr"
                      value={editNationalId}
                      onChange={e => setEditNationalId(e.target.value)}
                    />
                  </Field>
                  <Field label="یادداشت">
                    <Input
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="default" size="sm" icon={X} onClick={() => setEditing(false)}>
                    لغو
                  </Button>
                  <Button
                    variant="primary" size="sm" icon={Save}
                    loading={saving}
                    disabled={!editName.trim()}
                    onClick={handleSave}
                  >
                    ذخیره
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {partner.phone && (
                  <div>
                    <div className="text-[11px] text-muted mb-1">تلفن</div>
                    <div className="flex items-center gap-1.5 text-[13px] text-stone-700" dir="ltr">
                      <Phone size={13} strokeWidth={1.5} className="text-stone-400" />
                      {partner.phone}
                    </div>
                  </div>
                )}
                {partner.nationalId && (
                  <div>
                    <div className="text-[11px] text-muted mb-1">کد ملی</div>
                    <div className="text-[13px] text-stone-700 dir-ltr" dir="ltr">
                      {partner.nationalId}
                    </div>
                  </div>
                )}
                {partner.note && (
                  <div className="sm:col-span-2">
                    <div className="text-[11px] text-muted mb-1">یادداشت</div>
                    <div className="text-[13px] text-stone-700">{partner.note}</div>
                  </div>
                )}
                {!partner.phone && !partner.nationalId && !partner.note && (
                  <div className="sm:col-span-2 text-[12px] text-muted">
                    اطلاعات تکمیلی ثبت نشده
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Branch links */}
        <Card>
          <CardHeader
            title="شعب / آورده"
            action={
              !showAddBranch && (
                <Button variant="default" size="sm" icon={Plus} onClick={() => setShowAddBranch(true)}>
                  افزودن شعبه
                </Button>
              )
            }
          />
          <CardBody className="space-y-4">

            {/* Add branch form */}
            {showAddBranch && (
              <div className="p-4 bg-stone-50 rounded-lg border border-stone-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="شعبه">
                    <Select value={newBranchId} onChange={e => setNewBranchId(e.target.value)}>
                      {!hasHq && <option value="__hq__">ستادی — کل مجموعه</option>}
                      {availableBranches.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                      {hasHq && availableBranches.length === 0 && (
                        <option disabled value="">همه شعب اضافه شده‌اند</option>
                      )}
                    </Select>
                  </Field>
                  <Field label="تاریخ ورود">
                    <JalaliDatePicker value={newJoinedDate} onChange={setNewJoinedDate} />
                  </Field>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="default" size="sm" icon={X} onClick={() => { setShowAddBranch(false); setNewBranchId('__hq__'); setNewJoinedDate(''); }}>
                    لغو
                  </Button>
                  <Button
                    variant="primary" size="sm" icon={Plus}
                    loading={addingBranch}
                    disabled={hasHq && availableBranches.length === 0}
                    onClick={handleAddBranch}
                  >
                    افزودن
                  </Button>
                </div>
              </div>
            )}

            {partner.branches.length === 0 && !showAddBranch && (
              <Empty
                title="هنوز شعبه‌ای ثبت نشده"
                sub="از دکمه بالا شعبه یا آورده ستادی اضافه کنید"
                icon={Building2}
              />
            )}

            {partner.branches.map(pb => {
              const label = pb.branchId === null ? 'ستادی — کل مجموعه' : (pb.branchName ?? '—');
              return (
                <div key={pb.id} className="flex items-center gap-3 py-2.5 border-b border-stone-100 last:border-b-0">
                  <div className="w-8 h-8 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0">
                    <Building2 size={15} strokeWidth={1.5} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-stone-800">{label}</div>
                    {pb.joinedDate && (
                      <div className="flex items-center gap-1 text-[11px] text-muted mt-0.5">
                        <Calendar size={10} strokeWidth={1.5} />
                        {pb.joinedDate}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveBranch(pb.id, label)}
                    disabled={removingId === pb.id}
                    className="w-7 h-7 flex items-center justify-center rounded hover:bg-rose-50 text-muted hover:text-rose-600"
                  >
                    <X size={13} strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </CardBody>
        </Card>

        {/* Equity accounts */}
        <Card>
          <CardHeader title="آورده‌ی سرمایه" />
          <CardBody>
            {equityAccounts.length === 0 ? (
              <div className="text-[12px] text-muted py-2">
                بعد از اتصال حساب‌های partner_equity به این شریک (مرحله ۳ migration) اینجا نمایش داده می‌شود.
              </div>
            ) : (
              <div className="space-y-3">
                {equityAccounts.map(a => (
                  <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-b border-stone-100 last:border-b-0">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-stone-800">{a.name}</div>
                      {a.branchId && (
                        <div className="text-[11px] text-muted">
                          {branches.find(b => b.id === a.branchId)?.name ?? '—'}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div
                        className={cn('text-[14px] font-medium num', a.balance >= 0 ? 'text-stone-900' : 'text-rose-700')}
                        title={`${fmt(a.balance)} تومان`}
                      >
                        {formatMoneyShort(a.balance)}
                      </div>
                      {a.balance < 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-rose-600 mt-0.5 justify-end">
                          <TrendingDown size={10} strokeWidth={1.5} />
                          آورده‌ی خرج‌شده
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-200">
                  <div className="text-[12px] text-muted font-medium">جمع کل آورده</div>
                  <div
                    className={cn('text-[16px] font-semibold num', totalEquity >= 0 ? 'text-stone-900' : 'text-rose-700')}
                    title={`${fmt(totalEquity)} تومان`}
                  >
                    {formatMoneyShort(totalEquity)}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

      </div>
    </div>
  );
}
