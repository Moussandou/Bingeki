/**
 * generators/templates.js — HTML templates that mirror the React
 * mockups in src/components/mockups/SocialPostMockup.tsx.
 *
 * All slides render at either 1080x1350 (feed) or 1080x1920 (story).
 * Sizes below are proportional to a 1080-wide canvas.
 */

const ROSE = '#FF2E63';
const CYAN = '#08D9D6';
const DARK = '#0a0a0a';

const escape = (s) => String(s ?? '').replace(/[<>&"']/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
}[c]));

/**
 * Common CSS: manga aesthetic (thick black borders, halftone patterns,
 * bold Outfit typography). Fonts loaded from Google Fonts because the
 * Puppeteer runtime doesn't ship them locally.
 */
const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@400;700;800;900&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
        width: 100%; height: 100%; margin: 0; padding: 0;
        font-family: 'Inter', -apple-system, sans-serif;
        color: #000; overflow: hidden;
    }
    .slide {
        position: relative; width: 100vw; height: 100vh;
        overflow: hidden; background: #f5f5f5;
    }
    /* Cover: two layers because anime posters from MAL/AniList top out
       at ~460x650. Stretching to 1080x1920 gives visible pixels. We
       instead show a blurred version at full slide as ambient background,
       then a sharp version at its native size inside a manga frame in
       the upper half of the slide. */
    .cover-bg {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; z-index: 1;
        filter: blur(28px) saturate(1.35) brightness(0.55);
        transform: scale(1.15); /* hide blur edge bleed */
    }
    .cover-card {
        position: absolute; top: 7%; left: 50%;
        transform: translateX(-50%) rotate(-1.5deg);
        height: 52vh; aspect-ratio: 2 / 3;
        z-index: 5;
        border: 8px solid #000;
        box-shadow: 18px 18px 0 #000;
        background: #000;
        overflow: hidden;
    }
    .cover-card img {
        width: 100%; height: 100%; object-fit: cover;
        display: block;
    }
    /* Kept for backwards compatibility with the intro/outro layers. */
    .cover-img {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; z-index: 1;
    }
    .cover-fallback {
        position: absolute; inset: 0; z-index: 0;
    }
    .halftone-black {
        position: absolute; inset: 0; opacity: 0.1; pointer-events: none;
        background-image: radial-gradient(#000 4px, transparent 5px);
        background-size: 42px 42px; z-index: 2;
    }
    .halftone-white {
        position: absolute; inset: 0; opacity: 0.18; pointer-events: none;
        background-image: radial-gradient(#fff 3px, transparent 4px);
        background-size: 32px 32px; z-index: 3;
    }
    .speedlines {
        position: absolute; inset: 0; opacity: 0.18; pointer-events: none;
        background: repeating-conic-gradient(from 0deg at 50% 50%,
            transparent 0deg 10deg, ${ROSE} 10deg 12deg);
        z-index: 2;
    }
    .cover-overlay {
        position: absolute; inset: 0; z-index: 4;
        background: linear-gradient(180deg,
            rgba(0,0,0,0.55) 0%,
            rgba(0,0,0,0.05) 30%,
            rgba(0,0,0,0.05) 55%,
            rgba(0,0,0,0.95) 100%);
    }

    /* Chips */
    .chip {
        display: inline-flex; align-items: center; gap: 12px;
        border: 6px solid #000; padding: 14px 28px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 34px; letter-spacing: 3.5px;
        text-transform: uppercase; line-height: 1;
        white-space: nowrap;
    }
    .chip-dark { background: #000; color: #fff; }
    .chip-rose { background: ${ROSE}; color: #fff; }
    .chip-cyan { background: ${CYAN}; color: #000; }
    .chip-white { background: #fff; color: #000; }

    /* Ribbon (top-left, with hard shadow) */
    .ribbon {
        position: absolute; top: 60px; left: 60px; z-index: 6;
        display: inline-flex; align-items: center; gap: 14px;
        border: 6px solid #000; padding: 20px 34px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 42px; letter-spacing: 4px;
        text-transform: uppercase; line-height: 1;
        box-shadow: 14px 14px 0 #000;
    }
    .ribbon-rose { background: ${ROSE}; color: #fff; }
    .ribbon-cyan { background: ${CYAN}; color: #000; }
    .ribbon-dark { background: #000; color: #fff; border-color: #fff; }

    /* Brand top-right */
    .brand {
        position: absolute; top: 60px; right: 60px; z-index: 6;
        background: #fff; color: #000; border: 5px solid #000;
        padding: 14px 24px; box-shadow: 10px 10px 0 #000;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 34px; letter-spacing: -1px; line-height: 1;
    }

    /* Bottom content block */
    .bottom-block {
        position: absolute; left: 60px; right: 60px; bottom: 60px;
        z-index: 6; color: #fff;
    }
    .meta-row {
        display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;
    }
    .meta-chip {
        display: inline-flex; align-items: center;
        background: #fff; color: #000; border: 5px solid #000;
        padding: 10px 20px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 28px; letter-spacing: 1.5px;
        text-transform: uppercase; line-height: 1;
    }
    .meta-chip-cyan { background: ${CYAN}; }
    .meta-chip-rose { background: ${ROSE}; color: #fff; }
    .title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 108px; line-height: 0.95; letter-spacing: -4px;
        text-transform: uppercase;
        text-shadow: 5px 5px 0 #000;
        overflow-wrap: break-word; word-break: break-word; max-width: 100%;
    }
    .subtitle {
        margin-top: 18px;
        font-family: 'Outfit'; font-weight: 800;
        font-size: 40px; letter-spacing: 2px;
        text-transform: uppercase; color: ${CYAN};
        overflow-wrap: break-word;
    }

    /* INTRO slide — same #f5f5f5 base as the other slides + full-slide
       halftone .halftone-black (unchanged from the original template).
       7-palette day rotation only changes chip / accent / +N tile / star
       so the brand stays coherent. */
    .intro-slide { background: #f5f5f5; }
    .intro-type-label {
        position: absolute; top: 100px; left: 50%; transform: translateX(-50%);
        font-family: 'Outfit'; font-weight: 900;
        font-size: 32px; letter-spacing: 8px; text-transform: uppercase;
        color: #000; opacity: 0.85; z-index: 5;
        display: flex; align-items: center; gap: 18px; white-space: nowrap;
    }
    .intro-type-label::before, .intro-type-label::after {
        content: ''; width: 60px; height: 3px; background: #000;
    }
    .intro-datebar {
        position: absolute; top: 220px; left: 50%; transform: translateX(-50%);
        background: #000; color: #fff;
        padding: 10px 24px;
        font-family: 'Outfit'; font-weight: 800;
        font-size: 26px; letter-spacing: 4px; z-index: 5; white-space: nowrap;
    }
    .intro-chip {
        display: inline-flex; align-items: center; gap: 12px;
        border: 6px solid #000; padding: 20px 34px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 40px; letter-spacing: 4px;
        text-transform: uppercase; line-height: 1; white-space: nowrap;
        box-shadow: 8px 8px 0 #000; background: #000; color: #fff;
    }
    .intro-container {
        position: absolute; top: 50%; left: 60px; right: 60px;
        transform: translateY(-58%);
        display: flex; flex-direction: column;
        align-items: center; gap: 44px; z-index: 5;
    }
    .intro-title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 148px; line-height: 0.9; letter-spacing: -6px;
        text-align: center; text-transform: uppercase;
        color: #000;
    }
    .intro-title .accent {
        display: inline-block; color: ${ROSE};
        text-shadow: 7px 7px 0 #000; transform: rotate(-3deg);
    }
    .intro-sub {
        font-family: 'Outfit'; font-weight: 800;
        font-size: 34px; letter-spacing: 3px;
        text-transform: uppercase; color: #444; text-align: center;
    }
    .intro-covers {
        position: absolute; bottom: 220px; left: 60px; right: 60px;
        z-index: 4;
        display: flex; gap: 14px; justify-content: center; align-items: flex-end;
    }
    .intro-cover {
        width: 152px; height: 216px;
        border: 4px solid #000; box-shadow: 6px 6px 0 #000;
        background: #333; background-size: cover; background-position: center;
    }
    .intro-cover.r1 { transform: rotate(-2deg); }
    .intro-cover.r2 { transform: rotate(3deg); margin-top: -6px; }
    .intro-cover.r3 { transform: rotate(-1deg); margin-top: 4px; }
    .intro-cover.r4 { transform: rotate(2deg); margin-top: -4px; }
    .intro-cover.extra {
        transform: rotate(-3deg); margin-top: 8px;
        background: ${ROSE}; color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Outfit'; font-weight: 900; font-size: 60px;
    }
    .intro-swipe {
        position: absolute; right: 60px; bottom: 60px; z-index: 6;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 34px; color: #444; letter-spacing: 5px;
    }
    .intro-brand {
        position: absolute; left: 60px; bottom: 60px; z-index: 6;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 42px; color: #000; letter-spacing: -1px;
    }
    .intro-brand::before { content: '★ '; color: ${ROSE}; }

    /* ============ 7 PALETTES (day rotation) ============ */
    /* pl-lun — base rose classique */
    .pl-lun .intro-chip { background: #000; color: #fff; }
    .pl-lun .intro-title .accent { color: ${ROSE}; text-shadow: 7px 7px 0 #000; }
    .pl-lun .intro-cover.extra { background: ${ROSE}; color: #fff; }

    /* pl-mar — chip rose inversée */
    .pl-mar .intro-chip { background: ${ROSE}; color: #fff; }
    .pl-mar .intro-title .accent { color: #000; text-shadow: 7px 7px 0 ${ROSE}; }
    .pl-mar .intro-cover.extra { background: #000; color: ${ROSE}; }

    /* pl-mer — chip blanche épurée */
    .pl-mer .intro-chip { background: #fff; color: #000; }
    .pl-mer .intro-title .accent { color: ${ROSE}; text-shadow: 7px 7px 0 #000; }
    .pl-mer .intro-cover.extra { background: ${ROSE}; color: #000; }

    /* pl-jeu — accent noir shadow rose */
    .pl-jeu .intro-chip { background: #000; color: #fff; }
    .pl-jeu .intro-title .accent { color: #000; text-shadow: 7px 7px 0 ${ROSE}; }
    .pl-jeu .intro-cover.extra { background: #000; color: ${ROSE}; border-color: ${ROSE}; }

    /* pl-ven — chip rose texte noir */
    .pl-ven .intro-chip { background: ${ROSE}; color: #000; }
    .pl-ven .intro-title .accent { color: ${ROSE}; text-shadow: 7px 7px 0 #000; }
    .pl-ven .intro-cover.extra { background: #fff; color: ${ROSE}; border-color: ${ROSE}; }

    /* pl-sam — chip blanche accent noir/rose */
    .pl-sam .intro-chip { background: #fff; color: #000; }
    .pl-sam .intro-title .accent { color: #000; text-shadow: 7px 7px 0 ${ROSE}; }
    .pl-sam .intro-cover.extra { background: #000; color: ${ROSE}; }

    /* pl-dim — chip noir bordure rose */
    .pl-dim .intro-chip { background: #000; color: ${ROSE}; border-color: ${ROSE}; box-shadow: 8px 8px 0 ${ROSE}; }
    .pl-dim .intro-title .accent { color: ${ROSE}; text-shadow: 7px 7px 0 #000; }
    .pl-dim .intro-cover.extra { background: ${ROSE}; color: #000; border-color: #fff; }

    /* OUTRO slide (dark with speedlines) */
    .outro-container {
        position: absolute; inset: 0; z-index: 5;
        background: #000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 80px 60px;
    }
    .outro-logo {
        width: 320px; height: 320px; margin-bottom: 24px;
        display: flex; align-items: center; justify-content: center;
        filter: drop-shadow(8px 8px 0 ${ROSE});
    }
    .outro-logo img { width: 100%; height: 100%; object-fit: contain; }
    .outro-cta {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 110px; line-height: 0.92; letter-spacing: -5px;
        text-transform: uppercase; color: #fff;
        text-shadow: 6px 6px 0 ${ROSE};
        overflow-wrap: break-word; word-break: break-word; max-width: 100%;
    }
    .outro-btn {
        margin-top: 34px;
        background: ${ROSE}; color: #fff; border: 6px solid #fff;
        padding: 22px 44px; box-shadow: 10px 10px 0 #fff;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 40px; letter-spacing: 3px;
        text-transform: uppercase;
    }
    .outro-url {
        margin-top: 40px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 54px; letter-spacing: -2px; color: #fff;
    }

    /* Slide index badge (bottom-right) */
    .slide-idx {
        position: absolute; bottom: 60px; right: 60px; z-index: 7;
        background: #fff; color: #000; border: 5px solid #000;
        padding: 8px 18px; box-shadow: 6px 6px 0 #000;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 30px; letter-spacing: 1px;
    }

    /* INFO slide (fiche technique — rows label/value on halftone bg) */
    .info-head {
        position: absolute; top: 60px; left: 60px; right: 60px; z-index: 5;
    }
    .info-eyebrow {
        font-family: 'Outfit'; font-weight: 800;
        font-size: 30px; letter-spacing: 8px;
        text-transform: uppercase; color: #666;
    }
    .info-title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 96px; line-height: 0.95; letter-spacing: -4px;
        text-transform: uppercase; margin-top: 12px; color: #000;
        overflow-wrap: break-word; word-break: break-word;
    }
    .info-title .accent {
        color: ${ROSE}; text-shadow: 5px 5px 0 #000;
        display: inline-block; transform: rotate(-3deg);
    }
    .info-rows {
        position: absolute; top: 340px; bottom: 160px;
        left: 60px; right: 60px; z-index: 5;
        display: flex; flex-direction: column; gap: 22px;
        justify-content: center;
    }
    .info-row {
        background: #fff; border: 5px solid #000; box-shadow: 8px 8px 0 #000;
        padding: 26px 34px; display: flex; align-items: center;
        justify-content: space-between; gap: 20px;
    }
    .info-label {
        font-family: 'Outfit'; font-weight: 800;
        font-size: 30px; letter-spacing: 3px;
        text-transform: uppercase; color: #666;
    }
    .info-value {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 48px; letter-spacing: -1.5px;
        color: ${ROSE}; text-align: right;
    }
`;

function docShell(inner) {
    return `<!doctype html><html lang="fr"><head>
        <meta charset="utf-8">
        <style>${CSS}</style>
    </head><body><div class="slide">${inner}</div></body></html>`;
}

function coverBlock(cover, fallbackGradient = 'linear-gradient(180deg, #1a1a1a 0%, #FF2E63 100%)') {
    return `
        <div class="cover-fallback" style="background: ${fallbackGradient};"></div>
        ${cover ? `<img class="cover-bg" src="${escape(cover)}" alt="">` : ''}
        <div class="halftone-black"></div>
        <div class="cover-overlay"></div>
        ${cover ? `<div class="cover-card"><img src="${escape(cover)}" alt=""></div>` : ''}
    `;
}

function slideIdxBadge(index, total) {
    if (!index || !total) return '';
    return `<div class="slide-idx">${index}/${total}</div>`;
}

/* =============================================================== */
/* INTRO SLIDE                                                     */
/* =============================================================== */
const PALETTE_KEYS = ['pl-dim', 'pl-lun', 'pl-mar', 'pl-mer', 'pl-jeu', 'pl-ven', 'pl-sam'];

function pickPalette(date = new Date()) {
    return PALETTE_KEYS[date.getDay()];
}

function frenchDatebar(date = new Date()) {
    const days = ['DIMANCHE', 'LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI'];
    const months = ['JAN', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
}

function coversStrip(covers = []) {
    if (!covers.length) return '';
    const shown = covers.slice(0, 4);
    const extra = covers.length - 4;
    const cells = shown.map((c, i) =>
        `<div class="intro-cover r${i + 1}" style="background-image: url('${escape(c)}');"></div>`,
    );
    if (extra > 0) cells.push(`<div class="intro-cover extra">+${extra}</div>`);
    return `<div class="intro-covers">${cells.join('')}</div>`;
}

function introSlide({
    typeLabel = "Épisodes anime · aujourd'hui",
    chipText,
    titleMain,
    titleAccent,
    subtitle = 'La liste juste après →',
    miniCovers = [],
    date = new Date(),
    paletteOverride, // optional, defaults to day-of-week rotation
}) {
    const palette = paletteOverride || pickPalette(date);
    return docShell(`
        <div class="intro-slide ${palette}" style="position:absolute; inset:0; z-index:0;"></div>
        <div class="halftone-black"></div>
        <div class="intro-type-label ${palette}">${escape(typeLabel)}</div>
        <div class="intro-datebar ${palette}">${escape(frenchDatebar(date))}</div>
        <div class="${palette}">
            <div class="intro-container">
                <div class="intro-chip">${escape(chipText)}</div>
                <div class="intro-title">${escape(titleMain)} <span class="accent">${escape(titleAccent)}</span></div>
                <div class="intro-sub">${escape(subtitle)}</div>
            </div>
            ${coversStrip(miniCovers)}
        </div>
        <div class="intro-brand">Bingeki</div>
        <div class="intro-swipe">SWIPE →</div>
    `);
}

/* =============================================================== */
/* ANIME BANNER SLIDE                                              */
/* =============================================================== */
function animeSlide({ cover, fallbackGradient, ribbon, ribbonVariant = 'ribbon-rose', metas = [], title, subtitle, index, total }) {
    const metaChips = metas.map((m) => {
        const cls = m.variant === 'cyan' ? 'meta-chip-cyan' : m.variant === 'rose' ? 'meta-chip-rose' : '';
        return `<div class="meta-chip ${cls}">${escape(m.text)}</div>`;
    }).join('');

    return docShell(`
        ${coverBlock(cover, fallbackGradient)}
        ${ribbon ? `<div class="ribbon ${ribbonVariant}">${escape(ribbon)}</div>` : ''}
        <div class="brand">Bingeki</div>
        <div class="bottom-block">
            ${metas.length ? `<div class="meta-row">${metaChips}</div>` : ''}
            <div class="title">${escape(title)}</div>
            ${subtitle ? `<div class="subtitle">${escape(subtitle)}</div>` : ''}
        </div>
        ${slideIdxBadge(index, total)}
    `);
}

/* =============================================================== */
/* INFO SLIDE                                                      */
/* =============================================================== */
function infoSlide({ eyebrow, titleMain, titleAccent, items = [], index, total }) {
    const rows = items.map((it) => `
        <div class="info-row">
            <span class="info-label">${escape(it.label)}</span>
            <span class="info-value">${escape(it.value)}</span>
        </div>
    `).join('');
    return docShell(`
        <div class="halftone-black"></div>
        <div class="info-head">
            <div class="info-eyebrow">${escape(eyebrow)}</div>
            <div class="info-title">${escape(titleMain)} <span class="accent">${escape(titleAccent)}</span></div>
        </div>
        <div class="info-rows">${rows}</div>
        <div class="intro-brand">Bingeki</div>
        <div class="intro-swipe">SWIPE →</div>
        ${slideIdxBadge(index, total)}
    `);
}

/* =============================================================== */
/* OUTRO SLIDE                                                     */
/* =============================================================== */
const LOGO_URL = 'https://bingeki.web.app/logo.png';

function outroSlide({ ctaMain, ctaSub, index, total }) {
    return docShell(`
        <div class="outro-container">
            <div class="speedlines"></div>
            <div class="halftone-white"></div>
            <div class="outro-logo"><img src="${LOGO_URL}" alt=""></div>
            <div class="outro-cta">${escape(ctaMain)}</div>
            <div class="outro-btn">${escape(ctaSub)}</div>
            <div class="outro-url">bingeki.web.app</div>
        </div>
        ${slideIdxBadge(index, total)}
    `);
}

/* =============================================================== */
/* PER-TYPE ASSEMBLY                                               */
/* =============================================================== */

const DAY_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTH_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

function todayLabel() {
    const d = new Date();
    return `${DAY_FR[d.getDay()]} ${d.getDate()} ${MONTH_FR[d.getMonth()]}`;
}

function isoWeek(d = new Date()) {
    const start = new Date(d.getFullYear(), 0, 1);
    return Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
}

function fallback(index) {
    const gradients = [
        'linear-gradient(180deg, #1a1a1a 0%, #FF2E63 100%)',
        'linear-gradient(180deg, #08D9D6 0%, #252A34 100%)',
        'linear-gradient(180deg, #FF2E63 0%, #FF0844 100%)',
        'linear-gradient(180deg, #252A34 0%, #08D9D6 100%)',
        'linear-gradient(180deg, #FF2E63 0%, #08D9D6 100%)',
    ];
    return gradients[index % gradients.length];
}

function buildSlidesHTML(type, data) {
    const slides = [];

    if (type === 'daily') {
        const arr = Array.isArray(data) ? data : [data];
        const total = arr.length + 2;
        slides.push({
            name: 'intro',
            html: introSlide({
                typeLabel: "Épisodes anime · aujourd'hui",
                chipText: 'SORTIES DU JOUR',
                titleMain: `${arr.length}`,
                titleAccent: 'épisodes',
                subtitle: 'La liste juste après →',
                miniCovers: arr.map((a) => a.cover).filter(Boolean),
            }),
        });
        arr.forEach((a, i) => slides.push({
            name: `anime-${i + 1}`,
            html: animeSlide({
                cover: a.cover,
                fallbackGradient: fallback(i),
                ribbon: 'NEW EP',
                ribbonVariant: 'ribbon-rose',
                metas: [
                    { text: `${a.currentEpisode ? `ÉPISODE ${a.currentEpisode}` : 'NOUVEL ÉPISODE'}` },
                ],
                title: a.title,
                subtitle: todayLabel().toUpperCase(),
                index: i + 2, total,
            }),
        }));
        slides.push({
            name: 'outro',
            html: outroSlide({
                ctaMain: 'Suis ta liste',
                ctaSub: 'Ouvrir Bingeki →',
                index: total, total,
            }),
        });
    }

    if (type === 'weekly') {
        const arr = Array.isArray(data) ? data : [data];
        const total = arr.length + 2;
        slides.push({
            name: 'intro',
            html: introSlide({
                typeLabel: `Anime · Semaine ${isoWeek()}`,
                chipText: 'RÉCAP HEBDO',
                titleMain: 'Le',
                titleAccent: `TOP ${arr.length}`,
                subtitle: 'Élu par les watchers Bingeki →',
                miniCovers: arr.map((a) => a.cover).filter(Boolean),
            }),
        });
        arr.forEach((a, i) => slides.push({
            name: `top-${i + 1}`,
            html: animeSlide({
                cover: a.cover,
                fallbackGradient: fallback(i),
                ribbon: `#${i + 1}`,
                ribbonVariant: i === 0 ? 'ribbon-rose' : i === 1 ? 'ribbon-dark' : 'ribbon-cyan',
                // Only show the watcher count once the ranking has real
                // volume (≥3 watchers). Below that we just show the score
                // — showing "1 WATCHER" or "2 WATCHERS" on a public post
                // makes the community look thin.
                metas: a.count >= 3
                    ? [{ text: `${a.avg} ★`, variant: 'cyan' }, { text: `${a.count} WATCHERS` }]
                    : [{ text: `${a.avg} ★`, variant: 'cyan' }, { text: a.count === 0 ? 'NOTE MAL' : 'NOTE COMMU' }],
                title: a.title,
                subtitle: 'CETTE SEMAINE',
                index: i + 2, total,
            }),
        }));
        slides.push({
            name: 'outro',
            html: outroSlide({
                ctaMain: 'Note tes anime',
                ctaSub: 'Rejoins Bingeki →',
                index: total, total,
            }),
        });
    }

    if (type === 'favorite') {
        const arr = Array.isArray(data) ? data : [data];
        const total = arr.length + 2;
        slides.push({
            name: 'intro',
            html: introSlide({
                typeLabel: `Anime · Semaine ${isoWeek()}`,
                chipText: 'COUP DE CŒUR',
                titleMain: 'Le',
                titleAccent: `TOP ${arr.length}`,
                subtitle: 'Épisodes les mieux notés cette semaine →',
                miniCovers: arr.map((a) => a.cover).filter(Boolean),
            }),
        });
        arr.forEach((a, i) => {
            const epLabel = a.season
                ? `S${a.season} · ÉP ${a.episodeNumber ?? '?'}`
                : (a.episodeNumber ? `ÉPISODE ${a.episodeNumber}` : 'ÉPISODE');
            slides.push({
                name: `fav-${i + 1}`,
                html: animeSlide({
                    cover: a.cover,
                    fallbackGradient: fallback(i),
                    ribbon: `#${i + 1}`,
                    ribbonVariant: i === 0 ? 'ribbon-rose' : i === 1 ? 'ribbon-dark' : 'ribbon-cyan',
                    metas: [
                        { text: `${a.avg} ★`, variant: 'cyan' },
                        { text: epLabel, variant: 'rose' },
                    ],
                    title: a.title,
                    subtitle: a.episodeTitle
                        ? String(a.episodeTitle).slice(0, 44).toUpperCase()
                        : 'CETTE SEMAINE',
                    index: i + 2, total,
                }),
            });
        });
        slides.push({
            name: 'outro',
            html: outroSlide({
                ctaMain: 'Découvre-les',
                ctaSub: 'Ajouter à ma liste →',
                index: total, total,
            }),
        });
    }

    if (type === 'newseason') {
        const total = 3;
        slides.push({
            name: 'announcement',
            html: animeSlide({
                cover: data.cover,
                fallbackGradient: 'linear-gradient(180deg, #1a1a1a 0%, #FF0844 100%)',
                ribbon: "C'EST PARTI",
                ribbonVariant: 'ribbon-rose',
                metas: [
                    { text: 'NOUVELLE SAISON', variant: 'cyan' },
                    { text: data.airing_from ? new Date(data.airing_from).toLocaleDateString('fr-FR').toUpperCase() : todayLabel().toUpperCase() },
                ],
                title: data.title,
                subtitle: (data.studios || []).slice(0, 1).join('') || '',
                index: 1, total,
            }),
        });
        const infoItems = [];
        if ((data.studios || []).length) infoItems.push({ label: 'Studio', value: data.studios.join(', ') });
        if (data.episodes) infoItems.push({ label: 'Épisodes prévus', value: String(data.episodes) });
        if (data.score) infoItems.push({ label: 'Note S1', value: `${data.score} ★` });
        infoItems.push({ label: 'Sortie', value: data.airing_from
            ? new Date(data.airing_from).toLocaleDateString('fr-FR')
            : 'Cette semaine' });

        slides.push({
            name: 'info',
            html: infoSlide({
                eyebrow: 'Fiche saison',
                titleMain: data.title.split(' ').slice(0, 2).join(' '),
                titleAccent: 'S2',
                items: infoItems,
                index: 2, total,
            }),
        });
        slides.push({
            name: 'outro',
            html: outroSlide({
                ctaMain: 'Ne rate pas le S2',
                ctaSub: 'Ajouter à ma liste →',
                index: 3, total,
            }),
        });
    }

    return slides;
}

module.exports = { buildSlidesHTML, introSlide, animeSlide, outroSlide };
