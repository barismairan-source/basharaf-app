/**
 * GET /api/admin/notifications/provider-status
 *
 * Readiness check for notification delivery providers.
 * Returns configuration status only — no secrets or credentials.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { isEmailConfigured } from '@/lib/notifications/channels/email';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      smtp: {
        // Uses the canonical isEmailConfigured() — all 5 required fields must be
        // present and MAIL_PORT must parse as a valid integer.
        configured: isEmailConfigured(),
      },
      sms: {
        configured: !!(process.env.KAVENEGAR_API_KEY),
        dryRun: process.env.SMS_DRY_RUN === 'true',
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
