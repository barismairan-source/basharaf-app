import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load E2E-specific env when present. override:false keeps any CI variable that is
// already in process.env with priority over .env.e2e values. Silently no-ops when
// .env.e2e is absent — `playwright --list` must work without it.
dotenv.config({ path: path.resolve(process.cwd(), '.env.e2e'), override: false });

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

const config = defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: {
    baseURL: BASE_URL,
    storageState: 'tests/e2e/.auth/session.json',
    locale: 'fa-IR',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

// webServer فقط وقتی BASE_URL سِت نشده (محلی) — در CI با BASE_URL سرور خارجی هست
if (!process.env.BASE_URL) {
  // Forward E2E_DATABASE_URL as DATABASE_URL into the Next.js dev server child
  // process so the app can query the E2E database. Scoped to webServer only —
  // no effect on CI, production, or any application config file.
  const extraEnv: Record<string, string> = {};
  if (process.env.E2E_DATABASE_URL) {
    extraEnv.DATABASE_URL = process.env.E2E_DATABASE_URL;
  }

  (config as any).webServer = {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    ...(Object.keys(extraEnv).length > 0 ? { env: extraEnv } : {}),
  };
}

export default config;
