import { NextResponse } from 'next/server';
import { and, desc, eq, isNull, lte, or, gte } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleErrorLogged } from '@/lib/api-error';
import { isUnlocked, requireMe } from '@/lib/staff-panel/session';
import { maskTail } from '@/lib/staff-panel/pure';
import { DEFAULT_ROLES } from '@/types/payroll';

export const dynamic = 'force-dynamic';

/**
 * GET /api/me/profile — مشخصات خودِ همین نفر.
 * بدون قفل: نام، سمت، شعبه، تاریخ شروع، تلفن. با قفل Face ID باز: کد ملی/شبا/شماره بیمه (فقط
 * چند رقم آخر)، وضعیت بیمه، کارت بهداشت و نوع و مبلغ دستمزد. فقط چیزهایی که خود فرد باید ببیند.
 */
export async function GET(req: Request) {
  try {
    const device = await requireMe();
    const [e] = await db.select().from(schema.employees).where(eq(schema.employees.id, device.employeeId)).limit(1);
    const [branch] = e?.branchId
      ? await db.select({ name: schema.branches.name }).from(schema.branches).where(eq(schema.branches.id, e.branchId)).limit(1)
      : [];
    const unlocked = await isUnlocked(device.deviceId);
    const basic = {
      fullName: e?.fullName ?? device.employeeName,
      role: DEFAULT_ROLES.find((r) => r.value === e?.role)?.label ?? e?.role ?? '',
      branch: branch?.name ?? e?.branchName ?? null,
      joinDate: e?.joinDate ? e.joinDate.toISOString().slice(0, 10) : null,
      phone: e?.phone ?? null,
    };
    if (!unlocked || !e) return NextResponse.json({ unlocked: false, profile: basic });

    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    const [rate] = await db.select({ hourlyRate: schema.employeeHourlyRates.hourlyRate }).from(schema.employeeHourlyRates)
      .where(and(
        eq(schema.employeeHourlyRates.employeeId, e.id),
        lte(schema.employeeHourlyRates.effectiveFrom, today),
        or(isNull(schema.employeeHourlyRates.effectiveTo), gte(schema.employeeHourlyRates.effectiveTo, today)),
      ))
      .orderBy(desc(schema.employeeHourlyRates.effectiveFrom)).limit(1);
    return NextResponse.json({
      unlocked: true,
      profile: {
        ...basic,
        nationalIdMasked: maskTail(e.nationalId),
        ibanMasked: maskTail(e.iban),
        insuranceStatus: e.insuranceStatus,
        insuranceNumberMasked: maskTail(e.insuranceNumber),
        healthCardExpiry: e.healthCardExpiryDate ? e.healthCardExpiryDate.toISOString().slice(0, 10) : null,
        compensationType: e.compensationType,
        hourlyRate: rate ? Number(rate.hourlyRate) : null,
        baseMonthlySalary: Number(e.baseMonthlySalary) > 0 ? Number(e.baseMonthlySalary) : null,
      },
    });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
