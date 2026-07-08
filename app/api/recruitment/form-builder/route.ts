import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import type { FormStructure } from '@/lib/recruitment/form-types';

/**
 * GET /api/recruitment/form-builder
 * SuperAdmin — همه فیلدها شامل غیرفعال‌ها برای پنل مدیریت.
 */
export async function GET() {
  try {
    await requireAdmin();

    const sections = await db
      .select()
      .from(schema.formSections)
      .orderBy(asc(schema.formSections.sortOrder));

    const fields = await db
      .select()
      .from(schema.formFields)
      .orderBy(asc(schema.formFields.sortOrder));

    const options = await db
      .select()
      .from(schema.formFieldOptions)
      .orderBy(asc(schema.formFieldOptions.sortOrder));

    const conditions = await db
      .select()
      .from(schema.formFieldConditions);

    const structure: FormStructure = {
      sections: sections.map(s => ({
        id: s.id,
        key: s.key,
        title: s.title,
        subtitle: s.subtitle,
        sortOrder: s.sortOrder,
        isActive: s.isActive,
        isSystem: s.isSystem,
        fields: fields
          .filter(f => f.sectionId === s.id)
          .map(f => ({
            id: f.id,
            sectionId: f.sectionId,
            key: f.key,
            label: f.label,
            placeholder: f.placeholder,
            helpText: f.helpText,
            type: f.type,
            isRequired: f.isRequired,
            isActive: f.isActive,
            isSystem: f.isSystem,
            isFilterable: f.isFilterable,
            sortOrder: f.sortOrder,
            scope: f.scope,
            validation: (f.validation as { regex?: string; min?: number; max?: number; minLength?: number; maxLength?: number } | null) ?? null,
            defaultValue: f.defaultValue,
            width: f.width,
            options: options.filter(o => o.fieldId === f.id).map(o => ({
              id: o.id,
              fieldId: o.fieldId,
              label: o.label,
              value: o.value,
              sortOrder: o.sortOrder,
              isActive: o.isActive,
            })),
            conditions: conditions.filter(c => c.fieldId === f.id).map(c => ({
              id: c.id,
              fieldId: c.fieldId,
              dependsOnFieldId: c.dependsOnFieldId,
              operator: c.operator,
              value: c.value,
              action: c.action,
            })),
          })),
      })),
    };

    return NextResponse.json(structure);
  } catch (e) {
    return handleError(e);
  }
}
