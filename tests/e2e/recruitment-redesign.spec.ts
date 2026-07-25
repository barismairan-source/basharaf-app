import { test, expect } from '@playwright/test';

/**
 * تست‌های بازطراحی «استخدام» — با API عمومی POST /api/recruitment (بدون auth)
 * چند داوطلب seed می‌شود، بعد با session ادمین (از global-setup) روی UI تست می‌شود.
 *
 * اجرای واقعی مثل بقیه‌ی تست‌های e2e این پروژه به `.env.e2e` نیاز دارد —
 * محلی فقط با `--list` قابل تأیید است.
 */

async function createCandidate(request: import('@playwright/test').APIRequestContext, overrides: Record<string, unknown> = {}) {
  const res = await request.post('/api/recruitment', {
    data: {
      firstName: '[TEST]',
      lastName: `داوطلب-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      phone: '09120000001',
      city: 'تهران',
      area: 'hall',
      answers: {},
      ...overrides,
    },
  });
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as { ok: boolean; id: string };
}

let candidateA: { id: string; name: string; phone: string };
let candidateB: { id: string; name: string; phone: string };

test.beforeAll(async ({ request }) => {
  const suffix = Date.now();
  const lastNameA = `الف-${suffix}`;
  const lastNameB = `ب-${suffix}`;
  const phoneA = '09121110001';
  const phoneB = '09121110002';
  const a = await createCandidate(request, { firstName: '[TEST]', lastName: lastNameA, phone: phoneA });
  const b = await createCandidate(request, { firstName: '[TEST]', lastName: lastNameB, phone: phoneB });
  candidateA = { id: a.id, name: `[TEST] ${lastNameA}`, phone: phoneA };
  candidateB = { id: b.id, name: `[TEST] ${lastNameB}`, phone: phoneB };
});

test.describe('تب‌های خط‌لوله وضعیت', () => {
  test('تب‌ها با role=tablist/tab و aria-selected رندر می‌شوند', async ({ page }) => {
    await page.goto('/recruitment');
    const tablist = page.getByRole('tablist', { name: 'فیلتر وضعیت داوطلبان' });
    await expect(tablist).toBeVisible({ timeout: 10_000 });
    const allTab = page.getByRole('tab', { name: /همه/ });
    await expect(allTab).toHaveAttribute('aria-selected', 'true');
  });

  test('کلیک روی تب «جدید» فقط داوطلبان جدید را نشان می‌دهد و URL تغییر می‌کند', async ({ page }) => {
    await page.goto('/recruitment');
    await page.getByRole('tab', { name: /^جدید/ }).click();
    await expect(page).toHaveURL(/status=new/, { timeout: 5_000 });
    await expect(page.getByRole('tab', { name: /^جدید/ })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('پایداری فیلتر در URL', () => {
  test('باز کردن لینک با status=new مستقیماً همان تب را فعال می‌کند', async ({ page }) => {
    await page.goto('/recruitment?status=new');
    await expect(page.getByRole('tab', { name: /^جدید/ })).toHaveAttribute('aria-selected', 'true', { timeout: 10_000 });
  });

  test('تغییر فیلتر بخش در URL منعکس می‌شود', async ({ page }) => {
    await page.goto('/recruitment');
    await page.getByLabel('فیلتر بخش').selectOption('hall');
    await expect(page).toHaveURL(/area=hall/, { timeout: 5_000 });
  });
});

test.describe('حالت مقایسه', () => {
  test('انتخاب دو داوطلب و باز کردن مودال مقایسه هر دو نام را نشان می‌دهد', async ({ page }) => {
    await page.goto('/recruitment');
    await expect(page.getByText(candidateA.name).first()).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'مقایسه', exact: true }).click();
    await page.getByText(candidateA.name).first().click();
    await page.getByText(candidateB.name).first().click();

    await expect(page.getByText('۲ داوطلب انتخاب شده')).toBeVisible();
    const compareBtn = page.getByRole('button', { name: 'مقایسه', exact: true }).last();
    await expect(compareBtn).toBeEnabled();
    await compareBtn.click();

    const dialog = page.getByRole('dialog', { name: 'مقایسه داوطلبان' });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await expect(dialog.getByText(candidateA.name)).toBeVisible();
    await expect(dialog.getByText(candidateB.name)).toBeVisible();
  });
});

test.describe('نمایش اطلاعات تماس (PII) برای کاربر مجاز', () => {
  test('شماره تماس در کارت و جزئیات برای مدیر کل دیده می‌شود', async ({ page }) => {
    await page.goto('/recruitment');
    const card = page.locator('div[role="button"]').filter({ hasText: candidateA.name }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card.getByText(candidateA.phone)).toBeVisible();

    await card.click();
    await expect(page.getByText('تماس با داوطلب')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('وضعیت‌های ذخیره‌ی یادداشت', () => {
  test('ذخیره‌ی یادداشت — دکمه به «ذخیره شد» تغییر می‌کند', async ({ page }) => {
    await page.goto('/recruitment');
    const card = page.locator('div[role="button"]').filter({ hasText: candidateA.name }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.click();

    const noteField = page.getByLabel('یادداشت بررسی');
    await expect(noteField).toBeVisible({ timeout: 5_000 });
    await noteField.fill('یادداشت آزمایشی');
    await page.getByRole('button', { name: 'ذخیره', exact: true }).click();
    await expect(page.getByRole('button', { name: 'ذخیره شد' })).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('ناوبری با کیبورد', () => {
  test('فوکوس روی هدر کارت + Enter → جزئیات باز می‌شود', async ({ page }) => {
    await page.goto('/recruitment');
    const card = page.locator('div[role="button"]').filter({ hasText: candidateA.name }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('تماس با داوطلب')).toBeVisible({ timeout: 5_000 });
  });

  test('ناوبری تب‌های وضعیت با ArrowLeft/ArrowRight', async ({ page }) => {
    await page.goto('/recruitment');
    const allTab = page.getByRole('tab', { name: /همه/ });
    await allTab.focus();
    await page.keyboard.press('ArrowLeft');
    const newTab = page.getByRole('tab', { name: /^جدید/ });
    await expect(newTab).toHaveAttribute('aria-selected', 'true');
    await expect(newTab).toBeFocused();
  });
});

test.describe('چیدمان واکنش‌گرا — auto-fit grid', () => {
  test('در دسکتاپ عریض، حداقل دو کارت هم‌ردیف قرار می‌گیرند', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/recruitment');
    const cardA = page.locator('div[role="button"]').filter({ hasText: candidateA.name }).first();
    const cardB = page.locator('div[role="button"]').filter({ hasText: candidateB.name }).first();
    await expect(cardA).toBeVisible({ timeout: 10_000 });
    const boxA = await cardA.boundingBox();
    const boxB = await cardB.boundingBox();
    expect(boxA).not.toBeNull();
    expect(boxB).not.toBeNull();
    // اگر هم‌ردیف باشند، y تقریباً یکسان است ولی x فرق دارد
    if (boxA && boxB) {
      expect(Math.abs(boxA.y - boxB.y)).toBeLessThan(10);
    }
  });

  test('در موبایل، کارت‌ها زیر هم قرار می‌گیرند', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/recruitment');
    const cardA = page.locator('div[role="button"]').filter({ hasText: candidateA.name }).first();
    const cardB = page.locator('div[role="button"]').filter({ hasText: candidateB.name }).first();
    await expect(cardA).toBeVisible({ timeout: 10_000 });
    const boxA = await cardA.boundingBox();
    const boxB = await cardB.boundingBox();
    if (boxA && boxB) {
      expect(boxB.y).toBeGreaterThan(boxA.y + 10);
    }
  });
});

test.describe('احراز هویت', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('بدون session، دسترسی به /recruitment به /login هدایت می‌شود', async ({ page }) => {
    await page.goto('/recruitment');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
