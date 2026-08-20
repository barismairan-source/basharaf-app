/**
 * انواع صفحه‌ی عمومی رزرو (/reserve) — مطابق سبک types/ordering.ts (PublicOrder*).
 * این‌ها مستقل از Reservation داخلی (types/customer.ts) هستند، چون فیلدهای
 * قابل‌مشاهده برای مهمان ناشناس محدودتر است (بدون جزئیات رزروهای دیگران).
 *
 * مدل «فقط امروز»: هیچ تاریخ آینده‌ای انتخاب نمی‌شود — سرور همیشه تاریخ
 * امروز را برمی‌گرداند/ثبت می‌کند.
 */

export interface PublicReservationBranch {
  id: string;
  name: string;
  maxPartySize: number;
}

export interface PublicReservationToday {
  branch: PublicReservationBranch;
  date: string;              // Jalali 'YYYY/MM/DD' — امروز
  open: boolean;
  remainingTables: number;
  /** فقط وقتی open=false پر می‌شود — متن/شماره‌ی دلخواه مدیر. */
  closedMessage: string | null;
  closedPhone: string | null;
}

export interface CreatePublicReservationInput {
  branchId: string;
  guestName: string;
  guestPhone: string;
  time: string;              // 'HH:mm'
  partySize: number;
  note?: string;
}

export interface PublicReservationResult {
  trackingCode: string;
  branchName: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
}

export interface PublicReservationDetail {
  trackingCode: string;
  branchName: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  note: string | null;
  canCancel: boolean;
  createdAt: string;
}
