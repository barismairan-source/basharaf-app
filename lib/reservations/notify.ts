/**
 * آداپتر پیامک مشتری برای رزرو عمومی — عمداً فعلاً no-op.
 *
 * طبق تصمیم صریح این فاز، هیچ SMSای به مشتری ارسال نمی‌شود؛ این فقط
 * interface را برای اتصال بعدی به یک سرویس پیامک ایرانی (مثل کاوه‌نگار)
 * ثابت نگه می‌دارد تا آن اتصال بدون تغییر در کد صدازننده انجام شود.
 */
export interface ReservationSmsAdapter {
  /** بعد از ثبت موفق رزرو عمومی — قرار است کد پیگیری را برای مشتری بفرستد. */
  sendCreated(input: { phone: string; trackingCode: string; branchName: string; date: string; time: string }): Promise<void>;
  /** بعد از لغو رزرو (توسط مشتری یا کارمند). */
  sendCanceled(input: { phone: string; trackingCode: string }): Promise<void>;
}

export const reservationSmsAdapter: ReservationSmsAdapter = {
  async sendCreated() {
    // no-op — عمداً؛ ر.ک. مستند بالای فایل
  },
  async sendCanceled() {
    // no-op — عمداً؛ ر.ک. مستند بالای فایل
  },
};
