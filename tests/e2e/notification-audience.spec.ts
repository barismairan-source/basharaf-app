/**
 * Notification audience control — Super Admin UI, fully mocked, no DB mutations.
 *
 * Safety: all /api/admin/notification-audience* routes are intercepted before
 * the request reaches the server. Mirrors the mocking convention in
 * tests/e2e/reports.spec.ts.
 */
import { test, expect } from '@playwright/test';

const RULES_MOCK = {
  rules: [
    {
      key: 'high_value_tx',
      enabled: true,
      smsEnabled: true,
      inAppEnabled: true,
      emailEnabled: false,
      threshold: 5_000_000,
      updatedAt: '2026-07-18T10:00:00.000Z',
      catalog: {
        title: 'تراکنش با مبلغ بالا',
        description: 'اعلان وقتی تراکنشی با مبلغ بالاتر از آستانه تأیید می‌شود.',
        category: 'مالی و تراکنش‌ها',
        trigger: 'تأیید تراکنشی با مبلغ ≥ آستانه‌ی تعیین‌شده.',
        thresholdType: 'amount',
        thresholdUnit: 'تومان',
        branchAware: true,
        sensitivity: 'high',
        audienceConfigurable: true,
        hiddenFromUi: false,
      },
      audience: {
        in_app: { recipientCount: 2, custom: false },
        sms: { recipientCount: 2, custom: false },
        email: { recipientCount: 0, custom: false },
      },
      targets: [],
    },
    {
      key: 'pending_approval',
      enabled: true,
      smsEnabled: false,
      inAppEnabled: true,
      emailEnabled: false,
      threshold: null,
      updatedAt: '2026-07-18T10:00:00.000Z',
      catalog: {
        title: 'تأیید تراکنش (شخصی)',
        description: 'وقتی تراکنش یک کاربر تأیید می‌شود، فقط همان کاربر مطلع می‌شود.',
        category: 'مالی و تراکنش‌ها',
        trigger: 'تأیید یک تراکنش توسط ادمین.',
        thresholdType: null,
        thresholdUnit: null,
        branchAware: true,
        sensitivity: 'low',
        audienceConfigurable: false,
        hiddenFromUi: false,
      },
      audience: {
        in_app: { recipientCount: 0, custom: false },
        sms: { recipientCount: 0, custom: false },
        email: { recipientCount: 0, custom: false },
      },
      targets: [],
    },
  ],
  categories: ['مالی و تراکنش‌ها'],
};

const OPTIONS_MOCK = {
  users: [
    { id: 'u1', name: 'علی رضایی', role: 'SuperAdmin', isActive: true, branchId: null, branchName: null, emailReady: true, smsReady: true, maskedEmail: 'al**@ex***.com', maskedPhone: '0912***4567' },
    { id: 'u2', name: 'مریم احمدی', role: 'BranchUser', isActive: true, branchId: 'b1', branchName: 'شعبه مرکزی', emailReady: false, smsReady: true, maskedEmail: null, maskedPhone: '0935***1234' },
  ],
  roles: [
    { value: 'SuperAdmin', label: 'مدیر کل' },
    { value: 'BranchUser', label: 'کاربر شعبه' },
  ],
  branches: [{ id: 'b1', name: 'شعبه مرکزی' }],
};

const PREVIEW_MOCK = {
  ruleKey: 'high_value_tx',
  recipients: {
    in_app: [
      { userId: 'u1', name: 'علی رضایی', role: 'SuperAdmin', branchName: null, isActive: true, eligible: true, reason: null, emailReady: true, smsReady: true, maskedEmail: 'al**@ex***.com', maskedPhone: '0912***4567' },
      { userId: 'u2', name: 'مریم احمدی', role: 'BranchUser', branchName: 'شعبه مرکزی', isActive: true, eligible: false, reason: 'missing_access', emailReady: false, smsReady: true, maskedEmail: null, maskedPhone: '0935***1234' },
    ],
    sms: [
      { userId: 'u1', name: 'علی رضایی', role: 'SuperAdmin', branchName: null, isActive: true, eligible: true, reason: null, emailReady: true, smsReady: true, maskedEmail: 'al**@ex***.com', maskedPhone: '0912***4567' },
    ],
    email: [],
  },
};

