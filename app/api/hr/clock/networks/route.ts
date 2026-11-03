import { NextResponse } from 'next/server';
import { and, asc, eq, gt, inArray, isNull, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan, branchScope } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { parseCidr } from '@/lib/attendance-clock/ip';
import { TEMP_NETWORK_MINUTES } from '@/lib/attendance-clock/rules';

export const dynamic = 'force-dynamic';

/** GET /api/hr/clock/networks — IPهای مجاز شعبه‌ها: ثابت‌ها و دسترسی‌های موقتِ هنوز معتبر. */
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
      employeeId: schema.branchAttendanceNetworks.employeeId,
      employeeName: schema.employees.fullName,
      expiresAt: schema.branchAttendanceNetworks.expiresAt,
    }).from(schema.branchAttendanceNetworks)
      .innerJoin(schema.branches, eq(schema.branchAttendanceNetworks.branchId, schema.branches.id))
      .leftJoin(schema.employees, eq(schema.branchAttendanceNetworks.employeeId, schema.employees.id))
      .where(and(
        eq(schema.branchAttendanceNetworks.isActive, true),
        or(isNull(schema.branchAttendanceNetworks.expiresAt), gt(schema.branchAttendanceNetworks.expiresAt, new Date())),
        scope ? eq(schema.branchAttendanceNetworks.branchId, scope) : undefined,
      ))
      .orderBy(asc(schema.branches.name), asc(schema.branchAttendanceNetworks.createdAt));
    return NextResponse.json({
      networks: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt?.toISOString() ?? null })),
    });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

const createSchema = z.object({
  branchId: z.string().uuid(),
  cidr: z.string().min(3).max(64),
  label: z.string().trim().max(80).nullable().optional(),
  // دسترسی موقت: برای چه کسانی (خالی = همه) و چند دقیقه (خالی = IP ثابت بی‌انقضا)
  employeeIds: z.array(z.string().uuid()).max(50).optional(),
  minutes: z.number().int().refine((m) => (TEMP_NETWORK_MINUTES as readonly number[]).includes(m), 'مدت نامعتبر است').optional(),
});

/**
 * POST /api/hr/clock/networks — افزودن IP ثابت شعبه، یا دسترسی موقت: همان IP برای چند نفر خاص
 * و/یا تا چند ساعت. دسترسی موقت بعد از انقضا خودکار بی‌اثر می‌شود.
 */
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

    const employeeIds = [...new Set(input.employeeIds ?? [])];
    const expiresAt = input.minutes ? new Date(Date.now() + input.minutes * 60_000) : null;
    if (employeeIds.length > 0 && !expiresAt) throw new ApiError(400, 'IP برای افراد خاص باید مدت داشته باشد', 'TEMP_NEEDS_DURATION');

    if (employeeIds.length > 0) {
      const found = await db.select({ id: schema.employees.id, branchId: schema.employees.branchId }).from(schema.employees)
        .where(and(inArray(schema.employees.id, employeeIds), eq(schema.employees.isActive, true)));
      if (found.length !== employeeIds.length) throw new ApiError(404, 'یکی از افراد پیدا نشد', 'EMPLOYEE_NOT_FOUND');
      for (const e of found) assertBranch(session, e.branchId);
    } else if (!expiresAt) {
      const [existing] = await db.select({ id: schema.branchAttendanceNetworks.id }).from(schema.branchAttendanceNetworks)
        .where(and(
          eq(schema.branchAttendanceNetworks.branchId, input.branchId),
          eq(schema.branchAttendanceNetworks.cidr, parsed.value.canonical),
          eq(schema.branchAttendanceNetworks.isActive, true),
          isNull(schema.branchAttendanceNetworks.employeeId),
          isNull(schema.branchAttendanceNetworks.expiresAt),
        )).limit(1);
      if (existing) throw new ApiError(409, 'این نشانی قبلاً برای همین شعبه ثبت شده است', 'DUPLICATE');
    }

    const base = { branchId: input.branchId, cidr: parsed.value.canonical, label: input.label || null, createdBy: session.sub, expiresAt };
    const rows = await db.insert(schema.branchAttendanceNetworks)
      .values(employeeIds.length > 0 ? employeeIds.map((employeeId) => ({ ...base, employeeId })) : [base])
      .returning({ id: schema.branchAttendanceNetworks.id, cidr: schema.branchAttendanceNetworks.cidr });
    void audit({
      action: 'attendance.network.added', userId: session.sub,
      meta: { networkIds: rows.map((r) => r.id), branchId: input.branchId, cidr: parsed.value.canonical, employeeIds, expiresAt: expiresAt?.toISOString() ?? null },
    });
    return NextResponse.json({ network: { id: rows[0]!.id, cidr: rows[0]!.cidr }, count: rows.length }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
