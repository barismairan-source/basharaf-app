import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

/**
 * پاک‌سازی امن اجراهای قدیمی حقوق ماهانه — برای شروع تمیز سیستم ساعتی.
 *
 * پیش‌فرض: dry-run (فقط گزارش، هیچ نوشتنی روی دیتابیس انجام نمی‌شود).
 * اجرای واقعی فقط با:
 *   PAYROLL_RESET_CONFIRM=RESET_TO_HOURLY_CONFIRMED npx tsx scripts/reset-payroll-to-hourly.ts
 *
 * محدوده‌ی این اسکریپت — فقط دو جدول، فقط اجراهای غیر-posted:
 *   - payroll_runs  (status IN draft|calculated|approved)
 *   - payslips      (فقط فیش‌های همان اجراها)
 *
 * این اسکریپت هرگز به این‌ها دست نمی‌زند (حتی در حالت تأییدشده):
 *   employees، employee_documents، شماره‌ملی/شبا/حساب‌بانکی/تماس اضطراری،
 *   branches، role/سمت، payroll_events، journal_vouchers، transactions، accounts،
 *   هر اجرای payroll_run با status='posted' (این‌ها فقط با مسیر رسمی reverse
 *   در lib/payroll/postToBasharaf.ts یا برنامه‌ی مهاجرت تأییدشده قابل تغییرند).
 *
 * دفاعی: حتی برای اجراهای غیر-posted، اگر journal_voucher مرتبطی پیدا شود
 * (حالت غیرمنتظره)، آن اجرا رد می‌شود و دست‌نخورده می‌ماند.
 */

const CONFIRM_VALUE = 'RESET_TO_HOURLY_CONFIRMED';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL تنظیم نشده — در .env.local اضافه کنید');

  const isConfirmed = process.env.PAYROLL_RESET_CONFIRM === CONFIRM_VALUE;
  console.log(isConfirmed ? '⚠️  حالت اجرای واقعی (نوشتن روی دیتابیس)' : '▶ حالت dry-run (فقط گزارش — هیچ چیزی حذف نمی‌شود)');
  console.log('');

  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  const runs = await db.select().from(schema.payrollRuns);
  const vouchers = await db.select({ payrollRunId: schema.journalVouchers.payrollRunId }).from(schema.journalVouchers);
  const voucherRunIds = new Set(vouchers.map(v => v.payrollRunId));

  const posted = runs.filter(r => r.status === 'posted');
  const eligible = runs.filter(r => r.status !== 'posted' && !voucherRunIds.has(r.id));
  const anomalous = runs.filter(r => r.status !== 'posted' && voucherRunIds.has(r.id));

  console.log(`مجموع اجراهای حقوق: ${runs.length}`);
  console.log(`  posted (دست‌نخورده می‌ماند — نیاز به reverse رسمی): ${posted.length}`);
  console.log(`  غیرعادی/دارای سند حسابداری غیرمنتظره (رد می‌شود، دست‌نخورده): ${anomalous.length}`);
  console.log(`  قابل پاک‌سازی (draft/calculated/approved، بدون سند حسابداری): ${eligible.length}`);
  console.log('');

  if (anomalous.length > 0) {
    console.log('⚠️  اجراهای غیرعادی (status≠posted ولی journal_voucher دارند) — بررسی دستی لازم است:');
    for (const r of anomalous) console.log(`   - ${r.id} (${r.periodYearMonth}, status=${r.status})`);
    console.log('');
  }

  let totalPayslips = 0;
  for (const r of eligible) {
    const slips = await db.select({ id: schema.payslips.id }).from(schema.payslips).where(eq(schema.payslips.payrollRunId, r.id));
    totalPayslips += slips.length;
    console.log(`  [${isConfirmed ? 'حذف' : 'حذف می‌شود (dry-run)'}] اجرا ${r.periodYearMonth} — ${r.branchName ?? 'همه شعبه‌ها'} — ${slips.length} فیش — status=${r.status}`);
  }
  console.log('');
  console.log(`مجموع فیش‌های قابل حذف: ${totalPayslips}`);
  console.log('');
  console.log('تضمین: employees، employee_documents، اطلاعات هویتی/بانکی/تماس، branches، سمت‌ها،');
  console.log('        payroll_events، journal_vouchers، transactions، accounts — هیچ‌کدام لمس نمی‌شوند.');

  if (!isConfirmed) {
    console.log('');
    console.log(`این فقط گزارش بود. برای اجرای واقعی: PAYROLL_RESET_CONFIRM=${CONFIRM_VALUE} npx tsx scripts/reset-payroll-to-hourly.ts`);
    await sql.end();
    return;
  }

  console.log('');
  console.log('در حال حذف...');
  for (const r of eligible) {
    await db.transaction(async (tx) => {
      await tx.delete(schema.payslips).where(eq(schema.payslips.payrollRunId, r.id));
      await tx.delete(schema.payrollRuns).where(eq(schema.payrollRuns.id, r.id));
    });
    console.log(`  ✓ حذف شد: اجرا ${r.periodYearMonth} (${r.id})`);
  }

  console.log('');
  console.log(`✓ پایان — ${eligible.length} اجرا و ${totalPayslips} فیش حذف شد.`);
  await sql.end();
}

main().catch((e) => {
  console.error('خطا:', e);
  process.exit(1);
});
