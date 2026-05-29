import { eq, sql } from 'drizzle-orm';
import { schema } from './client';

/**
 * Balance integrity helpers — قلب صحت حسابداری.
 *
 * این توابع تضمین می‌کنند موجودی صندوق‌ها همیشه با تراکنش‌های
 * approved همخوانی داشته باشد.
 *
 * قانون طلایی:
 *   هر تغییر در یک تراکنش approved که amount/account/type را
 *   عوض می‌کند، باید balance را معکوس و دوباره اعمال کند.
 */

type TxLike = {
  type: string;
  amount: number | bigint;
  accountId: string | null;
  destinationAccountId: string | null;
  status: string;
};

/**
 * اعمال اثر یک تراکنش روی موجودی (forward).
 * income: +، expense: -، transfer: مبدا - / مقصد +
 */
export async function applyBalance(tx: any, t: TxLike): Promise<void> {
  const amount = Number(t.amount);
  if (!t.accountId) return;

  if (t.type === 'income') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'expense') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'transfer' && t.destinationAccountId) {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.destinationAccountId));
  }
}

/**
 * معکوس کردن اثر یک تراکنش روی موجودی (reverse).
 * برای DELETE یا EDIT یک تراکنش approved.
 */
export async function reverseBalance(tx: any, t: TxLike): Promise<void> {
  const amount = Number(t.amount);
  if (!t.accountId) return;

  if (t.type === 'income') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'expense') {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
  } else if (t.type === 'transfer' && t.destinationAccountId) {
    await tx.update(schema.accounts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.accountId));
    await tx.update(schema.accounts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.accounts.id, t.destinationAccountId));
  }
}

/**
 * اعمال اثر تراکنش روی موجودی طرف‌حساب (contact).
 *
 * منطق بدهکاری:
 *   income نسیه  → مشتری به ما بدهکار می‌شود (balance +)
 *   expense نسیه → ما به تأمین‌کننده بدهکار می‌شویم (balance -)
 */
export async function applyContactBalance(tx: any, t: {
  type: string; amount: number | bigint; contactId: string | null; isCredit?: boolean;
}): Promise<void> {
  if (!t.contactId || !t.isCredit) return;
  const amount = Number(t.amount);

  if (t.type === 'income') {
    // فروش نسیه — مشتری بدهکار می‌شود
    await tx.update(schema.contacts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  } else if (t.type === 'expense') {
    // خرید نسیه — ما بدهکار می‌شویم
    await tx.update(schema.contacts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  }
}

export async function reverseContactBalance(tx: any, t: {
  type: string; amount: number | bigint; contactId: string | null; isCredit?: boolean;
}): Promise<void> {
  if (!t.contactId || !t.isCredit) return;
  const amount = Number(t.amount);

  if (t.type === 'income') {
    await tx.update(schema.contacts)
      .set({ balance: sql`balance - ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  } else if (t.type === 'expense') {
    await tx.update(schema.contacts)
      .set({ balance: sql`balance + ${amount}`, updatedAt: new Date() })
      .where(eq(schema.contacts.id, t.contactId));
  }
}
