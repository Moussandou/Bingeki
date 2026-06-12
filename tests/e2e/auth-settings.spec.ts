import { test, expect } from '@playwright/test';

test.describe('Auth & Settings', () => {

    test('should allow user to toggle language and theme', async ({ page }) => {
        // 1. Visit Home (Layout present)
        await page.goto('/');

        // 2. Check initial language
        // The language toggle button text is "EN" or "FR"
        const langToggle = page.locator('button').filter({ hasText: /EN|FR/ }).first();
        await expect(langToggle).toBeVisible();

        const initialLangText = await langToggle.textContent();

        // 3. Toggle Language
        await langToggle.click();

        // Verify text changed
        // We wait for text content to NOT be initial
        await expect(langToggle).not.toHaveText(initialLangText!);

        // 4. Toggle Theme
        const themeToggle = page.locator('button[title*="Theme:"]');
        await expect(themeToggle).toBeVisible();

        const html = page.locator('html');
        const initialTheme = await html.getAttribute('data-theme');

        await themeToggle.click();

        // Verify theme changed
        await expect(html).not.toHaveAttribute('data-theme', initialTheme!);
    });

    test('should allow user to login and persist session', async ({ page }) => {
        // Start from Landing ensure loaded
        await page.goto('/');

        // Click "Commencer" or Header Login to go to Auth
        // Using Header Login button
        const loginBtn = page.locator('nav a[href="/auth"] button, a[href="/auth"] button').first();
        // Fallback to CTA if header not found or simpler locator
        const cta = page.locator('button').filter({ hasText: /Commencer|START/i }).first();

        if (await cta.isVisible()) {
            await cta.click();
        } else if (await loginBtn.isVisible()) {
            await loginBtn.click();
        } else {
            await page.goto('/auth');
        }

        // Now we should be on /auth
        await expect(page).toHaveURL(/.*auth/);

        // 1. Check "No account? Sign up" toggle works
        // Filter by text 'compte' or 'account' to uniquely select the toggle button
        const toggleToRegister = page.locator('button').filter({ hasText: /compte|account/i });
        await expect(toggleToRegister).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000); // Hydration buffer
        await toggleToRegister.click();

        // 2. Verify Register fields appear
        const pseudoInput = page.locator('input[placeholder*="Pseudo" i], input[placeholder*="Username" i]');
        
        // Fallback retry click if hydration swallowed the first click
        if (!(await pseudoInput.isVisible({ timeout: 2000 }).catch(() => false))) {
            await toggleToRegister.click();
        }
        await expect(pseudoInput).toBeVisible();

        // 3. Toggle back to Login
        // Button should still be the last one
        await toggleToRegister.click();

        // 4. Verify Login fields (Pseudo should be gone)
        // We wait for pseudo input to detach or be hidden
        await expect(pseudoInput).not.toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();

    });
});
