'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Map as MapIcon, MapPin, Phone, User } from 'lucide-react';
import { Button, Card, CardBody, Empty, Field, Input, Select, Textarea, Toggle } from '@/components/ui';
import { fmt, toFa } from '@/lib/utils';
import { publicOrderRepo } from '@/lib/repos/publicOrder.api';
import { customerRepo } from '@/lib/repos/customer.api';
import { loadCart, clearCart, type Cart } from '@/lib/ordering/cart';
import type { CreateOrderInput, PublicOrderItem, PublicOrderMenu } from '@/types';
import type { WebCustomer, WebCustomerAddress } from '@/types/webCustomer';

const AddressPicker = dynamic(
  () => import('@/components/order/AddressPicker'),
  { ssr: false }
);

type ServiceType = 'delivery' | 'pickup';
type PayMethod = 'cash' | 'online';

export default function OrderCheckoutPage() {
  const router = useRouter();
  const [menu, setMenu] = useState<PublicOrderMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [hydrated, setHydrated] = useState(false);

  const [serviceType, setServiceType] = useState<ServiceType>('delivery');
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [zoneId, setZoneId] = useState('');
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [note, setNote] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [clientToken] = useState(() => crypto.randomUUID());

  // مشتری لاگین‌شده و آدرس‌های ذخیره‌شده
  const [currentCustomer, setCurrentCustomer] = useState<WebCustomer | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<WebCustomerAddress[]>([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string>('');
  const [showAddressPicker, setShowAddressPicker] = useState(false);
  // lat/lng برای اتصال احتمالی به zone یا ذخیره در مشتری (فعلاً فقط آدرس متنی استفاده می‌شود)
  const [pickedLat, setPickedLat] = useState<number | null>(null);
  const [pickedLng, setPickedLng] = useState<number | null>(null);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  // بررسی session مشتری و بارگذاری آدرس‌ها (اگر لاگین کرده)
  useEffect(() => {
    customerRepo.getMe().then((me) => {
      if (!me) return;
      setCurrentCustomer(me);
      customerRepo.getAddresses().then((list) => {
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault);
        if (def) {
          setSelectedSavedAddress(def.id);
          setAddress(def.address);
        }
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    publicOrderRepo
      .getMenu()
      .then((data) => {
        if (!cancelled) setMenu(data);
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
  }, []);

  // اگر ارسال غیرفعال است ولی پیکاپ فعال است، نوع سرویس را خودکار تنظیم کن.
  useEffect(() => {
    if (!menu) return;
    if (!menu.settings.deliveryEnabled && menu.settings.pickupEnabled) {
      setServiceType('pickup');
    }
  }, [menu]);

  const itemsById = useMemo(() => {
    const map = new Map<string, PublicOrderItem>();
    menu?.sections.forEach((section) => section.items.forEach((item) => map.set(item.id, item)));
    return map;
  }, [menu]);

  const cartItems = useMemo(() => {
    const list: { id: string; titleFa: string; price: number; qty: number; lineTotal: number }[] = [];
    for (const [id, qty] of Object.entries(cart)) {
      const item = itemsById.get(id);
      if (item) list.push({ id, titleFa: item.titleFa, price: item.price, qty, lineTotal: item.price * qty });
    }
    return list;
  }, [cart, itemsById]);

  const subtotal = useMemo(() => cartItems.reduce((sum, it) => sum + it.lineTotal, 0), [cartItems]);

  const selectedZone = useMemo(
    () => menu?.zones.find((z) => z.id === zoneId) ?? null,
    [menu, zoneId]
  );

  const deliveryFee = serviceType === 'delivery' && selectedZone ? selectedZone.deliveryFee : 0;
  const discount = 0;
  const total = subtotal + deliveryFee - discount;

  const branchMinOrder = menu?.settings.minOrder ?? 0;
  const effectiveMinOrder =
    serviceType === 'delivery' ? Math.max(branchMinOrder, selectedZone?.minOrder ?? 0) : branchMinOrder;
  const remaining = Math.max(0, effectiveMinOrder - subtotal);

  const isOpenNow = menu?.settings.isOpenNow ?? false;

  const serviceOptions = useMemo(() => {
    const opts: { value: ServiceType; label: string }[] = [];
    if (menu?.settings.deliveryEnabled) opts.push({ value: 'delivery', label: 'ارسال' });
    if (menu?.settings.pickupEnabled) opts.push({ value: 'pickup', label: 'دریافت حضوری' });
    return opts;
  }, [menu]);

  const payMethodOptions = useMemo(() => {
    const opts: { value: PayMethod; label: string }[] = [];
    if (menu?.settings.payCash) opts.push({ value: 'cash', label: 'نقدی' });
    if (menu?.settings.payOnline) opts.push({ value: 'online', label: 'آنلاین' });
    return opts;
  }, [menu]);

  // اگر روش انتخاب‌شده دیگر در دسترس نیست، اولین روش فعال را انتخاب کن.
  useEffect(() => {
    if (payMethodOptions.length === 0) return;
    if (!payMethodOptions.some((o) => o.value === payMethod)) {
      setPayMethod(payMethodOptions[0]!.value);
    }
  }, [payMethodOptions, payMethod]);

  const canSubmit =
    hydrated &&
    !!menu &&
    cartItems.length > 0 &&
    isOpenNow &&
    serviceOptions.length > 0 &&
    payMethodOptions.length > 0 &&
    customerName.trim().length >= 2 &&
    customerPhone.trim().length >= 5 &&
    (serviceType !== 'delivery' || (!!zoneId && address.trim().length >= 5)) &&
    remaining === 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const payload: CreateOrderInput = {
        clientToken,
        serviceType,
        payMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: note.trim() || undefined,
        items: cartItems.map((it) => ({ id: it.id, qty: it.qty })),
        orderCustomerId: currentCustomer?.id,
      };
      if (serviceType === 'delivery') {
        payload.address = address.trim();
        payload.zoneId = zoneId;
      } else if (pickupTime.trim()) {
        payload.pickupTime = pickupTime.trim();
      }
      const order = await publicOrderRepo.createOrder(payload);
      clearCart();
      if (payMethod === 'online') {
        try {
          const { url } = await publicOrderRepo.requestPayment(order.trackToken);
          window.location.href = url;
          return;
        } catch {
          // اگر اتصال به درگاه شکست خورد، سفارش ثبت شده — کاربر از صفحه‌ی
          // رهگیری می‌تواند دوباره پرداخت را شروع کند.
          router.push(`/order/track/${order.trackToken}`);
          return;
        }
      }
      router.push(`/order/track/${order.trackToken}`);
    } catch (err) {
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-stone-400">
        در حال بارگذاری…
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Empty title="سفارش آنلاین در دسترس نیست" sub={error ?? 'فروشگاهی برای سفارش بیرون‌بر یافت نشد.'} />
      </div>
    );
  }

  if (hydrated && cartItems.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Empty
          title="سبد خرید خالی است"
          sub="برای ثبت سفارش، اول از منو چیزی به سبد اضافه کنید."
          action={
            <Link href="/order">
              <Button variant="primary">بازگشت به منو</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
    {showAddressPicker && (
      <AddressPicker
        apiKey={menu?.settings.neshanApiKey ?? ''}
        initialLat={pickedLat ?? undefined}
        initialLng={pickedLng ?? undefined}
        onConfirm={(lat, lng, addr) => {
          setAddress(addr);
          setPickedLat(lat);
          setPickedLng(lng);
          setSelectedSavedAddress('');
          setShowAddressPicker(false);
        }}
        onClose={() => setShowAddressPicker(false)}
      />
    )}
    <div className="mx-auto max-w-2xl px-4 pb-32 pt-6 sm:px-6">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-lg text-stone-800 sm:text-xl">تکمیل سفارش</h1>
          <Link
            href="/order"
            className="mt-1 inline-block text-[12px] text-stone-500 underline-offset-2 hover:underline"
          >
            بازگشت به منو
          </Link>
        </div>
        {currentCustomer ? (
          <Link
            href="/order/account"
            className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-1.5 text-[12px] text-stone-600 hover:border-stone-300"
          >
            <User size={12} />
            {currentCustomer.name ?? currentCustomer.phone}
          </Link>
        ) : (
          <Link
            href="/order/account"
            className="rounded-lg border border-stone-200 px-3 py-1.5 text-[12px] text-stone-500 hover:border-stone-300 hover:text-stone-700"
          >
            ورود / ثبت‌نام
          </Link>
        )}
      </header>

      {!isOpenNow && (
        <div className="mb-5 rounded-md border border-rose-100 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
          اکنون خارج از ساعت کاری یا تعطیل است — امکان ثبت سفارش وجود ندارد.
        </div>
      )}

      {serviceOptions.length === 0 && (
        <div className="mb-5 rounded-md border border-rose-100 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
          سفارش‌گیری آنلاین در حال حاضر فعال نیست.
        </div>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-[13px] text-stone-500">سبد شما</h2>
        <Card>
          <div className="divide-y divide-stone-100">
            {cartItems.map((it) => (
              <div key={it.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <div className="text-stone-700">
                  {it.titleFa} <span className="text-stone-400">× {toFa(it.qty)}</span>
                </div>
                <div className="text-stone-800">{fmt(it.lineTotal)} تومان</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {serviceOptions.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-[13px] text-stone-500">نوع سرویس</h2>
          <Card>
            <CardBody className="space-y-4">
              <Toggle value={serviceType} onChange={setServiceType} options={serviceOptions} />

              {serviceType === 'delivery' && (
                <>
                  <Field label="محدوده‌ی ارسال">
                    <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
                      <option value="">— انتخاب کنید —</option>
                      {menu.zones.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.name} — هزینه‌ی ارسال {fmt(z.deliveryFee)} تومان
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {menu.zones.length === 0 && (
                    <p className="text-[12px] text-amber-600">
                      هنوز محدوده‌ی ارسالی تعریف نشده — لطفاً با فروشگاه تماس بگیرید.
                    </p>
                  )}

                  {/* آدرس‌های ذخیره‌شده مشتری لاگین‌شده */}
                  {currentCustomer && savedAddresses.length > 0 && (
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-[12px] text-stone-500">
                        <MapPin size={12} />
                        آدرس‌های ذخیره‌شده
                      </p>
                      <div className="space-y-1.5">
                        {savedAddresses.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedSavedAddress(a.id);
                              setAddress(a.address);
                            }}
                            className={`w-full rounded-lg border px-3 py-2 text-right text-[12.5px] transition-colors ${
                              selectedSavedAddress === a.id
                                ? 'border-stone-800 bg-stone-50 text-stone-800'
                                : 'border-stone-100 text-stone-600 hover:border-stone-200'
                            }`}
                          >
                            <span className="font-medium">{a.title}</span>
                            <span className="mr-2 text-stone-400">{a.address}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Field label="آدرس">
                    <Textarea
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        setSelectedSavedAddress('');
                        setPickedLat(null);
                        setPickedLng(null);
                      }}
                      placeholder="آدرس کامل برای ارسال"
                      rows={2}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddressPicker(true)}
                      className="mt-1.5 flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800"
                    >
                      <MapIcon size={13} />
                      انتخاب روی نقشه
                      {pickedLat && pickedLng && (
                        <span className="text-[10.5px] text-emerald-600">✓ موقعیت انتخاب شد</span>
                      )}
                    </button>
                  </Field>
                </>
              )}

              {serviceType === 'pickup' && (
                <Field label="زمان دریافت" hint="اختیاری">
                  <Input
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    placeholder="مثلاً ۱۹:۳۰"
                  />
                </Field>
              )}
            </CardBody>
          </Card>
        </section>
      )}

      {payMethodOptions.length === 0 && (
        <div className="mb-5 rounded-md border border-rose-100 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
          روش پرداختی برای سفارش‌گیری تعریف نشده — لطفاً با فروشگاه تماس بگیرید.
        </div>
      )}

      {payMethodOptions.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-[13px] text-stone-500">روش پرداخت</h2>
          <Card>
            <CardBody className="space-y-2">
              {payMethodOptions.length > 1 ? (
                <Toggle value={payMethod} onChange={setPayMethod} options={payMethodOptions} />
              ) : (
                <p className="text-[13px] text-stone-700">{payMethodOptions[0]!.label}</p>
              )}
              <p className="text-[11.5px] text-stone-400">
                {payMethod === 'cash'
                  ? `پرداخت نقدی ${serviceType === 'delivery' ? '— هنگام تحویل به پیک' : '— هنگام دریافت حضوری'}`
                  : 'پس از ثبت سفارش به درگاه پرداخت آنلاین منتقل می‌شوید.'}
              </p>
            </CardBody>
          </Card>
        </section>
      )}

      <section className="mb-5">
        <h2 className="mb-2 text-[13px] text-stone-500">اطلاعات تماس</h2>
        <Card>
          <CardBody className="space-y-4">
            <Field label="نام">
              <Input
                icon={User}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="نام و نام خانوادگی"
              />
            </Field>
            <Field label="تلفن">
              <Input
                icon={Phone}
                dir="ltr"
                inputMode="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="09xxxxxxxxx"
              />
            </Field>
            <Field label="یادداشت" hint="اختیاری">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="توضیحات سفارش" rows={2} />
            </Field>
          </CardBody>
        </Card>
      </section>

      <section className="mb-5">
        <h2 className="mb-2 text-[13px] text-stone-500">خلاصه</h2>
        <Card>
          <CardBody className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between text-stone-600">
              <span>جمع اقلام</span>
              <span>{fmt(subtotal)} تومان</span>
            </div>
            {serviceType === 'delivery' && (
              <div className="flex items-center justify-between text-stone-600">
                <span>هزینه‌ی ارسال</span>
                <span>{fmt(deliveryFee)} تومان</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-stone-600">
                <span>تخفیف</span>
                <span>−{fmt(discount)} تومان</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-stone-100 pt-2 text-[15px] text-stone-800">
              <span>مبلغ قابل پرداخت</span>
              <span>{fmt(total)} تومان</span>
            </div>
            {remaining > 0 && (
              <p className="text-[11.5px] text-amber-600">{fmt(remaining)} تومان تا حداقل سفارش</p>
            )}
          </CardBody>
        </Card>
      </section>

      {submitError && (
        <div className="mb-5 rounded-md border border-rose-100 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
          {submitError}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11.5px] text-stone-400">{toFa(cartItems.length)} قلم</div>
            <div className="text-[15px] text-stone-800">{fmt(total)} تومان</div>
          </div>
          <Button variant="primary" loading={submitting} disabled={!canSubmit} onClick={handleSubmit}>
            {payMethod === 'online' ? 'پرداخت و ثبت سفارش' : 'ثبت سفارش'}
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
