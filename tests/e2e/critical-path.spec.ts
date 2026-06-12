import { test, expect } from '@playwright/test';

test.describe('Critical Path', () => {
    test('should allow a user to signup, search for an anime, and add it to their library', async ({ page }) => {
        const uniqueId = Date.now();
        const email = `e2e_test_${uniqueId}@example.com`;
        const pseudo = `Tester_${uniqueId}`;
        const password = 'Password123!';

        // 1. Visit Landing Page
        await page.goto('/');

        // 2. Click CTA to go to Auth
        // Use the main CTA button. Translation might be "COMMENCER L'AVENTURE" or "START THE ADVENTURE"
        const cta = page.locator('button').filter({ hasText: /Commencer|START/i }).first();
        await cta.click();

        // Wait for page transition to /auth to allow hydration to complete
        await expect(page).toHaveURL(/.*auth/, { timeout: 10000 });

        // 3. Navigate to Register mode
        // Filter by 'compte' or 'account' to uniquely select the toggle button
        const toggleToRegister = page.locator('button').filter({ hasText: /compte|account/i });
        await expect(toggleToRegister).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000); // Hydration buffer
        await toggleToRegister.click();

        // 4. Fill Signup Form
        // Wait for the pseudo field to appear (ensures we are in register mode)
        const pseudoInput = page.locator('input[placeholder*="Pseudo" i], input[placeholder*="Username" i]');
        
        // Fallback retry click if hydration swallowed the first click
        if (!(await pseudoInput.isVisible({ timeout: 2000 }).catch(() => false))) {
            await toggleToRegister.click();
        }
        await expect(pseudoInput).toBeVisible({ timeout: 5000 });

        await pseudoInput.fill(pseudo);
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);

        // 5. Submit Signup
        // The submit button text changes from "Log in" to "Sign up" or "S'inscrire"
        const submitBtn = page.locator('button[type="submit"]').filter({ hasText: /inscrire|Sign up/i });
        await submitBtn.click();

        // 6. Verify Dashboard reached
        await expect(page).toHaveURL(/.*dashboard/, { timeout: 15000 });

        // 7. Open Global Search
        // Using getByTitle as it's more specific than just looking for svg in header buttons
        const searchTrigger = page.getByTitle(/Rechercher|Search/i).first();
        await searchTrigger.click();

        // 8. Search for "Naruto"
        const searchInput = page.locator('input[placeholder*="Rechercher" i], input[placeholder*="Search" i]');
        await expect(searchInput).toBeVisible();
        await searchInput.fill('Naruto');

        // 9. Wait for results and click one
        // Jikan API might take a second, so we use a decent timeout
        const firstResult = page.locator('div').filter({ hasText: /^Naruto$/i }).first();
        await expect(firstResult).toBeVisible({ timeout: 10000 });
        await firstResult.click();

        // 10. Verify WorkDetails page
        await expect(page).toHaveURL(/.*work\/\d+/, { timeout: 15000 });

        // 11. Add to Library
        // FR: "AJOUTER" | EN: "ADD"
        const addButton = page.locator('button').filter({ hasText: /Ajouter|Add/i }).first();
        await expect(addButton).toBeVisible();
        await addButton.click();

        // 12. Verify status changed/Add toast appeared
        // Looking for any indicator that the work was added
        await expect(page.locator('text=/Collecte|Collection|Ajouté|Added/i').first()).toBeVisible({ timeout: 10000 });

        // 13. Logout
        // Click Profile Dropdown
        const profileDropdown = page.locator('button').filter({ has: page.locator('img') }).first();
        await profileDropdown.click();

        // Click Logout
        const logoutBtn = page.locator('button').filter({ hasText: /Déconnexion|Logout/i }).first();
        await expect(logoutBtn).toBeVisible();
        await logoutBtn.click();

        // Verify Home reached (can be language-prefixed like /fr or /en) and 'Start' button visible
        await expect(page).toHaveURL(/\/([a-z]{2})?$/);
        await expect(cta).toBeVisible();
    });
});
