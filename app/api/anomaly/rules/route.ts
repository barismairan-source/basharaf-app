import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/anomaly/rules
 * لیست قوانین کارآگاه با label از notification_rules.
 */
export async function GET() {
  try {
    await requireAdmin();

    const rules = await db
      .select({
        ruleKey: schema.anomalyRules.ruleKey,
        enabled: schema.anomalyRules.enabled,
        thresholds: schema.anomalyRules.thresholds,
        label: schema.notificationRules.label,
        description: schema.notificationRules.description,
        smsEnabled: schema.notificationRules.smsEnabled,
      })
      .from(schema.anomalyRules)
      .leftJoin(
        schema.notificationRules,
        eq(schema.anomalyRules.ruleKey, schema.notificationRules.key)
      )
      .orderBy(schema.anomalyRules.ruleKey);

    return NextResponse.json({ rules });
  } catch (e) {
    return handleError(e);
  }
}
