import type { schema } from './client';

export function rowToMenuItem(row: typeof schema.menuItems.$inferSelect) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    titleEn: row.titleEn,
    titleFa: row.titleFa,
    descriptionEn: row.descriptionEn,
    descriptionFa: row.descriptionFa,
    price: row.price === null ? null : Number(row.price),
    priceTakeaway: row.priceTakeaway === null ? null : Number(row.priceTakeaway),
    inHall: row.inHall,
    inTakeaway: row.inTakeaway,
    isAvailable: row.isAvailable,
    sortOrder: row.sortOrder,
  };
}

export function rowToMenuCategory(row: typeof schema.menuCategories.$inferSelect) {
  return {
    id: row.id,
    slug: row.slug,
    labelEn: row.labelEn,
    labelFa: row.labelFa,
    sortOrder: row.sortOrder,
    vatRate: row.vatRate,
  };
}

export function rowToMenuSettings(row: typeof schema.menuSettings.$inferSelect) {
  return {
    faFont: row.faFont,
    phone: row.phone,
    addressFa: row.addressFa,
    addressEn: row.addressEn,
    instagram: row.instagram,
    showPriceHall: row.showPriceHall,
    showPriceTakeaway: row.showPriceTakeaway,
    takeawaySlug: row.takeawaySlug,
    hallTitle: row.hallTitle,
    takeawayTitle: row.takeawayTitle,
    hallNote: row.hallNote,
    takeawayNote: row.takeawayNote,
  };
}

export type MenuChannel = 'hall' | 'takeaway';

/**
 * تبدیل دسته‌ها/آیتم‌های خام به ساختار منوی عمومی یک کانال:
 * فقط آیتم‌های مجاز آن کانال، قیمت resolve‌شده (با لحاظ سوییچ نمایش قیمت)،
 * و دسته‌های بدون آیتم در آن کانال حذف می‌شوند.
 */
export function buildPublicMenuSections(
  categories: (typeof schema.menuCategories.$inferSelect)[],
  items: (typeof schema.menuItems.$inferSelect)[],
  channel: MenuChannel,
  settings: ReturnType<typeof rowToMenuSettings>,
) {
  const showPrice = channel === 'takeaway' ? settings.showPriceTakeaway : settings.showPriceHall;
  const buckets = new Map<string, ReturnType<typeof rowToMenuItem>[]>();

  for (const row of items) {
    const item = rowToMenuItem(row);
    if (channel === 'takeaway' ? !item.inTakeaway : !item.inHall) continue;
    const rawPrice = channel === 'takeaway' ? (item.priceTakeaway ?? item.price) : item.price;
    const list = buckets.get(item.categoryId) ?? [];
    list.push({ ...item, price: showPrice ? rawPrice : null });
    buckets.set(item.categoryId, list);
  }

  return categories
    .map(cat => ({ ...rowToMenuCategory(cat), items: buckets.get(cat.id) ?? [] }))
    .filter(section => section.items.length > 0);
}
