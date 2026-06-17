// GET /api/inventory/reports/exceptions?branchId=X
import { NextResponse } from 'next/server';
import { and, eq, lt, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    if (!branchId) {
      return NextResponse.json({ error: 'branchId الزامی است' }, { status: 400 });
    }

    const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ۱. برگه‌های pending قدیمی (> ۴۸ ساعت)
    const stalePending = await db.select({
      id: schema.invVouchers.id,
      code: schema.invVouchers.no,
      kind: schema.invVouchers.kind,
      createdAt: schema.invVouchers.createdAt,
    })
      .from(schema.invVouchers)
      .where(and(
        eq(schema.invVouchers.branchId, branchId),
        eq(schema.invVouchers.status, 'pending'),
        lt(schema.invVouchers.createdAt, cutoff48h),
      ));

    // ۲. clamp warning های ۷ روز اخیر از audit_log
    const clampWarnings = await db.select({
      id: schema.auditLog.id,
      meta: schema.auditLog.meta,
      createdAt: schema.auditLog.createdAt,
    })
      .from(schema.auditLog)
      .where(and(
        eq(schema.auditLog.action, 'inventory_clamp_warning'),
        sql`${schema.auditLog.createdAt} > ${cutoff7d}`,
      ));

    // ۳. اقلام زیر حداقل موجودی
    const belowMin = await db.select({
      id: schema.invItems.id,
      name: schema.invItems.name,
      qtyPhysical: schema.invItems.qtyPhysical,
      minBase: schema.invItems.minBase,
      unit: schema.invItems.unit,
    })
      .from(schema.invItems)
      .where(and(
        eq(schema.invItems.branchId, branchId),
        eq(schema.invItems.isActive, true),
        sql`${schema.invItems.minBase} > 0`,
        sql`${schema.invItems.qtyPhysical} < ${schema.invItems.minBase}`,
      ));

    // ۴. reversal های pending
    const pendingReversals = await db.select({
      id: schema.invVouchers.id,
      code: schema.invVouchers.no,
      parentVoucherId: schema.invVouchers.parentVoucherId,
    })
      .from(schema.invVouchers)
      .where(and(
        eq(schema.invVouchers.branchId, branchId),
        eq(schema.invVouchers.status, 'pending'),
        isNotNull(schema.invVouchers.parentVoucherId),
      ));

    return NextResponse.json({
      stalePending: {
        count: stalePending.length,
        items: stalePending.map(v => ({
          id: v.id,
          code: v.code,
          kind: v.kind,
          createdAt: v.createdAt.toISOString(),
        })),
      },
      clampWarnings: {
        count: clampWarnings.length,
        items: clampWarnings.map(w => {
          const meta = w.meta ? JSON.parse(w.meta) : {};
          return {
            itemId: meta.itemId ?? null,
            shortfall: meta.shortfall ?? 0,
            voucherId: meta.voucherId ?? null,
            createdAt: w.createdAt.toISOString(),
          };
        }),
      },
      belowMin: {
        count: belowMin.length,
        items: belowMin.map(it => ({
          id: it.id,
          name: it.name,
          qtyPhysical: parseFloat(it.qtyPhysical as string) || 0,
          minBase: parseFloat(it.minBase as string) || 0,
          unit: it.unit,
        })),
      },
      pendingReversals: {
        count: pendingReversals.length,
        items: pendingReversals.map(v => ({
          id: v.id,
          code: v.code,
          parentVoucherId: v.parentVoucherId,
        })),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
