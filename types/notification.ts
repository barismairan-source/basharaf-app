/**
 * نوع اعلان — تعیین می‌کند چه آیکنی و چه رنگی نمایش داده شود.
 *
 * مقادیر legacy (backward compat با DB rows قدیمی):
 *   pending   → APPROVAL: در انتظار تأیید
 *   approved  → INFO: تایید شد
 *   rejected  → INFO: رد شد
 * مقادیر جدید:
 *   info      → اطلاع‌رسانی عمومی
 *   warning   → هشدار (کسری موجودی، clamp)
 *   critical  → بحرانی (خطای سیستمی)
 */
export type NotificationType =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'info'
  | 'warning'
  | 'critical';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  /** متن کوتاه زیرعنوان */
  sub: string;
  /** زمان نسبی به شکل رشته: «۲ ساعت پیش» — legacy, use createdAt for display */
  time: string;
  read: boolean;
  /** اگر اعلان مربوط به یک تراکنش است */
  txId: string | null;
  /** لینک مستقیم به entity مرتبط — اگر موجود باشد، کارت کلیک‌پذیر می‌شود */
  actionUrl: string | null;
  /** شناسه entity مرتبط (voucher id، PO id، ...) */
  entityId: string | null;
  /** V2 fields — present in all new rows; optional for backward compat with V1 store entries */
  createdAt?: string;
  readAt?: string | null;
  archivedAt?: string | null;
  ruleKey?: string | null;
  priority?: number;
}

/** کنفیگ یک قانون نوتیفیکیشن در Admin */
export interface NotificationRule {
  key: string;
  label: string;
  description: string | null;
  enabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  threshold: number | null;
  updatedAt: string;
}
