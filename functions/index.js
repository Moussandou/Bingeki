// SVG Template Helper - Hunter License Style
function generateProfileSVG(userData, stats, lang) {
    const displayName = escapeHtml(userData.displayName || 'Chasseur');
    const level = stats.level || 1;
    const xp = stats.xp || 0;
    const xpToNextLevel = stats.xpToNextLevel || 100;
    const streak = stats.streak || 0;
    const uid = userData.uid ? userData.uid.slice(0, 8).toUpperCase() : 'BINGEKI';
    const accentColor = userData.themeColor || '#FF2E63';
    
    const labelTitle = lang === 'en' ? 'HUNTER LICENSE' : 'CARTE DE CHASSEUR';
    const labelLvl = lang === 'en' ? 'LEVEL' : 'NIVEAU';
    const labelStreak = lang === 'en' ? 'STREAK' : 'SÉRIE';
    const labelXp = lang === 'en' ? 'XP PROGRESS' : 'PROGRESSION XP';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#1a1a1a" />
                <stop offset="100%" style="stop-color:#0a0a0a" />
            </linearGradient>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#ffffff" fill-opacity="0.05" />
            </pattern>
        </defs>
        
        <!-- Background -->
        <rect width="1200" height="630" fill="url(#bgGrad)" />
        <rect width="1200" height="630" fill="url(#dots)" />
        
        <!-- Main Panel -->
        <rect x="100" y="100" width="1000" height="430" rx="10" fill="#1e1e1e" stroke="${accentColor}" stroke-width="6" />
        
        <!-- Header Strip -->
        <rect x="100" y="100" width="1000" height="50" rx="4" fill="${accentColor}" />
        <text x="130" y="135" font-family="sans-serif" font-weight="900" font-size="24" fill="white">${labelTitle}</text>
        <text x="1070" y="135" text-anchor="end" font-family="sans-serif" font-weight="900" font-size="24" fill="white">ID: ${uid}</text>
        
        <!-- Level Circle -->
        <circle cx="240" cy="315" r="90" fill="#2d2d2d" stroke="${accentColor}" stroke-width="4" />
        <text x="240" y="300" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="20" fill="${accentColor}">${labelLvl}</text>
        <text x="240" y="350" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="60" fill="white">${level}</text>
        
        <!-- Name -->
        <text x="370" y="260" font-family="sans-serif" font-weight="900" font-size="56" fill="white">${displayName}</text>
        <line x1="370" y1="280" x2="950" y2="280" stroke="${accentColor}" stroke-width="4" opacity="0.5" />
        
        <!-- Stats Grid -->
        <!-- XP -->
        <text x="370" y="340" font-family="sans-serif" font-weight="700" font-size="18" fill="#a0a0a0" text-transform="uppercase">${labelXp}</text>
        <rect x="370" y="355" width="580" height="20" rx="10" fill="#333333" />
        <rect x="370" y="355" width="${Math.min((xp / xpToNextLevel) * 580, 580)}" height="20" rx="10" fill="${accentColor}" />
        <text x="950" y="340" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="18" fill="white">${xp} / ${xpToNextLevel} XP</text>
        
        <!-- Streak & Others -->
        <text x="370" y="440" font-family="sans-serif" font-weight="700" font-size="18" fill="#a0a0a0" text-transform="uppercase">${labelStreak}</text>
        <text x="370" y="480" font-family="sans-serif" font-weight="900" font-size="40" fill="white">${streak} 🔥</text>
        
        <text x="600" y="440" font-family="sans-serif" font-weight="700" font-size="18" fill="#a0a0a0" text-transform="uppercase">BINGEKI RANK</text>
        <text x="600" y="480" font-family="sans-serif" font-weight="900" font-size="40" fill="white">S-CLASS</text>
        
        <!-- Footer -->
        <text x="1100" y="600" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="20" fill="#666666">bingeki.web.app</text>
    </svg>`;
}

// SVG Template for News
function generateNewsSVG(newsData, lang) {
    const title = escapeHtml((lang === 'en' ? newsData.title_en : newsData.title_fr) || newsData.title || 'Bingeki News');
    const source = escapeHtml(newsData.sourceName || 'Actualité Manga');
    const date = newsData.publishedAt ? new Date(newsData.publishedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="newsBg" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:#FF2E63" />
                <stop offset="100%" style="stop-color:#1a1a1a" />
            </linearGradient>
            <pattern id="mangaDots" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="3" cy="3" r="2" fill="white" fill-opacity="0.1" />
            </pattern>
        </defs>
        
        <rect width="1200" height="630" fill="url(#newsBg)" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        
        <!-- Header -->
        <rect x="0" y="0" width="1200" height="100" fill="rgba(0,0,0,0.5)" />
        <text x="60" y="65" font-family="sans-serif" font-weight="900" font-size="40" fill="#FF2E63">BINGEKI <tspan fill="white">NEWS</tspan></text>
        
        <!-- Title Box -->
        <rect x="60" y="250" width="1080" height="250" rx="10" fill="rgba(0,0,0,0.8)" stroke="#FF2E63" stroke-width="4" />
        
        <!-- Multi-line Title Support (Simple split) -->
        <text x="100" y="330" font-family="sans-serif" font-weight="900" font-size="50" fill="white">
            ${title.length > 40 ? title.substring(0, 40) + '...' : title}
        </text>
        
        <text x="100" y="420" font-family="sans-serif" font-weight="700" font-size="24" fill="#FF2E63">${source}</text>
        <text x="100" y="460" font-family="sans-serif" font-weight="400" font-size="20" fill="#a0a0a0">${date}</text>
        
        <text x="1100" y="580" text-anchor="end" font-family="sans-serif" font-weight="700" font-size="20" fill="#666666">bingeki.web.app</text>
    </svg>`;
}

