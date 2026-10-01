import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, inArray, like } from 'drizzle-orm';
import { db, schema, closeDb } from '@/lib/db/client';
import { hashPassword } from '@/lib/auth/password';
import { hasDatabaseUrl } from './helpers/env';
import { startServer, type TestServer } from './helpers/server';
import { login, type AuthedClient } from './helpers/api';
import { createFixtures, cleanupFixtures, type TestFixtures } from './helpers/fixtures';

/**
 * تست‌های integration برای یافته‌های گزارش بررسی کامل ۲۰۲۶-۱۰
 * (project-docs/INVESTIGATION-full-system-review-2026-10.md):
 *
 *   B3 — دوبار کلیک/درخواست هم‌زمان نباید اثر مالی/انباری را دو بار اعمال کند:
 *        حذف تراکنش، رد هم‌زمان با تأیید، «تکمیل» سفارش، دریافت سفارش خرید.
 *   B1 — نقش‌های غیر SuperAdmin فقط داده‌ی مجاز را از API می‌گیرند.
 *   B2 — غیرفعال‌کردن کاربر، دسترسی API را بلافاصله (بعد از کش ۵ ثانیه‌ای) قطع می‌کند.
 *
 * مثل transactions.test.ts روی Next واقعی + Postgres واقعی؛ بدون DATABASE_URL رد می‌شود.
 */

const skipReason = hasDatabaseUrl() ? false : 'DATABASE_URL تنظیم نشده — integration tests رد شدند';
const PREFIX = '__INTEGRATION_TEST__';
const DATE = '۱۴۰۵/۰۳/۲۰';
const PARALLEL = 6;

async function accountBalance(id: string): Promise<number> {
  const [a] = await db.select({ b: schema.accounts.balance }).from(schema.accounts).where(eq(schema.accounts.id, id));
  return Number(a?.b ?? NaN);
}

