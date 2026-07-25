import { test, expect, type Page } from '@playwright/test';

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

test.describe('پایداری فیلتر در URL (بازطراحی لیست تراکنش‌ها)', () => {
  test('باز کردن لینک با status=pending — فقط تراکنش‌های در انتظار نمایش داده می‌شوند', async ({ page }) => {
    await page.goto('/transactions?status=pending');
    await expect(page.getByText('[TEST] تراکنش آزمایشی — pending')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('[TEST] تراکنش آزمایشی — approved')).not.toBeVisible();
    // چیپ فیلتر فعال باید state را منعکس کند
    await expect(page.getByText('وضعیت: در انتظار')).toBeVisible();
  });

  test('تغییر فیلتر در UI به URL منعکس می‌شود', async ({ page }) => {
    await page.goto('/transactions');
    await expect(page.getByText('[TEST] تراکنش آزمایشی — pending')).toBeVisible({ timeout: 10_000 });
    // ترتیب Select های نوار فیلتر دسکتاپ: نوع، وضعیت، شعبه (SuperAdmin)
    const statusSelect = page.locator('.md\\:flex select').nth(1);
    await statusSelect.selectOption('pending');
    await expect(page).toHaveURL(/status=pending/, { timeout: 5_000 });
  });
});

test.describe('ناوبری با کیبورد', () => {
  test('Enter روی ردیف فوکوس‌شده → TxDetailPanel باز می‌شود', async ({ page }) => {
    await page.goto('/transactions');
    const row = page.locator('tr[role="button"]').filter({ hasText: '[TEST] تراکنش آزمایشی — pending' });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('۱۰۰٬۰۰۰')).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('حالت‌های خالی — تفکیک «بدون نتیجه» از «بدون تراکنش»', () => {
  test('جستجوی بی‌نتیجه → پیام «نتیجه‌ای یافت نشد» + دکمه‌ی پاک‌سازی فیلتر', async ({ page }) => {
    await page.goto('/transactions?q=zzz-nonexistent-search-zzz');
    await expect(page.getByText('نتیجه‌ای برای این فیلترها نیست')).toBeVisible({ timeout: 10_000 });
    const clearBtn = page.getByRole('button', { name: 'پاک کردن فیلترها', exact: true });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    // بعد از پاک‌سازی، تراکنش‌های واقعی دوباره دیده می‌شوند
    await expect(page.getByText('[TEST] تراکنش آزمایشی — pending')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('نمایش موبایل — کارت به‌جای جدول سرریزشده', () => {
  test('در ۳۹۰px: عنوان، مبلغ، وضعیت، تاریخ و شعبه همه دیده می‌شوند', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/transactions');
    const card = page.locator('.md\\:hidden').filter({ hasText: '[TEST] تراکنش آزمایشی — pending' }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    // رفع باگ: قبلاً تاریخ و شعبه در کارت موبایل mobileHide بودند
    await expect(card.getByText('تاریخ')).toBeVisible();
    await expect(card.getByText('شعبه')).toBeVisible();
  });
});
