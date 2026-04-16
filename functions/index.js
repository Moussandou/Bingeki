const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { TTL_MS, readCache, writeCache, readTranslation, writeTranslation } = require("./cache");
const { getPathContext, resolveStaticSeo } = require("./seoResolver");
const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const { jikanFetch } = require("./jikan");
const { scrapeFRSynopsis } = require("./scraper");

admin.initializeApp();
const { Resvg } = require("@resvg/resvg-js");
const app = express();

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function fetchImageAsBase64(url) {
    if (!url) return '';
    try {
        const response = await fetch(url);
        if (!response.ok) return '';
        const buffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
    } catch (e) {
        console.error('[SEO] Error fetching image for base64:', e);
        return '';
    }
}

// SVG Template Helper - Hunter License Style
function generateProfileSVG(userData, lang, base64Avatar = '', base64Banner = '') {
    const displayName = escapeHtml(userData.displayName || 'Chasseur');
    const level = userData.level || 1;
    const xp = userData.xp || 0;
    const xpToNextLevel = userData.xpToNextLevel || (level * 100); // Rough approximation
    const streak = userData.streak || 0;
    const badgeCount = (userData.badges || []).length;
    const photoURL = userData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.displayName || 'Bingeki')}`;
    const banner = userData.banner || '';
    const bio = escapeHtml(userData.bio || '');
    const uid = userData.uid ? userData.uid.slice(0, 8).toUpperCase() : 'BINGEKI';

    // Theme colors
    const primaryColor = userData.themeColor || '#FF2E63';
    const borderColor = userData.borderColor || '#000000';
    const bgColor = userData.cardBgColor || '#1e1e1e';
    const textColor = (bgColor === '#000000' || bgColor === '#000' || bgColor === '#121212') ? '#ffffff' : '#e0e0e0';

    // Translations
    const labels = {
        title: lang === 'en' ? 'HUNTER LICENSE' : 'CARTE DE CHASSEUR',
        lvl: 'LVL',
        id: 'ID',
        xp: lang === 'en' ? 'XP' : 'XP',
        streak: lang === 'en' ? 'STREAK' : 'SÉRIE',
        badges: lang === 'en' ? 'BADGES' : 'BADGES',
        stats: lang === 'en' ? 'STATS' : 'STATS'
    };

    const levelLabels = {
        fr: { level: 'NIVEAU', xp: 'EXPÉRIENCE', streak: 'SÉRIE', badges: 'BADGES', verified: 'VÉRIFIÉ' },
        en: { level: 'LEVEL', xp: 'EXPERIENCE', streak: 'STREAK', badges: 'BADGES', verified: 'VERIFIED' }
    }[lang] || { level: 'LEVEL', xp: 'EXPERIENCE', streak: 'STREAK', badges: 'BADGES', verified: 'VERIFIED' };

    // Merge into labels for backwards compatibility in template
    Object.assign(labels, levelLabels);



    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />

        <text x="600" y="315" text-anchor="middle" class="sfx-text" font-size="280">${labels.verified}</text>

        <!-- Main Card (Manga License) -->
        <g transform="translate(100, 100) rotate(-1.5)">
            <!-- Solid Shadow -->
            <rect x="15" y="15" width="1000" height="430" fill="#000" rx="4" />
            <!-- Card Body -->
            <rect width="1000" height="430" class="manga-panel" rx="4" />
            
            <!-- Banner Section -->
            <g transform="translate(10, 10)">
                <rect width="980" height="150" fill="#1a1a1a" rx="2" />
                ${base64Banner ? `<image x="0" y="0" width="980" height="150" xlink:href="${base64Banner}" preserveAspectRatio="xMidYMid slice" opacity="0.4" />` : ''}
                <text x="490" y="90" text-anchor="middle" class="heading" font-size="80" fill="white" opacity="0.1" letter-spacing="20">BINGEKI</text>
            </g>

            <!-- Avatar -->
            <g transform="translate(40, 120)">
                <rect x="8" y="8" width="220" height="220" fill="#000" />
                <rect width="220" height="220" fill="#fff" stroke="#000" stroke-width="4" />
                ${base64Avatar ? `<image x="5" y="5" width="210" height="210" xlink:href="${base64Avatar}" preserveAspectRatio="xMidYMid slice" />` : ''}
            </g>

            <!-- Info Area -->
            <g transform="translate(300, 180)">
                <text x="0" y="40" class="heading" font-size="60" fill="#000" style="text-shadow: 4px 4px 0 rgba(0,0,0,0.1)">${displayName}</text>
                <text x="0" y="80" class="heading" font-size="16" fill="${primaryColor}" letter-spacing="4">HUNTER LICENSE #${userData.uid?.substring(0, 8).toUpperCase()}</text>
                
                <text x="0" y="130" class="body" font-size="22" font-style="italic" fill="#666">${bio ? (bio.length > 60 ? bio.substring(0, 57) + '...' : bio) : ''}</text>
            </g>

            <!-- Stats Grid -->
            <g transform="translate(300, 330)">
                <rect width="150" height="60" class="manga-panel" />
                <text x="75" y="25" text-anchor="middle" class="heading" font-size="12" fill="#666">${labels.level}</text>
                <text x="75" y="50" text-anchor="middle" class="heading" font-size="24">${level}</text>

                <g transform="translate(170, 0)">
                    <rect width="150" height="60" class="manga-panel" />
                    <text x="75" y="25" text-anchor="middle" class="heading" font-size="12" fill="#666">${labels.streak}</text>
                    <text x="75" y="50" text-anchor="middle" class="heading" font-size="24">${streak} 🔥</text>
                </g>
                
                <g transform="translate(340, 0)">
                    <rect width="150" height="60" class="manga-panel" />
                    <text x="75" y="25" text-anchor="middle" class="heading" font-size="12" fill="#666">${labels.badges}</text>
                    <text x="75" y="50" text-anchor="middle" class="heading" font-size="24">${badgeCount} ⭐</text>
                </g>
            </g>
        </g>
    </svg>`;
}

