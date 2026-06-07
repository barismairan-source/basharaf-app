import { NextResponse } from 'next/server';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { calculatePayslip, type PayrollParameters, type TaxBracket } from '@/lib/payroll/payrollEngine';

export const dynamic = 'force-dynamic';

const calcSchema = z.object({
  workingDays: z.number().int().min(1).max(31).default(30),
  // اطلاعات حضور هر کارمند (اختیاری) — اگر نباشد، ماه کامل فرض می‌شود
  attendance: z.record(z.object({
    unpaidDays: z.number().min(0).default(0),
    overtimeMinutes: z.number().min(0).default(0),
    nightMinutes: z.number().min(0).default(0),
    holidayMinutes: z.number().min(0).default(0),
    childrenCount: z.number().int().min(0).default(0),
    insuranceDaysPrior: z.number().int().min(0).default(0),
  })).optional(),
  // override دستی بیمه/مالیات هر کارمند (اگر داده شود، جایگزین خودکار می‌شود)
  overrides: z.record(z.object({
    insuranceEmployee: z.number().int().min(0).optional(),
    incomeTax: z.number().int().min(0).optional(),
  })).optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = calcSchema.parse(await req.json().catch(() => ({})));

    const [run] = await db.select().from(schema.payrollRuns).where(eq(schema.payrollRuns.id, params.id)).limit(1);
    if (!run) throw new ApiError(404, 'اجرا پیدا نشد', 'NOT_FOUND');
    if (run.status === 'approved' || run.status === 'posted')
      throw new ApiError(409, 'اجرای تأییدشده را نمی‌توان دوباره محاسبه کرد', 'LOCKED');

    // پارامترهای قانونی
    const [p] = await db.select().from(schema.payrollParameters)
      .where(eq(schema.payrollParameters.id, run.parametersId)).limit(1);
    if (!p) throw new ApiError(400, 'پارامتر حقوق پیدا نشد', 'NO_PARAMS');

    const engineParams: PayrollParameters = {
      jalaliYear: p.jalaliYear,
      minDailyWage: Number(p.minDailyWage),
      minMonthlyWage: Number(p.minMonthlyWage),
      housingAllowance: Number(p.housingAllowance),
      groceryAllowance: Number(p.groceryAllowance),
      marriageAllowance: Number(p.marriageAllowance),
      seniorityDaily: Number(p.seniorityDaily),
      childAllowancePer: Number(p.childAllowancePer),
      taxExemptMonthly: Number(p.taxExemptMonthly),
      taxBrackets: p.taxBrackets as TaxBracket[],
      insuranceEmployeeRate: Number(p.insuranceEmployeeRate),
      insuranceEmployerRate: Number(p.insuranceEmployerRate),
      overtimeMultiplier: Number(p.overtimeMultiplier),
      nightShiftPremium: Number(p.nightShiftPremium),
      holidayMultiplier: Number(p.holidayMultiplier),
      childMinInsuranceDays: p.childMinInsuranceDays,
      standardMonthlyHours: Number(p.standardMonthlyHours),
    };

    // پرسنل فعال این شعبه (یا همه اگر شعبه ندارد)
    const empWhere = run.branchId
      ? and(eq(schema.employees.isActive, true), eq(schema.employees.branchId, run.branchId))
      : eq(schema.employees.isActive, true);
    const emps = await db.select().from(schema.employees).where(empWhere);
    if (emps.length === 0) throw new ApiError(400, 'هیچ پرسنل فعالی برای این اجرا نیست', 'NO_EMPLOYEES');

    // رویدادهای این دوره (مساعده/پاداش/کسری) — غیر void
    const events = await db.select().from(schema.payrollEvents).where(
      and(
        eq(schema.payrollEvents.periodYearMonth, run.periodYearMonth),
        isNull(schema.payrollEvents.voidedAt),
      )
    );

    const periodEnd = new Date(); // برای محاسبه‌ی سنوات (تقریبی)

    const result = await db.transaction(async (dbTx) => {
      // پاک کردن فیش‌های قبلی این اجرا (محاسبه‌ی مجدد)
      await dbTx.delete(schema.payslips).where(eq(schema.payslips.payrollRunId, params.id));

      const created: string[] = [];
      for (const emp of emps) {
        const att = body.attendance?.[emp.id];
        const empEvents = events.filter(ev => ev.employeeId === emp.id && ev.type !== 'settlement')
          .map(ev => ({
            type: ev.type as 'advance' | 'deduction' | 'bonus',
            amount: Number(ev.amount),
          }));

        const slip = calculatePayslip({
          employee: {
            maritalStatus: emp.maritalStatus as 'single' | 'married' | 'other' | null,
            childrenCount: att?.childrenCount ?? 0,
            insuranceDaysPrior: att?.insuranceDaysPrior ?? 0,
          },
          contract: {
            startDate: emp.joinDate,
            baseSalaryStructure: Number(emp.baseMonthlySalary) > 0 ? 'custom' : 'minimum_wage',
            agreedBaseSalary: Number(emp.baseMonthlySalary),
          },
          params: engineParams,
          attendance: {
            overtimeMinutes: att?.overtimeMinutes ?? 0,
            nightMinutes: att?.nightMinutes ?? 0,
            holidayMinutes: att?.holidayMinutes ?? 0,
            lateMinutes: 0,
          },
          calendar: { workingDays: body.workingDays },
          events: empEvents,
          periodEnd,
          unpaidDays: att?.unpaidDays ?? 0,
        });

        // اعمال override دستی بیمه/مالیات (اگر داده شده)
        const ov = body.overrides?.[emp.id];
        let insuranceEmployee = slip.insuranceEmployee;
        let incomeTax = slip.incomeTax;
        const snapshot = slip as unknown as { lines?: Array<{ category: string; code: string; labelFa: string; amount: number }> };
        if (ov?.insuranceEmployee !== undefined) {
          insuranceEmployee = ov.insuranceEmployee;
          // به‌روزرسانی خط بیمه در snapshot
          const line = snapshot.lines?.find(l => l.code === 'insurance_emp');
          if (line) line.amount = insuranceEmployee;
        }
        if (ov?.incomeTax !== undefined) {
          incomeTax = ov.incomeTax;
          const line = snapshot.lines?.find(l => l.code === 'tax');
          if (line) line.amount = incomeTax;
        }
        // بازمحاسبه‌ی کسورات و خالص با مقادیر نهایی
        const otherDeductions = slip.totalDeductions - slip.insuranceEmployee - slip.incomeTax;
        const totalDeductions = insuranceEmployee + incomeTax + otherDeductions;
        const netPay = slip.grossEarnings - totalDeductions;

        await dbTx.insert(schema.payslips).values({
          payrollRunId: params.id,
          employeeId: emp.id,
          periodYearMonth: run.periodYearMonth,
          workedDays: String(slip.workedDays),
          grossEarnings: slip.grossEarnings,
          taxableBase: slip.taxableBase,
          insuranceBase: slip.insuranceBase,
          insuranceEmployee,
          insuranceEmployer: slip.insuranceEmployer,
          incomeTax,
          totalDeductions,
          netPay,
          calcSnapshot: snapshot as unknown as object,
        });
        created.push(emp.id);
      }

      await dbTx.update(schema.payrollRuns)
        .set({ status: 'calculated', calculatedAt: new Date() })
        .where(eq(schema.payrollRuns.id, params.id));

      return created.length;
    });

    return NextResponse.json({ ok: true, payslipsCreated: result });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

void sql;
