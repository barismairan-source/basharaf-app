import type { schema } from './client';

export function rowToMenuItem(row: typeof schema.menuItems.$inferSelect) {
  return {
    id: row.id,
    categoryId: row.categoryId,
    titleEn: row.titleEn,
    titleFa: row.titleFa,
    descriptionEn: row.descriptionEn,
    descriptionFa: row.descriptionFa,
    price: Number(row.price),
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
