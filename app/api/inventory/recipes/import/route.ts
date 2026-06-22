import { NextResponse } from 'next/server';
import { read, utils } from 'xlsx';
import { eq, and, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireRole } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import type { InvUnit } from '@/types/inventory';

/**
 * POST /api/inventory/recipes/import
 *
 * دریافت فایل Excel (multipart/form-data، فیلد «file»)
 * ایمپورت سه‌لایه‌ی BOM در یک تراکنش اتمیک:
 *   شیت ۱ «۱_مواد خام»   → invItems (kind='raw')
 *   شیت ۲ «۲_زیررسپی»   → invItems (kind='prep') + prepRecipe JSON
 *   شیت ۳ «۳_پرس نهایی» → invRecipes + invRecipeLines
 */

const SHEET_RAW  = '۱_مواد خام';
const SHEET_PREP = '۲_زیررسپی';
const SHEET_MAIN = '۳_پرس نهایی';

const VALID_UNITS: InvUnit[] = ['kg', 'g', 'L', 'ml', 'pcs', 'can', 'pack'];

function isValidUnit(u: string): u is InvUnit {
  return (VALID_UNITS as string[]).includes(u);
}

// 1 kg → 1000 g base units; 1 L → 1000 ml; else 1:1
function unitToBasePerUnit(unit: InvUnit): number {
  return unit === 'kg' || unit === 'L' ? 1000 : 1;
}

function autoCode(kind: 'raw' | 'prep', index: number): string {
  const prefix = kind === 'raw' ? 'R' : 'P';
  const ts = Date.now().toString(36).slice(-5).toUpperCase();
  return `${prefix}-${ts}-${String(index).padStart(3, '0')}`;
}

// Extract adjacent header pairs: header starting with «ماده» followed by header starting with «مقدار»
function extractIngredientPairs(
  headers: string[],
  row: Record<string, unknown>
): Array<{ name: string; qty: number }> {
  const pairs: Array<{ name: string; qty: number }> = [];
  for (let i = 0; i < headers.length - 1; i++) {
    const h0 = headers[i];
    const h1 = headers[i + 1];
    if (h0 && h1 && h0.startsWith('ماده') && h1.startsWith('مقدار')) {
      const name = String(row[h0] ?? '').trim();
      const qty  = Number(row[h1]  ?? 0);
      if (name && qty > 0) pairs.push({ name, qty });
      i++; // skip the «مقدار» column, already consumed
    }
  }
  return pairs;
}

function sheetRows(wb: ReturnType<typeof read>, name: string): Record<string, unknown>[] {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  return utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
}

