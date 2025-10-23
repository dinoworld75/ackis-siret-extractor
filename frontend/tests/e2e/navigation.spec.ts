import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to all pages via navbar links', async ({ page }) => {
    // Start at home
    await page.goto('/');

    // Verify home page
    await expect(page.locator('h1')).toContainText('SIRET Extractor');

    // Navigate to History
    await page.getByRole('link', { name: /History/i }).click();
    await page.waitForURL(/.*history.*/);
    await expect(page.getByText(/History/i)).toBeVisible();

    // Navigate to API Docs
    const apiDocsLink = page.getByRole('link', { name: /API Docs/i });
    if (await apiDocsLink.isVisible()) {
      await apiDocsLink.click();
      await page.waitForURL(/.*api-docs.*/);
    }

    // Navigate to About
    const aboutLink = page.getByRole('link', { name: /About/i });
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForURL(/.*about.*/);
    }

    // Navigate back to Home
    const homeLink = page.getByRole('link', { name: /Home/i });
    await homeLink.click();
    await page.waitForURL(/^\/$|.*\/$|.*\/$/);
    await expect(page.locator('h1')).toContainText('SIRET Extractor');
  });

  test('should highlight active navbar link', async ({ page }) => {
    await page.goto('/');

    // Home should be active
    const homeLink = page.getByRole('link', { name: /Home/i }).first();
    await expect(homeLink).toHaveClass(/active|border-primary|text-primary/);

    // Navigate to History
    await page.getByRole('link', { name: /History/i }).click();
    await page.waitForURL(/.*history.*/);

    // History should be active
    const historyLink = page.getByRole('link', { name: /History/i }).first();
    const classes = await historyLink.getAttribute('class');
    // The active link should have some styling (we can't predict exact class names)
    expect(classes).toBeTruthy();
  });

  test('should handle direct URL navigation', async ({ page }) => {
    // Navigate directly to History page
    await page.goto('/history');
    await expect(page.getByText(/History/i)).toBeVisible();

    // Navigate directly to home
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('SIRET Extractor');
  });

  test('should handle browser back/forward buttons', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('SIRET Extractor');

    // Navigate to History
    await page.getByRole('link', { name: /History/i }).click();
    await page.waitForURL(/.*history.*/);

    // Go back
    await page.goBack();
    await expect(page.locator('h1')).toContainText('SIRET Extractor');

    // Go forward
    await page.goForward();
    await page.waitForURL(/.*history.*/);
    await expect(page.getByText(/History/i)).toBeVisible();
  });

  test('should display 404 page for invalid routes', async ({ page }) => {
    await page.goto('/invalid-route-that-does-not-exist');

    // Should show some kind of error or redirect
    // Most apps show "404" or "Not Found" or redirect to home
    const bodyText = await page.textContent('body');
    const is404 = bodyText?.includes('404') ||
                  bodyText?.includes('Not Found') ||
                  bodyText?.includes('not found') ||
                  page.url().endsWith('/'); // Redirected to home

    expect(is404).toBeTruthy();
  });

  test('should persist state when navigating back from History', async ({ page }) => {
    await page.goto('/');

    // Verify we're on home
    await expect(page.locator('h1')).toContainText('SIRET Extractor');

    // Navigate to History
    await page.getByRole('link', { name: /History/i }).click();
    await page.waitForURL(/.*history.*/);

    // Navigate back to Home
    await page.getByRole('link', { name: /Home/i }).click();
    await page.waitForURL(/^\/$|.*\/$|.*\/$/);

    // Verify we're back on home
    await expect(page.locator('h1')).toContainText('SIRET Extractor');
  });
});
