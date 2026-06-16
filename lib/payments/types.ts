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

/**
 * واحد پولی مورد انتظار درگاه برای فیلد amount در API آن — تومان یا ریال.
 * هر درگاه این مقدار را به‌صراحت اعلام می‌کند (createXGateway) و amount ورودی
 * (همیشه تومان، طبق interface زیر) را پیش از فراخوانی API با toGatewayAmount
 * تبدیل می‌کند. هدف: حذف ضرب/تقسیم پراکنده و دستی در ۱۰ در کد هر درگاه —
 * یک نقطه‌ی واحد تبدیل، تا تغییر/افزودن درگاه باگ واحد پولی نسازد.
 */
export type GatewayCurrencyUnit = 'toman' | 'rial';

/** تبدیل مبلغ تومانی (ورودی استاندارد همه‌ی متدهای PaymentGateway) به واحد مورد انتظار درگاه. */
export function toGatewayAmount(amountToman: number, unit: GatewayCurrencyUnit): number {
  return unit === 'rial' ? amountToman * 10 : amountToman;
}

export interface PaymentGateway {
  /** واحد پولی‌ای که این درگاه برای amount در API خودش انتظار دارد. */
  readonly currencyUnit: GatewayCurrencyUnit;

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
