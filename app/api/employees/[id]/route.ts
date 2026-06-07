import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { serializeEmployee } from '@/lib/payroll/employeeSerializer';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: z.string().min(3).max(20).optional(),
  role: z.string().min(1).max(40).optional(),
  nationalId: z.string().max(20).nullable().optional(),
  branchId: z.string().uuid().nullable().optional(),
  branchName: z.string().max(120).nullable().optional(),
  fatherName: z.string().max(120).nullable().optional(),
  gender: z.enum(['male','female','other']).nullable().optional(),
  maritalStatus: z.enum(['single','married','other']).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  emergencyContactName: z.string().max(120).nullable().optional(),
  emergencyContactPhone: z.string().max(20).nullable().optional(),
  iban: z.string().max(34).nullable().optional(),
  bankAccount: z.string().max(40).nullable().optional(),
  insuranceStatus: z.enum(['insured','uninsured','pending','exempt']).optional(),
  insuranceNumber: z.string().max(40).nullable().optional(),
  healthCardNumber: z.string().max(40).nullable().optional(),
  healthCardExpiryDate: z.string().nullable().optional(),
  baseMonthlySalary: z.number().int().min(0).optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireSession();
    const [e] = await db.select().from(schema.employees).where(eq(schema.employees.id, params.id)).limit(1);
    if (!e) throw new ApiError(404, 'پرسنل پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ employee: serializeEmployee(e) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const input = patchSchema.parse(await req.json());
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    for (const [k, v] of Object.entries(input)) {
      if (v === undefined) continue;
      if (k === 'healthCardExpiryDate') patch[k] = v ? new Date(v as string) : null;
      else patch[k] = v;
    }
    const [e] = await db.update(schema.employees).set(patch).where(eq(schema.employees.id, params.id)).returning();
    if (!e) throw new ApiError(404, 'پرسنل پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ employee: serializeEmployee(e) });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    // soft-delete — تاریخچه‌ی فیش‌ها حفظ می‌شود
    const [e] = await db.update(schema.employees)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(schema.employees.id, params.id)).returning();
    if (!e) throw new ApiError(404, 'پرسنل پیدا نشد', 'NOT_FOUND');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
