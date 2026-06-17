import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { canDo } from '@/lib/auth/permissions';
import { ApiError, handleError } from '@/lib/api-error';
import {
  resolvePrepCostChain,
  chainPersistOrder,
  type PrepNode,
  type CostingItem,
  type CostingLine,
} from '@/lib/inventory/costing';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/items/:id/recost
 *
 * بازمحاسبه‌ی چندلایه‌ی بهای یک نیمه‌آماده (prep) و همه‌ی نیمه‌آماده‌های
 * تو در توی آن (prep-of-prep)، از پایین (مواد خام) به بالا.
 *
 * برخلاف costPrepItem (تک‌لایه که فقط به avgCostPerBase ذخیره‌شده‌ی هر قلم ورودی
 * اعتماد می‌کند)، این مسیر کل زنجیره را تازه حل می‌کند و avgCostPerBase
 * نیمه‌آماده‌های لمس‌شده را — به‌ترتیب امن (عمیق‌ترین اول) — به‌روزرسانی می‌کند.
 *
 * توجه: این فقط بهای «تئوریک» را بازمحاسبه می‌کند (برای هم‌راستاسازی costing/قیمت‌گذاری).
 * موجودی واقعی و میانگین موزون فقط با گردش انبار (produceConfirmed/...) تغییر می‌کند —
 * اینجا دست به qtyBase/qtyPhysical نمی‌زنیم.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireSession();
    // محاسبه‌ی بهای تمام‌شده یک عملیات مالی است — تفکیک وظایف: انباردار اجازه ندارد
    if (!canDo(session, 'inventory.viewCosts')) {
      throw new ApiError(403, 'شما اجازه‌ی محاسبه‌ی بهای تمام‌شده را ندارید', 'FORBIDDEN');
    }

    const [target] = await db.select().from(schema.invItems)
      .where(eq(schema.invItems.id, params.id)).limit(1);
    if (!target) throw new ApiError(404, 'قلم پیدا نشد', 'NOT_FOUND');
    if (target.kind !== 'prep') {
      throw new ApiError(400, 'فقط برای اقلام نیمه‌آماده قابل بازمحاسبه است', 'NOT_PREP');
    }
    if (session.role === 'BranchUser' && target.branchId !== session.branchId) {
      throw new ApiError(403, 'شما به این قلم دسترسی ندارید', 'BRANCH_MISMATCH');
    }

    // همه‌ی اقلام prep همان شعبه را بگیر — چون زنجیره ممکن است به آن‌ها برسد
    const branchFilter = target.branchId ? eq(schema.invItems.branchId, target.branchId) : undefined;
    const allItems = await db.select().from(schema.invItems).where(branchFilter);

    const rawItemsById: Record<string, CostingItem> = {};
    const prepsById: Record<string, PrepNode> = {};

    for (const it of allItems) {
      if (it.kind === 'raw') {
        rawItemsById[it.id] = {
          id: it.id, name: it.name, unit: it.unit, kind: 'raw',
          avgCostPerBase: Number(it.avgCostPerBase),
          yieldPct: Number(it.yieldPct),
        };
      } else if (it.kind === 'prep' && it.prepRecipe) {
        const recipe = it.prepRecipe as Array<{ itemId: string; qtyBase: number; overridePct?: number | null }>;
        const lines: CostingLine[] = recipe.map((r) => ({
          itemId: r.itemId,
          qtyBase: Number(r.qtyBase),
          overridePct: r.overridePct == null ? null : Number(r.overridePct),
        }));
        prepsById[it.id] = { id: it.id, lines, baseYieldQty: Number(it.batchYieldBase) || 0, yieldPct: Number(it.yieldPct) || 100 };
      }
    }

    const resolved = resolvePrepCostChain(target.id, prepsById, rawItemsById);
    const order = chainPersistOrder(resolved);

    if (order.length === 0) {
      const self = resolved.get(target.id);
      if (self?.hasCycle) {
        throw new ApiError(409, 'حلقه در زنجیره‌ی نیمه‌آماده شناسایی شد — بازمحاسبه ممکن نیست', 'PREP_CYCLE');
      }
    }

    // persist: عمیق‌ترین (پایه‌ای‌ترین) نیمه‌آماده‌ها اول
    const updated: Array<{ id: string; avgCostPerBase: number; depth: number; hasMissingCosts: boolean }> = [];
    await db.transaction(async (tx) => {
      for (const r of order) {
        await tx.update(schema.invItems)
          .set({ avgCostPerBase: String(r.avgCostPerBase), updatedAt: new Date() })
          .where(eq(schema.invItems.id, r.itemId));
        updated.push({ id: r.itemId, avgCostPerBase: r.avgCostPerBase, depth: r.depth, hasMissingCosts: r.hasMissingCosts });
      }
    });

    const cycles = [...resolved.values()].filter((r) => r.hasCycle).map((r) => r.itemId);

    return NextResponse.json({
      target: target.id,
      updated,
      cycles,
      hasMissingCosts: [...resolved.values()].some((r) => r.hasMissingCosts),
    });
  } catch (e) {
    return handleError(e);
  }
}
