/**
 * انواع صفحه‌ی عمومی رزرو (/reserve) — مطابق سبک types/ordering.ts (PublicOrder*).
 * این‌ها مستقل از Reservation داخلی (types/customer.ts) هستند، چون فیلدهای
 * قابل‌مشاهده برای مهمان ناشناس محدودتر است (بدون جزئیات رزروهای دیگران).
 *
 * تاریخ‌محور — کاربر هر تاریخی که مدیر برایش ساعت باز کرده را انتخاب می‌کند؛
 * اسلات‌ها از یک بازه‌ی فعالیت روزانه (نه ناهار/شام جدا) می‌آیند و ظرفیت‌شان
 * بر اساس میزهای واقعی محاسبه می‌شود (نه یک عدد کلی).
 */

export interface PublicReservationBranch {
  id: string;
  name: string;
  maxPartySize: number;
}

export interface PublicReservationSlot {
  time: string;               // 'HH:00'
  available: boolean;
  /** اگر true، تنها گزینه‌ی موجود میز اشتراکی/سوشیال است — باید به مهمان توضیح داد. */
  social: boolean;
}

export interface PublicReservationDay {
  branch: PublicReservationBranch;
  date: string;              // Jalali 'YYYY/MM/DD'
  slots: PublicReservationSlot[];
  /** true یعنی این تعداد نفر ساختاری روی هیچ میزی (حتی سوشیال) جا نمی‌شود — رزرو چندمیزی در v1 غیرفعال است. */
  structurallyImpossible: boolean;
  /** فقط وقتی slots خالی است پر می‌شود — متن/شماره‌ی دلخواه مدیر. */
  closedMessage: string | null;
  closedPhone: string | null;
}

export interface CreatePublicReservationInput {
  branchId: string;
  date: string;               // Jalali 'YYYY/MM/DD'
  bookerName?: string;        // نام رزروکننده — ممکن است با مهمان اصلی فرق کند
  guestName: string;
  guestPhone: string;
  time: string;              // 'HH:00' — باید دقیقاً یکی از اسلات‌های آن تاریخ باشد
  partySize: number;
  tableType: 'normal' | 'social';
  note?: string;
  /** برای جلوگیری از ثبت دوباره در اثر دوبار لمس دکمه یا retry شبکه — یک UUID تصادفی هر بار که فرم شروع می‌شود. */
  idempotencyKey?: string;
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
