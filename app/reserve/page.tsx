'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, Minus, Phone, PhoneCall, Plus, User, Users, Table2, Users2 } from 'lucide-react';
import { Button, Card, CardBody, Empty, Field, Input, Select, Textarea, JalaliDatePicker } from '@/components/ui';
import { normalizeDigits, toFa, cn } from '@/lib/utils';
import { getTodayJalali } from '@/lib/jalali';
import { reservationPublicRepo } from '@/lib/repos/reservationPublic.api';
import type { PublicReservationBranch, PublicReservationDay, PublicReservationResult } from '@/types';

type TableType = 'normal' | 'social';

export default function PublicReservePage() {
  const [branches, setBranches] = useState<PublicReservationBranch[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [branchId, setBranchId] = useState('');
  const [date, setDate] = useState(getTodayJalali());
  const [partySize, setPartySize] = useState(2);
  const [tableType, setTableType] = useState<TableType>('normal');
  const [time, setTime] = useState('');
  const [bookerName, setBookerName] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [note, setNote] = useState('');
  const [idempotencyKey] = useState(() => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`));

  const [day, setDay] = useState<PublicReservationDay | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<PublicReservationResult | null>(null);

  const branch = useMemo(() => branches?.find((b) => b.id === branchId) ?? null, [branches, branchId]);
  const selectedSlot = useMemo(() => day?.slots.find((s) => s.time === time) ?? null, [day, time]);

  useEffect(() => {
    reservationPublicRepo.getBranches()
      .then((list) => {
        setBranches(list);
        if (list.length === 1) setBranchId(list[0]!.id);
      })
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (branch && partySize > branch.maxPartySize) setPartySize(branch.maxPartySize);
  }, [branch, partySize]);

  // با تغییر تاریخ/نفرات/نوع میز، ساعت‌ها دوباره محاسبه و انتخاب قبلی پاک می‌شود
  useEffect(() => {
    if (!branchId || !date) { setDay(null); return; }
    setDayLoading(true);
    setDayError(null);
    setTime('');
    reservationPublicRepo.getDay(branchId, date, partySize, tableType)
      .then(setDay)
      .catch((e: Error) => setDayError(e.message))
      .finally(() => setDayLoading(false));
  }, [branchId, date, partySize, tableType]);

  async function handleSubmit() {
    if (!branchId || !time) return;
    if (guestName.trim().length < 2) { setSubmitError('نام مهمان را کامل وارد کنید'); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await reservationPublicRepo.create({
        branchId, date, time, partySize, tableType,
        bookerName: bookerName.trim() || undefined,
        guestName: guestName.trim(),
        guestPhone: normalizeDigits(guestPhone.trim()),
        note: note.trim() || undefined,
        idempotencyKey,
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
            {result.isSocialTable && (
              <div className="text-[11.5px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                میز شما اشتراکی/سوشیال است — ممکن است با مهمانان دیگر هم‌میز شوید.
              </div>
            )}
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
            <JalaliDatePicker value={date} onChange={setDate} minDate={getTodayJalali()} />
          </Field>
        )}

        {branchId && branch && (
          <Field label="تعداد نفرات">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setPartySize((n) => Math.max(1, n - 1))}
                className="w-10 h-10 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-40"
                disabled={partySize <= 1}>
                <Minus size={14} strokeWidth={1.5} />
              </button>
              <div className="flex-1 text-center text-[15px] font-medium tabular-nums flex items-center justify-center gap-1.5">
                <Users size={14} strokeWidth={1.5} className="text-muted" />
                {toFa(String(partySize))} نفر
              </div>
              <button type="button" onClick={() => setPartySize((n) => Math.min(branch.maxPartySize, n + 1))}
                className="w-10 h-10 rounded-lg border border-stone-200 flex items-center justify-center text-stone-600 disabled:opacity-40"
                disabled={partySize >= branch.maxPartySize}>
                <Plus size={14} strokeWidth={1.5} />
              </button>
            </div>
          </Field>
        )}

        {branchId && (
          <Field label="نوع میز">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTableType('normal')}
                className={cn('h-12 rounded-lg border text-[13px] flex items-center justify-center gap-2 transition-colors',
                  tableType === 'normal' ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-stone-200 text-stone-600')}>
                <Table2 size={15} strokeWidth={1.5} /> معمولی (اختصاصی)
              </button>
              <button type="button" onClick={() => setTableType('social')}
                className={cn('h-12 rounded-lg border text-[13px] flex items-center justify-center gap-2 transition-colors',
                  tableType === 'social' ? 'border-accent bg-accent/10 text-accent font-medium' : 'border-stone-200 text-stone-600')}>
                <Users2 size={15} strokeWidth={1.5} /> سوشیال (اشتراکی)
              </button>
            </div>
            {tableType === 'social' && (
              <p className="mt-1.5 text-[11px] text-amber-700">میز سوشیال با مهمانان دیگر مشترک است — ممکن است هم‌میز شوید.</p>
            )}
          </Field>
        )}

        {branchId && dayLoading && (
          <div className="text-[12px] text-muted py-6 flex items-center justify-center gap-1.5">
            <Loader2 size={13} className="animate-spin" /> در حال بررسی ظرفیت...
          </div>
        )}

        {branchId && dayError && (
          <div className="text-[12.5px] text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{dayError}</div>
        )}

        {day && day.structurallyImpossible && (
          <Card>
            <CardBody className="text-center space-y-2 py-6">
              <div className="text-[14px] text-stone-800">برای این تعداد، رزرو آنلاین در این ساعت ممکن نیست</div>
              <p className="text-[12px] text-muted">
                {tableType === 'normal'
                  ? 'می‌توانید نوع میز را به «سوشیال» تغییر دهید یا تعداد نفرات را کم کنید.'
                  : 'تعداد نفرات از ظرفیت میز سوشیال بیشتر است.'}
              </p>
            </CardBody>
          </Card>
        )}

        {day && !day.structurallyImpossible && day.slots.length === 0 && (
          <Card>
            <CardBody className="text-center space-y-3 py-6">
              <div className="text-[14px] text-stone-800">
                {day.closedMessage ?? 'رزرو این تاریخ بسته است'}
              </div>
              {day.closedPhone && (
                <a href={`tel:${day.closedPhone}`} className="inline-flex items-center gap-1.5 text-[13.5px] text-accent font-medium" dir="ltr">
                  <PhoneCall size={14} strokeWidth={1.5} />
                  {day.closedPhone}
                </a>
              )}
            </CardBody>
          </Card>
        )}

        {day && day.slots.length > 0 && (
          <>
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1.5">ساعت شروع</div>
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
              <p className="mt-1.5 text-[11px] text-muted">هر رزرو ۶۰ دقیقه میز/صندلی را در اختیار شما می‌گذارد.</p>
            </div>

            {selectedSlot?.social && (
              <div className="text-[11.5px] text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                میز شما اشتراکی/سوشیال خواهد بود — ممکن است با مهمانان دیگر هم‌میز شوید.
              </div>
            )}
          </>
        )}

        {time && (
          <>
            <Field label="نام رزروکننده (اختیاری)" hint="اگر برای دیگری رزرو می‌کنید — مثلاً نام شما">
              <Input icon={User} value={bookerName} onChange={(e) => setBookerName(e.target.value)} placeholder="مثلاً صدرا" />
            </Field>

            <Field label="نام مهمان اصلی">
              <Input icon={User} value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="مثلاً شهین" />
            </Field>

            <Field label="شماره تماس مهمان">
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
            <p className="text-center text-[10.5px] text-muted">نام رزروکننده خوداظهاری است و هویت تأییدشده محسوب نمی‌شود.</p>
          </>
        )}
      </div>

      <div className="mt-8 text-center">
        <Link href="/reserve/track" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-stone-700">
          پیگیری رزرو قبلی
        </Link>
      </div>
    </div>
  );
}
