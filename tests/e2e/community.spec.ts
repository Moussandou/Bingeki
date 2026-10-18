import { createRequire } from 'node:module';
import type { Locator } from '@playwright/test';
import { test, expect } from './fixtures';

const require = createRequire(import.meta.url);

async function expectReadablePanels(root: Locator) {
    const failures = await root.evaluate(scope => {
        const rgba = (value: string) => {
            const channels = value.match(/[\d.]+/g)?.map(Number);
            if (!channels || channels.length < 3) throw new Error(`Unsupported browser color: ${value}`);
            return [channels[0], channels[1], channels[2], channels[3] ?? 1];
        };
        const luminance = (color: number[]) => color.slice(0, 3).reduce((sum, channel, index) => {
            const value = channel / 255;
            return sum + (value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][index];
        }, 0);
        return [...scope.querySelectorAll<HTMLElement>('*')].flatMap(element => {
            const directText = [...element.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
            const field = (element instanceof HTMLInputElement && !['checkbox', 'radio', 'range', 'color'].includes(element.type))
                || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement;
            if ((!directText && !field) || !element.getClientRects().length || element.closest('button:disabled, input:disabled, select:disabled, textarea:disabled')) return [];
            const closedDetails = element.closest('details:not([open])');
            if (closedDetails && !closedDetails.querySelector(':scope > summary')?.contains(element)) return [];
            const style = getComputedStyle(element);
            if (style.visibility === 'hidden') return [];
            let ancestor: HTMLElement | null = element;
            let background: number[] | null = null;
            let opacity = 1;
            while (ancestor && ancestor !== scope) {
                const ancestorStyle = getComputedStyle(ancestor);
                opacity *= Number(ancestorStyle.opacity);
                const color = rgba(ancestorStyle.backgroundColor);
                if (!background && color[3] === 1) background = color;
                ancestor = ancestor.parentElement;
            }
            const text = (element.textContent || element.getAttribute('placeholder') || element.tagName).trim().slice(0, 70);
            if (!background) return [`${text}: no opaque reading panel`];
            const placeholder = (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && !element.value && element.placeholder;
            const foreground = rgba(placeholder ? getComputedStyle(element, '::placeholder').color : style.color);
            const alpha = foreground[3] * opacity;
            const blended = foreground.slice(0, 3).map((channel, index) => channel * alpha + background[index] * (1 - alpha));
            const light = luminance(blended);
            const dark = luminance(background);
            const ratio = (Math.max(light, dark) + .05) / (Math.min(light, dark) + .05);
            const size = parseFloat(style.fontSize);
            const large = size >= 24 || (size >= 18.667 && Number(style.fontWeight) >= 700);
            return ratio + .01 < (large ? 3 : 4.5) ? [`${text}: contrast ${ratio.toFixed(2)}:1`] : [];
        });
    });
    expect(failures, 'Community text must meet WCAG AA on opaque panels').toEqual([]);
}

test.describe('Community: isolated browser and server flow', () => {
    test.skip(!process.env.FIRESTORE_EMULATOR_HOST, 'Requires the demo Firebase emulators.');
    test('publishes a chapter review, protects spoilers, replies and renders the mobile layout', async ({ page, request }) => {
        test.setTimeout(180000);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        let legacyLeaderboardRequests = 0;
        await page.route('**/getLeaderboard', async route => {
            legacyLeaderboardRequests++;
            await route.fulfill({ json: { result: { leaderboard: [] } } });
        });
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
        const community = page.getByRole('region', { name: 'Communauté', exact: true });
        await expect(page.locator('main')).toHaveCSS('opacity', '1', { timeout: 15000 });
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
        for (const theme of ['light', 'dark', 'amoled']) {
            await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
            await expectReadablePanels(community);
            await community.getByRole('region', { name: 'Discussion', exact: true }).scrollIntoViewIfNeeded();
            await page.screenshot({ path: `test-results/community-thread-${theme}.png`, animations: 'disabled' });
        }
        await page.getByRole('button', { name: 'Retour au fil', exact: false }).click();
        await page.getByRole('button', { name: 'Donner mon avis', exact: true }).first().click();
        await page.getByLabel('Ton avis', { exact: true }).fill('Synthetic browser review');
        await page.getByLabel('Chapitre (facultatif)', { exact: true }).fill('2');
        for (const theme of ['light', 'dark', 'amoled']) {
            await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
            await page.getByRole('button', { name: 'Publier mon avis', exact: true }).hover();
            await expectReadablePanels(community);
            await page.screenshot({ path: `test-results/community-composer-${theme}.png`, animations: 'disabled' });
        }
        await page.getByRole('button', { name: 'Publier mon avis', exact: true }).click();
        await expect(page.getByText('Synthetic browser review')).toBeVisible();
        await expect(page.getByRole('region', { name: 'Défis & distinctions', exact: true })).toBeVisible();
        for (const theme of ['light', 'dark', 'amoled']) {
            await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
            for (const width of [320, 390, 1280]) {
                await page.setViewportSize({ width, height: 900 });
                await page.getByRole('heading', { level: 1 }).scrollIntoViewIfNeeded();
                const navigation = page.getByRole('navigation', { name: 'Navigation communautaire' });
                await expect(navigation).toBeVisible();
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
                for (const button of await navigation.getByRole('button').all()) {
                    const box = await button.boundingBox();
                    expect(box && box.x >= 0 && box.x + box.width <= width && box.height >= 44).toBeTruthy();
                }
                await expectReadablePanels(community);
                await page.screenshot({ path: `test-results/community-${theme}-${width}.png`, animations: 'disabled' });
                if (width === 390) {
                    await community.locator('article').filter({ hasText: 'Synthetic browser review' }).scrollIntoViewIfNeeded();
                    await page.screenshot({ path: `test-results/community-reading-${theme}-${width}.png`, animations: 'disabled' });
                }
            }
            const review = community.locator('article').filter({ hasText: 'Synthetic browser review' });
            await review.getByLabel('Actions sur cet avis').click();
            await expectReadablePanels(community);
            await review.getByLabel('Actions sur cet avis').click();
            await community.getByRole('button', { name: 'Défis & distinctions', exact: true }).click();
            await expect(community.getByLabel('Catégorie', { exact: true })).toBeVisible();
            expect(legacyLeaderboardRequests, 'Closed legacy panels must not fetch their content').toBe(0);
            await expectReadablePanels(community);
            await community.getByRole('button', { name: 'Préférences & modération', exact: true }).click();
            await expect(community.getByRole('checkbox').first()).toBeVisible();
            await expectReadablePanels(community);
            await community.getByRole('button', { name: 'Le fil', exact: true }).click();
            await expect(page.getByText('Synthetic browser review')).toBeVisible();
        }
    });
});
