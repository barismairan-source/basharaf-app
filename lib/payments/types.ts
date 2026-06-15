// ─── سفارش بیرون‌بر — لایه‌ی انتزاع درگاه پرداخت آنلاین ─────────────────
// پیاده‌سازی اول: Zarinpal (zarinpal.ts). افزودن درگاه دیگر (IDPay/Zibal)
// فقط با اضافه‌کردن یک فایل جدید که این interface را implement می‌کند
// و انتخاب آن در index.ts.

export interface PaymentRequestResult {
  /** آدرس ریدایرکت کاربر به درگاه پرداخت */
  url: string;
  /** شناسه‌ی پیگیری تراکنش نزد درگاه — برای verify بعدی ذخیره شود */
  authority: string;
}

export interface PaymentVerifyResult {
  ok: boolean;
  /** کد پیگیری پرداخت موفق (مثلاً ref_id زرین‌پال) */
  refId?: string;
  /** پیام خطا در صورت ok=false */
  message?: string;
}

export interface PaymentGateway {
  /**
   * شروع پرداخت. amount به تومان است.
   * @param orderId شناسه‌ی سفارش (برای description تراکنش)
   * @param callbackUrl آدرسی که درگاه پس از پرداخت کاربر را به آن برمی‌گرداند
   */
  request(amount: number, orderId: string, callbackUrl: string): Promise<PaymentRequestResult>;

  /**
   * تایید پرداخت پس از بازگشت از درگاه. amount (تومان) همان مبلغ ثبت‌شده‌ی
   * سفارش در دیتابیس است — هرگز مبلغ ارسالی از کلاینت را اینجا پاس ندهید.
   * orderId همان مقداری است که به request() داده شده (برخی درگاه‌ها مثل
   * IDPay برای verify به آن نیاز دارند).
   */
  verify(authority: string, amount: number, orderId: string): Promise<PaymentVerifyResult>;
}
