import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { rowToOrdZone } from '@/lib/db/ordering.serializers';
import type { OrdZone, NewOrdZoneInput, OrdZonePatch } from '@/types';

/**
 * ─────────────────────────────────────────────────────────────────
 * محدوده‌های ارسال (ord_zones) — CRUD ساده، scope شعبه در route چک می‌شود.
 * ───────────────────────────────────────────────────────────────── */

export async function listOrdZones(branchId: string): Promise<OrdZone[]> {
  const rows = await db.select().from(schema.ordZones)
    .where(eq(schema.ordZones.branchId, branchId))
    .orderBy(schema.ordZones.name);
  return rows.map(rowToOrdZone);
}

export async function getOrdZone(id: string): Promise<OrdZone | null> {
  const [row] = await db.select().from(schema.ordZones)
    .where(eq(schema.ordZones.id, id)).limit(1);
  return row ? rowToOrdZone(row) : null;
}

export async function createOrdZone(input: NewOrdZoneInput): Promise<OrdZone> {
  const [row] = await db.insert(schema.ordZones).values({
    branchId: input.branchId,
    name: input.name,
    deliveryFee: input.deliveryFee,
    minOrder: input.minOrder ?? 0,
    isActive: input.isActive ?? true,
  }).returning();
  return rowToOrdZone(row!);
}

export async function updateOrdZone(id: string, patch: OrdZonePatch): Promise<OrdZone | null> {
  const [row] = await db.update(schema.ordZones).set(patch)
    .where(eq(schema.ordZones.id, id)).returning();
  return row ? rowToOrdZone(row) : null;
}

export async function deleteOrdZone(id: string): Promise<OrdZone | null> {
  const [row] = await db.delete(schema.ordZones)
    .where(eq(schema.ordZones.id, id)).returning();
  return row ? rowToOrdZone(row) : null;
}
