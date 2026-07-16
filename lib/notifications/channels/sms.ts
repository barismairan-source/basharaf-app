/**
 * SMS channel adapter for notification outbox V2.
 *
 * Delegates to the existing sendSms() which handles:
 * - daily cap
 * - deduplication
 * - Kavenegar API
 * - sms_log insertion
 *
 * Maps sms_log statuses to outbox DeliveryResult.
 */

import { sendSms } from '@/lib/sms/sendSms';
import type { DeliveryResult } from '@/lib/notifications/types';

export interface SendOutboxSmsParams {
  phone: string;
  message: string;
  templateKey?: string;
  entityId?: string;
}

/**
 * Sends an SMS for the outbox processor.
 * Maps Kavenegar statuses to outbox DeliveryResult.
 * Never throws.
 */
export async function sendOutboxSms(
  params: SendOutboxSmsParams
): Promise<DeliveryResult> {
  try {
    const result = await sendSms({
      phone: params.phone,
      message: params.message,
      templateKey: params.templateKey,
      entityId: params.entityId,
    });

    switch (result.status) {
      case 'sent':
        return { status: 'sent', providerMsgId: result.logId };
      case 'dry_run':
        return { status: 'skipped' };
      case 'deduped':
        return { status: 'skipped' };
      case 'capped':
        // Cap may clear tomorrow — return failed with capExceeded flag
        // so the processor can schedule a Tehran-midnight retry
        return { status: 'failed', capExceeded: true, error: 'daily cap reached' };
      case 'failed':
        return { status: 'failed', error: 'provider error' };
      default:
        return { status: 'failed', error: `unknown status: ${String(result.status)}` };
    }
  } catch (err) {
    return { status: 'failed', error: String(err) };
  }
}
