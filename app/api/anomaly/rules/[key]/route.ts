import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  thresholds: z.record(z.string(), z.number()).optional(),
  smsEnabled: z.boolean().optional(),
});

/**
 * PATCH /api/anomaly/rules/[key]
 * به‌روزرسانی enabled + thresholds قانون کارآگاه.
 */
export async function PATCH(req: Request, { params }: { params: { key: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());

    if (input.enabled !== undefined || input.thresholds !== undefined) {
      const [updated] = await db
        .update(schema.anomalyRules)
        .set({
          ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
          ...(input.thresholds !== undefined ? { thresholds: input.thresholds } : {}),
        })
        .where(eq(schema.anomalyRules.ruleKey, params.key))
        .returning();
      if (!updated) throw new ApiError(404, 'قانون پیدا نشد', 'NOT_FOUND');
    }

    // به‌روزرسانی smsEnabled در notification_rules
    if (input.smsEnabled !== undefined) {
      await db
        .update(schema.notificationRules)
        .set({ smsEnabled: input.smsEnabled })
        .where(eq(schema.notificationRules.key, params.key));
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
