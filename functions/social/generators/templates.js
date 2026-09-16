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

    /* INTRO slide (light, halftone) */
    .intro-container {
        position: absolute; inset: 0; z-index: 5;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 100px 60px;
    }
    .intro-title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 130px; line-height: 0.92; letter-spacing: -5px;
        text-transform: uppercase; color: #000;
        overflow-wrap: break-word; word-break: break-word; max-width: 100%;
    }
    .intro-title .accent {
        color: ${ROSE};
        text-shadow: 6px 6px 0 #000;
        display: inline-block;
        transform: rotate(-3deg);
    }
    .intro-sub {
        margin-top: 42px;
        font-family: 'Inter'; font-weight: 600;
        font-size: 38px; color: #555;
        max-width: 900px; line-height: 1.35;
    }
    .intro-swipe {
        position: absolute; right: 60px; bottom: 60px; z-index: 6;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 32px; color: #666; letter-spacing: 4px;
    }
    .intro-brand {
        position: absolute; left: 60px; bottom: 60px; z-index: 6;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 38px; color: #000; letter-spacing: -1px;
    }

    /* OUTRO slide (dark with speedlines) */
    .outro-container {
        position: absolute; inset: 0; z-index: 5;
        background: #000;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 100px 60px;
    }
    .outro-cta {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 126px; line-height: 0.92; letter-spacing: -5px;
        text-transform: uppercase; color: #fff;
        text-shadow: 6px 6px 0 ${ROSE};
        overflow-wrap: break-word; word-break: break-word; max-width: 100%;
    }
    .outro-btn {
        margin-top: 50px;
        background: ${ROSE}; color: #fff; border: 6px solid #fff;
        padding: 26px 48px; box-shadow: 10px 10px 0 #fff;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 44px; letter-spacing: 3px;
        text-transform: uppercase;
    }
    .outro-url {
        margin-top: 60px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 58px; letter-spacing: -2px; color: #fff;
    }

    /* Slide index badge (bottom-right) */
    .slide-idx {
        position: absolute; bottom: 60px; right: 60px; z-index: 7;
        background: #fff; color: #000; border: 5px solid #000;
        padding: 8px 18px; box-shadow: 6px 6px 0 #000;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 30px; letter-spacing: 1px;
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
        ${cover ? `<img class="cover-img" src="${escape(cover)}" alt="">` : ''}
        <div class="cover-overlay"></div>
    `;
}

function slideIdxBadge(index, total) {
    if (!index || !total) return '';
    return `<div class="slide-idx">${index}/${total}</div>`;
}

/* =============================================================== */
/* INTRO SLIDE                                                     */
/* =============================================================== */
function introSlide({ badge, badgeVariant = 'chip-dark', titleMain, titleAccent, subtitle, index, total }) {
    return docShell(`
        <div class="halftone-black"></div>
        <div class="intro-container">
            <div class="chip ${badgeVariant}" style="margin-bottom: 60px;">${escape(badge)}</div>
            <div class="intro-title">${escape(titleMain)} <span class="accent">${escape(titleAccent)}</span></div>
            <div class="intro-sub">${escape(subtitle)}</div>
        </div>
        <div class="intro-brand">Bingeki</div>
        <div class="intro-swipe">SWIPE →</div>
        ${slideIdxBadge(index, total)}
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
/* OUTRO SLIDE                                                     */
/* =============================================================== */
function outroSlide({ ctaMain, ctaSub, index, total }) {
    return docShell(`
        <div class="outro-container">
            <div class="speedlines"></div>
            <div class="halftone-white"></div>
            <div class="outro-cta">${escape(ctaMain)}</div>
            <div class="outro-btn">${escape(ctaSub)}</div>
            <div class="outro-url">bingeki.app</div>
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
                badge: 'SORTIES DU JOUR',
                badgeVariant: 'chip-dark',
                titleMain: "Aujourd'hui,",
                titleAccent: `${arr.length} épisodes`,
                subtitle: `${todayLabel()} · Swipe pour voir la liste`,
                index: 1, total,
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
                badge: 'RÉCAP HEBDO',
                badgeVariant: 'chip-rose',
                titleMain: 'Le',
                titleAccent: 'TOP 3',
                subtitle: `Semaine ${isoWeek()} — élu par vous, watchers Bingeki`,
                index: 1, total,
            }),
        });
        arr.forEach((a, i) => slides.push({
            name: `top-${i + 1}`,
            html: animeSlide({
                cover: a.cover,
                fallbackGradient: fallback(i),
                ribbon: `#${i + 1}`,
                ribbonVariant: i === 0 ? 'ribbon-rose' : i === 1 ? 'ribbon-dark' : 'ribbon-cyan',
                metas: [
                    { text: `${a.avg} ★`, variant: 'cyan' },
                    { text: `${a.count} WATCHERS` },
                ],
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
        const isTie = arr.length > 1;
        const total = arr.length + 2;
        slides.push({
            name: 'intro',
            html: introSlide({
                badge: isTie ? 'COUPS DE CŒUR' : 'COUP DE CŒUR',
                badgeVariant: 'chip-cyan',
                titleMain: isTie ? `${arr.length}` : 'La commu',
                titleAccent: isTie ? 'ex æquo' : 'a adoré',
                subtitle: isTie
                    ? `Semaine ${isoWeek()} · ${arr.length} animes à la même note`
                    : `Semaine ${isoWeek()} · choix des watchers Bingeki`,
                index: 1, total,
            }),
        });
        arr.forEach((a, i) => slides.push({
            name: `fav-${i + 1}`,
            html: animeSlide({
                cover: a.cover,
                fallbackGradient: fallback(i),
                ribbon: isTie ? `EX ÆQUO · ${i + 1}/${arr.length}` : `${a.avg} ★`,
                ribbonVariant: 'ribbon-cyan',
                metas: [
                    { text: `${a.count} WATCHERS`, variant: 'rose' },
                ],
                title: a.title,
                subtitle: 'CETTE SEMAINE',
                index: i + 2, total,
            }),
        }));
        slides.push({
            name: 'outro',
            html: outroSlide({
                ctaMain: isTie ? 'Découvre-les' : 'Découvre-le',
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
        slides.push({
            name: 'info',
            html: introSlide({
                badge: 'FICHE SAISON',
                badgeVariant: 'chip-rose',
                titleMain: data.title.split(' ').slice(0, 2).join(' '),
                titleAccent: 'S2',
                subtitle: [
                    (data.studios || []).length ? `Studio ${data.studios.join(', ')}` : null,
                    data.episodes ? `${data.episodes} épisodes prévus` : null,
                    data.score ? `S1 notée ${data.score}/10` : null,
                ].filter(Boolean).join(' · '),
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
