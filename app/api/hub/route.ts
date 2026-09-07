import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { rowToHubItem, rowToHubSettings, sortVisibleHubItems } from '@/lib/db/hubSerializers';

export const dynamic = 'force-dynamic';

const DEFAULT_SETTINGS = { title: '', bio: '', addressFa: '', mapUrl: null, showQr: true };

/**
 * GET /api/hub — بدون پارامتر عمومی است (فقط لینک‌های visible، برای basharaf.me/safasity).
 * ?all=1: همه‌ی لینک‌ها اعم از مخفی — فقط ادمین (پنل مدیریت).
 */
export async function GET(req: Request) {
  try {
    const all = new URL(req.url).searchParams.get('all') === '1';
    if (all) await requireAdmin();

    const [items, settingsRows] = await Promise.all([
      db.select().from(schema.linkHubItems).orderBy(asc(schema.linkHubItems.sortOrder)),
      db.select().from(schema.linkHubSettings).limit(1),
    ]);

    const s = settingsRows[0];
    const settings = s ? rowToHubSettings(s) : DEFAULT_SETTINGS;

    return NextResponse.json({
      settings,
      items: all ? items.map(rowToHubItem) : sortVisibleHubItems(items),
    });
  } catch (e) {
    return handleError(e);
  }
}
