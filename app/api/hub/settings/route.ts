import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { rowToHubSettings } from '@/lib/db/hubSerializers';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  title: z.string().max(80).optional(),
  bio: z.string().max(200).optional(),
  addressFa: z.string().max(300).optional(),
  mapUrl: z.string().max(500).nullable().optional(),
  showQr: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [row] = await db.update(schema.linkHubSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.linkHubSettings.id, 1)).returning();
    return NextResponse.json({ settings: row ? rowToHubSettings(row) : null });
  } catch (e) {
    return handleError(e);
  }
}
