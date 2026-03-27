const { onRequest, onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const express = require("express");
const fs = require("fs");
const path = require("path");

admin.initializeApp();
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

// SVG Template Helper - Hunter License Style
// SVG Template Helper - Hunter License Style
function generateProfileSVG(userData, lang) {
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
            <clipPath id="avatarClip">
                <rect x="150" y="220" width="160" height="160" rx="8" />
            </clipPath>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        
        <!-- Outer Border -->
        <rect x="50" y="50" width="1100" height="530" rx="15" fill="none" stroke="${borderColor}" stroke-width="10" />
        
        <!-- Main Card Panel -->
        <rect x="50" y="50" width="1100" height="530" rx="15" fill="url(#panelGrad)" />

        <!-- Banner -->
        <rect x="50" y="50" width="1100" height="140" fill="${primaryColor}" />
        ${banner ? `<image x="50" y="50" width="1100" height="140" xlink:href="${banner}" preserveAspectRatio="xMidYMid slice" />` : ''}
        <rect x="50" y="188" width="1100" height="2" fill="${borderColor}" />

        <!-- Header Strip -->
        <rect x="50" y="190" width="1100" height="40" fill="${borderColor}" />
        <text x="75" y="217" class="heading" font-size="20" fill="white" letter-spacing="2">${labels.title}</text>
        <text x="1125" y="217" text-anchor="end" class="heading" font-size="20" fill="white" letter-spacing="1">ID: ${uid}</text>

        <!-- Avatar Section -->
        <rect x="145" y="215" width="170" height="170" rx="10" fill="${borderColor}" />
        <image x="150" y="220" width="160" height="160" xlink:href="${photoURL}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice" />
        
        <!-- Level Badge -->
        <rect x="260" y="340" width="90" height="45" fill="${primaryColor}" stroke="${borderColor}" stroke-width="3" transform="rotate(-5, 305, 362)" />
        <text x="305" y="372" text-anchor="middle" class="heading" font-size="22" fill="white" transform="rotate(-5, 305, 362)">${labels.lvl} ${level}</text>

        <!-- Identity Section -->
        <text x="360" y="290" class="heading" font-size="52" fill="${textColor}">${displayName}</text>
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

// SVG Template for News
// SVG Template for News
function generateNewsSVG(newsData, lang) {
    const title = escapeHtml((lang === 'en' ? newsData.title_en : newsData.title_fr) || newsData.title || 'Bingeki News');
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
        
        <!-- Background -->
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        
        <!-- Main Content Card -->
        <g filter="url(#shadow)">
            <rect x="100" y="100" width="1000" height="430" rx="20" fill="#1e1e1e" stroke="#000" stroke-width="5" />
            
            <!-- News Image (Left side) -->
            <clipPath id="newsImgClip">
                <rect x="100" y="100" width="400" height="430" rx="20 0 0 20" />
            </clipPath>
            <rect x="100" y="100" width="400" height="430" rx="20" fill="#333" />
            ${image ? `<image x="100" y="100" width="400" height="430" xlink:href="${image}" clip-path="url(#newsImgClip)" preserveAspectRatio="xMidYMid slice" />` : ''}
            
            <!-- Gradient Overlay for Image -->
            <rect x="100" y="100" width="400" height="430" fill="rgba(255,46,99,0.1)" clip-path="url(#newsImgClip)" />

            <!-- Content Section (Right side) -->
            <rect x="500" y="100" width="600" height="80" rx="0 20 0 0" fill="url(#newsGrad)" />
            <text x="530" y="150" class="heading" font-size="28" fill="white" letter-spacing="2">BINGEKI NEWS</text>

            <!-- Source & Date -->
            <rect x="530" y="210" width="540" height="2" fill="#FF2E63" opacity="0.3" />
            <text x="530" y="245" class="heading" font-size="18" fill="#FF2E63">${source} • ${date}</text>

            <!-- Title -->
            <foreignObject x="530" y="270" width="540" height="200">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 36px; color: white; line-height: 1.2; text-transform: uppercase;">
                    ${title}
                </div>
            </foreignObject>
            
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
        let svg = '';
        if (type === 'profile' && id) {
            const userDoc = await admin.firestore().collection('users').doc(id).get();
            if (userDoc.exists) {
                // generateProfileSVG now takes (userData, lang)
                svg = generateProfileSVG(userDoc.data(), lang);
            }
        } else if (type === 'news' && id) {
            const newsDoc = await admin.firestore().collection('news').doc(id).get();
            if (newsDoc.exists) {
                svg = generateNewsSVG(newsDoc.data(), lang);
            }
        }
        
        if (!svg) {
            svg = generateGenericSVG(title, desc, lang);
        }

        res.set('Content-Type', 'image/svg+xml');
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        return res.send(svg);
    } catch (e) {
        console.error('[OG-IMAGE] Error generating SVG:', e);
        return res.status(500).send('Internal Error');
    }
});

