'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button, Card, CardBody, Chip, Empty } from '@/components/ui';
import { fmt, toFa } from '@/lib/utils';
import { publicOrderRepo } from '@/lib/repos/publicOrder.api';
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from '@/lib/ordering/orderStatus';
import type { OrderStatus, PublicOrder } from '@/types';

export default function OrderTrackPage() {
  const params = useParams<{ token: string }>();
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payRedirecting, setPayRedirecting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    publicOrderRepo
      .getOrderByToken(params.token)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  async function handlePay() {
    if (!order) return;
    setPayRedirecting(true);
    setPayError(null);
    try {
      const { url } = await publicOrderRepo.requestPayment(order.trackToken);
      window.location.href = url;
    } catch (err) {
      setPayError((err as Error).message);
      setPayRedirecting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-muted">
        در حال بارگذاری…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Empty
          title="سفارش پیدا نشد"
          sub={error ?? 'لینک رهگیری نامعتبر است.'}
          action={
            <Link href="/order">
              <Button variant="primary">بازگشت به منو</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const knownLabel = ORDER_STATUS_LABELS[order.status as OrderStatus];
  const status = knownLabel
    ? { label: knownLabel, tone: ORDER_STATUS_TONES[order.status as OrderStatus] }
    : { label: order.status, tone: 'neutral' as const };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-20 pt-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-lg text-stone-800 sm:text-xl">سفارش شما ثبت شد</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Chip tone={status.tone}>{status.label}</Chip>
          <span className="text-[12px] text-stone-500">شماره سفارش: {toFa(order.orderNo)}</span>
        </div>
        <p className="mt-1 text-[12px] text-muted">تاریخ ثبت: {toFa(order.jalaliDate)}</p>
      </header>

      <section className="mb-5">
        <h2 className="mb-2 text-[13px] text-stone-500">اطلاعات سفارش</h2>
        <Card>
          <CardBody className="space-y-2 text-[13px] text-stone-600">
            <div className="flex items-center justify-between">
              <span>نوع سرویس</span>
              <span className="text-stone-800">{order.serviceType === 'delivery' ? 'ارسال' : 'دریافت حضوری'}</span>
            </div>
            {order.serviceType === 'delivery' && (
              <>
                {order.zoneName && (
                  <div className="flex items-center justify-between">
                    <span>محدوده‌ی ارسال</span>
                    <span className="text-stone-800">{order.zoneName}</span>
                  </div>
                )}
                {order.address && (
                  <div className="flex items-start justify-between gap-3">
                    <span>آدرس</span>
                    <span className="text-left text-stone-800">{order.address}</span>
                  </div>
                )}
              </>
            )}
            {order.serviceType === 'pickup' && order.pickupTime && (
              <div className="flex items-center justify-between">
                <span>زمان دریافت</span>
                <span className="text-stone-800">{toFa(order.pickupTime)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>نام</span>
              <span className="text-stone-800">{order.customerName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>تلفن</span>
              <span dir="ltr" className="text-stone-800">
                {order.customerPhone}
              </span>
            </div>
            {order.note && (
              <div className="flex items-start justify-between gap-3">
                <span>یادداشت</span>
                <span className="text-left text-stone-800">{order.note}</span>
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-[13px] text-stone-500">اقلام سفارش</h2>
        <Card>
          <div className="divide-y divide-stone-100">
            {order.lines.map((line, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <div className="text-stone-700">
                  {line.itemName} <span className="text-muted">× {toFa(line.qty)}</span>
                </div>
                <div className="text-stone-800">{fmt(line.lineTotal)} تومان</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-[13px] text-stone-500">خلاصه</h2>
        <Card>
          <CardBody className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between text-stone-600">
              <span>جمع اقلام</span>
              <span>{fmt(order.subtotal)} تومان</span>
            </div>
            {order.deliveryFee > 0 && (
              <div className="flex items-center justify-between text-stone-600">
                <span>هزینه‌ی ارسال</span>
                <span>{fmt(order.deliveryFee)} تومان</span>
              </div>
            )}
            {order.discount > 0 && (
              <div className="flex items-center justify-between text-stone-600">
                <span>تخفیف</span>
                <span>−{fmt(order.discount)} تومان</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-[15px] text-stone-800">
              <span>مبلغ قابل پرداخت</span>
              <span>{fmt(order.total)} تومان</span>
            </div>

            {order.payMethod === 'cash' && (
              <p className="text-[11.5px] text-muted">
                پرداخت نقدی {order.serviceType === 'delivery' ? '— هنگام تحویل به پیک' : '— هنگام دریافت حضوری'}
              </p>
            )}

            {order.payMethod === 'online' && order.payStatus === 'paid' && (
              <p className="text-[11.5px] text-emerald-600">
                پرداخت آنلاین انجام شد{order.payRef ? ` — کد پیگیری: ${toFa(order.payRef)}` : ''}
              </p>
            )}

            {order.payMethod === 'online' && order.payStatus !== 'paid' && (
              <div className="space-y-2 pt-1">
                <p className="text-[11.5px] text-amber-600">
                  {order.payStatus === 'failed'
                    ? 'پرداخت آنلاین ناموفق بود — می‌توانید دوباره تلاش کنید.'
                    : 'پرداخت این سفارش هنوز انجام نشده است.'}
                </p>
                {payError && <p className="text-[11.5px] text-rose-600">{payError}</p>}
                <Button variant="primary" loading={payRedirecting} onClick={handlePay}>
                  پرداخت آنلاین
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </section>

      <div className="text-center">
        <Link href="/order" className="text-[12.5px] text-stone-600 underline-offset-2 hover:underline">
          ثبت سفارش جدید
        </Link>
      </div>
    </div>
  );
}