// SVG Template for Anime/Manga Works
function generateWorkSVG(workData, lang, base64Image = '') {
    const title = escapeHtml((lang === 'en' ? workData.title_english : workData.title) || workData.title || 'Work Details');
    const type = escapeHtml(workData.type || 'Manga');
    const status = escapeHtml(workData.status || '');
    const score = workData.score || 'N/A';
    const image = workData.images?.webp?.large_image_url || workData.images?.jpg?.large_image_url || '';
    const genres = (workData.genres || []).slice(0, 3).map(g => g.name).join(' • ');

    const primaryColor = '#FF2E63';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />
        
        <text x="600" y="315" text-anchor="middle" class="sfx-text" font-size="280">WORK DETAILS</text>

        <!-- Manga Shadow for Poster -->
        <rect x="85" y="85" width="340" height="490" fill="#000" />
        <!-- Main Poster -->
        <g transform="translate(80, 80) rotate(-1)">
            <rect width="340" height="490" fill="#fff" stroke="#000" stroke-width="5" />
            <rect x="10" y="10" width="320" height="470" fill="#1a1a1a" />
            ${base64Image ? `<image x="10" y="10" width="320" height="470" xlink:href="${base64Image}" preserveAspectRatio="xMidYMid slice" />` : ''}
        </g>

        <!-- Content Section -->
        <g transform="translate(480, 120)">
            <!-- Type Badge (Brutalist style) -->
            <rect x="10" y="10" width="140" height="50" fill="#000" transform="skewX(-15)" />
            <rect width="140" height="50" fill="${primaryColor}" stroke="#000" stroke-width="3" transform="skewX(-15)" />
            <text x="70" y="32" text-anchor="middle" class="heading" font-size="24" fill="white" transform="skewX(15)">${type}</text>

            <!-- Title (Brutalist style) -->
            <g transform="translate(0, 80) rotate(-1.5)">
                <!-- Shadow -->
                <text x="6" y="6" class="heading" font-size="80" fill="#000" opacity="1">${title.length > 20 ? title.substring(0, 18).toUpperCase() + '...' : title.toUpperCase()}</text>
                <!-- Main Text -->
                <text x="0" y="0" class="heading" font-size="80" fill="#000">${title.length > 20 ? title.substring(0, 18).toUpperCase() + '...' : title.toUpperCase()}</text>
            </g>

            <!-- Info Area -->
            <g transform="translate(0, 260)">
                <text x="0" y="0" class="heading" font-size="24" fill="${primaryColor}" letter-spacing="4">${genres}</text>
                <text x="0" y="40" class="body" font-size="20" font-weight="800" fill="#000" opacity="0.6">${status}</text>
                
                <!-- Rating Panel -->
                <g transform="translate(0, 80) skewX(-10)">
                    <rect width="200" height="80" fill="#000" />
                    <rect x="-5" y="-5" width="200" height="80" fill="#fff" stroke="#000" stroke-width="4" />
                    <text x="100" y="50" text-anchor="middle" class="heading" font-size="48" fill="#000" transform="skewX(10)">★ ${score}</text>
                </g>
            </g>
        </g>
    </svg>`;
}

// SVG Template for News (Redesign)
function generateNewsSVG(newsData, lang, base64Image = '') {
    const title = escapeHtml((lang === 'en' ? newsData.title_en : newsData.title_fr) || newsData.title || 'Bingeki News');
    const source = escapeHtml(newsData.sourceName || 'Actu');
    const date = newsData.publishedAt ? new Date(newsData.publishedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const summary = escapeHtml(newsData.contentSnippet || newsData.excerpt || newsData.summary || '');
    const tag = escapeHtml(newsData.tags?.[0] || (lang === 'en' ? 'News' : 'Actualité'));
    
    const primaryColor = '#FF2E63';
    const orangeBoxColor = '#FF9500';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />
        
        <!-- BINGEKI Background Text -->
        <text x="600" y="320" text-anchor="middle" class="sfx-text" font-size="300" fill="white" opacity="0.03" letter-spacing="-10">BINGEKI</text>

        <!-- Left Image Section -->
        <g transform="translate(60, 60) rotate(-1)">
            <rect x="12" y="12" width="500" height="510" fill="#000" />
            <rect width="500" height="510" fill="#1a1a1a" stroke="white" stroke-width="5" />
            ${base64Image ? `<image width="490" x="5" y="5" height="500" xlink:href="${base64Image}" preserveAspectRatio="xMidYMid slice" />` : ''}
            
            <g transform="translate(30, 30)">
                <rect x="5" y="5" width="140" height="40" fill="#000" />
                <rect width="140" height="40" fill="${primaryColor}" stroke="#000" stroke-width="2" />
                <text x="70" y="27" text-anchor="middle" class="heading" font-size="20" fill="white">${tag}</text>
            </g>
        </g>

        <!-- Right Content Section -->
        <g transform="translate(620, 80)">
            <text x="0" y="0" class="heading" font-size="20" fill="${primaryColor}" letter-spacing="4">${source} • ${date}</text>
            
            <g transform="rotate(1, 0, 80)">
                <foreignObject x="0" y="30" width="520" height="200">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 48px; color: white; line-height: 1.1; text-transform: uppercase;">
                        ${title}
                    </div>
                </foreignObject>
            </g>

            <!-- Orange Summary Box -->
            <g transform="translate(0, 260) rotate(-1)">
                <rect x="12" y="12" width="520" height="230" fill="#000" />
                <rect width="520" height="230" fill="${orangeBoxColor}" stroke="#000" stroke-width="4" />
                
                <g transform="translate(20, -15) rotate(-2)">
                    <rect width="160" height="30" fill="#000" />
                    <text x="80" y="22" text-anchor="middle" class="heading" font-size="14" fill="white">EN UN CLIN D'OEIL</text>
                </g>

                <foreignObject x="25" y="40" width="470" height="170">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Inter', sans-serif; font-weight: 800; font-size: 22px; color: #000; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;">
                        ${summary || title}
                    </div>
                </foreignObject>
            </g>
        </g>
    </svg>`;
}

// --- MOCKUP UI GENERATORS ---

function getSharedSVGDefs(primaryColor) {
    return `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;family=Inter:wght@400;700;800&amp;display=swap');
        .heading { font-family: 'Outfit', sans-serif; font-weight: 900; text-transform: uppercase; }
        .body { font-family: 'Inter', sans-serif; }
        .manga-panel { fill: #fff; stroke: #000; stroke-width: 4; }
        .sfx-text { font-family: 'Outfit', sans-serif; font-weight: 900; text-transform: uppercase; fill: #000; opacity: 0.05; }
    </style>
    <pattern id="mangaDots" width="15" height="15" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.2" fill="black" fill-opacity="0.08" />
    </pattern>
    <pattern id="speedlines" width="1000" height="1000" patternUnits="userSpaceOnUse">
        <g opacity="0.04">
            ${Array.from({ length: 48 }).map((_, i) => `<line x1="600" y1="315" x2="${600 + 1500 * Math.cos(i * 7.5 * Math.PI / 180)}" y2="${315 + 1500 * Math.sin(i * 7.5 * Math.PI / 180)}" stroke="#000" stroke-width="1.5" />`).join('')}
        </g>
    </pattern>
    `;
}

function generateHomeSVG(lang) {
    const primaryColor = '#FF2E63';
    const t = {
        fr: { title1: 'VOTRE HISTOIRE', title2: 'COMMENCE', sfx: 'BINGEKI !!' },
        en: { title1: 'YOUR STORY', title2: 'BEGINS', sfx: 'BINGEKI !!' }
    }[lang] || { title1: 'YOUR STORY', title2: 'BEGINS', sfx: 'BINGEKI !!' };

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />

        <!-- Floating SFX Background Text -->
        <text x="600" y="315" text-anchor="middle" class="heading" font-size="280" fill="#000" opacity="0.04" transform="rotate(-5, 600, 315)">${t.sfx}</text>
        
        <!-- Hero Title (Brutalist style) -->
        <g transform="translate(600, 315) rotate(-2)">
            <!-- Solid Shadow -->
            <text x="8" y="8" text-anchor="middle" class="heading" font-size="140" fill="#000" opacity="1">${t.title1}</text>
            <text x="8" y="148" text-anchor="middle" class="heading" font-size="140" fill="#000" opacity="1">${t.title2}</text>
            
            <!-- Main Text -->
            <text x="0" y="0" text-anchor="middle" class="heading" font-size="140" fill="#000">${t.title1}</text>
            <text x="0" y="140" text-anchor="middle" class="heading" font-size="140" fill="#000">${t.title2}</text>
            
            <!-- Red Outline Highlight -->
            <text x="0" y="0" text-anchor="middle" class="heading" font-size="140" fill="none" stroke="${primaryColor}" stroke-width="2" opacity="0.5">${t.title1}</text>
        </g>

        <!-- CTA Skewed Box -->
        <g transform="translate(600, 520) skewX(-15)">
            <rect x="-160" y="-35" width="320" height="70" fill="#000" />
            <rect x="-165" y="-40" width="320" height="70" fill="${primaryColor}" stroke="#000" stroke-width="3" />
            <text x="0" y="8" text-anchor="middle" class="heading" font-size="28" fill="#000" transform="skewX(15)">REJOINDRE</text>
        </g>

        <!-- Branding -->
        <text x="60" y="60" class="heading" font-size="30" fill="#000">BINGEKI</text>
        <text x="1140" y="600" text-anchor="end" class="heading" font-size="16" fill="#000" opacity="0.3">BINGEKI.WEB.APP</text>
    </svg>`;
}

function generateDiscoverSVG(lang) {
    const primaryColor = '#FF2E63';
    const t = {
        fr: { title: 'DÉCOUVRIR', search: 'RECHERCHER UN ANIME...', featured: 'À LA UNE', sfx: 'ZOOM !!' },
        en: { title: 'DISCOVER', search: 'SEARCH ANIME...', featured: 'FEATURED', sfx: 'ZOOM !!' }
    }[lang] || { title: 'DISCOVER', search: 'SEARCH ANIME...', featured: 'FEATURED', sfx: 'ZOOM !!' };

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />
        
        <text x="1000" y="550" text-anchor="end" class="sfx-text" font-size="280" transform="rotate(-15, 1000, 550)">${t.sfx}</text>

        <!-- Search Bar Mockup -->
        <g transform="translate(200, 40)">
            <rect x="10" y="10" width="800" height="70" fill="#000" rx="4" />
            <rect width="800" height="70" class="manga-panel" rx="4" />
            <text x="40" y="45" class="heading" font-size="24" fill="#000" opacity="0.3">${t.search}</text>
        </g>

        <!-- Hero Section Mockup -->
        <g transform="translate(60, 140) rotate(-1)">
            <rect x="12" y="12" width="1080" height="340" fill="#000" rx="4" />
            <rect width="1080" height="340" fill="#fff" stroke="#000" stroke-width="5" rx="4" />
            
            <!-- Poster -->
            <rect x="30" y="30" width="200" height="280" fill="#222" stroke="#000" stroke-width="3" />
            
            <!-- Content -->
            <g transform="translate(260, 50)">
                <rect width="150" height="40" fill="${primaryColor}" transform="skewX(-15)" stroke="#000" stroke-width="2" />
                <text x="75" y="28" text-anchor="middle" class="heading" font-size="20" fill="white">${t.featured}</text>
                
                <text x="0" y="100" class="heading" font-size="64" fill="#000">SOLO LEVELING</text>
                
                <g transform="translate(0, 180) skewX(-10)">
                    <rect width="240" height="60" fill="${primaryColor}" stroke="#000" stroke-width="3" />
                    <text x="120" y="40" text-anchor="middle" class="heading" font-size="24" fill="white">+ MA LISTE</text>
                </g>
            </g>
        </g>

        <!-- Genre Chips -->
        <g transform="translate(60, 520)">
            ${['ACTION', 'ADVENTURE', 'COMEDY', 'DRAMA', 'FANTASY'].map((g, i) => `
                <g transform="translate(${i * 220}, 0) rotate(${i % 2 ? 1 : -1})">
                    <rect x="5" y="5" width="200" height="55" fill="#000" />
                    <rect width="200" height="55" class="manga-panel" />
                    <text x="100" y="35" text-anchor="middle" class="heading" font-size="20">${g}</text>
                </g>
            `).join('')}
        </g>
    </svg>`;
}

