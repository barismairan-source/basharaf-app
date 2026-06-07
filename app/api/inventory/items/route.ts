import { NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToInvItem } from '@/lib/db/inventory.serializers';

/**
 * /api/inventory/items
 *   GET  — لیست اقلام (branch scope مثل تراکنش‌ها)
 *   POST — ساخت قلم جدید (خام یا نیمه‌آماده)
 */

const createItemSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(120),
  category: z.string().max(60).optional().default('سایر'),
  kind: z.enum(['raw', 'prep']).default('raw'),
  branchId: z.string().uuid(),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'pcs', 'can', 'pack']).default('kg'),
  basePerUnit: z.number().positive().default(1000),
  yieldPct: z.number().min(1).max(100).default(100),
  minBase: z.number().min(0).default(0),
  // فقط نیمه‌آماده:
  batchYieldBase: z.number().positive().optional().nullable(),
  shelfLifeDays: z.number().int().min(1).default(1),
  prepRecipe: z.array(z.object({ itemId: z.string().uuid(), qtyBase: z.number().positive() })).optional().nullable(),
});

export async function GET() {
  try {
    const session = await requireSession();
    const where = session.role === 'BranchUser' && session.branchId
      ? eq(schema.invItems.branchId, session.branchId)
      : undefined;

    const rows = await db.select().from(schema.invItems)
      .where(where).orderBy(desc(schema.invItems.createdAt));
    return NextResponse.json({ items: rows.map(rowToInvItem) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const input = createItemSchema.parse(await req.json());

    if (session.role === 'BranchUser' && input.branchId !== session.branchId) {
      throw new ApiError(403, 'شما فقط می‌توانید برای شعبه‌ی خود قلم ثبت کنید', 'BRANCH_MISMATCH');
    }

    // یکتایی کد در شعبه
    const [dup] = await db.select({ id: schema.invItems.id }).from(schema.invItems)
      .where(and(eq(schema.invItems.branchId, input.branchId), eq(schema.invItems.code, input.code)))
      .limit(1);
    if (dup) throw new ApiError(409, 'کد قلم در این شعبه تکراری است', 'DUPLICATE_CODE');

    const [row] = await db.insert(schema.invItems).values({
      code: input.code,
      name: input.name,
      category: input.category ?? 'سایر',
      kind: input.kind,
      branchId: input.branchId,
      unit: input.unit,
      basePerUnit: String(input.basePerUnit),
      yieldPct: String(input.yieldPct),
      minBase: String(input.minBase),
      batchYieldBase: input.batchYieldBase != null ? String(input.batchYieldBase) : null,
      shelfLifeDays: input.shelfLifeDays,
      prepRecipe: input.prepRecipe ?? null,
    }).returning();

    if (!row) throw new ApiError(500, 'خطا در ثبت قلم', 'INSERT_FAILED');
    return NextResponse.json({ item: rowToInvItem(row) }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
