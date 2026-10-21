import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { assertCan } from '@/lib/auth/apiAccess';
import { handleErrorLogged } from '@/lib/api-error';
import { audit } from '@/lib/auth/audit';
import { getRequireFaceId, REQUIRE_FACE_ID_KEY } from '@/lib/attendance-clock/service';

export const dynamic = 'force-dynamic';

/** GET /api/hr/clock/settings — تنظیمات ثبت حضور با اینترنت مغازه. */
export async function GET() {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.view');
    return NextResponse.json({ requireFaceId: await getRequireFaceId() });
  } catch (e) {
    return await handleErrorLogged(e, undefined, { category: 'payroll' });
  }
}

const putSchema = z.object({ requireFaceId: z.boolean() });

/** PUT /api/hr/clock/settings — روشن/خاموش کردن الزام Face ID / اثر انگشت برای همه. */
export async function PUT(req: Request) {
  try {
    const session = await requireSession();
    assertCan(session, 'hr.attendance.clockSetup');
    const { requireFaceId } = putSchema.parse(await req.json());
    await db.insert(schema.appSettings)
      .values({ key: REQUIRE_FACE_ID_KEY, value: String(requireFaceId), label: 'ثبت حضور با Face ID / اثر انگشت', group: 'attendance' })
      .onConflictDoUpdate({ target: schema.appSettings.key, set: { value: String(requireFaceId), updatedAt: new Date() } });
    void audit({ action: 'attendance.settings.updated', userId: session.sub, meta: { requireFaceId } });
    return NextResponse.json({ requireFaceId });
  } catch (e) {
    return await handleErrorLogged(e, req, { category: 'payroll' });
  }
}
