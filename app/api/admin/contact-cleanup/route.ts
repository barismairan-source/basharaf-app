import { NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export interface ContactCleanupRow {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  balance: number;
  linkedTxCount: number;
  lastTxDate: string | null;
}

/**
 * GET /api/admin/contact-cleanup
 *
 * Query تشخیصی طرف‌حساب‌ها — فقط SuperAdmin.
 * هیچ داده‌ای تغییر نمی‌دهد — فقط خواندنی.
 */
export async function GET() {
  try {
    await requireAdmin();

    const rows = await db.execute<{
      id: string;
      name: string;
      type: string;
      phone: string | null;
      balance: string;
      linked_tx_count: string;
      last_tx_date: string | null;
    }>(sql`
      SELECT
        c.id,
        c.name,
        c.type,
        c.phone,
        c.balance,
        COUNT(t.id)          AS linked_tx_count,
        MAX(t.created_at)    AS last_tx_date
      FROM contacts c
      LEFT JOIN transactions t ON t.contact_id = c.id
      WHERE c.is_active = true
      GROUP BY c.id, c.name, c.type, c.phone, c.balance
      ORDER BY linked_tx_count DESC, c.name
    `);

    const contacts: ContactCleanupRow[] = [...rows].map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      phone: r.phone,
      balance: Number(r.balance),
      linkedTxCount: Number(r.linked_tx_count),
      lastTxDate: r.last_tx_date ?? null,
    }));

    return NextResponse.json({ contacts });
  } catch (e) {
    return handleError(e);
  }
}
