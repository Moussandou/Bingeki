import { test, expect } from './fixtures';

test('privacy choices default off, persist, and can be withdrawn', async ({ page }) => {
    const optionalRequests: string[] = [];
    page.on('request', request => {
        if (/googlesyndication|google-analytics|googletagmanager/.test(request.url())) optionalRequests.push(request.url());
    });
    await page.goto('/en/privacy');
    await expect(page.getByRole('heading', { name: 'PRIVACY POLICY', exact: true })).toBeVisible({ timeout: 15000 });
    const preferences = page.getByRole('complementary', { name: 'Privacy preferences' });
    await expect(preferences.getByRole('button', { name: 'Accept', exact: true })).toBeVisible();
    expect(optionalRequests).toEqual([]);
    await preferences.getByRole('button', { name: 'Refuse / withdraw' }).click();
    await page.reload();
    await expect(preferences.getByRole('button', { name: 'Privacy preferences', exact: true })).toBeVisible();
    await preferences.getByRole('button', { name: 'Privacy preferences', exact: true }).click();
    await preferences.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('bingeki:optional-consent:v1'))).toBe('accepted');
    await preferences.getByRole('button', { name: 'Privacy preferences', exact: true }).click();
    await preferences.getByRole('button', { name: 'Refuse / withdraw' }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('bingeki:optional-consent:v1'))).toBe('rejected');
    expect(optionalRequests).toEqual([]); // Isolated builds never initialize optional SDKs.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/Privacy/);
});
