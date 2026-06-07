import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleError } from '@/lib/api-error';
import { rowToMenuItem, rowToMenuCategory } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';


/**
 * GET /api/menu — منوی کامل (عمومی، بدون auth).
 * دسته‌ها + آیتم‌ها + تنظیمات در یک پاسخ.
 */
export async function GET() {
  try {
    const [categories, items, settingsRows] = await Promise.all([
      db.select().from(schema.menuCategories).orderBy(asc(schema.menuCategories.sortOrder)),
      db.select().from(schema.menuItems).orderBy(asc(schema.menuItems.sortOrder)),
      db.select().from(schema.menuSettings).limit(1),
    ]);

    const buckets = new Map<string, ReturnType<typeof rowToMenuItem>[]>();
    for (const item of items) {
      const s = rowToMenuItem(item);
      if (!buckets.has(s.categoryId)) buckets.set(s.categoryId, []);
      buckets.get(s.categoryId)!.push(s);
    }

    const sections = categories.map(cat => ({
      ...rowToMenuCategory(cat),
      items: buckets.get(cat.id) ?? [],
    }));

    const s = settingsRows[0];
    const settings = s ? {
      faFont: s.faFont, phone: s.phone, addressFa: s.addressFa,
      addressEn: s.addressEn, instagram: s.instagram,
    } : { faFont: 'IRANMarker', phone: '', addressFa: '', addressEn: '', instagram: '' };

    return NextResponse.json({ sections, settings });
  } catch (e) {
    return handleError(e);
  }
}
