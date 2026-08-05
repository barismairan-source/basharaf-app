import { NextResponse } from 'next/server';
import { isNotNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleErrorLogged } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/recruitment/funnel — گزارش قیف استخدام. «استخدام واقعی» =
 * hiredAt IS NOT NULL (نه صرفاً status='accepted' — یک متقاضی می‌تواند
 * accepted شود ولی هنوز عملیات hire اتمیک را طی نکرده باشد، هرچند در حال
 * حاضر تنها مسیر رسیدن به accepted همان hire است).
 */
export async function GET() {
  try {
    await requireAdmin();
    const applications = await db.select().from(schema.jobApplications);
    const hiredEmployees = await db.select({
      employeeId: schema.employees.id, role: schema.employees.role, branchName: schema.employees.branchName,
      sourceApplicationId: schema.employees.sourceApplicationId,
    }).from(schema.employees).where(isNotNull(schema.employees.sourceApplicationId));

    const total = applications.length;
    const byStatus = { new: 0, shortlist: 0, accepted: 0, rejected: 0 } as Record<string, number>;
    for (const a of applications) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

    const hired = applications.filter(a => a.hiredAt);
    const shortlistedOrLater = applications.filter(a => a.status === 'shortlist' || a.status === 'accepted').length;

    const daysToHire = hired
      .map(a => (a.hiredAt!.getTime() - a.createdAt.getTime()) / 86_400_000)
      .filter(d => d >= 0);
    const avgDaysToHire = daysToHire.length > 0 ? daysToHire.reduce((s, d) => s + d, 0) / daysToHire.length : null;

    const referralCounts = new Map<string, { applications: number; hired: number }>();
    for (const a of applications) {
      const key = a.referralSource ?? 'نامشخص';
      const entry = referralCounts.get(key) ?? { applications: 0, hired: 0 };
      entry.applications += 1;
      if (a.hiredAt) entry.hired += 1;
      referralCounts.set(key, entry);
    }
    const topReferralSources = [...referralCounts.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.hired - a.hired)
      .slice(0, 5);

    const hireByRole = new Map<string, number>();
    for (const e of hiredEmployees) hireByRole.set(e.role, (hireByRole.get(e.role) ?? 0) + 1);

    return NextResponse.json({
      totalApplications: total,
      byStatus,
      hiredCount: hired.length,
      shortlistRate: total > 0 ? shortlistedOrLater / total : 0,
      acceptRate: total > 0 ? (byStatus.accepted ?? 0) / total : 0,
      hireRate: total > 0 ? hired.length / total : 0,
      avgDaysToHire,
      topReferralSources,
      hireCountByRole: [...hireByRole.entries()].map(([role, count]) => ({ role, count })),
    });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}
