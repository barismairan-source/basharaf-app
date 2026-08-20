'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search, XCircle } from 'lucide-react';
import { Button, Card, CardBody, Field, Input } from '@/components/ui';
import { normalizeDigits, toFa } from '@/lib/utils';
import { reservationPublicRepo } from '@/lib/repos/reservationPublic.api';
import type { PublicReservationDetail } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  pending: 'در انتظار تأیید',
  confirmed: 'تأییدشده',
  seated: 'حاضر شده',
  cancelled: 'لغوشده',
  no_show: 'عدم حضور',
};

export default function ReservationTrackPage() {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reservation, setReservation] = useState<PublicReservationDetail | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [canceled, setCanceled] = useState(false);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setReservation(null);
    try {
      const normalized = normalizeDigits(phone.trim());
      const res = await reservationPublicRepo.track(normalizeDigits(code.trim()), normalized);
      setReservation(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'رزرو پیدا نشد');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!reservation) return;
    setCanceling(true);
    try {
      await reservationPublicRepo.cancel(normalizeDigits(code.trim()), normalizeDigits(phone.trim()));
      setCanceled(true);
      setReservation({ ...reservation, status: 'cancelled', canCancel: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در لغو رزرو');
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-6 sm:px-6">
      <Link href="/reserve" className="inline-flex items-center gap-1 text-[12.5px] text-muted hover:text-stone-700 mb-6">
        <ChevronRight size={13} strokeWidth={1.5} />
        بازگشت به رزرو
      </Link>

      <div className="mb-6 text-center">
        <div className="text-[18px] font-medium text-stone-900">پیگیری رزرو</div>
        <div className="text-[12.5px] text-muted mt-1">کد پیگیری و شماره موبایل رزرو را وارد کنید</div>
      </div>

      <div className="space-y-4">
        <Field label="کد پیگیری">
          <Input dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} placeholder="۶ رقمی" maxLength={6} />
        </Field>
        <Field label="شماره موبایل">
          <Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0912xxxxxxx" />
        </Field>

        {error && <div className="text-[12.5px] text-rose-600 bg-rose-50 rounded-lg px-3 py-2">{error}</div>}

        <Button variant="primary" icon={Search} className="w-full" loading={loading} onClick={handleSearch}>
          پیگیری
        </Button>
      </div>

      {reservation && (
        <Card className="mt-6">
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[14px] font-medium text-stone-900">{reservation.branchName}</div>
              <span className="text-[11.5px] rounded-full px-2.5 py-1 bg-stone-100 text-stone-600">
                {STATUS_LABELS[reservation.status] ?? reservation.status}
              </span>
            </div>
            <div className="text-[12.5px] text-stone-600 space-y-1">
              <div>{toFa(reservation.date)} — ساعت {toFa(reservation.time)}</div>
              <div>{toFa(String(reservation.partySize))} نفر</div>
              {reservation.note && <div className="text-muted">یادداشت: {reservation.note}</div>}
            </div>

            {canceled && (
              <div className="text-[12.5px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">رزرو با موفقیت لغو شد</div>
            )}

            {reservation.canCancel && !canceled && (
              <Button variant="ghost" icon={XCircle} className="w-full text-rose-600" loading={canceling} onClick={handleCancel}>
                لغو این رزرو
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
