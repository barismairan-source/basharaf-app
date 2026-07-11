'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Handshake, Plus, ChevronLeft, Phone, Building2 } from 'lucide-react';
import {
  Button, Card, CardBody, CardHeader, Field, Input, Empty,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { normalizeDigits } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PartnersPage() {
  const user = useAppStore(s => s.user);
  const partners = useAppStore(s => s.partners);
  const partnersLoaded = useAppStore(s => s.partnersLoaded);
  const loadPartners = useAppStore(s => s.loadPartners);
  const createPartner = useAppStore(s => s.createPartner);
  const showToast = useAppStore(s => s.showToast);

  const [hydrated, setHydrated] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [q, setQ] = useState('');

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setHydrated(true);
    loadPartners();
  }, [loadPartners]);

  const filtered = useMemo(() => {
    const term = q.trim();
    if (!term) return partners;
    return partners.filter(p =>
      p.fullName.includes(term) || (p.phone ?? '').includes(term)
    );
  }, [partners, q]);

  if (!hydrated || !user) return null;
  if (user.role !== 'SuperAdmin') return (
    <div className="p-6 text-center text-[13px] text-muted">دسترسی ندارید</div>
  );

  async function handleAdd() {
    if (!fullName.trim()) return;
    setAdding(true);
    const p = await createPartner({
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      nationalId: nationalId.trim() || undefined,
      note: note.trim() || undefined,
    });
    setAdding(false);
    if (p) {
      showToast('شریک اضافه شد', 'success', p.fullName);
      setShowAdd(false);
      setFullName(''); setPhone(''); setNationalId(''); setNote('');
    } else {
      showToast('خطا در ثبت شریک', 'danger');
    }
  }

  const activePartners = filtered.filter(p => p.isActive);
  const inactivePartners = filtered.filter(p => !p.isActive);

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-medium text-stone-900 tracking-tight">شرکا</h1>
            <div className="text-[12px] text-stone-500 mt-1">
              مدیریت سرمایه‌گذاران و آورده‌های مجموعه
            </div>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>
            شریک جدید
          </Button>
        </div>

        {/* Search */}
        {(partners.length > 0 || q) && (
          <Input
            placeholder="جستجو بر اساس نام یا تلفن…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        )}

        {/* Add form */}
        {showAdd && (
          <Card>
            <CardHeader title="افزودن شریک" />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="نام و نام خانوادگی *">
                  <Input
                    placeholder="مثلاً: حسین شرف"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    autoFocus
                  />
                </Field>
                <Field label="تلفن">
                  <Input
                    placeholder="۰۹…"
                    dir="ltr"
                    value={phone}
                    onChange={e => setPhone(normalizeDigits(e.target.value))}
                  />
                </Field>
                <Field label="کد ملی">
                  <Input
                    placeholder="۱۰ رقم"
                    dir="ltr"
                    value={nationalId}
                    onChange={e => setNationalId(e.target.value)}
                  />
                </Field>
                <Field label="یادداشت">
                  <Input
                    placeholder="اختیاری"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="default" size="sm" onClick={() => { setShowAdd(false); setFullName(''); setPhone(''); setNationalId(''); setNote(''); }}>
                  لغو
                </Button>
                <Button
                  variant="primary" size="sm" icon={Plus}
                  loading={adding}
                  disabled={!fullName.trim()}
                  onClick={handleAdd}
                >
                  افزودن
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Empty state */}
        {!partnersLoaded && (
          <Card><CardBody><Empty title="در حال بارگذاری…" icon={Handshake} /></CardBody></Card>
        )}

        {partnersLoaded && partners.length === 0 && (
          <Card>
            <CardBody>
              <Empty title="هنوز شریکی ثبت نشده" sub="از دکمه بالا اولین شریک را اضافه کنید" icon={Handshake} />
            </CardBody>
          </Card>
        )}

        {/* Active partners list */}
        {activePartners.length > 0 && (
          <Card>
            <CardBody className="p-0">
              {activePartners.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/partners/${p.id}`}
                  className={cn(
                    'flex items-center gap-4 px-5 py-4 hover:bg-stone-50/60 transition-colors',
                    i < activePartners.length - 1 && 'border-b border-stone-100'
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[14px] font-medium text-violet-700">
                      {p.fullName.trim()[0]}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium text-stone-900">{p.fullName}</div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {p.phone && (
                        <span className="flex items-center gap-1 text-[11px] text-muted" dir="ltr">
                          <Phone size={10} strokeWidth={1.5} />
                          {p.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-muted">
                        <Building2 size={10} strokeWidth={1.5} />
                        {p.branches.length === 0 ? 'بدون شعبه' : `${p.branches.length} شعبه`}
                      </span>
                    </div>
                  </div>

                  <ChevronLeft size={15} strokeWidth={1.5} className="text-stone-400 flex-shrink-0" />
                </Link>
              ))}
            </CardBody>
          </Card>
        )}

        {/* Inactive partners */}
        {inactivePartners.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-2">
              غیرفعال
            </div>
            <Card>
              <CardBody className="p-0">
                {inactivePartners.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/partners/${p.id}`}
                    className={cn(
                      'flex items-center gap-4 px-5 py-4 hover:bg-stone-50/60 transition-colors opacity-50',
                      i < inactivePartners.length - 1 && 'border-b border-stone-100'
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[14px] font-medium text-stone-500">
                        {p.fullName.trim()[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-stone-600">{p.fullName}</div>
                      <div className="text-[11px] text-muted">غیرفعال</div>
                    </div>
                    <ChevronLeft size={15} strokeWidth={1.5} className="text-stone-300 flex-shrink-0" />
                  </Link>
                ))}
              </CardBody>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
