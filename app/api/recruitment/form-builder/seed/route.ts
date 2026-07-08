import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * POST /api/recruitment/form-builder/seed
 * Seed اولیه — اگر form_sections خالی باشد، داده اولیه را وارد می‌کند.
 * ایمن در برابر اجرای مکرر (اگر قبلاً seed شده باشد، skip می‌کند).
 */
export async function POST() {
  try {
    await requireAdmin();

    const existing = await db.select({ id: schema.formSections.id }).from(schema.formSections).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ ok: true, seeded: false, message: 'قبلاً seed شده' });
    }

    await db.transaction(async (tx) => {
      // ─── Section: اطلاعات شخصی ───────────────────────────────────
      const personalSectionRows = await tx
        .insert(schema.formSections)
        .values({ key: 'personal_info', title: 'اطلاعات شخصی', sortOrder: 0, isActive: true, isSystem: true })
        .returning({ id: schema.formSections.id });
      const personalSection = personalSectionRows[0];
      if (!personalSection) throw new Error('خطا در ایجاد section');


      const personalFields = [
        {
          key: 'first_name', label: 'نام', type: 'text' as const,
          isRequired: true, isSystem: true, width: 'half' as const, sortOrder: 0,
          validation: { minLength: 2, maxLength: 60 },
        },
        {
          key: 'last_name', label: 'نام خانوادگی', type: 'text' as const,
          isRequired: true, isSystem: true, width: 'half' as const, sortOrder: 1,
          validation: { minLength: 2, maxLength: 60 },
        },
        {
          key: 'phone', label: 'موبایل', type: 'tel' as const,
          isRequired: true, isSystem: true, width: 'full' as const, sortOrder: 2,
          placeholder: '09123456789',
          validation: { regex: '^09\\d{9}$' },
        },
        {
          key: 'age', label: 'سن', type: 'number' as const,
          isRequired: false, isSystem: true, width: 'half' as const, sortOrder: 3,
          validation: { min: 15, max: 70 },
        },
        {
          key: 'gender', label: 'جنسیت', type: 'select' as const,
          isRequired: false, isSystem: true, width: 'half' as const, sortOrder: 4,
        },
        {
          key: 'city', label: 'محله / منطقه سکونت', type: 'text' as const,
          isRequired: true, isSystem: true, width: 'full' as const, sortOrder: 5,
          placeholder: 'مثلاً سعادت‌آباد',
        },
        {
          key: 'shift_availability', label: 'دسترسی شیفت', type: 'multiselect' as const,
          isRequired: true, isSystem: true, width: 'full' as const, sortOrder: 6,
          helpText: 'می‌توانی چند گزینه انتخاب کنی',
        },
        {
          key: 'start_availability', label: 'امکان شروع', type: 'radio' as const,
          isRequired: true, isSystem: true, width: 'full' as const, sortOrder: 7,
        },
        {
          key: 'referral_source', label: 'چطور با ما آشنا شدی؟', type: 'select' as const,
          isRequired: true, isSystem: true, isFilterable: true, width: 'full' as const, sortOrder: 8,
        },
        {
          key: 'referral_detail', label: 'توضیح بیشتر (آشنایی)', type: 'text' as const,
          isRequired: false, isSystem: false, width: 'full' as const, sortOrder: 9,
          placeholder: 'از کجا / چه کسی شنیدید؟',
        },
      ];

      const insertedFields: Array<{ id: string; key: string }> = [];
      for (const f of personalFields) {
        const { validation, ...rest } = f as typeof f & { validation?: Record<string, unknown> };
        const rows = await tx
          .insert(schema.formFields)
          .values({
            sectionId: personalSection.id,
            ...rest,
            isFilterable: (f as typeof f & { isFilterable?: boolean }).isFilterable ?? false,
            isActive: true,
            scope: 'all',
            validation: validation ?? null,
          })
          .returning({ id: schema.formFields.id, key: schema.formFields.key });
        if (rows[0]) insertedFields.push(rows[0]);
      }

      // Options: جنسیت
      const genderField = insertedFields.find(f => f.key === 'gender')!;
      await tx.insert(schema.formFieldOptions).values([
        { fieldId: genderField.id, label: 'خانم', value: 'female', sortOrder: 0 },
        { fieldId: genderField.id, label: 'آقا',  value: 'male',   sortOrder: 1 },
      ]);

      // Options: دسترسی شیفت
      const shiftField = insertedFields.find(f => f.key === 'shift_availability')!;
      await tx.insert(schema.formFieldOptions).values([
        { fieldId: shiftField.id, label: 'صبح',                   value: 'morning',  sortOrder: 0 },
        { fieldId: shiftField.id, label: 'عصر',                   value: 'evening',  sortOrder: 1 },
        { fieldId: shiftField.id, label: 'شب',                    value: 'night',    sortOrder: 2 },
        { fieldId: shiftField.id, label: 'آخر هفته و تعطیلات', value: 'weekend',  sortOrder: 3 },
      ]);

      // Options: امکان شروع
      const startField = insertedFields.find(f => f.key === 'start_availability')!;
      await tx.insert(schema.formFieldOptions).values([
        { fieldId: startField.id, label: 'فوری',                  value: 'immediate',   sortOrder: 0 },
        { fieldId: startField.id, label: 'تا یک هفته',            value: 'within_week', sortOrder: 1 },
        { fieldId: startField.id, label: 'بیشتر از یک هفته',    value: 'after_week',  sortOrder: 2 },
      ]);

      // Options: آشنایی با ما
      const referralField = insertedFields.find(f => f.key === 'referral_source')!;
      await tx.insert(schema.formFieldOptions).values([
        { fieldId: referralField.id, label: 'اینستاگرام',                value: 'instagram', sortOrder: 0 },
        { fieldId: referralField.id, label: 'دیوار',                      value: 'divar',     sortOrder: 1 },
        { fieldId: referralField.id, label: 'معرفی دوست یا همکار',    value: 'friend',    sortOrder: 2 },
        { fieldId: referralField.id, label: 'مشتری رستوران هستم',      value: 'customer',  sortOrder: 3 },
        { fieldId: referralField.id, label: 'سایر',                       value: 'other',     sortOrder: 4 },
      ]);

      // Condition: referral_detail نمایش داده شود وقتی referral_source = 'other'
      const detailField = insertedFields.find(f => f.key === 'referral_detail')!;
      await tx.insert(schema.formFieldConditions).values({
        fieldId: detailField.id,
        dependsOnFieldId: referralField.id,
        operator: 'equals',
        value: 'other',
        action: 'show',
      });
      await tx.insert(schema.formFieldConditions).values({
        fieldId: detailField.id,
        dependsOnFieldId: referralField.id,
        operator: 'equals',
        value: 'other',
        action: 'require',
      });

      // ─── Section: سوال‌ها (سیستمی — موتور جداگانه) ───────────────
      await tx.insert(schema.formSections).values({
        key: 'questions', title: 'سوال‌ها', sortOrder: 1, isActive: true, isSystem: true,
      });
    });

    return NextResponse.json({ ok: true, seeded: true });
  } catch (e) {
    return handleError(e);
  }
}
