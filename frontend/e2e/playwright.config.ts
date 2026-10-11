import { defineConfig, devices } from '@playwright/test';

/**
 * Phase 0 QA harness. Smoke + P0 flows live under frontend/e2e.
 * Run: npx playwright test --config=e2e/playwright.config.ts
 */
export default defineConfig({
  testDir: './specs',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