function generateSocialSVG(lang) {
    const primaryColor = '#FF2E63';
    const gold = '#FFD700';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        
        <text x="600" y="315" text-anchor="middle" class="sfx-text" font-size="300" opacity="0.03">LEVEL UP</text>

        <text x="600" y="80" text-anchor="middle" class="heading" font-size="70" fill="#000" style="text-shadow: 6px 6px 0 rgba(0,0,0,0.1)">CLASSEMENT</text>

        <!-- Podium Mockup -->
        <g transform="translate(200, 150)">
            <!-- 2nd Place -->
            <g transform="translate(0, 100) rotate(-2)">
                <rect x="10" y="10" width="200" height="200" fill="#000" />
                <rect width="200" height="200" class="manga-panel" />
                <text x="100" y="100" text-anchor="middle" class="heading" font-size="120" fill="#eee" opacity="0.3">2</text>
                <text x="100" y="160" text-anchor="middle" class="heading" font-size="24">YUMI</text>
            </g>
            <!-- 1st Place -->
            <g transform="translate(250, 0) scale(1.1) rotate(1)">
                <rect x="12" y="12" width="300" height="300" fill="#000" />
                <rect width="300" height="300" fill="#fff" stroke="${primaryColor}" stroke-width="8" />
                <text x="150" y="150" text-anchor="middle" class="heading" font-size="180" fill="${primaryColor}" opacity="0.1">1</text>
                <text x="150" y="180" text-anchor="middle" class="heading" font-size="32">JIN-WOO</text>
                <text x="150" y="230" text-anchor="middle" class="heading" font-size="22" fill="${primaryColor}">15,420 XP</text>
            </g>
            <!-- 3rd Place -->
            <g transform="translate(600, 140) rotate(3)">
                <rect x="10" y="10" width="200" height="160" fill="#000" />
                <rect width="200" height="160" class="manga-panel" />
                <text x="100" y="80" text-anchor="middle" class="heading" font-size="100" fill="#eee" opacity="0.3">3</text>
                <text x="100" y="130" text-anchor="middle" class="heading" font-size="20">TAKUMI</text>
            </g>
        </g>
    </svg>`;
}

function generateScheduleSVG(lang) {
    const primaryColor = '#FF2E63';
    const days = lang === 'en' ? ['MON', 'TUE', 'WED', 'THU', 'FRI'] : ['LUN', 'MAR', 'MER', 'JEU', 'VEN'];

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        
        <text x="600" y="315" text-anchor="middle" class="sfx-text" font-size="200" opacity="0.04">PLANNING</text>
        
        <g transform="translate(60, 100)">
            ${days.map((day, i) => `
                <g transform="translate(${i * 220}, ${i % 2 ? 20 : 0})">
                    <rect x="8" y="8" width="200" height="480" fill="#000" rx="4" />
                    <rect width="200" height="480" class="manga-panel" rx="4" />
                    <rect width="200" height="60" fill="${i === 2 ? primaryColor : '#000'}" rx="4" />
                    <text x="100" y="40" text-anchor="middle" class="heading" font-size="24" fill="white">${day}</text>
                    
                    <g transform="translate(10, 80)">
                        <rect width="180" height="110" fill="#eee" stroke="#000" stroke-width="2" />
                        <text x="10" y="30" class="heading" font-size="14" fill="${primaryColor}">18:30</text>
        <text x="10" y="60" class="heading" font-size="18">JUJUTSU</text>
                        <text x="10" y="85" class="heading" font-size="18">KAISEN</text>
                    </g>
                </g>
            `).join('')}
        </g>
    </svg>`;
}

function generateLibrarySVG(lang) {
    const primaryColor = '#FF2E63';
    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <text x="600" y="315" text-anchor="middle" class="sfx-text" font-size="300" opacity="0.05" fill="white">MANGAS</text>

        <text x="60" y="90" class="heading" font-size="60" fill="white" style="text-shadow: 6px 6px 0 ${primaryColor}">MA MÉDIATHÈQUE</text>
        
        <g transform="translate(60, 150)">
            ${Array.from({ length: 12 }).map((_, i) => {
                const x = (i % 6) * 185;
                const y = Math.floor(i / 6) * 220;
                return `
                <g transform="translate(${x}, ${y}) rotate(${i % 3 - 1})">
                    <rect x="6" y="6" width="170" height="200" fill="${primaryColor}" />
                    <rect width="170" height="200" fill="#222" stroke="white" stroke-width="3" />
                    <rect y="160" width="170" height="40" fill="rgba(0,0,0,0.9)" />
                </g>
                `;
            }).join('')}
        </g>
    </svg>`;
}

function generateChallengesSVG(lang) {
    const primaryColor = '#FF2E63';
    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <text x="600" y="315" text-anchor="middle" class="sfx-text" font-size="250" opacity="0.03">QUEST !!</text>
        
        <text x="60" y="80" class="heading" font-size="60" fill="#000">DÉFIS ACTIFS</text>

        <g transform="translate(60, 150)">
            ${[
                { title: 'COURSE AU CHAPITRE 1000', progress: 85, icon: '⚔️' },
                { title: 'MARATHON SAISONNIER', progress: 40, icon: '🔥' },
                { title: 'CHALLENGE LECTURE D\'ÉTÉ', progress: 95, icon: '📜' }
            ].map((c, i) => `
                <g transform="translate(0, ${i * 150}) rotate(-0.5)">
                    <rect x="12" y="12" width="1080" height="120" fill="#000" />
                    <rect width="1080" height="120" class="manga-panel" />
                    
                    <text x="30" y="75" class="heading" font-size="36" fill="#000">${c.icon} ${c.title}</text>
                    
                    <rect x="700" y="45" width="300" height="30" fill="#eee" stroke="#000" stroke-width="3" />
                    <rect x="700" y="45" width="${c.progress * 3}" height="30" fill="${primaryColor}" />
                    <text x="1020" y="75" class="heading" font-size="28">${c.progress}%</text>
                </g>
            `).join('')}
        </g>
    </svg>`;
}

