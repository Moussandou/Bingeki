import express, { RequestHandler } from 'express';
import puppeteer, { type Browser, type Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertRenderedPage, type RenderedPage } from './prerender-validation';
import { resolveSeoFromPath } from '../src/seo/resolveSeo';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  console.error('dist directory does not exist. Please build the project first.');
  process.exit(1);
}

const app = express();
const shell = fs.readFileSync(path.join(distPath, 'index.html'), 'utf8');
app.use(express.static(distPath, { index: false }));
const catchAll: RequestHandler = (_req, res) => {
  res.type('html').send(shell);
};
app.use(catchAll);

const PORT = Number(process.env.PRERENDER_PORT || 54325);
const CONCURRENCY = 4; // Number of parallel tabs

// All public routes that should be prerendered for SEO
const ROUTES_TO_PRERENDER = [
  '/', '/fr', '/en',
  '/fr/discover', '/en/discover',
  '/fr/news', '/en/news',
  '/fr/schedule', '/en/schedule',
  '/fr/seasons', '/en/seasons',
  '/fr/releases', '/en/releases',
  '/fr/changelog', '/en/changelog',
  '/fr/social', '/en/social',
  '/fr/tierlist', '/en/tierlist',
  '/fr/donors', '/en/donors',
  '/fr/lens', '/en/lens',
  '/fr/feedback', '/en/feedback',
  '/fr/about', '/en/about',
  '/fr/privacy', '/en/privacy',
  '/fr/terms', '/en/terms',
  '/fr/contact', '/en/contact',
  '/fr/credits', '/en/credits',
  '/fr/legal', '/en/legal',
  '/fr/auth', '/en/auth',
  '/fr/library', '/en/library',
  '/fr/form', '/en/form',
];

