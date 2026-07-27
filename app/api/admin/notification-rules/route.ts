import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { isEmailConfigured } from '@/lib/notifications/channels/email';
import { isPushConfigured } from '@/lib/notifications/channels/push';

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
        key:          r.key,
        label:        r.label,
        description:  r.description,
        enabled:      r.enabled,
        smsEnabled:   r.smsEnabled,
        inAppEnabled: r.inAppEnabled,
        emailEnabled: r.emailEnabled,
        pushEnabled:  r.pushEnabled,
        threshold:    r.threshold,
        updatedAt:    r.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

const patchSchema = z.object({
  key:          z.string().min(1),
  enabled:      z.boolean().optional(),
  smsEnabled:   z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  pushEnabled:  z.boolean().optional(),
  threshold:    z.number().int().min(0).nullable().optional(),
});

/** PATCH /api/admin/notification-rules — آپدیت یک قانون */
export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await req.json());

    // Guard: reject emailEnabled=true if SMTP is not fully configured
    // Uses the canonical isEmailConfigured() — all 5 fields required.
    if (body.emailEnabled === true) {
      if (!isEmailConfigured()) {
        return NextResponse.json(
          { error: 'ایمیل قابل فعال‌سازی نیست — تنظیمات SMTP پیکربندی نشده', code: 'SMTP_NOT_CONFIGURED' },
          { status: 422 }
        );
      }
    }

    // Guard: reject pushEnabled=true if VAPID is not fully configured —
    // same rationale as the SMTP guard above.
    if (body.pushEnabled === true) {
      if (!isPushConfigured()) {
        return NextResponse.json(
          { error: 'نوتیفیکیشن قابل فعال‌سازی نیست — VAPID پیکربندی نشده', code: 'VAPID_NOT_CONFIGURED' },
          { status: 422 }
        );
      }
    }

    const patch: Partial<typeof schema.notificationRules.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (body.enabled      !== undefined) patch.enabled      = body.enabled;
    if (body.smsEnabled   !== undefined) patch.smsEnabled   = body.smsEnabled;
    if (body.inAppEnabled !== undefined) patch.inAppEnabled = body.inAppEnabled;
    if (body.emailEnabled !== undefined) patch.emailEnabled = body.emailEnabled;
    if (body.pushEnabled  !== undefined) patch.pushEnabled  = body.pushEnabled;
    if (body.threshold    !== undefined) patch.threshold    = body.threshold;

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
        key:          updated.key,
        label:        updated.label,
        description:  updated.description,
        enabled:      updated.enabled,
        smsEnabled:   updated.smsEnabled,
        inAppEnabled: updated.inAppEnabled,
        emailEnabled: updated.emailEnabled,
        pushEnabled:  updated.pushEnabled,
        threshold:    updated.threshold,
        updatedAt:    updated.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
