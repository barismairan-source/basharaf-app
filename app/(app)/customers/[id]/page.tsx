'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Star,
  Wallet,
  CalendarClock,
  MessageSquare,
  Phone,
  Pencil,
  Save,
  Plus,
} from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Textarea,
  Empty,
  Chip,
} from '@/components/ui';
import { useAppStore } from '@/store';
import { fmt } from '@/lib/utils';
import { tierLabel } from '@/lib/loyalty';
import type { CustomerDetail } from '@/types';

type Tab = 'loyalty' | 'reservations' | 'feedback';
type LoyaltyMode = 'earn' | 'redeem' | 'adjust';

const RES_STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار',
  confirmed: 'تأییدشده',
  seated: 'حاضر شد',
  cancelled: 'لغو',
  no_show: 'عدم حضور',
};

const LOYALTY_TYPE_LABELS: Record<string, string> = {
  earn: 'کسب',
  redeem: 'مصرف',
  adjust: 'اصلاح',
};

/** نرمال‌سازی ارقام فارسی/عربی به لاتین برای parse عددی. */
function toLatinDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export default function CustomerProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;
  const showToast = useAppStore((s) => s.showToast);

  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>('loyalty');

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers/${id}`, { credentials: 'include' });
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const { customer } = (await res.json()) as { customer: CustomerDetail };
      setData(customer);
      setName(customer.name);
      setPhone(customer.phone);
      setNote(customer.note ?? '');
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), note: note.trim() || null }),
      });
      if (res.ok) {
        setEditing(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-[12px] text-muted">در حال بارگذاری…</div>;
  }
  if (notFound || !data) {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardBody>
              <Empty title="مشتری پیدا نشد" />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Back */}
        <button
          onClick={() => router.push('/customers')}
          className="inline-flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800"
        >
          <ArrowRight size={14} strokeWidth={1.5} />
          بازگشت به مشتریان
        </button>

        {/* Profile header */}
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[18px] font-medium text-stone-900">{data.name}</h1>
                  <Chip tone="neutral">{tierLabel(data.tier)}</Chip>
                </div>
                <div
                  className="text-[12px] text-stone-500 mt-1 inline-flex items-center gap-1.5"
                  dir="ltr"
                >
                  <Phone size={12} strokeWidth={1.5} />
                  {data.phone}
                </div>
              </div>
              {!editing && (
                <Button variant="default" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                  ویرایش
                </Button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="نام">
                    <Input value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field label="تلفن">
                    <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                </div>
                <Field label="یادداشت">
                  <Textarea
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="یادداشت اختیاری…"
                  />
                </Field>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      setEditing(false);
                      setName(data.name);
                      setPhone(data.phone);
                      setNote(data.note ?? '');
                    }}
                  >
                    لغو
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Save}
                    loading={saving}
                    onClick={handleSave}
                  >
                    ذخیره
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Stat icon={Star} label="امتیاز" value={fmt(data.points)} tone="amber" />
                <Stat
                  icon={Wallet}
                  label="مجموع خرید"
                  value={fmt(data.totalSpent)}
                  suffix="تومان"
                />
                <Stat icon={CalendarClock} label="دفعات مراجعه" value={fmt(data.visitCount)} />
              </div>
            )}
          </CardBody>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stone-100">
          <TabButton active={tab === 'loyalty'} onClick={() => setTab('loyalty')} icon={Star}>
            امتیاز
          </TabButton>
          <TabButton
            active={tab === 'reservations'}
            onClick={() => setTab('reservations')}
            icon={CalendarClock}
          >
            رزروها
          </TabButton>
          <TabButton
            active={tab === 'feedback'}
            onClick={() => setTab('feedback')}
            icon={MessageSquare}
          >
            بازخورد
          </TabButton>
        </div>

        {tab === 'loyalty' && (
          <div className="space-y-4">
            <LoyaltyPanel
              customerId={data.id}
              onDone={(msg) => {
                showToast(msg, 'success');
                load();
              }}
              onError={(msg) => showToast(msg, 'danger')}
            />
            <Card>
              <CardHeader title="تاریخچه امتیاز" />
              <CardBody className="p-0">
                {data.loyalty.length === 0 ? (
                  <div className="p-5">
                    <Empty title="رکورد امتیازی ثبت نشده" />
                  </div>
                ) : (
                  <ul className="divide-y divide-stone-50">
                    {data.loyalty.map((l) => (
                      <li key={l.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="text-[12.5px] text-stone-800">
                            {LOYALTY_TYPE_LABELS[l.type] ?? l.type}
                          </div>
                          {l.reason && (
                            <div className="text-[10.5px] text-muted">{l.reason}</div>
                          )}
                        </div>
                        <span
                          className={`text-[13px] tabular-nums font-medium ${
                            l.points >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {l.points >= 0 ? '+' : ''}
                          {fmt(l.points)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          </div>
        )}

        {tab === 'reservations' && (
          <Card>
            <CardHeader title="رزروها" />
            <CardBody className="p-0">
              {data.reservations.length === 0 ? (
                <div className="p-5">
                  <Empty title="رزروی ثبت نشده" />
                </div>
              ) : (
                <ul className="divide-y divide-stone-50">
                  {data.reservations.map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <div className="text-[12.5px] text-stone-800">
                          {r.date} — <span dir="ltr">{r.time}</span>
                        </div>
                        <div className="text-[10.5px] text-muted">{fmt(r.partySize)} نفر</div>
                      </div>
                      <Chip tone="neutral">{RES_STATUS_LABELS[r.status] ?? r.status}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}

        {tab === 'feedback' && (
          <div className="space-y-4">
            <FeedbackPanel
              onSubmit={async (rating, comment) => {
                try {
                  const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ customerId: data.id, rating, comment }),
                  });
                  if (!res.ok) throw new Error();
                  showToast('بازخورد ثبت شد', 'success');
                  await load();
                  return true;
                } catch {
                  showToast('خطا در ثبت بازخورد', 'danger');
                  return false;
                }
              }}
            />
            <Card>
            <CardHeader title="بازخوردها" />
            <CardBody className="p-0">
              {data.feedback.length === 0 ? (
                <div className="p-5">
                  <Empty title="بازخوردی ثبت نشده" />
                </div>
              ) : (
                <ul className="divide-y divide-stone-50">
                  {data.feedback.map((f) => (
                    <li key={f.id} className="px-5 py-3">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            strokeWidth={1.5}
                            className={
                              i < f.rating ? 'text-amber-500 fill-amber-400' : 'text-stone-200'
                            }
                          />
                        ))}
                      </div>
                      {f.comment && <div className="text-[12px] text-stone-600">{f.comment}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackPanel({
  onSubmit,
}: {
  onSubmit: (rating: number, comment: string | null) => Promise<boolean>;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const ok = await onSubmit(rating, comment.trim() || null);
    setBusy(false);
    if (ok) {
      setComment('');
      setRating(5);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} type="button" onClick={() => setRating(i + 1)}>
              <Star
                size={22}
                strokeWidth={1.5}
                className={i < rating ? 'text-amber-500 fill-amber-400' : 'text-stone-200'}
              />
            </button>
          ))}
        </div>
        <Textarea
          rows={2}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="نظر مشتری (اختیاری)…"
        />
        <div className="flex justify-end">
          <Button variant="primary" size="sm" icon={Plus} loading={busy} onClick={submit}>
            ثبت بازخورد
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function LoyaltyPanel({
  customerId,
  onDone,
  onError,
}: {
  customerId: string;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [mode, setMode] = useState<LoyaltyMode>('earn');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const label =
    mode === 'earn' ? 'مبلغ خرید (تومان)' : mode === 'redeem' ? 'امتیاز مصرف' : 'اصلاح امتیاز (±)';

  async function submit() {
    const n = Number(toLatinDigits(value).trim());
    if (!Number.isFinite(n) || n === 0) {
      onError('مقدار نامعتبر است');
      return;
    }
    const body =
      mode === 'earn'
        ? { type: 'earn' as const, amount: Math.trunc(n), reason: reason.trim() || undefined }
        : { type: mode, points: Math.trunc(n), reason: reason.trim() || undefined };

    setBusy(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/loyalty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as { points?: number; error?: string };
      if (!res.ok || j.points == null) throw new Error(j.error ?? 'خطا');
      setValue('');
      setReason('');
      onDone('امتیاز ثبت شد');
    } catch (e) {
      onError(e instanceof Error ? e.message : 'خطا');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex gap-1.5">
          {(['earn', 'redeem', 'adjust'] as LoyaltyMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-[12px] transition-colors ${
                mode === m
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-50 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {LOYALTY_TYPE_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={label}>
            <Input
              dir="ltr"
              inputMode="numeric"
              placeholder={mode === 'earn' ? '۲۵۰٬۰۰۰' : mode === 'adjust' ? '+/- ۱۰۰' : '۱۰۰'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <Field label="علت (اختیاری)">
            <Input
              placeholder="مثلاً خرید حضوری"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            loading={busy}
            onClick={submit}
            disabled={!value.trim()}
          >
            ثبت
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: typeof Star;
  label: string;
  value: string;
  suffix?: string;
  tone?: 'amber';
}) {
  return (
    <div className="rounded-lg border border-stone-100 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10.5px] text-stone-500 mb-1">
        <Icon size={12} strokeWidth={1.5} className={tone === 'amber' ? 'text-amber-500' : ''} />
        {label}
      </div>
      <div className="text-[15px] font-medium text-stone-900 tabular-nums">{value}</div>
      {suffix && <div className="text-[9.5px] text-muted">{suffix}</div>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Star;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] border-b-2 -mb-px transition-colors ${
        active
          ? 'border-stone-900 text-stone-900'
          : 'border-transparent text-stone-500 hover:text-stone-800'
      }`}
    >
      <Icon size={13} strokeWidth={1.5} />
      {children}
    </button>
  );
}
