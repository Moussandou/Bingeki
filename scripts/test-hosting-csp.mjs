import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const config = JSON.parse(await readFile(new URL('../firebase.json', import.meta.url), 'utf8'));
const htmlPolicy = require('../shared/seo/csp.cjs');
const svgPolicy = config.hosting.headers
    .find(rule => rule.source === '/[aA][pP][iI]/[oO][gG]-[iI][mM][aA][gG][eE]{,/**}')
    ?.headers.find(header => header.key === 'Content-Security-Policy')?.value;
assert.ok(svgPolicy, 'Missing Hosting OG image CSP');

if (process.argv[2] === '--verify') {
    const origin = `http://127.0.0.1:${process.argv[3]}`;
    const cases = [
        ['/api/og-image', svgPolicy, 'image/svg+xml'],
        ['/api/og-image/', svgPolicy, 'image/svg+xml'],
        ['/api/og-image/generic?force_svg=true&title=Audit%20%26%20%3Cvalidation%3E', svgPolicy, 'image/svg+xml'],
        ['/api/og-image/profile/alice', svgPolicy, 'image/svg+xml'],
        ['/api/og-image/work/123', svgPolicy, 'image/svg+xml'],
        ['/API/OG-IMAGE', svgPolicy, 'image/svg+xml'],
        ['/API/OG-IMAGE/generic?force_svg=true&title=AuditCase', svgPolicy, 'image/svg+xml'],
        ['/aPi/oG-iMaGe/profile/alice', svgPolicy, 'image/svg+xml'],
        ['/', htmlPolicy, 'text/html'],
        ['/fr/privacy', htmlPolicy, 'text/html'],
        ['/en/privacy', htmlPolicy, 'text/html'],
        ['/api/og-images', htmlPolicy, 'text/html'],
        ['/api/og-image-other', htmlPolicy, 'text/html'],
        ['/api/og-image.html', htmlPolicy, 'text/html'],
        ['/API/OG-IMAGE-other', htmlPolicy, 'text/html'],
    ];
    for (const [route, policy, contentType] of cases) {
        for (const method of ['GET', 'HEAD']) {
            const label = `${method} ${route}`;
            const response = await fetch(`${origin}${route}`, { method });
            assert.equal(response.status, 200, label);
            assert.equal(response.headers.get('content-security-policy'), policy, label);
            assert.ok(response.headers.get('content-type')?.startsWith(contentType), label);
            assert.equal(response.headers.get('x-content-type-options'), 'nosniff', label);
            await response.arrayBuffer();
            console.log(`PASS ${label}: ${contentType}, expected CSP and nosniff`);
        }
    }
} else {
    const directory = await mkdtemp(path.join(tmpdir(), 'bingeki-hosting-csp-'));
    try {
        const server = createServer();
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const { port } = server.address();
        await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        await writeFile(path.join(directory, 'fixture.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><text>Audit &amp; validation</text></svg>');
        await writeFile(path.join(directory, 'index.html'), '<!doctype html><html lang="en"><title>HTML regression</title><body>Ordinary page</body></html>');
        const { site, predeploy, ...hosting } = config.hosting;
        await writeFile(path.join(directory, 'firebase.json'), JSON.stringify({
            hosting: {
                ...hosting,
                public: '.',
                // Only the response body is stubbed; real Hosting header order/matching is preserved.
                rewrites: [
                    { source: '/[aA][pP][iI]/[oO][gG]-[iI][mM][aA][gG][eE]{,/**}', destination: '/fixture.svg' },
                    { source: '**', destination: '/index.html' },
                ],
            },
            emulators: {
                hosting: { host: '127.0.0.1', port },
                hub: { host: '127.0.0.1', port: 0 },
                logging: { host: '127.0.0.1', port: 0 },
                ui: { enabled: false },
                singleProjectMode: false,
            },
        }));
        const quote = value => `'${value.replaceAll("'", "'\\''")}'`;
        const result = spawnSync('firebase', [
            'emulators:exec', '--project', 'demo-bingeki-hosting-csp', '--only', 'hosting',
            '--config', path.join(directory, 'firebase.json'),
            `${quote(process.execPath)} ${quote(fileURLToPath(import.meta.url))} --verify ${port}`,
        ], { cwd: directory, stdio: 'inherit' });
        if (result.error) throw result.error;
        assert.equal(result.status, 0, 'Hosting emulator CSP regression failed');
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
}