/** Block unnecessary resources to speed up rendering */
async function setupRequestInterception(page: Page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const type = req.resourceType();
    const url = req.url();
    // Block images, fonts, media, ads, analytics — we only need the DOM text
    if (
      ['image', 'font', 'media'].includes(type) ||
      (process.argv.includes('--offline') && !url.startsWith(`http://127.0.0.1:${PORT}/`)) ||
      url.includes('googlesyndication') ||
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('doubleclick') ||
      url.includes('firebase-messaging') ||
      url.includes('firebaseinstallations') ||
      // Rendering is read-only, including when building with a real project.
      (req.method() !== 'GET' && req.method() !== 'HEAD')
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

/** Prerender a single route */
async function prerenderRoute(browser: Browser, route: string): Promise<{ discoveredRoutes: string[]; html: string }> {
  const page = await browser.newPage();
  const discoveredRoutes: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(String(error)));
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setBypassServiceWorker(true);
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    );
    await setupRequestInterception(page);

    // Navigate with domcontentloaded (fast) then wait for React to render
    const response = await page.goto(`http://127.0.0.1:${PORT}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });
    if (!response?.ok()) throw new Error(`HTTP ${response?.status()}`);

    // Wait for React to render content into #root
    // Poll for meaningful content instead of using networkidle
    const langCode = route.startsWith('/en') ? 'en' : 'fr';
    await page.waitForFunction(
      (lang) => {
        if (document.documentElement.dataset.languageReady !== lang) return false;
        const root = document.getElementById('root');
        if (!root) return false;
        // Check that root has actual rendered content (not just loading screen)
        const main = root.querySelector('main');
        if (!main?.querySelector('h1, h2')) return false;
        const content = main.cloneNode(true) as HTMLElement;
        content.querySelectorAll('footer, nav, [role="status"]').forEach(el => el.remove());
        return (content.textContent || '').trim().length >= 40;
      },
      { timeout: 12000, polling: 100 }, langCode
    );

    // Inject prerender markers
    await page.evaluate((lang: string) => {
      document.body.classList.add('is-prerendered');
      document.documentElement.setAttribute('data-lang', lang);
    }, langCode);

    const snapshot: RenderedPage = await page.evaluate(() => {
      const root = document.getElementById('root');
      const main = root?.querySelector('main')?.cloneNode(true) as HTMLElement | undefined;
      main?.querySelectorAll('footer, nav, [role="status"]').forEach(el => el.remove());
      return {
        text: main?.textContent?.trim() || '',
        heading: !!main?.querySelector('h1, h2'),
        lang: document.documentElement.lang,
        title: document.title,
      };
    });
    const currentPath = new URL(page.url()).pathname;
    const expectedTitle = resolveSeoFromPath(currentPath, langCode).title;
    const oppositePath = currentPath.replace(/^\/(en|fr)(?=\/|$)/, langCode === 'en' ? '/fr' : '/en');
    const wrongTitle = resolveSeoFromPath(oppositePath, langCode === 'en' ? 'fr' : 'en').title;
    assertRenderedPage(snapshot, langCode, expectedTitle === wrongTitle ? undefined : wrongTitle, errors);
    const html = await page.content();
    console.log(`  ✅ ${route} (${(html.length / 1024).toFixed(0)}KB)`);

    // Discover news article links
    if (route.endsWith('/news')) {
      const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a'))
          .map(a => a.getAttribute('href'))
          .filter((href): href is string => 
            !!href && href.startsWith('/') && href.includes('/news/article')
          );
      });
      discoveredRoutes.push(...links.slice(0, 5));
    }
    return { discoveredRoutes, html };
  } catch (err) {
    const state = await page.evaluate(() => ({
      ready: document.documentElement.dataset.languageReady,
      lang: document.documentElement.lang,
      mainTextLength: document.querySelector('main')?.textContent?.trim().length || 0,
      hasHeading: !!document.querySelector('main h1, main h2'),
    }));
    throw new Error(`${route}: ${err instanceof Error ? err.message : String(err)} ${JSON.stringify(state)} ${errors.join('; ')}`, { cause: err });
  } finally {
    await page.close();
  }
  
}

/** Process routes in parallel batches */
async function processInBatches(browser: Browser, routes: string[]) {
  const visited = new Set<string>();
  const queue = [...routes];
  let completed = 0;
  const total = queue.length;
  const startTime = Date.now();
  const rendered = new Map<string, string>();

  while (queue.length > 0) {
    // Take a batch of CONCURRENCY routes
    const batch = queue.splice(0, CONCURRENCY).filter(r => {
      if (visited.has(r)) return false;
      visited.add(r);
      return true;
    });

    if (batch.length === 0) continue;

    // Process batch in parallel
    const settled = await Promise.allSettled(
      batch.map(route => prerenderRoute(browser, route))
    );
    const failures = settled.filter(result => result.status === 'rejected');
    if (failures.length) throw new AggregateError(failures.map(result => result.reason), 'Prerender failed');
    const results = settled.map(result => {
      if (result.status !== 'fulfilled') throw result.reason;
      return result.value;
    });
    results.forEach((result, index) => rendered.set(batch[index], result.html));

    completed += batch.length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  [${completed}/${total}] ${elapsed}s elapsed`);

    // Add discovered routes
    for (const discovered of results) {
      for (const r of discovered.discoveredRoutes) {
        if (!visited.has(r)) {
          queue.push(r);
        }
      }
    }
  }
  for (const route of routes) {
    if (!rendered.has(route)) throw new Error(`Missing required route ${route}`);
  }
  for (const [route, html] of rendered) {
    const fullPath = path.join(distPath, route === '/' ? 'index.html' : `${route.slice(1)}/index.html`);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, html);
    if (fs.readFileSync(fullPath, 'utf8') !== html) throw new Error(`Failed to persist ${route}`);
  }

  return { completed, elapsed: ((Date.now() - startTime) / 1000).toFixed(1) };
}

// Start
const server = app.listen(PORT, '127.0.0.1', async () => {
  console.log(`\n🚀 Prerender server on port ${PORT} (${CONCURRENCY} parallel tabs)\n`);
  
  let browser: Browser | undefined;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const { completed, elapsed } = await processInBatches(browser, ROUTES_TO_PRERENDER);

    console.log(`\n✅ Done! ${completed} pages prerendered in ${elapsed}s\n`);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exitCode = 1;
  } finally {
    await browser?.close();
    server.close();
  }
});
server.on('error', error => {
  console.error('Prerender server failed:', error);
  process.exitCode = 1;
});
