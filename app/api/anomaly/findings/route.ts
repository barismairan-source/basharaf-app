import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/anomaly/findings
 * فیلترها: severity, status, branchId, ruleKey
 * حداکثر ۲۰۰ یافته، مرتب بر اساس detectedAt DESC
 */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const severity = searchParams.get('severity');
    const status   = searchParams.get('status');
    const branchId = searchParams.get('branchId');
    const ruleKey  = searchParams.get('ruleKey');

    const conditions = [
      severity ? eq(schema.anomalyFindings.severity, severity) : undefined,
      status   ? eq(schema.anomalyFindings.status, status)     : undefined,
      branchId ? eq(schema.anomalyFindings.branchId, branchId) : undefined,
      ruleKey  ? eq(schema.anomalyFindings.ruleKey, ruleKey)   : undefined,
    ].filter((c): c is NonNullable<typeof c> => c != null);

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const findings = await db
      .select({
        id: schema.anomalyFindings.id,
        ruleKey: schema.anomalyFindings.ruleKey,
        severity: schema.anomalyFindings.severity,
        status: schema.anomalyFindings.status,
        branchId: schema.anomalyFindings.branchId,
        branchName: schema.branches.name,
        entityType: schema.anomalyFindings.entityType,
        entityId: schema.anomalyFindings.entityId,
        jalaliDate: schema.anomalyFindings.jalaliDate,
        detectedAt: schema.anomalyFindings.detectedAt,
        resolvedAt: schema.anomalyFindings.resolvedAt,
        details: schema.anomalyFindings.details,
        note: schema.anomalyFindings.note,
      })
      .from(schema.anomalyFindings)
      .leftJoin(schema.branches, eq(schema.anomalyFindings.branchId, schema.branches.id))
      .where(where)
      .orderBy(desc(schema.anomalyFindings.detectedAt))
      .limit(200);

    // شعب برای فیلتر dropdown
    const branches = await db
      .select({ id: schema.branches.id, name: schema.branches.name })
      .from(schema.branches)
      .orderBy(schema.branches.name);

    return NextResponse.json({ findings, branches });
  } catch (e) {
    return handleError(e);
  }
}
