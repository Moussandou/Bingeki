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

    // Fetch Profile Data
    if (profileUid) {
        try {
            const userDoc = await admin.firestore().collection('users').doc(profileUid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                const name = data.displayName || 'User';
                title = lang === 'en' ? `${name}'s Profile | Bingeki` : `Profil de ${name} | Bingeki`;
                description = data.bio || (lang === 'en' ? `Check out ${name}'s progress on Bingeki!` : `Découvrez la progression de ${name} sur Bingeki !`);
                image = data.photoURL || image;
            }
        } catch (e) {
            console.error('[SEO] Error fetching user:', e);
        }
    }

    // Fetch News Article Data
    if (articleSlug) {
        try {
            const newsDoc = await admin.firestore().collection('news').doc(articleSlug).get();
            if (newsDoc.exists) {
                const data = newsDoc.data();
                title = (lang === 'en' ? data.title_en : data.title_fr) || data.title || title;
                description = (lang === 'en' ? data.excerpt_en : data.excerpt_fr) || data.excerpt || description;
                image = data.image || image;
            }
        } catch (e) {
            console.error('[SEO] Error fetching news:', e);
        }
    }

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

    // Inject Meta Tags
    // We replace the default values in index.html with the specialized ones
    const finalTitle = escapeHtml(title);
    const finalDesc = escapeHtml(description);
    const finalImage = escapeHtml(image);

    html = html
        .replace(/<title>.*?<\/title>/g, `<title>${finalTitle}</title>`)
        .replace(/<meta name="title" content=".*?" \/>/g, `<meta name="title" content="${finalTitle}" />`)
        .replace(/<meta name="description" content=".*?" \/>/g, `<meta name="description" content="${finalDesc}" />`)
        .replace(/<meta property="og:title" content=".*?" \/>/g, `<meta property="og:title" content="${finalTitle}" />`)
        .replace(/<meta property="og:description" content=".*?" \/>/g, `<meta property="og:description" content="${finalDesc}" />`)
        .replace(/<meta property="og:image" content=".*?" \/>/g, `<meta property="og:image" content="${finalImage}" />`)
        .replace(/<meta name="twitter:title" content=".*?" \/>/g, `<meta name="twitter:title" content="${finalTitle}" />`)
        .replace(/<meta name="twitter:description" content=".*?" \/>/g, `<meta name="twitter:description" content="${finalDesc}" />`)
        .replace(/<meta name="twitter:image" content=".*?" \/>/g, `<meta name="twitter:image" content="${finalImage}" />`);

    res.send(html);
});

exports.seoHandler = functions.https.onRequest(app);
