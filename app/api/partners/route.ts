import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    const partnersList = await db
      .select()
      .from(schema.partners)
      .orderBy(schema.partners.fullName);

    const branchLinks = await db
      .select({
        id: schema.partnerBranches.id,
        partnerId: schema.partnerBranches.partnerId,
        branchId: schema.partnerBranches.branchId,
        sharePercent: schema.partnerBranches.sharePercent,
        joinedDate: schema.partnerBranches.joinedDate,
        isActive: schema.partnerBranches.isActive,
        branchName: schema.branches.name,
      })
      .from(schema.partnerBranches)
      .leftJoin(schema.branches, eq(schema.branches.id, schema.partnerBranches.branchId));

    const branchMap = new Map<string, Array<{
      id: string;
      branchId: string | null;
      branchName: string | null;
      sharePercent: string | null;
      joinedDate: string | null;
      isActive: boolean;
    }>>();

    for (const link of branchLinks) {
      const list = branchMap.get(link.partnerId) ?? [];
      list.push({
        id: link.id,
        branchId: link.branchId,
        branchName: link.branchName ?? null,
        sharePercent: link.sharePercent,
        joinedDate: link.joinedDate,
        isActive: link.isActive,
      });
      branchMap.set(link.partnerId, list);
    }

    return NextResponse.json({
      partners: partnersList.map(p => ({
        id: p.id,
        fullName: p.fullName,
        phone: p.phone,
        nationalId: p.nationalId,
        note: p.note,
        isActive: p.isActive,
        branches: branchMap.get(p.id) ?? [],
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return handleError(e);
  }
}

const createSchema = z.object({
  fullName: z.string().min(2).max(100).transform(v => v.trim()),
  phone: z.string().max(20).optional(),
  nationalId: z.string().max(20).optional(),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const input = createSchema.parse(await req.json());

    const [inserted] = await db
      .insert(schema.partners)
      .values({
        fullName: input.fullName,
        phone: input.phone ?? null,
        nationalId: input.nationalId ?? null,
        note: input.note ?? null,
      })
      .returning();

    if (!inserted) throw new ApiError(500, 'خطا در ساخت شریک', 'INSERT_FAILED');

    return NextResponse.json({
      partner: {
        id: inserted.id,
        fullName: inserted.fullName,
        phone: inserted.phone,
        nationalId: inserted.nationalId,
        note: inserted.note,
        isActive: inserted.isActive,
        branches: [],
        createdAt: inserted.createdAt.toISOString(),
        updatedAt: inserted.updatedAt.toISOString(),
      },
    }, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
