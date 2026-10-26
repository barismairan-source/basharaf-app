/**
 * ساخت فایل SQL برای ثبت «ریز کارکرد و محاسبه‌ی حقوق» یک ماه در جدول staff_statements از اکسل‌های حقوق:
 *   --salaries  «محاسبه-حقوق-مهر-۱۴۰۵.xlsx»  (حقوق توافقی هر نفر؛ شیت‌های «آشپزخانه» و «سالن»)
 *   --detail    «ریز-کارکرد-پرسنل-شهریور-و-مهر.xlsx» (شیت‌های «مهر - …»)
 * ⚠️ به هیچ دیتابیسی وصل نمی‌شود؛ فقط یک فایل SQL می‌نویسد که مدیر می‌خواند و در pgAdmin اجرا می‌کند.
 *    فایل خروجی حقوق و اطلاعات شخصی دارد: کنار فایل ریز کارکرد ساخته می‌شود، در .gitignore است، commit نشود.
 *    پیش‌نیاز: db-staff-statements.sql و وارد‌بودن پرسنل (staff-import-sql). هر نفر با نام در employees پیدا می‌شود؛
 *    اگر پیدا نشد یا چند نفر بود، همان یک نفر رد می‌شود و پیام NOTICE می‌آید (چیزی خراب نمی‌شود).
 *
 * استفاده:
 *   npx tsx scripts/staff-statements-sql.ts --salaries "<اکسل حقوق>" --detail "<اکسل ریز کارکرد>" [--period 1405-07] [--out فایل.sql]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import {
  computeDailyStatement, computeHourlyStatement, shiftCodeHours,
  type StatementDay, type StatementWeek,
} from '../lib/staff-panel/statements';

export const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'] as const;

export function norm(s: unknown): string {
  return String(s ?? '').replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s+/g, ' ').trim();
}
function toNum(v: unknown): number | null {
  if (typeof v === 'number') return v;
  const n = Number(String(v ?? '').replace(/[,\s]/g, ''));
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null;
}
const sqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`;
const jsonLit = (o: unknown) => `$j$${JSON.stringify(o)}$j$::jsonb`;

export type Row = unknown[];

export interface SalaryRow { name: string; salary: number; presentDays?: number | null; fullSalary?: boolean }

/** شیت «آشپزخانه»: ستون A نام، B حقوق. شیت «سالن»: A نام، B حقوق، C روز حضور (یا «حقوق کامل»). */
export function parseSalaries(kitchen: Row[], hall: Row[]): { kitchen: SalaryRow[]; hall: SalaryRow[] } {
  const k: SalaryRow[] = [];
  for (const r of kitchen.slice(1)) {
    const name = norm(r[0]); const salary = toNum(r[1]);
    if (name && name !== 'جمع' && salary) k.push({ name, salary });
  }
  const h: SalaryRow[] = [];
  for (const r of hall.slice(1)) {
    const name = norm(r[0]); const salary = toNum(r[1]);
    if (!name || !salary) continue;
    const c = toNum(r[2]);
    h.push({ name, salary, presentDays: c, fullSalary: c === null });
  }
  return { kitchen: k, hall: h };
}

/** شیت ساعت‌ها: ردیف اول عنوان هفته‌ها (B..)، آخرین ستون «جمع ساعت». */
export function parseWeeklyHours(rows: Row[]): { labels: string[]; byName: Map<string, { hours: number[]; total: number }> } {
  const header = rows[0] ?? [];
  const lastCol = header.findIndex((h) => norm(h) === 'جمع ساعت');
  const labels = header.slice(1, lastCol).map((h) => norm(h));
  const byName = new Map<string, { hours: number[]; total: number }>();
  for (const r of rows.slice(1)) {
    const name = norm(r[0]);
    if (!name || name.startsWith('هر شیفت')) continue;
    const hours = labels.map((_, i) => toNum(r[1 + i]) ?? 0);
    byName.set(name, { hours, total: toNum(r[lastCol]) ?? hours.reduce((a, b) => a + b, 0) });
  }
  return { labels, byName };
}

/** جدول روزانه: A نام کوتاه، B عنوان هفته، C..H یکشنبه تا جمعه. */
export function parseDailyTable(rows: Row[]): Map<string, Map<string, string[]>> {
  const out = new Map<string, Map<string, string[]>>();
  for (const r of rows.slice(1)) {
    const name = norm(r[0]); const week = norm(r[1]);
    if (!name || !week) continue;
    const codes = WEEKDAYS.map((_, i) => norm(r[2 + i]));
    if (!out.has(name)) out.set(name, new Map());
    out.get(name)!.set(week, codes);
  }
  return out;
}

/** نام کوتاه جدول روزانه ↔ نام کامل: «امیر» با «امیرمحمد خرسندیان»، «صدرا» با «کریم ناطقیان (صدرا)». */
export function matchShortName(short: string, full: string): boolean {
  const s = norm(short), f = norm(full);
  return f.startsWith(s) || f.includes(`(${s})`);
}

