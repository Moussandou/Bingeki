/**
 * generators/templates.js — HTML templates for the 4 post types.
 *
 * These are simplified versions of the React mockups in
 * src/components/mockups/SocialPostMockup.tsx, converted to
 * standalone HTML with inline CSS so Puppeteer can render them at
 * 1080×1350 (feed) or 1080×1920 (story).
 *
 * Every template receives { anime, index, total, format } and returns
 * a full HTML document string.
 */

const BASE_STYLES = `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: Inter, -apple-system, sans-serif;
        color: #000; background: #000;
        width: 100%; height: 100vh; overflow: hidden;
        position: relative;
    }
    .cover {
        position: absolute; inset: 0;
        background-size: cover; background-position: center;
    }
    .overlay {
        position: absolute; inset: 0;
        background: linear-gradient(180deg,
            rgba(0,0,0,0.6) 0%,
            rgba(0,0,0,0.05) 30%,
            rgba(0,0,0,0.05) 55%,
            rgba(0,0,0,0.95) 100%);
    }
    .ribbon {
        position: absolute; top: 30px; left: 30px;
        background: #FF2E63; color: #fff;
        border: 4px solid #000; box-shadow: 8px 8px 0 #000;
        padding: 12px 24px;
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 24px; letter-spacing: 0.1em; text-transform: uppercase;
    }
    .brand {
        position: absolute; top: 30px; right: 30px;
        background: #fff; color: #000; border: 4px solid #000;
        padding: 8px 16px;
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 20px; letter-spacing: -0.5px;
    }
    .index-badge {
        position: absolute; top: 30px; right: 200px;
        background: #08D9D6; color: #000; border: 4px solid #000;
        padding: 8px 14px;
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 18px;
    }
    .bottom {
        position: absolute; bottom: 40px; left: 40px; right: 40px;
        color: #fff;
    }
    .meta {
        display: inline-block;
        background: #fff; color: #000; border: 4px solid #000;
        padding: 6px 14px; margin-bottom: 16px;
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 22px; letter-spacing: 0.05em;
    }
    .title {
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 78px; line-height: 0.95; letter-spacing: -3px;
        text-transform: uppercase;
        text-shadow: 4px 4px 0 rgba(0,0,0,0.9);
    }
    .subtitle {
        margin-top: 12px;
        font-family: Outfit, sans-serif; font-weight: 800;
        font-size: 26px; letter-spacing: 0.05em;
        text-transform: uppercase; color: #08D9D6;
    }
    /* Intro slide */
    .intro-bg {
        background: #f5f5f5; color: #000;
        position: absolute; inset: 0;
        background-image: radial-gradient(#000 4px, transparent 4.5px);
        background-size: 40px 40px;
    }
    .intro-content {
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 60px;
    }
    .intro-badge {
        display: inline-block;
        background: #000; color: #fff; border: 4px solid #000;
        padding: 10px 20px;
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 24px; letter-spacing: 0.1em;
        margin-bottom: 40px;
    }
    .intro-title {
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 96px; line-height: 0.9; letter-spacing: -4px;
        text-transform: uppercase;
    }
    .intro-title .accent {
        color: #FF2E63; text-shadow: 4px 4px 0 #000;
        display: inline-block; transform: rotate(-2deg);
    }
    .intro-subtitle {
        margin-top: 32px; font-family: Inter, sans-serif;
        font-size: 28px; color: #666; font-weight: 600;
    }
    .intro-swipe {
        position: absolute; bottom: 40px; right: 60px;
        font-family: Outfit, sans-serif; font-weight: 900;
        font-size: 24px; color: #666; letter-spacing: 0.1em;
    }
`;

const escape = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
}[c]));

