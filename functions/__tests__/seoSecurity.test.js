import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const hosting = require('../../firebase.json').hosting;
function harness(profile) {
    const handlers = {};
    const app = { get: (route, handler) => { handlers[route] = handler; } };
    vm.runInNewContext(readFileSync(require.resolve('../seo.js'), 'utf8'), {
        exports: {}, console, URL, __dirname: path.dirname(require.resolve('../seo.js')),
        require: name => {
            if (name === 'firebase-admin') return {
                firestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => profile }) }) }) }),
            };
            if (name === 'firebase-functions/v2/https') return { onRequest: (_, handler) => handler };
            if (name === 'express') return () => app;
            if (name === 'fs') return {
                existsSync: () => false,
                readFileSync: () => '<html><title>Default</title><meta name="description" content="default"><meta property="og:image" content="default"></html>',
            };
            if (name === '../shared/seo/csp.cjs') return require('../../shared/seo/csp.cjs');
            return name.startsWith('.') ? require(`../${name.replace('./', '')}`) : require(name);
        },
    });
    return async (route, req) => {
        const response = { headers: {}, body: '', statusCode: 200 };
        const res = {
            set: (name, value) => { response.headers[name] = value; return res; },
            status: code => { response.statusCode = code; return res; },
            send: body => { response.body = body; return res; },
        };
        await handlers[route](req, res);
        return response;
    };
}

const og = profile => harness(profile)('/api/og-image/:type?/:id?', {
    params: { type: 'profile', id: 'alice' }, query: { lang: 'en' },
});

describe('SVG and profile SEO security', () => {
    it.each([
        { params: {}, query: { force_svg: 'true' } },
        { params: { type: 'generic' }, query: { force_svg: 'true', title: 'Audit & <validation>' } },
        { params: { type: 'profile', id: 'alice' }, query: {} },
    ])('keeps the Hosting OG policy identical to the SVG response for %j', async req => {
        const response = await harness({ displayName: 'Alice' })('/api/og-image/:type?/:id?', req);
        const policy = hosting.headers.find(rule => rule.source === '/[aA][pP][iI]/[oO][gG]-[iI][mM][aA][gG][eE]{,/**}')
            ?.headers.find(header => header.key === 'Content-Security-Policy')?.value;
        expect(response.headers['Content-Type']).toBe('image/svg+xml');
        expect(policy).toBe(response.headers['Content-Security-Policy']);
    });

    it('keeps hostile profile attributes/text inert and emits valid XML', async () => {
        const value = '"><script>invalidMarkup</script><image onload="invalidHandler';
        const response = await og({
            displayName: value, uid: '<script>', bio: value,
            photoURL: `https://example.test/avatar?name=${value}&size=10`,
            banner: value, themeColor: value, borderColor: value, cardBgColor: value,
            level: value, xp: value, streak: value, xpToNextLevel: value,
        });
        const xml = new DOMParser().parseFromString(response.body, 'image/svg+xml');
        expect(xml.querySelector('parsererror')).toBeNull();
        expect(xml.querySelector('script')).toBeNull();
        expect(xml.querySelector('[onload]')).toBeNull();
        expect(response.body).not.toContain('NaN');
        expect(response.headers['Content-Security-Policy']).toContain("script-src 'none'");
        expect(response.headers['Content-Security-Policy']).toContain('sandbox');
        expect(response.headers['X-Content-Type-Options']).toBe('nosniff');
        expect(response.headers['Cache-Control']).toBe('no-store');
    });

    it.each(['javascript:invalid', 'data:image/svg+xml,invalid', 'http://example.test/image', '//example.test/image'])('rejects unsafe image URL %s', async url => {
        const response = await og({ photoURL: url, banner: url });
        expect(response.body).not.toContain(url);
        expect(response.body).toContain('https://api.dicebear.com');
    });

    it('preserves legitimate HTTPS images, hex colors and escaped display text', async () => {
        const response = await og({
            displayName: 'Alice & Bob', photoURL: 'https://example.test/avatar?a=1&b=2',
            banner: 'https://example.test/banner.png', themeColor: '#abcdef', level: 5, xp: 10,
        });
        expect(response.body).toContain('Alice &amp; Bob');
        expect(response.body).toContain('https://example.test/avatar?a=1&amp;b=2');
        expect(response.body).toContain('https://example.test/banner.png');
        expect(response.body).toContain('#abcdef');
        expect(response.body).toContain('LVL 5');
    });

    it('truncates biographies before escaping so entities remain valid XML', async () => {
        const response = await og({ bio: '&'.repeat(60) });
        const xml = new DOMParser().parseFromString(response.body, 'image/svg+xml');
        expect(xml.querySelector('parsererror')).toBeNull();
    });

    it('escapes dynamic image URLs in HTML meta attributes', async () => {
        const response = await harness({ displayName: 'Alice' })('/*', {
            url: '/profile/alice" data-invalid="true', path: '/profile/alice" data-invalid="true',
        });
        const html = new DOMParser().parseFromString(response.body, 'text/html');
        expect(html.querySelector('[data-invalid]')).toBeNull();
        expect(response.body).toContain('&quot;');
    });

    it.each(['private', 'friends'])('never exposes %s profile data through Admin-SDK SEO routes', async profileVisibility => {
        const profile = { profileVisibility, displayName: 'SecretName', bio: 'SecretBiography' };
        const svg = await og(profile);
        expect(svg.body).not.toMatch(/SecretName|SecretBiography/);
        const html = await harness(profile)('/*', { url: '/profile/alice', path: '/profile/alice' });
        expect(html.body).not.toMatch(/SecretName|SecretBiography/);
        expect(html.headers['Cache-Control']).toBe('no-store');
    });
});
