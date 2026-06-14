'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Minus, Plus, ShoppingBag } from 'lucide-react';
import { Button, Card, Chip, Empty } from '@/components/ui';
import { fmt, toFa } from '@/lib/utils';
import { publicOrderRepo } from '@/lib/repos/publicOrder.api';
import { loadCart, saveCart, type Cart } from '@/lib/ordering/cart';
import type { PublicOrderItem, PublicOrderMenu, PublicOrderSection } from '@/types';

export default function PublicOrderPage() {
  const router = useRouter();
  const [menu, setMenu] = useState<PublicOrderMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCart(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCart(cart);
  }, [cart, hydrated]);

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

  const itemsById = useMemo(() => {
    const map = new Map<string, PublicOrderItem>();
    menu?.sections.forEach((section) => section.items.forEach((item) => map.set(item.id, item)));
    return map;
  }, [menu]);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((sum, qty) => sum + qty, 0),
    [cart]
  );

  const subtotal = useMemo(() => {
    let total = 0;
    for (const [id, qty] of Object.entries(cart)) {
      const item = itemsById.get(id);
      if (item) total += item.price * qty;
    }
    return total;
  }, [cart, itemsById]);

  function setQty(id: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  }

  const isOpenNow = menu?.settings.isOpenNow ?? false;
  const minOrder = menu?.settings.minOrder ?? 0;
  const remaining = Math.max(0, minOrder - subtotal);
  const canContinue = isOpenNow && cartCount > 0 && remaining === 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[13px] text-stone-400">
        در حال بارگذاری منو…
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <Empty
          title="سفارش آنلاین در دسترس نیست"
          sub={error ?? 'فروشگاهی برای سفارش بیرون‌بر یافت نشد.'}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-lg text-stone-800 sm:text-xl">{menu.branch.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {isOpenNow ? <Chip tone="green">باز است</Chip> : <Chip tone="red">اکنون بسته است</Chip>}
          <span className="inline-flex items-center gap-1 text-[12px] text-stone-500">
            <Clock size={12} strokeWidth={1.5} />
            ساعت کاری {toFa(menu.settings.openTime)} تا {toFa(menu.settings.closeTime)}
          </span>
        </div>
        {minOrder > 0 && (
          <p className="mt-2 text-[12px] text-stone-500">حداقل سفارش: {fmt(minOrder)} تومان</p>
        )}
      </header>

      {!isOpenNow && (
        <div className="mb-5 rounded-md border border-rose-100 bg-rose-50 px-3 py-2.5 text-[12.5px] text-rose-700">
          اکنون خارج از ساعت کاری یا تعطیل است — امکان ثبت سفارش وجود ندارد.
        </div>
      )}

      {menu.sections.length === 0 && (
        <Empty title="منوی بیرون‌بر هنوز آماده نشده است" sub="لطفاً بعداً دوباره سر بزنید." />
      )}

      {menu.sections.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          cart={cart}
          onChange={setQty}
          disabled={!isOpenNow}
        />
      ))}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 border-t border-stone-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11.5px] text-stone-400">{toFa(cartCount)} قلم</div>
              <div className="text-[15px] text-stone-800">{fmt(subtotal)} تومان</div>
              {remaining > 0 && (
                <div className="text-[11px] text-amber-600">
                  {fmt(remaining)} تومان تا حداقل سفارش
                </div>
              )}
            </div>
            <Button
              variant="primary"
              icon={ShoppingBag}
              disabled={!canContinue}
              onClick={() => router.push('/order/checkout')}
            >
              ادامه
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionBlock({
  section,
  cart,
  onChange,
  disabled,
}: {
  section: PublicOrderSection;
  cart: Cart;
  onChange: (id: string, qty: number) => void;
  disabled: boolean;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[13px] text-stone-500">{section.labelFa}</h2>
      <Card>
        <div className="divide-y divide-stone-100">
          {section.items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              qty={cart[item.id] ?? 0}
              onChange={(qty) => onChange(item.id, qty)}
              disabled={disabled}
            />
          ))}
        </div>
      </Card>
    </section>
  );
}

function ItemRow({
  item,
  qty,
  onChange,
  disabled,
}: {
  item: PublicOrderItem;
  qty: number;
  onChange: (qty: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] text-stone-800">{item.titleFa}</div>
        {item.descriptionFa && (
          <div className="mt-0.5 text-[11.5px] leading-relaxed text-stone-400">
            {item.descriptionFa}
          </div>
        )}
        <div className="mt-1 text-[12.5px] text-stone-600">{fmt(item.price)} تومان</div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        {qty > 0 && (
          <>
            <button
              type="button"
              aria-label="کم کردن"
              disabled={disabled}
              onClick={() => onChange(qty - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus size={14} strokeWidth={1.5} />
            </button>
            <span className="w-5 text-center text-[13px] tabular-nums text-stone-800">
              {toFa(qty)}
            </span>
          </>
        )}
        <button
          type="button"
          aria-label="افزودن"
          disabled={disabled}
          onClick={() => onChange(qty + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
