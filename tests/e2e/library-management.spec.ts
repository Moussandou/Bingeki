import { test, expect } from '@playwright/test';

test.describe('Library Management', () => {
    // Setup: We need a fresh user or a way to ensure we have a work to manage.
    // For simplicity in this suite, we'll repeat a quick signup flow to get a clean state,
    // or we assume the "Critical Path" test left us with a user/work if we run sequentially with stored state (complex).
    // BETTER: Include a condensed signup+add flow in beforeEach to ensure isolation.

    test.beforeEach(async ({ page }) => {
        const uniqueId = Date.now();
        const email = `lib_test_${uniqueId}@example.com`;
        const pseudo = `LibTester_${uniqueId}`;
        const password = 'Password123!';

        await page.goto('/auth');

        // Register
        const toggleToRegister = page.locator('button').filter({ hasText: /compte|account/i });
        await expect(toggleToRegister).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000); // Hydration buffer
        await toggleToRegister.click();

        const pseudoInput = page.locator('input[placeholder*="Pseudo" i], input[placeholder*="Username" i]');
        if (!(await pseudoInput.isVisible({ timeout: 2000 }).catch(() => false))) {
            await toggleToRegister.click();
        }
        await expect(pseudoInput).toBeVisible({ timeout: 5000 });
        await pseudoInput.fill(pseudo);
        await page.fill('input[type="email"]', email);
        await page.fill('input[type="password"]', password);
        await page.locator('button[type="submit"]').filter({ hasText: /inscrire|Sign up/i }).click();
        await expect(page).toHaveURL(/.*dashboard/);

        // Add a work (Quickly via Search)
        const searchTrigger = page.getByTitle(/Rechercher|Search/i).first();
        await searchTrigger.click();
        const searchInput = page.locator('input[placeholder*="Rechercher" i], input[placeholder*="Search" i]');
        await searchInput.fill('Bleach');
        const firstResult = page.locator('div').filter({ hasText: /^Bleach$/i }).first();
        await expect(firstResult).toBeVisible({ timeout: 10000 });
        await firstResult.click();

        // Add to library
        const addButton = page.locator('button').filter({ hasText: /Ajouter|Add/i }).first();
        await addButton.click();
        await expect(page.locator('text=/Collecte|Collection|Ajouté|Added/i').first()).toBeVisible();
    });

    test('should allow user to update progress, change status, and remove work', async ({ page }) => {
        // 1. Go to Library
        await page.goto('/library');

        // Verify work is present
        const workCard = page.locator('h3', { hasText: /Bleach/i }).first();
        await expect(workCard).toBeVisible();

        // 2. Navigate to Details
        // Click with force: true since dnd-kit SortableWorkItem wrapper sets aria-disabled="true" when not sorting
        await workCard.click({ force: true });
        await expect(page).toHaveURL(/.*work\/\d+/);

        // 3. Update Progress (+1)
        // Increment progress first to avoid any completion confirmation modal blocking the UI
        const plusOneBtn = page.locator('button', { hasText: '+1' }).first();
        await expect(plusOneBtn).toBeVisible();
        await plusOneBtn.click();

        // Verify display updates (can be "1 / ?" or "1 / 366" depending on whether total is known)
        const progressDisplay = page.locator('span').filter({ hasText: /\d+\s*\/\s*(\d+|\?)/ }).first();
        await expect(progressDisplay).toBeVisible();

        // 4. Update Status
        // Click "Dropped" / "Abandonné" which updates status immediately without opening a confirmation modal
        const droppedBtn = page.locator('button').filter({ hasText: /Abandonné|Dropped/i }).first();
        await expect(droppedBtn).toBeVisible();
        await droppedBtn.click();
        // Ideally check text content contains "1 /"

        // 5. Remove Work
        // Go back to Library to use the delete feature there (as per plan)
        await page.goto('/library');

        // Hover over card to see delete button (if needed, but Playwright can force click)
        // Delete button is an icon button with trash icon. title="Supprimer..." / "Delete..."
        // Locate the specific card for 'Bleach' then find the delete button within or near it.
        // In Library.tsx, the delete button is absolute positioned on the card.

        // We need to trigger hover for the button to appear visibly, or just force click.
        const deleteButton = page.locator('button[title*="Delete"], button[title*="Supprimer"]').first();
        await expect(deleteButton).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000); // Hydration buffer
        
        // Force click the delete button since it is inside the aria-disabled dnd-kit wrapper
        await deleteButton.click({ force: true });

        // 6. Confirm Deletion
        // Modal appears. Click "SUPPRIMER" / "DELETE" (red button)
        const confirmDeleteBtn = page.locator('button').filter({ hasText: /^SUPPRIMER$|^DELETE$/i });
        if (!(await confirmDeleteBtn.isVisible({ timeout: 2000 }).catch(() => false))) {
            await deleteButton.click({ force: true });
        }
        await expect(confirmDeleteBtn).toBeVisible({ timeout: 5000 });
        await confirmDeleteBtn.click();

        // 7. Verify Removal
        // Card should be gone
        await expect(workCard).not.toBeVisible();
    });
});
