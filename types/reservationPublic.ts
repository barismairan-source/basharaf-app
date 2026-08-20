/**
 * انواع صفحه‌ی عمومی رزرو (/reserve) — مطابق سبک types/ordering.ts (PublicOrder*).
 * این‌ها مستقل از Reservation داخلی (types/customer.ts) هستند، چون فیلدهای
 * قابل‌مشاهده برای مهمان ناشناس محدودتر است (بدون جزئیات رزروهای دیگران).
 */

export interface PublicReservationBranch {
  id: string;
  name: string;
  maxPartySize: number;
  minLeadMinutes: number;
  maxLeadDays: number;
}

export interface PublicReservationSlot {
  time: string;           // 'HH:mm'
  available: boolean;
  remainingGuests: number;
}

export interface PublicReservationDay {
  branch: PublicReservationBranch;
  date: string;            // Jalali 'YYYY/MM/DD'
  slots: PublicReservationSlot[];
}

export interface CreatePublicReservationInput {
  branchId: string;
  guestName: string;
  guestPhone: string;
  date: string;             // Jalali
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
