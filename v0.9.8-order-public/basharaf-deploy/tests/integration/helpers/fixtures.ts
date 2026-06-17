import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';

const PREFIX = '__INTEGRATION_TEST__';
const JALALI_DATE = '1405/03/20';

export interface TestFixtures {
  branchId: string;
  branchName: string;
  userId: string;
  userEmail: string;
  userPassword: string;
  incomeCategoryId: string;
  incomeCategoryName: string;
  expenseCategoryId: string;
  expenseCategoryName: string;
  accountId: string;
  initialAccountBalance: number;
  contactId: string;
  initialContactBalance: number;
  itemId: string;
  initialItemQtyBase: number;
}

/**
 * مجموعه‌ی کامل داده‌های ایزوله برای تست — همه با پیشوند __INTEGRATION_TEST__
 * ساخته می‌شوند و هیچ ارجاعی به داده‌ی واقعی موجود در دیتابیس ندارند.
 * بعد از تست با cleanupFixtures کامل پاک می‌شوند.
 */
export async function createFixtures(): Promise<TestFixtures> {
  const branchName = `${PREFIX} شعبه`;
  const incomeCategoryName = `${PREFIX} درآمد`;
  const expenseCategoryName = `${PREFIX} هزینه`;
  const initialAccountBalance = 1_000_000;
  const initialContactBalance = 0;
  const initialItemQtyBase = 100;
  const userPassword = 'Test#Pass1234';
  const userEmail = `integration-test-${Date.now()}@basharaf.local`;

  const [branch] = await db.insert(schema.branches).values({
    name: branchName,
    address: 'تست',
    manager: 'تست',
    opened: JALALI_DATE,
  }).returning({ id: schema.branches.id });
  if (!branch) throw new Error('ایجاد شعبه‌ی تست شکست خورد');

  const [user] = await db.insert(schema.users).values({
    name: `${PREFIX} کاربر`,
    email: userEmail,
    passwordHash: await hashPassword(userPassword),
    role: 'SuperAdmin',
    initials: 'IT',
    joined: JALALI_DATE,
  }).returning({ id: schema.users.id });
  if (!user) throw new Error('ایجاد کاربر تست شکست خورد');

  const [incomeCategory] = await db.insert(schema.categories).values({
    type: 'income',
    name: incomeCategoryName,
  }).returning({ id: schema.categories.id });
  if (!incomeCategory) throw new Error('ایجاد دسته‌ی درآمد تست شکست خورد');

  const [expenseCategory] = await db.insert(schema.categories).values({
    type: 'expense',
    name: expenseCategoryName,
  }).returning({ id: schema.categories.id });
  if (!expenseCategory) throw new Error('ایجاد دسته‌ی هزینه تست شکست خورد');

  const [account] = await db.insert(schema.accounts).values({
    name: `${PREFIX} صندوق`,
    type: 'cash',
    balance: initialAccountBalance,
    branchId: branch.id,
  }).returning({ id: schema.accounts.id });
  if (!account) throw new Error('ایجاد صندوق تست شکست خورد');

  const [contact] = await db.insert(schema.contacts).values({
    name: `${PREFIX} مشتری`,
    type: 'customer',
    balance: initialContactBalance,
  }).returning({ id: schema.contacts.id });
  if (!contact) throw new Error('ایجاد طرف‌حساب تست شکست خورد');

  const [item] = await db.insert(schema.invItems).values({
    code: `TEST-${Date.now()}`,
    name: `${PREFIX} ماده اولیه`,
    branchId: branch.id,
    unit: 'kg',
    qtyBase: String(initialItemQtyBase),
    avgCostPerBase: '20000',
  }).returning({ id: schema.invItems.id });
  if (!item) throw new Error('ایجاد کالای انبار تست شکست خورد');

  return {
    branchId: branch.id,
    branchName,
    userId: user.id,
    userEmail,
    userPassword,
    incomeCategoryId: incomeCategory.id,
    incomeCategoryName,
    expenseCategoryId: expenseCategory.id,
    expenseCategoryName,
    accountId: account.id,
    initialAccountBalance,
    contactId: contact.id,
    initialContactBalance,
    itemId: item.id,
    initialItemQtyBase,
  };
}

/**
 * پاک‌سازی کامل همه‌ی fixtureها — به ترتیب FK-safe (وابسته‌ترین جدول‌ها اول).
 * idempotent: اگر چیزی قبلاً حذف شده باشد (مثلاً توسط خود تست DELETE)، مشکلی نیست.
 */
export async function cleanupFixtures(f: TestFixtures): Promise<void> {
  await db.delete(schema.transactions).where(eq(schema.transactions.branchId, f.branchId));
  await db.delete(schema.invStockTx).where(eq(schema.invStockTx.itemId, f.itemId));
  await db.delete(schema.invItems).where(eq(schema.invItems.id, f.itemId));
  await db.delete(schema.contacts).where(eq(schema.contacts.id, f.contactId));
  await db.delete(schema.accounts).where(eq(schema.accounts.id, f.accountId));
  await db.delete(schema.categories).where(eq(schema.categories.id, f.incomeCategoryId));
  await db.delete(schema.categories).where(eq(schema.categories.id, f.expenseCategoryId));
  await db.delete(schema.users).where(eq(schema.users.id, f.userId));
  await db.delete(schema.branches).where(eq(schema.branches.id, f.branchId));
}
