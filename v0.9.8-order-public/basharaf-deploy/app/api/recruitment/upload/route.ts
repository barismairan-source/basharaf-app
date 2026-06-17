import { NextResponse } from 'next/server';
import { uploadResume, ALLOWED_TYPES, MAX_SIZE_MB } from '@/lib/storage/resumes';
import { handleError, ApiError } from '@/lib/api-error';
import { checkRateLimit, recordFailedAttempt, getClientIp } from '@/lib/auth/rateLimit';

/**
 * POST /api/recruitment/upload — عمومی. آپلود رزومه قبل از ثبت فرم.
 * multipart/form-data با فیلد file. خروجی: { url, path } که در POST اصلی فرستاده می‌شود.
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
      throw new ApiError(400, 'فقط عکس، PDF و Word مجاز است.', 'INVALID_FILE_TYPE');
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new ApiError(400, `حجم فایل نباید بیش از ${MAX_SIZE_MB} مگابایت باشد.`, 'FILE_TOO_LARGE');
    }

    recordFailedAttempt(ip);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadResume({ file: buffer, filename: file.name, mimeType: file.type });
    if (!result) {
      throw new ApiError(500, 'Storage پیکربندی نشده (SUPABASE_SERVICE_ROLE_KEY).', 'STORAGE_NOT_CONFIGURED');
    }
    return NextResponse.json(result);
  } catch (e) {
    return handleError(e);
  }
}
