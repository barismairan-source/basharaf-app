import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';

const patchSchema = z.object({
  status: z.enum(['new', 'investigating', 'confirmed', 'false_positive']),
  note: z.string().max(500).optional(),
});

/**
 * PATCH /api/anomaly/findings/[id]
 * تغییر وضعیت یافته + audit log.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAdmin();
    const { status, note } = patchSchema.parse(await req.json());

    const now = new Date();
    const resolved = status === 'confirmed' || status === 'false_positive';

    const [updated] = await db
      .update(schema.anomalyFindings)
      .set({
        status,
        resolvedAt: resolved ? now : null,
        resolvedBy: resolved ? session.sub : null,
        ...(note != null ? { note } : {}),
      })
      .where(eq(schema.anomalyFindings.id, params.id))
      .returning();

    if (!updated) throw new ApiError(404, 'یافته پیدا نشد', 'NOT_FOUND');

    void audit({
      action: 'anomaly.statusChanged',
      userId: session.sub,
      meta: { findingId: params.id, status, ruleKey: updated.ruleKey },
    });

    return NextResponse.json({ finding: updated });
  } catch (e) {
    return handleError(e);
  }
}