export async function POST(req: Request) {
  try {
    const session = await requireRole('SuperAdmin', 'Chef');
    const branchId = session.branchId ?? null;

    // ── Parse multipart form ────────────────────────────────────────
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ApiError(400, 'فایل Excel ارسال نشده است', 'NO_FILE');
    }
    if (!file.name.match(/\.(xlsx|xls|ods)$/i)) {
      throw new ApiError(400, 'فقط فایل‌های Excel (.xlsx / .xls) پذیرفته می‌شوند', 'INVALID_FORMAT');
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = read(buffer, { type: 'buffer' });

    // ── Validate required sheets ────────────────────────────────────
    const missing = [SHEET_RAW, SHEET_PREP, SHEET_MAIN].filter(
      (s) => !wb.SheetNames.includes(s)
    );
    if (missing.length > 0) {
      throw new ApiError(
        400,
        `شیت‌های زیر در فایل یافت نشدند: ${missing.join('، ')}. لطفاً از فایل الگو استفاده کنید.`,
        'MISSING_SHEETS',
        { missing }
      );
    }

    const rawRows  = sheetRows(wb, SHEET_RAW);
    const prepRows = sheetRows(wb, SHEET_PREP);
    const mainRows = sheetRows(wb, SHEET_MAIN);

    // ── Main transaction ────────────────────────────────────────────
    const summary = await db.transaction(async (tx) => {
      // name.toLowerCase() → invItems.id — accumulated across all 3 sheets
      const itemsByName = new Map<string, string>();

      async function findItem(name: string, kind: 'raw' | 'prep'): Promise<string | null> {
        const [row] = await tx
          .select({ id: schema.invItems.id })
          .from(schema.invItems)
          .where(and(
            eq(schema.invItems.name, name),
            eq(schema.invItems.kind, kind),
            branchId ? eq(schema.invItems.branchId, branchId) : isNull(schema.invItems.branchId)
          ))
          .limit(1);
        return row?.id ?? null;
      }

      async function findAnyItem(name: string): Promise<string | null> {
        const [row] = await tx
          .select({ id: schema.invItems.id })
          .from(schema.invItems)
          .where(eq(schema.invItems.name, name))
          .limit(1);
        return row?.id ?? null;
      }

      // ══════════════════════════════════════════════════════
      // شیت ۱ — مواد خام
      // ══════════════════════════════════════════════════════
      let rawCount = 0;

      for (const [idx, row] of rawRows.entries()) {
        const name = String(row['نام'] ?? '').trim();
        if (!name) continue;

        const rowLabel    = `شیت «${SHEET_RAW}» ردیف ${idx + 2}`;
        const unitRaw     = String(row['واحد']        ?? '').trim();
        const pricePerUnit = Number(row['قیمت خرید']  ?? 0);
        const category    = String(row['دسته‌بندی']  ?? '').trim() || 'سایر';
        const codeInput   = String(row['کد']           ?? '').trim();

        if (!isValidUnit(unitRaw)) {
          throw new ApiError(
            400,
            `${rowLabel}: واحد «${unitRaw}» نامعتبر است. واحدهای مجاز: ${VALID_UNITS.join(', ')}`,
            'INVALID_UNIT',
            { row: idx + 2, sheet: SHEET_RAW, value: unitRaw }
          );
        }
        const unit        = unitRaw as InvUnit;
        const basePerUnit = unitToBasePerUnit(unit);
        const avgCostPerBase = pricePerUnit > 0 && basePerUnit > 0
          ? pricePerUnit / basePerUnit
          : 0;

        const existingId = await findItem(name, 'raw');

        if (existingId) {
          await tx.update(schema.invItems)
            .set({
              unit, category,
              ...(avgCostPerBase > 0 ? { avgCostPerBase: String(avgCostPerBase) } : {}),
              updatedAt: new Date(),
            })
            .where(eq(schema.invItems.id, existingId));
          itemsByName.set(name.toLowerCase(), existingId);
        } else {
          const code = codeInput || autoCode('raw', idx + 1);
          const [inserted] = await tx
            .insert(schema.invItems)
            .values({
              code, name, category, kind: 'raw', branchId, unit,
              basePerUnit: String(basePerUnit),
              yieldPct: '100',
              avgCostPerBase: avgCostPerBase > 0 ? String(avgCostPerBase) : '0',
            })
            .returning({ id: schema.invItems.id });
          if (!inserted) throw new ApiError(500, `خطا در ثبت ماده خام «${name}»`, 'INSERT_FAILED');
          itemsByName.set(name.toLowerCase(), inserted.id);
        }
        rawCount++;
      }

      // ══════════════════════════════════════════════════════
      // شیت ۲ — زیررسپی (نیمه‌آماده)
      // ══════════════════════════════════════════════════════
      let prepCount = 0;

      for (const [idx, row] of prepRows.entries()) {
        const name = String(row['نام'] ?? '').trim();
        if (!name) continue;

        const rowLabel   = `شیت «${SHEET_PREP}» ردیف ${idx + 2}`;
        const unitRaw    = String(row['واحد']             ?? '').trim();
        const batchYield = Number(row['بازده بچ']         ?? 0);
        const shelfLife  = Number(row['ماندگاری (روز)']  ?? 1) || 1;
        const category   = String(row['دسته‌بندی']       ?? '').trim() || 'نیمه‌آماده';
        const codeInput  = String(row['کد']               ?? '').trim();

        if (!isValidUnit(unitRaw)) {
          throw new ApiError(
            400, `${rowLabel}: واحد «${unitRaw}» نامعتبر است`,
            'INVALID_UNIT', { row: idx + 2, sheet: SHEET_PREP, value: unitRaw }
          );
        }
        const unit = unitRaw as InvUnit;

        const headers = Object.keys(row);
        const pairs   = extractIngredientPairs(headers, row);

        const prepRecipeJson: Array<{ itemId: string; qtyBase: number }> = [];
        for (const pair of pairs) {
          const key = pair.name.toLowerCase();
          let id = itemsByName.get(key);
          if (!id) {
            const found = await findAnyItem(pair.name);
            if (!found) {
              throw new ApiError(
                400,
                `${rowLabel}: ماده «${pair.name}» پیدا نشد — ابتدا در شیت «${SHEET_RAW}» تعریف کنید`,
                'INGREDIENT_NOT_FOUND',
                { ingredient: pair.name, row: idx + 2, sheet: SHEET_PREP }
              );
            }
            itemsByName.set(key, found);
            id = found;
          }
          prepRecipeJson.push({ itemId: id, qtyBase: pair.qty });
        }

        const existingId = await findItem(name, 'prep');

        if (existingId) {
          await tx.update(schema.invItems)
            .set({
              unit, category, shelfLifeDays: shelfLife,
              batchYieldBase: batchYield > 0 ? String(batchYield) : null,
              prepRecipe: prepRecipeJson.length > 0 ? prepRecipeJson : null,
              updatedAt: new Date(),
            })
            .where(eq(schema.invItems.id, existingId));
          itemsByName.set(name.toLowerCase(), existingId);
        } else {
          const code = codeInput || autoCode('prep', idx + 1);
          const [inserted] = await tx
            .insert(schema.invItems)
            .values({
              code, name, category, kind: 'prep', branchId, unit,
              basePerUnit: String(unitToBasePerUnit(unit)),
              yieldPct: '100',
              batchYieldBase: batchYield > 0 ? String(batchYield) : null,
              shelfLifeDays: shelfLife,
              prepRecipe: prepRecipeJson.length > 0 ? prepRecipeJson : null,
            })
            .returning({ id: schema.invItems.id });
          if (!inserted) throw new ApiError(500, `خطا در ثبت نیمه‌آماده «${name}»`, 'INSERT_FAILED');
          itemsByName.set(name.toLowerCase(), inserted.id);
        }
        prepCount++;
      }

      // ══════════════════════════════════════════════════════
      // شیت ۳ — پرس نهایی (رسپی‌ها)
      // ══════════════════════════════════════════════════════
      let recipesCreated = 0;
      let recipesUpdated = 0;

      for (const [idx, row] of mainRows.entries()) {
        const name = String(row['نام'] ?? '').trim();
        if (!name) continue;

        const rowLabel    = `شیت «${SHEET_MAIN}» ردیف ${idx + 2}`;
        const portions    = Math.max(1, Number(row['تعداد پرس']   ?? 1) || 1);
        const price       = Math.round(Number(row['قیمت فروش']    ?? 0));
        const cookModeRaw = String(row['نوع پخت']                 ?? '').trim();
        const cookMode    = cookModeRaw === 'batch' ? 'batch' as const : 'daily' as const;
        const targetFcPct = Number(row['food cost هدف']           ?? 30) || 30;

        const headers = Object.keys(row);
        const pairs   = extractIngredientPairs(headers, row);

        if (pairs.length === 0) {
          throw new ApiError(
            400,
            `${rowLabel}: رسپی «${name}» هیچ ماده‌ای ندارد — حداقل یک جفت ستون ماده/مقدار لازم است`,
            'NO_INGREDIENTS',
            { recipe: name, row: idx + 2, sheet: SHEET_MAIN }
          );
        }

        const lines: Array<{ itemId: string; qtyBase: number }> = [];
        for (const pair of pairs) {
          const key = pair.name.toLowerCase();
          let id = itemsByName.get(key);
          if (!id) {
            const found = await findAnyItem(pair.name);
            if (!found) {
              throw new ApiError(
                400,
                `${rowLabel}: ماده «${pair.name}» پیدا نشد — در شیت مواد خام یا زیررسپی تعریف کنید`,
                'INGREDIENT_NOT_FOUND',
                { ingredient: pair.name, row: idx + 2, sheet: SHEET_MAIN }
              );
            }
            itemsByName.set(key, found);
            id = found;
          }
          lines.push({ itemId: id, qtyBase: pair.qty });
        }

        // Optional: auto-link to digital menu item by Farsi title
        const [menuMatch] = await tx
          .select({ id: schema.menuItems.id })
          .from(schema.menuItems)
          .where(eq(schema.menuItems.titleFa, name))
          .limit(1);
        const menuItemId = menuMatch?.id ?? null;

        const [existingRecipe] = await tx
          .select({ id: schema.invRecipes.id })
          .from(schema.invRecipes)
          .where(and(
            eq(schema.invRecipes.name, name),
            branchId ? eq(schema.invRecipes.branchId, branchId) : isNull(schema.invRecipes.branchId)
          ))
          .limit(1);

        let recipeId: string;

        if (existingRecipe) {
          recipeId = existingRecipe.id;
          await tx.update(schema.invRecipes)
            .set({ portions, price, cookMode, targetFcPct: String(targetFcPct), menuItemId, updatedAt: new Date() })
            .where(eq(schema.invRecipes.id, recipeId));
          await tx.delete(schema.invRecipeLines)
            .where(eq(schema.invRecipeLines.recipeId, recipeId));
          recipesUpdated++;
        } else {
          const [inserted] = await tx
            .insert(schema.invRecipes)
            .values({ name, branchId, portions, price, cookMode, targetFcPct: String(targetFcPct), menuItemId })
            .returning({ id: schema.invRecipes.id });
          if (!inserted) throw new ApiError(500, `خطا در ثبت رسپی «${name}»`, 'INSERT_FAILED');
          recipeId = inserted.id;
          recipesCreated++;
        }

        for (const line of lines) {
          await tx.insert(schema.invRecipeLines).values({
            recipeId,
            itemId: line.itemId,
            qtyBase: String(line.qtyBase),
          });
        }
      }

      return { rawCount, prepCount, recipesCreated, recipesUpdated };
    });

    return NextResponse.json({
      success: true,
      message: [
        `${summary.rawCount} ماده خام`,
        `${summary.prepCount} نیمه‌آماده`,
        `${summary.recipesCreated} رسپی جدید`,
        ...(summary.recipesUpdated > 0 ? [`${summary.recipesUpdated} رسپی به‌روزشده`] : []),
      ].join(' · ') + ' — ایمپورت کامل شد',
      ...summary,
    });
  } catch (e) {
    return handleError(e);
  }
}
