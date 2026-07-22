/**
 * Mobile UX / RTL audit fixes — fully mocked, no production DB.
 *
 * Mirrors the established pattern in ui-ux-refresh-phase-1.spec.ts: every
 * API route the page needs is intercepted; unmocked routes fall back to the
 * app's existing `.catch(() => [])` defaults in store bootstrap, so they
 * don't need to be individually stubbed unless the test asserts on their data.
 */
import { test, expect, type Page } from '@playwright/test';

const MOBILE = { width: 390, height: 844 };

const ME_SUPERADMIN = {
  user: { id: 'u1', name: 'کاربر تست', role: 'SuperAdmin', branchId: null, assignedBranch: null, email: 'test@example.com' },
};

const BRANCHES_MOCK = {
  branches: [{ id: 'b1', name: 'شعبه مرکزی', openingDate: '۱۴۰۰/۰۱/۰۱' }],
};

async function mockCommonRoutes(page: Page) {
  await page.route((url) => url.pathname === '/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ME_SUPERADMIN) });
  });
  await page.route((url) => url.pathname === '/api/notifications', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [], nextCursor: null, unreadCount: 0 }) });
  });
  await page.route((url) => url.pathname === '/api/branches', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(BRANCHES_MOCK) });
  });
}

async function hasHorizontalOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

test.describe('عدم horizontal overflow در 390x844', () => {
  test('transactions', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/transactions', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transactions: [] }) });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/transactions');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('inventory', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/inventory/expiry', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ warnings: [] }) });
    });
    await page.route((url) => url.pathname === '/api/inventory/reports/exceptions', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          stalePending: { count: 0, items: [] }, clampWarnings: { count: 0, items: [] },
          belowMin: { count: 0, items: [] }, pendingReversals: { count: 0, items: [] },
        }),
      });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/inventory');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('inventory/receive', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/inventory/items', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ items: [{ id: 'i1', code: 'C1', name: 'گوجه', category: 'سبزیجات', kind: 'raw', branchId: 'b1', unit: 'kg', basePerUnit: 1, yieldPct: 100, qtyPhysical: 10, qtyBase: 10, avgCostPerBase: 1000, minBase: 2, batchYieldBase: null, shelfLifeDays: 7, prepRecipe: null, isActive: true, createdAt: '', updatedAt: '' }] }),
      });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/inventory/receive');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('reports', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/reports', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          summary: { income: 50_000_000, expense: 23_000_000, balance: 27_000_000, count: 12 },
          monthly: [], byBranch: [], byCategory: [], byUser: [],
          takeaway: { count: 0, totalSales: 0, avgBasket: 0, deliveryCount: 0, pickupCount: 0 },
          pl: { revenue: 50_000_000, cogs: 10_000_000, grossProfit: 40_000_000, payroll: 8_000_000, otherExpense: 5_000_000, netProfit: 27_000_000 },
        }),
      });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/reports');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });

  test('recruitment', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/recruitment' && url.search.includes('page='), async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: [], total: 0 }) });
    });
    await page.route((url) => url.pathname === '/api/recruitment/form-builder', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sections: [] }) });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/recruitment');
    expect(await hasHorizontalOverflow(page)).toBe(false);
  });
});

test.describe('Toast — بالاتر از BottomTabBar در موبایل', () => {
  test('توست بعد از خطای اعتبارسنجی، بالاتر از nav پایین است', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/inventory/items', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/inventory/receive');

    await page.getByRole('button', { name: 'ثبت برگه' }).click();

    const toast = page.getByRole('alert').filter({ hasText: 'حداقل یک قلم و مقدار معتبر وارد کنید' })
      .or(page.getByRole('status').filter({ hasText: 'حداقل یک قلم و مقدار معتبر وارد کنید' }));
    await expect(toast.first()).toBeVisible();

    const bottomNav = page.getByRole('navigation', { name: 'ناوبری پایین' });
    const [toastBox, navBox] = await Promise.all([toast.first().boundingBox(), bottomNav.boundingBox()]);
    expect(toastBox).not.toBeNull();
    expect(navBox).not.toBeNull();
    // پایین‌ترین لبه‌ی toast باید بالاتر (عدد y کوچک‌تر) از لبه‌ی بالای nav باشد
    expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(navBox!.y + 1);
  });
});

test.describe('inventory/receive — خطای inline و focus اولین قلم نامعتبر', () => {
  test('پیام دقیق، ring خطا روی ردیف، و focus روی select قلم', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/inventory/items', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/inventory/receive');

    await page.getByRole('button', { name: 'ثبت برگه' }).click();

    await expect(page.getByText('حداقل یک قلم و مقدار معتبر وارد کنید').first()).toBeVisible();

    const firstItemSelect = page.locator('select').filter({ hasText: '— قلم —' }).first();
    await expect(firstItemSelect).toBeFocused();
  });
});

test.describe('reports — عدم نمایش دوباره «تومان»', () => {
  test('در KPICard واحد فقط یک بار نمایش داده می‌شود', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/reports', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          summary: { income: 5_400_000_000, expense: 23_000_000, balance: 27_000_000, count: 12 },
          monthly: [], byBranch: [], byCategory: [], byUser: [],
          takeaway: { count: 0, totalSales: 0, avgBasket: 0, deliveryCount: 0, pickupCount: 0 },
          pl: { revenue: 50_000_000, cogs: 10_000_000, grossProfit: 40_000_000, payroll: 8_000_000, otherExpense: 5_000_000, netProfit: 27_000_000 },
        }),
      });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/reports');

    const incomeCard = page.getByText('مجموع درآمد').locator('..').locator('..');
    const text = await incomeCard.innerText();
    const occurrences = (text.match(/تومان/g) ?? []).length;
    expect(occurrences).toBe(1);
  });
});

test.describe('inventory — skeleton و کارت نهایی هم‌اندازه (بدون پرش)', () => {
  test('ارتفاع اسکلت با ارتفاع کارت نهایی سازگار است', async ({ page }) => {
    await mockCommonRoutes(page);
    await page.route((url) => url.pathname === '/api/inventory/expiry', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ warnings: [] }) });
    });
    await page.route((url) => url.pathname === '/api/inventory/reports/exceptions', async (route) => {
      // تأخیر عمدی تا skeleton قابل مشاهده/اندازه‌گیری باشد
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          stalePending: { count: 1, items: [] }, clampWarnings: { count: 2, items: [] },
          belowMin: { count: 0, items: [] }, pendingReversals: { count: 0, items: [] },
        }),
      });
    });
    await page.setViewportSize(MOBILE);
    await page.goto('/inventory');

    const card = page.locator('[aria-busy="true"]');
    await expect(card).toBeVisible();
    const skeletonBox = await card.boundingBox();

    await expect(page.getByText('وضعیت امروز')).toBeVisible();
    const finalCard = page.getByText('وضعیت امروز').locator('..').locator('..');
    const finalBox = await finalCard.boundingBox();

    expect(skeletonBox).not.toBeNull();
    expect(finalBox).not.toBeNull();
    // اختلاف ارتفاع کوچک (بدون پرش قابل‌توجه چیدمان)
    expect(Math.abs(skeletonBox!.height - finalBox!.height)).toBeLessThan(12);
  });
});
