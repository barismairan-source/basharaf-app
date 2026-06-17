import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * /api/settings
 *
 * GET  → همه تنظیمات (همه کاربران authenticated)
 * PATCH → ویرایش یک تنظیم (فقط SuperAdmin)
 */

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.appSettings);
    // به شکل { key: value } برای استفاده آسان در client
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return NextResponse.json({ settings, rows });
  } catch (e) {
    return handleError(e);
  }
}

const patchSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(0).max(500),
});

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { key, value } = patchSchema.parse(body);

    await db
      .update(schema.appSettings)
      .set({ value, updatedAt: new Date() })
      .where(eq(schema.appSettings.key, key));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