/**
 * روزهای یک هفته با شماره‌ی روز ماه. هفته‌ها یکشنبه تا جمعه‌اند و جمعه‌ی «۲۶-۳۰» به ماه بعد می‌افتد.
 * شنبه همیشه آف است و در جدول نیست. روز اول ماه (چهارشنبه ۱ مهر ۱۴۰۵) → یکشنبه‌ی هفته‌ی اول = −۲.
 */
export function buildDays(codes: string[], weekIndex: number, firstSundayOffset: number, daysInMonth: number): StatementDay[] {
  return codes.map((code, i) => {
    const d = firstSundayOffset + 7 * weekIndex + i;
    return { date: d >= 1 && d <= daysInMonth ? d : null, weekday: WEEKDAYS[i]!, code: code || 'آف', hours: shiftCodeHours(code || 'آف') ?? 0 };
  });
}

export interface PersonStatement {
  name: string; model: 'hourly' | 'daily'; title: string; basis: object; weeks: StatementWeek[]; lines: object[]; notes: string[]; total: number; warnings: string[];
}

export function buildStatements(input: {
  period: string; periodTitle: string; firstSundayOffset: number; daysInMonth: number;
  salaries: { kitchen: SalaryRow[]; hall: SalaryRow[] };
  hours: ReturnType<typeof parseWeeklyHours>;
  daily: Map<string, Map<string, string[]>>;
  hallDays: Map<string, { present: number | null; paidDays: number | null; amount: number | null }>;
}): PersonStatement[] {
  const out: PersonStatement[] = [];
  for (const k of input.salaries.kitchen) {
    const warnings: string[] = [];
    const h = input.hours.byName.get(k.name);
    if (!h) { warnings.push('ساعت‌ها در ریز کارکرد پیدا نشد'); continue; }
    const st = computeHourlyStatement({ agreedSalary: k.salary, weeklyHours: h.hours });
    if (st.totalHours !== h.total) warnings.push(`جمع ساعت‌ها (${st.totalHours}) با ستون جمع (${h.total}) نمی‌خواند`);
    const shortKey = [...input.daily.keys()].find((s) => matchShortName(s, k.name));
    const weeks: StatementWeek[] = input.hours.labels.map((label, i) => {
      const codes = shortKey ? input.daily.get(shortKey)!.get(label) : undefined;
      const days = codes ? buildDays(codes, i, input.firstSundayOffset, input.daysInMonth) : undefined;
      if (days) {
        const sum = days.filter((d) => d.date !== null).reduce((a, d) => a + d.hours, 0);
        if (sum !== h.hours[i]) warnings.push(`هفته‌ی «${label}»: جمع روزها (${sum}) با ساعت هفته (${h.hours[i]}) نمی‌خواند`);
      }
      return { label, hours: h.hours[i]!, ...(days ? { days } : {}) };
    });
    out.push({ name: k.name, model: 'hourly', title: `ریز کارکرد و حقوق ${input.periodTitle}`, basis: st.basis, weeks, lines: st.lines, notes: st.notes, total: st.total, warnings });
  }
  for (const k of input.salaries.hall) {
    const warnings: string[] = [];
    const st = computeDailyStatement({ agreedSalary: k.salary, presentDays: k.presentDays ?? null, fullSalary: k.fullSalary });
    const ref = input.hallDays.get(k.name);
    if (ref?.amount != null && !k.fullSalary && ref.amount !== st.total) warnings.push(`مبلغ محاسبه‌شده (${st.total}) با مبلغ اکسل (${ref.amount}) نمی‌خواند`);
    const weeks: StatementWeek[] = [];
    const notes = [...st.notes];
    if (!k.fullSalary) notes.push(`حضور ${st.presentDays} روز؛ ${st.bonusDays} روز تشویقی؛ جمع ${st.paidDays} روز محاسبه شد.`);
    out.push({ name: k.name, model: 'daily', title: `ریز کارکرد و حقوق ${input.periodTitle}`, basis: st.basis, weeks, lines: st.lines, notes, total: st.total, warnings });
  }
  return out;
}

