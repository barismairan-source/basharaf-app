import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

const patchSchema = z.object({
  faFont: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
  addressFa: z.string().max(300).optional(),
  addressEn: z.string().max(300).optional(),
  instagram: z.string().max(80).optional(),
});

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const [row] = await db.update(schema.menuSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.menuSettings.id, 1)).returning();
    return NextResponse.json({
      settings: row ? {
        faFont: row.faFont, phone: row.phone, addressFa: row.addressFa,
        addressEn: row.addressEn, instagram: row.instagram,
      } : null,
    });
  } catch (e) {
    return handleError(e);
  }
}
