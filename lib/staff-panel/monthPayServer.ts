import { and, desc, eq, gte, isNull, lte, or } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { jalaliMonthRange } from '@/lib/jalali';
import { DEFAULT_ROLES } from '@/types/payroll';
import { sectionOfRole } from './pure';
import { computeMonthToDate, resolveBasis, type MonthToDate } from './monthToDate';
import type { StatementBasis } from './statements';

/**
 * «این ماه تا امروز» برای یک نفر: مبنای حقوق (آخرین ریز کارکرد یا پرونده) + حضورهای همان ماه.
 * null یعنی حقوق توافقی‌ای برای این نفر ثبت نشده.
 */
export async function loadMonthToDate(employeeId: string, period: string): Promise<MonthToDate | null> {
  const range = jalaliMonthRange(period);
  if (!range) return null;
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const [emp, [stmt], [rate], rows] = await Promise.all([
    db.select({ role: schema.employees.role, baseMonthlySalary: schema.employees.baseMonthlySalary })
      .from(schema.employees).where(eq(schema.employees.id, employeeId)).limit(1).then((r) => r[0]),
    db.select({ basis: schema.staffStatements.basis }).from(schema.staffStatements)
      .where(and(eq(schema.staffStatements.employeeId, employeeId), lte(schema.staffStatements.periodYearMonth, period)))
      .orderBy(desc(schema.staffStatements.periodYearMonth)).limit(1),
    db.select({ hourlyRate: schema.employeeHourlyRates.hourlyRate }).from(schema.employeeHourlyRates)
      .where(and(
        eq(schema.employeeHourlyRates.employeeId, employeeId),
        lte(schema.employeeHourlyRates.effectiveFrom, today),
        or(isNull(schema.employeeHourlyRates.effectiveTo), gte(schema.employeeHourlyRates.effectiveTo, today)),
      ))
      .orderBy(desc(schema.employeeHourlyRates.effectiveFrom)).limit(1),
    db.select({
      workDate: schema.attendanceEntries.workDate, workedMinutes: schema.attendanceEntries.workedMinutes,
      status: schema.attendanceEntries.status, attendanceType: schema.attendanceEntries.attendanceType,
    }).from(schema.attendanceEntries).where(and(
      eq(schema.attendanceEntries.employeeId, employeeId),
      gte(schema.attendanceEntries.workDate, new Date(range.from + 'T00:00:00Z')),
      lte(schema.attendanceEntries.workDate, new Date(range.to + 'T00:00:00Z')),
    )),
  ]);
  if (!emp) return null;
  const basis = resolveBasis({
    latestStatementBasis: (stmt?.basis as StatementBasis | undefined) ?? null,
    section: sectionOfRole(emp.role, DEFAULT_ROLES.find((r) => r.value === emp.role)?.label ?? emp.role),
    baseMonthlySalary: Number(emp.baseMonthlySalary) || null,
    hourlyRate: rate ? Number(rate.hourlyRate) : null,
  });
  if (!basis) return null;
  return computeMonthToDate(basis, rows.map((r) => ({ ...r, workDate: r.workDate.toISOString().slice(0, 10) })));
}
