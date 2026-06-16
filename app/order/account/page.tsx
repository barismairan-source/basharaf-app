'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { MapPin, Package, Plus, Trash2, Star, Phone, User, LogOut, ChevronRight, Map as MapIcon } from 'lucide-react';
import { customerRepo } from '@/lib/repos/customer.api';
import { fmt, toFa } from '@/lib/utils';
import type { WebCustomer, WebCustomerAddress, WebCustomerOrder } from '@/types/webCustomer';

// dynamic import — Leaflet به window نیاز دارد و SSR را تحمل نمی‌کند
const AddressPicker = dynamic(
  () => import('@/components/order/AddressPicker'),
  { ssr: false }
);

// ─── صفحه‌ی اکانت مشتری (OTP Login + آدرس‌ها + سفارش‌ها) ─────────────

type Tab = 'addresses' | 'orders';

const STATUS_LABEL: Record<string, string> = {
  received: 'دریافت شد',
  confirmed: 'تأیید شد',
  preparing: 'در حال آماده‌سازی',
  ready: 'آماده',
  out_for_delivery: 'در راه',
  delivered: 'تحویل داده شد',
  completed: 'تکمیل شد',
  cancelled: 'لغو شد',
  rejected: 'رد شد',
};

const STATUS_COLOR: Record<string, string> = {
  received: 'bg-sky-50 text-sky-700',
  confirmed: 'bg-blue-50 text-blue-700',
  preparing: 'bg-amber-50 text-amber-700',
  ready: 'bg-emerald-50 text-emerald-700',
  out_for_delivery: 'bg-purple-50 text-purple-700',
  delivered: 'bg-green-50 text-green-700',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-stone-100 text-stone-500',
  rejected: 'bg-rose-50 text-rose-700',
};

// ─── فرم OTP ──────────────────────────────────────────────────────────

function OtpLoginForm({ onLogin }: { onLogin: (c: WebCustomer) => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await customerRepo.sendOtp(phone.trim());
      setStep('code');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const customer = await customerRepo.verifyOtp(phone.trim(), code.trim());
      onLogin(customer);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16" dir="rtl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-white">
          <Phone size={24} />
        </div>
        <h1 className="text-[17px] font-medium text-stone-800">ورود به حساب کاربری</h1>
        <p className="mt-1 text-[12.5px] text-stone-500">
          با شماره موبایل وارد شوید
        </p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12.5px] text-stone-600">شماره موبایل</label>
            <input
              type="tel"
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09xxxxxxxxx"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-center text-[14px] tracking-widest placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || phone.trim().length < 11}
            className="w-full rounded-xl bg-stone-900 py-3 text-[14px] text-white disabled:opacity-50"
          >
            {loading ? 'در حال ارسال…' : 'دریافت کد تأیید'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <p className="text-center text-[12.5px] text-stone-500">
            کد ۶ رقمی برای <span dir="ltr" className="font-medium text-stone-800">{phone}</span> ارسال شد
          </p>
          <div>
            <label className="mb-1.5 block text-[12.5px] text-stone-600">کد تأیید</label>
            <input
              type="text"
              dir="ltr"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="------"
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-center text-[18px] tracking-[0.4em] placeholder:text-stone-300 focus:border-stone-400 focus:outline-none"
            />
          </div>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-700">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className="w-full rounded-xl bg-stone-900 py-3 text-[14px] text-white disabled:opacity-50"
          >
            {loading ? 'در حال تأیید…' : 'ورود'}
          </button>
          <button
            type="button"
            onClick={() => { setStep('phone'); setCode(''); setError(null); }}
            className="w-full text-center text-[12px] text-stone-400 underline-offset-2 hover:underline"
          >
            تغییر شماره
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <Link href="/order" className="text-[12px] text-stone-400 underline-offset-2 hover:underline">
          بازگشت به منو
        </Link>
      </div>
    </div>
  );
}

// ─── پنل آدرس‌ها ──────────────────────────────────────────────────────

