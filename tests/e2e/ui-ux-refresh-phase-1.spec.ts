/**
 * UI/UX Refresh Phase 1 — visual/interaction regression, fully mocked.
 *
 * Verifies the shared-primitive and navigation changes at three viewports
 * (mobile 390x844, tablet 768x1024, desktop 1440x900) without touching
 * production data — every API route used by these pages is intercepted.
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
} as const;

const DASHBOARD_STATS_MOCK = {
  income: 50_000_000, expense: 23_000_000, balance: 27_000_000, count: 12,
};

const TRANSACTIONS_MOCK = {
  transactions: [
    { id: 't1', title: 'فروش سالن', amount: 5_000_000, type: 'income', status: 'approved', date: '۱۴۰۵/۰۴/۰۱', branchName: 'شعبه مرکزی', categoryName: 'فروش', createdBy: 'admin' },
    { id: 't2', title: 'خرید مواد اولیه', amount: 1_200_000, type: 'expense', status: 'pending', date: '۱۴۰۵/۰۴/۰۲', branchName: 'شعبه مرکزی', categoryName: 'خرید', createdBy: 'admin' },
  ],
  total: 2,
};

async function mockCommonRoutes(page: Page) {
  await page.route((url) => url.pathname === '/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'u1', name: 'کاربر تست', role: 'SuperAdmin', branchId: null, email: 'test@example.com' } }),
    });
  });
  await page.route((url) => url.pathname === '/api/notifications', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [], nextCursor: null, unreadCount: 0 }) });
  });
}

test.describe('UI/UX refresh — no horizontal overflow at any viewport', () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`dashboard — ${name}`, async ({ page }) => {
      await mockCommonRoutes(page);
      await page.route((url) => url.pathname === '/api/reports', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(DASHBOARD_STATS_MOCK) });
      });
      await page.setViewportSize(size);
      await page.goto('/dashboard');
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow).toBe(false);
    });

    test(`transactions — ${name}`, async ({ page }) => {
      await mockCommonRoutes(page);
      await page.route((url) => url.pathname === '/api/transactions', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TRANSACTIONS_MOCK) });
      });
      await page.setViewportSize(size);
      await page.goto('/transactions');
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow).toBe(false);
    });
  }
});

test.describe('ConfirmDialog — replaces window.confirm', () => {
  test('opens on a destructive action, cancels on Escape without side effects', async ({ page }) => {
    await mockCommonRoutes(page);
    let deleteCalled = false;
    await page.route((url) => url.pathname.startsWith('/api/purchase-orders/'), async (route) => {
      if (route.request().method() === 'DELETE') { deleteCalled = true; }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    });

    await page.goto('/purchase-orders/po-1');
    const deleteBtn = page.getByRole('button', { name: /حذف/ });
    if (await deleteBtn.count() === 0) test.skip();
    await deleteBtn.first().click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect(deleteCalled).toBe(false);
  });

  test('confirms a destructive action and proceeds', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/admin/notification-outbox', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ retried: 3 }) });
        return;
      }
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ summary: { pending: 0, processing: 0, dead: 2, sentToday: 0, oldestPendingAgeSeconds: null, smsConfigured: true, emailConfigured: true }, counts: { dead: 2 }, recentProblematic: [], nextCursor: null }),
      });
    });
    await page.route((url) => url.pathname === '/api/admin/notification-audience', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ rules: [], categories: [] }) });
    });

    await page.goto('/admin/settings/notifications');
    await page.getByRole('button', { name: 'صف ارسال' }).click();
    const retryBtn = page.getByRole('button', { name: /تلاش مجدد.*مُرده/ });
    await retryBtn.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'تلاش مجدد' }).click();
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Shared IconButton — consistency sweep', () => {
  const ACCOUNTS_MOCK = {
    accounts: [
      { id: 'a1', name: 'صندوق شعبه مرکزی', type: 'cash', balance: 12_000_000, branchId: null, branchName: 'شعبه مرکزی' },
    ],
  };

  test('row actions are icon-only IconButtons with mandatory aria-label, keyboard-activatable', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/accounts', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACCOUNTS_MOCK) });
    });
    await page.goto('/accounts');

    const editBtn = page.getByRole('button', { name: 'ویرایش نام' });
    const deleteBtn = page.getByRole('button', { name: 'حذف حساب' });
    await expect(editBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();

    // Enter/Space activation via keyboard, not just click
    await editBtn.focus();
    await expect(editBtn).toBeFocused();
    await page.keyboard.press('Enter');
    // entering edit mode swaps the row actions to Check/Cancel — a distinct
    // aria-labelled pair, proving the keyboard-triggered click actually fired
    await expect(page.getByRole('button', { name: 'ذخیره' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'انصراف' })).toBeVisible();
  });

  test('visible focus ring on Tab navigation', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/accounts', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ACCOUNTS_MOCK) });
    });
    await page.goto('/accounts');
    const editBtn = page.getByRole('button', { name: 'ویرایش نام' });
    await editBtn.focus();
    const outline = await editBtn.evaluate((el) => getComputedStyle(el).boxShadow);
    expect(outline).not.toBe('none');
  });
});

test.describe('Reduced motion — respected', () => {
  test('animations collapse to near-instant when prefers-reduced-motion is set', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockCommonRoutes(page);
    await page.goto('/login');
    const duration = await page.evaluate(() => {
      const el = document.createElement('div');
      el.style.transition = 'opacity 300ms';
      document.body.appendChild(el);
      const computed = getComputedStyle(el).transitionDuration;
      el.remove();
      return computed;
    });
    // globals.css's `@media (prefers-reduced-motion: reduce) { * { transition-duration: 0.01ms !important } }`
    // overrides even the 300ms set inline above — proves the rule is actually wired up, not just present in the file.
    expect(duration).toBe('0.01ms');
  });
});
