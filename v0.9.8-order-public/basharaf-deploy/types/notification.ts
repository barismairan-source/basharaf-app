/**
 * نوع اعلان — تعیین می‌کند چه آیکنی و چه رنگی نمایش داده شود
 */
export type NotificationType = 'pending' | 'approved' | 'rejected' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  /** متن کوتاه زیرعنوان */
  sub: string;
  /** زمان نسبی به شکل رشته: «۲ ساعت پیش» */
  time: string;
  read: boolean;
  /** اگر اعلان مربوط به یک تراکنش است — برای ناوبری به جزئیات */
  txId: string | null;
}
