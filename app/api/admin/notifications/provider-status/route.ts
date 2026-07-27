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
import { isPushConfigured } from '@/lib/notifications/channels/push';
import { getSmsProviderStatus } from '@/lib/sms/dispatcher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();

    const smsStatus = getSmsProviderStatus();

    return NextResponse.json({
      smtp: {
        // Uses the canonical isEmailConfigured() — all 5 required fields must be
        // present and MAIL_PORT must parse as a valid integer.
        configured: isEmailConfigured(),
      },
      sms: {
        // provider فعال (طبق SMS_PROVIDER، یا کاوه‌نگار برای backward compat) —
        // configured فقط env‌های همان provider را چک می‌کند، بدون افشای مقدار.
        provider: smsStatus.provider,
        configured: smsStatus.configured,
        dryRun: process.env.SMS_DRY_RUN === 'true',
      },
      push: {
        configured: isPushConfigured(),
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