app.get('/*', async (req, res) => {
    const url = req.url;

    // Default values
    let title = "Bingeki | Votre aventure Manga";
    let description = "Transformez votre passion manga en quête RPG ! Suivez vos lectures, gagnez de l'XP, débloquez des badges et affrontez vos amis.";
    let image = "https://bingeki.web.app/bingeki-preview.png";

    // Path parsing
    const parts = url.split('/').filter(p => p);
    let lang = 'fr';
    let profileUid = null;
    let articleSlug = null;

    if (parts[0] === 'fr' || parts[0] === 'en') {
        lang = parts[0];
        if (parts[1] === 'profile' && parts[2]) profileUid = parts[2];
        if (parts[1] === 'news' && parts[2] === 'article' && parts[3]) articleSlug = parts[3];
    } else {
        if (parts[0] === 'profile' && parts[1]) profileUid = parts[1];
        if (parts[0] === 'news' && parts[1] === 'article' && parts[2]) articleSlug = parts[2];
    }

    if (lang === 'en') {
        title = "Bingeki | Your Manga Adventure";
        description = "Turn your manga passion into an RPG quest! Track your reading, earn XP, unlock badges and compete with friends.";
        image = "https://bingeki.web.app/bingeki-preview-en.png";
    }

    // Load Data based on Route
    if (profileUid) {
        try {
            const userDoc = await admin.firestore().collection('users').doc(profileUid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                title = lang === 'en' ? `${userData.displayName || 'User'}'s Profile | Bingeki` : `Profil de ${userData.displayName || 'Utilisateur'} | Bingeki`;
                description = userData.bio || (lang === 'en' ? `Check out ${userData.displayName || 'User'}'s progress on Bingeki!` : `Découvrez la progression de ${userData.displayName || 'Utilisateur'} sur Bingeki !`);
                image = `https://bingeki.web.app/api/og-image/profile/${profileUid}?lang=${lang}`;
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
    } else {
        const pathSuffix = parts[parts.length - 1];
        if (pathSuffix === 'leaderboard') {
            title = lang === 'en' ? "Leaderboard | Bingeki" : "Classement | Bingeki";
            description = lang === 'en' ? "Who are the top hunters? Check the global ranking!" : "Qui sont les meilleurs chasseurs ? Consultez le classement mondial !";
        } else if (pathSuffix === 'badges') {
            title = lang === 'en' ? "Badges Gallery | Bingeki" : "Galerie des Badges | Bingeki";
            description = lang === 'en' ? "Discover all collectable badges and their requirements." : "Découvrez tous les badges à collectionner et comment les obtenir.";
        } else if (pathSuffix === 'manga' || pathSuffix === 'search') {
            title = lang === 'en' ? "Search Manga | Bingeki" : "Rechercher un Manga | Bingeki";
        } else if (pathSuffix === 'survey') {
            title = lang === 'en' ? "Manga Survey | Bingeki" : "Sondage Manga | Bingeki";
        }
        image = `https://bingeki.web.app/api/og-image?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}&lang=${lang}`;
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

    html = html
        .replace(/<title>[^]*?<\/title>/g, `<title>${finalTitle}</title>`)
        .replace(/<meta\s+name="title"\s+content="[^]*?"\s*\/?>/g, `<meta name="title" content="${finalTitle}" />`)
        .replace(/<meta\s+name="description"\s+content="[^]*?"\s*\/?>/g, `<meta name="description" content="${finalDesc}" />`)
        .replace(/<meta\s+property="og:title"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:title" content="${finalTitle}" />`)
        .replace(/<meta\s+property="og:description"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:description" content="${finalDesc}" />`)
        .replace(/<meta\s+property="og:image"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:image" content="${finalImage}" />`)
        .replace(/<meta\s+property="og:url"\s+content="[^]*?"\s*\/?>/g, `<meta property="og:url" content="${finalUrl}" />`)
        .replace(/<link\s+rel="canonical"\s+href="[^]*?"\s*\/?>/g, `<link rel="canonical" href="${finalUrl}" />`)
        .replace(/<meta\s+name="twitter:title"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:title" content="${finalTitle}" />`)
        .replace(/<meta\s+name="twitter:description"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:description" content="${finalDesc}" />`)
        .replace(/<meta\s+name="twitter:image"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:image" content="${finalImage}" />`)
        .replace(/<meta\s+name="twitter:card"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:card" content="summary_large_image" />`);

    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://www.google-analytics.com https://ssl.google-analytics.com https://www.gstatic.com https://www.googletagmanager.com https://pagead2.googlesyndication.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.jikan.moe https://api.trace.moe https://graphql.anilist.co https://*.googleapis.com https://firebase.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.cloudfunctions.net https://www.google-analytics.com https://accounts.google.com https://discord.com; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://discord.com; object-src 'none';");
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'DENY');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.set('X-SEO-Handler', 'true');
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
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
            const existingBadges = gamData.badges || [];

            const stats = calculateUserStats(works, bonusXp);

            // Calculate badges server-side
            const badges = calculateBadges(stats, streak, existingBadges);

            // Update Root User Profile (Leaderboard source)
            await admin.firestore().collection('users').doc(userId).set({
                ...stats,
                badges,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Update Gamification Doc (Data integrity)
            await admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('data')
                .doc('gamification')
                .set({
                    ...stats,
                    badges,
                    lastUpdated: Date.now()
                }, { merge: true });

            // --- AUTO ACTIVITY LOGGING ---
            // Detect changes between previous and current library
            try {
                const userDoc = await admin.firestore().collection('users').doc(userId).get();
                const userData = userDoc.exists ? userDoc.data() : {};
                const userName = userData.displayName || 'Héros';
                const userPhoto = userData.photoURL || '';

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
    memory: '1GiB'
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
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
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
exports.getLeaderboard = onCall(async (request) => {
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
exports.sendFriendRequestFn = onCall(async (request) => {
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
exports.acceptFriendRequestFn = onCall(async (request) => {
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
exports.rejectFriendRequestFn = onCall(async (request) => {
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
