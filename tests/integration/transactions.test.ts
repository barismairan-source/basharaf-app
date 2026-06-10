import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { db, schema, closeDb } from '@/lib/db/client';
import { hasDatabaseUrl } from './helpers/env';
import { startServer, type TestServer } from './helpers/server';
import { login, type AuthedClient } from './helpers/api';
import { createFixtures, cleanupFixtures, type TestFixtures } from './helpers/fixtures';

/**
 * تست‌های integration برای balance guardهای هسته (Backlog #5):
 *
 *   سناریو A: حذف اتمیک یک تراکنش approved → reverse کامل صندوق/طرف‌حساب/
 *             موجودی انبار/سند COGS (project-docs/financial-integrity-spec.md §۱)
 *   سناریو B: PATCH فیلدهای مالی روی approved → مسدود با 422 (immutability §۳)
 *   سناریو C: PATCH فیلدهای غیرمالی روی approved → آزاد، بدون اثر بر balance
 *
 * این تست‌ها روی یک نمونه‌ی واقعی Next.js (`next start`) و یک دیتابیس واقعی
 * Postgres اجرا می‌شوند — همه‌ی fixtureها با پیشوند __INTEGRATION_TEST__
 * ساخته و در پایان کامل پاک می‌شوند (هیچ داده‌ی واقعی دست‌نخورده نمی‌ماند).
 *
 * پیش‌نیاز اجرا:
 *   1. DATABASE_URL در .env.local ست شده باشد — در غیر این صورت کل suite
 *      با skip رد می‌شود (هرگز به‌صورت پیش‌فرض روی هیچ دیتابیسی اجرا نمی‌شود).
 *   2. `npm run build` قبلاً اجرا شده باشد (next start نیاز به .next دارد).
 *
 * اجرا: npm run test:integration
 */

const skipReason = hasDatabaseUrl()
  ? false
  : 'DATABASE_URL تنظیم نشده — integration tests رد شدند';

