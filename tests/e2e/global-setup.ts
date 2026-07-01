import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { seedTestUser, TEST_USER_EMAIL, TEST_USER_PASSWORD } from './fixtures/seed';

const AUTH_FILE = path.join(__dirname, '.auth/session.json');

export default async function globalSetup() {
  // ۱. seed test user (idempotent)
  await seedTestUser();

  // ۲. لاگین از طریق browser و ذخیره session cookie
  const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${baseURL}/login`);
    await page.fill('input[type="email"]', TEST_USER_EMAIL);
    await page.fill('input[type="password"]', TEST_USER_PASSWORD);
    await page.click('button[type="submit"]');
    // منتظر redirect به dashboard
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    // ذخیره cookies و localStorage برای استفاده در همه تست‌ها
    await context.storageState({ path: AUTH_FILE });
    console.log('[setup] Session saved to', AUTH_FILE);
  } finally {
    await context.close();
    await browser.close();
  }
}
