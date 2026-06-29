/**
 * TEMPORARY DIAGNOSTIC ENDPOINT — DELETE AFTER USE
 * GET /api/admin/diag
 * SuperAdmin only
 */
import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { requireRole } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireRole('SuperAdmin');

    // ── Problem 3: isCredit distribution for transactions with contactId ──
    const creditStats = await db.execute(sql`
      SELECT
        is_credit,
        COUNT(*)::int AS count,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct
      FROM transactions
      WHERE contact_id IS NOT NULL
      GROUP BY is_credit
      ORDER BY is_credit DESC
    `);

    // contacts that have at least one isCredit=true transaction
    const contactsWithCredit = await db.execute(sql`
      SELECT COUNT(DISTINCT contact_id)::int AS count
      FROM transactions
      WHERE contact_id IS NOT NULL AND is_credit = true
    `);

    // total contacts that have any transaction
    const contactsWithAnyTx = await db.execute(sql`
      SELECT COUNT(DISTINCT contact_id)::int AS count
      FROM transactions
      WHERE contact_id IS NOT NULL
    `);

    // ── Problem 2: posted payroll runs vs journal_vouchers ──
    const postedRuns = await db.execute(sql`
      SELECT
        r.id,
        r.period_year_month,
        r.branch_name,
        r.status,
        r.posted_to_basharaf_at,
        jv.id AS jv_id,
        jv.status AS jv_status,
        jv.basharaf_voucher_id,
        jv.idempotency_key
      FROM payroll_runs r
      LEFT JOIN journal_vouchers jv
        ON jv.idempotency_key = 'payroll_run:' || r.id
      WHERE r.status = 'posted'
      ORDER BY r.period_year_month DESC
    `);

    // check if basharafVoucherId points to a real transaction
    const orphanCheck = await db.execute(sql`
      SELECT
        jv.id AS jv_id,
        jv.basharaf_voucher_id,
        t.id AS tx_id,
        t.status AS tx_status,
        t.amount
      FROM journal_vouchers jv
      JOIN payroll_runs r ON jv.idempotency_key = 'payroll_run:' || r.id
      LEFT JOIN transactions t ON t.id::text = jv.basharaf_voucher_id
      WHERE r.status = 'posted'
    `);

    return NextResponse.json({
      problem3: {
        creditDistribution: [...creditStats],
        contactsWithCreditTx: ([...contactsWithCredit][0] as any)?.count ?? 0,
        contactsWithAnyTx: ([...contactsWithAnyTx][0] as any)?.count ?? 0,
      },
      problem2: {
        postedRuns: [...postedRuns],
        orphanCheck: [...orphanCheck],
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
