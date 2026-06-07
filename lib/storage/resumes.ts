import { createClient } from '@supabase/supabase-js';

/**
 * Storage برای رزومه‌ها — همان الگوی lib/storage/receipts.ts.
 * Bucket: 'resumes'  (در داشبورد Supabase یک bucket به اسم resumes بساز، public).
 * ساختار: resumes/{folder}/{timestamp}.{ext}
 *
 * متقاضی login ندارد، پس folder یک uuid تصادفی است (نه userId).
 * env: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (همان‌هایی که رسید استفاده می‌کند).
 */

const BUCKET = 'resumes';
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

function getStorageClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function uploadResume(params: {
  file: Buffer;
  filename: string;
  mimeType: string;
}): Promise<{ url: string; path: string } | null> {
  const client = getStorageClient();
  if (!client) return null;

  if (!ALLOWED_TYPES.includes(params.mimeType)) {
    throw new Error('فرمت فایل پشتیبانی نمی‌شود. فقط JPG، PNG، WebP و PDF مجاز است.');
  }
  if (params.file.length > MAX_SIZE_BYTES) {
    throw new Error(`حجم فایل نباید بیش از ${MAX_SIZE_MB} مگابایت باشد.`);
  }

  const ext = params.filename.split('.').pop() ?? 'pdf';
  const folder = crypto.randomUUID();
  const path = `${folder}/${Date.now()}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, params.file, { contentType: params.mimeType, upsert: true });
  if (error) throw new Error(error.message);

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function deleteResume(path: string): Promise<void> {
  const client = getStorageClient();
  if (!client) return;
  await client.storage.from(BUCKET).remove([path]);
}

export { BUCKET, MAX_SIZE_MB, ALLOWED_TYPES };
