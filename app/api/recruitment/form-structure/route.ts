import { NextResponse } from 'next/server';
import { eq, and, asc } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { handleError } from '@/lib/api-error';
import type { FormStructure } from '@/lib/recruitment/form-types';

/**
 * GET /api/recruitment/form-structure?area=hall|kitchen
 * عمومی — فرم /apply این را صدا می‌زند تا فیلدها را داینامیک رندر کند.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const area = url.searchParams.get('area') as 'hall' | 'kitchen' | null;

    const sections = await db
      .select()
      .from(schema.formSections)
      .where(eq(schema.formSections.isActive, true))
      .orderBy(asc(schema.formSections.sortOrder));

    const fields = await db
      .select()
      .from(schema.formFields)
      .where(and(
        eq(schema.formFields.isActive, true),
        // scope filter: نمایش فیلدهای 'all' + فیلدهای مخصوص این بخش
      ))
      .orderBy(asc(schema.formFields.sortOrder));

    const filteredFields = fields.filter(f => {
      if (f.scope === 'all') return true;
      if (area && f.scope === area) return true;
      return false;
    });

    const options = await db
      .select()
      .from(schema.formFieldOptions)
      .where(eq(schema.formFieldOptions.isActive, true))
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
        fields: filteredFields
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

    return NextResponse.json(structure, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return handleError(e);
  }
}
