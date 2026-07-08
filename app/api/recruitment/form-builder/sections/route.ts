import { NextResponse } from 'next/server';
import { max } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { z } from 'zod';

const createSectionSchema = z.object({
  key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/),
  title: z.string().min(1).max(200),
  subtitle: z.string().max(500).nullish(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = createSectionSchema.parse(await req.json());

    const maxResult = await db
      .select({ maxOrder: max(schema.formSections.sortOrder) })
      .from(schema.formSections);

    const [row] = await db
      .insert(schema.formSections)
      .values({
        key: body.key,
        title: body.title,
        subtitle: body.subtitle ?? null,
        sortOrder: ((maxResult[0]?.maxOrder) ?? -1) + 1,
        isActive: true,
        isSystem: false,
      })
      .returning();

    return NextResponse.json({ ok: true, section: row }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
