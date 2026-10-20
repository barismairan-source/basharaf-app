import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan, branchScope } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { parseCidr } from '@/lib/attendance-clock/ip';

export const dynamic = 'force-dynamic';

/** GET /api/hr/clock/networks — IPهای مجاز شعبه‌ها (فقط فعال‌ها). */
export async function GET() {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.view');
    const scope = branchScope(session);
    const rows = await db.select({
      id: schema.branchAttendanceNetworks.id,
      branchId: schema.branchAttendanceNetworks.branchId,
      branchName: schema.branches.name,
      cidr: schema.branchAttendanceNetworks.cidr,
      label: schema.branchAttendanceNetworks.label,
      createdAt: schema.branchAttendanceNetworks.createdAt,
    }).from(schema.branchAttendanceNetworks)
      .innerJoin(schema.branches, eq(schema.branchAttendanceNetworks.branchId, schema.branches.id))
      .where(and(
        eq(schema.branchAttendanceNetworks.isActive, true),
        scope ? eq(schema.branchAttendanceNetworks.branchId, scope) : undefined,
      ))
      .orderBy(asc(schema.branches.name), asc(schema.branchAttendanceNetworks.createdAt));
    return NextResponse.json({ networks: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

const createSchema = z.object({
  branchId: z.string().uuid(),
  cidr: z.string().min(3).max(64),
  label: z.string().trim().max(80).nullable().optional(),
});

/** POST /api/hr/clock/networks — افزودن IP ثابت (یا بازه‌ی کوچک) برای یک شعبه. */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.clockSetup');
    const input = createSchema.parse(await req.json());
    assertBranch(session, input.branchId);
    const parsed = parseCidr(input.cidr);
    if (!parsed.ok) throw new ApiError(400, parsed.error, 'INVALID_CIDR');

    const [branch] = await db.select({ id: schema.branches.id }).from(schema.branches)
      .where(eq(schema.branches.id, input.branchId)).limit(1);
    if (!branch) throw new ApiError(404, 'شعبه پیدا نشد', 'BRANCH_NOT_FOUND');

    const [existing] = await db.select({ id: schema.branchAttendanceNetworks.id }).from(schema.branchAttendanceNetworks)
      .where(and(
        eq(schema.branchAttendanceNetworks.branchId, input.branchId),
        eq(schema.branchAttendanceNetworks.cidr, parsed.value.canonical),
        eq(schema.branchAttendanceNetworks.isActive, true),
      )).limit(1);
    if (existing) throw new ApiError(409, 'این نشانی قبلاً برای همین شعبه ثبت شده است', 'DUPLICATE');

    const [row] = await db.insert(schema.branchAttendanceNetworks).values({
      branchId: input.branchId, cidr: parsed.value.canonical, label: input.label || null, createdBy: session.sub,
    }).returning();
    void audit({ action: 'attendance.network.added', userId: session.sub, meta: { networkId: row!.id, branchId: input.branchId, cidr: parsed.value.canonical } });
    return NextResponse.json({ network: { id: row!.id, cidr: row!.cidr } }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
