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

    // Calculate Radar Chart Points (6 points)
    const centerX = 850;
    const centerY = 330;
    const radius = 120;

    const stats = [
        { val: Math.min(level * 2, 100), label: lang === 'en' ? 'Level' : 'Niveau' },
        { val: Math.min(xp / 100, 100), label: lang === 'en' ? 'Passion' : 'Passion' },
        { val: Math.min(streak, 100), label: lang === 'en' ? 'Diligence' : 'Assiduité' },
        { val: Math.min((userData.totalWorksAdded || 0) / 2, 100), label: lang === 'en' ? 'Collection' : 'Collection' },
        { val: Math.min((userData.totalChaptersRead || 0) / 10, 100), label: lang === 'en' ? 'Reading' : 'Lecture' },
        { val: Math.min((userData.totalWorksCompleted || 0) * 5, 100), label: lang === 'en' ? 'Completion' : 'Succès' }
    ];

    const getPoint = (index, value) => {
        const angle = (index * 60 - 90) * (Math.PI / 180);
        const r = (value / 100) * radius;
        return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
    };

    const polygonPoints = stats.map((s, i) => getPoint(i, s.val)).join(' ');
    const gridPoints100 = stats.map((s, i) => getPoint(i, 100)).join(' ');
    const gridPoints50 = stats.map((s, i) => getPoint(i, 50)).join(' ');

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;family=Inter:wght@400;700&amp;display=swap');
                .heading { font-family: 'Outfit', sans-serif; font-weight: 900; text-transform: uppercase; }
                .body { font-family: 'Inter', sans-serif; }
                .mono { font-family: monospace; }
            </style>
            <linearGradient id="panelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:${bgColor}" />
                <stop offset="100%" style="stop-color:#0a0a0a" />
            </linearGradient>
            <pattern id="mangaDots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" fill-opacity="0.05" />
            </pattern>
            <pattern id="speedlines" width="100" height="100" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="100" y2="100" stroke="white" stroke-width="0.5" opacity="0.1" />
                <line x1="100" y1="0" x2="0" y2="100" stroke="white" stroke-width="0.5" opacity="0.05" />
            </pattern>
            <clipPath id="avatarClip">
                <rect x="150" y="220" width="160" height="160" rx="4" />
            </clipPath>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />
        
        <!-- Outer Border (Brutalist Style) -->
        <rect x="50" y="50" width="1100" height="530" rx="4" fill="none" stroke="${borderColor}" stroke-width="8" />
        
        <!-- Main Card Panel (Manga Shadow Style) -->
        <rect x="56" y="56" width="1100" height="530" rx="4" fill="${borderColor}" opacity="0.5" />
        <rect x="50" y="50" width="1100" height="530" rx="4" fill="url(#panelGrad)" stroke="${borderColor}" stroke-width="2" />

    <!-- Banner -->
    <rect x="50" y="50" width="1100" height="140" fill="${primaryColor}" />
    ${base64Banner ? `<image x="50" y="50" width="1100" height="140" xlink:href="${base64Banner}" preserveAspectRatio="xMidYMid slice" />` : ''}
    <rect x="50" y="188" width="1100" height="2" fill="${borderColor}" />

    <!-- Header Strip -->
    <rect x="50" y="190" width="1100" height="40" fill="${borderColor}" />
    <text x="75" y="217" class="heading" font-size="20" fill="white" letter-spacing="2">${labels.title}</text>
    <text x="1125" y="217" text-anchor="end" class="heading" font-size="20" fill="white" letter-spacing="1">ID: ${uid}</text>

    <!-- Avatar Section -->
    <rect x="145" y="215" width="170" height="170" rx="10" fill="${borderColor}" />
    ${base64Avatar ? `<image x="150" y="220" width="160" height="160" xlink:href="${base64Avatar}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice" />` : ''}
    
    <!-- Level Badge -->
        <rect x="260" y="340" width="90" height="45" fill="${primaryColor}" stroke="${borderColor}" stroke-width="3" transform="rotate(-5, 305, 362)" />
        <text x="305" y="372" text-anchor="middle" class="heading" font-size="22" fill="white" transform="rotate(-5, 305, 362)">${labels.lvl} ${level}</text>

        <!-- Identity Section -->
        <g transform="rotate(-1, 360, 290)">
            <rect x="355" y="245" width="500" height="65" fill="${primaryColor}" opacity="0.1" />
            <text x="360" y="290" class="heading" font-size="52" fill="${textColor}" style="text-shadow: 4px 4px 0 #000;">${displayName}</text>
        </g>
        <text x="360" y="325" class="mono" font-size="16" fill="${primaryColor}" opacity="0.8">BINGEKI HUNTER LICENSE VERIFIED</text>
        
        <!-- Bio -->
        ${bio ? `
        <line x1="360" y1="360" x2="360" y2="440" stroke="${primaryColor}" stroke-width="3" />
        <text x="375" y="380" class="body" font-size="20" font-style="italic" fill="${textColor}" opacity="0.9">
            ${bio.length > 50 ? bio.substring(0, 47) + '...' : bio}
        </text>
        ` : ''}

        <!-- Radar Chart Side -->
        <!-- Chart Grid -->
        <polygon points="${gridPoints100}" fill="none" stroke="${textColor}" stroke-width="1" opacity="0.1" />
        <polygon points="${gridPoints50}" fill="none" stroke="${textColor}" stroke-width="1" opacity="0.1" />
        ${stats.map((s, i) => `<line x1="${centerX}" y1="${centerY}" x2="${getPoint(i, 100).split(',')[0]}" y2="${getPoint(i, 100).split(',')[1]}" stroke="${textColor}" stroke-width="1" opacity="0.1" />`).join('')}
        
        <!-- The Data Polygon -->
        <polygon points="${polygonPoints}" fill="${primaryColor}" fill-opacity="0.6" stroke="${primaryColor}" stroke-width="3" />
        
        <!-- Chart Labels -->
        ${stats.map((s, i) => {
        const p = getPoint(i, 125);
        const [px, py] = p.split(',');
        return `<text x="${px}" y="${py}" text-anchor="middle" class="heading" font-size="12" fill="${textColor}" opacity="0.7">${s.label}</text>`;
    }).join('')}

        <!-- Bottom Stats Bar -->
        <rect x="145" y="470" width="910" height="80" rx="5" fill="rgba(0,0,0,0.3)" stroke="${borderColor}" stroke-width="2" />
        
        <!-- XP Bar Wrapper -->
        <text x="165" y="500" class="heading" font-size="14" fill="${textColor}" opacity="0.6">${labels.xp}</text>
        <rect x="165" y="515" width="400" height="12" rx="6" fill="#333" />
        <rect x="165" y="515" width="${Math.min((xp / xpToNextLevel) * 400, 400)}" height="12" rx="6" fill="${primaryColor}" />
        <text x="565" y="530" text-anchor="end" class="heading" font-size="14" fill="${textColor}">${xp} / ${xpToNextLevel}</text>

        <!-- Streak -->
        <text x="650" y="500" class="heading" font-size="14" fill="${textColor}" opacity="0.6">${labels.streak}</text>
        <text x="650" y="535" class="heading" font-size="32" fill="white">${streak} <tspan font-size="20">🔥</tspan></text>

        <!-- Badges -->
        <text x="850" y="500" class="heading" font-size="14" fill="${textColor}" opacity="0.6">${labels.badges}</text>
        <text x="850" y="535" class="heading" font-size="32" fill="white">${badgeCount} <tspan font-size="20">⭐</tspan></text>

        <!-- Footer -->
        <text x="1150" y="610" text-anchor="end" class="heading" font-size="14" fill="${textColor}" opacity="0.3">BINGEKI.WEB.APP</text>
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
        <defs>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;family=Inter:wght@400;700&amp;display=swap');
                .heading { font-family: 'Outfit', sans-serif; font-weight: 900; text-transform: uppercase; }
                .body { font-family: 'Inter', sans-serif; }
            </style>
            <linearGradient id="workGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:rgba(18,18,18,0.2)" />
                <stop offset="100%" style="stop-color:rgba(18,18,18,1)" />
            </linearGradient>
            <pattern id="mangaDots" width="15" height="15" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="white" fill-opacity="0.1" />
            </pattern>
            <pattern id="diagonalLines" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="40" stroke="${primaryColor}" stroke-width="2" opacity="0.1" />
            </pattern>
        </defs>
        
        <!-- Background Layer -->
        <rect width="1200" height="630" fill="#121212" />
        
        ${base64Image ? `
        <image x="0" y="0" width="1200" height="630" xlink:href="${base64Image}" preserveAspectRatio="xMidYMid slice" opacity="0.3" filter="grayscale(1)" />
        <rect width="1200" height="630" fill="url(#workGrad)" />
        ` : ''}
        
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#diagonalLines)" />

        <!-- Manga Shadow for Poster -->
        <rect x="88" y="88" width="320" height="470" fill="#000" rx="4" />
        <!-- Main Poster -->
        <g transform="translate(80, 80)">
            <rect x="0" y="0" width="320" height="470" fill="#000" rx="4" />
            ${base64Image ? `<image x="5" y="5" width="310" height="460" xlink:href="${base64Image}" preserveAspectRatio="xMidYMid slice" clip-path="inset(0% round 4px)" />` : ''}
            <rect x="0" y="0" width="320" height="470" fill="none" stroke="white" stroke-width="3" rx="4" />
        </g>

        <!-- Content Section -->
        <g transform="translate(450, 150)">
            <!-- Type Badge (Brutalist style) -->
            <rect x="-10" y="-5" width="120" height="40" fill="#000" transform="skewX(-15)" />
            <rect x="-15" y="-10" width="120" height="40" fill="${primaryColor}" transform="skewX(-15)" />
            <text x="45" y="18" text-anchor="middle" class="heading" font-size="20" fill="white">${type}</text>

            <!-- Title (Rotated & Shadowed) -->
            <g transform="rotate(-1.5, 0, 80)">
                <foreignObject x="0" y="50" width="700" height="220">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 72px; color: white; line-height: 1.0; text-transform: uppercase; text-shadow: 6px 6px 0px #000;">
                        ${title}
                    </div>
                </foreignObject>
            </g>

            <!-- Genres & Status -->
            <text x="0" y="280" class="heading" font-size="22" fill="${primaryColor}" letter-spacing="2">${genres}</text>
            <text x="0" y="315" class="body" font-size="20" fill="white" opacity="0.6">${status}</text>
            
            <!-- Rating / Score -->
            <g transform="translate(0, 360)">
                <rect x="0" y="0" width="180" height="60" fill="none" stroke="white" stroke-width="2" transform="skewX(-10)" />
                <text x="20" y="40" class="heading" font-size="36" fill="white">★ ${score}</text>
                <text x="110" y="40" class="body" font-size="14" fill="white" opacity="0.5">/ 10</text>
            </g>
        </g>

        <!-- Branding -->
        <text x="1150" y="580" text-anchor="end" class="heading" font-size="30" fill="white" opacity="0.1" letter-spacing="10">BINGEKI</text>
        <rect x="1100" y="600" width="50" height="5" fill="${primaryColor}" />
    </svg>`;
}

// SVG Template for News
// SVG Template for News
function generateNewsSVG(newsData, lang, base64Image = '') {
    const title = escapeHtml((lang === 'en' ? newsData.title_en : newsData.title_fr) || newsData.title || newsData.title || 'Bingeki News');
    const source = escapeHtml(newsData.sourceName || 'Actualité Manga');
    const date = newsData.publishedAt ? new Date(newsData.publishedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
    const image = newsData.image || '';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;family=Inter:wght@400;700&amp;display=swap');
                .heading { font-family: 'Outfit', sans-serif; font-weight: 900; text-transform: uppercase; }
                .body { font-family: 'Inter', sans-serif; }
            </style>
            <linearGradient id="newsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FF2E63" />
                <stop offset="100%" style="stop-color:#FF0844" />
            </linearGradient>
            <pattern id="mangaDots" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="2" fill="white" fill-opacity="0.1" />
            </pattern>
            <pattern id="speedlines" width="200" height="200" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="200" y2="200" stroke="${primaryColor}" stroke-width="1" opacity="0.05" />
            </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect width="1200" height="630" fill="url(#speedlines)" />
        
        <!-- Main Content Card (Manga Shadow) -->
        <rect x="108" y="108" width="1000" height="430" rx="4" fill="#000" />
        <g>
            <rect x="100" y="100" width="1000" height="430" rx="4" fill="#1a1a1a" stroke="white" stroke-width="2" />
            
            <!-- News Image (Left side) -->
            <clipPath id="newsImgClip">
                <rect x="100" y="100" width="400" height="430" rx="4 0 0 4" />
            </clipPath>
            <rect x="100" y="100" width="400" height="430" rx="4" fill="#333" />
            ${base64Image ? `<image x="100" y="100" width="400" height="430" xlink:href="${base64Image}" clip-path="url(#newsImgClip)" preserveAspectRatio="xMidYMid slice" />` : ''}
            
            <!-- Overlay -->
            <rect x="100" y="100" width="400" height="430" fill="rgba(255,46,99,0.15)" clip-path="url(#newsImgClip)" />

            <!-- Content Section -->
            <rect x="500" y="100" width="600" height="70" rx="0 4 0 0" fill="${primaryColor}" />
            <text x="530" y="145" class="heading" font-size="24" fill="white" letter-spacing="4">BINGEKI NEWS</text>

            <!-- Source & Date -->
            <text x="530" y="210" class="heading" font-size="16" fill="${primaryColor}" opacity="0.8">${source} • ${date}</text>

            <!-- Title (Rotated) -->
            <g transform="rotate(-1, 800, 300)">
                <foreignObject x="530" y="240" width="540" height="220">
                    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 42px; color: white; line-height: 1.1; text-transform: uppercase; text-shadow: 4px 4px 0px #000;">
                        ${title}
                    </div>
                </foreignObject>
            </g>
            
            <!-- Call to action -->
            <text x="1070" y="500" text-anchor="end" class="heading" font-size="20" fill="#FF2E63">LIRE L'ARTICLE ➔</text>
        </g>

        <!-- Logo/Footer -->
        <text x="1100" y="590" text-anchor="end" class="heading" font-size="18" fill="white" opacity="0.2">bingeki.web.app</text>
    </svg>`;
}

