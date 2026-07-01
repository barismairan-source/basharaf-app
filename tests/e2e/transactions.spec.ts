import { test, expect } from '@playwright/test';

let testTxId: string;
let approvedTxId: string;

test.beforeAll(async ({ request }) => {
  // شعبه‌ی اول موجود را پیدا کن
  const brRes = await request.get('/api/branches');
  const brData = await brRes.json();
  const branch = brData.branches?.[0];
  if (!branch) throw new Error('[transactions] No branch found in DB');

  // تراکنش pending برای تست لیست + panel
  const pendingRes = await request.post('/api/transactions', {
    data: {
      type: 'expense',
      title: '[TEST] تراکنش آزمایشی — pending',
      amount: 100_000,
      payee: 'تست',
      branchId: branch.id,
      method: 'cash',
      date: '1403-01-15',
    },
  });
  expect(pendingRes.ok()).toBeTruthy();
  const { transaction: pending } = await pendingRes.json();
  testTxId = pending.id;

  // تراکنش دوم — تأیید می‌شود تا regression B1 تست شود
  const approveRes = await request.post('/api/transactions', {
    data: {
      type: 'expense',
      title: '[TEST] تراکنش آزمایشی — approved',
      amount: 200_000,
      payee: 'تست',
      branchId: branch.id,
      method: 'cash',
      date: '1403-01-15',
    },
  });
  const { transaction: approvedTx } = await approveRes.json();
  approvedTxId = approvedTx.id;
  // تأیید
  await request.post(`/api/transactions/${approvedTxId}/approve`);
});

test('تراکنش جدید در لیست نشان داده می‌شود', async ({ page }) => {
  await page.goto('/transactions');
  await expect(page.getByText('[TEST] تراکنش آزمایشی — pending')).toBeVisible({ timeout: 10_000 });
});

test('کلیک روی تراکنش → TxDetailPanel باز می‌شود', async ({ page }) => {
  await page.goto('/transactions');
  const row = page.getByText('[TEST] تراکنش آزمایشی — pending').first();
  await row.click();
  // panel باید باز شود — مبلغ تراکنش را نشان دهد
  await expect(page.getByText('۱۰۰٬۰۰۰')).toBeVisible({ timeout: 8_000 });
});

test('B1 regression — فیلد مبلغ در تراکنش approved غیرفعال است', async ({ page }) => {
  await page.goto('/transactions');
  const row = page.getByText('[TEST] تراکنش آزمایشی — approved').first();
  await row.click();
  // صبر کن تا panel باز شود
  await expect(page.getByText('[TEST] تراکنش آزمایشی — approved')).toBeVisible({ timeout: 8_000 });
  // فیلد مبلغ (input) باید disabled باشد
  const amountInputs = page.locator('input[disabled]');
  await expect(amountInputs.first()).toBeVisible({ timeout: 5_000 });
});
