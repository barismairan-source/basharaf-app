/**
 * POST /api/internal/notifications/process
 *
 * Triggers one outbox processing batch.
 * Authentication: NOTIFICATION_PROCESSOR_SECRET bearer token.
 * Constant-time comparison prevents timing-based secret enumeration.
 *
 * Returns counts only — never returns payloads, recipient addresses, or row content.
 */

import { NextResponse } from 'next/server';
import { constantTimeEqual } from '@/lib/notifications/secret';
import { processOutboxBatch } from '@/lib/notifications/processor';

export async function POST(req: Request) {
  const secret = process.env.NOTIFICATION_PROCESSOR_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json(
      { error: 'Processor secret not configured' },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : '';

  if (!constantTimeEqual(provided, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processOutboxBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch {
    return NextResponse.json(
      { error: 'Processor error' },
      { status: 500 }
    );
  }
}
