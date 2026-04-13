const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

if (!fs.existsSync(indexPath)) {
    console.error('dist/index.html not found. Run build first.');
    process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Update for English
const enHtml = html
    .replace('lang="fr"', 'lang="en"')
    // Title (All variations)
    .replace(/<title>[^]*?<\/title>/, '<title>Bingeki | Your Manga Adventure</title>')
    .replace(/<meta name="title" content="[^]*?" \/>/, '<meta name="title" content="Bingeki | Your Manga Adventure" />')
    .replace(/<meta property="og:title" content="[^]*?" \/>/, '<meta property="og:title" content="Bingeki | Your Manga Adventure" />')
    .replace(/<meta name="twitter:title" content="[^]*?" \/>/, '<meta name="twitter:title" content="Bingeki | Your Manga Adventure" />')
    // Description (All variations)
    .replace(/<meta name="description"[^]*?content="[^]*?" \/>/, '<meta name="description" content="Transform your manga passion into an RPG quest! Track your reading, earn XP, unlock badges, and compete with friends. 🎮📚" />')
    .replace(/<meta property="og:description"[^]*?content="[^]*?" \/>/, '<meta property="og:description" content="Transform your manga passion into an RPG quest! Track your reading, earn XP, unlock badges, and compete with friends. 🎮📚" />')
    .replace(/<meta name="twitter:description"[^]*?content="[^]*?" \/>/, '<meta name="twitter:description" content="Transform your manga passion into an RPG quest! Track your reading, earn XP, unlock badges, and compete with friends. 🎮📚" />')
    // Image
    .replace(/<meta property="og:image" content="[^]*?" \/>/, '<meta property="og:image" content="https://bingeki.web.app/bingeki-preview-en.png" />')
    .replace(/<meta name="twitter:image" content="[^]*?" \/>/, '<meta name="twitter:image" content="https://bingeki.web.app/bingeki-preview-en.png" />')
    // Locale
    .replace(/<meta property="og:locale" content="fr_FR" \/>/, '<meta property="og:locale" content="en_US" />')
    .replace(/<meta property="og:locale:alternate" content="en_US" \/>/, '<meta property="og:locale:alternate" content="fr_FR" />')
    // JSON-LD
    .replace(/"description": "Transformez[^]*?"/, '"description": "Transform your manga passion into an RPG quest! Track your reading, earn XP, unlock badges, and compete with friends."');

fs.writeFileSync(path.join(distPath, 'index-en.html'), enHtml);
console.log('Successfully generated dist/index-en.html');