function AddressesTab({ customerId }: { customerId: string }) {
  void customerId;
  const [addresses, setAddresses] = useState<WebCustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', address: '', lat: null as number | null, lng: null as number | null });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await customerRepo.getAddresses();
      setAddresses(list);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await customerRepo.addAddress({
        title: form.title.trim(),
        address: form.address.trim(),
        lat: form.lat,
        lng: form.lng,
        isDefault: addresses.length === 0,
      });
      setForm({ title: '', address: '', lat: null, lng: null });
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('این آدرس حذف شود؟')) return;
    try {
      await customerRepo.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // silent
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await customerRepo.updateAddress(id, { isDefault: true });
      await load();
    } catch {
      // silent
    }
  }

  if (loading) {
    return <p className="py-8 text-center text-[12.5px] text-stone-400">در حال بارگذاری…</p>;
  }

  return (
    <>
      {/* AddressPicker modal */}
      {showMap && (
        <AddressPicker
          initialLat={form.lat ?? undefined}
          initialLng={form.lng ?? undefined}
          onConfirm={(lat, lng, addr) => {
            setForm((f) => ({ ...f, address: addr, lat, lng }));
            setShowMap(false);
          }}
          onClose={() => setShowMap(false)}
        />
      )}

      <div className="space-y-3">
        {addresses.length === 0 && !showForm && (
          <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-[12.5px] text-stone-400">
            هنوز آدرسی ذخیره نشده
          </p>
        )}

        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="flex items-start gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3"
          >
            <MapPin size={16} className="mt-0.5 shrink-0 text-stone-400" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium text-stone-700">{addr.title}</span>
                {addr.isDefault && (
                  <span className="flex items-center gap-0.5 text-[10.5px] text-amber-600">
                    <Star size={10} className="fill-current" /> پیش‌فرض
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12px] text-stone-500 leading-relaxed">{addr.address}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="text-[11px] text-stone-400 hover:text-amber-600"
                  title="تنظیم به عنوان پیش‌فرض"
                >
                  <Star size={14} />
                </button>
              )}
              <button
                onClick={() => handleDelete(addr.id)}
                className="text-[11px] text-stone-300 hover:text-rose-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {showForm ? (
          <form onSubmit={handleAdd} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-4 space-y-3">
            <div>
              <label className="mb-1 block text-[12px] text-stone-500">عنوان آدرس</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="مثلاً: خانه، محل کار"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] focus:border-stone-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] text-stone-500">آدرس کامل</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value, lat: null, lng: null }))}
                placeholder="آدرس کامل با کوچه و پلاک"
                rows={2}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-[13px] focus:border-stone-400 focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className="mt-1.5 flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-stone-800"
              >
                <MapIcon size={13} />
                انتخاب روی نقشه
                {form.lat && form.lng && (
                  <span className="text-[10.5px] text-emerald-600">✓ موقعیت ذخیره شد</span>
                )}
              </button>
            </div>
            {formError && (
              <p className="text-[12px] text-rose-600">{formError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !form.title.trim() || form.address.trim().length < 5}
                className="flex-1 rounded-lg bg-stone-900 py-2 text-[13px] text-white disabled:opacity-50"
              >
                {saving ? 'در حال ذخیره…' : 'ذخیره'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormError(null); setShowMap(false); }}
                className="rounded-lg border border-stone-200 px-3 py-2 text-[13px] text-stone-500"
              >
                انصراف
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 py-3 text-[13px] text-stone-500 hover:border-stone-400 hover:text-stone-700"
          >
            <Plus size={16} />
            افزودن آدرس جدید
          </button>
        )}
      </div>
    </>
  );
}

// ─── پنل سفارش‌ها ─────────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState<WebCustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customerRepo
      .getOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="py-8 text-center text-[12.5px] text-stone-400">در حال بارگذاری…</p>;
  }

  if (orders.length === 0) {
    return (
      <p className="rounded-xl bg-stone-50 px-4 py-6 text-center text-[12.5px] text-stone-400">
        هنوز سفارشی ثبت نشده
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/order/track/${order.trackToken}`}
          className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white px-4 py-3 hover:border-stone-200"
        >
          <Package size={16} className="shrink-0 text-stone-400" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-stone-700">{order.orderNo}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10.5px] ${STATUS_COLOR[order.status] ?? 'bg-stone-100 text-stone-600'}`}
              >
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-3 text-[11.5px] text-stone-400">
              <span>{order.jalaliDate}</span>
              <span>{fmt(order.total)} تومان</span>
            </div>
          </div>
          <ChevronRight size={14} className="shrink-0 text-stone-300" />
        </Link>
      ))}
    </div>
  );
}

// ─── صفحه‌ی اصلی ───────────────────────────────────────────────────────

export default function CustomerAccountPage() {
  const [customer, setCustomer] = useState<WebCustomer | null | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<Tab>('addresses');
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    customerRepo.getMe().then(setCustomer);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await customerRepo.logout();
    setCustomer(null);
    setLoggingOut(false);
  }

  // بارگذاری
  if (customer === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-stone-400" dir="rtl">
        در حال بارگذاری…
      </div>
    );
  }

  // نلاگین
  if (!customer) {
    return <OtpLoginForm onLogin={setCustomer} />;
  }

  // لاگین‌شده
  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6" dir="rtl">
      {/* هدر */}
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-stone-600">
            <User size={18} />
          </div>
          <div>
            <p className="text-[13px] font-medium text-stone-800">
              {customer.name ?? 'مشتری'}
            </p>
            <p dir="ltr" className="text-[12px] text-stone-500">{customer.phone}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 px-3 py-2 text-[12px] text-stone-500 hover:border-stone-300 hover:text-stone-700 disabled:opacity-50"
        >
          <LogOut size={13} />
          خروج
        </button>
      </header>

      {/* تب‌ها */}
      <div className="mb-5 flex rounded-xl border border-stone-100 bg-stone-50 p-1">
        {([
          { key: 'addresses' as Tab, label: 'آدرس‌های من', icon: MapPin },
          { key: 'orders' as Tab, label: 'سفارش‌های من', icon: Package },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[12.5px] transition-colors ${
              activeTab === key
                ? 'bg-white font-medium text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* محتوا */}
      {activeTab === 'addresses' ? (
        <AddressesTab customerId={customer.id} />
      ) : (
        <OrdersTab />
      )}

      {/* لینک منو */}
      <div className="mt-8 text-center">
        <Link href="/order" className="text-[12px] text-stone-400 underline-offset-2 hover:underline">
          بازگشت به منو
        </Link>
      </div>
    </div>
  );
}
