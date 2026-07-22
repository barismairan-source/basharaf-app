// GET /api/inventory/reports/exceptions?branchId=X
import { NextResponse } from 'next/server';
import { and, eq, lt, gt, isNotNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession, ForbiddenError } from '@/lib/auth/session';
import { canAccessSection } from '@/lib/auth/permissions';
import { handleError } from '@/lib/api-error';

export async function GET(req: Request) {
  try {
    const session = await requireSession();
    if (!canAccessSection(session, 'inventory')) {
      throw new ForbiddenError();
    }

    const { searchParams } = new URL(req.url);
    const requestedBranchId = searchParams.get('branchId');

    // SuperAdmin هر branchId درخواستی رو می‌بینه؛ BranchUser/Warehouse فقط
    // شعبه‌ی خود نشست‌شون رو — branchId ارسالی توسط کاربر غیرمدیر نادیده
    // گرفته می‌شه تا نتونه به شعبه‌ی دیگه دسترسی پیدا کنه.
    const effectiveBranchId = session.role === 'SuperAdmin' ? requestedBranchId : session.branchId;
    if (!effectiveBranchId) {
      return NextResponse.json({ error: 'این نشست به هیچ شعبه‌ای متصل نیست' }, { status: 400 });
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
        eq(schema.invVouchers.branchId, effectiveBranchId),
        eq(schema.invVouchers.status, 'pending'),
        lt(schema.invVouchers.createdAt, cutoff48h),
      ));

    // ۲. clamp warning های ۷ روز اخیر از audit_log — meta فقط JSON متنی است
    // (بدون ستون branchId مجزا)، پس فیلتر شعبه بعد از parse در JS انجام می‌شود.
    const clampWarningsRaw = await db.select({
      id: schema.auditLog.id,
      meta: schema.auditLog.meta,
      createdAt: schema.auditLog.createdAt,
    })
      .from(schema.auditLog)
      .where(and(
        eq(schema.auditLog.action, 'inventory_clamp_warning'),
        gt(schema.auditLog.createdAt, cutoff7d),
      ));
    const clampWarnings = clampWarningsRaw
      .map(w => ({ ...w, parsedMeta: w.meta ? JSON.parse(w.meta) : {} }))
      .filter(w => w.parsedMeta.branchId === effectiveBranchId);

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
        eq(schema.invItems.branchId, effectiveBranchId),
        eq(schema.invItems.isActive, true),
        sql`${schema.invItems.minBase}::numeric > 0`,
        sql`${schema.invItems.qtyPhysical}::numeric < ${schema.invItems.minBase}::numeric`,
      ));

    // ۴. reversal های pending
    const pendingReversals = await db.select({
      id: schema.invVouchers.id,
      code: schema.invVouchers.no,
      parentVoucherId: schema.invVouchers.parentVoucherId,
    })
      .from(schema.invVouchers)
      .where(and(
        eq(schema.invVouchers.branchId, effectiveBranchId),
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
        items: clampWarnings.map(w => ({
          itemId: w.parsedMeta.itemId ?? null,
          shortfall: w.parsedMeta.shortfall ?? 0,
          voucherId: w.parsedMeta.voucherId ?? null,
          createdAt: w.createdAt.toISOString(),
        })),
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
