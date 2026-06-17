import { NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { forecast, type SalesDay, type RecipeLite, type ItemLite } from '@/lib/inventoryLogic';

/**
 * POST /api/inventory/forecast — پیش‌بینی پخت.
 * داده (اقلام، رسپی‌ها، فروش) را از DB می‌خواند و منطق خالص inventoryLogic را اجرا می‌کند.
 * body: { mode?, window?, horizon?, event? }
 */

const bodySchema = z.object({
  mode: z.enum(['simple', 'weekday']).optional(),
  window: z.number().int().min(1).max(120).optional(),
  horizon: z.number().int().min(1).max(30).optional(),
  event: z.object({
    type: z.string().optional(),
    factorOverride: z.number().min(0).optional().nullable(),
    reserved: z.record(z.string(), z.number()).optional(),
  }).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const opts = bodySchema.parse(await req.json().catch(() => ({})));

    const branchWhere = session.role === 'BranchUser' && session.branchId
      ? eq(schema.invItems.branchId, session.branchId)
      : undefined;

    // اقلام
    const itemRows = await db.select().from(schema.invItems).where(branchWhere);
    const items: Record<string, ItemLite> = {};
    for (const it of itemRows) {
      items[it.id] = {
        id: it.id,
        name: it.name,
        kind: it.kind as 'raw' | 'prep',
        unit: it.unit,
        basePerUnit: parseFloat(it.basePerUnit),
        qtyBase: parseFloat(it.qtyBase),
        batchYieldBase: it.batchYieldBase ? parseFloat(it.batchYieldBase) : null,
        shelfLifeDays: it.shelfLifeDays,
        prepRecipe: (it.prepRecipe as Array<{ itemId: string; qtyBase: number }> | null) ?? null,
      };
    }

    // رسپی‌ها + خطوط
    const recipeWhere = session.role === 'BranchUser' && session.branchId
      ? eq(schema.invRecipes.branchId, session.branchId)
      : undefined;
    const recipeRows = await db.select().from(schema.invRecipes).where(recipeWhere);
    const recipes: Record<string, RecipeLite> = {};
    for (const r of recipeRows) {
      const rl = await db.select().from(schema.invRecipeLines)
        .where(eq(schema.invRecipeLines.recipeId, r.id));
      recipes[r.id] = { id: r.id, lines: rl.map((l) => ({ itemId: l.itemId, qtyBase: parseFloat(l.qtyBase) })) };
    }

    // فروش روزانه (تأییدشده) — جدیدترین‌ها
    const salesWhere = session.role === 'BranchUser' && session.branchId
      ? eq(schema.invDailySales.branchId, session.branchId)
      : undefined;
    const saleRows = await db.select().from(schema.invDailySales)
      .where(salesWhere).orderBy(desc(schema.invDailySales.createdAt)).limit(120);
    const sales: SalesDay[] = saleRows.map((s) => ({
      jalaliDate: s.jalaliDate,
      ts: s.createdAt.getTime(),
      lines: ((s.lines as Array<{ recipeId: string; name: string; qty: number }>) ?? [])
        .map((l) => ({ recipeId: l.recipeId, name: l.name, qty: l.qty })),
    }));

    const result = forecast(sales, recipes, items, opts);
    return NextResponse.json({ forecast: result });
  } catch (e) {
    return handleError(e);
  }
}
