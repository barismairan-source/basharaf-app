import { NextResponse } from 'next/server';
import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertBranch, assertCan } from '@/lib/auth/apiAccess';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { getTodayJalali, todayIsoTehran } from '@/lib/jalali';
import { toLatinDigits } from '@/lib/staff-panel/pure';
import { loadMonthToDate } from '@/lib/staff-panel/monthPayServer';
import { hourlyRateForBasis, settingsToBasis } from '@/lib/staff-panel/monthToDate';

export const dynamic = 'force-dynamic';

async function employeeInScope(session: Awaited<ReturnType<typeof requireSession>>, employeeId: string) {
  if (!z.string().uuid().safeParse(employeeId).success) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
  const [emp] = await db.select({ branchId: schema.employees.branchId, fullName: schema.employees.fullName })
    .from(schema.employees).where(eq(schema.employees.id, employeeId)).limit(1);
  if (!emp) throw new ApiError(404, 'پیدا نشد', 'NOT_FOUND');
  assertBranch(session, emp.branchId);
  return emp;
}

/** GET /api/hr/staff-pay?employeeId= — حقوق فعلی یک نفر (همان مبنایی که در پنلش می‌بیند) برای فرم مدیر. */
export async function GET(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.compensation.view');
    const employeeId = new URL(req.url).searchParams.get('employeeId') ?? '';
    const emp = await employeeInScope(session, employeeId);
    const [jy, jm] = toLatinDigits(getTodayJalali()).split('/');
    const month = await loadMonthToDate(employeeId, `${jy}-${jm}`);
    return NextResponse.json({ fullName: emp.fullName, basis: month?.basis ?? null, payTitle: month?.payTitle ?? null, structure: month?.structure ?? [] });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

const putSchema = z.object({
  employeeId: z.string().uuid(),
  payTitle: z.string().trim().max(80).nullable().optional(),
  model: z.enum(['hourly', 'daily']),
  agreedSalary: z.number().int().positive().max(100_000_000_000),
  standardHours: z.number().int().min(1).max(400).default(208),
  overtimeMultiplier: z.number().min(1).max(5).default(1.4),
  baseDays: z.number().int().min(1).max(31).default(24),
  bonusEveryShifts: z.number().int().min(1).max(31).default(6),
  fullSalary: z.boolean().default(false),
});

/**
 * PUT /api/hr/staff-pay — ذخیره‌ی تنظیم حقوق یک نفر. نرخ ساعتی همان نفر هم از امروز هماهنگ می‌شود تا
 * ورود/خروج گوشی به حضور تبدیل شود. ریز کارکردهای ثبت‌شده، فیش‌ها و حسابداری دست نمی‌خورند.
 */
export async function PUT(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.compensation.manage');
    const input = putSchema.parse(await req.json());
    await employeeInScope(session, input.employeeId);

    const values = {
      payTitle: input.payTitle || null, model: input.model, agreedSalary: input.agreedSalary,
      standardHours: input.standardHours, overtimeMultiplier: input.overtimeMultiplier.toFixed(2),
      baseDays: input.baseDays, bonusEveryShifts: input.bonusEveryShifts, fullSalary: input.model === 'daily' && input.fullSalary,
      updatedBy: session.sub, updatedAt: new Date(),
    };
    const rate = hourlyRateForBasis(settingsToBasis(values));
    const todayIso = todayIsoTehran();
    const today = new Date(todayIso + 'T00:00:00Z');

    await db.transaction(async (tx) => {
      await tx.insert(schema.staffPaySettings).values({ employeeId: input.employeeId, ...values })
        .onConflictDoUpdate({ target: schema.staffPaySettings.employeeId, set: values });

      const [active] = await tx.select().from(schema.employeeHourlyRates)
        .where(and(
          eq(schema.employeeHourlyRates.employeeId, input.employeeId),
          lte(schema.employeeHourlyRates.effectiveFrom, today),
          or(isNull(schema.employeeHourlyRates.effectiveTo), gte(schema.employeeHourlyRates.effectiveTo, today)),
        ))
        .orderBy(desc(schema.employeeHourlyRates.effectiveFrom)).limit(1);
      if (active && Number(active.hourlyRate) === rate) return;
      if (active && active.effectiveFrom.toISOString().slice(0, 10) === todayIso) {
        await tx.update(schema.employeeHourlyRates).set({ hourlyRate: rate }).where(eq(schema.employeeHourlyRates.id, active.id));
        return;
      }
      if (active) {
        await tx.update(schema.employeeHourlyRates)
          .set({ effectiveTo: new Date(today.getTime() - 86400000) })
          .where(eq(schema.employeeHourlyRates.id, active.id));
      }
      await tx.insert(schema.employeeHourlyRates).values({
        employeeId: input.employeeId, hourlyRate: rate, effectiveFrom: today, createdBy: session.sub, reason: 'از تنظیم حقوق در «پرسنل و حقوق»',
      });
    });
    void audit({ action: 'staff.pay.updated', userId: session.sub, meta: { employeeId: input.employeeId, model: input.model, agreedSalary: input.agreedSalary } });
    return NextResponse.json({ ok: true, hourlyRate: rate });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
