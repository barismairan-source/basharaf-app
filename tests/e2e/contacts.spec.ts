import { test, expect } from '@playwright/test';

test('صفحه /contacts باز می‌شود', async ({ page }) => {
  await page.goto('/contacts');
  await expect(page).toHaveURL(/\/contacts/);
  // هدر صفحه
  await expect(page.getByText('طرف‌حساب‌ها')).toBeVisible({ timeout: 8_000 });
});

test('کلیک روی طرف‌حساب → drawer باز می‌شود و بخش «مبادلات نقدی» دارد', async ({ page }) => {
  await page.goto('/contacts');

  // اگر هیچ طرف‌حسابی نیست، تست را رد کن
  const rows = page.locator('table tbody tr, [role="row"]');
  // یا از DataList row selector استفاده کن
  // DataList ردیف‌ها را به‌صورت div می‌رندر می‌کند
  const anyRow = page.locator('.divide-y > li, tbody tr').first();
  const rowCount = await page.locator('tbody tr').count();
  if (rowCount === 0) {
    // تلاش کن با grid/div row
    const divRowCount = await page.locator('[class*="border-stone"][class*="rounded"]').count();
    if (divRowCount === 0) {
      test.skip(true, 'No contacts found in DB — skip drawer test');
      return;
    }
  }

  // کلیک روی اولین ردیف (onRowClick در DataList)
  await page.locator('table tbody tr').first().click().catch(async () => {
    // اگر table نبود، DataList div row را امتحان کن
    await page.locator('[class*="divide-y"] > *').first().click();
  });

  // drawer باید باز شود (کلاس fixed + right-0)
  const drawer = page.locator('aside[role="dialog"]');
  await expect(drawer).toBeVisible({ timeout: 8_000 });

  // بخش «مبادلات نقدی» — ساختار drawer جدید
  await expect(drawer.getByText('مبادلات نقدی')).toBeVisible({ timeout: 5_000 });
});

test('مانده طرف‌حساب صفر است (بدون نسیه)', async ({ page }) => {
  await page.goto('/contacts');
  const rowCount = await page.locator('tbody tr').count();
  if (rowCount === 0) {
    test.skip(true, 'No contacts found');
    return;
  }
  await page.locator('table tbody tr').first().click().catch(async () => {
    await page.locator('[class*="divide-y"] > *').first().click();
  });
  const drawer = page.locator('aside[role="dialog"]');
  await expect(drawer).toBeVisible({ timeout: 8_000 });
  // مانده نسیه باید «تسویه» باشد چون هیچ تراکنش نسیه‌ای نداریم
  await expect(drawer.getByText('تسویه')).toBeVisible({ timeout: 5_000 });
});