// SVG Template for Generic Pages
function generateGenericSVG(title, description, lang) {
    const finalTitle = escapeHtml(title || (lang === 'en' ? 'Your Manga Adventure' : 'Votre aventure Manga'));
    const finalDesc = escapeHtml(description || '');
    
    // Clean up title (remove | Bingeki if present)
    const cleanTitle = finalTitle.split('|')[0].trim();

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="genBg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#FF2E63" />
                <stop offset="100%" style="stop-color:#080808" />
            </linearGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="10" />
                <feOffset dx="0" dy="10" result="offsetblur" />
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
        
        <!-- Decorative elements -->
        <circle cx="1100" cy="100" r="150" fill="white" fill-opacity="0.03" />
        <circle cx="100" cy="530" r="100" fill="#FF2E63" fill-opacity="0.1" />
        
        <!-- Branding -->
        <text x="600" y="100" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="30" fill="white" letter-spacing="10" opacity="0.5">BINGEKI</text>
        
        <!-- Content -->
        <g filter="url(#shadow)">
            <text x="600" y="320" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="80" fill="white">${cleanTitle}</text>
            <text x="600" y="400" text-anchor="middle" font-family="sans-serif" font-weight="400" font-size="24" fill="#FF2E63" opacity="0.9">
                ${finalDesc.length > 90 ? finalDesc.substring(0, 90) + '...' : finalDesc}
            </text>
        </g>
        
        <!-- Footer -->
        <rect x="500" y="550" width="200" height="2" fill="#FF2E63" />
        <text x="600" y="590" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="20" fill="white" opacity="0.4">bingeki.web.app</text>
    </svg>`;
}

// New route for directly serving the OG image binary (SVG)
app.get('/api/og-image/:type?/:id?', async (req, res) => {
    const { type, id } = req.params;
    const lang = req.query.lang || 'fr';
    const title = req.query.title || '';
    const desc = req.query.desc || '';
    
    console.log(`[OG-IMAGE] Request: ${type}/${id} (lang: ${lang})`);

    try {
        let svg = '';
        if (type === 'profile' && id) {
            const userDoc = await admin.firestore().collection('users').doc(id).get();
            if (userDoc.exists) {
                svg = generateProfileSVG(userDoc.data(), userDoc.data(), lang);
            }
        } else if (type === 'news' && id) {
            const newsDoc = await admin.firestore().collection('news').doc(id).get();
            if (newsDoc.exists) {
                svg = generateNewsSVG(newsDoc.data(), lang);
            }
        }
        
        // Fallback to generic if no specific data found or type is generic
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
    console.log('[SEO] Handling request:', url);

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
            console.log(`[SEO] Fetching user: ${profileUid}`);
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
            console.log(`[SEO] Fetching article: ${articleSlug}`);
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
        // Handle other routes for better titles
        const path = parts[parts.length - 1];
        if (path === 'leaderboard') {
            title = lang === 'en' ? "Leaderboard | Bingeki" : "Classement | Bingeki";
            description = lang === 'en' ? "Who are the top hunters? Check the global ranking!" : "Qui sont les meilleurs chasseurs ? Consultez le classement mondial !";
        } else if (path === 'badges') {
            title = lang === 'en' ? "Badges Gallery | Bingeki" : "Galerie des Badges | Bingeki";
            description = lang === 'en' ? "Discover all collectable badges and their requirements." : "Découvrez tous les badges à collectionner et comment les obtenir.";
        } else if (path === 'manga' || path === 'search') {
            title = lang === 'en' ? "Search Manga | Bingeki" : "Rechercher un Manga | Bingeki";
        } else if (path === 'survey') {
            title = lang === 'en' ? "Manga Survey | Bingeki" : "Sondage Manga | Bingeki";
        }

        // Use dynamic generic image for all other pages
        image = `https://bingeki.web.app/api/og-image?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}&lang=${lang}`;
    }

    // Load index.html
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

    // Inject Meta Tags
    const finalTitle = escapeHtml(title);
    const finalDesc = escapeHtml(description);
    const finalImage = image;
    const siteUrl = `https://bingeki.web.app${url}`;
    const finalUrl = escapeHtml(siteUrl);

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

    res.set('X-SEO-Handler', 'true');
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.send(html);
});

exports.seoHandler = functions.https.onRequest(app);