export function buildSql(period: string, people: PersonStatement[], source: string): string {
  const L: string[] = [
    '-- ═══════════════════════════════════════════════════════════════════',
    `--  ریز کارکرد و حقوق ${period} — ساخته‌شده توسط scripts/staff-statements-sql.ts`,
    '--  ⚠️ حقوق و اطلاعات شخصی دارد؛ commit نشود. پیش‌نیاز: db-staff-statements.sql و وارد‌بودن پرسنل.',
    '--  هر نفر با نامش در employees پیدا می‌شود؛ نفر پیدا‌نشده یا تکراری رد می‌شود (پیام NOTICE). اجرای دوباره امن است.',
    '-- ═══════════════════════════════════════════════════════════════════',
    'BEGIN;',
  ];
  for (const p of people) {
    const tokens = norm(p.name).replace(/\(.*?\)/g, '').trim().split(' ');
    const first = tokens[0]!;
    const last = (tokens[tokens.length - 1] ?? first).split('‌')[0]!;
    L.push(
      'DO $do$ DECLARE n int; eid uuid; BEGIN',
      `  SELECT count(*), (array_agg(id))[1] INTO n, eid FROM employees WHERE full_name ILIKE ${sqlStr(`%${first}%`)} AND full_name ILIKE ${sqlStr(`%${last}%`)};`,
      '  IF n = 1 THEN',
      '    INSERT INTO staff_statements (employee_id, period_year_month, model, title, basis, weeks, lines, notes, total_amount, source)',
      `    VALUES (eid, ${sqlStr(period)}, ${sqlStr(p.model)}, ${sqlStr(p.title)}, ${jsonLit(p.basis)}, ${jsonLit(p.weeks)}, ${jsonLit(p.lines)}, ${jsonLit(p.notes)}, ${Math.round(p.total)}, ${sqlStr(source)})`,
      '    ON CONFLICT (employee_id, period_year_month) DO UPDATE SET model = EXCLUDED.model, title = EXCLUDED.title, basis = EXCLUDED.basis,',
      '      weeks = EXCLUDED.weeks, lines = EXCLUDED.lines, notes = EXCLUDED.notes, total_amount = EXCLUDED.total_amount, source = EXCLUDED.source;',
      '  ELSE',
      `    RAISE NOTICE 'نفر پیدا نشد یا بیش از یکی است (%): ${p.name.replace(/'/g, "''")}', n;`,
      '  END IF;',
      'END $do$;',
    );
  }
  L.push('COMMIT;', '', "-- کوئری بررسی: SELECT e.full_name, s.model, s.total_amount FROM staff_statements s JOIN employees e ON e.id = s.employee_id ORDER BY e.full_name;");
  return L.join('\n') + '\n';
}

export function parseArgs(args: string[]): { salaries?: string; detail?: string; period?: string; out?: string } {
  const r: { salaries?: string; detail?: string; period?: string; out?: string } = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--salaries') r.salaries = args[++i];
    else if (a === '--detail') r.detail = args[++i];
    else if (a === '--period') r.period = args[++i];
    else if (a === '--out') r.out = args[++i];
  }
  return r;
}

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name];
  if (!ws) throw new Error(`شیت «${name}» پیدا نشد. شیت‌های موجود: ${wb.SheetNames.join('، ')}`);
  return XLSX.utils.sheet_to_json<Row>(ws, { header: 1, defval: '' });
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.salaries || !a.detail) {
    console.error('استفاده: npx tsx scripts/staff-statements-sql.ts --salaries "<اکسل حقوق>" --detail "<اکسل ریز کارکرد>" [--period 1405-07] [--out فایل.sql]');
    process.exit(1);
  }
  const period = a.period ?? '1405-07';
  const sal = XLSX.readFile(a.salaries);
  const det = XLSX.readFile(a.detail);
  const salaries = parseSalaries(sheetRows(sal, 'آشپزخانه'), sheetRows(sal, 'سالن'));
  const hours = parseWeeklyHours(sheetRows(det, 'مهر - آشپزخانه (ساعت)'));
  const daily = parseDailyTable(sheetRows(det, 'مهر - جدول روزانه'));
  const hallDays = new Map<string, { present: number | null; paidDays: number | null; amount: number | null }>();
  for (const r of sheetRows(det, 'مهر - سالن (روز)').slice(1)) {
    const name = norm(r[0]);
    if (name) hallDays.set(name, { present: toNum(r[2]), paidDays: toNum(r[3]), amount: toNum(r[4]) });
  }
  // مهر ۱۴۰۵: ۱ مهر چهارشنبه بود → یکشنبه‌ی هفته‌ی اول = روز −۲؛ مهر ۳۰ روز است.
  const people = buildStatements({ period, periodTitle: 'مهر ۱۴۰۵', firstSundayOffset: -2, daysInMonth: 30, salaries, hours, daily, hallDays });
  const out = a.out ?? path.join(path.dirname(a.detail), `staff-statements-${period}.sql`);
  fs.writeFileSync(out, buildSql(period, people, path.basename(a.detail)), { mode: 0o600 });
  // عمداً نام یا مبلغی چاپ نمی‌شود.
  console.log(`✓ ${people.length} نفر → ${out}`);
  const warned = people.filter((p) => p.warnings.length);
  console.log(`  هشدار: ${warned.length} نفر` + (warned.length ? ` — ${warned.map((p) => p.warnings.length).reduce((x, y) => x + y, 0)} مورد (نام‌ها را در فایل SQL نمی‌بینید؛ دوباره با --out اجرا کنید و خروجی را بخوانید)` : ''));
  console.log('  حاوی حقوق و اطلاعات شخصی است؛ پیش از اجرا در pgAdmin بخوانید و commit نکنید.');
}

if (process.argv[1] && /staff-statements-sql\.ts$/.test(process.argv[1])) main();
