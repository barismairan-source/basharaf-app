import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleError } from '@/lib/api-error';
import { rowToMenuItem, rowToMenuCategory, rowToMenuSettings, buildPublicMenuSections } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = {
  faFont: 'IRANMarker', phone: '', addressFa: '', addressEn: '', instagram: '',
  showPriceHall: true, showPriceTakeaway: true, takeawaySlug: 'birun',
  hallTitle: null, takeawayTitle: null, hallNote: null, takeawayNote: null,
};

/**
 * GET /api/menu — منوی کامل (عمومی، بدون auth).
 * بدون پارامتر: داده‌ی خام همه‌ی دسته‌ها/آیتم‌ها (پنل ادمین).
 * ?channel=hall|takeaway: ساختار عمومی همان کانال (فیلتر + قیمت resolve‌شده) برای /m و /m/[slug].
 */
export async function GET(req: Request) {
  try {
    const channelParam = new URL(req.url).searchParams.get('channel');
    const channel = channelParam === 'takeaway' ? 'takeaway' : channelParam === 'hall' ? 'hall' : null;

    const [categories, items, settingsRows] = await Promise.all([
      db.select().from(schema.menuCategories).orderBy(asc(schema.menuCategories.sortOrder)),
      db.select().from(schema.menuItems).orderBy(asc(schema.menuItems.sortOrder)),
      db.select().from(schema.menuSettings).limit(1),
    ]);

    const s = settingsRows[0];
    const settings = s ? rowToMenuSettings(s) : DEFAULT_SETTINGS;

    if (channel) {
      const sections = buildPublicMenuSections(categories, items, channel, settings);
      return NextResponse.json({ sections, settings });
    }

    const buckets = new Map<string, ReturnType<typeof rowToMenuItem>[]>();
    for (const item of items) {
      const row = rowToMenuItem(item);
      if (!buckets.has(row.categoryId)) buckets.set(row.categoryId, []);
      buckets.get(row.categoryId)!.push(row);
    }

    const sections = categories.map(cat => ({
      ...rowToMenuCategory(cat),
      items: buckets.get(cat.id) ?? [],
    }));

    return NextResponse.json({ sections, settings });
  } catch (e) {
    return handleError(e);
  }
}
