import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';

/**
 * GET /api/recruitment/[id]/resume
 * رزومه را با Content-Disposition: attachment برمی‌گرداند.
 * اگر base64 data URI باشد، decode شده به‌صورت binary سرو می‌شود.
 * اگر URL معمولی باشد، redirect می‌دهد.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    await requireAdmin();

    const rows = await db
      .select({
        resumeUrl:  schema.jobApplications.resumeUrl,
        resumePath: schema.jobApplications.resumePath,
      })
      .from(schema.jobApplications)
      .where(eq(schema.jobApplications.id, params.id))
      .limit(1);

    const row = rows[0];
    if (!row?.resumeUrl) {
      return new NextResponse('رزومه یافت نشد', { status: 404 });
    }

    const { resumeUrl, resumePath } = row;

    if (resumeUrl.startsWith('data:')) {
      const commaIdx = resumeUrl.indexOf(',');
      const meta     = resumeUrl.slice(0, commaIdx);
      const b64      = resumeUrl.slice(commaIdx + 1);
      const mimeType = meta.split(';')[0]?.replace('data:', '') ?? 'application/octet-stream';
      const buffer   = Buffer.from(b64, 'base64');
      const rawName  = (resumePath ?? '').replace(/^base64:/, '') || 'resume';
      const filename = encodeURIComponent(rawName);

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
          'Content-Length': String(buffer.byteLength),
          'Cache-Control': 'no-store',
        },
      });
    }

    return NextResponse.redirect(resumeUrl);
  } catch (e) {
    return handleError(e);
  }
}
