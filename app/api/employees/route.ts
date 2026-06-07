import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleErrorLogged } from '@/lib/api-error';
import { serializeEmployee as serialize } from '@/lib/payroll/employeeSerializer';

export const dynamic = 'force-dynamic';

const roleEnum = z.string().min(1).max(40);

const createSchema = z.object({
  fullName: z.string().min(2, 'نام الزامی است').max(120).transform(v => v.trim()),
  phone: z.string().min(3, 'تلفن الزامی است').max(20),
  role: roleEnum.default('other'),
  nationalId: z.string().max(20).optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  branchName: z.string().max(120).optional().nullable(),
  fatherName: z.string().max(120).optional().nullable(),
  gender: z.enum(['male','female','other']).optional().nullable(),
  maritalStatus: z.enum(['single','married','other']).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  emergencyContactName: z.string().max(120).optional().nullable(),
  emergencyContactPhone: z.string().max(20).optional().nullable(),
  iban: z.string().max(34).optional().nullable(),
  bankAccount: z.string().max(40).optional().nullable(),
  insuranceStatus: z.enum(['insured','uninsured','pending','exempt']).default('uninsured'),
  insuranceNumber: z.string().max(40).optional().nullable(),
  healthCardNumber: z.string().max(40).optional().nullable(),
  healthCardExpiryDate: z.string().optional().nullable(),
  joinDate: z.string().min(1, 'تاریخ استخدام الزامی است'),
  baseMonthlySalary: z.number().int().min(0).default(0),
  notes: z.string().max(1000).optional().nullable(),
});

function serializeUnused() { /* removed — see lib/payroll/employeeSerializer */ }
void serializeUnused;

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.employees)
      .where(eq(schema.employees.isActive, true))
      .orderBy(desc(schema.employees.createdAt));
    return NextResponse.json({ employees: rows.map(serialize) });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [e] = await db.insert(schema.employees).values({
      fullName: input.fullName, phone: input.phone, role: input.role,
      nationalId: input.nationalId ?? null,
      branchId: input.branchId ?? null, branchName: input.branchName ?? null,
      fatherName: input.fatherName ?? null,
      gender: input.gender ?? null, maritalStatus: input.maritalStatus ?? null,
      address: input.address ?? null,
      emergencyContactName: input.emergencyContactName ?? null,
      emergencyContactPhone: input.emergencyContactPhone ?? null,
      iban: input.iban ?? null, bankAccount: input.bankAccount ?? null,
      insuranceStatus: input.insuranceStatus, insuranceNumber: input.insuranceNumber ?? null,
      healthCardNumber: input.healthCardNumber ?? null,
      healthCardExpiryDate: input.healthCardExpiryDate ? new Date(input.healthCardExpiryDate) : null,
      joinDate: new Date(input.joinDate),
      baseMonthlySalary: input.baseMonthlySalary,
      notes: input.notes ?? null,
    }).returning();
    if (!e) throw new ApiError(500, 'خطا در ساخت پرسنل', 'INSERT_FAILED');
    return NextResponse.json({ employee: serialize(e) }, { status: 201 });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
