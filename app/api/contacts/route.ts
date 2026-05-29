import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession, requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const createSchema = z.object({
  name: z.string().min(2).max(120).transform(v => v.trim()),
  type: z.enum(['customer', 'supplier', 'other']).default('customer'),
  phone: z.string().max(20).optional().nullable(),
  note: z.string().max(300).optional().nullable(),
});

export async function GET() {
  try {
    await requireSession();
    const rows = await db.select().from(schema.contacts).where(eq(schema.contacts.isActive, true));
    return NextResponse.json({
      contacts: rows.map(c => ({
        id: c.id, name: c.name, type: c.type, phone: c.phone, note: c.note,
        balance: Number(c.balance), isActive: c.isActive,
        createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());
    const [c] = await db.insert(schema.contacts).values({
      name: input.name, type: input.type,
      phone: input.phone ?? null, note: input.note ?? null,
    }).returning();
    if (!c) throw new ApiError(500, 'خطا در ساخت طرف‌حساب', 'INSERT_FAILED');
    return NextResponse.json({
      contact: { ...c, balance: Number(c.balance), createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() },
    }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
