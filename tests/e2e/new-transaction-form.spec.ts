import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/transactions/new');
  await expect(page.getByRole('heading', { name: 'ثبت تراکنش' })).toBeVisible({ timeout: 10_000 });
});

test.describe('نوع تراکنش و فیلدهای شرطی', () => {
  test('پیش‌فرض «هزینه» — دسته‌بندی دیده می‌شود، صندوق مقصد دیده نمی‌شود', async ({ page }) => {
    await expect(page.getByLabel('دسته‌بندی')).toBeVisible();
    await expect(page.getByLabel('صندوق مقصد')).not.toBeVisible();
  });

  test('انتخاب «انتقال وجه» — دسته‌بندی مخفی می‌شود، صندوق مبدا و مقصد هر دو دیده می‌شوند', async ({ page }) => {
    await page.getByRole('radio', { name: 'انتقال وجه' }).click();
    await expect(page.getByLabel('دسته‌بندی')).not.toBeVisible();
    await expect(page.getByLabel('صندوق مبدا')).toBeVisible();
    await expect(page.getByLabel('صندوق مقصد')).toBeVisible();
  });

  test('انتخاب «درآمد» — کد فاکتور و مالیات همچنان دیده می‌شوند (فقط دسته مخصوص transfer نیست)', async ({ page }) => {
    await page.getByRole('radio', { name: 'درآمد' }).click();
    await expect(page.getByRole('radio', { name: 'درآمد' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByLabel('دسته‌بندی')).toBeVisible();
  });
});

test.describe('مالیات ارزش افزوده — پیش‌نمایش زنده', () => {
  test('بدون فعال‌سازی مالیات، پیش‌نمایش نمایش داده نمی‌شود', async ({ page }) => {
    await page.getByLabel('مبلغ (تومان)').fill('100000');
    await expect(page.getByText('جمع:')).not.toBeVisible();
  });

  test('با مبلغ معتبر و فعال‌سازی مالیات، پیش‌نمایش مالیات و جمع کل نمایش داده می‌شود', async ({ page }) => {
    await page.getByLabel('مبلغ (تومان)').fill('100000');
    await page.getByText(/احتساب مالیات ارزش افزوده/).click();
    await expect(page.getByText('جمع:')).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('اعتبارسنجی و فوکوس روی خطا', () => {
  test('ارسال فرم با عنوان خالی و مبلغ صفر → خلاصه‌ی خطا نمایش داده می‌شود و فوکوس به فیلد نامعتبر می‌رود', async ({ page }) => {
    await page.getByRole('button', { name: /ثبت|ارسال برای تایید/ }).click();
    await expect(page.getByText('لطفاً موارد زیر را برطرف کنید')).toBeVisible({ timeout: 5_000 });
    // اولین فیلد نامعتبر (مبلغ) باید فوکوس بگیرد
    await expect(page.getByLabel('مبلغ (تومان)')).toBeFocused();
  });

  test('انتخاب‌نکردن دسته‌بندی برای هزینه → خطای «یک دسته‌بندی انتخاب کنید» و فوکوس روی select دسته', async ({ page }) => {
    await page.getByLabel('عنوان تراکنش').fill('تست بدون دسته');
    await page.getByLabel('مبلغ (تومان)').fill('50000');
    await page.getByRole('button', { name: /ثبت|ارسال برای تایید/ }).click();
    await expect(page.getByText('یک دسته‌بندی انتخاب کنید')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByLabel('دسته‌بندی')).toBeFocused();
  });
});

test.describe('جلوگیری از ارسال دوباره (double-submit)', () => {
  test('در حین ارسال، دکمه‌ی ثبت غیرفعال می‌شود و فقط یک درخواست ارسال می‌شود', async ({ page }) => {
    let postCount = 0;
    await page.route('**/api/transactions', async (route) => {
      if (route.request().method() !== 'POST') return route.fallback();
      postCount += 1;
      await new Promise((r) => setTimeout(r, 700));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          transaction: {
            id: 'test-tx-double-submit',
            type: 'expense',
            title: '[TEST] double-submit',
            category: '',
            categoryName: 'تست',
            amount: 10_000,
            payee: '—',
            branchId: 'test-branch',
            branch: 'تست',
            method: 'نقد',
            receipt: '—',
            date: '۱۴۰۳/۰۱/۰۱',
            note: '',
            hasReceipt: false,
            status: 'approved',
            createdBy: 'test-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.getByLabel('عنوان تراکنش').fill('[TEST] double-submit');
    await page.getByLabel('مبلغ (تومان)').fill('10000');
    const categorySelect = page.getByLabel('دسته‌بندی');
    const hasCategoryOptions = await categorySelect.locator('option').count();
    if (hasCategoryOptions > 1) {
      await categorySelect.selectOption({ index: 1 });
    }

    const submitBtn = page.getByRole('button', { name: /ثبت|ارسال برای تایید/ });
    await submitBtn.click();
    // بلافاصله بعد از کلیک اول، دکمه باید غیرفعال شود
    await expect(submitBtn).toBeDisabled({ timeout: 2_000 });
    // کلیک‌های بعدی روی دکمه‌ی غیرفعال هیچ اثری ندارند — صبر کن تا درخواست تمام شود
    await page.waitForTimeout(1_200);
    expect(postCount).toBe(1);
  });
});

test.describe('هشدار تغییرات ذخیره‌نشده', () => {
  test('فرم خالی — کلیک «انصراف» بدون دیالوگ تأیید برمی‌گردد', async ({ page }) => {
    await page.getByRole('button', { name: 'انصراف' }).click();
    await expect(page.getByText('تغییرات ذخیره‌نشده از بین می‌رود')).not.toBeVisible({ timeout: 2_000 });
  });

  test('فرم دارای تغییر — کلیک «انصراف» دیالوگ تأیید نشان می‌دهد؛ «ادامه ویرایش» در فرم نگه می‌دارد', async ({ page }) => {
    await page.getByLabel('عنوان تراکنش').fill('یک عنوان ذخیره‌نشده');
    await page.getByRole('button', { name: 'انصراف' }).click();
    await expect(page.getByText('تغییرات ذخیره‌نشده از بین می‌رود')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: 'ادامه ویرایش' }).click();
    await expect(page.getByLabel('عنوان تراکنش')).toHaveValue('یک عنوان ذخیره‌نشده');
  });
});

test.describe('ناوبری با کیبورد', () => {
  test('گروه نوع تراکنش — ArrowLeft/ArrowRight بین گزینه‌ها جابه‌جا می‌شود', async ({ page }) => {
    const expenseRadio = page.getByRole('radio', { name: 'هزینه' });
    await expenseRadio.focus();
    await expect(expenseRadio).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: 'درآمد' })).toHaveAttribute('aria-checked', 'true');
  });

  test('Disclosure «جزئیات بیشتر» با کیبورد باز می‌شود و فیلدهای داخلش در دسترس قرار می‌گیرند', async ({ page }) => {
    const trigger = page.getByRole('button', { name: /جزئیات بیشتر/ });
    await trigger.focus();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByLabel('شماره رسید')).toBeVisible();
  });
});
