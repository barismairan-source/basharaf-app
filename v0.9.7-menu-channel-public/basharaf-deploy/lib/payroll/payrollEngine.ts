/**
 * Payroll calculation engine — pure functions, no DB.
 *
 * All money is integer Toman (number). Rounding only at marked points,
 * via Math.round (nearest Toman). Mirrors the architecture doc §4–5.
 *
 * The engine takes already-resolved inputs (employee, contract, params,
 * aggregated attendance, events, calendar) and returns a full payslip
 * breakdown. DB resolution lives in the server action that calls this.
 *
 * LEGAL NOTE: the insurance/tax inclusion mix and progressive brackets change
 * yearly by circular. Parameters are injected (not hard-coded) so this engine
 * stays correct across years. Verify against the current سازمان امور مالیاتی /
 * تأمین اجتماعی circular before production use.
 */

/* ───── Types ──────────────────────────────────────────────────── */

export interface PayrollParameters {
  jalaliYear: number;
  minDailyWage: number;        // تومان
  minMonthlyWage: number;
  housingAllowance: number;
  groceryAllowance: number;
  marriageAllowance: number;
  seniorityDaily: number;
  childAllowancePer: number;
  taxExemptMonthly: number;
  taxBrackets: TaxBracket[];
  insuranceEmployeeRate: number; // 0.07
  insuranceEmployerRate: number; // 0.23
  overtimeMultiplier: number;    // 1.4
  nightShiftPremium: number;     // 0.35
  holidayMultiplier: number;     // 1.4
  childMinInsuranceDays: number; // 720
  standardMonthlyHours: number;  // ≈ 192
}

export interface TaxBracket {
  upToMonthly: number | null; // null = top bracket (no ceiling)
  rate: number;               // 0.10 = 10%
}

export interface PayrollEmployeeInput {
  maritalStatus: 'single' | 'married' | 'other' | null;
  childrenCount: number;
  insuranceDaysPrior: number;
}

export interface PayrollContractInput {
  startDate: Date;
  baseSalaryStructure: 'minimum_wage' | 'custom';
  agreedBaseSalary: number; // used when structure === 'custom'
}

export interface PayrollAttendanceInput {
  overtimeMinutes: number;
  nightMinutes: number;
  holidayMinutes: number;
  lateMinutes: number;
}

export interface PayrollCalendarInput {
  workingDays: number;        // روزهای کاری ماه (منهای جمعه و تعطیل رسمی)
}

export interface PayrollEventInput {
  type: 'advance' | 'deduction' | 'bonus';
  amount: number;
}

export interface PayslipLine {
  category: 'earning' | 'deduction' | 'statutory';
  code: string;
  labelFa: string;
  amount: number;             // always positive; category sets direction
  meta?: Record<string, unknown>;
}

export interface PayslipResult {
  workedDays: number;
  workedRatio: number;
  grossEarnings: number;
  insuranceBase: number;
  taxableBase: number;
  insuranceEmployee: number;
  insuranceEmployer: number;
  incomeTax: number;
  totalDeductions: number;
  netPay: number;
  isNegative: boolean;        // مساعده بیش از حقوق
  lines: PayslipLine[];
}

export interface CalcInput {
  employee: PayrollEmployeeInput;
  contract: PayrollContractInput;
  params: PayrollParameters;
  attendance: PayrollAttendanceInput;
  calendar: PayrollCalendarInput;
  events: PayrollEventInput[];
  periodEnd: Date;            // last day of the period, for seniority
  unpaidDays?: number;        // مرخصی بدون حقوق + غیبت بی‌مجوز
  autoLatePenalty?: boolean;
}

/* ───── Helpers ────────────────────────────────────────────────── */

const r = Math.round;

/** Whole continuous years between two dates (for seniority eligibility). */
export function continuousYears(start: Date, end: Date): number {
  let years = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) years -= 1;
  return Math.max(0, years);
}

/** Progressive monthly income tax. First bracket (rate 0) auto-applies exemption. */
export function calcProgressiveTax(monthlyTaxable: number, brackets: TaxBracket[]): number {
  if (monthlyTaxable <= 0) return 0;
  let tax = 0;
  let lower = 0;
  for (const b of brackets) {
    const upper = b.upToMonthly ?? Infinity;
    if (monthlyTaxable > lower) {
      const inBracket = Math.min(monthlyTaxable, upper) - lower;
      tax += r(inBracket * b.rate);
      lower = upper;
      if (monthlyTaxable <= upper) break;
    } else {
      break;
    }
  }
  return tax;
}

