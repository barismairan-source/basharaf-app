import { test, expect } from '@playwright/test';

test('صفحه /inventory/variance باز می‌شود', async ({ page }) => {
  await page.goto('/inventory/variance');
  await expect(page).toHaveURL(/\/inventory\/variance/);
});

test('toggle «نمای حواله / نمای فروش واقعی» وجود دارد', async ({ page }) => {
  await page.goto('/inventory/variance');
  await expect(page.getByRole('button', { name: 'نمای حواله' })).toBeVisible({ timeout: 8_000 });
  await expect(page.getByRole('button', { name: 'نمای فروش واقعی' })).toBeVisible({ timeout: 8_000 });
});

test('سوئیچ به نمای فروش واقعی → یادداشت توضیحی نشان داده می‌شود', async ({ page }) => {
  await page.goto('/inventory/variance');
  // کلیک روی «نمای فروش واقعی»
  await page.getByRole('button', { name: 'نمای فروش واقعی' }).click();
  // یادداشت توضیحی که source=daily را توضیح می‌دهد
  await expect(page.getByText('بر اساس inv_daily_sales')).toBeVisible({ timeout: 8_000 });
});
