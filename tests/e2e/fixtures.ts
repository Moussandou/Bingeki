import { test as base, expect } from '@playwright/test';

const work = (id: number, title: string) => ({
    mal_id: id, title, title_english: title, title_japanese: title,
    titles: [{ type: 'Default', title }],
    type: 'TV', status: 'Finished Airing', episodes: 366,
    score: 8, scored_by: 100, rank: 10, popularity: 10,
    synopsis: `${title}: deterministic catalog data for isolated browser tests.`,
    images: { jpg: { image_url: '/logo.png', large_image_url: '/logo.png' }, webp: { image_url: '/logo.png', large_image_url: '/logo.png' } },
    genres: [], themes: [], demographics: [], studios: [], producers: [],
    relations: [], streaming: [], external: [],
    aired: { string: '2004', prop: { from: { year: 2004 } } },
    duration: '24 min per ep', rating: 'PG-13',
    trailer: { youtube_id: null, url: null, embed_url: null },
});

export const test = base.extend({
    page: async ({ page }, runTest) => {
        await page.route('**/*', async route => {
            const url = new URL(route.request().url());
            if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
                return route.continue();
            }
            if (url.hostname === 'api.tenrai.org' || url.hostname === 'api.jikan.moe') {
                const detail = url.pathname.match(/\/anime\/(\d+)(?:\/full)?$/);
                const query = url.searchParams.get('q');
                const data = detail ? work(Number(detail[1]), Number(detail[1]) === 20 ? 'Naruto' : 'Bleach')
                    : query && url.pathname.endsWith('/anime') ? [work(query.toLowerCase() === 'naruto' ? 20 : 269, query.toLowerCase() === 'naruto' ? 'Naruto' : 'Bleach')] : [];
                return route.fulfill({
                    json: { data, pagination: { has_next_page: false, last_visible_page: 1 } },
                });
            }
            // Never fall through to real Firebase, advertising, or other services.
            return route.abort();
        });
        await runTest(page);
    },
});
export { expect };
