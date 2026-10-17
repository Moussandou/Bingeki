import { describe, expect, it } from 'vitest';
import { assertRenderedPage, type RenderedPage } from './prerender-validation';
import { createRequire } from 'node:module';
import hosting from '../firebase.json';
import { resolveSeoFromPath } from '../src/seo/resolveSeo';

const require = createRequire(import.meta.url);
const page: RenderedPage = {
    text: 'A real page with meaningful content inside its main element.',
    heading: true,
    lang: 'en',
    title: 'Privacy | Bingeki',
};

describe('prerender validation', () => {
    it('accepts meaningful localized application content', () => {
        expect(() => assertRenderedPage(page, 'en', 'Confidentialité | Bingeki', [])).not.toThrow();
    });
    it.each([
        { text: '' },
        { text: 'Loading' },
        { heading: false },
        { lang: 'fr' },
        { title: '' },
        { title: 'Confidentialité | Bingeki' },
    ])('rejects invalid output %j regardless of HTML shell size', change => {
        expect(() => assertRenderedPage({ ...page, ...change }, 'en', 'Confidentialité | Bingeki', [])).toThrow();
    });
    it('rejects browser errors even when a partial page rendered', () => {
        expect(() => assertRenderedPage(page, 'en', undefined, ['Firebase initialization failed'])).toThrow('Browser errors');
    });
    it('uses the URL language before i18next finishes loading', () => {
        expect(resolveSeoFromPath('/en/privacy', 'fr').locale).toBe('en_US');
        expect(resolveSeoFromPath('/fr/privacy', 'en').locale).toBe('fr_FR');
    });
    it('keeps HTML function and Hosting policies identical', () => {
        const csp = hosting.hosting.headers.find(rule => rule.source === '**')?.headers
            .find(header => header.key === 'Content-Security-Policy')?.value;
        expect(require('../shared/seo/csp.cjs')).toBe(csp);
    });
});
