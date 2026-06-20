import { NextResponse } from 'next/server';
import { clearServerSession } from '@/lib/auth/session';
import { clearImpersonationSession } from '@/lib/auth/impersonation';

/**
 * POST /api/auth/logout
 *
 * Clears both basharaf-session and basharaf-imp cookies (idempotent).
 * Called by client-side auth guards before redirecting to /login so that
 * middleware doesn't see a stale cookie and bounce the user back to /dashboard.
 */
export async function POST() {
  clearServerSession();
  clearImpersonationSession();
  return NextResponse.json({ ok: true });
}
