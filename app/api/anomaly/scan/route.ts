import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { handleError } from '@/lib/api-error';
import { consumptionSpikeRule } from '@/lib/anomaly/rules/consumptionSpikeRule';
import { saveFindings } from '@/lib/anomaly/engine';

/**
 * POST /api/anomaly/scan
 * اجرای اسکن دوره‌ای قوانین کارآگاه (daily scan).
 * احراز هویت: SuperAdmin OR هدر X-Scan-Secret برابر DETECTIVE_SCAN_SECRET.
 */
export async function POST(req: Request) {
  try {
    const secret = process.env.DETECTIVE_SCAN_SECRET;
    const headerSecret = req.headers.get('x-scan-secret');

    if (secret && headerSecret === secret) {
      // احراز هویت از طریق secret — برای GitHub Actions cron job
    } else {
      await requireAdmin();
    }

    const findings = await consumptionSpikeRule();
    await saveFindings(findings);

    return NextResponse.json({ ok: true, found: findings.length });
  } catch (e) {
    return handleError(e);
  }
}
