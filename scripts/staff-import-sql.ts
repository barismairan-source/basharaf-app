/**
 * ساخت فایل SQL برای وارد کردن پرسنل از اکسل «پرسنل-صفاسیتی.xlsx» — فقط نام، سمت (از ستون «بخش») و تلفن.
 * ⚠️ این اسکریپت به هیچ دیتابیسی وصل نمی‌شود و چیزی را اجرا نمی‌کند؛ فقط یک فایل SQL می‌نویسد که
 *    مدیر پس از خواندن در pgAdmin اجرا می‌کند. کد ملی، کارت، شبا و آدرس عمداً وارد نمی‌شوند.
 *    فایل خروجی اطلاعات شخصی دارد: کنار فایل اکسل ساخته می‌شود، نه داخل مخزن، و نباید commit شود.
 *
 * استفاده:
 *   npx tsx scripts/staff-import-sql.ts "<مسیر اکسل>" --branch "<نام دقیق شعبه در سیستم>" [--out فایل.sql]
 *
 * قواعد:
 *  - ردیف بدون نام رد می‌شود. اگر نفر با همان نام در سیستم باشد، دوباره ساخته نمی‌شود.
 *  - تلفن معتبر (۱۱ رقم، با ۰۹) فقط اگر در اکسل باشد؛ وگرنه خالی و با یادداشت «تلفن نامشخص».
 *  - تاریخ شروع همکاری در اکسل بیشتر وقت‌ها تاریخ واقعی نیست؛ پس امروز گذاشته می‌شود با یادداشت
 *    «تاریخ شروع نامشخص — مدیر اصلاح کند» (ستون join_date در سیستم اجباری است).
 *  - نوع دستمزد: ساعتی (طبق سیستم حضور). نرخ ساعتی را مدیر جدا ثبت می‌کند.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

export interface StaffRow { fullName: string; role: string; phone: string | null }

export const SECTION_TO_ROLE: Record<string, string> = { 'آشپزخانه': 'cook', 'سالن': 'waiter' };

function toLatin(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0)).replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

export function normalizePhone(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const digits = toLatin(String(raw)).replace(/[\s\-+()]/g, '');
  const m = /^(?:98|0098)?(9\d{9})$/.exec(digits) ?? /^0(9\d{9})$/.exec(digits);
  return m ? `0${m[1]}` : null;
}

export function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

export function parseStaff(rows: Array<Record<string, unknown>>): StaffRow[] {
  const out: StaffRow[] = [];
  for (const r of rows) {
    const full = String(r['نام کامل (کارت ملی)'] ?? '').trim();
    const common = String(r['نام رایج'] ?? '').trim();
    const name = (full && full !== '—' ? full : common && common !== '—' ? common : '').replace(/\s+/g, ' ');
    if (!name) continue;
    const section = String(r['بخش'] ?? '').trim();
    out.push({ fullName: name, role: SECTION_TO_ROLE[section] ?? 'other', phone: normalizePhone(r['تلفن']) });
  }
  return out;
}

export function buildSql(staff: StaffRow[], branchName: string): string {
  const lines: string[] = [
    '-- ═══════════════════════════════════════════════════════════════════',
    '--  وارد کردن پرسنل (فقط نام، سمت، تلفن) — ساخته‌شده توسط scripts/staff-import-sql.ts',
    '--  ⚠️ حاوی اطلاعات شخصی است؛ commit نشود. پیش از اجرا بخوانید و backup بگیرید.',
    '--  اگر نفری با همان نام در سیستم باشد، دوباره ساخته نمی‌شود. اجرای دوباره امن است.',
    '-- ═══════════════════════════════════════════════════════════════════',
    'BEGIN;',
    `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM branches WHERE name = ${sqlStr(branchName)}) THEN`,
    `  RAISE EXCEPTION 'شعبه با این نام پیدا نشد: ${branchName.replace(/'/g, "''")}'; END IF; END $$;`,
  ];
  for (const s of staff) {
    const note = ['وارد‌شده از فهرست پرسنل', 'تاریخ شروع نامشخص — مدیر اصلاح کند', s.phone ? null : 'تلفن نامشخص'].filter(Boolean).join(' · ');
    lines.push(
      `INSERT INTO employees (full_name, phone, role, branch_id, join_date, compensation_type, notes)`,
      `SELECT ${sqlStr(s.fullName)}, ${sqlStr(s.phone ?? '')}, ${sqlStr(s.role)}, (SELECT id FROM branches WHERE name = ${sqlStr(branchName)} LIMIT 1), CURRENT_DATE, 'hourly', ${sqlStr(note)}`,
      `WHERE NOT EXISTS (SELECT 1 FROM employees WHERE full_name = ${sqlStr(s.fullName)});`,
    );
  }
  lines.push('COMMIT;', '', `-- کوئری بررسی: SELECT full_name, role, phone, notes FROM employees WHERE notes LIKE 'وارد‌شده از فهرست پرسنل%';`);
  return lines.join('\n') + '\n';
}

function main() {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith('--') && a !== args[args.indexOf('--branch') + 1] && a !== args[args.indexOf('--out') + 1]);
  const bi = args.indexOf('--branch');
  const branch = bi >= 0 ? args[bi + 1] : undefined;
  const oi = args.indexOf('--out');
  if (!input || !branch) {
    console.error('استفاده: npx tsx scripts/staff-import-sql.ts "<اکسل>" --branch "<نام شعبه>" [--out فایل.sql]');
    process.exit(1);
  }
  const wb = XLSX.readFile(input);
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  const staff = parseStaff(XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }));
  const out = oi >= 0 && args[oi + 1] ? args[oi + 1]! : path.join(path.dirname(input), 'staff-import.sql');
  fs.writeFileSync(out, buildSql(staff, branch), { mode: 0o600 });
  // عمداً هیچ نام یا شماره‌ای چاپ نمی‌شود.
  console.log(`✓ ${staff.length} نفر → ${out}`);
  console.log(`  با تلفن معتبر: ${staff.filter((s) => s.phone).length} · بدون تلفن: ${staff.filter((s) => !s.phone).length}`);
  console.log('  حاوی اطلاعات شخصی است؛ پیش از اجرا در pgAdmin بخوانید و commit نکنید.');
}

if (process.argv[1] && /staff-import-sql\.ts$/.test(process.argv[1])) main();
