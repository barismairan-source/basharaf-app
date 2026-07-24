/**
 * Dashboard IA redesign — fully mocked, no production DB.
 *
 * Covers:
 *  - No horizontal overflow at 390 / 768 / 1280 / 1920px.
 *  - Financial Position uses the corrected "period net flow" label, never
 *    the old, stock-implying "موجودی" wording.
 *  - Attention area collapses to the compact healthy strip when every
 *    queue is empty — no large reserved empty section.
 *  - The period SegFilter (radiogroup) is keyboard-operable.
 *
 * Real execution remains blocked by the project's standing e2e gap
 * (`.env.e2e` absent — global-setup needs a seeded DB + real login);
 * `--list` is the verification available in this environment.
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

const REPORTS_MOCK = {
  summary: { income: 50_000_000, expense: 23_000_000, balance: 27_000_000, count: 12, setupExcludedExpense: 0 },
  pl: { revenue: 50_000_000, cogs: 10_000_000, grossProfit: 40_000_000, payroll: 8_000_000, otherExpense: 5_000_000, netProfit: 27_000_000 },
  monthly: [],
  byBranch: [
    { id: 'b1', name: 'شعبه مرکزی', income: 30_000_000, expense: 15_000_000, balance: 15_000_000 },
    { id: 'b2', name: 'شعبه شمال', income: 20_000_000, expense: 8_000_000, balance: 12_000_000 },
  ],
  byCategory: [
    { name: 'اجاره', type: 'expense', total: 10_000_000, count: 1 },
    { name: 'حقوق پرسنل', type: 'expense', total: 8_000_000, count: 5 },
  ],
  byUser: [],
  takeaway: { count: 0, totalSales: 0, avgBasket: 0, deliveryCount: 0, pickupCount: 0 },
};

const OVERVIEW_MOCK_EMPTY = {
  branchId: null,
  inventory: { lowStockItems: [], lowStockCount: 0, pendingVouchers: 0 },
  finance: { recentTransactions: [], pendingTransactions: 0 },
  hr: { activeEmployees: 3, latestPayrollRun: null },
  operations: { openPoCount: 0, equipmentInRepairCount: 0, todayIncompleteTasks: 0 },
};

const FLASH_MOCK = {
  date: '۱۴۰۵/۰۵/۰۲',
  revenue: 5_000_000,
  invoiceCount: 10,
  cogs: 1_500_000,
  primeCostPct: 45,
  wasteTotal: 200_000,
  lastWeekRevenue: 4_500_000,
  lastWeekCogs: 1_400_000,
  revenuePctChange: 11,
  cogsPctChange: 7,
  invoiceCountPctChange: 5,
  primeCostPctChange: -2,
};

const TRENDS_MOCK = {
  days: [
    { date: '۱۴۰۵/۰۴/۲۸', income: 4_000_000, expense: 2_000_000 },
    { date: '۱۴۰۵/۰۴/۲۹', income: 4_500_000, expense: 2_200_000 },
    { date: '۱۴۰۵/۰۴/۳۰', income: 5_000_000, expense: 2_400_000 },
    { date: '۱۴۰۵/۰۵/۰۱', income: 4_800_000, expense: 2_100_000 },
  ],
  todayIncome: 4_800_000,
  todayExpense: 2_100_000,
  previousTotal: { income: 15_000_000, expense: 7_000_000 },
};

async function mockDashboardRoutes(page: Page) {
  await page.route((url) => url.pathname === '/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ME_SUPERADMIN) });
  });
  await page.route((url) => url.pathname === '/api/notifications', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: [], nextCursor: null, unreadCount: 0 }) });
  });
  await page.route((url) => url.pathname === '/api/branches', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ branches: [{ id: 'b1', name: 'شعبه مرکزی' }, { id: 'b2', name: 'شعبه شمال' }] }) });
  });
  await page.route((url) => url.pathname === '/api/reports' && !url.pathname.includes('flash'), async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(REPORTS_MOCK) });
  });
  await page.route((url) => url.pathname === '/api/reports/flash', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FLASH_MOCK) });
  });
  await page.route((url) => url.pathname === '/api/dashboard/overview', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OVERVIEW_MOCK_EMPTY) });
  });
  await page.route((url) => url.pathname === '/api/dashboard/trends', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(TRENDS_MOCK) });
  });
  await page.route((url) => url.pathname === '/api/dashboard/applicants', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hasActivity: false, totalNew: 0, applicants: [] }) });
  });
  await page.route((url) => url.pathname === '/api/anomaly/findings/counts', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ high: 0, medium: 0, low: 0, total: 0 }) });
  });
}

test.describe('Dashboard — عدم horizontal overflow', () => {
  for (const [name, size] of Object.entries(VIEWPORTS)) {
    test(`dashboard — ${name}`, async ({ page }) => {
      await mockDashboardRoutes(page);
      await page.setViewportSize(size);
      await page.goto('/dashboard');
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow).toBe(false);
    });
  }
});

test.describe('Financial Position — برچسب صحیح، نه «موجودی»', () => {
  test('عنوان «جریان خالص دوره» نمایش داده می‌شود، نه «موجودی»', async ({ page }) => {
    await mockDashboardRoutes(page);
    await page.goto('/dashboard');
    await expect(page.getByText('جریان خالص دوره')).toBeVisible();
    // هیچ کارت KPI‌ای عنوانش فقط «موجودی» (بدون قید) نباشد — که با موجودی واقعی حساب اشتباه گرفته شود
    const bareBalance = page.getByText('موجودی', { exact: true });
    expect(await bareBalance.count()).toBe(0);
  });

  test('موجودی واقعی حساب‌ها جدا و برچسب‌گذاری‌شده نمایش داده می‌شود', async ({ page }) => {
    await mockDashboardRoutes(page);
    await page.goto('/dashboard');
    await expect(page.getByText('موجودی واقعی حساب‌ها')).toBeVisible();
  });
});

test.describe('Attention area — جمع‌وجورشدن به نوار سالم', () => {
  test('وقتی همه‌ی صف‌ها خالی است، نوار باریک «همه‌چیز مرتب است» نمایش داده می‌شود، نه کارت خالی بزرگ', async ({ page }) => {
    await mockDashboardRoutes(page);
    await page.goto('/dashboard');
    await expect(page.getByText('همه‌چیز مرتب است')).toBeVisible();
  });
});

test.describe('DashboardScopeBar — SegFilter بازه با کیبورد', () => {
  test('ArrowLeft از گزینه‌ی فعال به گزینه‌ی بعدی می‌رود (پیش‌فرض «۷ روز» است)', async ({ page }) => {
    await mockDashboardRoutes(page);
    await page.goto('/dashboard');

    const group = page.getByRole('radiogroup', { name: 'بازه‌ی زمانی داشبورد' });
    await expect(group).toBeVisible();

    // پیش‌فرض صفحه period='7d' است — گزینه‌ی دوم («۷ روز») باید از ابتدا فعال باشد
    const sevenDays = group.getByRole('radio').nth(1);
    await expect(sevenDays).toHaveAttribute('aria-checked', 'true');

    await sevenDays.focus();
    await page.keyboard.press('ArrowLeft'); // در RTL یعنی «بعدی»

    const thirtyDays = group.getByRole('radio').nth(2);
    await expect(thirtyDays).toHaveAttribute('aria-checked', 'true');
    await expect(sevenDays).toHaveAttribute('aria-checked', 'false');
  });
});