// SVG Template for Generic Pages
function generateGenericSVG(title, description, lang) {
    const cleanTitle = escapeHtml(title || 'Bingeki');
    const finalDesc = escapeHtml(description || '');

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;family=Inter:wght@400;700&amp;display=swap');
                .heading { font-family: 'Outfit', sans-serif; font-weight: 900; text-transform: uppercase; }
                .body { font-family: 'Inter', sans-serif; }
            </style>
            <linearGradient id="genBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#1a1a1a" />
                <stop offset="100%" style="stop-color:#080808" />
            </linearGradient>
            <pattern id="mangaDots" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="4" cy="4" r="2" fill="#FF2E63" fill-opacity="0.05" />
            </pattern>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="15" />
                <feOffset dx="0" dy="15" result="offsetblur" />
                <feComponentTransfer>
                    <feFuncA type="linear" slope="0.5" />
                </feComponentTransfer>
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>
        
        <rect width="1200" height="630" fill="url(#genBg)" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        
        <!-- Decorative elements -->
        <circle cx="1100" cy="100" r="200" fill="#FF2E63" fill-opacity="0.03" />
        <circle cx="100" cy="530" r="150" fill="#FF2E63" fill-opacity="0.05" />
        
        <!-- Branding -->
        <text x="600" y="100" text-anchor="middle" class="heading" font-size="30" fill="white" letter-spacing="15" opacity="0.4">BINGEKI</text>
        
        <!-- Main Panel -->
        <g filter="url(#shadow)">
            <rect x="200" y="200" width="800" height="250" rx="20" fill="#1e1e1e" stroke="#FF2E63" stroke-width="2" />
            
            <!-- Title -->
            <text x="600" y="310" text-anchor="middle" class="heading" font-size="70" fill="white">${cleanTitle}</text>
            
            <!-- Description -->
            <foreignObject x="250" y="340" width="700" height="100">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Inter', sans-serif; font-size: 20px; color: #FF2E63; text-align: center; line-height: 1.4; opacity: 0.9;">
                    ${finalDesc.length > 120 ? finalDesc.substring(0, 120) + '...' : finalDesc}
                </div>
            </foreignObject>
        </g>
        
        <!-- Footer Decoration -->
        <rect x="550" y="520" width="100" height="4" rx="2" fill="#FF2E63" />
        <text x="600" y="580" text-anchor="middle" class="heading" font-size="16" fill="white" opacity="0.3" letter-spacing="5">JOIN THE ADVENTURE</text>
        <text x="600" y="610" text-anchor="middle" class="heading" font-size="12" fill="white" opacity="0.2">bingeki.web.app</text>
    </svg>`;
}

// New route for directly serving the OG image binary (SVG)
app.get('/api/og-image/:type?/:id?', async (req, res) => {
    const { type, id } = req.params;
    const lang = req.query.lang || 'fr';
    const title = req.query.title || '';
    const desc = req.query.desc || '';

    try {
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

            if (workData) {
                const imageUrl = workData.images?.webp?.large_image_url || workData.images?.jpg?.large_image_url;
                const base64Image = await fetchImageAsBase64(imageUrl);
                svg = generateWorkSVG(workData, lang, base64Image);
            } else {
                svg = generateGenericSVG(title, desc, lang);
            }
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
        let ogType = 'generic';
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