function generateGenericSVG(title, description, lang) {
    const cleanTitle = escapeHtml(title || 'Bingeki');
    const primaryColor = '#FF2E63';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>${getSharedSVGDefs(primaryColor)}</defs>
        
        <rect width="1200" height="630" fill="#f4f4f4" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />
        
        <!-- Large SFX Background -->
        <text x="600" y="350" text-anchor="middle" class="sfx-text" font-size="320" letter-spacing="-10">BINGEKI</text>
        
        <!-- Main Panel (Manga Style) -->
        <g transform="translate(600, 315) rotate(-2)">
            <!-- Solid Shadow -->
            <rect x="-440" y="-140" width="900" height="300" fill="#000" rx="4" />
            
            <!-- Main Box -->
            <rect x="-450" y="-150" width="900" height="300" fill="#fff" stroke="#000" stroke-width="6" rx="4" />
            
            <!-- Title -->
            <text x="0" y="20" text-anchor="middle" class="heading" font-size="96" fill="#000" style="text-shadow: 6px 6px 0 rgba(0,0,0,0.1)">${cleanTitle}</text>
            
            <!-- Accent Line -->
            <rect x="-150" y="70" width="300" height="15" fill="${primaryColor}" />
        </g>
        
        <!-- Footer Decoration -->
        <text x="600" y="580" text-anchor="middle" class="heading" font-size="18" fill="#000" opacity="0.4" letter-spacing="10">JOIN THE ADVENTURE</text>
        <text x="600" y="615" text-anchor="middle" class="heading" font-size="14" fill="#000" opacity="0.3">bingeki.web.app</text>
    </svg>`;
}

// New route for directly serving the OG image binary (SVG)
app.get('/api/og-image/:type?/:id?', async (req, res) => {
    const { type, id } = req.params;
    const lang = req.query.lang || 'fr';
    const title = req.query.title || '';
    const desc = req.query.desc || '';

    try {
        let svg;
        if (type === 'profile' && id) {
            const userDoc = await admin.firestore().collection('users').doc(id).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                const avatarUrl = userData.photoURL;
                const bannerUrl = userData.banner;

                // Fetch images in parallel
                const [base64Avatar, base64Banner] = await Promise.all([
                    fetchImageAsBase64(avatarUrl),
                    fetchImageAsBase64(bannerUrl)
                ]);

                svg = generateProfileSVG(userData, lang, base64Avatar, base64Banner);
            }
        } else if (type === 'news' && id) {
            const newsDoc = await admin.firestore().collection('news').doc(id).get();
            if (newsDoc.exists) {
                const newsData = newsDoc.data();
                const imageUrl = newsData.imageUrl || newsData.image; // Fix: Support both field names
                const base64Image = await fetchImageAsBase64(imageUrl);
                svg = generateNewsSVG(newsData, lang, base64Image);
            }
        } else if (type === 'work' && id) {
            // New case for specific work details
            const workType = req.query.workType || 'anime';
            const cacheKey = `${workType}_details_${id}`;
            const cached = await readCache(cacheKey, 86400000 * 7); // 7 days TTL for SEO images
            let workData = cached.hit ? cached.data : null;

            if (!workData) {
                try {
                    workData = await jikanFetch(`/${workType}/${id}/full`);
                    if (workData) await writeCache(cacheKey, workData);
                } catch (e) {
                    console.error('[OG-IMAGE] Failed to fetch fallback work data:', e);
                }
            }

                svg = generateWorkSVG(workData, lang, base64Image);
            } else {
                svg = generateGenericSVG(title, desc, lang);
            }
        } else if (type === 'home') {
            svg = generateHomeSVG(lang);
        } else if (type === 'discover' || type === 'trending') {
            svg = generateDiscoverSVG(lang);
        } else if (type === 'social') {
            svg = generateSocialSVG(lang);
        } else if (type === 'schedule') {
            svg = generateScheduleSVG(lang);
        } else if (type === 'library') {
            svg = generateLibrarySVG(lang);
        } else if (type === 'challenges') {
            svg = generateChallengesSVG(lang);
        } else if (type === 'newsIndex') {
            svg = generateGenericSVG(lang === 'en' ? 'LATEST NEWS' : 'DERNIÈRES NEWS', '', lang);
        } else if (type === 'character' || type === 'person' || type === 'tierlist') {
            const kindLabels = {
                fr: {
                    character: 'Personnage',
                    person: 'Personnalité',
                    tierlist: 'Tier List'
                },
                en: {
                    character: 'Character',
                    person: 'Person',
                    tierlist: 'Tier List'
                }
            };
            const kindLabel = kindLabels[lang]?.[type] || kindLabels['fr'][type] || '';
            svg = generateGenericSVG(kindLabel || title, desc, lang);
        }

        if (!svg) {
            svg = generateGenericSVG(title, desc, lang);
        }

        // Convert SVG to PNG using Resvg
        const resvg = new Resvg(svg, {
            fitTo: {
                mode: 'width',
                value: 1200,
            },
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 24h cache for images
        return res.send(pngBuffer);
    } catch (e) {
        console.error('[OG-IMAGE] Error generating PNG:', e);
        return res.status(500).send('Internal Error');
    }
});

app.get('/*', async (req, res) => {
    const url = req.url;

    // Prevent SEO handler from serving HTML for static assets that are 404ing
    if (url.includes('.') || url.startsWith('/assets/')) {
        return res.status(404).send('Not Found');
    }

    const { lang, localPath } = getPathContext(url);
    const resolved = resolveStaticSeo(localPath, lang);
    let title = resolved.title;
    let description = resolved.description;
    let image = resolved.image;
    const parts = localPath.split('/').filter(Boolean);
    const profileUid = parts[0] === 'profile' && parts[1] ? parts[1] : null;
    const articleSlug = parts[0] === 'news' && parts[1] === 'article' && parts[2] ? parts[2] : null;
    const workId = parts[0] === 'work' && parts[1] ? parts[1] : null;
    const characterId = parts[0] === 'character' && parts[1] ? parts[1] : null;
    const personId = parts[0] === 'person' && parts[1] ? parts[1] : null;
    const tierlistId = parts[0] === 'tierlist' && parts[1] && parts[1] !== 'create' ? parts[1] : null;

    // Load Data based on Route
    if (profileUid) {
        try {
            const userDoc = await admin.firestore().collection('users').doc(profileUid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                title = lang === 'en' ? `${userData.displayName || 'User'}'s Profile | Bingeki` : `Profil de ${userData.displayName || 'Utilisateur'} | Bingeki`;
                description = userData.bio || (lang === 'en' ? `Check out ${userData.displayName || 'User'}'s progress on Bingeki!` : `Découvrez la progression de ${userData.displayName || 'Utilisateur'} sur Bingeki !`);
                image = `https://bingeki.web.app/api/og-image/profile/${profileUid}?lang=${lang}&v=${userData.lastUpdated?.seconds || Date.now()}`;
            }
        } catch (e) {
            console.error('[SEO] Firestore error (Profile):', e);
        }
    } else if (articleSlug) {
        try {
            const newsSnapshot = await admin.firestore().collection('news').doc(articleSlug).get();
            if (newsSnapshot.exists) {
                const newsData = newsSnapshot.data();
                title = (lang === 'en' ? newsData.title_en : newsData.title_fr) || newsData.title || title;
                description = newsData.contentSnippet || newsData.excerpt || newsData.summary || newsData.content?.substring(0, 200).replace(/<[^>]*>/g, '') || description;
                image = `https://bingeki.web.app/api/og-image/news/${articleSlug}?lang=${lang}`;
            }
        } catch (e) {
            console.error('[SEO] Firestore error (News):', e);
        }
    } else if (workId) {
        try {
            // For work pages, we try to get data to have a beautiful OG image
            const workType = localPath.startsWith('/anime') ? 'anime' : 'manga';
            const cacheKey = `${workType}_details_${workId}`;
            const cached = await readCache(cacheKey, TTL_MS.DETAILS);

            let workData = cached.hit ? cached.data : null;
            if (!workData) {
                workData = await jikanFetch(`/${workType}/${workId}/full`);
                if (workData) await writeCache(cacheKey, workData);
            }

            if (workData) {
                title = (lang === 'en' ? workData.title_english : workData.title) || workData.title || title;
                description = (lang === 'en' ? workData.synopsis : (await readTranslation(`fr_${workType}_${workId}`)).synopsis || workData.synopsis) || description;
                description = description.substring(0, 200).replace(/<[^>]*>/g, '') + '...';
                image = `https://bingeki.web.app/api/og-image/work/${workId}?lang=${lang}&workType=${workType}`;
            }
        } catch (e) {
            console.error('[SEO] Error fetching work data for SEO:', e);
        }
    } else {
        let ogType = resolved.pageType || 'generic';
        if (characterId) ogType = 'character';
        if (personId) ogType = 'person';
        if (tierlistId) ogType = 'tierlist';
        
        image = `https://bingeki.web.app/api/og-image/${ogType}?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}&lang=${lang}`;
    }

    // Append .png extension hint or ensures it's treated as image
    if (image && !image.includes('.png') && !image.includes('?')) {
        image += '.png';
    } else if (image && !image.includes('.png')) {
        // Social crawlers sometimes prefer seeing an extension
        image += '&ext=.png';
    }

    const indexFileName = lang === 'en' ? 'index-en.html' : 'index.html';
    const indexPath = path.join(__dirname, indexFileName);
    let html;
    try {
        html = fs.readFileSync(indexPath, 'utf8');
    } catch (e) {
        try {
            html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        } catch (e2) {
            return res.status(500).send('Maintenance en cours... (SEO Error)');
        }
    }

    const finalTitle = escapeHtml(title);
    const finalDesc = escapeHtml(description);
    const finalImage = image;
    const finalUrl = escapeHtml(`https://bingeki.web.app${url}`);
    const finalLocale = resolved.locale;
    const finalAlternateLocale = resolved.alternateLocale;

    html = html
        .replace(/<title>[^]*?<\/title>/g, `<title>${finalTitle}</title>`)
        .replace(/<meta\s+name="title"\s+content="[^]*?"\s*\/?>/g, `<meta name="title" content="${finalTitle}" />`)
        .replace(/<meta\s+name="description"\s+content="[^]*?"\s*\/?>/g, `<meta name="description" content="${finalDesc}" />`)
        .replace(/<meta\s+property="og:title"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:title" content="${finalTitle}" />`)
        .replace(/<meta\s+property="og:description"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:description" content="${finalDesc}" />`)
        .replace(/<meta\s+property="og:image"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:image" content="${finalImage}" />`)
        .replace(/<meta\s+property="og:url"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:url" content="${finalUrl}" />`)
        .replace(/<meta\s+property="og:locale"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:locale" content="${finalLocale}" />`)
        .replace(/<meta\s+property="og:locale:alternate"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:locale:alternate" content="${finalAlternateLocale}" />`)
        .replace(/<link\s+rel="canonical"\s+href="[^]*?"\s*\/?>/g, `<link rel="canonical" href="${finalUrl}" />`)
        .replace(/<meta\s+name="twitter:title"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:title" content="${finalTitle}" />`)
        .replace(/<meta\s+name="twitter:description"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:description" content="${finalDesc}" />`)
        .replace(/<meta\s+name="twitter:url"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:url" content="${finalUrl}" />`)
        .replace(/<meta\s+name="twitter:image"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:image" content="${finalImage}" />`)
        .replace(/<meta\s+name="twitter:card"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:card" content="summary_large_image" />`);

    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://www.google-analytics.com https://ssl.google-analytics.com https://www.gstatic.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.jikan.moe https://api.trace.moe https://graphql.anilist.co https://*.googleapis.com https://firebase.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.cloudfunctions.net https://www.google-analytics.com https://accounts.google.com https://discord.com; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://discord.com; object-src 'none';");
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
    res.set('X-SEO-Handler', 'true');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(html);
});

exports.seoHandler = onRequest(app);

// --- XP & GAMIFICATION MANAGEMENT (SERVER-SIDE) ---

const LEVEL_BASE = 100;
const LEVEL_MULTIPLIER = 1.15;
const MAX_LEVEL = 100;

const XP_REWARDS = {
    ADD_WORK: 15,
    UPDATE_PROGRESS: 5, // 5 XP per episode/chapter (more sustainable than 10)
    COMPLETE_WORK: 50,
};

// Anti-Cheat Caps
const MAX_EPISODES = 2500; // No anime currently has more than ~7000, 2500 is a safe progress cap for XP
const MAX_CHAPTERS = 5000;
const MAX_XP_PER_WORK = 15000; // Absolute max XP a single work can provide

// --- BADGE DEFINITIONS (Server-side source of truth) ---
const BADGE_DEFINITIONS = [
    { id: 'first_steps', name: 'Premiers Pas', description: 'Créer un compte Bingeki', icon: 'flag', rarity: 'common' },
    { id: 'first_work', name: 'Bibliophile', description: 'Ajouter votre première œuvre', icon: 'book', rarity: 'common' },
    { id: 'reader_5', name: 'Lecteur Assidu', description: 'Lire 5 chapitres', icon: 'book-open', rarity: 'common' },
    { id: 'reader_25', name: 'Dévoreur', description: 'Lire 25 chapitres', icon: 'flame', rarity: 'rare' },
    { id: 'reader_100', name: 'Binge Reader', description: 'Lire 100 chapitres', icon: 'zap', rarity: 'epic' },
    { id: 'collector_5', name: 'Collectionneur', description: 'Ajouter 5 œuvres', icon: 'library', rarity: 'common' },
    { id: 'collector_10', name: 'Amateur', description: 'Ajouter 10 œuvres', icon: 'layers', rarity: 'rare' },
    { id: 'collector_25', name: 'Otaku', description: 'Ajouter 25 œuvres', icon: 'database', rarity: 'epic' },
    { id: 'streak_3', name: 'Régulier', description: 'Maintenir un streak de 3 jours', icon: 'timer', rarity: 'common' },
    { id: 'streak_7', name: 'Motivé', description: 'Maintenir un streak de 7 jours', icon: 'calendar-check', rarity: 'rare' },
    { id: 'streak_30', name: 'Inarrêtable', description: 'Maintenir un streak de 30 jours', icon: 'crown', rarity: 'legendary' },
    { id: 'first_complete', name: 'Finisher', description: 'Terminer votre première œuvre', icon: 'check-circle', rarity: 'common' },
    { id: 'complete_5', name: 'Complétiste', description: 'Terminer 5 œuvres', icon: 'target', rarity: 'rare' },
    { id: 'level_5', name: 'Novice', description: 'Atteindre le niveau 5', icon: 'star', rarity: 'common' },
    { id: 'level_10', name: 'Apprenti', description: 'Atteindre le niveau 10', icon: 'medal', rarity: 'rare' },
    { id: 'level_25', name: 'Expert', description: 'Atteindre le niveau 25', icon: 'award', rarity: 'epic' },
    { id: 'level_50', name: 'Légende', description: 'Atteindre le niveau 50', icon: 'trophy', rarity: 'legendary' },
];

/**
 * Determine which badges a user has earned based on their stats.
 * Preserves existing badge unlock timestamps.
 */
function calculateBadges(stats, streak, existingBadges = []) {
    const existingMap = {};
    existingBadges.forEach(b => { existingMap[b.id] = b; });

    const earnedIds = new Set();

    // Collection badges
    if (stats.totalWorksAdded >= 1) earnedIds.add('first_work');
    if (stats.totalWorksAdded >= 5) earnedIds.add('collector_5');
    if (stats.totalWorksAdded >= 10) earnedIds.add('collector_10');
    if (stats.totalWorksAdded >= 25) earnedIds.add('collector_25');

    // Reader badges
    if (stats.totalChaptersRead >= 5) earnedIds.add('reader_5');
    if (stats.totalChaptersRead >= 25) earnedIds.add('reader_25');
    if (stats.totalChaptersRead >= 100) earnedIds.add('reader_100');

    // Streak badges
    if (streak >= 3) earnedIds.add('streak_3');
    if (streak >= 7) earnedIds.add('streak_7');
    if (streak >= 30) earnedIds.add('streak_30');

    // Completion badges
    if (stats.totalWorksCompleted >= 1) earnedIds.add('first_complete');
    if (stats.totalWorksCompleted >= 5) earnedIds.add('complete_5');

    // Level badges
    if (stats.level >= 5) earnedIds.add('level_5');
    if (stats.level >= 10) earnedIds.add('level_10');
    if (stats.level >= 25) earnedIds.add('level_25');
    if (stats.level >= 50) earnedIds.add('level_50');

    // first_steps is always earned (they have an account)
    earnedIds.add('first_steps');

    // Build badges array, preserving existing timestamps
    const badges = [];
    for (const id of earnedIds) {
        if (existingMap[id]) {
            badges.push(existingMap[id]); // Keep original unlock time
        } else {
            const def = BADGE_DEFINITIONS.find(d => d.id === id);
            if (def) {
                badges.push({ ...def, unlockedAt: Date.now() });
            }
        }
    }

    return badges;
}

/**
 * Core logic to calculate user stats based on their library and bonus XP.
 */
function calculateUserStats(libraryWorks, bonusXp = 0) {
    let totalChaptersRead = 0;
    let totalAnimeEpisodesWatched = 0;
    let totalMoviesWatched = 0;
    const totalWorksAdded = libraryWorks.length;
    let totalWorksCompleted = 0;
    let totalXpFromLibrary = 0;

    libraryWorks.forEach(w => {
        const progress = w.currentChapter || w.currentEpisode || 0;
        const total = w.totalChapters || w.totalEpisodes || 0;
        const type = (w.type || 'manga').toLowerCase();

        // 1. Calculate base XP for adding the work
        totalXpFromLibrary += XP_REWARDS.ADD_WORK;

        // 2. Anti-cheat: calculate effective progress for XP
        let effectiveProgress = 0;
        if (total && total > 0) {
            effectiveProgress = Math.min(progress, total);
        }

        // 3. Apply Hard Caps for XP calculation
        if (type === 'anime' || type === 'manga') {
            const cap = type === 'anime' ? MAX_EPISODES : MAX_CHAPTERS;
            effectiveProgress = Math.min(effectiveProgress, cap);

            if (type === 'anime') {
                if (w.format === 'Movie') {
                    totalMoviesWatched += (w.status === 'completed' ? 1 : 0);
                    // Movies are 1 unit.
                    totalXpFromLibrary += (w.status === 'completed' ? XP_REWARDS.UPDATE_PROGRESS : 0);
                } else {
                    effectiveProgress = Math.min(progress, MAX_EPISODES);
                    totalAnimeEpisodesWatched += effectiveProgress;
                    totalXpFromLibrary += Math.min(effectiveProgress * XP_REWARDS.UPDATE_PROGRESS, MAX_XP_PER_WORK);
                }
            } else {
                effectiveProgress = Math.min(progress, MAX_CHAPTERS);
                totalChaptersRead += effectiveProgress;
                totalXpFromLibrary += Math.min(effectiveProgress * XP_REWARDS.UPDATE_PROGRESS, MAX_XP_PER_WORK);
            }
        } else {
            // Default to Manga-like behavior if unknown type
            effectiveProgress = Math.min(progress, MAX_CHAPTERS);
            totalChaptersRead += effectiveProgress;
            totalXpFromLibrary += Math.min(effectiveProgress * XP_REWARDS.UPDATE_PROGRESS, MAX_XP_PER_WORK);
        }

        // 4. Bonus for completion
        if (w.status === 'completed') {
            totalWorksCompleted += 1;
            totalXpFromLibrary += XP_REWARDS.COMPLETE_WORK;
        }
    });

    const totalXp = totalXpFromLibrary + bonusXp;

    // Derive Level
    let level = 1;
    let remainingXp = totalXp;
    let xpToNext = LEVEL_BASE;

    while (remainingXp >= xpToNext && level < MAX_LEVEL) {
        remainingXp -= xpToNext;
        level++;
        xpToNext = Math.floor(xpToNext * LEVEL_MULTIPLIER);
    }

    return {
        level,
        xp: remainingXp, // current level progress
        totalXp,         // cumulative
        xpToNextLevel: xpToNext,
        totalChaptersRead,
        totalAnimeEpisodesWatched,
        totalMoviesWatched,
        totalWorksAdded,
        totalWorksCompleted
    };
}

/**
 * Trigger: Update user stats, badges, and activity feed whenever their library changes.
 */
exports.onLibraryUpdate = onDocumentWritten('users/{userId}/data/library', async (event) => {
    const userId = event.params.userId;
    const change = event.data;
    if (!change) return null;
    const libraryData = change.after.exists ? change.after.data() : { works: [] };
    const works = libraryData.works || [];

    // Previous library state (for activity detection)
    const prevLibraryData = change.before.exists ? change.before.data() : { works: [] };
    const prevWorks = prevLibraryData.works || [];

    try {
        // Fetch gamification doc for bonusXp, streak, and existing badges
        const gamificationSnap = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('data')
            .doc('gamification')
            .get();

        const gamData = gamificationSnap.exists ? gamificationSnap.data() : {};
        const bonusXp = gamData.bonusXp || 0;
        const streak = gamData.streak || 0;
        const lastActivityDate = gamData.lastActivityDate || null;
        const existingBadges = gamData.badges || [];

        const stats = calculateUserStats(works, bonusXp);

        // Calculate badges server-side
        const badges = calculateBadges(stats, streak, existingBadges);

        // Update Root User Profile (Leaderboard source)
        // Include streak and lastActivityDate so cross-device sync works correctly
        await admin.firestore().collection('users').doc(userId).set({
            ...stats,
            badges,
            streak,
            lastActivityDate,
            bonusXp,
            lastUpdated: FieldValue.serverTimestamp()
        }, { merge: true });

        // Update Gamification Doc (Data integrity)
        // Keep streak and lastActivityDate from existing data (managed client-side)
        await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('data')
            .doc('gamification')
            .set({
                ...stats,
                badges,
                streak,
                lastActivityDate,
                bonusXp,
                lastUpdated: Date.now()
            }, { merge: true });

        // --- AUTO ACTIVITY LOGGING ---
        // Detect changes between previous and current library
        try {
            const userDoc = await admin.firestore().collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const userName = userData.displayName || 'Héros';
            const userPhoto = userData.photoURL || '';
            const isVisible = userData.showActivityStatus !== false;
            const profileVisibility = userData.profileVisibility || 'public';

            const prevWorkMap = {};
            prevWorks.forEach(w => { prevWorkMap[w.id] = w; });

            const activitiesToLog = [];

            for (const work of works) {
                const prev = prevWorkMap[work.id];

                if (!prev) {
                    // New work added
                    activitiesToLog.push({
                        userId,
                        userName,
                        userPhoto,
                        type: 'add_work',
                        workId: work.id,
                        workTitle: work.title,
                        workImage: work.image || '',
                        workType: (work.type || 'manga').toLowerCase(),
                        isVisible,
                        profileVisibility,
                        timestamp: Date.now()
                    });
                } else if (work.status === 'completed' && prev.status !== 'completed') {
                    // Work completed
                    activitiesToLog.push({
                        userId,
                        userName,
                        userPhoto,
                        type: 'complete',
                        workId: work.id,
                        workTitle: work.title,
                        workImage: work.image || '',
                        workType: (work.type || 'manga').toLowerCase(),
                        isVisible,
                        profileVisibility,
                        timestamp: Date.now()
                    });
                } else if ((work.currentChapter || 0) > (prev.currentChapter || 0)) {
                    // Progress update (only log if significant: >= 5 units difference to avoid spam)
                    const diff = (work.currentChapter || 0) - (prev.currentChapter || 0);
                    if (diff >= 5) {
                        const workType = (work.type || 'manga').toLowerCase();
                        activitiesToLog.push({
                            userId,
                            userName,
                            userPhoto,
                            type: workType === 'anime' ? 'watch' : 'read',
                            workId: work.id,
                            workTitle: work.title,
                            workImage: work.image || '',
                            workType: workType,
                            isVisible,
                            profileVisibility,
                            episodeNumber: work.currentChapter || 0,
                            timestamp: Date.now()
                        });
                    }
                }
            }

            // Batch write activities (limit to 5 per update to prevent spam)
            const batch = admin.firestore().batch();
            const limitedActivities = activitiesToLog.slice(0, 5);
            for (const activity of limitedActivities) {
                const actRef = admin.firestore().collection('activities').doc();
                batch.set(actRef, { ...activity, id: actRef.id });
            }
            if (limitedActivities.length > 0) {
                await batch.commit();
                console.log(`[Activity] Logged ${limitedActivities.length} activities for user ${userId}`);
            }
        } catch (actError) {
            // Don't fail the whole trigger if activity logging fails
            console.error(`[Activity] Error logging activities for ${userId}:`, actError);
        }

        console.log(`[Gamification] Recalculated stats + badges for user ${userId}`);
        return null;
    } catch (error) {
        console.error(`[Gamification] Error updating user ${userId}:`, error);
        return null;
    }
});


/**
 * Admin: Force recalculation for all users.
 */
exports.recalculateAllUserStats = onCall({
    timeoutSeconds: 540,
    memory: '1GiB',
    cors: true
}, async (request) => {
    // Check admin permissions
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const callerDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
    if (!callerDoc.exists || !callerDoc.data().isAdmin) {
        throw new HttpsError('permission-denied', 'Admin access required.');
    }

    const usersSnap = await admin.firestore().collection('users').get();
    const results = {
        total: usersSnap.size,
        updated: 0,
        errors: 0
    };

    const batch = admin.firestore().batch();
    let batchCount = 0;

    for (const userDoc of usersSnap.docs) {
        const userId = userDoc.id;
        try {
            const librarySnap = await admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('data')
                .doc('library')
                .get();

            const works = librarySnap.exists ? (librarySnap.data().works || []) : [];

            const gamificationSnap = await admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('data')
                .doc('gamification')
                .get();

            const gamData = gamificationSnap.exists ? gamificationSnap.data() : {};
            const bonusXp = gamData.bonusXp || 0;
            const streak = gamData.streak || 0;
            const existingBadges = gamData.badges || [];

            const stats = calculateUserStats(works, bonusXp);
            const badges = calculateBadges(stats, streak, existingBadges);

            // Update Root User
            batch.set(admin.firestore().collection('users').doc(userId), {
                ...stats,
                badges,
                lastUpdated: FieldValue.serverTimestamp()
            }, { merge: true });

            // Update Gamification Doc
            batch.set(admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('data')
                .doc('gamification'), {
                ...stats,
                badges,
                lastUpdated: Date.now()
            }, { merge: true });

            results.updated++;
            batchCount++;

            if (batchCount >= 200) {
                await batch.commit();
                batchCount = 0;
            }
        } catch (e) {
            console.error(`Error processing user ${userId}:`, e);
            results.errors++;
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    return results;
});

/**
 * Public: Server-side leaderboard query.
 * Returns authoritative rankings from root user docs.
 */
exports.getLeaderboard = onCall({ cors: true }, async (request) => {
    const data = request.data || {};
    const category = data.category || 'xp';
    const limitCount = Math.min(data.limit || 20, 100);

    const fieldMap = {
        'xp': 'totalXp',
        'chapters': 'totalChaptersRead',
        'episodes': 'totalAnimeEpisodesWatched',
        'streak': 'streak'
    };

    const field = fieldMap[category] || 'totalXp';

    try {
        const usersSnap = await admin.firestore()
            .collection('users')
            .orderBy(field, 'desc')
            .limit(limitCount)
            .get();

        const leaderboard = [];
        let rank = 1;
        for (const userDoc of usersSnap.docs) {
            const d = userDoc.data();
            leaderboard.push({
                uid: userDoc.id,
                displayName: d.displayName || null,
                username: d.username || null,
                photoURL: d.photoURL || null,
                level: d.level || 1,
                totalXp: d.totalXp || 0,
                totalChaptersRead: d.totalChaptersRead || 0,
                totalAnimeEpisodesWatched: d.totalAnimeEpisodesWatched || 0,
                totalWorksCompleted: d.totalWorksCompleted || 0,
                streak: d.streak || 0,
                rank
            });
            rank++;
        }

        return { leaderboard };
    } catch (error) {
        console.error('[Leaderboard] Error:', error);
        throw new HttpsError('internal', 'Failed to fetch leaderboard.');
    }
});

// --- FRIEND REQUESTS (Server-side, atomic) ---

/**
 * Send a friend request. Creates entries in both users' friend subcollections atomically.
 */
exports.sendFriendRequestFn = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const currentUserId = request.auth.uid;
    const targetUserId = request.data.targetUserId;

    if (!targetUserId || typeof targetUserId !== 'string') {
        throw new HttpsError('invalid-argument', 'targetUserId is required.');
    }

    if (currentUserId === targetUserId) {
        throw new HttpsError('invalid-argument', 'Cannot send a friend request to yourself.');
    }

    const db = admin.firestore();

    // Check target user exists
    const targetDoc = await db.collection('users').doc(targetUserId).get();
    if (!targetDoc.exists) {
        throw new HttpsError('not-found', 'User not found.');
    }

    // Check no existing relationship
    const existingRef = db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId);
    const existingSnap = await existingRef.get();
    if (existingSnap.exists) {
        throw new HttpsError('already-exists', 'A friend request already exists.');
    }

    // Get current user data for the friend entry
    const currentUserDoc = await db.collection('users').doc(currentUserId).get();
    const currentUserData = currentUserDoc.data() || {};

    const targetData = targetDoc.data() || {};

    // Atomic batch write
    const batch = db.batch();

    batch.set(db.collection('users').doc(currentUserId).collection('friends').doc(targetUserId), {
        uid: targetUserId,
        displayName: targetData.displayName || null,
        photoURL: targetData.photoURL || null,
        status: 'pending',
        direction: 'outgoing'
    });

    batch.set(db.collection('users').doc(targetUserId).collection('friends').doc(currentUserId), {
        uid: currentUserId,
        displayName: currentUserData.displayName || null,
        photoURL: currentUserData.photoURL || null,
        status: 'pending',
        direction: 'incoming'
    });

    await batch.commit();
    console.log(`[Friends] ${currentUserId} sent friend request to ${targetUserId}`);
    return { success: true };
});

/**
 * Accept a friend request. Updates both entries atomically.
 */
exports.acceptFriendRequestFn = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const currentUserId = request.auth.uid;
    const friendUid = request.data.friendUid;

    if (!friendUid || typeof friendUid !== 'string') {
        throw new HttpsError('invalid-argument', 'friendUid is required.');
    }

    const db = admin.firestore();

    // Verify the friend request exists and is incoming
    const myFriendRef = db.collection('users').doc(currentUserId).collection('friends').doc(friendUid);
    const myFriendSnap = await myFriendRef.get();

    if (!myFriendSnap.exists) {
        throw new HttpsError('not-found', 'No friend request found.');
    }

    const myFriendData = myFriendSnap.data();
    if (myFriendData.status !== 'pending' || myFriendData.direction !== 'incoming') {
        throw new HttpsError('failed-precondition', 'This request cannot be accepted.');
    }

    // Atomic update
    const batch = db.batch();
    batch.update(myFriendRef, { status: 'accepted' });
    batch.update(db.collection('users').doc(friendUid).collection('friends').doc(currentUserId), { status: 'accepted' });
    await batch.commit();

    console.log(`[Friends] ${currentUserId} accepted friend request from ${friendUid}`);
    return { success: true };
});

/**
 * Reject or remove a friend. Deletes both entries atomically.
 */
exports.rejectFriendRequestFn = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be logged in.');
    }

    const currentUserId = request.auth.uid;
    const friendUid = request.data.friendUid;

    if (!friendUid || typeof friendUid !== 'string') {
        throw new HttpsError('invalid-argument', 'friendUid is required.');
    }

    const db = admin.firestore();

    // Atomic delete
    const batch = db.batch();
    batch.delete(db.collection('users').doc(currentUserId).collection('friends').doc(friendUid));
    batch.delete(db.collection('users').doc(friendUid).collection('friends').doc(currentUserId));
    await batch.commit();

    console.log(`[Friends] ${currentUserId} rejected/removed ${friendUid}`);
    return { success: true };
});

// ─────────────────────────────────────────────────────────────────────────────
// Jikan Proxy + Firestore Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Helper: cache-first fetch pattern with optional background refresh.
 * @param {string} cacheKey   Firestore document ID in apiCache collection
 * @param {number} ttl        TTL in milliseconds
 * @param {() => Promise<*>}  fetchFn  Called on cache miss to get fresh data
 */
async function cachedFetch(cacheKey, ttl, fetchFn) {
    const cached = await readCache(cacheKey, ttl);
    if (cached.hit) {
        if (cached.stale) {
            console.log(`[cachedFetch] Stale — refreshing in background: ${cacheKey}`);
            fetchFn().then((data) => data !== null && writeCache(cacheKey, data)).catch((err) => {
                console.warn(`[cachedFetch] Background refresh failed for ${cacheKey}:`, err.message);
            });
        }
        return cached.data;
    }
    console.log(`[cachedFetch] Calling Jikan for: ${cacheKey}`);
    const t0 = Date.now();
    const data = await fetchFn();
    console.log(`[cachedFetch] Jikan responded in ${Date.now() - t0}ms for: ${cacheKey}`);
    if (data !== null) await writeCache(cacheKey, data);
    return data;
}

// GET /anime|manga/{id}/full
exports.getWorkDetails = onCall({ cors: true }, async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    console.log(`[getWorkDetails] id=${id} type=${type}`);
    const key = `${type}_details_${id}`;
    return cachedFetch(key, TTL_MS.DETAILS, () => jikanFetch(`/${type}/${id}/full`));
});

// Search anime or manga
exports.searchWorks = onCall({ cors: true }, async (request) => {
    const { query, type, page = 1 } = request.data;
    if (!query || !type) throw new HttpsError('invalid-argument', 'query and type are required');
    const key = `search_${type}_${Buffer.from(`${query}_p${page}`).toString('base64').slice(0, 40)}`;
    return cachedFetch(key, TTL_MS.SEARCH, () =>
        jikanFetch(`/${type}?q=${encodeURIComponent(query)}&page=${page}&sfw=true`, true)
    );
});

// Characters
exports.getWorkCharacters = onCall({ cors: true }, async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_characters_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/characters`));
});

// Relations
exports.getWorkRelations = onCall({ cors: true }, async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_relations_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/relations`));
});

