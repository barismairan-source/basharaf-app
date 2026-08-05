import { NextResponse } from 'next/server';
import { eq, and, isNull, gte, lte, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { calculatePayslip, type PayrollParameters, type TaxBracket } from '@/lib/payroll/payrollEngine';
import { calculateHourlyPayslip, type AttendanceDayForPayslip } from '@/lib/payroll/attendanceEngine';
import { computeReadinessForEmployees } from '@/lib/payroll/payrollReadiness';
import { jalaliMonthRange } from '@/lib/jalali';

export const dynamic = 'force-dynamic';

const calcSchema = z.object({
  workingDays: z.number().int().min(1).max(31).default(30),
  // اطلاعات حضور هر کارمند (اختیاری) — فقط برای کارمندان سیستم ماهانه (بدون نرخ ساعتی)
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

    // اگر این اجرا قبلاً محاسبه شده (payslips دارد)، همان کارمندان را استفاده کن
    // تا soft-delete بعدی باعث fail شدن محاسبه‌ی مجدد نشود.
    const prevPayslips = await db
      .select({ employeeId: schema.payslips.employeeId })
      .from(schema.payslips)
      .where(eq(schema.payslips.payrollRunId, params.id));

    let emps: (typeof schema.employees.$inferSelect)[];
    if (prevPayslips.length > 0) {
      const empIds = prevPayslips.map((p) => p.employeeId);
      emps = await db.select().from(schema.employees).where(inArray(schema.employees.id, empIds));
    } else {
      // اولین محاسبه: از کارمندان فعال این شعبه استفاده کن
      const empWhere = run.branchId
        ? and(eq(schema.employees.isActive, true), eq(schema.employees.branchId, run.branchId))
        : eq(schema.employees.isActive, true);
      emps = await db.select().from(schema.employees).where(empWhere);
      if (emps.length === 0) throw new ApiError(400, 'هیچ پرسنل فعالی برای این اجرا نیست', 'NO_EMPLOYEES');
    }

    // رویدادهای این دوره (مساعده/پاداش/کسری) — غیر void
    const events = await db.select().from(schema.payrollEvents).where(
      and(
        eq(schema.payrollEvents.periodYearMonth, run.periodYearMonth),
        isNull(schema.payrollEvents.voidedAt),
      )
    );

    // کارمندان سیستم حقوق ساعتی — بر اساس نوع حقوق صریح (نه حدس از وجود نرخ)
    const hourlyEmployeeIds = new Set(emps.filter(e => e.compensationType === 'hourly').map(e => e.id));

    // آمادگی دوره — قبل از هر محاسبه‌ای بررسی می‌شود؛ خطای بحرانی محاسبه را مسدود می‌کند
    const readiness = await computeReadinessForEmployees(emps, run.periodYearMonth, run.branchId);
    if (!readiness.ready) {
      throw new ApiError(409, `این دوره آماده‌ی محاسبه نیست: ${readiness.criticalErrors.join('؛ ')}`, 'NOT_READY', {
        criticalErrors: readiness.criticalErrors, warnings: readiness.warnings,
      });
    }

    // بازه‌ی گریگوری دوره (برای کوئری روی attendance_entries.work_date)
    const range = jalaliMonthRange(run.periodYearMonth);
    if (hourlyEmployeeIds.size > 0 && !range) {
      throw new ApiError(400, 'فرمت دوره نامعتبر است — نمی‌توان بازه‌ی حضور را تعیین کرد', 'BAD_PERIOD');
    }

    // حضور تأییدشده/قفل‌شده‌ی این بازه، به‌همراه plannedMinutes از تخصیص (اگر باشد)
    const attendanceRows = range && hourlyEmployeeIds.size > 0
      ? await db.select({
          entry: schema.attendanceEntries,
          assignmentPlannedMinutes: schema.employeeShiftAssignments.plannedMinutes,
        }).from(schema.attendanceEntries)
          .leftJoin(schema.employeeShiftAssignments, eq(schema.attendanceEntries.shiftAssignmentId, schema.employeeShiftAssignments.id))
          .where(and(
            inArray(schema.attendanceEntries.employeeId, [...hourlyEmployeeIds]),
            gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
            lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
            inArray(schema.attendanceEntries.status, ['confirmed', 'locked']),
          ))
      : [];

    // هشدار: حضور تأییدنشده (draft) در همین بازه — برای نمایش در UI، بدون جلوگیری از محاسبه
    const draftCountRows = range && hourlyEmployeeIds.size > 0
      ? await db.select({ employeeId: schema.attendanceEntries.employeeId, cnt: sql<number>`count(*)` })
          .from(schema.attendanceEntries)
          .where(and(
            inArray(schema.attendanceEntries.employeeId, [...hourlyEmployeeIds]),
            gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
            lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
            eq(schema.attendanceEntries.status, 'draft'),
          ))
          .groupBy(schema.attendanceEntries.employeeId)
      : [];
    const draftCountByEmployee = new Map(draftCountRows.map(r => [r.employeeId, Number(r.cnt)]));

    const periodEnd = new Date(); // برای محاسبه‌ی سنوات (تقریبی) — فقط سیستم ماهانه

    const warnings: Array<{ employeeId: string; employeeName: string; draftAttendanceCount: number }> = [];

    const result = await db.transaction(async (dbTx) => {
      // پاک کردن فیش‌های قبلی این اجرا (محاسبه‌ی مجدد)
      await dbTx.delete(schema.payslips).where(eq(schema.payslips.payrollRunId, params.id));

      const created: string[] = [];
      for (const emp of emps) {
        const empEvents = events.filter(ev => ev.employeeId === emp.id && ev.type !== 'settlement')
          .map(ev => ({
            type: ev.type as 'advance' | 'deduction' | 'bonus',
            amount: Number(ev.amount),
          }));

        let workedDays: number;
        let grossEarnings: number, taxableBase: number, insuranceBase: number;
        let insuranceEmployee: number, incomeTax: number, insuranceEmployer: number;
        let totalDeductions: number, netPay: number;
        let snapshot: { lines?: Array<{ category: string; code: string; labelFa: string; amount: number }> };

        if (hourlyEmployeeIds.has(emp.id)) {
          // ── مسیر حقوق ساعتی — فقط از حضور تأییدشده‌ی DB (نه body درخواست) ──
          const days: AttendanceDayForPayslip[] = attendanceRows
            .filter(r => r.entry.employeeId === emp.id)
            .map(r => ({
              workDate: r.entry.workDate.toISOString().slice(0, 10),
              plannedMinutes: r.assignmentPlannedMinutes ?? 0,
              workedMinutes: r.entry.workedMinutes,
              regularMinutes: r.entry.regularMinutes,
              overtimeMinutes: r.entry.overtimeMinutes,
              overtimeApproved: r.entry.overtimeApproved,
              nightMinutes: r.entry.nightMinutes,
              holidayMinutes: r.entry.holidayMinutes,
              hourlyRateSnapshot: Number(r.entry.hourlyRateSnapshot),
              attendanceType: r.entry.attendanceType,
            }));

          const draftCount = draftCountByEmployee.get(emp.id) ?? 0;
          if (draftCount > 0) {
            warnings.push({ employeeId: emp.id, employeeName: emp.fullName, draftAttendanceCount: draftCount });
          }

          const slip = calculateHourlyPayslip({
            days,
            params: {
              overtimeMultiplier: engineParams.overtimeMultiplier,
              nightShiftPremium: engineParams.nightShiftPremium,
              holidayMultiplier: engineParams.holidayMultiplier,
              insuranceEmployeeRate: engineParams.insuranceEmployeeRate,
              insuranceEmployerRate: engineParams.insuranceEmployerRate,
              taxBrackets: engineParams.taxBrackets,
            },
            events: empEvents,
          });

          workedDays = days.filter(d => d.workedMinutes > 0).length;
          grossEarnings = slip.grossEarnings; taxableBase = slip.taxableBase; insuranceBase = slip.insuranceBase;
          insuranceEmployee = slip.insuranceEmployee; insuranceEmployer = slip.insuranceEmployer;
          incomeTax = slip.incomeTax; totalDeductions = slip.totalDeductions; netPay = slip.netPay;
          snapshot = { lines: slip.lines };
        } else {
          // ── مسیر سیستم ماهانه (بدون تغییر) ──
          const att = body.attendance?.[emp.id];
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
          workedDays = slip.workedDays;
          grossEarnings = slip.grossEarnings; taxableBase = slip.taxableBase; insuranceBase = slip.insuranceBase;
          insuranceEmployee = slip.insuranceEmployee; insuranceEmployer = slip.insuranceEmployer;
          incomeTax = slip.incomeTax; totalDeductions = slip.totalDeductions; netPay = slip.netPay;
          snapshot = slip as unknown as { lines?: Array<{ category: string; code: string; labelFa: string; amount: number }> };
        }

        // اعمال override دستی بیمه/مالیات (اگر داده شده) — برای هر دو مسیر
        const ov = body.overrides?.[emp.id];
        if (ov?.insuranceEmployee !== undefined) {
          const otherDeductions = totalDeductions - insuranceEmployee - incomeTax;
          insuranceEmployee = ov.insuranceEmployee;
          const line = snapshot.lines?.find(l => l.code === 'insurance_emp');
          if (line) line.amount = insuranceEmployee;
          totalDeductions = insuranceEmployee + incomeTax + otherDeductions;
        }
        if (ov?.incomeTax !== undefined) {
          const otherDeductions = totalDeductions - insuranceEmployee - incomeTax;
          incomeTax = ov.incomeTax;
          const line = snapshot.lines?.find(l => l.code === 'tax');
          if (line) line.amount = incomeTax;
          totalDeductions = insuranceEmployee + incomeTax + otherDeductions;
        }
        netPay = grossEarnings - totalDeductions;

        await dbTx.insert(schema.payslips).values({
          payrollRunId: params.id,
          employeeId: emp.id,
          periodYearMonth: run.periodYearMonth,
          workedDays: String(workedDays),
          grossEarnings, taxableBase, insuranceBase,
          insuranceEmployee, insuranceEmployer, incomeTax, totalDeductions, netPay,
          calcSnapshot: snapshot as unknown as object,
        });
        created.push(emp.id);
      }

      await dbTx.update(schema.payrollRuns)
        .set({ status: 'calculated', calculatedAt: new Date() })
        .where(eq(schema.payrollRuns.id, params.id));

      return created.length;
    });

    return NextResponse.json({ ok: true, payslipsCreated: result, warnings });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
