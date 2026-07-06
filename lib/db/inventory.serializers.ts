import { schema } from './client';

/**
 * Inventory serializers — هم‌سبک serializers.ts هسته.
 *
 * دو تبدیل مهم:
 *   bigint  → Number (مثل toNum در serializers.ts؛ Next.js نمی‌تواند bigint را JSON کند)
 *   numeric → Number (drizzle ستون numeric را به‌صورت string برمی‌گرداند)
 */

function toNum(v: bigint | number | string | null | undefined): number {
  if (v == null) return 0;
  if (typeof v === 'bigint') return Number(v);
  if (typeof v === 'string') return parseFloat(v) || 0;
  return v;
}

/**
 * @param maskCosts اگر true باشد، فیلدهای مالی (avgCostPerBase) پنهان می‌شوند —
 *   تفکیک وظایف انبار/حسابداری: نقش انباردار فقط مقدار فیزیکی را می‌بیند.
 */
export function rowToInvItem(row: typeof schema.invItems.$inferSelect, maskCosts = false) {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category,
    kind: row.kind,
    branchId: row.branchId,
    unit: row.unit,
    basePerUnit: toNum(row.basePerUnit),
    yieldPct: toNum(row.yieldPct),
    qtyPhysical: toNum(row.qtyPhysical),
    qtyBase: toNum(row.qtyBase),
    avgCostPerBase: maskCosts ? null : toNum(row.avgCostPerBase),
    minBase: toNum(row.minBase),
    batchYieldBase: row.batchYieldBase == null ? null : toNum(row.batchYieldBase),
    shelfLifeDays: row.shelfLifeDays,
    prepRecipe: (row.prepRecipe as Array<{ itemId: string; qtyBase: number }> | null) ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function rowToInvRecipe(
  row: typeof schema.invRecipes.$inferSelect,
  lines?: Array<typeof schema.invRecipeLines.$inferSelect>
) {
  return {
    id: row.id,
    name: row.name,
    branchId: row.branchId,
    portions: row.portions,
    targetFcPct: toNum(row.targetFcPct),
    price: toNum(row.price),
    cookMode: row.cookMode,
    shelfLifeDays: row.shelfLifeDays,
    menuItemId: row.menuItemId ?? null,
    isActive: row.isActive,
    lines: (lines ?? []).map((l) => ({
      id: l.id,
      itemId: l.itemId,
      qtyBase: toNum(l.qtyBase),
      overridePct: l.overridePct == null ? null : toNum(l.overridePct),
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function rowToInvVoucher(
  row: typeof schema.invVouchers.$inferSelect,
  lines?: Array<typeof schema.invVoucherLines.$inferSelect>,
  maskCosts = false
) {
  return {
    id: row.id,
    no: row.no,
    kind: row.kind,
    status: row.status,
    branchId: row.branchId,
    estTotal: maskCosts ? null : toNum(row.estTotal),
    finalTotal: maskCosts ? null : (row.finalTotal == null ? null : toNum(row.finalTotal)),
    note: row.note,
    saleMeta: row.saleMeta ?? null,
    createdBy: row.createdBy,
    makerDate: row.makerDate,
    createdAt: row.createdAt.toISOString(),
    approvedBy: row.approvedBy ?? null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedBy: row.rejectedBy ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    rejectionReason: row.rejectionReason ?? null,
    linkedTransactionId: row.linkedTransactionId ?? null,
    parentVoucherId: row.parentVoucherId ?? null,
    lines: (lines ?? []).map((l) => ({
      id: l.id,
      itemId: l.itemId,
      qtyBase: toNum(l.qtyBase),
      estUnitCost: maskCosts ? null : toNum(l.estUnitCost),
      finalUnitCost: maskCosts ? null : (l.finalUnitCost == null ? null : toNum(l.finalUnitCost)),
      expiryDate: l.expiryDate ?? null,
      wasteReason: l.wasteReason ?? null,
    })),
    updatedAt: row.updatedAt.toISOString(),
  };
}
