import { NextResponse } from 'next/server';
import { eq, max } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { z } from 'zod';

const createFieldSchema = z.object({
  sectionId: z.string().uuid(),
  key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/, 'کلید فقط حروف کوچک، اعداد، و زیرخط'),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).nullish(),
  helpText: z.string().max(500).nullish(),
  type: z.enum(['text','textarea','number','tel','email','select','multiselect','radio','checkbox','date']),
  isRequired: z.boolean().default(false),
  scope: z.enum(['all','kitchen','hall']).default('all'),
  width: z.enum(['full','half']).default('full'),
  defaultValue: z.string().max(500).nullish(),
});

/**
 * POST /api/recruitment/form-builder/fields
 * ایجاد فیلد جدید (آخرین ترتیب در section).
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = createFieldSchema.parse(await req.json());

    // section وجود دارد؟
    const [section] = await db
      .select({ id: schema.formSections.id })
      .from(schema.formSections)
      .where(eq(schema.formSections.id, body.sectionId))
      .limit(1);
    if (!section) throw new ApiError(404, 'مرحله یافت نشد', 'NOT_FOUND');

    // کلید تکراری؟
    const [existing] = await db
      .select({ id: schema.formFields.id })
      .from(schema.formFields)
      .where(eq(schema.formFields.key, body.key))
      .limit(1);
    if (existing) throw new ApiError(409, 'این کلید قبلاً استفاده شده', 'DUPLICATE_KEY');

    // آخرین sort_order در این section
    const maxResult = await db
      .select({ maxOrder: max(schema.formFields.sortOrder) })
      .from(schema.formFields)
      .where(eq(schema.formFields.sectionId, body.sectionId));
    const sortOrder = ((maxResult[0]?.maxOrder) ?? -1) + 1;

    const [row] = await db
      .insert(schema.formFields)
      .values({
        sectionId: body.sectionId,
        key: body.key,
        label: body.label,
        placeholder: body.placeholder ?? null,
        helpText: body.helpText ?? null,
        type: body.type,
        isRequired: body.isRequired,
        isActive: true,
        isSystem: false,
        isFilterable: false,
        sortOrder,
        scope: body.scope,
        defaultValue: body.defaultValue ?? null,
        width: body.width,
      })
      .returning();

    return NextResponse.json({ ok: true, field: row }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
