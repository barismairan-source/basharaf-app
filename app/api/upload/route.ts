import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { requireSession } from '@/lib/auth/session';
import { uploadReceipt, ALLOWED_TYPES, MAX_SIZE_MB } from '@/lib/storage/receipts';
import { handleError, ApiError } from '@/lib/api-error';

/**
 * POST /api/upload
 *
 * آپلود فایل رسید برای یک تراکنش.
 * multipart/form-data با فیلدهای:
 *   - file: فایل رسید
 *   - txId: ID تراکنش
 *
 * بعد از آپلود موفق، فیلد receipt_url در transaction آپدیت می‌شود.
 *
 * RBAC: فقط صاحب تراکنش یا SuperAdmin می‌تواند آپلود کند.
 */

export async function POST(req: Request) {
  try {
    const session = await requireSession();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const txId = formData.get('txId') as string | null;

    if (!file || !txId) {
      throw new ApiError(400, 'فایل و شناسه تراکنش الزامی هستند', 'MISSING_FIELDS');
    }

    // validation فایل
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new ApiError(
        400,
        'فرمت فایل پشتیبانی نمی‌شود. فقط JPG، PNG، WebP و PDF مجاز است.',
        'INVALID_FILE_TYPE'
      );
    }

    const MAX_BYTES = MAX_SIZE_MB * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      throw new ApiError(
        400,
        `حجم فایل نباید بیش از ${MAX_SIZE_MB} مگابایت باشد.`,
        'FILE_TOO_LARGE'
      );
    }

    // پیدا کردن تراکنش و چک RBAC
    const [tx] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId))
      .limit(1);

    if (!tx) {
      throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');
    }

    // RBAC: SuperAdmin همیشه، BranchUser فقط تراکنش خودش
    const isAdmin = session.role === 'SuperAdmin';
    const isOwner = tx.createdBy === session.sub;
    if (!isAdmin && !isOwner) {
      throw new ApiError(403, 'دسترسی به آپلود رسید ندارید', 'FORBIDDEN');
    }

    // تبدیل فایل به Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // آپلود به Supabase Storage
    const result = await uploadReceipt({
      file: buffer,
      filename: file.name,
      mimeType: file.type,
      userId: session.sub,
      txId,
    });

    if (!result) {
      throw new ApiError(
        500,
        'Storage پیکربندی نشده. SUPABASE_SERVICE_ROLE_KEY را تنظیم کنید.',
        'STORAGE_NOT_CONFIGURED'
      );
    }

    // آپدیت URL در database
    await db
      .update(schema.transactions)
      .set({
        receiptUrl: result.url,
        hasReceipt: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.transactions.id, txId));

    return NextResponse.json({
      url: result.url,
      path: result.path,
    });
  } catch (e) {
    return handleError(e);
  }
}

/**
 * DELETE /api/upload?txId=...
 * حذف رسید یک تراکنش.
 */
export async function DELETE(req: Request) {
  try {
    const session = await requireSession();
    const url = new URL(req.url);
    const txId = url.searchParams.get('txId');

    if (!txId) {
      throw new ApiError(400, 'شناسه تراکنش الزامی است', 'MISSING_TX_ID');
    }

    const [tx] = await db
      .select()
      .from(schema.transactions)
      .where(eq(schema.transactions.id, txId))
      .limit(1);

    if (!tx) throw new ApiError(404, 'تراکنش پیدا نشد', 'TX_NOT_FOUND');

    const isAdmin = session.role === 'SuperAdmin';
    const isOwner = tx.createdBy === session.sub;
    if (!isAdmin && !isOwner) {
      throw new ApiError(403, 'دسترسی ندارید', 'FORBIDDEN');
    }

    // آپدیت DB
    await db
      .update(schema.transactions)
      .set({ receiptUrl: null, hasReceipt: false, updatedAt: new Date() })
      .where(eq(schema.transactions.id, txId));

    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