describe('Balance Guards — Backlog #5', { skip: skipReason }, () => {
  let server: TestServer;
  let client: AuthedClient;
  let fixtures: TestFixtures;

  before(async () => {
    fixtures = await createFixtures();
    server = await startServer();
    client = await login(server.baseUrl, fixtures.userEmail, fixtures.userPassword);
  });

  after(async () => {
    await server?.stop();
    await cleanupFixtures(fixtures);
    await closeDb();
  });

  describe('سناریو A — حذف اتمیک تراکنش approved (rollback کامل)', () => {
    it('balance صندوق، مانده‌ی طرف‌حساب، موجودی انبار و سند COGS را کامل reverse می‌کند', async () => {
      const cogsAmount = 80_000;
      const saleAmount = 250_000;
      const deductedQty = 2;

      // سند COGS خودکارساخته‌شده در زمان approve (accountId=null طبق طراحی)
      const [cogsTx] = await db.insert(schema.transactions).values({
        type: 'expense',
        title: `${fixtures.branchName} — COGS تست`,
        categoryId: fixtures.expenseCategoryId,
        categoryName: fixtures.expenseCategoryName,
        amount: cogsAmount,
        payee: 'سیستم',
        branchId: fixtures.branchId,
        branchName: fixtures.branchName,
        method: 'system',
        accountId: null,
        status: 'approved',
        date: '1405/03/20',
        createdBy: fixtures.userId,
      }).returning({ id: schema.transactions.id });
      if (!cogsTx) throw new Error('ایجاد تراکنش COGS تست شکست خورد');

      // تراکنش فروش approved با کسر انبار قبلاً اعمال‌شده (saleMeta.deductedAt)
      const [saleTx] = await db.insert(schema.transactions).values({
        type: 'income',
        title: `${fixtures.branchName} — فروش تست`,
        categoryId: fixtures.incomeCategoryId,
        categoryName: fixtures.incomeCategoryName,
        amount: saleAmount,
        payee: fixtures.branchName,
        branchId: fixtures.branchId,
        branchName: fixtures.branchName,
        method: 'cash',
        accountId: fixtures.accountId,
        contactId: fixtures.contactId,
        isCredit: true,
        status: 'approved',
        date: '1405/03/20',
        createdBy: fixtures.userId,
        saleMeta: {
          deductedAt: new Date().toISOString(),
          deductionLines: [{ itemId: fixtures.itemId, qtyBase: deductedQty, cost: cogsAmount }],
          cogsTransactionId: cogsTx.id,
        },
      }).returning({ id: schema.transactions.id });
      if (!saleTx) throw new Error('ایجاد تراکنش فروش تست شکست خورد');

      // شبیه‌سازی اثرات اعمال‌شده‌ی approve (همان کاری که applyBalance/applyContactBalance/
      // backflushing در زمان approve انجام می‌دهند) — تست مستقیماً DELETE را می‌سنجد.
      await db.update(schema.accounts)
        .set({ balance: fixtures.initialAccountBalance + saleAmount })
        .where(eq(schema.accounts.id, fixtures.accountId));
      await db.update(schema.contacts)
        .set({ balance: fixtures.initialContactBalance + saleAmount })
        .where(eq(schema.contacts.id, fixtures.contactId));
      await db.update(schema.invItems)
        .set({ qtyBase: String(fixtures.initialItemQtyBase - deductedQty) })
        .where(eq(schema.invItems.id, fixtures.itemId));

      const res = await client.fetchJson<{ ok: boolean }>(`/api/transactions/${saleTx.id}`, {
        method: 'DELETE',
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.ok, true);

      const [deletedSaleTx] = await db.select().from(schema.transactions)
        .where(eq(schema.transactions.id, saleTx.id));
      assert.equal(deletedSaleTx, undefined, 'تراکنش فروش باید حذف شده باشد');

      const [deletedCogsTx] = await db.select().from(schema.transactions)
        .where(eq(schema.transactions.id, cogsTx.id));
      assert.equal(deletedCogsTx, undefined, 'سند COGS باید ابطال (حذف) شده باشد');

      const [account] = await db.select().from(schema.accounts)
        .where(eq(schema.accounts.id, fixtures.accountId));
      assert.equal(account?.balance, fixtures.initialAccountBalance, 'موجودی صندوق باید به مقدار اولیه برگردد');

      const [contact] = await db.select().from(schema.contacts)
        .where(eq(schema.contacts.id, fixtures.contactId));
      assert.equal(contact?.balance, fixtures.initialContactBalance, 'مانده‌ی طرف‌حساب باید به مقدار اولیه برگردد');

      const [item] = await db.select().from(schema.invItems)
        .where(eq(schema.invItems.id, fixtures.itemId));
      assert.equal(Number(item?.qtyBase), fixtures.initialItemQtyBase, 'موجودی انبار باید به مقدار اولیه برگردد');

      const stockTxRows = await db.select().from(schema.invStockTx)
        .where(eq(schema.invStockTx.itemId, fixtures.itemId));
      const reversal = stockTxRows.find((r) => r.kind === 'sale' && Number(r.deltaBase) === deductedQty);
      assert.ok(reversal, 'باید یک رکورد inv_stock_tx معکوس برای ابطال کسر انبار ثبت شده باشد');
    });
  });

  describe('سناریو B — قفل ویرایش فیلدهای مالی روی تراکنش approved', () => {
    let txId: string;
    const originalAmount = 60_000;

    before(async () => {
      const [tx] = await db.insert(schema.transactions).values({
        type: 'expense',
        title: `${fixtures.branchName} — هزینه‌ی approved تست`,
        categoryId: fixtures.expenseCategoryId,
        categoryName: fixtures.expenseCategoryName,
        amount: originalAmount,
        payee: 'تأمین‌کننده تست',
        branchId: fixtures.branchId,
        branchName: fixtures.branchName,
        method: 'cash',
        accountId: fixtures.accountId,
        status: 'approved',
        date: '1405/03/20',
        createdBy: fixtures.userId,
      }).returning({ id: schema.transactions.id });
      if (!tx) throw new Error('ایجاد تراکنش approved تست شکست خورد');
      txId = tx.id;
    });

    const financialAttempts = [
      ['amount', 99_999],
      ['accountId', null],
      ['type', 'income'],
      ['isCredit', true],
    ] as const;

    for (const [field, value] of financialAttempts) {
      it(`PATCH با فیلد مالی "${field}" را با 422 مسدود می‌کند`, async () => {
        const res = await client.fetchJson<{ code: string; details?: { fields: string[] } }>(
          `/api/transactions/${txId}`,
          { method: 'PATCH', body: JSON.stringify({ [field]: value }) }
        );

        assert.equal(res.status, 422);
        assert.equal(res.body.code, 'FINANCIAL_FIELDS_IMMUTABLE_AFTER_APPROVAL');
        assert.ok(res.body.details?.fields.includes(field), `details.fields باید شامل "${field}" باشد`);
      });
    }

    it('بعد از همه‌ی تلاش‌های مسدودشده، amount/accountId تراکنش دست‌نخورده می‌ماند', async () => {
      const [tx] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, txId));
      assert.equal(tx?.amount, originalAmount);
      assert.equal(tx?.accountId, fixtures.accountId);

      const [account] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, fixtures.accountId));
      assert.equal(account?.balance, fixtures.initialAccountBalance, 'تلاش‌های مسدودشده نباید روی موجودی صندوق اثر بگذارند');
    });
  });

  describe('سناریو C — ویرایش آزاد فیلدهای غیرمالی روی تراکنش approved', () => {
    it('PATCH فیلدهای غیرمالی (note/receipt/categoryId) را بدون اثر بر amount/صندوق می‌پذیرد', async () => {
      const originalAmount = 45_000;

      const [tx] = await db.insert(schema.transactions).values({
        type: 'expense',
        title: `${fixtures.branchName} — هزینه‌ی غیرمالی-ادیت تست`,
        categoryId: fixtures.expenseCategoryId,
        categoryName: fixtures.expenseCategoryName,
        amount: originalAmount,
        payee: 'تأمین‌کننده تست',
        branchId: fixtures.branchId,
        branchName: fixtures.branchName,
        method: 'cash',
        accountId: fixtures.accountId,
        status: 'approved',
        date: '1405/03/20',
        note: 'یادداشت قدیمی',
        receipt: 'R-OLD',
        createdBy: fixtures.userId,
      }).returning({ id: schema.transactions.id });
      if (!tx) throw new Error('ایجاد تراکنش تست شکست خورد');

      const res = await client.fetchJson<{
        transaction: { note: string; receipt: string; category: string; categoryName: string; amount: number };
      }>(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note: 'یادداشت جدید', receipt: 'R-NEW', categoryId: fixtures.incomeCategoryId }),
      });

      assert.equal(res.status, 200);
      assert.equal(res.body.transaction.note, 'یادداشت جدید');
      assert.equal(res.body.transaction.receipt, 'R-NEW');
      assert.equal(res.body.transaction.category, fixtures.incomeCategoryId);
      assert.equal(res.body.transaction.categoryName, fixtures.incomeCategoryName);
      assert.equal(res.body.transaction.amount, originalAmount);

      const [account] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, fixtures.accountId));
      assert.equal(account?.balance, fixtures.initialAccountBalance, 'PATCH غیرمالی نباید روی موجودی صندوق اثر بگذارد');
    });
  });
});