function introSlide({ badge, titleMain, titleAccent, subtitle }) {
    return `<!doctype html><html><head><style>${BASE_STYLES}</style></head><body>
        <div class="intro-bg"></div>
        <div class="intro-content">
            <div class="intro-badge">${escape(badge)}</div>
            <div class="intro-title">${escape(titleMain)} <span class="accent">${escape(titleAccent)}</span></div>
            <div class="intro-subtitle">${escape(subtitle)}</div>
        </div>
        <div class="intro-swipe">SWIPE →</div>
    </body></html>`;
}

function animeSlide({ cover, ribbon, meta, title, subtitle, index, total }) {
    return `<!doctype html><html><head><style>${BASE_STYLES}</style></head><body>
        <div class="cover" style="background-image: url('${escape(cover)}');"></div>
        <div class="overlay"></div>
        ${ribbon ? `<div class="ribbon">${escape(ribbon)}</div>` : ''}
        ${index && total ? `<div class="index-badge">${index}/${total}</div>` : ''}
        <div class="brand">Bingeki</div>
        <div class="bottom">
            ${meta ? `<div class="meta">${escape(meta)}</div>` : ''}
            <div class="title">${escape(title)}</div>
            ${subtitle ? `<div class="subtitle">${escape(subtitle)}</div>` : ''}
        </div>
    </body></html>`;
}

/**
 * Build a list of {html, name} for one post.
 */
function buildSlidesHTML(type, data) {
    const slides = [];

    if (type === 'daily') {
        slides.push({
            name: 'intro',
            html: introSlide({
                badge: 'SORTIES DU JOUR',
                titleMain: "Aujourd'hui,",
                titleAccent: `${data.length} épisodes`,
                subtitle: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
            }),
        });
        data.forEach((a, i) => slides.push({
            name: `anime-${i + 1}`,
            html: animeSlide({
                cover: a.cover,
                ribbon: 'NEW EP',
                meta: `S${a.season || '?'} · ÉPISODE ${a.currentEpisode || '?'}`,
                title: a.title,
                subtitle: 'JEUDI',
                index: i + 2, total: data.length + 1,
            }),
        }));
    }

    if (type === 'weekly') {
        slides.push({
            name: 'intro',
            html: introSlide({
                badge: 'RÉCAP HEBDO',
                titleMain: 'Le',
                titleAccent: 'TOP 3',
                subtitle: 'De la semaine · Bingeki',
            }),
        });
        data.forEach((a, i) => slides.push({
            name: `top-${a.rank || i + 1}`,
            html: animeSlide({
                cover: a.cover,
                ribbon: `#${i + 1}`,
                meta: `${a.avg} ★ · ${a.count} WATCHERS`,
                title: a.title,
                index: i + 2, total: data.length + 1,
            }),
        }));
    }

    if (type === 'favorite') {
        const isTie = data.length > 1;
        slides.push({
            name: 'intro',
            html: introSlide({
                badge: isTie ? 'COUPS DE CŒUR' : 'COUP DE CŒUR',
                titleMain: 'La commu',
                titleAccent: 'a adoré',
                subtitle: `Semaine ${new Date().toISOString().slice(0, 10)}`,
            }),
        });
        data.forEach((a, i) => slides.push({
            name: `fav-${i + 1}`,
            html: animeSlide({
                cover: a.cover,
                ribbon: isTie ? `EX ÆQUO ${i + 1}/${data.length}` : `${a.avg} ★`,
                meta: `${a.count} WATCHERS`,
                title: a.title,
                subtitle: 'CETTE SEMAINE',
                index: i + 2, total: data.length + 1,
            }),
        }));
    }

    if (type === 'newseason') {
        slides.push({
            name: 'announcement',
            html: animeSlide({
                cover: data.cover,
                ribbon: "C'EST PARTI",
                meta: 'NOUVELLE SAISON',
                title: data.title,
                subtitle: `${data.episodes || '?'} ÉPISODES · ${(data.studios || []).slice(0, 1).join('') || 'STUDIO'}`,
            }),
        });
    }

    return slides;
}

module.exports = { buildSlidesHTML, introSlide, animeSlide };
