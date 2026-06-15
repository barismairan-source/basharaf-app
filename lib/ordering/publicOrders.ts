import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { ApiError } from '@/lib/api-error';
import { getTodayJalali } from '@/lib/jalali';
import { fmt } from '@/lib/utils';
import { rowToPublicOrder } from '@/lib/db/ordering.serializers';
import { getDefaultBranch, isWithinOpenHours } from './publicMenu';
import { getOrdSettings } from './settings';
import type { CreateOrderInput, PublicOrder } from '@/types';

type OrderRow = typeof schema.orders.$inferSelect;
type OrdZoneRow = typeof schema.ordZones.$inferSelect;

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * شماره‌ی سفارش خوانا: ORD-{تاریخ شمسی فشرده}-{۶ کاراکتر تصادفی}.
 * یکتایی واقعی را orders_order_no_uidx تضمین می‌کند.
 */
function generateOrderNo(): string {
  const compact = getTodayJalali()
    .split('')
    .map((ch) => {
      const idx = PERSIAN_DIGITS.indexOf(ch);
      return idx === -1 ? '' : String(idx);
    })
    .join('');
  const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `ORD-${compact}-${suffix}`;
}

/** بار کامل سفارش (order + order_lines + نام محدوده‌ی ارسال) برای پاسخ عمومی. */
async function loadOrderDetail(order: OrderRow): Promise<PublicOrder> {
  const lines = await db.select().from(schema.orderLines)
    .where(eq(schema.orderLines.orderId, order.id));

  let zoneName: string | null = null;
  if (order.zoneId) {
    const [zone] = await db.select().from(schema.ordZones)
      .where(eq(schema.ordZones.id, order.zoneId)).limit(1);
    zoneName = zone?.name ?? null;
  }

  return rowToPublicOrder(order, lines, zoneName);
}

/**
 * ثبت سفارش عمومی (نقدی یا آنلاین) — /order/checkout.
 *
 * - idempotent با client_token: اگر سفارشی با همین token باشد، همان برگردانده می‌شود.
 * - قیمت‌ها از menu_items دوباره خوانده می‌شود؛ به subtotal/total ارسالی از کلاینت اعتماد نمی‌شود.
 * - order_lines از روی snapshot نام/قیمت ساخته می‌شود (نه FK زنده).
 * - همه‌ی insertها (orders + order_lines + order_events) در یک db.transaction اتمیک.
 */
