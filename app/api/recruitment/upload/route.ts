import { NextResponse } from 'next/server';
import { handleError, ApiError } from '@/lib/api-error';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/auth/rateLimit';

const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * POST /api/recruitment/upload — عمومی.
 * فایل را به base64 data URI تبدیل می‌کند و مستقیم در Postgres ذخیره می‌شود.
 * نیازی به Supabase یا هیچ سرویس خارجی ندارد.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      throw new ApiError(429, `تعداد درخواست‌ها زیاد است. ${rl.retryAfter ?? 60} ثانیه دیگر تلاش کنید.`, 'RATE_LIMITED');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) throw new ApiError(400, 'فایلی انتخاب نشده است', 'MISSING_FILE');

    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ApiError(400, 'فقط عکس (JPG/PNG)، PDF و Word مجاز است.', 'INVALID_FILE_TYPE');
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new ApiError(400, `حجم فایل نباید بیش از ${MAX_SIZE_MB} مگابایت باشد.`, 'FILE_TOO_LARGE');
    }

    recordFailedAttempt(ip);

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUri = `data:${file.type};name=${encodeURIComponent(file.name)};base64,${base64}`;

    return NextResponse.json({ url: dataUri, path: 'base64' });
  } catch (e) {
    return handleError(e);
  }
}
