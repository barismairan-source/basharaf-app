import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { SCREENING_QUESTIONS } from '@/lib/recruitment/questions';

export const dynamic = 'force-dynamic';

const SETTING_KEY = 'recruitment.questions';

/** GET عمومی — سوالات غربالگری (از app_settings یا پیش‌فرض). */
export async function GET() {
  try {
    const [row] = await db.select().from(schema.appSettings)
      .where(eq(schema.appSettings.key, SETTING_KEY)).limit(1);
    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed) && parsed.length) {
          return NextResponse.json({ questions: parsed });
        }
      } catch { /* fallback */ }
    }
    return NextResponse.json({ questions: SCREENING_QUESTIONS });
  } catch (e) {
    return handleError(e);
  }
}

const questionSchema = z.object({
  id: z.string().min(1).max(40),
  title: z.string().min(1).max(120),
  prompt: z.string().min(1).max(500),
});
const putSchema = z.object({ questions: z.array(questionSchema).min(1).max(20) });

/** PUT مدیر — جایگزینی کل لیست سوالات. */
export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const { questions } = putSchema.parse(await req.json());
    const value = JSON.stringify(questions);
    const [existing] = await db.select().from(schema.appSettings)
      .where(eq(schema.appSettings.key, SETTING_KEY)).limit(1);
    if (existing) {
      await db.update(schema.appSettings).set({ value })
        .where(eq(schema.appSettings.key, SETTING_KEY));
    } else {
      await db.insert(schema.appSettings).values({ key: SETTING_KEY, value, label: 'سوالات فرم استخدام', group: 'recruitment' });
    }
    return NextResponse.json({ ok: true, questions });
  } catch (e) {
    return handleError(e);
  }
}
