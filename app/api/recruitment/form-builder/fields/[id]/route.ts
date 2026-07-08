import { NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { z } from 'zod';

const patchSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  placeholder: z.string().max(200).nullish(),
  helpText: z.string().max(500).nullish(),
  type: z.enum(['text','textarea','number','tel','email','select','multiselect','radio','checkbox','date']).optional(),
  isRequired: z.boolean().optional(),
  isActive: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  scope: z.enum(['all','kitchen','hall']).optional(),
  width: z.enum(['full','half']).optional(),
  defaultValue: z.string().max(500).nullish(),
  validation: z.object({
    regex: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
  }).nullish(),
  options: z.array(z.object({
    id: z.string().uuid().optional(),
    label: z.string().min(1).max(200),
    value: z.string().min(1).max(200),
    sortOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  })).optional(),
  conditions: z.array(z.object({
    id: z.string().uuid().optional(),
    dependsOnFieldId: z.string().uuid(),
    operator: z.enum(['equals','not_equals','includes','is_empty','is_not_empty']),
    value: z.string().nullish(),
    action: z.enum(['show','hide','require']),
  })).optional(),
});

/** PATCH /api/recruitment/form-builder/fields/[id] */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const body = patchSchema.parse(await req.json());

    const [field] = await db
      .select()
      .from(schema.formFields)
      .where(eq(schema.formFields.id, params.id))
      .limit(1);
    if (!field) throw new ApiError(404, 'فیلد یافت نشد', 'NOT_FOUND');

    // به‌روزرسانی فیلد
    const updateData: Partial<typeof schema.formFields.$inferInsert> = {};
    if (body.label !== undefined)       updateData.label = body.label;
    if (body.placeholder !== undefined) updateData.placeholder = body.placeholder ?? null;
    if (body.helpText !== undefined)    updateData.helpText = body.helpText ?? null;
    if (body.isRequired !== undefined)  updateData.isRequired = body.isRequired;
    if (body.isActive !== undefined)    updateData.isActive = body.isActive;
    if (body.isFilterable !== undefined) updateData.isFilterable = body.isFilterable;
    if (body.scope !== undefined)       updateData.scope = body.scope;
    if (body.width !== undefined)       updateData.width = body.width;
    if (body.defaultValue !== undefined) updateData.defaultValue = body.defaultValue ?? null;
    if (body.validation !== undefined)  updateData.validation = body.validation ?? null;
    // type تغییر می‌کند فقط برای غیرسیستمی
    if (body.type !== undefined && !field.isSystem) updateData.type = body.type;
    updateData.updatedAt = new Date();

    if (Object.keys(updateData).length > 1) {
      await db
        .update(schema.formFields)
        .set(updateData)
        .where(eq(schema.formFields.id, params.id));
    }

    // جایگزینی کامل options (اگر ارسال شده)
    if (body.options !== undefined) {
      await db
        .delete(schema.formFieldOptions)
        .where(eq(schema.formFieldOptions.fieldId, params.id));
      if (body.options.length > 0) {
        await db.insert(schema.formFieldOptions).values(
          body.options.map((o, i) => ({
            fieldId: params.id,
            label: o.label,
            value: o.value,
            sortOrder: o.sortOrder ?? i,
            isActive: o.isActive ?? true,
          }))
        );
      }
    }

    // جایگزینی کامل conditions (اگر ارسال شده)
    if (body.conditions !== undefined) {
      await db
        .delete(schema.formFieldConditions)
        .where(eq(schema.formFieldConditions.fieldId, params.id));
      if (body.conditions.length > 0) {
        await db.insert(schema.formFieldConditions).values(
          body.conditions.map(c => ({
            fieldId: params.id,
            dependsOnFieldId: c.dependsOnFieldId,
            operator: c.operator,
            value: c.value ?? null,
            action: c.action,
          }))
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/recruitment/form-builder/fields/[id] — غیرفعال‌سازی */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const [field] = await db
      .select({ isSystem: schema.formFields.isSystem })
      .from(schema.formFields)
      .where(eq(schema.formFields.id, params.id))
      .limit(1);
    if (!field) throw new ApiError(404, 'فیلد یافت نشد', 'NOT_FOUND');
    if (field.isSystem) throw new ApiError(403, 'فیلدهای سیستمی قابل حذف نیستند', 'SYSTEM_FIELD');

    await db
      .update(schema.formFields)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.formFields.id, params.id));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
