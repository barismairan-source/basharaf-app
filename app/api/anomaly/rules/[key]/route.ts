import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  thresholds: z.record(z.string(), z.number()).optional(),
});

/**
 * PATCH /api/anomaly/rules/[key]
 * به‌روزرسانی enabled (موتور تشخیص) + thresholds قانون کارآگاه.
 *
 * کانال‌های ارسال (sms/email/in-app) و گیرندگان اینجا کنترل نمی‌شوند —
 * تنها منبع کنترل، /api/admin/notification-rules و
 * /api/admin/notification-audience است (مرکز اعلان V2).
 */
export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());

    const [updated] = await db
      .update(schema.anomalyRules)
      .set({
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
        ...(input.thresholds !== undefined ? { thresholds: input.thresholds } : {}),
      })
      .where(eq(schema.anomalyRules.ruleKey, params.key))
      .returning();
    if (!updated) throw new ApiError(404, 'قانون پیدا نشد', 'NOT_FOUND');

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
