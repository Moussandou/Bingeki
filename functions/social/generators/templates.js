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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;700;800;900&family=Bangers&display=swap');
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
    /* One "hero" row rendered bigger — used to spotlight the previous
       season's MAL score on announcement info slides. */
    .info-row.hero {
        background: #000; border-color: #000; box-shadow: 10px 10px 0 ${ROSE};
        padding: 32px 38px;
    }
    .info-row.hero .info-label { color: #fff; opacity: 0.75; }
    .info-row.hero .info-value { color: ${CYAN}; font-size: 64px; }

    /* SYNOPSIS slide — variant A': dark stage with the anime's cover blurred
       into the background, a rose "SYNOPSIS" chip, a big Outfit lead, and
       the synopsis body with a giant cyan Bangers drop cap. The optional
       'source' tag (bottom-left, cyan on black) names which season the
       synopsis actually comes from ("Synopsis Saison 2") when we fall back
       to the prequel — user feedback: be specific, don't say "précédente". */
    .syn-cover-bg {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; z-index: 1;
        filter: blur(24px) saturate(1.3) brightness(0.42);
        transform: scale(1.15);
    }
    .syn-scrim {
        position: absolute; inset: 0; z-index: 2;
        background: linear-gradient(180deg,
            rgba(0,0,0,0.5) 0%,
            rgba(0,0,0,0.15) 30%,
            rgba(0,0,0,0.85) 100%);
    }
    .syn-halftone {
        position: absolute; inset: 0; opacity: 0.14; pointer-events: none; z-index: 3;
        background-image: radial-gradient(#fff 2.5px, transparent 3.5px);
        background-size: 38px 38px;
    }
    .synopsis-chip {
        position: absolute; top: 60px; left: 60px; z-index: 6;
        border: 6px solid #000; padding: 20px 34px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 42px; letter-spacing: 4px;
        text-transform: uppercase; line-height: 1;
        box-shadow: 14px 14px 0 #000;
        background: ${ROSE}; color: #fff;
        transform: rotate(-2deg);
    }
    .synopsis-brand {
        position: absolute; top: 60px; right: 60px; z-index: 6;
        background: #fff; color: #000; border: 5px solid #000;
        padding: 14px 24px; box-shadow: 10px 10px 0 #000;
        font-family: 'Outfit'; font-weight: 900; font-size: 34px;
    }
    .synopsis-brand::before { content: '★ '; color: ${ROSE}; }
    .synopsis-title {
        position: absolute; top: 200px; left: 60px; right: 60px; z-index: 6;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 76px; line-height: 0.9; letter-spacing: -3px;
        text-transform: uppercase; color: #fff;
        text-shadow: 5px 5px 0 #000;
        overflow-wrap: break-word; word-break: break-word;
    }
    .synopsis-body {
        position: absolute; top: 460px; left: 60px; right: 60px; bottom: 210px;
        z-index: 6;
        font-family: 'Inter', sans-serif; font-weight: 500;
        font-size: 34px; line-height: 1.35; color: #fff;
        text-shadow: 2px 2px 0 rgba(0,0,0,0.9);
        overflow: hidden;
        display: flex; align-items: center;
    }
    .synopsis-body-inner { max-width: 100%; }
    .synopsis-body-inner::first-letter {
        font-family: 'Bangers', 'Outfit', sans-serif; font-weight: 400;
        font-size: 140px; color: ${CYAN};
        float: left; line-height: 0.85;
        margin-right: 16px; margin-top: 4px;
        text-shadow: 5px 5px 0 #000;
    }
    .synopsis-source {
        position: absolute; bottom: 130px; left: 60px; z-index: 6;
        background: #000; color: ${CYAN}; border: 3px solid ${CYAN};
        padding: 8px 14px;
        font-family: 'Outfit'; font-weight: 800;
        font-size: 22px; letter-spacing: 3px; text-transform: uppercase;
    }

    /* ==== ANNOUNCEMENT HERO-LITE (digest multi-annonces) ============ */
    .ann-lite-fallback { position: absolute; inset: 0; z-index: 0; }
    .ann-lite-bg {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; z-index: 1;
        filter: blur(24px) saturate(1.25) brightness(0.42);
        transform: scale(1.15);
    }
    .ann-lite-scrim {
        position: absolute; inset: 0; z-index: 2;
        background: linear-gradient(90deg,
            rgba(0,0,0,0.85) 0%,
            rgba(0,0,0,0.45) 45%,
            rgba(0,0,0,0.9) 100%);
    }
    .ann-lite-halftone {
        position: absolute; inset: 0; opacity: 0.12; pointer-events: none; z-index: 3;
        background-image: radial-gradient(#fff 2.5px, transparent 3.5px);
        background-size: 36px 36px;
    }
    .ann-lite-card {
        position: absolute; top: 50%; left: 60px;
        transform: translateY(-50%) rotate(-2.5deg);
        width: 380px; aspect-ratio: 2 / 3; z-index: 5;
        border: 8px solid #000; box-shadow: 16px 16px 0 ${ROSE};
        background: #000; overflow: hidden;
    }
    .ann-lite-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ann-lite-content {
        position: absolute; top: 50%; right: 60px; left: 500px;
        transform: translateY(-50%); z-index: 6; color: #fff;
        display: flex; flex-direction: column; gap: 22px;
    }
    .ann-lite-ribbon {
        display: inline-flex; align-self: flex-start;
        border: 6px solid #000; padding: 12px 24px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 32px; letter-spacing: 4px;
        text-transform: uppercase; line-height: 1;
        background: ${ROSE}; color: #fff;
        box-shadow: 10px 10px 0 #000;
        transform: rotate(-2deg);
    }
    .ann-lite-datebar {
        display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .ann-lite-pre {
        background: ${CYAN}; color: #000; border: 4px solid #000;
        padding: 6px 14px; box-shadow: 5px 5px 0 #000;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 22px; letter-spacing: 2px;
        text-transform: uppercase; line-height: 1;
    }
    .ann-lite-main {
        background: #fff; color: #000; border: 4px solid #000;
        padding: 6px 14px; box-shadow: 5px 5px 0 #000;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 26px; letter-spacing: 1px;
        text-transform: uppercase; line-height: 1;
    }
    .ann-lite-title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 70px; line-height: 0.95; letter-spacing: -2.5px;
        text-transform: uppercase; color: #fff;
        text-shadow: 5px 5px 0 #000;
        overflow-wrap: break-word; word-break: break-word;
    }
    .ann-lite-studio {
        font-family: 'Outfit'; font-weight: 800;
        font-size: 30px; letter-spacing: 2px;
        color: ${CYAN}; text-transform: uppercase;
    }
    .ann-lite-prev {
        display: inline-flex; align-self: flex-start;
        background: #000; color: ${CYAN}; border: 4px solid ${CYAN};
        padding: 12px 20px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 26px; letter-spacing: 1px;
    }
    .ann-lite-brand {
        position: absolute; left: 30px; bottom: 20px; z-index: 8;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 30px; color: #fff; letter-spacing: -0.5px;
        text-shadow: 2px 2px 0 #000;
    }
    .ann-lite-brand::before { content: '★ '; color: ${ROSE}; }

    /* ==== DAILY DUO (2 animes / slide, jours chargés) =============== */
    .duo-container {
        position: absolute; inset: 0; z-index: 1;
        display: grid; grid-template-rows: 1fr 6px 1fr;
        overflow: hidden; background: #000;
    }
    .duo-sep { background: #000; }
    .duo-half {
        position: relative; overflow: hidden;
        background: #1a1a1a;
    }
    .duo-fallback { position: absolute; inset: 0; z-index: 0; }
    .duo-bg {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; z-index: 1;
        filter: blur(22px) saturate(1.2) brightness(0.55);
        transform: scale(1.15);
    }
    .duo-scrim {
        position: absolute; inset: 0; z-index: 2;
        background: linear-gradient(90deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.85) 100%);
    }
    .duo-halftone {
        position: absolute; inset: 0; opacity: 0.10; pointer-events: none; z-index: 3;
        background-image: radial-gradient(#fff 2.5px, transparent 3.5px);
        background-size: 34px 34px;
    }
    .duo-card {
        position: absolute; top: 50%; left: 60px;
        transform: translateY(-50%) rotate(-2.5deg);
        width: 260px; aspect-ratio: 2 / 3; z-index: 5;
        border: 6px solid #000; box-shadow: 12px 12px 0 #000;
        background: #000; overflow: hidden;
    }
    .duo-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .duo-content {
        position: absolute; top: 50%; right: 60px; left: 360px;
        transform: translateY(-50%); z-index: 6; color: #fff;
        display: flex; flex-direction: column; gap: 18px;
    }
    .duo-ribbon {
        display: inline-flex; align-self: flex-start;
        border: 5px solid #000; padding: 10px 18px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 30px; letter-spacing: 3px;
        text-transform: uppercase; line-height: 1;
        background: ${ROSE}; color: #fff;
        box-shadow: 8px 8px 0 #000;
    }
    .duo-title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 66px; line-height: 0.95; letter-spacing: -2px;
        text-transform: uppercase;
        text-shadow: 4px 4px 0 #000;
        overflow-wrap: break-word; word-break: break-word;
    }
    .duo-score {
        display: inline-flex; align-self: flex-start;
        background: #fff; color: #000; border: 4px solid #000;
        padding: 6px 14px; box-shadow: 6px 6px 0 ${CYAN};
        font-family: 'Outfit'; font-weight: 900;
        font-size: 30px; letter-spacing: -0.5px;
    }
    .duo-brand {
        position: absolute; left: 30px; bottom: 20px; z-index: 8;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 28px; color: #fff; letter-spacing: -0.5px;
        text-shadow: 2px 2px 0 #000;
    }
    .duo-brand::before { content: '★ '; color: ${ROSE}; }

    /* ==== SEASON PREVIEW (4 animes / slide, digest saison) ========== */
    .sp-container {
        position: absolute; inset: 0; z-index: 1;
        background: #0a0a0a; overflow: hidden;
        display: grid;
        grid-template-rows: 130px 1fr 1fr 1fr 1fr 100px;
    }
    .sp-header {
        position: relative; background: #000; border-bottom: 6px solid ${ROSE};
        display: flex; align-items: center; padding: 0 40px;
        z-index: 2;
    }
    .sp-header-chip {
        display: inline-flex; align-items: center;
        border: 5px solid #fff; padding: 10px 22px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 26px; letter-spacing: 4px;
        text-transform: uppercase; line-height: 1;
        background: ${ROSE}; color: #fff;
        box-shadow: 8px 8px 0 ${CYAN};
    }
    .sp-header-title {
        margin-left: 32px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 52px; color: #fff; letter-spacing: -1.5px;
        text-transform: uppercase; line-height: 1;
    }
    .sp-header-title .accent { color: ${ROSE}; }
    .sp-row {
        position: relative; overflow: hidden;
        display: grid; grid-template-columns: 220px 1fr 260px;
        align-items: center; gap: 24px;
        padding: 22px 40px;
        background: #0a0a0a;
        border-bottom: 3px solid #1c1c1c;
    }
    .sp-row-halftone {
        position: absolute; inset: 0; opacity: 0.05; pointer-events: none;
        background-image: radial-gradient(#fff 2px, transparent 3px);
        background-size: 28px 28px;
    }
    .sp-cover {
        position: relative; z-index: 3;
        width: 180px; height: 240px;
        border: 5px solid #fff; box-shadow: 8px 8px 0 ${ROSE};
        transform: rotate(-1.5deg);
        background: #1a1a1a; overflow: hidden;
    }
    .sp-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .sp-content {
        position: relative; z-index: 3;
        display: flex; flex-direction: column;
        gap: 12px; justify-content: center;
        overflow: hidden;
    }
    .sp-chip {
        display: inline-flex; align-self: flex-start;
        border: 4px solid #000; padding: 6px 14px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 22px; letter-spacing: 3px;
        text-transform: uppercase; line-height: 1;
        background: ${ROSE}; color: #fff;
        box-shadow: 5px 5px 0 #fff;
    }
    .sp-title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 38px; line-height: 1.0; letter-spacing: -1px;
        color: #fff; text-transform: uppercase;
        overflow-wrap: break-word; word-break: break-word;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .sp-studio {
        font-family: 'Inter'; font-weight: 600;
        font-size: 20px; color: #888; letter-spacing: 0.5px;
        text-transform: uppercase;
    }
    .sp-date {
        position: relative; z-index: 3;
        display: flex; flex-direction: column;
        align-items: flex-end; justify-content: center;
        text-align: right;
    }
    .sp-date-day {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 96px; color: ${CYAN};
        line-height: 0.9; letter-spacing: -4px;
        text-shadow: 4px 4px 0 #000;
    }
    .sp-date-month {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 42px; color: #fff;
        line-height: 1; letter-spacing: 2px;
        text-transform: uppercase;
        margin-top: 4px;
    }
    .sp-footer {
        position: relative;
        background: #000; border-top: 6px solid ${ROSE};
        display: flex; align-items: center; justify-content: space-between;
        padding: 0 40px;
        z-index: 2;
    }
    .sp-footer-brand {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 34px; color: #fff; letter-spacing: -0.5px;
    }
    .sp-footer-brand::before { content: '★ '; color: ${ROSE}; }
    .sp-footer-idx {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 30px; color: #888; letter-spacing: 1px;
    }

    /* ==== SEASON PREVIEW INTRO / OUTRO =============================== */
    .sp-hero {
        position: absolute; inset: 0; z-index: 1;
        background: #0a0a0a; overflow: hidden;
    }
    /* Mosaïque de covers en background : 3 colonnes × 3 rangées, chaque
       cover en arrière-plan avec un scrim sombre par-dessus pour la
       lisibilité du titre. Contexte anime immédiat. */
    .sp-hero-mosaic {
        position: absolute; inset: 0; z-index: 1;
        display: grid; grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 0;
    }
    .sp-hero-mosaic > div {
        background-size: cover; background-position: center;
        filter: saturate(1.3);
    }
    /* Scrim CLAIR (voile blanc) pour matcher l'esthétique des autres
       intros (daily, weekly…) sur fond #f5f5f5. La mosaïque reste
       lisible en filigrane mais le texte reste noir sur clair. */
    .sp-hero-scrim {
        position: absolute; inset: 0; z-index: 2;
        background:
            linear-gradient(180deg, rgba(245,245,245,0.92) 0%, rgba(245,245,245,0.85) 40%, rgba(245,245,245,0.95) 100%);
    }
    .sp-hero-halftone {
        position: absolute; inset: 0; opacity: 0.10; pointer-events: none;
        background-image: radial-gradient(#000 2px, transparent 3px);
        background-size: 32px 32px;
        z-index: 3;
    }
    .sp-hero-content {
        position: absolute; inset: 0; z-index: 4;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        padding: 0 60px; text-align: center;
    }
    /* Panneau central CLAIR — blanc plein bordé noir avec ombre rose,
       cohérent avec les cartes/chips des intros existantes. */
    .sp-hero-panel {
        background: #fff;
        border: 8px solid #000;
        padding: 60px 70px;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 28px;
        box-shadow: 18px 18px 0 ${ROSE};
    }
    .sp-hero-eyebrow {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 32px; color: #000;
        letter-spacing: 8px; text-transform: uppercase;
        line-height: 1;
        display: flex; align-items: center; gap: 18px;
    }
    .sp-hero-eyebrow::before, .sp-hero-eyebrow::after {
        content: ''; width: 40px; height: 3px; background: #000;
    }
    .sp-hero-title {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 180px; color: #000;
        line-height: 0.85; letter-spacing: -6px;
        text-transform: uppercase; text-align: center;
    }
    .sp-hero-year {
        font-family: 'Outfit'; font-weight: 900;
        font-size: 96px; color: ${ROSE};
        line-height: 1; letter-spacing: -3px;
        text-shadow: 5px 5px 0 #000;
    }
    .sp-hero-count-line {
        display: flex; align-items: center; gap: 12px;
        font-family: 'Outfit'; font-weight: 800;
        font-size: 34px; color: #000;
        letter-spacing: 3px; text-transform: uppercase;
        border-top: 4px solid #000;
        padding-top: 20px;
    }
    .sp-hero-count-line strong {
        color: ${ROSE}; font-weight: 900; font-size: 44px;
    }
    .sp-hero-brand {
        position: absolute; left: 60px; bottom: 60px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 42px; color: #000; letter-spacing: -1px;
        z-index: 5;
    }
    .sp-hero-brand::before { content: '★ '; color: ${ROSE}; }
    .sp-hero-swipe {
        position: absolute; right: 60px; bottom: 60px;
        font-family: 'Outfit'; font-weight: 900;
        font-size: 34px; color: #444; letter-spacing: 5px;
        z-index: 5;
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
/* ANNOUNCEMENT HERO-LITE (pour digest multi-annonces)             */
/* =============================================================== */
/**
 * Hero compact 1 anime : cover-card à gauche, meta+titre+note S précédente
 * à droite. Utilisé par le digest quand on empile 2-3 annonces dans un
 * seul post. Format 1080×1350 identique aux autres slides du carrousel
 * pour rester cohérent visuellement.
 *
 * `date` doit être l'objet retourné par formatAnnouncementDate().
 * `prequel` (optionnel) = { score, scored_by, season_label } pour afficher
 * "S2 : 8.37 ★ · 45k votes" en argument de hype.
 */
function announcementHeroLiteSlide({ anime, date, prequel, index, total, gradientIdx = 0 }) {
    const cover = anime.cover || '';
    const title = anime.title || '';
    const studio = (anime.studios || []).slice(0, 1).join('') || '';
    const grad = fallback(gradientIdx);
    let prequelChip = '';
    if (prequel && typeof prequel.score === 'number' && prequel.score > 0) {
        const votesLabel = prequel.scored_by
            ? ` · ${prequel.scored_by >= 1000
                ? `${Math.round(prequel.scored_by / 1000)}k`
                : prequel.scored_by} votes`
            : '';
        const label = prequel.season_label || 'S précédente';
        prequelChip = `<div class="ann-lite-prev">${escape(label)} : ${escape(String(prequel.score))} ★${escape(votesLabel)}</div>`;
    }
    return docShell(`
        <div class="ann-lite-fallback" style="background: ${grad};"></div>
        ${cover ? `<img class="ann-lite-bg" src="${escape(cover)}" alt="">` : ''}
        <div class="ann-lite-scrim"></div>
        <div class="ann-lite-halftone"></div>
        ${cover ? `<div class="ann-lite-card"><img src="${escape(cover)}" alt=""></div>` : ''}
        <div class="ann-lite-content">
            <div class="ann-lite-ribbon">Annonce</div>
            <div class="ann-lite-datebar">
                <span class="ann-lite-pre">${escape(date.pre)}</span>
                <span class="ann-lite-main">${escape(date.main)}</span>
            </div>
            <div class="ann-lite-title">${escape(title)}</div>
            ${studio ? `<div class="ann-lite-studio">${escape(studio)}</div>` : ''}
            ${prequelChip}
        </div>
        <div class="ann-lite-brand">Bingeki</div>
        ${slideIdxBadge(index, total)}
    `);
}

/* =============================================================== */
/* ANIME DUO SLIDE                                                 */
/* =============================================================== */
/**
 * Deux animes empilés (haut/bas) dans une seule slide. Utilisé par le
 * cron daily quand la journée compte plus de 8 sorties : au-delà du
 * plein-écran classique, on switche en mode digest à 2/slide pour
 * fitter jusqu'à 16 animes dans les 10 slots Buffer.
 *
 * Chaque moitié = cover floutée en fond + cover-card rotée à gauche +
 * titre/meta à droite + ribbon "NEW EP". Séparateur noir de 6px entre
 * les 2 pour marquer la coupure.
 */
function animeHalfBlock(a, position /* 'top'|'bottom' */, fallbackIdx) {
    if (!a) return `<div class="duo-half duo-${position}"></div>`;
    const grad = fallback(fallbackIdx);
    const cover = a.cover || '';
    const title = a.title || '';
    const ep = a.currentEpisode ? `ÉP. ${a.currentEpisode}` : 'NOUVEL ÉP.';
    // Pas de score MAL affiché : l'user ne veut plus de notes visibles
    // dans les sorties du jour (feedback captures + captions).
    return `
        <div class="duo-half duo-${position}">
            <div class="duo-fallback" style="background: ${grad};"></div>
            ${cover ? `<img class="duo-bg" src="${escape(cover)}" alt="">` : ''}
            <div class="duo-scrim"></div>
            <div class="duo-halftone"></div>
            ${cover ? `<div class="duo-card"><img src="${escape(cover)}" alt=""></div>` : ''}
            <div class="duo-content">
                <div class="duo-ribbon">${escape(ep)}</div>
                <div class="duo-title">${escape(title)}</div>
            </div>
        </div>
    `;
}

function animeDuoSlide({ pair, index, total, fallbackOffset = 0 }) {
    return docShell(`
        <div class="duo-container">
            ${animeHalfBlock(pair[0], 'top', fallbackOffset)}
            <div class="duo-sep"></div>
            ${animeHalfBlock(pair[1], 'bottom', fallbackOffset + 1)}
        </div>
        <div class="duo-brand">Bingeki</div>
        ${slideIdxBadge(index, total)}
    `);
}

/* =============================================================== */
/* SEASON PREVIEW                                                  */
/* =============================================================== */
/**
 * Slide "hero" d'un post preview de saison : gros titre "AUTOMNE 2026",
 * chip label et compte d'animes. Ouvre le carrousel.
 */
function seasonPreviewIntroSlide({ seasonLabelFr, year, count, covers = [] }) {
    const pool = covers.filter(Boolean);
    const cells = [];
    for (let i = 0; i < 9; i += 1) {
        const c = pool.length > 0 ? pool[i % pool.length] : '';
        cells.push(`<div style="background-image: url('${escape(c)}');"></div>`);
    }
    return docShell(`
        <div class="sp-hero">
            <div class="sp-hero-mosaic">${cells.join('')}</div>
            <div class="sp-hero-scrim"></div>
            <div class="sp-hero-halftone"></div>
            <div class="sp-hero-content">
                <div class="sp-hero-panel">
                    <div class="sp-hero-eyebrow">Preview Anime</div>
                    <div class="sp-hero-title">${escape(seasonLabelFr)}</div>
                    <div class="sp-hero-year">${year}</div>
                    <div class="sp-hero-count-line"><strong>${count}</strong> Sorties à suivre</div>
                </div>
            </div>
            <div class="sp-hero-brand">Bingeki</div>
            <div class="sp-hero-swipe">SWIPE →</div>
        </div>
    `);
}

/**
 * Une row de la slide preview : cover portrait à gauche, chip statut +
 * titre + studio au milieu, grande date à droite.
 */
function seasonPreviewRow(a, fallbackIdx) {
    if (!a) return `<div class="sp-row"></div>`;
    const day = a.startDate ? a.startDate.day : '?';
    const monthLabels = ['JAN', 'FÉV', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'];
    const month = a.startDate ? monthLabels[a.startDate.month - 1] : '';
    const studioRaw = (a.studios || []).slice(0, 1).join('') || '';
    // Évite "Studio Studio Pierrot" quand le nom commence déjà par "Studio"
    const studio = studioRaw && !/^studio\b/i.test(studioRaw) ? `Studio ${studioRaw}` : studioRaw;
    const grad = fallback(fallbackIdx);
    return `
        <div class="sp-row">
            <div class="sp-row-halftone"></div>
            <div class="sp-cover">
                ${a.cover
                    ? `<img src="${escape(a.cover)}" alt="">`
                    : `<div style="width:100%;height:100%;background:${grad};"></div>`}
            </div>
            <div class="sp-content">
                <div class="sp-chip">${escape(a.statusLabel || 'SORTIE')}</div>
                <div class="sp-title">${escape(a.title || '')}</div>
                ${studio ? `<div class="sp-studio">${escape(studio)}</div>` : ''}
            </div>
            <div class="sp-date">
                <div class="sp-date-day">${day}</div>
                <div class="sp-date-month">${escape(month)}</div>
            </div>
        </div>
    `;
}

/**
 * Slide de preview : 4 rows d'animes empilées. Header ("PREVIEW ·
 * AUTOMNE 2026") en haut, footer (brand + index) en bas.
 */
function seasonPreviewSlide({ animes, seasonLabelFr, year, index, total, fallbackOffset = 0 }) {
    const rows = [];
    for (let i = 0; i < 4; i += 1) {
        rows.push(seasonPreviewRow(animes[i], fallbackOffset + i));
    }
    return docShell(`
        <div class="sp-container">
            <div class="sp-header">
                <div class="sp-header-chip">${escape(seasonLabelFr)} ${year}</div>
                <div class="sp-header-title">Preview <span class="accent">saison</span></div>
            </div>
            ${rows.join('')}
            <div class="sp-footer">
                <div class="sp-footer-brand">Bingeki</div>
                <div class="sp-footer-idx">${index}/${total}</div>
            </div>
        </div>
    `);
}

/* =============================================================== */
/* INFO SLIDE                                                      */
/* =============================================================== */
function infoSlide({ eyebrow, titleMain, titleAccent, items = [], index, total }) {
    const rows = items.map((it) => `
        <div class="info-row${it.hero ? ' hero' : ''}">
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

/**
 * Trailer preview slide: full-bleed YouTube thumbnail, a big play glyph
 * on top of a dark scrim, and a "TRAILER" chip. Used by the announcement
 * builder when the anime exposes a `trailer_thumb` (via normalizeAnime).
 */
function trailerSlide({ thumbUrl, title, index, total }) {
    return docShell(`
        <style>
            .trailer-container { position: absolute; inset: 0; background: #000; overflow: hidden; }
            .trailer-thumb { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(0.72) saturate(1.05); }
            .trailer-scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 45%, rgba(0,0,0,0.85) 100%); }
            .trailer-chip {
                position: absolute; top: 60px; left: 60px;
                padding: 14px 22px;
                background: #FF2E63; color: #fff;
                border: 4px solid #000; box-shadow: 8px 8px 0 #000;
                font-family: 'Outfit', sans-serif; font-weight: 900;
                font-size: 42px; letter-spacing: 4px; text-transform: uppercase;
            }
            .trailer-brand {
                position: absolute; top: 60px; right: 60px;
                padding: 12px 20px; background: #fff; border: 4px solid #000; box-shadow: 8px 8px 0 #000;
                font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 38px;
            }
            .trailer-play {
                position: absolute; top: 50%; left: 50%;
                width: 220px; height: 220px; margin: -110px 0 0 -110px;
                background: #fff; border-radius: 50%;
                border: 8px solid #000; box-shadow: 14px 14px 0 #000;
                display: flex; align-items: center; justify-content: center;
            }
            .trailer-play::after {
                content: '';
                width: 0; height: 0;
                border-left: 78px solid #000;
                border-top: 52px solid transparent;
                border-bottom: 52px solid transparent;
                margin-left: 14px;
            }
            .trailer-title {
                position: absolute; bottom: 170px; left: 60px; right: 60px;
                font-family: 'Outfit', sans-serif; font-weight: 900;
                font-size: 68px; line-height: 1; color: #fff;
                text-transform: uppercase; letter-spacing: -1px;
                text-shadow: 4px 4px 0 #000;
            }
            .trailer-cta {
                position: absolute; bottom: 100px; left: 60px;
                padding: 14px 20px; background: #08D9D6; color: #000;
                border: 4px solid #000; box-shadow: 6px 6px 0 #000;
                font-family: 'Outfit', sans-serif; font-weight: 900;
                font-size: 32px; letter-spacing: 3px; text-transform: uppercase;
            }
        </style>
        <div class="trailer-container">
            <img class="trailer-thumb" src="${escape(thumbUrl)}" alt="">
            <div class="trailer-scrim"></div>
            <div class="trailer-chip">Trailer</div>
            <div class="trailer-brand">★ Bingeki</div>
            <div class="trailer-play"></div>
            <div class="trailer-title">${escape(title)}</div>
            <div class="trailer-cta">▶ Regarde sur YouTube</div>
        </div>
        ${slideIdxBadge(index, total)}
    `);
}

/**
 * Announcement synopsis slide, "variant A'". Full-bleed blurred cover in
 * the background, dark scrim, halftone dots — then a rose "SYNOPSIS" chip,
 * the anime title in big Outfit, and the synopsis body with a giant cyan
 * Bangers drop cap. The optional `source` tag surfaces which season the
 * text actually comes from, e.g. "Synopsis Saison 2", when we fall back
 * to the prequel because the sequel's own MAL synopsis is a stub.
 */
function synopsisSlide({ title, body, cover, source, index, total }) {
    // Trim aggressively — Insta carousels crop overflowing text and it
    // looks worse than a clean ellipsis. Room for one full paragraph.
    const MAX = 560;
    const safeBody = body && body.length > MAX
        ? `${body.slice(0, MAX).replace(/\s+\S*$/, '')}…`
        : (body || '');
    return docShell(`
        <div class="cover-fallback" style="background: linear-gradient(180deg, #1a1a1a 0%, #7c3aed 100%);"></div>
        ${cover ? `<img class="syn-cover-bg" src="${escape(cover)}" alt="">` : ''}
        <div class="syn-scrim"></div>
        <div class="syn-halftone"></div>
        <div class="synopsis-chip">Synopsis</div>
        <div class="synopsis-brand">Bingeki</div>
        <div class="synopsis-title">${escape(title)}</div>
        <div class="synopsis-body"><div class="synopsis-body-inner">${escape(safeBody)}</div></div>
        ${source ? `<div class="synopsis-source">${escape(source)}</div>` : ''}
        <div class="intro-brand" style="color:#fff">Bingeki</div>
        <div class="intro-swipe" style="color:#f5f5f5">SWIPE →</div>
        ${slideIdxBadge(index, total)}
    `);
}

/**
 * Return two labels for an announcement date:
 *   - `pre`  — the small label chip (e.g. "PROCHAINEMENT" or "PRÉVU EN")
 *   - `main` — the date value chip (e.g. "1 AVRIL 2027" or "2027")
 *   - `full` — one-line label used in info rows ("Prévu en 2027")
 *
 * Rules:
 *   - Nothing known                 → "PROCHAINEMENT" + "DATE À VENIR"
 *   - Year-only (Tenrai "2027")     → "PRÉVU EN"      + "2027"
 *   - Full date (ISO or parseable)  → "PROCHAINEMENT" + "1 AVRIL 2027"
 */
/**
 * Traduit la valeur `source` de MAL (anglais) en libellé FR éditorial.
 * Valeurs MAL courantes : Original, Manga, Web manga, Light novel,
 * Novel, Visual novel, Game, Music, 4-koma manga, Card game, Book,
 * Picture book, Radio, Mixed media, Other.
 */
function formatSourceLabel(source) {
    if (!source) return null;
    const s = String(source).trim().toLowerCase();
    const MAP = {
        'original': 'Œuvre originale',
        'manga': 'Adapté du manga',
        'web manga': 'Adapté du web manga',
        '4-koma manga': 'Adapté du manga (4-koma)',
        'light novel': 'Adapté du light novel',
        'novel': 'Adapté du roman',
        'visual novel': 'Adapté du visual novel',
        'game': 'Adapté du jeu vidéo',
        'card game': 'Adapté du jeu de cartes',
        'music': 'Adapté d\'une œuvre musicale',
        'book': 'Adapté du livre',
        'picture book': 'Adapté du livre illustré',
        'radio': 'Adapté d\'une émission radio',
        'mixed media': 'Adaptation multi-supports',
    };
    return MAP[s] || null;
}

function formatAnnouncementDate(data) {
    const rawDate = data.aired_from || data.airing_from || '';
    const airedString = (data.aired_string || '').trim();
    // aired.string like "2027 to ?" — extract the leading year when
    // aired.from is missing or already a year string.
    const airedStringYear = airedString.match(/^(\d{4})\s*(to|-)?/i)?.[1];
    if (!rawDate && !airedStringYear) {
        return { pre: 'Prochainement', main: 'Date à venir', full: 'À venir' };
    }
    const candidate = String(rawDate).trim() || airedStringYear || '';
    const yearOnly = /^\d{4}$/.test(candidate);
    if (yearOnly) {
        return { pre: 'Prévu en', main: candidate, full: `Prévu en ${candidate}` };
    }
    const d = new Date(candidate);
    if (!isNaN(d.getTime())) {
        const label = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        return { pre: 'Prochainement', main: label, full: label };
    }
    return { pre: 'Prochainement', main: 'Date à venir', full: 'À venir' };
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

function buildSlidesHTML(type, data, opts = {}) {
    const partInfo = opts.partInfo;
    const slides = [];

    if (type === 'daily') {
        const arr = Array.isArray(data) ? data : [data];
        // Layout dynamique : ≤8 animes → 1 par slide (format premium),
        // >8 → duo (2 par slide) pour densifier sans dépasser le cap
        // Buffer de 10 slides (intro + jusqu'à 8 slides duo + outro = 10
        // → jusqu'à 16 animes visibles).
        const useDuoLayout = arr.length > 8;
        const contentSlideCount = useDuoLayout ? Math.ceil(arr.length / 2) : arr.length;
        const total = contentSlideCount + 2;
        const chipText = partInfo && partInfo.total > 1
            ? `SORTIES DU JOUR · PARTIE ${partInfo.index}/${partInfo.total}`
            : 'SORTIES DU JOUR';
        slides.push({
            name: 'intro',
            html: introSlide({
                typeLabel: "Épisodes anime · aujourd'hui",
                chipText,
                titleMain: `${arr.length}`,
                titleAccent: 'épisodes',
                subtitle: 'La liste juste après →',
                miniCovers: arr.map((a) => a.cover).filter(Boolean),
            }),
        });
        if (useDuoLayout) {
            for (let i = 0; i < arr.length; i += 2) {
                const pair = [arr[i], arr[i + 1] || null];
                const slideIdx = 2 + (i / 2);
                slides.push({
                    name: `anime-duo-${(i / 2) + 1}`,
                    html: animeDuoSlide({
                        pair,
                        index: slideIdx,
                        total,
                        fallbackOffset: i,
                    }),
                });
            }
        } else {
            arr.forEach((a, i) => slides.push({
                name: `anime-${i + 1}`,
                html: animeSlide({
                    cover: a.cover,
                    fallbackGradient: fallback(i),
                    ribbon: 'NEW EP',
                    ribbonVariant: 'ribbon-rose',
                    metas: [
                        { text: a.currentEpisode ? `NOUVEL ÉPISODE ${a.currentEpisode}` : 'NOUVEL ÉPISODE' },
                    ],
                    title: a.title,
                    subtitle: todayLabel().toUpperCase(),
                    index: i + 2, total,
                }),
            }));
        }
        // Multi-part days: on chaque post sauf le dernier, override le
        // CTA outro pour renvoyer vers la partie suivante ("Allez voir la
        // Partie 2/2 sur notre compte"). Le dernier post garde le CTA
        // standard "Suis ta liste · Ouvrir Bingeki".
        const isNotLastPart = partInfo && partInfo.total > 1 && partInfo.index < partInfo.total;
        const outroCta = isNotLastPart
            ? {
                ctaMain: `Voir la Partie ${partInfo.index + 1}/${partInfo.total}`,
                ctaSub: 'Sur notre profil →',
            }
            : {
                ctaMain: 'Suis ta liste',
                ctaSub: 'Ouvrir Bingeki →',
            };
        slides.push({
            name: 'outro',
            html: outroSlide({
                ...outroCta,
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

    if (type === 'announcement_digest') {
        // data = { animes: [{ ... with prequel_* }, ...] }
        const items = Array.isArray(data?.animes) ? data.animes : [];
        const N = items.length;
        const total = N + 2; // intro + N hero-lite + outro

        // Intro : chip PROCHAINEMENT + count + mini covers
        slides.push({
            name: 'intro',
            html: introSlide({
                typeLabel: 'Annonces · cette semaine',
                chipText: 'Prochainement',
                titleMain: `${N}`,
                titleAccent: N > 1 ? 'annonces' : 'annonce',
                subtitle: 'Les sequels à noter →',
                miniCovers: items.map(a => a.cover).filter(Boolean),
            }),
        });

        // 1 hero-lite par anime
        items.forEach((a, i) => {
            const date = formatAnnouncementDate(a);
            const prequel = {
                score: a.prequel_score,
                scored_by: a.prequel_scored_by,
                season_label: a.prequel_season_label,
            };
            slides.push({
                name: `ann-${i + 1}`,
                html: announcementHeroLiteSlide({
                    anime: a,
                    date,
                    prequel,
                    index: i + 2,
                    total,
                    gradientIdx: i,
                }),
            });
        });

        slides.push({
            name: 'outro',
            html: outroSlide({
                ctaMain: 'Ajoute-les à ta watchlist',
                ctaSub: 'Rejoins Bingeki →',
                index: total, total,
            }),
        });
    }

    if (type === 'announcement') {
        // Hero date wording is honest: "PRÉVU EN 2027" when Tenrai only
        // returns a year, a formatted date when it has more, "DATE À VENIR"
        // when it has nothing. Never fakes precision.
        const date = formatAnnouncementDate(data);

        // No synopsis slide — MAL/Tenrai only ship an English stub for
        // upcoming sequels ("Third season of X.") and Gemini translation
        // saturates the free-tier quota. Keeping just the 3 slides users
        // actually engage with: hero, info (with prev season score as
        // hero row), outro.
        const total = 3;
        let idx = 1;

        slides.push({
            name: 'announcement',
            html: animeSlide({
                cover: data.cover,
                fallbackGradient: 'linear-gradient(180deg, #1a1a1a 0%, #7c3aed 100%)',
                ribbon: 'ANNONCE',
                ribbonVariant: 'ribbon-rose',
                metas: [
                    { text: date.pre, variant: 'cyan' },
                    { text: date.main },
                ],
                title: data.title,
                subtitle: (data.studios || []).slice(0, 1).join('') || '',
                index: idx++, total,
            }),
        });

        // Slide info — plus de hero-row "note MAL" (le score seul, sans
        // contexte, n'apportait pas grand-chose et exposait la source).
        // À la place, on affiche des rows éditoriales riches à partir des
        // taxonomies MAL déjà en cache.
        const infoItems = [];

        // 1) Source de l'œuvre : "Adapté du manga" / "Œuvre originale" / …
        const sourceLabel = formatSourceLabel(data.source);
        if (sourceLabel) infoItems.push({ label: 'Source', value: sourceLabel });

        // 2) Studio
        if ((data.studios || []).length) {
            infoItems.push({ label: 'Studio', value: data.studios.join(', ') });
        }

        // 3) Public cible (démographie) — Shounen / Seinen / Josei
        if ((data.demographics || []).length) {
            infoItems.push({ label: 'Public', value: data.demographics.join(' · ') });
        }

        // 4) Genres — top 3 pour rester lisible
        if ((data.genres || []).length) {
            infoItems.push({ label: 'Genres', value: data.genres.slice(0, 3).join(' · ') });
        }

        // 5) Format : "TV · 12 épisodes prévus" ou "TV" si épisodes inconnus
        const formatBits = [];
        if (data.source_type) formatBits.push(String(data.source_type).toUpperCase());
        if (data.episodes) formatBits.push(`${data.episodes} épisodes`);
        if (formatBits.length) infoItems.push({ label: 'Format', value: formatBits.join(' · ') });

        // 6) Sortie
        infoItems.push({ label: 'Sortie', value: date.full });

        slides.push({
            name: 'info',
            html: infoSlide({
                eyebrow: 'Prochainement',
                titleMain: data.title.split(' ').slice(0, 2).join(' '),
                titleAccent: 'ANNONCE',
                items: infoItems,
                index: idx++, total,
            }),
        });
        slides.push({
            name: 'outro',
            html: outroSlide({
                ctaMain: 'Ajoute à ta watchlist',
                ctaSub: 'Rejoins Bingeki →',
                index: idx++, total,
            }),
        });
    }

    if (type === 'season_preview') {
        // data = { animes: [...], seasonLabelFr: 'Automne', year: 2026,
        //          titleWord1: 'AUTOMNE', titleWord2: '' }
        const animes = Array.isArray(data?.animes) ? data.animes : [];
        const perSlide = 4;
        const previewCount = Math.ceil(animes.length / perSlide);
        const total = 1 + previewCount; // intro + preview slides

        slides.push({
            name: 'intro',
            html: seasonPreviewIntroSlide({
                seasonLabelFr: data.seasonLabelFr || 'Saison',
                year: data.year,
                count: animes.length,
                covers: animes.map((a) => a.cover).filter(Boolean).slice(0, 9),
            }),
        });

        for (let i = 0; i < previewCount; i += 1) {
            const chunk = animes.slice(i * perSlide, (i + 1) * perSlide);
            slides.push({
                name: `preview-${i + 1}`,
                html: seasonPreviewSlide({
                    animes: chunk,
                    seasonLabelFr: data.seasonLabelFr || 'Saison',
                    year: data.year,
                    index: i + 2,
                    total,
                    fallbackOffset: i * perSlide,
                }),
            });
        }
    }

    return slides;
}

module.exports = {
    buildSlidesHTML,
    introSlide,
    animeSlide,
    outroSlide,
    seasonPreviewIntroSlide,
    seasonPreviewSlide,
};
