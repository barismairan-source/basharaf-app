'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, CheckCircle2, ChevronLeft, Loader2, Minus, Phone, Plus, User } from 'lucide-react';
import { Button, Card, CardBody, Empty, Field, Input, JalaliDatePicker, Select, Textarea } from '@/components/ui';
import { normalizeDigits, toFa, cn } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';
import { reservationPublicRepo } from '@/lib/repos/reservationPublic.api';
import type { PublicReservationBranch, PublicReservationDay, PublicReservationResult } from '@/types';

export default function PublicReservePage() {
  const [branches, setBranches] = useState<PublicReservationBranch[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [note, setNote] = useState('');

  const [day, setDay] = useState<PublicReservationDay | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicReservationResult | null>(null);

  const branch = useMemo(() => branches?.find((b) => b.id === branchId) ?? null, [branches, branchId]);

  useEffect(() => {
    reservationPublicRepo.getBranches()
      .then((list) => {
        setBranches(list);
        if (list.length === 1) setBranchId(list[0]!.id);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!branchId || !date) { setDay(null); return; }
    setDayLoading(true);
    setDayError(null);
    setTime('');
    reservationPublicRepo.getAvailability(branchId, date)
      .then(setDay)
      .catch((e: Error) => setDayError(e.message))
      .finally(() => setDayLoading(false));
  }, [branchId, date]);

  useEffect(() => {
    if (branch && partySize > branch.maxPartySize) setPartySize(branch.maxPartySize);
  }, [branch, partySize]);

  async function handleSubmit() {
    if (!branchId || !date || !time) return;
    if (guestName.trim().length < 2) { setSubmitError('نام را کامل وارد کنید'); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await reservationPublicRepo.create({
        branchId, date, time, partySize,
        guestName: guestName.trim(),
        guestPhone: normalizeDigits(guestPhone.trim()),
        note: note.trim() || undefined,
      });
      setResult(res);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'خطا در ثبت رزرو');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Empty title="رزرو آنلاین در دسترس نیست" sub={loadError} />
      </div>
    );
  }

  if (branches && branches.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Empty title="رزرو آنلاین در حال حاضر فعال نیست" sub="لطفاً برای رزرو با شعبه تماس بگیرید." />
      </div>
    );
  }

  if (result) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <Card>
          <CardBody className="text-center space-y-4 py-8">
            <CheckCircle2 className="mx-auto text-emerald-500" size={40} strokeWidth={1.5} />
            <div>
              <div className="text-[15px] font-medium text-stone-900">رزرو شما ثبت شد</div>
              <div className="text-[12px] text-muted mt-1">تا زمان تأیید توسط رستوران صبور باشید.</div>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 space-y-1 text-[13px]">
              <div className="text-[11px] text-muted">کد پیگیری</div>
              <div className="text-[22px] font-semibold tracking-widest text-stone-900 tabular-nums" dir="ltr">{toFa(result.trackingCode)}</div>
            </div>
            <div className="text-[12.5px] text-stone-600 space-y-1">
              <div>{result.branchName}</div>
              <div>{toFa(result.date)} — ساعت {toFa(result.time)}</div>
              <div>{toFa(String(result.partySize))} نفر</div>
            </div>
            <Link href="/reserve/track" className="inline-block text-[12.5px] text-accent underline underline-offset-2">
              پیگیری یا لغو رزرو
            </Link>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-6 text-center">
        <div className="text-[18px] font-medium text-stone-900">رزرو میز</div>
        <div className="text-[12.5px] text-muted mt-1">با شرف</div>
      </div>

      <div className="space-y-4">
        {branches && branches.length > 1 && (
          <Field label="شعبه">
            <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
              <option value="">انتخاب کنید...</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </Field>
        )}

        {branchId && (
          <Field label="تاریخ">
            <JalaliDatePicker value={date} onChange={setDate} />
          </Field>
        )}

        {branchId && date && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
              <CalendarClock size={13} strokeWidth={1.5} />
              ساعت
            </div>
            {dayLoading && <div className="text-[12px] text-muted py-3 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> در حال بررسی ظرفیت...</div>}
            {dayError && <div className="text-[12px] text-rose-600 py-2">{dayError}</div>}
            {day && !day.dateBookable && (
              <div className="text-[12px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{day.dateReason ?? 'این تاریخ قابل رزرو نیست'}</div>
            )}
            {day && day.dateBookable && day.slots.length === 0 && (
              <div className="text-[12px] text-muted py-2">اسلات فعالی برای این روز تعریف نشده</div>
            )}
            {day && day.dateBookable && day.slots.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {day.slots.map((s) => (
                  <button
                    key={s.time}
                    type="button"
                    disabled={!s.available}
                    onClick={() => setTime(s.time)}
                    className={cn(
                      'h-10 rounded-lg text-[12.5px] tabular-nums border transition-colors',
                      !s.available && 'opacity-40 cursor-not-allowed border-stone-100 text-muted line-through',
                      s.available && time === s.time && 'border-accent bg-accent/10 text-accent font-medium',
                      s.available && time !== s.time && 'border-stone-200 text-stone-700 hover:border-stone-300',
                    )}
                  >
                    {toFa(s.time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {time && branch && (
          <>
            <Field label="تعداد نفرات">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                  className="w-10 h-10 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-40"
                  disabled={partySize <= 1}>
                  <Minus size={14} strokeWidth={1.5} />
                </button>
                <div className="flex-1 text-center text-[15px] font-medium tabular-nums">{toFa(String(partySize))} نفر</div>
                <button type="button" onClick={() => setPartySize((n) => Math.min(branch.maxPartySize, n + 1))}
                  className="w-10 h-10 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-40"
                  disabled={partySize >= branch.maxPartySize}>
                  <Plus size={14} strokeWidth={1.5} />
                </button>
              </div>
            </Field>

            <Field label="نام و نام خانوادگی">
              <Input icon={User} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="مثلاً علی رضایی" />
            </Field>

            <Field label="شماره موبایل">
              <Input icon={Phone} dir="ltr" value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)} placeholder="0912xxxxxxx" />
            </Field>

            <Field label="توضیح (اختیاری)">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="مثلاً کنار پنجره، تولد..." />
            </Field>

            {submitError && <div className="text-[12.5px] text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{submitError}</div>}

            <Button variant="primary" className="w-full" loading={submitting} onClick={handleSubmit}>
              ثبت رزرو
            </Button>
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/reserve/track" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-stone-700">
          پیگیری رزرو قبلی
          <ChevronLeft size={13} strokeWidth={1.5} />
        </Link>
      </div>
    </div>
  );
}
