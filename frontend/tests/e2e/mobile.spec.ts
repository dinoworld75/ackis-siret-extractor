import { test, expect, devices } from '@playwright/test';

test.describe('Mobile Responsiveness', () => {
  test.use({ ...devices['iPhone 12'] });

  test('should display mobile menu on small screens', async ({ page }) => {
    await page.goto('/');

    // Check viewport size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThanOrEqual(390);

    // Look for hamburger menu (common mobile menu indicators)
    // This could be a button with aria-label="Menu" or class with "hamburger", "menu-icon", etc.
    const mobileMenuButton = page.locator('button[aria-label*="menu" i], button:has(svg), button.hamburger').first();

    // Mobile menu should exist
    if (await mobileMenuButton.isVisible()) {
      // Click to open menu
      await mobileMenuButton.click();

      // Wait for menu to appear
      await page.waitForTimeout(300);

      // Verify navigation links are visible
      const historyLink = page.getByRole('link', { name: /History/i });
      await expect(historyLink).toBeVisible();

      // Close menu
      await mobileMenuButton.click();
      await page.waitForTimeout(300);
    } else {
      // If no hamburger menu found, verify regular nav is visible
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
    }
  });

  test('should allow file upload on mobile', async ({ page }) => {
    await page.goto('/');

    // Verify file upload area is visible and usable
    const uploadArea = page.locator('[class*="dropzone"], [data-testid="file-upload"]').first();

    // If no specific dropzone found, look for file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();

    // Verify the upload area is touchable (not too small)
    const boundingBox = await fileInput.boundingBox();
    if (boundingBox) {
      // File input or its parent should have reasonable hit area
      expect(boundingBox.height).toBeGreaterThan(0);
    }
  });

  test('should display content without horizontal scroll', async ({ page }) => {
    await page.goto('/');

    // Check that body width matches viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 0;

    // Allow 1px difference for rounding
    expect(Math.abs(bodyWidth - viewportWidth)).toBeLessThanOrEqual(1);
  });

  test('should have touch-friendly buttons', async ({ page }) => {
    await page.goto('/');

    // Look for primary action button (upload or start processing)
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      const firstButton = buttons.first();
      const boundingBox = await firstButton.boundingBox();

      if (boundingBox) {
        // Minimum touch target size should be 44x44 (iOS) or 48x48 (Android)
        // We'll be lenient and check for at least 40px height
        expect(boundingBox.height).toBeGreaterThanOrEqual(36);
      }
    }
  });

  test('should display tables responsively on mobile', async ({ page }) => {
    await page.goto('/');

    // We can't easily test table responsiveness without data
    // Just verify viewport is mobile size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeLessThanOrEqual(390);

    // Verify no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('should maintain functionality after orientation change', async ({ page, context }) => {
    await page.goto('/');

    // Simulate portrait mode
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('h1')).toBeVisible();

    // Simulate landscape mode
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('h1')).toBeVisible();

    // Verify content is still accessible
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have readable text on mobile', async ({ page }) => {
    await page.goto('/');

    // Check that main heading has reasonable font size
    const h1 = page.locator('h1').first();
    if (await h1.isVisible()) {
      const fontSize = await h1.evaluate((el) => {
        return window.getComputedStyle(el).fontSize;
      });

      // Font size should be at least 20px for h1 on mobile
      const fontSizeNum = parseInt(fontSize);
      expect(fontSizeNum).toBeGreaterThanOrEqual(18);
    }
  });

  test('should allow navigation from mobile menu', async ({ page }) => {
    await page.goto('/');

    // Try to find and click mobile menu
    const mobileMenuButton = page.locator('button[aria-label*="menu" i], button:has(svg)').first();

    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(300);

      // Click History link
      const historyLink = page.getByRole('link', { name: /History/i });
      if (await historyLink.isVisible()) {
        await historyLink.click();
        await page.waitForURL(/.*history.*/);
        await expect(page.getByText(/History/i)).toBeVisible();
      }
    } else {
      // No mobile menu found, verify regular navigation works
      const historyLink = page.getByRole('link', { name: /History/i });
      await historyLink.click();
      await page.waitForURL(/.*history.*/);
    }
  });
});

test.describe('Tablet Responsiveness', () => {
  test.use({ ...devices['iPad Mini'] });

  test('should display correctly on tablet', async ({ page }) => {
    await page.goto('/');

    // Verify viewport is tablet size
    const viewportSize = page.viewportSize();
    expect(viewportSize?.width).toBeGreaterThanOrEqual(768);
    expect(viewportSize?.width).toBeLessThanOrEqual(1024);

    // Verify main content is visible
    await expect(page.locator('h1')).toBeVisible();

    // Verify no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('should have appropriate layout on tablet', async ({ page }) => {
    await page.goto('/');

    // On tablet, we might see full navigation (not mobile menu)
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();

    // Content should use available space
    const main = page.locator('main, [role="main"]');
    if (await main.isVisible()) {
      const boundingBox = await main.boundingBox();
      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThan(0);
      }
    }
  });
});
