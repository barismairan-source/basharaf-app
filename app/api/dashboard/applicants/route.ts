import { NextResponse } from 'next/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/** GET /api/dashboard/applicants
 * داوطلبان تازه: درخواست‌های با وضعیت `new` در ۷ روز اخیر.
 * حداکثر ۳ ردیف برای ویجت داشبورد + تعداد کل status=new.
 */
export async function GET() {
  try {
    await requireAdmin();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const whereNew = and(
      gte(schema.jobApplications.createdAt, since),
      eq(schema.jobApplications.status, 'new'),
    );

    const [countRow, rows] = await Promise.all([
      db
        .select({ total: sql<string>`COUNT(*)` })
        .from(schema.jobApplications)
        .where(whereNew),
      db
        .select({
          id: schema.jobApplications.id,
          firstName: schema.jobApplications.firstName,
          lastName: schema.jobApplications.lastName,
          area: schema.jobApplications.area,
          createdAt: schema.jobApplications.createdAt,
        })
        .from(schema.jobApplications)
        .where(whereNew)
        .orderBy(desc(schema.jobApplications.createdAt))
        .limit(3),
    ]);

    const totalNew = Number(countRow[0]?.total ?? 0);

    return NextResponse.json({
      hasActivity: totalNew > 0,
      totalNew,
      applicants: rows,
    });
  } catch (e) {
    return handleError(e);
  }
}