/* ───── Main engine ────────────────────────────────────────────── */

export function calculatePayslip(input: CalcInput): PayslipResult {
  const { employee, contract, params, attendance, calendar, events, periodEnd } = input;
  const lines: PayslipLine[] = [];

  // ── Step 1: effective worked days ──
  const standardDays = calendar.workingDays;
  const standardHours = params.standardMonthlyHours;
  const unpaidDays = input.unpaidDays ?? 0;
  const paidDays = Math.max(0, standardDays - unpaidDays);
  const workedRatio = standardDays > 0 ? paidDays / standardDays : 0;

  // ── Step 2: fixed earnings ──
  const fullBase =
    contract.baseSalaryStructure === 'minimum_wage'
      ? params.minMonthlyWage
      : contract.agreedBaseSalary;

  const baseSalary = r(fullBase * workedRatio);
  lines.push({ category: 'earning', code: 'base', labelFa: 'حقوق پایه', amount: baseSalary });

  // پایه سنوات — فقط بعد از ۱ سال کامل پیوسته
  const years = continuousYears(contract.startDate, periodEnd);
  let seniorityPay = 0;
  if (years >= 1) {
    seniorityPay = r(params.seniorityDaily * 30 * workedRatio);
    lines.push({ category: 'earning', code: 'seniority', labelFa: 'پایه سنوات', amount: seniorityPay, meta: { years } });
  }

  const housing = r(params.housingAllowance * workedRatio);
  lines.push({ category: 'earning', code: 'housing', labelFa: 'حق مسکن', amount: housing });

  const grocery = r(params.groceryAllowance * workedRatio);
  lines.push({ category: 'earning', code: 'grocery', labelFa: 'بن خواربار', amount: grocery });

  let marriage = 0;
  if (employee.maritalStatus === 'married') {
    marriage = r(params.marriageAllowance * workedRatio);
    lines.push({ category: 'earning', code: 'marriage', labelFa: 'حق تأهل', amount: marriage });
  }

  // حق اولاد — شرط ۷۲۰ روز سابقه بیمه (ماده ۸۶ ت.ا.)
  let child = 0;
  if (
    employee.childrenCount > 0 &&
    employee.insuranceDaysPrior >= params.childMinInsuranceDays
  ) {
    child = r(params.childAllowancePer * employee.childrenCount * workedRatio);
    lines.push({ category: 'earning', code: 'child', labelFa: 'حق اولاد', amount: child, meta: { count: employee.childrenCount } });
  }

  // ── Step 3: variable earnings ──
  // نرخ ساعتی از پایه‌ی ماه کامل (مستقل از غیبت)
  const hourlyRate = standardHours > 0 ? fullBase / standardHours : 0;

  const overtimeHours = attendance.overtimeMinutes / 60;
  const overtimePay = r(hourlyRate * params.overtimeMultiplier * overtimeHours);
  if (overtimePay > 0) lines.push({ category: 'earning', code: 'overtime', labelFa: 'اضافه‌کاری', amount: overtimePay, meta: { hours: overtimeHours } });

  const nightHours = attendance.nightMinutes / 60;
  const nightPay = r(hourlyRate * params.nightShiftPremium * nightHours);
  if (nightPay > 0) lines.push({ category: 'earning', code: 'night', labelFa: 'شب‌کاری', amount: nightPay, meta: { hours: nightHours } });

  const holidayHours = attendance.holidayMinutes / 60;
  const holidayPay = r(hourlyRate * params.holidayMultiplier * holidayHours);
  if (holidayPay > 0) lines.push({ category: 'earning', code: 'holiday', labelFa: 'تعطیل‌کاری', amount: holidayPay, meta: { hours: holidayHours } });

  const bonusTotal = events.filter((e) => e.type === 'bonus').reduce((s, e) => s + e.amount, 0);
  if (bonusTotal > 0) lines.push({ category: 'earning', code: 'bonus', labelFa: 'پاداش/آکورد', amount: bonusTotal });

  // ── Step 4: gross + taxable/insurance bases ──
  const grossEarnings =
    baseSalary + seniorityPay + housing + grocery + marriage + child +
    overtimePay + nightPay + holidayPay + bonusTotal;

  // پایه‌ی بیمه: همه به‌جز حق اولاد
  const insuranceBase =
    baseSalary + seniorityPay + housing + grocery + marriage +
    overtimePay + nightPay + holidayPay + bonusTotal;

  // پایه‌ی مالیات: ناخالص منهای اقلام معاف (اولاد، مسکن، بن)
  const taxableBase = grossEarnings - child - housing - grocery;

  // ── Step 5: statutory deductions ──
  const insuranceEmployee = r(insuranceBase * params.insuranceEmployeeRate);
  const insuranceEmployer = r(insuranceBase * params.insuranceEmployerRate);
  lines.push({ category: 'statutory', code: 'insurance_emp', labelFa: 'بیمه سهم کارگر', amount: insuranceEmployee });
  lines.push({ category: 'statutory', code: 'insurance_employer', labelFa: 'بیمه سهم کارفرما', amount: insuranceEmployer, meta: { employerCost: true } });

  const taxableAfterInsurance = taxableBase - insuranceEmployee;
  const incomeTax = calcProgressiveTax(taxableAfterInsurance, params.taxBrackets);
  if (incomeTax > 0) lines.push({ category: 'statutory', code: 'tax', labelFa: 'مالیات بر درآمد', amount: incomeTax });

  // ── Step 6: non-statutory deductions ──
  const advanceTotal = events.filter((e) => e.type === 'advance').reduce((s, e) => s + e.amount, 0);
  if (advanceTotal > 0) lines.push({ category: 'deduction', code: 'advance', labelFa: 'مساعده/علی‌الحساب', amount: advanceTotal });

  const penaltyTotal = events.filter((e) => e.type === 'deduction').reduce((s, e) => s + e.amount, 0);
  if (penaltyTotal > 0) lines.push({ category: 'deduction', code: 'penalty', labelFa: 'جریمه/کسر کار', amount: penaltyTotal });

  let latePenalty = 0;
  if (input.autoLatePenalty && attendance.lateMinutes > 0) {
    latePenalty = r(hourlyRate * (attendance.lateMinutes / 60));
    if (latePenalty > 0) lines.push({ category: 'deduction', code: 'late', labelFa: 'کسر تأخیر', amount: latePenalty });
  }

  // ── Step 7: net ──
  const totalDeductions = insuranceEmployee + incomeTax + advanceTotal + penaltyTotal + latePenalty;
  const netPay = grossEarnings - totalDeductions;

  return {
    workedDays: paidDays,
    workedRatio,
    grossEarnings,
    insuranceBase,
    taxableBase,
    insuranceEmployee,
    insuranceEmployer,
    incomeTax,
    totalDeductions,
    netPay,
    isNegative: netPay < 0,
    lines,
  };
}

