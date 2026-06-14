import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { rowToOrdSettings } from '@/lib/db/ordering.serializers';
import type { OrdSettings, OrdSettingsPatch } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────
 * تنظیمات سفارش بیرون‌بر — یک ردیف به ازای هر شعبه.
 *
 * getOrdSettings: اگر ردیفی برای شعبه نباشد، با مقادیر پیش‌فرض می‌سازد
 * (idempotent با onConflictDoNothing روی branch_id).
 * ───────────────────────────────────────────────────────────────── */

export async function getOrdSettings(branchId: string): Promise<OrdSettings> {
  const [existing] = await db.select().from(schema.ordSettings)
    .where(eq(schema.ordSettings.branchId, branchId)).limit(1);
  if (existing) return rowToOrdSettings(existing);

  const [created] = await db.insert(schema.ordSettings)
    .values({ branchId })
    .onConflictDoNothing({ target: schema.ordSettings.branchId })
    .returning();
  if (created) return rowToOrdSettings(created);

  const [row] = await db.select().from(schema.ordSettings)
    .where(eq(schema.ordSettings.branchId, branchId)).limit(1);
  return rowToOrdSettings(row!);
}

export async function updateOrdSettings(branchId: string, patch: OrdSettingsPatch): Promise<OrdSettings> {
  await getOrdSettings(branchId); // مطمئن شو ردیف وجود دارد

  const [row] = await db.update(schema.ordSettings).set(patch)
    .where(eq(schema.ordSettings.branchId, branchId)).returning();
  return rowToOrdSettings(row!);
}
