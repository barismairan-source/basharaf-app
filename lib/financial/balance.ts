/**
 * خالص‌ترین لایه‌ی محاسبه‌ی موجودی — بدون DB، بدون I/O.
 *
 * این ماژول فقط منطق ریاضی دلتای balance را نگه می‌دارد تا:
 *   ۱. قابل تست واحد (unit test) بدون mock دیتابیس باشد.
 *   ۲. بتوان در route‌های مختلف بدون تکرار استفاده کرد.
 *
 * قانون: income=+، expense=-، transfer: مبدا - / مقصد +
 * این دقیقاً همان منطق applyBalance/reverseBalance در balanceHelpers.ts است.
 */

export interface TxInput {
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  accountId: string | null;
  destinationAccountId: string | null;
}

export interface BalanceDelta {
  /** تغییر موجودی صندوق مبدا (accountId) */
  sourceDelta: number;
  /** تغییر موجودی صندوق مقصد (destinationAccountId) — فقط برای transfer */
  destDelta: number;
}

/** محاسبه‌ی دلتای موجودی برای اعمال (apply) یک تراکنش. */
export function applyDelta(t: TxInput): BalanceDelta {
  const amount = Number(t.amount);

  if (t.type === 'income') {
    return { sourceDelta: amount, destDelta: 0 };
  }
  if (t.type === 'expense') {
    return { sourceDelta: -amount, destDelta: 0 };
  }
  if (t.type === 'transfer' && t.destinationAccountId) {
    return { sourceDelta: -amount, destDelta: amount };
  }
  return { sourceDelta: 0, destDelta: 0 };
}

/** محاسبه‌ی دلتای موجودی برای معکوس‌کردن (reverse) یک تراکنش. */
export function reverseDelta(t: TxInput): BalanceDelta {
  const fwd = applyDelta(t);
  // || 0 normalizes -0 to +0 (IEEE 754 quirk)
  return { sourceDelta: (-fwd.sourceDelta) || 0, destDelta: (-fwd.destDelta) || 0 };
}

/** تضمین قرینه بودن apply و reverse. */
export function applyAndReverseSumToZero(t: TxInput): boolean {
  const fwd = applyDelta(t);
  const rev = reverseDelta(t);
  return fwd.sourceDelta + rev.sourceDelta === 0 && fwd.destDelta + rev.destDelta === 0;
}