/* ───── Settlement helpers (§5) ────────────────────────────────── */

/** عیدی: min(60×baseDaily, 90×minDaily), prorated by year ratio. */
export function calcEidi(
  monthlyBase: number,
  daysWorkedInYear: number,
  params: PayrollParameters,
): number {
  const ratio = Math.min(daysWorkedInYear / 365, 1);
  const baseDaily = monthlyBase / 30;
  const byBase = baseDaily * 60 * ratio;
  const cap = params.minDailyWage * 90 * ratio;
  return r(Math.min(byBase, cap));
}

/** سنوات: یک ماه پایه per سال (با کسر سال). */
export function calcSeverance(monthlyBase: number, startDate: Date, endDate: Date): number {
  const totalDays = Math.max(0, (endDate.getTime() - startDate.getTime()) / 86_400_000);
  const years = totalDays / 365;
  return r(monthlyBase * years);
}

/** بازخرید مرخصی: روزهای مانده × ارزش روزانه. */
export function calcLeaveBuyback(
  remainingDays: number,
  monthlyBase: number,
  monthlyFixedAllowances: number,
): number {
  if (remainingDays <= 0) return 0;
  const dailyValue = (monthlyBase + monthlyFixedAllowances) / 30;
  return r(remainingDays * dailyValue);
}
