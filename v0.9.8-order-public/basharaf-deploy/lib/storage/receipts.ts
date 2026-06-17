import { createClient } from '@supabase/supabase-js';

/**
 * Storage client برای Supabase Storage.
 *
 * از @supabase/supabase-js استفاده می‌کند — همان package فاز ۱۴.
 * این client فقط برای Storage است، نه Realtime.
 *
 * Bucket: 'receipts'
 * ساختار: receipts/{userId}/{txId}/{filename}
 *
 * نکته: service_role key برای server-side upload استفاده می‌شود
 * تا RLS bypass شود و هر کاربری بتواند آپلود کند.
 *
 * env vars:
 *   SUPABASE_URL (نه NEXT_PUBLIC_ — فقط server-side)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

const BUCKET = 'receipts';
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

export function getStorageClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

/**
 * آپلود فایل رسید.
 * Returns: URL عمومی فایل یا null در صورت خطا.
 */
export async function uploadReceipt(params: {
  file: Buffer;
  filename: string;
  mimeType: string;
  userId: string;
  txId: string;
}): Promise<{ url: string; path: string } | null> {
  const client = getStorageClient();
  if (!client) return null;

  // validation
  if (!ALLOWED_TYPES.includes(params.mimeType)) {
    throw new Error('فرمت فایل پشتیبانی نمی‌شود. فقط JPG، PNG، WebP و PDF مجاز است.');
  }
  if (params.file.length > MAX_SIZE_BYTES) {
    throw new Error(`حجم فایل نباید بیش از ${MAX_SIZE_MB} مگابایت باشد.`);
  }

  // ساخت path یکتا
  const ext = params.filename.split('.').pop() ?? 'jpg';
  const path = `${params.userId}/${params.txId}/${Date.now()}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, params.file, {
      contentType: params.mimeType,
      upsert: true,
    });

  if (error) throw new Error(error.message);

  // URL عمومی
  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/**
 * حذف فایل رسید.
 */
export async function deleteReceipt(path: string): Promise<void> {
  const client = getStorageClient();
  if (!client) return;

  await client.storage.from(BUCKET).remove([path]);
}

export { BUCKET, MAX_SIZE_MB, ALLOWED_TYPES };
