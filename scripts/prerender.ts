import express, { Request, Response, RequestHandler } from 'express';
import puppeteer from 'puppeteer';
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
// Serve static files from dist
app.use(express.static(distPath));

// For all other routes, serve index.html
const catchAll: RequestHandler = (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
};
app.use(catchAll);

const PORT = 54321;
app.listen(PORT, async () => {
  console.log(`Temp server listening on port ${PORT} for prerendering...`);
  try {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set a modern viewport
    await page.setViewport({ width: 1280, height: 800 });

    const routes = [
      '/',
      '/fr',
      '/en',
      '/news',
      '/fr/news',
      '/en/news',
      '/discover',
      '/fr/discover',
      '/en/discover',
      '/changelog',
      '/fr/changelog',
      '/en/changelog',
      '/agenda',
      '/fr/agenda',
      '/en/agenda'
    ];
    
    const routesToVisit = [...routes];
    const visited = new Set<string>();

    while (routesToVisit.length > 0) {
      const route = routesToVisit.shift()!;
      if (visited.has(route)) continue;
      visited.add(route);

      console.log(`Prerendering ${route}...`);
      
      try {
        await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Inject a class to body so the client knows it was prerendered
        await page.evaluate(() => {
          document.body.classList.add('is-prerendered');
        });

        const html = await page.content();
        
        // Save the HTML to dist
        // e.g. /fr/news -> dist/fr/news/index.html
        let outPath = route;
        if (outPath === '/') outPath = '/index.html';
        else if (!outPath.endsWith('.html')) outPath = `${route}/index.html`;
        
        const fullPath = path.join(distPath, outPath);
        
        // Create directories if they don't exist
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, html);
        console.log(`Saved ${fullPath}`);
  
        // If we are on a news list page, try to discover individual article links
        if (route.endsWith('/news') || route === '/news') {
           const links = await page.evaluate(() => {
               const anchors = Array.from(document.querySelectorAll('a'));
               return anchors
                .map((a: HTMLAnchorElement) => a.getAttribute('href'))
                .filter((href: string | null) => href && (href.includes('/news/article') || href.includes('/n/')));
           });
           
           let addedCount = 0;
           for (const link of links) {
               if (addedCount >= 3) break; // Limit to 3 articles to keep build fast
               if (link && !visited.has(link) && !routesToVisit.includes(link) && link.startsWith('/')) {
                   console.log(`Discovered new route: ${link}`);
                   routesToVisit.push(link);
                   addedCount++;
               }
           }
        }
      } catch (err) {
        console.warn(`Failed to prerender ${route}:`, err);
      }
    }

    await browser.close();
    console.log('Prerendering completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Prerendering failed with fatal error:', error);
    process.exit(1);
  }
});
