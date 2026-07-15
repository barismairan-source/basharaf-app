/**
 * P&L drilldown regression — fully mocked, no DB mutations.
 *
 * Safety: BASE_URL defaults to localhost:3000; all /api/reports routes are
 * intercepted before the request reaches the server.
 */
import { test, expect } from '@playwright/test';

// ── Mock payloads ────────────────────────────────────────────────────────────

const REPORT_MOCK = {
  summary: { income: 50_000_000, expense: 23_000_000, balance: 27_000_000, count: 10 },
  monthly: [],
  byBranch: [],
  byCategory: [],
  byUser: [],
  takeaway: { count: 0, totalSales: 0, avgBasket: 0, deliveryCount: 0, pickupCount: 0 },
  pl: {
    revenue: 50_000_000,
    cogs: 10_000_000,
    grossProfit: 40_000_000,
    payroll: 8_000_000,
    otherExpense: 5_000_000,
    netProfit: 27_000_000,
  },
};

const DRILLS: Record<string, { items: Array<{ id: string; date: string; title: string; amount: number; type: string; categoryName: string | null; payee: string }>; total: number }> = {
  revenue: {
    items: [{ id: 'r1', date: '۱۴۰۵/۰۱/۰۱', title: 'فروش سالن اردیبهشت', amount: 5_000_000, type: 'income', categoryName: null, payee: 'صندوق' }],
    total: 3, // total > items.length → "مشاهده همه" must appear
  },
  cogs: {
    items: [{ id: 'c1', date: '۱۴۰۵/۰۱/۰۲', title: 'خرید مواد اولیه', amount: 1_000_000, type: 'expense', categoryName: 'بهای تمام‌شده (COGS)', payee: 'تامین‌کننده' }],
    total: 1,
  },
  payroll: {
    items: [{ id: 'p1', date: '۱۴۰۵/۰۱/۰۳', title: 'حقوق اردیبهشت', amount: 8_000_000, type: 'expense', categoryName: 'حقوق پرسنل', payee: 'کارکنان' }],
    total: 1,
  },
  other: {
    items: [{ id: 'o1', date: '۱۴۰۵/۰۱/۰۴', title: 'هزینه تبلیغات', amount: 500_000, type: 'expense', categoryName: 'بازاریابی', payee: 'آژانس' }],
    total: 1,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function drilldownBody(segment: string): string {
  return JSON.stringify(DRILLS[segment] ?? { items: [], total: 0 });
}

// ── Test suite ───────────────────────────────────────────────────────────────

test.describe('گزارش مالی — P&L drilldown', () => {
  test.beforeEach(async ({ page }) => {
    // ① Register drilldown route FIRST so it takes priority over the general
    //   /api/reports route (Playwright routes are matched FIFO).
    await page.route(/\/api\/reports\/drilldown/, async (route) => {
      const url = new URL(route.request().url());
      const segment = url.searchParams.get('segment') ?? '';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: drilldownBody(segment),
      });
    });

    // ② General reports route — matched only when drilldown route does not.
    await page.route(/\/api\/reports/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(REPORT_MOCK),
      });
    });

    await page.goto('/reports');
    await expect(page.getByText('صورت سود و زیان')).toBeVisible();
  });

  // ── per-segment table ──────────────────────────────────────────────────────
  const SEGMENT_CASES = [
    { segment: 'revenue',  label: 'درآمد فروش',                      itemTitle: 'فروش سالن اردیبهشت' },
    { segment: 'cogs',     label: 'بهای تمام‌شده‌ی فروش (COGS)',      itemTitle: 'خرید مواد اولیه'     },
    { segment: 'payroll',  label: 'حقوق پرسنل',                      itemTitle: 'حقوق اردیبهشت'       },
    { segment: 'other',    label: 'سایر هزینه‌های عملیاتی',           itemTitle: 'هزینه تبلیغات'        },
  ] as const;

  for (const { segment, label, itemTitle } of SEGMENT_CASES) {
    test(`کلیک روی «${label}» — segment=${segment} درخواست می‌شود و آیتم نمایان می‌شود`, async ({ page }) => {
      const row = page.getByRole('button', { name: label });

      // Capture the drilldown request to verify correct segment param.
      const [req] = await Promise.all([
        page.waitForRequest(/\/api\/reports\/drilldown/),
        row.click(),
      ]);

      expect(new URL(req.url()).searchParams.get('segment')).toBe(segment);
      await expect(page.getByText(itemTitle)).toBeVisible();
    });
  }

  // ── toggle: opening another segment closes the previous one ───────────────
  test('باز کردن سگمنت دوم، سگمنت اول را می‌بندد', async ({ page }) => {
    // Open revenue
    await Promise.all([
      page.waitForRequest(/\/api\/reports\/drilldown/),
      page.getByRole('button', { name: 'درآمد فروش' }).click(),
    ]);
    await expect(page.getByText('فروش سالن اردیبهشت')).toBeVisible();

    // Open payroll — revenue should close
    await Promise.all([
      page.waitForRequest(/\/api\/reports\/drilldown/),
      page.getByRole('button', { name: 'حقوق پرسنل' }).click(),
    ]);
    await expect(page.getByText('فروش سالن اردیبهشت')).not.toBeVisible();
    await expect(page.getByText('حقوق اردیبهشت')).toBeVisible();
  });

  // ── toggle: clicking the open segment again closes it ─────────────────────
  test('کلیک دوباره روی سگمنت باز آن را می‌بندد', async ({ page }) => {
    const row = page.getByRole('button', { name: 'حقوق پرسنل' });

    await Promise.all([
      page.waitForRequest(/\/api\/reports\/drilldown/),
      row.click(),
    ]);
    await expect(page.getByText('حقوق اردیبهشت')).toBeVisible();

    // Second click — no new request expected (cache hit), segment closes
    await row.click();
    await expect(page.getByText('حقوق اردیبهشت')).not.toBeVisible();
  });

  // ── "مشاهده همه" appears when total > returned items ─────────────────────
  test('وقتی total > تعداد آیتم‌ها لینک «مشاهده همه» نمایش داده می‌شود', async ({ page }) => {
    // revenue: total=3, items.length=1 → link must appear
    await Promise.all([
      page.waitForRequest(/\/api\/reports\/drilldown/),
      page.getByRole('button', { name: 'درآمد فروش' }).click(),
    ]);

    const viewAllLink = page.getByRole('link', { name: /مشاهده همه/ });
    await expect(viewAllLink).toBeVisible();
    // Link must point to /transactions with type=income filter
    const href = await viewAllLink.getAttribute('href');
    expect(href).toMatch(/\/transactions/);
    expect(href).toMatch(/type=income/);

    // cogs: total=1, items.length=1 → no link
    await Promise.all([
      page.waitForRequest(/\/api\/reports\/drilldown/),
      page.getByRole('button', { name: 'بهای تمام‌شده‌ی فروش (COGS)' }).click(),
    ]);
    await expect(page.getByRole('link', { name: /مشاهده همه/ })).not.toBeVisible();
  });
});
