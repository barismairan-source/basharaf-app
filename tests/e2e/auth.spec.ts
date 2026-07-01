import { test, expect } from '@playwright/test';
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from './fixtures/seed';

// تست‌های auth بدون session شروع می‌شوند
test.use({ storageState: { cookies: [], origins: [] } });

test('لاگین با اطلاعات درست → redirect به /dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER_EMAIL);
  await page.fill('input[type="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
});

test('لاگین با رمز غلط → پیام خطا', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER_EMAIL);
  await page.fill('input[type="password"]', 'wrong-password-xyz');
  await page.click('button[type="submit"]');
  await expect(page.getByText('ایمیل یا رمز عبور نادرست است')).toBeVisible({ timeout: 10_000 });
  // باید روی صفحه لاگین بماند
  await expect(page).toHaveURL(/\/login/);
});

test('خروج → برگشت به /login', async ({ page }) => {
  // اول لاگین کن
  await page.goto('/login');
  await page.fill('input[type="email"]', TEST_USER_EMAIL);
  await page.fill('input[type="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

  // logout via API
  await page.request.post('/api/auth/logout');
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  // مطمئن شو که /dashboard دیگر قابل دسترس نیست
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
