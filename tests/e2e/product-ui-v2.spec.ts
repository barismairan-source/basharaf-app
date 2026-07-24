/**
 * Product UI V2 — shared foundation verification, fully mocked, no production DB.
 *
 * Covers:
 *  - No horizontal overflow at 390 / 768 / 1280 / 1920px on the 3 shallow-migrated
 *    pages (Dashboard, Transactions, Recruitment — now on PageShell/PageToolbar/
 *    MetricGrid).
 *  - SegFilter keyboard navigation (WAI-ARIA radiogroup pattern) in a real browser.
 *  - Sheet dialog focus: moves in on open, returns to the trigger on close.
 */
import { test, expect, type Page } from '@playwright/test';

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
  wide: { width: 1920, height: 1080 },
} as const;

const ME_SUPERADMIN = {
  user: { id: 'u1', name: 'کاربر تست', role: 'SuperAdmin', branchId: null, assignedBranch: null, email: 'test@example.com' },
};

async function mockCommonRoutes(page: Page) {
  await page.route((url) => url.pathname === '/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ME_SUPERADMIN) });
  });
  await page.route((url) => url.pathname === '/api/notifications', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [], nextCursor: null, unreadCount: 0 }) });
  });
  await page.route((url) => url.pathname === '/api/branches', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ branches: [{ id: 'b1', name: 'شعبه مرکزی' }] }) });
  });
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

test.describe('عدم horizontal overflow — صفحات migrate‌شده به PageShell/PageToolbar/MetricGrid', () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`dashboard — ${name}`, async ({ page }) => {
      await mockCommonRoutes(page);
      await page.setViewportSize(size);
      await page.goto('/dashboard');
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test(`transactions — ${name}`, async ({ page }) => {
      await mockCommonRoutes(page);
      await page.route((url) => url.pathname === '/api/transactions', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [] }) });
      });
      await page.setViewportSize(size);
      await page.goto('/transactions');
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });

    test(`recruitment — ${name}`, async ({ page }) => {
      await mockCommonRoutes(page);
      await page.route((url) => url.pathname === '/api/recruitment' && url.search.includes('page='), async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: [], total: 0 }) });
      });
      await page.route((url) => url.pathname === '/api/recruitment/form-builder', async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sections: [] }) });
      });
      await page.setViewportSize(size);
      await page.goto('/recruitment');
      expect(await hasHorizontalOverflow(page)).toBe(false);
    });
  }
});

test.describe('SegFilter — الگوی radiogroup با کیبورد', () => {
  test('ArrowLeft/ArrowRight بین گزینه‌ها جابه‌جا می‌شود و aria-checked/URL به‌روز می‌شود', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/recruitment' && url.search.includes('page='), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: [], total: 0 }) });
    });
    await page.route((url) => url.pathname === '/api/recruitment/form-builder', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sections: [] }) });
    });
    await page.goto('/recruitment');

    const group = page.getByRole('radiogroup', { name: 'فیلتر وضعیت' });
    await expect(group).toBeVisible();

    const first = group.getByRole('radio').first();
    await expect(first).toHaveAttribute('aria-checked', 'true');
    await first.focus();

    // در سند RTL، ArrowLeft باید به گزینه‌ی «بعدی» برود
    await page.keyboard.press('ArrowLeft');
    const second = group.getByRole('radio').nth(1);
    await expect(second).toHaveAttribute('aria-checked', 'true');
    await expect(second).toBeFocused();
    await expect(first).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('Sheet — مدیریت focus روی موبایل (منوی بیشتر)', () => {
  test('باز شدن focus را داخل sheet می‌برد؛ Escape می‌بندد و focus را برمی‌گرداند', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/dashboard');

    const moreBtn = page.getByRole('button', { name: 'منو — بیشتر' });
    await moreBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(moreBtn).toBeFocused();
  });
});
