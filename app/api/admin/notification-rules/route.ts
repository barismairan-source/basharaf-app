import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/admin/notification-rules — لیست همه قوانین */
export async function GET() {
  try {
    await requireAdmin();
    const rules = await db
      .select()
      .from(schema.notificationRules)
      .orderBy(schema.notificationRules.key);

    return NextResponse.json({
      rules: rules.map((r) => ({
        key: r.key,
        label: r.label,
        description: r.description,
        enabled: r.enabled,
        smsEnabled: r.smsEnabled,
        threshold: r.threshold,
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

const patchSchema = z.object({
  key: z.string().min(1),
  enabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  threshold: z.number().int().min(0).nullable().optional(),
});

/** PATCH /api/admin/notification-rules — آپدیت یک قانون */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await req.json());

    const patch: Partial<typeof schema.notificationRules.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.enabled !== undefined) patch.enabled = body.enabled;
    if (body.smsEnabled !== undefined) patch.smsEnabled = body.smsEnabled;
    if (body.threshold !== undefined) patch.threshold = body.threshold;

    const [updated] = await db
      .update(schema.notificationRules)
      .set(patch)
      .where(eq(schema.notificationRules.key, body.key))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: 'قانون پیدا نشد', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      rule: {
        key: updated.key,
        label: updated.label,
        description: updated.description,
        enabled: updated.enabled,
        smsEnabled: updated.smsEnabled,
        threshold: updated.threshold,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
