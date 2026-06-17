import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { ApiError, handleError } from '@/lib/api-error';

const createBodySchema = z
  .object({
    name: z.string().min(2).max(80).transform(v => v.trim()),
    email: z.string().email().max(254).transform(v => v.trim().toLowerCase()),
    password: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد').max(128),
    role: z.enum(['SuperAdmin', 'BranchUser', 'Warehouse', 'Chef']),
    assignedBranchId: z.string().uuid().nullable(),
  })
  .refine(d => !((d.role === 'BranchUser' || d.role === 'Warehouse' || d.role === 'Chef') && !d.assignedBranchId), {
    message: 'برای کاربر شعبه باید یک شعبه انتخاب کنید',
    path: ['assignedBranchId'],
  });

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.users);
    return NextResponse.json({
      users: rows.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        assignedBranch: u.assignedBranchId,
        initials: u.initials,
        lastSeen: u.lastSeen,
        joined: u.joined,
        permissions: u.permissions ?? null,
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const input = createBodySchema.parse(body);

    const [existing] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, input.email))
      .limit(1);
    if (existing) throw new ApiError(409, 'این ایمیل قبلاً ثبت شده است', 'DUPLICATE');

    const passwordHash = await hashPassword(input.password);
    const parts = input.name.trim().split(/\s+/);
    const initials = [parts[0]?.[0] ?? '', parts[1]?.[0] ?? ''].filter(Boolean).join('\u200C');

    const [inserted] = await db
      .insert(schema.users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        assignedBranchId: input.assignedBranchId,
        initials: initials || '?',
        joined: new Date().toISOString().slice(0, 10),
      })
      .returning();

    if (!inserted) throw new ApiError(500, 'خطا در ساخت کاربر', 'INSERT_FAILED');

    return NextResponse.json({
      user: {
        id: inserted.id,
        name: inserted.name,
        email: inserted.email,
        role: inserted.role,
        assignedBranch: inserted.assignedBranchId,
        initials: inserted.initials,
        lastSeen: inserted.lastSeen,
        joined: inserted.joined,
        permissions: inserted.permissions ?? null,
      },
    }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
