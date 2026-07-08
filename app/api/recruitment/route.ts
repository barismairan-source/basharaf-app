import { NextResponse } from 'next/server';
import { desc, eq, and, asc, count } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { applicationCreateSchema } from '@/lib/validations/recruitment';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/auth/rateLimit';
import type { FieldSnapshot } from '@/lib/recruitment/form-types';
import { SYSTEM_FIELD_COLUMN_MAP } from '@/lib/recruitment/form-types';

/**
 * POST /api/recruitment — عمومی (متقاضی login ندارد). ثبت یک درخواست استخدام.
 * GET  /api/recruitment — فقط SuperAdmin. لیست برای پنل.
 */

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }

    const input = applicationCreateSchema.parse(await req.json());

    // پاسخ‌های سوال‌های مرحله ۳ (سیستم موجود)
    const answers: Record<string, string> = {};
    for (const [id, v] of Object.entries(input.answers)) {
      if (typeof v === 'string' && v.trim()) answers[id] = v.trim();
    }

    // ساخت customFields و fieldSnapshot از فیلدهای داینامیک
    const customFields: Record<string, unknown> = {};
    const fieldSnapshot: FieldSnapshot[] = [];

    if (input.customFields && typeof input.customFields === 'object') {
      // گرفتن metadata فیلدهای فعال از DB برای snapshot
      const activeFields = await db
        .select({ id: schema.formFields.id, key: schema.formFields.key, label: schema.formFields.label, type: schema.formFields.type, isSystem: schema.formFields.isSystem })
        .from(schema.formFields)
        .where(eq(schema.formFields.isActive, true));

      const customInput = input.customFields as Record<string, unknown>;
      for (const [key, value] of Object.entries(customInput)) {
        if (value === undefined || value === null || value === '') continue;
        const fieldMeta = activeFields.find(f => f.key === key);
        if (!fieldMeta) continue;
        if (fieldMeta.isSystem) continue; // سیستمی‌ها در ستون‌های اختصاصی ذخیره می‌شوند
        customFields[key] = value;
        fieldSnapshot.push({ key, label: fieldMeta.label, type: fieldMeta.type });
      }
    }

    recordFailedAttempt(ip);

    const [row] = await db
      .insert(schema.jobApplications)
      .values({
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        age: input.age,
        gender: input.gender,
        city: input.city,
        hasResume: input.hasResume,
        resumeUrl: input.resumeUrl ?? null,
        resumePath: input.resumePath ?? null,
        manualInfo: input.manualInfo ?? null,
        answers,
        area: input.area,
        shiftAvailability: input.shiftAvailability ?? null,
        startAvailability: input.startAvailability ?? null,
        referralSource: input.referralSource ?? null,
        customFields,
        fieldSnapshot,
      })
      .returning({ id: schema.jobApplications.id });

    if (!row) throw new ApiError(500, 'خطا در ثبت درخواست', 'INSERT_FAILED');
    return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url    = new URL(req.url);
    const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1',  10));
    const limit  = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
    const offset = (page - 1) * limit;

    const [countResult, rows] = await Promise.all([
      db.select({ total: count() }).from(schema.jobApplications),
      db
        .select({
          id: schema.jobApplications.id,
          firstName: schema.jobApplications.firstName,
          lastName: schema.jobApplications.lastName,
          phone: schema.jobApplications.phone,
          age: schema.jobApplications.age,
          gender: schema.jobApplications.gender,
          city: schema.jobApplications.city,
          hasResume: schema.jobApplications.hasResume,
          resumePath: schema.jobApplications.resumePath,
          manualInfo: schema.jobApplications.manualInfo,
          answers: schema.jobApplications.answers,
          area: schema.jobApplications.area,
          shiftAvailability: schema.jobApplications.shiftAvailability,
          startAvailability: schema.jobApplications.startAvailability,
          referralSource: schema.jobApplications.referralSource,
          customFields: schema.jobApplications.customFields,
          fieldSnapshot: schema.jobApplications.fieldSnapshot,
          status: schema.jobApplications.status,
          score: schema.jobApplications.score,
          reviewerNote: schema.jobApplications.reviewerNote,
          createdAt: schema.jobApplications.createdAt,
          updatedAt: schema.jobApplications.updatedAt,
        })
        .from(schema.jobApplications)
        .orderBy(desc(schema.jobApplications.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = countResult[0]?.total ?? 0;

    return NextResponse.json({
      applications: rows.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        phone: r.phone,
        age: r.age,
        gender: r.gender,
        city: r.city,
        hasResume: r.hasResume,
        resumePath: r.resumePath,
        manualInfo: r.manualInfo,
        answers: (r.answers ?? {}) as Record<string, string>,
        area: r.area,
        shiftAvailability: (r.shiftAvailability as string[] | null) ?? null,
        startAvailability: r.startAvailability ?? null,
        referralSource: r.referralSource ?? null,
        customFields: (r.customFields ?? {}) as Record<string, unknown>,
        fieldSnapshot: (r.fieldSnapshot ?? []) as FieldSnapshot[],
        status: r.status,
        score: r.score,
        reviewerNote: r.reviewerNote,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    });
  } catch (e) {
    return handleError(e);
  }
}