// Pictures
exports.getWorkPictures = onCall({ cors: true }, async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_pictures_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/pictures`));
});

// Statistics
exports.getWorkStatistics = onCall({ cors: true }, async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_stats_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/${type}/${id}/statistics`));
});

// Recommendations
exports.getWorkRecommendations = onCall({ cors: true }, async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_recs_${id}`;
    return cachedFetch(key, TTL_MS.RECOMMENDATIONS, () => jikanFetch(`/${type}/${id}/recommendations`));
});

// Anime episodes (paginated)
exports.getAnimeEpisodes = onCall({ cors: true }, async (request) => {
    const { id, page = 1 } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_episodes_${id}_p${page}`;
    return cachedFetch(key, TTL_MS.EPISODES, () => jikanFetch(`/anime/${id}/episodes?page=${page}`, true));
});

// Anime streaming links
exports.getAnimeStreaming = onCall({ cors: true }, async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_streaming_${id}`;
    return cachedFetch(key, TTL_MS.STREAMING, () => jikanFetch(`/anime/${id}/streaming`));
});

// Anime staff
exports.getAnimeStaff = onCall({ cors: true }, async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_staff_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/anime/${id}/staff`));
});

// Anime themes (openings/endings)
exports.getAnimeThemes = onCall({ cors: true }, async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `anime_themes_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/anime/${id}/themes`));
});

