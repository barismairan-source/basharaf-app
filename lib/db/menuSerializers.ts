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
