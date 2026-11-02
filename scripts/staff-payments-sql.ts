/**
 * ساخت فایل SQL برای ثبت «تاریخچه‌ی واریزی‌های پرسنل» در جدول staff_payments از روی رسید/لیست‌های بانک پاسارگاد.
 * ورودی یک فایل manifest (JSON) است که برای هر فایل بانکی می‌گوید بابت کدام ماه، چه نوعی، چه تاریخی و آیا رسید است:
 *   [{ "file": "رسید-....xlsx", "period": "1405-06", "kind": "salary", "paidOn": "1405/07/04", "title": "حقوق ثابت شهریور", "hasReceipt": true }, ...]
 * فایل‌ها: رسید انتقال گروهی (xlsx)، فایل بارگذاری بانک (xlsx) یا batch متنی (مبلغ,شبا,,شرح).
 * ⚠️ به هیچ دیتابیسی وصل نمی‌شود؛ شماره‌ی شبا نه خوانده و نه در SQL نوشته می‌شود. خروجی مبلغ و نام دارد: commit نشود.
 *    پیش‌نیاز: db-staff-payments.sql. هر نفر با نام در employees پیدا می‌شود؛ پیدا‌نشده یا تکراری رد می‌شود (NOTICE).
 *    اجرای دوباره امن است (هر ردیف منبع یک source_key ثابت دارد و به‌روز می‌شود، تکرار نمی‌شود).
 *
 * استفاده:
 *   npx tsx scripts/staff-payments-sql.ts --manifest <manifest.json> [--dir <پوشه‌ی فایل‌ها>] [--out فایل.sql]
 */
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import type { PaymentKind } from '../lib/staff-panel/payments';

export interface ManifestEntry { file: string; period: string; kind: PaymentKind; paidOn?: string | null; title: string; hasReceipt: boolean }
export interface PaymentRow { name: string; amount: number; row: number }

const ZWNJ = '‌';
const sqlStr = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** نام فارسی یکدست: ي/ك عربی، نیم‌فاصله‌ی چسبیده به فاصله یا انتهای کلمه، پرانتز (مثل «(صدرا)»). */
export function normName(s: unknown): string {
  return String(s ?? '')
    .replace(/ي/g, 'ی').replace(/ك/g, 'ک')
    .replace(/\(.*?\)/g, ' ')
    .replace(new RegExp(`${ZWNJ}*\\s+${ZWNJ}*`, 'g'), ' ')
    .replace(new RegExp(`^${ZWNJ}+|${ZWNJ}+$`, 'g'), '')
    .replace(/\s+/g, ' ').trim();
}

/** «اضافه‌کاری شهریور - امیرمحمد خرسندیان» → «امیرمحمد خرسندیان»؛ شرح بدون « - » همان نام است. */
export function nameFromDescription(desc: string): string {
  const i = desc.lastIndexOf(' - ');
  return normName(i >= 0 ? desc.slice(i + 3) : desc);
}

/** «300,000,000 ریال» یا 300000000 → تومان (÷۱۰، گرد). */
export function rialToToman(v: unknown): number | null {
  const digits = String(v ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[^0-9]/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return n > 0 ? Math.round(n / 10) : null;
}

/** ردیف‌های یک جدول بانکی: سطر عنوان باید ستونی با «مبلغ» و ستونی با «شرح مقصد» داشته باشد. */
export function parseTable(rows: unknown[][]): PaymentRow[] {
  const hi = rows.findIndex((r) => r.some((c) => String(c).includes('مبلغ')) && r.some((c) => String(c).includes('شرح مقصد')));
  if (hi < 0) return [];
  const head = rows[hi]!.map(String);
  const ai = head.findIndex((c) => c.includes('مبلغ'));
  const di = head.findIndex((c) => c.includes('شرح مقصد'));
  const out: PaymentRow[] = [];
  rows.slice(hi + 1).forEach((r, k) => {
    const amount = rialToToman(r[ai]);
    const name = nameFromDescription(String(r[di] ?? ''));
    if (amount && name) out.push({ name, amount, row: hi + 1 + k + 1 });
  });
  return out;
}

/** batch متنی بانک: «مبلغ‌ریال,شبا,شناسه,شرح» در هر خط. ستون شبا عمداً نادیده گرفته می‌شود. */
export function parseBatchText(text: string): PaymentRow[] {
  const out: PaymentRow[] = [];
  text.split(/\r?\n/).forEach((line, k) => {
    const parts = line.split(',');
    if (parts.length < 4) return;
    const amount = rialToToman(parts[0]);
    const name = nameFromDescription(parts.slice(3).join(','));
    if (amount && name) out.push({ name, amount, row: k + 1 });
  });
  return out;
}

export function readPayments(filePath: string): PaymentRow[] {
  if (filePath.endsWith('.txt')) return parseBatchText(fs.readFileSync(filePath, 'utf8'));
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  return parseTable(XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false }) as unknown[][]);
}

