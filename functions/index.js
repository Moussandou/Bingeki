const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const fs = require('fs');
const path = require('path');

admin.initializeApp();

const app = express();

// Helper to escape HTML to prevent XSS (though here we control the tags)
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
    if (profileUid) { // Changed from isProfile to profileUid
        try {
            console.log(`[SEO] Fetching user: ${profileUid}`);
            const userDoc = await admin.firestore().collection('users').doc(profileUid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                console.log(`[SEO] User found: ${userData.displayName || 'No Name'}`);
                title = lang === 'en' ? `${userData.displayName || 'User'}'s Profile | Bingeki` : `Profil de ${userData.displayName || 'Utilisateur'} | Bingeki`; // Adjusted for lang
                description = userData.bio || (lang === 'en' ? `Check out ${userData.displayName || 'User'}'s progress on Bingeki!` : `Découvrez la progression de ${userData.displayName || 'Utilisateur'} sur Bingeki !`); // Adjusted for lang
                image = userData.photoURL || image;
            } else {
                console.log(`[SEO] User not found: ${profileUid}`);
            }
        } catch (e) {
            console.error('[SEO] Firestore error (Profile):', e);
        }
    } else if (articleSlug) { // Changed from isNews to articleSlug
        try {
            console.log(`[SEO] Fetching article: ${articleSlug}`);
            const newsSnapshot = await admin.firestore().collection('news').doc(articleSlug).get();
            if (newsSnapshot.exists) {
                const newsData = newsSnapshot.data();
                console.log(`[SEO] Article metadata -> Keys: ${Object.keys(newsData).join(',')}`);
                
                // Title
                title = (lang === 'en' ? newsData.title_en : newsData.title_fr) || newsData.title || title;
                
                // Description (try contentSnippet first, then excerpt, then summary, then content)
                description = newsData.contentSnippet || newsData.excerpt || newsData.summary || newsData.content?.substring(0, 200).replace(/<[^>]*>/g, '') || description;
                
                // Image (try imageUrl first, then image, then thumbnail)
                image = newsData.imageUrl || newsData.image || newsData.thumbnail || image;
                
                console.log(`[SEO] Article found: ${title.substring(0, 30)}... | Desc: ${description?.substring(0, 30)}... | Image: ${image?.substring(0, 30)}...`);
            } else {
                console.log(`[SEO] Article NOT found in Firestore: ${articleSlug}`);
            }
        } catch (e) {
            console.error('[SEO] Firestore error (News):', e);
        }
    }

    console.log(`[SEO] Final Meta -> Title: ${title}, Desc: ${description?.substring(0, 30)}...`);

    // Load index.html
    // Note: When deployed, we need to make sure index.html is accessible to the function.
    const indexFileName = lang === 'en' ? 'index-en.html' : 'index.html';
    const indexPath = path.join(__dirname, indexFileName);
    let html;
    try {
        html = fs.readFileSync(indexPath, 'utf8');
    } catch (e) {
        console.error(`[SEO] Could not read ${indexFileName} at ${indexPath}`);
        // Try fallback to index.html if specific one is missing
        try {
            html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
        } catch (e2) {
            console.error('[SEO] Critical error: could not read any index.html');
            return res.status(500).send('Maintenance en cours... (SEO Error)');
        }
    }

    // Dynamic Screenshot Support
    // Use Microlink to capture a real-time screenshot of the page.
    const siteUrl = `https://bingeki.web.app${url}`;
    
    // Dynamic Screenshot Support via Microlink
    if (url.includes('/profile/') || url.includes('/news/article/')) {
        const encodedUrl = encodeURIComponent(siteUrl);
        const waitFor = url.includes('/profile/') ? '.hunter-license-card' : 'article';
        
        // Use i.microlink.io as a proxy to return a direct image binary for social media bots
        const microlinkParams = `url=${encodedUrl}&screenshot=true&wait=4000&waitFor=${waitFor}&colorScheme=dark&viewport.width=1200&viewport.height=630&timeout=20000`;
        image = `https://i.microlink.io/${encodeURIComponent(`https://api.microlink.io/?${microlinkParams}`)}`;
        console.log(`[SEO] Dynamic image proxy set up for: ${url}`);
    }

    // Inject Meta Tags
    const finalTitle = escapeHtml(title);
    const finalDesc = escapeHtml(description);
    const finalImage = image; // Don't escape the screenshot URL as it's already a clean API URL
    const finalUrl = escapeHtml(siteUrl);

    // Helper to log replacement status
    const countMatches = (regex) => (html.match(regex) || []).length;
    console.log(`[SEO] Replacements -> Title: ${countMatches(/<title>[^]*?<\/title>/g)}, OG:Title: ${countMatches(/<meta\s+property="og:title"\s+content="[^]*?"\s*\/?>/g)}, OG:Image: ${countMatches(/<meta\s+property="og:image"\s+content="[^]*?"\s*\/?>/g)}`);

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
        .replace(/<meta\s+name="twitter:image"\s+content="[^]*?"\s*\/?>/g, `<meta name="twitter:image" content="${finalImage}" />`);

    res.set('X-SEO-Handler', 'true');
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    res.send(html);
});

exports.seoHandler = functions.https.onRequest(app);
