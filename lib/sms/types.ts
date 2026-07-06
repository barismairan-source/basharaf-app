export type SmsStatus = 'pending' | 'sent' | 'failed' | 'dry_run' | 'deduped' | 'capped';

export interface SendSmsParams {
  phone: string;
  message: string;
  /** کلید قالب برای dedup — مثلاً 'low_stock' */
  templateKey?: string;
  /** شناسه موجودیت مرتبط برای dedup — مثلاً itemId */
  entityId?: string;
}

export interface SendSmsResult {
  status: SmsStatus;
  logId: string;
}