describe('Concurrency + API access — گزارش بررسی ۲۰۲۶-۱۰', { skip: skipReason }, () => {
  let server: TestServer;
  let admin: AuthedClient;
  let f: TestFixtures;
  const extraUserIds: string[] = [];
  const extraEmployeeIds: string[] = [];
  const orderIds: string[] = [];
  const poIds: string[] = [];

  async function makeUser(role: 'Chef' | 'BranchUser', password = 'Test#Pass1234') {
    const email = `it-${role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@basharaf.local`;
    const [u] = await db.insert(schema.users).values({
      name: `${PREFIX} ${role}`, email, passwordHash: await hashPassword(password),
      role, assignedBranchId: f.branchId, initials: 'IT', joined: DATE,
    }).returning({ id: schema.users.id });
    extraUserIds.push(u!.id);
    return { id: u!.id, client: await login(server.baseUrl, email, password) };
  }

  before(async () => {
    f = await createFixtures();
    server = await startServer();
    admin = await login(server.baseUrl, f.userEmail, f.userPassword);
  });

  after(async () => {
    await server?.stop();
    if (orderIds.length) await db.delete(schema.orders).where(inArray(schema.orders.id, orderIds));
    if (poIds.length) await db.delete(schema.purchaseOrders).where(inArray(schema.purchaseOrders.id, poIds));
    await db.delete(schema.invStockTx).where(eq(schema.invStockTx.itemId, f.itemId));
    await db.delete(schema.invVouchers).where(eq(schema.invVouchers.branchId, f.branchId));
    if (extraEmployeeIds.length) await db.delete(schema.employees).where(inArray(schema.employees.id, extraEmployeeIds));
    if (extraUserIds.length) await db.delete(schema.users).where(inArray(schema.users.id, extraUserIds));
    await cleanupFixtures(f);
    await closeDb();
  });

  describe('B3 — درخواست‌های هم‌زمان', () => {
    it('حذف هم‌زمان یک تراکنش approved، موجودی را فقط یک بار برمی‌گرداند', async () => {
      const amount = 100_000;
      const before = await accountBalance(f.accountId);
      const [tx] = await db.insert(schema.transactions).values({
        type: 'income', title: `${PREFIX} حذف هم‌زمان`, categoryId: f.incomeCategoryId,
        categoryName: f.incomeCategoryName, amount, payee: 'تست', branchId: f.branchId,
        branchName: f.branchName, method: 'نقد', accountId: f.accountId, date: DATE,
        status: 'approved', createdBy: f.userId, approvedBy: f.userId, approvedAt: new Date(),
      }).returning();
      // اثر approve را دستی اعمال کن (همان چیزی که مسیر تأیید انجام می‌دهد)
      await db.update(schema.accounts).set({ balance: before + amount }).where(eq(schema.accounts.id, f.accountId));

      const results = await Promise.all(
        Array.from({ length: PARALLEL }, () => admin.fetchJson(`/api/transactions/${tx!.id}`, { method: 'DELETE' })),
      );
      assert.equal(results.filter((r) => r.status === 200).length, 1, 'دقیقاً یک حذف موفق');
      assert.equal(await accountBalance(f.accountId), before, 'موجودی دقیقاً به قبل برگشت (نه کمتر)');
    });

    it('رد و تأیید هم‌زمان: وضعیت نهایی و موجودی صندوق همیشه هم‌خوان‌اند', async () => {
      const amount = 50_000;
      for (let round = 0; round < 5; round++) {
        const before = await accountBalance(f.accountId);
        const [tx] = await db.insert(schema.transactions).values({
          type: 'expense', title: `${PREFIX} رد/تأیید ${round}`, categoryId: f.expenseCategoryId,
          categoryName: f.expenseCategoryName, amount, payee: 'تست', branchId: f.branchId,
          branchName: f.branchName, method: 'نقد', accountId: f.accountId, date: DATE,
          status: 'pending', createdBy: f.userId,
        }).returning();
        await Promise.all([
          admin.fetchJson(`/api/transactions/${tx!.id}/approve`, { method: 'POST' }),
          admin.fetchJson(`/api/transactions/${tx!.id}/reject`, { method: 'POST', body: '{}' }),
        ]);
        const [final] = await db.select().from(schema.transactions).where(eq(schema.transactions.id, tx!.id));
        const expected = final!.status === 'approved' ? before - amount : before;
        assert.equal(await accountBalance(f.accountId), expected, `دور ${round}: وضعیت=${final!.status}`);
      }
    });

    it('«تکمیل» هم‌زمان سفارش بیرون‌بر، فروش را فقط یک بار ثبت می‌کند', async () => {
      const orderNo = `IT-${Date.now()}`;
      const [order] = await db.insert(schema.orders).values({
        branchId: f.branchId, orderNo, trackToken: crypto.randomUUID(), clientToken: crypto.randomUUID(),
        serviceType: 'pickup', customerName: 'تست', customerPhone: '09120000000',
        subtotal: 300_000, deliveryFee: 0, discount: 0, total: 300_000,
        payMethod: 'cash', payStatus: 'unpaid', status: 'ready', jalaliDate: DATE,
      }).returning();
      orderIds.push(order!.id);
      await db.insert(schema.orderLines).values({
        orderId: order!.id, itemName: 'آیتم تست', unitPrice: 300_000, qty: 1, lineTotal: 300_000,
      });

      const results = await Promise.all(
        Array.from({ length: PARALLEL }, () => admin.fetchJson(`/api/orders/${order!.id}/status`, {
          method: 'PATCH', body: JSON.stringify({ status: 'completed' }),
        })),
      );
      assert.equal(results.filter((r) => r.status === 200).length, 1, 'دقیقاً یک انتقال موفق');
      const sales = await db.select().from(schema.transactions)
        .where(and(eq(schema.transactions.branchId, f.branchId), like(schema.transactions.title, `%${orderNo}%`)));
      assert.equal(sales.length, 1, 'فقط یک تراکنش فروش');
    });

    it('دریافت هم‌زمان سفارش خرید، موجودی انبار و بدهی را فقط یک بار ثبت می‌کند', async () => {
      const [item] = await db.select().from(schema.invItems).where(eq(schema.invItems.id, f.itemId));
      const qtyBefore = parseFloat(item!.qtyBase);
      const basePerUnit = parseFloat(item!.basePerUnit) || 1;
      const [po] = await db.insert(schema.purchaseOrders).values({
        no: `IT-PO-${Date.now()}`, branchId: f.branchId, status: 'sent', supplierId: f.contactId, createdBy: f.userId,
      }).returning();
      poIds.push(po!.id);
      const [poItem] = await db.insert(schema.purchaseOrderItems).values({
        orderId: po!.id, inventoryItemId: f.itemId, description: 'ماده تست', qty: '10', unitCost: 20_000, totalCost: 200_000,
      }).returning();

      const results = await Promise.all(
        Array.from({ length: PARALLEL }, () => admin.fetchJson(`/api/purchase-orders/${po!.id}/receive`, {
          method: 'POST', body: JSON.stringify({ lines: [{ poItemId: poItem!.id, receivedQty: 10 }] }),
        })),
      );
      assert.equal(results.filter((r) => r.status === 200 || r.status === 201).length, 1, 'دقیقاً یک دریافت موفق');
      const [after] = await db.select().from(schema.invItems).where(eq(schema.invItems.id, f.itemId));
      assert.equal(parseFloat(after!.qtyBase), qtyBefore + 10 * basePerUnit, 'موجودی فقط یک بار +۱۰ واحد');
      const vouchers = await db.select().from(schema.invVouchers).where(eq(schema.invVouchers.branchId, f.branchId));
      assert.equal(vouchers.length, 1, 'فقط یک رسید انبار');
    });
  });

  describe('B4 — ستون «موجودی» انبار بعد از تأیید برگه', () => {
    it('بعد از تأیید ورود و خروج، موجودی نمایشی با موجودی قطعی برابر می‌ماند', async () => {
      await db.update(schema.invItems)
        .set({ qtyPhysical: schema.invItems.qtyBase })
        .where(eq(schema.invItems.id, f.itemId));
      const read = async () => {
        const [it] = await db.select().from(schema.invItems).where(eq(schema.invItems.id, f.itemId));
        return { base: parseFloat(it!.qtyBase), physical: parseFloat(it!.qtyPhysical) };
      };
      const start = await read();

      for (const [kind, qty] of [['in', 40], ['out', 15]] as const) {
        const created = await admin.fetchJson<{ voucher: { id: string } }>('/api/inventory/vouchers', {
          method: 'POST',
          body: JSON.stringify({ kind, branchId: f.branchId, date: DATE, lines: [{ itemId: f.itemId, qtyBase: qty, estUnitCost: 20_000 }] }),
        });
        assert.equal(created.status, 201, `ثبت برگه‌ی ${kind}`);
        const approved = await admin.fetchJson(`/api/inventory/vouchers/${created.body.voucher.id}/approve`, {
          method: 'POST', body: JSON.stringify({ accountId: f.accountId }),
        });
        assert.equal(approved.status, 200, `تأیید برگه‌ی ${kind}`);
      }

      const end = await read();
      assert.equal(end.base, start.base + 40 - 15);
      assert.equal(end.physical, end.base, 'موجودی نمایشی = موجودی قطعی (قبلاً به عدد قبل از برگه برمی‌گشت)');
    });
  });

  describe('M1/M2 — دوره‌ی مالی بسته و یکسان‌سازی تاریخ', () => {
    it('ثبت تراکنش جدید در ماه بسته رد می‌شود؛ تاریخ لاتین به فرمت استاندارد ذخیره می‌شود', async () => {
      const [period] = await db.insert(schema.financialPeriods).values({
        jalaliYear: 1404, jalaliMonth: 1, closedBy: f.userId,
      }).returning();
      try {
        const body = (date: string) => JSON.stringify({
          type: 'expense', title: `${PREFIX} دوره`, categoryId: f.expenseCategoryId, amount: 1_000,
          payee: 'تست', branchId: f.branchId, method: 'نقد', accountId: f.accountId, date,
        });
        const closed = await admin.fetchJson('/api/transactions', { method: 'POST', body: body('1404/1/10') });
        assert.equal(closed.status, 422, 'ماه بسته');

        const ok = await admin.fetchJson<{ transaction: { id: string; date: string } }>('/api/transactions', { method: 'POST', body: body('1405/3/5') });
        assert.equal(ok.status, 201);
        assert.equal(ok.body.transaction.date, '۱۴۰۵/۰۳/۰۵', 'تاریخ یکسان‌سازی شده');

        const moved = await admin.fetchJson(`/api/transactions/${ok.body.transaction.id}`, {
          method: 'PATCH', body: JSON.stringify({ date: '۱۴۰۴/۰۱/۲۰' }),
        });
        assert.equal(moved.status, 422, 'انتقال تاریخ به داخل ماه بسته');
      } finally {
        await db.delete(schema.financialPeriods).where(eq(schema.financialPeriods.id, period!.id));
      }
    });
  });

  describe('B1/B2 — دسترسی API', () => {
    it('آشپز تراکنش‌ها، گزارش، حقوق و پرونده‌ی پرسنل را از API نمی‌گیرد', async () => {
      const chef = await makeUser('Chef');
      for (const path of ['/api/transactions', '/api/reports', '/api/export', '/api/payroll/runs', '/api/employees']) {
        const res = await chef.client.fetchJson(path).catch(() => ({ status: 0 }));
        assert.equal(res.status, 403, `${path} باید 403 بدهد`);
      }
    });

    it('مدیر شعبه پرسنل شعبه‌ی خودش را بدون کدملی/شبا می‌بیند', async () => {
      const [emp] = await db.insert(schema.employees).values({
        fullName: `${PREFIX} پرسنل`, phone: '09120000001', joinDate: new Date('2026-01-01'),
        branchId: f.branchId, nationalId: '0012345678', iban: 'IR000000000000000000000001',
      }).returning();
      extraEmployeeIds.push(emp!.id);
      const bu = await makeUser('BranchUser');
      const res = await bu.client.fetchJson<{ employees: Array<{ id: string; nationalId: string | null; iban: string | null }> }>('/api/employees');
      assert.equal(res.status, 200);
      const row = res.body.employees.find((e) => e.id === emp!.id);
      assert.ok(row, 'پرسنل شعبه‌ی خودش دیده می‌شود');
      assert.equal(row!.nationalId, null);
      assert.equal(row!.iban, null);
      const payroll = await bu.client.fetchJson('/api/payroll/runs');
      assert.equal(payroll.status, 403, 'فیش حقوق برای مدیر شعبه به‌طور پیش‌فرض بسته است');
    });

    it('کاربر غیرفعال‌شده بلافاصله (≤۵ ثانیه) دسترسی API را از دست می‌دهد', async () => {
      const bu = await makeUser('BranchUser');
      assert.equal((await bu.client.fetchJson('/api/transactions')).status, 200);
      await admin.fetchJson(`/api/admin/users/${bu.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: false }) });
      assert.equal((await bu.client.fetchJson('/api/transactions')).status, 401);
    });
  });
});
