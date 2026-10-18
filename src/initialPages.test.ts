import { describe, expect, it } from 'vitest';
import { isPublicInformationPage } from './initialPages';

describe('account-independent public pages', () => {
    it.each(['/', '/fr', '/en/', '/fr/privacy', '/en/privacy/', '/fr/legal', '/en/terms',
        '/fr/about', '/en/contact', '/fr/credits'])('does not gate %s on account services', pathname => {
        expect(isPublicInformationPage(pathname)).toBe(true);
    });
    it.each(['/fr/dashboard', '/en/library', '/fr/profile', '/en/settings', '/fr/admin',
        '/en/privacy/admin', '/invalid/privacy'])('keeps the authentication loading gate for %s', pathname => {
        expect(isPublicInformationPage(pathname)).toBe(false);
    });
});
