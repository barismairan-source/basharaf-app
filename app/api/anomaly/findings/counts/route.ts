import { NextResponse } from 'next/server';
import { and, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/anomaly/findings/counts
 * تعداد یافته‌های باز به تفکیک شدت — برای badge و کارت‌های خلاصه.
 */
export async function GET() {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        severity: schema.anomalyFindings.severity,
        count: sql<string>`COUNT(*)`,
      })
      .from(schema.anomalyFindings)
      .where(inArray(schema.anomalyFindings.status, ['new', 'investigating']))
      .groupBy(schema.anomalyFindings.severity);

    const counts = { high: 0, medium: 0, low: 0, total: 0 };
    for (const row of rows) {
      const n = parseInt(row.count);
      if (row.severity === 'high') counts.high = n;
      else if (row.severity === 'medium') counts.medium = n;
      else if (row.severity === 'low') counts.low = n;
      counts.total += n;
    }

    return NextResponse.json(counts);
  } catch (e) {
    return handleError(e);
  }
}
