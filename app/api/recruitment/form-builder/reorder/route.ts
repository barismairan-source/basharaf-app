import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { z } from 'zod';

const reorderSchema = z.object({
  items: z.array(z.object({
    id: z.string().uuid(),
    sortOrder: z.number().int(),
    sectionId: z.string().uuid().optional(),
  })).min(1),
});

/**
 * PUT /api/recruitment/form-builder/reorder
 * تغییر ترتیب فیلدها (و احیاناً جابه‌جایی بین مراحل).
 */
export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { items } = reorderSchema.parse(await req.json());

    await db.transaction(async (tx) => {
      for (const item of items) {
        const update: Partial<typeof schema.formFields.$inferInsert> = {
          sortOrder: item.sortOrder,
          updatedAt: new Date(),
        };
        if (item.sectionId) update.sectionId = item.sectionId;
        await tx
          .update(schema.formFields)
          .set(update)
          .where(eq(schema.formFields.id, item.id));
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