// Reviews
exports.getWorkReviews = onCall({ cors: true }, async (request) => {
    const { id, type } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');
    const key = `${type}_reviews_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () =>
        jikanFetch(`/${type}/${id}/reviews?spoilers=false&preliminary=false`)
    );
});

// French synopsis from Nautiljon
exports.getFRTranslation = onCall({ cors: true }, async (request) => {
    const { id, type, titleFrench, titleRomaji } = request.data;
    if (!id || !type) throw new HttpsError('invalid-argument', 'id and type are required');

    console.log(`[getFRTranslation] id=${id} type=${type} titleFrench="${titleFrench}" titleRomaji="${titleRomaji}"`);
    const key = `fr_${type}_${id}`;
    const cached = await readTranslation(key);
    if (cached.hit) {
        if (cached.notFound) {
            console.log(`[getFRTranslation] Negative cache hit — no FR translation for ${key}`);
            return null;
        }
        console.log(`[getFRTranslation] Cache hit — returning stored FR synopsis for ${key}`);
        return cached.synopsis;
    }

    console.log(`[getFRTranslation] Scraping Nautiljon for ${key}...`);
    const synopsis = await scrapeFRSynopsis(titleFrench, titleRomaji, type);
    if (synopsis) {
        console.log(`[getFRTranslation] Scraped synopsis (${synopsis.length} chars) for ${key}`);
    } else {
        console.log(`[getFRTranslation] No FR synopsis found on Nautiljon for ${key}`);
    }
    await writeTranslation(key, synopsis);
    return synopsis;
});

// ── Catalog ────────────────────────────────────────────────────────────────

// Top anime or manga (trending/popular/upcoming)
exports.getTopWorks = onCall({ cors: true }, async (request) => {
    const { type, filter = 'bypopularity', limit = 24, nsfwMode = false } = request.data;
    if (!type) throw new HttpsError('invalid-argument', 'type is required');
    const key = `top_${type}_${filter}_${limit}_nsfw_${nsfwMode}`;
    return cachedFetch(key, TTL_MS.SEARCH, () =>
        jikanFetch(`/top/${type}?filter=${filter}&limit=${limit}&sfw=${!nsfwMode}`)
    );
});

// Current season anime
exports.getSeasonalAnime = onCall({ cors: true }, async (request) => {
    const { limit = 24, nsfwMode = false } = request.data;
    const key = `seasonal_${limit}_nsfw_${nsfwMode}`;
    return cachedFetch(key, TTL_MS.SEARCH, () =>
        jikanFetch(`/seasons/now?limit=${limit}&sfw=${!nsfwMode}`)
    );
});

// Weekly broadcast schedule
exports.getAnimeSchedule = onCall({ cors: true }, async (request) => {
    const { filter, nsfwMode = false } = request.data;
    const key = `schedule_${filter || 'all'}_nsfw_${nsfwMode}`;
    const url = filter
        ? `/schedules?filter=${filter}&sfw=${!nsfwMode}`
        : `/schedules?sfw=${!nsfwMode}`;
    return cachedFetch(key, TTL_MS.SEARCH, () => jikanFetch(url));
});

// ── Characters ─────────────────────────────────────────────────────────────

exports.getCharacterById = onCall({ cors: true }, async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `character_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/characters/${id}`));
});

exports.getCharacterFull = onCall({ cors: true }, async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `character_full_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/characters/${id}/full`));
});

exports.searchCharacters = onCall({ cors: true }, async (request) => {
    const { query, limit = 25 } = request.data;
    if (!query) throw new HttpsError('invalid-argument', 'query is required');
    const key = `search_chars_${Buffer.from(query).toString('base64').slice(0, 40)}_${limit}`;
    return cachedFetch(key, TTL_MS.SEARCH, () =>
        jikanFetch(`/characters?q=${encodeURIComponent(query)}&limit=${limit}`)
    );
});

// ── People ─────────────────────────────────────────────────────────────────

exports.getPersonById = onCall({ cors: true }, async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `person_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/people/${id}`));
});

exports.getPersonFull = onCall({ cors: true }, async (request) => {
    const { id } = request.data;
    if (!id) throw new HttpsError('invalid-argument', 'id is required');
    const key = `person_full_${id}`;
    return cachedFetch(key, TTL_MS.SECONDARY, () => jikanFetch(`/people/${id}/full`));
});

exports.searchPeople = onCall({ cors: true }, async (request) => {
    const { query, limit = 15 } = request.data;
    if (!query) throw new HttpsError('invalid-argument', 'query is required');
    const key = `search_people_${Buffer.from(query).toString('base64').slice(0, 40)}_${limit}`;
    return cachedFetch(key, TTL_MS.SEARCH, () =>
        jikanFetch(`/people?q=${encodeURIComponent(query)}&limit=${limit}`)
    );
});

// ── Misc ───────────────────────────────────────────────────────────────────

// Single episode details
exports.getAnimeEpisodeDetails = onCall({ cors: true }, async (request) => {
    const { id, episodeId } = request.data;
    if (!id || !episodeId) throw new HttpsError('invalid-argument', 'id and episodeId are required');
    const key = `anime_episode_detail_${id}_${episodeId}`;
    return cachedFetch(key, TTL_MS.EPISODES, () =>
        jikanFetch(`/anime/${id}/episodes/${episodeId}`)
    );
});

// Random anime — no cache (result changes by nature)
exports.getRandomAnime = onCall({ cors: true }, async (request) => {
    const { nsfwMode = false } = request.data;
    return jikanFetch(`/random/anime?sfw=${!nsfwMode}`);
});

// Jikan availability check — no cache
exports.getJikanStatus = onCall({ cors: true }, async () => {
    const startTime = Date.now();
    try {
        await jikanFetch('/anime/1');
        return { status: 'online', responseTime: Date.now() - startTime, timestamp: Date.now() };
    } catch (error) {
        return {
            status: 'offline',
            responseTime: Date.now() - startTime,
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: Date.now(),
        };
    }
});

// Scheduled background sync — refresh stale cache entries (runs daily at 3am UTC)
exports.syncStaleCache = onSchedule('0 3 * * *', async () => {
    const db = admin.firestore();
    const now = Date.now();
    // Refresh details entries older than 20h (before 24h TTL expires)
    const staleThreshold = Timestamp.fromMillis(now - 20 * 60 * 60 * 1000);

    const snapshot = await db.collection('apiCache')
        .where('fetchedAt', '<', staleThreshold)
        .limit(50)
        .get();

    const refreshPromises = snapshot.docs.map(async (doc) => {
        const key = doc.id;
        const match = key.match(/^(anime|manga)_details_(\d+)$/);
        if (!match) return;
        const [, type, id] = match;
        try {
            const data = await jikanFetch(`/${type}/${id}/full`);
            if (data) await writeCache(key, data);
        } catch (err) {
            console.warn(`[SyncStale] Failed to refresh ${key}:`, err.message);
        }
    });

    await Promise.allSettled(refreshPromises);
    console.log(`[SyncStale] Refreshed ${snapshot.docs.length} entries`);
});
