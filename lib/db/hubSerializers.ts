import type { schema } from './client';

export function rowToHubItem(row: typeof schema.linkHubItems.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind,
    label: row.label,
    url: row.url,
    isVisible: row.isVisible,
    sortOrder: row.sortOrder,
  };
}

export function rowToHubSettings(row: typeof schema.linkHubSettings.$inferSelect) {
  return {
    title: row.title,
    bio: row.bio,
    addressFa: row.addressFa,
    mapUrl: row.mapUrl,
    showQr: row.showQr,
  };
}

/** فقط لینک‌های visible، به ترتیب sortOrder — برای صفحه‌ی عمومی. */
export function sortVisibleHubItems(rows: (typeof schema.linkHubItems.$inferSelect)[]) {
  return rows
    .map(rowToHubItem)
    .filter(item => item.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}
