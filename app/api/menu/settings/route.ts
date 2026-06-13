import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { rowToMenuSettings } from '@/lib/db/menuSerializers';

export const dynamic = 'force-dynamic';


const patchSchema = z.object({
  faFont: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
  addressFa: z.string().max(300).optional(),
  addressEn: z.string().max(300).optional(),
  instagram: z.string().max(80).optional(),
  showPriceHall: z.boolean().optional(),
  showPriceTakeaway: z.boolean().optional(),
  takeawaySlug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, 'فقط حروف کوچک انگلیسی، عدد و خط تیره').optional(),
  hallTitle: z.string().max(160).nullable().optional(),
  takeawayTitle: z.string().max(160).nullable().optional(),
  hallNote: z.string().max(500).nullable().optional(),
  takeawayNote: z.string().max(500).nullable().optional(),
});

export async function PATCH(req: Request) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());

    if (input.takeawaySlug) {
      const clash = await db.select({ slug: schema.menuCategories.slug })
        .from(schema.menuCategories)
        .where(eq(schema.menuCategories.slug, input.takeawaySlug));
      if (clash.length > 0) throw new ApiError(409, 'این لینک با یک دسته‌ی منو تداخل دارد', 'SLUG_CONFLICT');
    }

    const [row] = await db.update(schema.menuSettings)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(schema.menuSettings.id, 1)).returning();
    return NextResponse.json({ settings: row ? rowToMenuSettings(row) : null });
  } catch (e) {
    return handleError(e);
  }
}
