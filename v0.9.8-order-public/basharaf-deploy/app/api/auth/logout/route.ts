import { NextResponse } from 'next/server';
import { clearServerSession } from '@/lib/auth/session';

/**
 * POST /api/auth/logout
 *
 * Side effect: cookie حذف می‌شود.
 * همیشه 200 برمی‌گرداند (idempotent — حتی اگر session موجود نباشد).
 */
export async function POST() {
  clearServerSession();
  return NextResponse.json({ ok: true });
}