export function buildSql(items: Array<{ entry: ManifestEntry; rows: PaymentRow[] }>): string {
  const L: string[] = [
    '-- ═══════════════════════════════════════════════════════════════════',
    '--  تاریخچه‌ی واریزی‌های پرسنل — ساخته‌شده توسط scripts/staff-payments-sql.ts',
    '--  ⚠️ مبلغ و نام دارد؛ commit نشود. پیش‌نیاز: db-staff-payments.sql و وارد‌بودن پرسنل.',
    '--  نفر پیدا‌نشده یا تکراری رد می‌شود (پیام NOTICE). اجرای دوباره امن است (source_key).',
    '-- ═══════════════════════════════════════════════════════════════════',
    'BEGIN;',
  ];
  for (const { entry, rows } of items) {
    for (const r of rows) {
      const tokens = r.name.split(' ');
      const first = tokens[0]!;
      const last = (tokens[tokens.length - 1] ?? first).split(ZWNJ)[0]!;
      const key = `${entry.file}#${r.row}`;
      L.push(
        'DO $do$ DECLARE n int; eid uuid; BEGIN',
        `  SELECT count(*), (array_agg(id))[1] INTO n, eid FROM employees WHERE full_name ILIKE ${sqlStr(`%${first}%`)} AND full_name ILIKE ${sqlStr(`%${last}%`)};`,
        '  IF n = 1 THEN',
        '    INSERT INTO staff_payments (employee_id, period_year_month, kind, amount, paid_on, title, has_receipt, source, source_key)',
        `    VALUES (eid, ${sqlStr(entry.period)}, ${sqlStr(entry.kind)}, ${r.amount}, ${entry.paidOn ? sqlStr(entry.paidOn) : 'NULL'}, ${sqlStr(entry.title)}, ${entry.hasReceipt}, ${sqlStr(entry.file)}, ${sqlStr(key)})`,
        '    ON CONFLICT (source_key) DO UPDATE SET employee_id = EXCLUDED.employee_id, period_year_month = EXCLUDED.period_year_month, kind = EXCLUDED.kind,',
        '      amount = EXCLUDED.amount, paid_on = EXCLUDED.paid_on, title = EXCLUDED.title, has_receipt = EXCLUDED.has_receipt, source = EXCLUDED.source;',
        '  ELSE',
        `    RAISE NOTICE 'نفر پیدا نشد یا بیش از یکی است (%): ${r.name.replace(/'/g, "''")} — ${entry.title.replace(/'/g, "''")}', n;`,
        '  END IF;',
        'END $do$;',
      );
    }
  }
  L.push('COMMIT;', '', '-- کوئری بررسی: SELECT e.full_name, p.period_year_month, p.kind, p.amount, p.paid_on FROM staff_payments p JOIN employees e ON e.id = p.employee_id ORDER BY e.full_name, p.paid_on;');
  return L.join('\n') + '\n';
}

function parseArgs(args: string[]): { manifest?: string; dir?: string; out?: string } {
  const r: { manifest?: string; dir?: string; out?: string } = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest') r.manifest = args[++i];
    else if (args[i] === '--dir') r.dir = args[++i];
    else if (args[i] === '--out') r.out = args[++i];
  }
  return r;
}

function main() {
  const a = parseArgs(process.argv.slice(2));
  if (!a.manifest) {
    console.error('استفاده: npx tsx scripts/staff-payments-sql.ts --manifest <manifest.json> [--dir <پوشه>] [--out فایل.sql]');
    process.exit(1);
  }
  const entries = JSON.parse(fs.readFileSync(a.manifest, 'utf8')) as ManifestEntry[];
  const dir = a.dir ?? path.dirname(a.manifest);
  const items = entries.map((entry) => ({ entry, rows: readPayments(path.join(dir, entry.file)) }));
  const out = a.out ?? path.join(dir, 'staff-payments.sql');
  fs.writeFileSync(out, buildSql(items), { mode: 0o600 });
  // فقط شمار ردیف و جمع هر فایل چاپ می‌شود؛ نه نام و نه شبا.
  for (const { entry, rows } of items) console.log(`  ${entry.title}: ${rows.length} ردیف، ${rows.reduce((s, r) => s + r.amount, 0).toLocaleString('en-US')} تومان`);
  console.log(`✓ ${items.reduce((s, i) => s + i.rows.length, 0)} واریز → ${out}`);
  console.log('  حاوی مبلغ و نام است؛ پیش از اجرا بخوانید و commit نکنید.');
}

if (process.argv[1] && /staff-payments-sql\.ts$/.test(process.argv[1])) main();
