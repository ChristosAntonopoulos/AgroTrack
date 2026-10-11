import { test, expect } from '@playwright/test';

/**
 * QA Phase 0 smoke — app boots and public routes render without the React error overlay.
 */
test.describe('QA Phase 0 smoke', () => {
  test('landing page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/Something went wrong|Minified React error/i)).toHaveCount(0);
  });

  test('QA-002 branded unknown route does not show CRA error overlay', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-qa002');
    await expect(page.getByText(/Minified React error/i)).toHaveCount(0);
  });
});
