import { createRequire } from 'node:module';
import { test, expect } from './fixtures';

const require = createRequire(import.meta.url);
test.describe('Community: isolated browser and server flow', () => {
    test.skip(!process.env.FIRESTORE_EMULATOR_HOST, 'Requires the demo Firebase emulators.');
    test('publishes a chapter review, protects spoilers, replies and renders the mobile layout', async ({ page, request }) => {
        test.setTimeout(60000);
        const localRequire = createRequire(require.resolve('../../functions/community.js'));
        const admin = localRequire('firebase-admin');
        if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-bingeki-quality' });
        const db = admin.firestore();
        const api = require('../../functions/community.js');
        const email = `community-${crypto.randomUUID()}@example.test`;
        const password = 'SyntheticPassword123!';
        const signup = await request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
            data: { email, password, returnSecureToken: true },
        });
        expect(signup.ok()).toBeTruthy();
        const { localId: uid } = await signup.json();
        const authorId = `author-${crypto.randomUUID()}`;
        const work = { id: 42, type: 'manga', title: 'Community test manga', image: '/logo.png', status: 'reading', currentChapter: 2, dateAdded: 1, lastUpdated: 1 };
        await db.doc(`users/${uid}`).set({ uid, displayName: 'Community reader', profileVisibility: 'public', createdAt: Date.now() - 10 * 86400000 });
        await db.doc(`users/${uid}/data/library`).set({ works: [work] });
        await db.doc(`users/${authorId}`).set({ displayName: 'Synthetic reviewer', profileVisibility: 'public', createdAt: 1 });
        await db.doc(`users/${authorId}/data/library`).set({ works: [{ ...work, currentChapter: 10 }] });
        const postId = `review-${crypto.randomUUID()}`;
        await api.communityWrite.run({ auth: { uid: authorId }, data: { action: 'publish', id: postId, review: {
            workId: 42, workType: 'manga', unit: 5, text: 'Synthetic spoiler that must stay hidden', rating: 9, spoiler: false, visibility: 'public',
        } } });
        for (const name of ['communityRead', 'communityWrite']) {
            await page.route(`**/${name}`, async route => {
                if (route.request().method() === 'OPTIONS') {
                    await route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST' } });
                    return;
                }
                const result = await api[name].run({ auth: { uid }, data: route.request().postDataJSON().data });
                await route.fulfill({ json: { result }, headers: { 'access-control-allow-origin': '*' } });
            });
        }
        await page.goto('/fr/auth');
        await page.getByRole('button', { name: 'Refuser / Retirer', exact: false }).click();
        await page.locator('input[type="email"]').fill(email);
        await page.locator('input[type="password"]').fill(password);
        await page.locator('button[type="submit"]').click();
        await expect(page).toHaveURL(/dashboard/, { timeout: 15000 });
        await page.goto(`/fr/social?post=${postId}`);
        await expect(page.getByText('Lecture protégée')).toBeVisible();
        await expect(page.getByText('Synthetic spoiler that must stay hidden')).not.toBeVisible();
        await page.getByRole('button', { name: 'Afficher malgré les spoilers' }).click();
        await expect(page.getByText('Synthetic spoiler that must stay hidden')).toBeVisible();
        await page.getByLabel('Ta réponse', { exact: true }).fill('Synthetic browser response');
        await page.getByRole('button', { name: 'Répondre', exact: true }).click();
        await expect(page.locator('article').filter({ hasText: 'Synthetic browser response' })).toBeVisible();
        const notifications = await db.collection(`users/${authorId}/notifications`).get();
        expect(notifications.size).toBe(1);
        expect(JSON.stringify(notifications.docs[0].data())).not.toContain('Synthetic browser response');
        await page.getByRole('button', { name: 'Retour au fil', exact: false }).click();
        await page.getByRole('button', { name: 'Donner mon avis', exact: true }).first().click();
        await page.getByLabel('Ton avis', { exact: true }).fill('Synthetic browser review');
        await page.getByLabel('Chapitre (facultatif)', { exact: true }).fill('2');
        await page.getByRole('button', { name: 'Publier mon avis', exact: true }).click();
        await expect(page.getByText('Synthetic browser review')).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
        await expect(page.getByRole('navigation', { name: 'Navigation communautaire' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.screenshot({ path: 'test-results/community-mobile.png', animations: 'disabled' });
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
        await expect(page.getByRole('heading', { level: 1 })).toBeInViewport();
        await page.screenshot({ path: 'test-results/community-desktop.png', animations: 'disabled' });
    });
});
