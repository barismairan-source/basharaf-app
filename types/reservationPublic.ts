/**
 * انواع صفحه‌ی عمومی رزرو (/reserve) — مطابق سبک types/ordering.ts (PublicOrder*).
 * این‌ها مستقل از Reservation داخلی (types/customer.ts) هستند، چون فیلدهای
 * قابل‌مشاهده برای مهمان ناشناس محدودتر است (بدون جزئیات رزروهای دیگران).
 *
 * مدل «فقط امروز، دو شیفت»: هیچ تاریخ آینده‌ای انتخاب نمی‌شود؛ اسلات‌ها فقط
 * از بازه‌ی ناهار/شامِ همان روز می‌آیند و ظرفیت‌شان بر اساس میزهای واقعی
 * محاسبه می‌شود (نه یک عدد کلی).
 */

export interface PublicReservationBranch {
  id: string;
  name: string;
  maxPartySize: number;
}

export interface PublicReservationSlot {
  time: string;               // 'HH:00'
  period: 'lunch' | 'dinner';
  available: boolean;
  /** اگر true، تنها گزینه‌ی موجود میز اشتراکی/سوشیال است — باید به مهمان توضیح داد. */
  social: boolean;
}

export interface PublicReservationToday {
  branch: PublicReservationBranch;
  date: string;              // Jalali 'YYYY/MM/DD' — امروز
  slots: PublicReservationSlot[];
  /** فقط وقتی هیچ شیفتی باز نیست یا slots خالی است پر می‌شود — متن/شماره‌ی دلخواه مدیر. */
  closedMessage: string | null;
  closedPhone: string | null;
}

export interface CreatePublicReservationInput {
  branchId: string;
  guestName: string;
  guestPhone: string;
  time: string;              // 'HH:00' — باید دقیقاً یکی از اسلات‌های امروز باشد
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
  isSocialTable: boolean;
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
