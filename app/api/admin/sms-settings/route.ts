import { NextResponse } from 'next/server';
import { inArray, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

const SMS_KEYS = ['sms.daily_cap_per_phone', 'sms.dedup_window_hours'] as const;

/** GET /api/admin/sms-settings — تنظیمات SMS از app_settings */
export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select()
      .from(schema.appSettings)
      .where(inArray(schema.appSettings.key, [...SMS_KEYS]));

    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      dailyCap: parseInt(map['sms.daily_cap_per_phone'] ?? '5', 10),
      dedupHours: parseInt(map['sms.dedup_window_hours'] ?? '2', 10),
    });
  } catch (e) {
    return handleError(e);
  }
}

const patchSchema = z.object({
  dailyCap: z.number().int().min(1).max(50).optional(),
  dedupHours: z.number().int().min(0).max(24).optional(),
});

/** PATCH /api/admin/sms-settings — به‌روزرسانی تنظیمات SMS */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await req.json());

    if (body.dailyCap !== undefined) {
      await db
        .update(schema.appSettings)
        .set({ value: String(body.dailyCap), updatedAt: new Date() })
        .where(eq(schema.appSettings.key, 'sms.daily_cap_per_phone'));
    }
    if (body.dedupHours !== undefined) {
      await db
        .update(schema.appSettings)
        .set({ value: String(body.dedupHours), updatedAt: new Date() })
        .where(eq(schema.appSettings.key, 'sms.dedup_window_hours'));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
