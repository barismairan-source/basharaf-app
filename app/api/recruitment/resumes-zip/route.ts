import { NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { z } from 'zod';
import JSZip from 'jszip';
import { db, schema } from '@/lib/db/client';
import { requireAdmin } from '@/lib/auth/session';
import { ApiError, handleError } from '@/lib/api-error';

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
});

/** فقط برای نام فایل — کاراکترهای غیرمجاز فایل‌سیستم را حذف می‌کند. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '').trim().slice(0, 80) || 'resume';
}

/**
 * POST /api/recruitment/resumes-zip — فقط SuperAdmin.
 * رزومه‌ی چند داوطلب انتخاب‌شده را در یک فایل zip بسته‌بندی می‌کند.
 * فایل‌هایی که رزومه ندارند یا واکشی‌شان خطا بدهد بی‌صدا رد می‌شوند —
 * یک رزومه‌ی خراب نباید کل دانلود گروهی را متوقف کند.
 */
export async function POST(req: Request) {
  try {
    await requireAdmin();
    const { ids } = bodySchema.parse(await req.json());

    const rows = await db
      .select({
        id: schema.jobApplications.id,
        firstName: schema.jobApplications.firstName,
        lastName: schema.jobApplications.lastName,
        resumeUrl: schema.jobApplications.resumeUrl,
        resumePath: schema.jobApplications.resumePath,
      })
      .from(schema.jobApplications)
      .where(inArray(schema.jobApplications.id, ids));

    const zip = new JSZip();
    const usedNames = new Set<string>();
    let added = 0;

    for (const row of rows) {
      if (!row.resumeUrl) continue;

      let buffer: Buffer;
      let ext = 'pdf';

      if (row.resumeUrl.startsWith('data:')) {
        const commaIdx = row.resumeUrl.indexOf(',');
        const meta = row.resumeUrl.slice(0, commaIdx);
        const b64 = row.resumeUrl.slice(commaIdx + 1);
        buffer = Buffer.from(b64, 'base64');
        const rawName = (row.resumePath ?? '').replace(/^base64:/, '');
        const extMatch = rawName.match(/\.([a-zA-Z0-9]+)$/);
        if (extMatch) ext = extMatch[1]!.toLowerCase();
        else {
          const mimeType = meta.split(';')[0]?.replace('data:', '') ?? '';
          if (mimeType.includes('pdf')) ext = 'pdf';
          else if (mimeType.includes('word')) ext = 'docx';
        }
      } else {
        try {
          const res = await fetch(row.resumeUrl);
          if (!res.ok) continue;
          buffer = Buffer.from(await res.arrayBuffer());
          const urlExt = row.resumeUrl.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
          if (urlExt) ext = urlExt[1]!.toLowerCase();
        } catch {
          continue; // یک رزومه‌ی غیرقابل‌واکشی نباید کل دانلود را متوقف کند
        }
      }

      const base = sanitizeFilename(`${row.firstName}_${row.lastName}`);
      let filename = `${base}.${ext}`;
      let n = 2;
      while (usedNames.has(filename)) {
        filename = `${base}_${n}.${ext}`;
        n++;
      }
      usedNames.add(filename);

      zip.file(filename, buffer);
      added++;
    }

    if (added === 0) {
      throw new ApiError(404, 'هیچ رزومه‌ای برای دانلود پیدا نشد', 'NO_RESUMES');
    }

    const zipBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const zipBuffer = Buffer.from(zipBytes);

    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="resumes-${new Date().toISOString().slice(0, 10)}.zip"`,
        'Content-Length': String(zipBuffer.byteLength),
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
