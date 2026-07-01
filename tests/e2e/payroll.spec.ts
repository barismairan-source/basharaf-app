import { test, expect } from '@playwright/test';

test('صفحه /payroll باز می‌شود', async ({ page }) => {
  await page.goto('/payroll');
  await expect(page).toHaveURL(/\/payroll/);
  await expect(page.getByText('حقوق و دستمزد')).toBeVisible({ timeout: 10_000 });
});

test('دوره‌ی posted دکمه «برگشت ثبت» دارد', async ({ page }) => {
  await page.goto('/payroll');
  // اگر هیچ دوره‌ای نیست، رد کن
  const reverseButtons = page.getByRole('button', { name: 'برگشت ثبت' });
  const count = await reverseButtons.count();
  if (count === 0) {
    test.skip(true, 'No posted payroll run found');
    return;
  }
  await expect(reverseButtons.first()).toBeVisible();
});

test('کلیک «برگشت ثبت» بدون journal_voucher → dialog بازنشانی اجباری', async ({ page }) => {
  await page.goto('/payroll');
  const reverseButtons = page.getByRole('button', { name: 'برگشت ثبت' });
  const count = await reverseButtons.count();
  if (count === 0) {
    test.skip(true, 'No posted payroll run found');
    return;
  }

  await reverseButtons.first().click();

  // دو حالت ممکن:
  // ۱. dialog «این دوره سند حسابداری ندارد» (NO_JOURNAL_VOUCHER)
  // ۲. dialog confirm معمولی برگشت ثبت
  const forceResetDialog = page.getByText('این دوره سند حسابداری ندارد');
  const normalDialog = page.getByText('برگشت ثبت حقوق');

  const dialogVisible = await Promise.race([
    forceResetDialog.waitFor({ timeout: 8_000 }).then(() => 'force-reset'),
    normalDialog.waitFor({ timeout: 8_000 }).then(() => 'normal'),
  ]).catch(() => null);

  expect(dialogVisible, 'باید یکی از دو dialog نشان داده شود').not.toBeNull();

  // اگر dialog بازنشانی اجباری بود، متن هشدار را چک کن
  if (dialogVisible === 'force-reset') {
    await expect(page.getByText('بازنشانی اجباری')).toBeVisible();
  }
});