export async function createPublicOrder(input: CreateOrderInput): Promise<{ order: PublicOrder; isNew: boolean }> {
  const [existing] = await db.select().from(schema.orders)
    .where(eq(schema.orders.clientToken, input.clientToken)).limit(1);
  if (existing) {
    return { order: await loadOrderDetail(existing), isNew: false };
  }

  const branch = await getDefaultBranch();
  if (!branch) throw new ApiError(404, 'فروشگاه برای سفارش آنلاین در دسترس نیست', 'NO_BRANCH');

  const settings = await getOrdSettings(branch.id);
  if (!settings.isOpen || !isWithinOpenHours(settings.openTime, settings.closeTime)) {
    throw new ApiError(422, 'هم‌اکنون امکان ثبت سفارش وجود ندارد — فروشگاه بسته است', 'SHOP_CLOSED');
  }
  if (input.serviceType === 'delivery' && !settings.deliveryEnabled) {
    throw new ApiError(422, 'سفارش با ارسال در حال حاضر فعال نیست', 'DELIVERY_DISABLED');
  }
  if (input.serviceType === 'pickup' && !settings.pickupEnabled) {
    throw new ApiError(422, 'سفارش با تحویل حضوری در حال حاضر فعال نیست', 'PICKUP_DISABLED');
  }
  if (input.payMethod === 'cash' && !settings.payCash) {
    throw new ApiError(422, 'پرداخت نقدی در حال حاضر فعال نیست', 'CASH_DISABLED');
  }
  if (input.payMethod === 'online' && !settings.payOnline) {
    throw new ApiError(422, 'پرداخت آنلاین در حال حاضر فعال نیست', 'ONLINE_DISABLED');
  }

  let zone: OrdZoneRow | null = null;
  if (input.serviceType === 'delivery') {
    if (!input.zoneId) throw new ApiError(422, 'انتخاب محدوده‌ی ارسال الزامی است', 'ZONE_REQUIRED');
    if (!input.address || input.address.trim().length < 5) {
      throw new ApiError(422, 'آدرس را کامل وارد کنید', 'ADDRESS_REQUIRED');
    }
    const [z] = await db.select().from(schema.ordZones)
      .where(and(
        eq(schema.ordZones.id, input.zoneId),
        eq(schema.ordZones.branchId, branch.id),
        eq(schema.ordZones.isActive, true)
      )).limit(1);
    if (!z) throw new ApiError(404, 'محدوده‌ی ارسال نامعتبر است', 'ZONE_NOT_FOUND');
    zone = z;
  }

  // قیمت‌ها را دوباره از menu_items می‌خوانیم — به مبلغ ارسالی از کلاینت اعتماد نمی‌کنیم.
  const itemIds = input.items.map((i) => i.id);
  const rows = await db.select().from(schema.menuItems)
    .where(and(
      inArray(schema.menuItems.id, itemIds),
      eq(schema.menuItems.inTakeaway, true),
      eq(schema.menuItems.isAvailable, true)
    ));
  const priceMap = new Map(rows.map((r) => [r.id, { name: r.titleFa, price: Number(r.priceTakeaway ?? r.price ?? 0) }]));

  const lines: { itemName: string; unitPrice: number; qty: number; lineTotal: number }[] = [];
  let subtotal = 0;
  for (const it of input.items) {
    const info = priceMap.get(it.id);
    if (!info) throw new ApiError(422, 'یک یا چند آیتم سبد دیگر در دسترس نیست', 'ITEM_UNAVAILABLE');
    const lineTotal = info.price * it.qty;
    lines.push({ itemName: info.name, unitPrice: info.price, qty: it.qty, lineTotal });
    subtotal += lineTotal;
  }

  if (subtotal < settings.minOrder) {
    throw new ApiError(422, `حداقل سفارش ${fmt(settings.minOrder)} تومان است`, 'BELOW_MIN_ORDER');
  }
  if (zone && subtotal < zone.minOrder) {
    throw new ApiError(422, `حداقل سفارش برای این محدوده ${fmt(zone.minOrder)} تومان است`, 'BELOW_ZONE_MIN_ORDER');
  }

  const deliveryFee = zone ? Number(zone.deliveryFee) : 0;
  const discount = 0;
  const total = subtotal + deliveryFee - discount;
  const orderNo = generateOrderNo();
  const trackToken = crypto.randomUUID();
  const jalaliDate = getTodayJalali();

  const { order, insertedLines } = await db.transaction(async (tx) => {
    const [order] = await tx.insert(schema.orders).values({
      branchId: branch.id,
      orderNo,
      trackToken,
      clientToken: input.clientToken,
      serviceType: input.serviceType,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      address: input.serviceType === 'delivery' ? (input.address ?? null) : null,
      zoneId: zone?.id ?? null,
      pickupTime: input.serviceType === 'pickup' ? (input.pickupTime || null) : null,
      subtotal,
      deliveryFee,
      discount,
      total,
      payMethod: input.payMethod,
      payStatus: 'unpaid',
      jalaliDate,
      note: input.note || null,
    }).returning();
    if (!order) throw new ApiError(500, 'خطا در ثبت سفارش', 'INSERT_FAILED');

    const insertedLines = [];
    for (const line of lines) {
      const [l] = await tx.insert(schema.orderLines).values({ orderId: order.id, ...line }).returning();
      insertedLines.push(l!);
    }

    await tx.insert(schema.orderEvents).values({
      orderId: order.id,
      fromStatus: null,
      toStatus: 'received',
    });

    return { order, insertedLines };
  });

  return { order: rowToPublicOrder(order, insertedLines, zone?.name ?? null), isNew: true };
}

/** سفارش با track_token برای صفحه‌ی عمومی /order/track/[token]. */
export async function getPublicOrderByTrackToken(token: string): Promise<PublicOrder | null> {
  const [order] = await db.select().from(schema.orders)
    .where(eq(schema.orders.trackToken, token)).limit(1);
  if (!order) return null;
  return loadOrderDetail(order);
}