test.describe('Super Admin — مدیریت گیرندگان اعلان', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(
      (url) => url.pathname === '/api/admin/notification-audience' && url.search === '',
      async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(RULES_MOCK) });
          return;
        }
        const body = route.request().postDataJSON() as { action: string };
        if (body.action === 'preview') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PREVIEW_MOCK) });
          return;
        }
        if (body.action === 'replace') {
          await route.fulfill({
            status: 200, contentType: 'application/json',
            body: JSON.stringify({ rule: { key: 'high_value_tx', updatedAt: '2026-07-18T10:05:00.000Z' } }),
          });
          return;
        }
        await route.continue();
      }
    );
    await page.route(
      (url) => url.pathname === '/api/admin/notification-audience/options',
      async (route) => {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(OPTIONS_MOCK) });
      }
    );

    await page.goto('/admin/settings/notifications');
    await expect(page.getByText('مرکز اعلان V2')).toBeVisible();
  });

  test('قوانین بر اساس دسته‌بندی گروه‌بندی می‌شوند و قانون شخصی دکمه‌ی گیرندگان ندارد', async ({ page }) => {
    await expect(page.getByText('مالی و تراکنش‌ها')).toBeVisible();
    await expect(page.getByText('تراکنش با مبلغ بالا')).toBeVisible();
    await expect(page.getByText('تأیید تراکنش (شخصی)')).toBeVisible();
    await expect(page.getByText('اعلان شخصی — قابل تنظیم گیرنده نیست')).toBeVisible();
    // only one رule (high_value_tx) is audience-configurable → exactly one recipients button
    await expect(page.getByRole('button', { name: 'گیرندگان' })).toHaveCount(1);
  });

  test('باز کردن drawer گیرندگان و دیدن پیش‌نمایش', async ({ page }) => {
    await page.getByRole('button', { name: 'گیرندگان' }).first().click();
    await expect(page.getByRole('dialog', { name: /گیرندگان/ })).toBeVisible();
    await expect(page.getByText('علی رضایی')).toBeVisible();
    await expect(page.getByText('ارسال می‌شود')).toBeVisible();
    await expect(page.getByText('بدون دسترسی بخش لازم')).toBeVisible();
  });

  test('دکمه‌ی ذخیره تا وقتی تغییری نیست غیرفعال است، بعد از تغییر فعال می‌شود', async ({ page }) => {
    await page.getByRole('button', { name: 'گیرندگان' }).first().click();
    const saveBtn = page.getByRole('button', { name: 'ذخیره' });
    await expect(saveBtn).toBeDisabled();

    await page.getByRole('button', { name: 'سفارشی' }).click();
    await expect(saveBtn).toBeEnabled();
  });

  test('بستن drawer با تغییرات ذخیره‌نشده یک confirm نشان می‌دهد', async ({ page }) => {
    await page.getByRole('button', { name: 'گیرندگان' }).first().click();
    await page.getByRole('button', { name: 'سفارشی' }).click();

    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: 'انصراف' }).click();
    await expect(page.getByRole('dialog', { name: /گیرندگان/ })).not.toBeVisible();
  });

  test('ذخیره موفق پیام موفقیت نشان می‌دهد', async ({ page }) => {
    await page.getByRole('button', { name: 'گیرندگان' }).first().click();
    await page.getByRole('button', { name: 'سفارشی' }).click();
    await page.getByRole('button', { name: 'ذخیره' }).click();
    await expect(page.getByText('ذخیره شد')).toBeVisible();
  });

  test('پاسخ ۴۰۹ پیام تعارض نشان می‌دهد', async ({ page }) => {
    await page.route(
      (url) => url.pathname === '/api/admin/notification-audience',
      async (route) => {
        if (route.request().method() !== 'POST') { await route.continue(); return; }
        const body = route.request().postDataJSON() as { action: string };
        if (body.action === 'replace') {
          await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'stale', code: 'STALE_UPDATE' }) });
          return;
        }
        if (body.action === 'preview') {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(PREVIEW_MOCK) });
          return;
        }
        await route.continue();
      },
      { times: 1 }
    );

    await page.getByRole('button', { name: 'گیرندگان' }).first().click();
    await page.getByRole('button', { name: 'سفارشی' }).click();
    await page.getByRole('button', { name: 'ذخیره' }).click();
    await expect(page.getByText(/جلسه‌ی دیگری تغییر کرده/)).toBeVisible();
  });

  test('نمای موبایل — drawer تمام‌عرض و قابل‌استفاده است', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'گیرندگان' }).first().click();
    await expect(page.getByRole('dialog', { name: /گیرندگان/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ذخیره' })).toBeVisible();
  });
});
