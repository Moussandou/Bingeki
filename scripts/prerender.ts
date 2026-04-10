import express, { RequestHandler } from 'express';
import puppeteer, { Browser, Page } from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  console.error('dist directory does not exist. Please build the project first.');
  process.exit(1);
}

const app = express();
app.use(express.static(distPath));
const catchAll: RequestHandler = (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
};
app.use(catchAll);

const PORT = 54321;
const CONCURRENCY = 4; // Number of parallel tabs

// All public routes that should be prerendered for SEO
const ROUTES_TO_PRERENDER = [
  '/', '/fr', '/en',
  '/fr/discover', '/en/discover',
  '/fr/news', '/en/news',
  '/fr/schedule', '/en/schedule',
  '/fr/changelog', '/en/changelog',
  '/fr/challenges', '/en/challenges',
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
      url.includes('googlesyndication') ||
      url.includes('google-analytics') ||
      url.includes('googletagmanager') ||
      url.includes('doubleclick') ||
      url.includes('firebase-messaging') ||
      url.includes('firebaseinstallations')
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });
}

/** Prerender a single route */
async function prerenderRoute(browser: Browser, route: string): Promise<string[]> {
  const page = await browser.newPage();
  const discoveredRoutes: string[] = [];
  
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
    );
    await setupRequestInterception(page);

    // Navigate with domcontentloaded (fast) then wait for React to render
    await page.goto(`http://localhost:${PORT}${route}`, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait for React to render content into #root
    // Poll for meaningful content instead of using networkidle
    const hasContent = await page.waitForFunction(
      () => {
        const root = document.getElementById('root');
        if (!root) return false;
        // Check that root has actual rendered content (not just loading screen)
        const text = root.innerText || '';
        return (
          root.children.length > 2 && 
          text.length > 100 && 
          !text.includes('CHARGEMENT')
        );
      },
      { timeout: 12000 }
    ).then(() => true).catch(() => false);

    if (!hasContent) {
      // Fallback: wait a fixed amount of time
      await new Promise(r => setTimeout(r, 3000));
    }

    // Inject prerender markers
    const langCode = route.startsWith('/en') ? 'en' : 'fr';
    await page.evaluate((lang: string) => {
      document.body.classList.add('is-prerendered');
      document.documentElement.setAttribute('data-lang', lang);
      // Remove loading screens
      document.querySelectorAll('[class*="loading"], [class*="spinner"]')
        .forEach(el => el.remove());
    }, langCode);

    const html = await page.content();

    // Verify content quality
    if (html.length < 5000 || html.includes('CHARGEMENT')) {
      console.warn(`  ⚠ ${route} — empty or loading page (${html.length}b). Skipped.`);
      return discoveredRoutes;
    }

    // Save to dist
    let outPath = route === '/' ? '/index.html' : `${route}/index.html`;
    const fullPath = path.join(distPath, outPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, html);
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
  } catch (err) {
    console.warn(`  ❌ ${route} — ${(err as Error).message?.split('\n')[0]}`);
  } finally {
    await page.close();
  }
  
  return discoveredRoutes;
}

/** Process routes in parallel batches */
async function processInBatches(browser: Browser, routes: string[]) {
  const visited = new Set<string>();
  const queue = [...routes];
  let completed = 0;
  const total = queue.length;
  const startTime = Date.now();

  while (queue.length > 0) {
    // Take a batch of CONCURRENCY routes
    const batch = queue.splice(0, CONCURRENCY).filter(r => {
      if (visited.has(r)) return false;
      visited.add(r);
      return true;
    });

    if (batch.length === 0) continue;

    // Process batch in parallel
    const results = await Promise.all(
      batch.map(route => prerenderRoute(browser, route))
    );

    completed += batch.length;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  [${completed}/${total}] ${elapsed}s elapsed`);

    // Add discovered routes
    for (const discovered of results) {
      for (const r of discovered) {
        if (!visited.has(r)) {
          queue.push(r);
        }
      }
    }
  }

  return { completed, elapsed: ((Date.now() - startTime) / 1000).toFixed(1) };
}

// Start
app.listen(PORT, async () => {
  console.log(`\n🚀 Prerender server on port ${PORT} (${CONCURRENCY} parallel tabs)\n`);
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
      ],
    });

    const { completed, elapsed } = await processInBatches(browser, ROUTES_TO_PRERENDER);

    await browser.close();
    console.log(`\n✅ Done! ${completed} pages prerendered in ${elapsed}s\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
});
