import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import express from 'express';
import puppeteer, { type Browser } from 'puppeteer';

const dist = path.resolve('dist');
const documents = fs.readdirSync(dist, { recursive: true })
    .filter((file): file is string => typeof file === 'string' && /(^|\/)index\.html$/.test(file));
assert.ok(documents.length >= 43, 'Missing prerendered routes');
for (const file of documents) {
    const html = fs.readFileSync(path.join(dist, file), 'utf8');
    assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\/(?:127\.0\.0\.1|localhost|\[::1\])/,
        `${file}: leaked build-server asset URL`);
    assert.match(html, /data-prerender-style=/, `${file}: missing route CSS`);
    assert.doesNotMatch(html.match(/<main\b[^>]*>/)?.[0] ?? '', /opacity:\s*0(?:[;"])/,
        `${file}: invisible main`);
}
for (const route of ['fr/privacy', 'en/privacy']) {
    const html = fs.readFileSync(path.join(dist, route, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /<link[^>]+href="[^"]*vendor-(?:firebase|charts)[^"]*"/,
        `${route}: backend/chart modules were promoted into eager preloads`);
}

const app = express();
app.use(express.static(dist));
const server = app.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
assert.ok(address && typeof address !== 'string');
const origin = `http://127.0.0.1:${address.port}`;
let browser: Browser | undefined;
try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    // Use an ordinary Chrome UA: this checks real-user rendering, not bot gates.
    const userAgent = (await browser.userAgent()).replace('HeadlessChrome/', 'Chrome/');
    for (const route of ['/fr/privacy', '/en/privacy', '/fr']) {
        const context = await browser.createBrowserContext();
        try {
            const staticPage = await context.newPage();
            await staticPage.setViewport({ width: 412, height: 823, deviceScaleFactor: 1.75 });
            await staticPage.setUserAgent(userAgent);
            await staticPage.setJavaScriptEnabled(false);
            await staticPage.goto(`${origin}${route}`, { waitUntil: 'load' });
            assert.equal(await staticPage.$eval('main', main => getComputedStyle(main).opacity), '1');
            assert.ok(await staticPage.$eval('main h1', heading => heading.getBoundingClientRect().height > 0));
            await staticPage.close();

            const page = await context.newPage();
            const errors: string[] = [];
            const optionalRequests: string[] = [];
            page.on('pageerror', error => errors.push(String(error)));
            page.on('console', message => {
                if (message.type() === 'error' && /\[ErrorBoundary\]|Application startup failed/.test(message.text())) {
                    errors.push(message.text());
                }
            });
            await page.setViewport({ width: 412, height: 823, deviceScaleFactor: 1.75 });
            await page.setUserAgent(userAgent);
            await page.setBypassServiceWorker(true);
            await page.setRequestInterception(true);
            page.on('request', request => {
                if (/googlesyndication|google-analytics|googletagmanager/.test(request.url())) {
                    optionalRequests.push(request.url());
                }
                // No test credentials or traffic may reach live services.
                if (request.url().startsWith(`${origin}/`) || /^(data|blob):/.test(request.url())) {
                    void request.continue();
                } else {
                    void request.abort();
                }
            });
            await page.evaluateOnNewDocument(() => {
                let hadMain = false;
                new MutationObserver(() => {
                    if (document.querySelector('#root main')) hadMain = true;
                    else if (hadMain) document.documentElement.dataset.blankMain = 'true';
                }).observe(document, { childList: true, subtree: true });
            });
            await page.goto(`${origin}${route}`, { waitUntil: 'load' });
            await page.waitForFunction(() => {
                const button = Array.from(document.querySelectorAll<HTMLButtonElement>('aside button'))
                    .find(button => /Refuse \/ withdraw|Refuser \/ retirer/i.test(button.textContent ?? ''));
                button?.click();
                return localStorage.getItem('bingeki:optional-consent:v1') === 'rejected';
            }, { timeout: 15000 });
            assert.equal(await page.$eval('html', html => html.lang), route.startsWith('/en') ? 'en' : 'fr');
            assert.ok(await page.$eval('main h1', heading => !!heading.textContent?.trim()));
            assert.notEqual(await page.$eval('html', html => html.dataset.blankMain), 'true',
                `${route}: startup erased the visible main`);
            assert.deepEqual(optionalRequests, [], 'Optional SDK requested without consent');
            if (route === '/fr') {
                await page.$eval('[title="Comment ça marche ?"]', element => element.scrollIntoView({ block: 'center' }));
                try {
                    await page.waitForSelector('.recharts-surface', { visible: true, timeout: 10000 });
                } catch (error) {
                    console.error('Chart state:', await page.$eval('[title="Comment ça marche ?"]', element => ({
                        html: element.parentElement?.outerHTML,
                        rect: element.getBoundingClientRect().toJSON(),
                        scrollY: window.scrollY,
                    })), errors);
                    throw error;
                }
            }
            assert.deepEqual(errors, [], `${route}: runtime errors`);
            console.log(`Prerender, ordinary mobile startup, consent${route === '/fr' ? ' and lazy chart' : ''}: ${route}`);
        } finally {
            await context.close();
        }
    }
} finally {
    await browser?.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
