import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import type { PublicOrderItem, PublicOrderMenu, PublicOrderSection, PublicOrderSettings, PublicOrderZone } from '@/types';

type BranchRow = typeof schema.branches.$inferSelect;

/**
 * مقادیر پیش‌فرض ord_settings — مطابق default ستون‌ها در db-ordering-migration.sql.
 * این endpoint عمومی فقط‌خواندنی است، پس اگر ردیف ord_settings برای شعبه
 * هنوز ساخته نشده باشد (مثلاً قبل از اولین بازدید از /orders/settings)،
 * این مقادیر به‌جای آن برگردانده می‌شود — بدون insert.
 */
const DEFAULT_SETTINGS = {
  isOpen: true,
  openTime: '09:00',
  closeTime: '23:00',
  deliveryEnabled: true,
  pickupEnabled: true,
  payCash: true,
  payOnline: false,
  minOrder: 0,
};

/**
 * آیا الان (به‌وقت تهران) داخل بازه‌ی کاری [openTime, closeTime) هستیم.
 * - اگر openTime === closeTime → ۲۴ ساعته (همیشه باز).
 * - اگر closeTime < openTime → بازه از نیمه‌شب می‌گذرد (مثلاً ۱۸:۰۰ تا ۰۲:۰۰).
 */
function toMinutes(time: string): number {
  const [h, m] = time.split(':');
  const hh = Number(h);
  const mm = Number(m);
  return Number.isNaN(hh) || Number.isNaN(mm) ? NaN : hh * 60 + mm;
}

export function isWithinOpenHours(openTime: string, closeTime: string, now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tehran',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const nowMin = hh * 60 + mm;

  const openMin = toMinutes(openTime);
  const closeMin = toMinutes(closeTime);
  if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return true;

  if (openMin === closeMin) return true;
  if (closeMin > openMin) return nowMin >= openMin && nowMin < closeMin;
  return nowMin >= openMin || nowMin < closeMin;
}

/**
 * شعبه‌ی پیش‌فرض برای سرویس‌های عمومی سفارش بیرون‌بر — اولین شعبه
 * (مطابق قرارداد branches[0] در پنل ادمین، بر اساس createdAt).
 * اگر هیچ شعبه‌ای وجود نداشته باشد null برمی‌گردد.
 */
export async function getDefaultBranch(): Promise<BranchRow | null> {
  const [branch] = await db.select().from(schema.branches)
    .orderBy(asc(schema.branches.createdAt)).limit(1);
  return branch ?? null;
}

/**
 * منوی عمومی سفارش بیرون‌بر برای صفحه‌ی /order و /order/checkout.
 * شعبه = اولین شعبه (مطابق قرارداد branches[0] در پنل ادمین).
 * کاتالوگ = menu_items با in_takeaway=true و isAvailable=true،
 * قیمت = COALESCE(price_takeaway, price).
 * محدوده‌های ارسال = ord_zones فعال شعبه (برای انتخاب در checkout).
 * اگر هیچ شعبه‌ای وجود نداشته باشد null برمی‌گردد.
 */
export async function getPublicOrderMenu(): Promise<PublicOrderMenu | null> {
  const branch = await getDefaultBranch();
  if (!branch) return null;

  const [settingsRows, categories, items, zoneRows] = await Promise.all([
    db.select().from(schema.ordSettings)
      .where(eq(schema.ordSettings.branchId, branch.id)).limit(1),
    db.select().from(schema.menuCategories).orderBy(asc(schema.menuCategories.sortOrder)),
    db.select().from(schema.menuItems)
      .where(and(eq(schema.menuItems.inTakeaway, true), eq(schema.menuItems.isAvailable, true)))
      .orderBy(asc(schema.menuItems.sortOrder)),
    db.select().from(schema.ordZones)
      .where(and(eq(schema.ordZones.branchId, branch.id), eq(schema.ordZones.isActive, true)))
      .orderBy(asc(schema.ordZones.name)),
  ]);

  const s = settingsRows[0];
  const base = s
    ? {
        isOpen: s.isOpen,
        openTime: s.openTime,
        closeTime: s.closeTime,
        deliveryEnabled: s.deliveryEnabled,
        pickupEnabled: s.pickupEnabled,
        payCash: s.payCash,
        payOnline: s.payOnline,
        minOrder: Number(s.minOrder),
        neshanApiKey: s.neshanApiKey,
      }
    : { ...DEFAULT_SETTINGS, neshanApiKey: null };

  const settings: PublicOrderSettings = {
    ...base,
    isOpenNow: base.isOpen && isWithinOpenHours(base.openTime, base.closeTime),
  };

  const buckets = new Map<string, PublicOrderItem[]>();
  for (const row of items) {
    const list = buckets.get(row.categoryId) ?? [];
    list.push({
      id: row.id,
      titleFa: row.titleFa,
      titleEn: row.titleEn,
      descriptionFa: row.descriptionFa,
      descriptionEn: row.descriptionEn,
      price: Number(row.priceTakeaway ?? row.price ?? 0),
    });
    buckets.set(row.categoryId, list);
  }

  const sections: PublicOrderSection[] = categories
    .map((cat) => ({
      id: cat.id,
      slug: cat.slug,
      labelFa: cat.labelFa,
      labelEn: cat.labelEn,
      items: buckets.get(cat.id) ?? [],
    }))
    .filter((section) => section.items.length > 0);

  const zones: PublicOrderZone[] = zoneRows.map((z) => ({
    id: z.id,
    name: z.name,
    deliveryFee: Number(z.deliveryFee),
    minOrder: Number(z.minOrder),
  }));

  return {
    branch: { id: branch.id, name: branch.name },
    settings,
    sections,
    zones,
  };
}
