const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { Timestamp } = require("firebase-admin/firestore");
const { escapeHtml } = require("./utils");
const { getPathContext, resolveStaticSeo } = require("./seoResolver");

// ==================== SVG GENERATORS ====================

function generateBrutalistBaseSVG({ title, subtitle, badges = [], lang = 'fr', type = 'generic' }) {
    const isDark = true; // Most OG images look better in dark mode for Bingeki
    const primaryColor = '#FF2E63';
    const bgColor = '#121212';
    const borderColor = '#000000';
    const textColor = '#ffffff';
    const subTextColor = '#FF2E63';

    const cleanTitle = escapeHtml(title || 'Bingeki');
    const cleanSubtitle = escapeHtml(subtitle || '');

    // Layout configuration based on type
    const showHeader = ['library', 'social', 'trending', 'challenges', 'tierlist', 'lens', 'changelog'].includes(type);
    const headerTitle = {
        library: lang === 'en' ? 'LIBRARY' : 'BIBLIOTHÈQUE',
        social: lang === 'en' ? 'COMMUNITY' : 'COMMUNAUTÉ',
        trending: lang === 'en' ? 'TRENDING' : 'TENDANCES',
        challenges: lang === 'en' ? 'CHALLENGES' : 'DÉFIS',
        tierlist: 'TIER LISTS',
        lens: 'LENS',
        changelog: 'CHANGELOG'
    }[type] || 'BINGEKI';

    return `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
        <defs>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@900&amp;family=Inter:wght@400;700;800&amp;display=swap');
                .heading { font-family: 'Outfit', sans-serif; font-weight: 900; text-transform: uppercase; }
                .body { font-family: 'Inter', sans-serif; }
                .text-outline { 
                    paint-order: stroke fill;
                    stroke: #000;
                    stroke-width: 8px;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                }
                .manga-title {
                    font-family: 'Outfit', sans-serif;
                    font-weight: 900;
                    text-transform: uppercase;
                }
            </style>
            <pattern id="mangaDots" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" fill-opacity="0.1" />
            </pattern>
            <filter id="brutalistShadow">
                <feOffset dx="8" dy="8" />
                <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 1 0" />
                <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        <!-- Background Layer -->
        <rect width="1200" height="630" fill="${bgColor}" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        
        <!-- Speedlines (Simulated with Rays) -->
        <g opacity="0.05">
            ${Array.from({ length: 12 }).map((_, i) => {
                const angle = (i * 30) * (Math.PI / 180);
                const x2 = 600 + 1000 * Math.cos(angle);
                const y2 = 315 + 1000 * Math.sin(angle);
                return `<line x1="600" y1="315" x2="${x2}" y2="${y2}" stroke="white" stroke-width="20" />`;
            }).join('')}
        </g>

        <!-- Main Panel -->
        <rect x="40" y="40" width="1120" height="550" fill="none" stroke="${borderColor}" stroke-width="12" />
        
        ${showHeader ? `
            <rect x="40" y="40" width="1120" height="100" fill="${borderColor}" />
            <text x="70" y="110" class="heading" font-size="60" fill="white" letter-spacing="4">${headerTitle}</text>
            <rect x="1110" y="40" width="50" height="100" fill="${primaryColor}" />
        ` : `
            <!-- Hero Centered Layout -->
            <text x="600" y="120" text-anchor="middle" class="heading" font-size="120" fill="white" opacity="0.1" letter-spacing="20">BINGEKI</text>
        `}

        <g transform="translate(0, ${showHeader ? 40 : 0})">
            <!-- Center Content -->
            <text x="600" y="320" text-anchor="middle" class="heading text-outline" font-size="100" fill="white" letter-spacing="-2">${cleanTitle}</text>
            <text x="600" y="400" text-anchor="middle" class="body" font-size="32" font-weight="800" fill="${primaryColor}" letter-spacing="2" text-transform="uppercase">${cleanSubtitle}</text>
        </g>

        <!-- Bottom Accents -->
        <rect x="40" y="550" width="1120" height="40" fill="${borderColor}" />
        <text x="1130" y="578" text-anchor="end" class="heading" font-size="18" fill="white" opacity="0.6" letter-spacing="2">BINGEKI.WEB.APP</text>
        
        <!-- Badges / Accents -->
        <g transform="translate(1000, 480)">
             <rect x="0" y="0" width="120" height="60" fill="${primaryColor}" stroke="${borderColor}" stroke-width="4" transform="rotate(-5)" />
             <text x="60" y="42" text-anchor="middle" class="heading" font-size="24" fill="white" transform="rotate(-5)">QUEST</text>
        </g>
    </svg>`;
}

function generateLibrarySVG(lang) {
    const title = lang === 'en' ? 'MANGA ADVENTURE' : 'VOTRE AVENTURE';
    const subtitle = lang === 'en' ? 'TRACK YOUR JOURNEY' : 'SUIVEZ VOTRE QUÊTE';
    
    // Replicating elements of MockupLibrary
    const svgBase = generateBrutalistBaseSVG({ title, subtitle, lang, type: 'library' });
    
    // Inject library specific elements (Mock cards)
    const cards = `
        <g transform="translate(80, 200)">
            ${[0, 1, 2, 3].map((i) => `
                <g transform="translate(${i * 260}, 0)">
                    <rect width="220" height="300" fill="#1e1e1e" stroke="black" stroke-width="5" />
                    <rect y="240" width="220" height="60" fill="black" />
                    <text x="110" y="275" text-anchor="middle" class="heading" font-size="14" fill="white">MANGA ${i + 1}</text>
                    <rect x="20" y="220" width="180" height="8" fill="#333" rx="4" />
                    <rect x="20" y="220" width="${40 + i * 30}" height="8" fill="#FF2E63" rx="4" />
                </g>
            `).join('')}
        </g>
    `;
    
    return svgBase.replace('</svg>', `${cards}</svg>`);
}

function generateSocialSVG(lang) {
    const title = lang === 'en' ? 'LEADERBOARD' : 'CLASSEMENT';
    const subtitle = lang === 'en' ? 'COMPETE WITH FRIENDS' : 'DÉFIEZ VOS AMIS';
    const svgBase = generateBrutalistBaseSVG({ title, subtitle, lang, type: 'social' });
    
    // Podium logic
    const podium = `
        <g transform="translate(600, 480)">
            <!-- 2nd -->
            <rect x="-250" y="-120" width="140" height="120" fill="silver" stroke="black" stroke-width="5" opacity="0.8" />
            <circle cx="-180" cy="-170" r="40" fill="#333" stroke="white" stroke-width="3" />
            <!-- 1st -->
            <rect x="-70" y="-180" width="140" height="180" fill="#FFD700" stroke="black" stroke-width="5" />
            <circle cx="0" cy="-240" r="50" fill="#333" stroke="#FFD700" stroke-width="5" />
            <text x="0" y="-290" text-anchor="middle" font-size="40">👑</text>
            <!-- 3rd -->
            <rect x="110" y="-80" width="140" height="80" fill="#cd7f32" stroke="black" stroke-width="5" opacity="0.8" />
            <circle cx="180" cy="-130" r="35" fill="#333" stroke="white" stroke-width="3" />
        </g>
    `;
    return svgBase.replace('</svg>', `${podium}</svg>`);
}

function generateTrendingSVG(lang) {
    const title = lang === 'en' ? 'TRENDING ART' : 'TENDANCES';
    const subtitle = lang === 'en' ? 'WHAT\'S HOT NOW' : 'LES INCONTOURNABLES';
    const svgBase = generateBrutalistBaseSVG({ title, subtitle, lang, type: 'trending' });
    
    const trending = `
        <g transform="translate(100, 180)">
             <rect width="1000" height="300" fill="none" stroke="#FF2E63" stroke-width="4" stroke-dasharray="20 10" />
             <text x="500" y="160" text-anchor="middle" class="heading" font-size="80" fill="#FF2E63" opacity="0.2">TOP MANGA</text>
        </g>
    `;
    return svgBase.replace('</svg>', `${trending}</svg>`);
}

function generateGenericBrutalistSVG(lang, type) {
    const titles = {
        challenges: lang === 'en' ? 'MISSION BOARD' : 'TABLEAU DES DÉFIS',
        tierlist: lang === 'en' ? 'COMMUNITY TIERS' : 'TIER LISTS COMMUNAUTÉ',
        lens: lang === 'en' ? 'BINGEKI LENS' : 'EXPLORATION LENS',
        changelog: lang === 'en' ? 'NEW UPDATES' : 'MISES À JOUR'
    };
    const title = titles[type] || 'BINGEKI';
    const subtitle = lang === 'en' ? 'LEVEL UP YOUR EXPERIENCE' : 'BOOSTEZ VOTRE AVENTURE';
    return generateBrutalistBaseSVG({ title, subtitle, lang, type });
}

// ==================== SVG GENERATORS ====================

function generateProfileSVG(userData, lang) {
    const displayName = escapeHtml(userData.displayName || 'Chasseur');
    const level = userData.level || 1;
    const xp = userData.xp || 0;
    const xpToNextLevel = userData.xpToNextLevel || (level * 100);
    const streak = userData.streak || 0;
    const badgeCount = (userData.badges || []).length;
    const photoURL = userData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.displayName || 'Bingeki')}`;
    const banner = userData.banner || '';
    const bio = escapeHtml(userData.bio || '');
    const uid = userData.uid ? userData.uid.slice(0, 8).toUpperCase() : 'BINGEKI';
    
    const primaryColor = userData.themeColor || '#FF2E63';
    const borderColor = userData.borderColor || '#000000';
    const bgColor = userData.cardBgColor || '#1e1e1e';
    const textColor = (bgColor === '#000000' || bgColor === '#000' || bgColor === '#121212') ? '#ffffff' : '#e0e0e0';

    const labels = {
        title: lang === 'en' ? 'HUNTER LICENSE' : 'CARTE DE CHASSEUR',
        lvl: 'LVL',
        id: 'ID',
        xp: lang === 'en' ? 'XP' : 'XP',
        streak: lang === 'en' ? 'STREAK' : 'SÉRIE',
        badges: lang === 'en' ? 'BADGES' : 'BADGES',
        stats: lang === 'en' ? 'STATS' : 'STATS'
    };

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
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <rect x="50" y="50" width="1100" height="530" rx="15" fill="none" stroke="${borderColor}" stroke-width="10" />
        <rect x="50" y="50" width="1100" height="530" rx="15" fill="url(#panelGrad)" />
        <rect x="50" y="50" width="1100" height="140" fill="${primaryColor}" />
        ${banner ? `<image x="50" y="50" width="1100" height="140" xlink:href="${banner}" preserveAspectRatio="xMidYMid slice" />` : ''}
        <rect x="50" y="188" width="1100" height="2" fill="${borderColor}" />
        <rect x="50" y="190" width="1100" height="40" fill="${borderColor}" />
        <text x="75" y="217" class="heading" font-size="20" fill="white" letter-spacing="2">${labels.title}</text>
        <text x="1125" y="217" text-anchor="end" class="heading" font-size="20" fill="white" letter-spacing="1">ID: ${uid}</text>
        <rect x="145" y="215" width="170" height="170" rx="10" fill="${borderColor}" />
        <image x="150" y="220" width="160" height="160" xlink:href="${photoURL}" clip-path="url(#avatarClip)" preserveAspectRatio="xMidYMid slice" />
        <rect x="260" y="340" width="90" height="45" fill="${primaryColor}" stroke="${borderColor}" stroke-width="3" transform="rotate(-5, 305, 362)" />
        <text x="305" y="372" text-anchor="middle" class="heading" font-size="22" fill="white" transform="rotate(-5, 305, 362)">${labels.lvl} ${level}</text>
        <text x="360" y="290" class="heading" font-size="52" fill="${textColor}">${displayName}</text>
        <text x="360" y="325" class="mono" font-size="16" fill="${primaryColor}" opacity="0.8">BINGEKI HUNTER LICENSE VERIFIED</text>
        ${bio ? `
        <line x1="360" y1="360" x2="360" y2="440" stroke="${primaryColor}" stroke-width="3" />
        <text x="375" y="380" class="body" font-size="20" font-style="italic" fill="${textColor}" opacity="0.9">
            ${bio.length > 50 ? bio.substring(0, 47) + '...' : bio}
        </text>
        ` : ''}
        <polygon points="${gridPoints100}" fill="none" stroke="${textColor}" stroke-width="1" opacity="0.1" />
        <polygon points="${gridPoints50}" fill="none" stroke="${textColor}" stroke-width="1" opacity="0.1" />
        ${stats.map((s, i) => `<line x1="${centerX}" y1="${centerY}" x2="${getPoint(i, 100).split(',')[0]}" y2="${getPoint(i, 100).split(',')[1]}" stroke="${textColor}" stroke-width="1" opacity="0.1" />`).join('')}
        <polygon points="${polygonPoints}" fill="${primaryColor}" fill-opacity="0.6" stroke="${primaryColor}" stroke-width="3" />
        ${stats.map((s, i) => {
            const p = getPoint(i, 125);
            const [px, py] = p.split(',');
            return `<text x="${px}" y="${py}" text-anchor="middle" class="heading" font-size="12" fill="${textColor}" opacity="0.7">${s.label}</text>`;
        }).join('')}
        <rect x="145" y="470" width="910" height="80" rx="5" fill="rgba(0,0,0,0.3)" stroke="${borderColor}" stroke-width="2" />
        <text x="165" y="500" class="heading" font-size="14" fill="${textColor}" opacity="0.6">${labels.xp}</text>
        <rect x="165" y="515" width="400" height="12" rx="6" fill="#333" />
        <rect x="165" y="515" width="${Math.min((xp / xpToNextLevel) * 400, 400)}" height="12" rx="6" fill="${primaryColor}" />
        <text x="565" y="530" text-anchor="end" class="heading" font-size="14" fill="${textColor}">${xp} / ${xpToNextLevel}</text>
        <text x="650" y="500" class="heading" font-size="14" fill="${textColor}" opacity="0.6">${labels.streak}</text>
        <text x="650" y="535" class="heading" font-size="32" fill="white">${streak} <tspan font-size="20">🔥</tspan></text>
        <text x="850" y="500" class="heading" font-size="14" fill="${textColor}" opacity="0.6">${labels.badges}</text>
        <text x="850" y="535" class="heading" font-size="32" fill="white">${badgeCount} <tspan font-size="20">⭐</tspan></text>
        <text x="1150" y="610" text-anchor="end" class="heading" font-size="14" fill="${textColor}" opacity="0.3">BINGEKI.WEB.APP</text>
    </svg>`;
}

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
        <rect width="1200" height="630" fill="#121212" />
        <rect width="1200" height="630" fill="url(#mangaDots)" />
        <g filter="url(#shadow)">
            <rect x="100" y="100" width="1000" height="430" rx="20" fill="#1e1e1e" stroke="#000" stroke-width="5" />
            <clipPath id="newsImgClip">
                <rect x="100" y="100" width="400" height="430" rx="20 0 0 20" />
            </clipPath>
            <rect x="100" y="100" width="400" height="430" rx="20" fill="#333" />
            ${image ? `<image x="100" y="100" width="400" height="430" xlink:href="${image}" clip-path="url(#newsImgClip)" preserveAspectRatio="xMidYMid slice" />` : ''}
            <rect x="100" y="100" width="400" height="430" fill="rgba(255,46,99,0.1)" clip-path="url(#newsImgClip)" />
            <rect x="500" y="100" width="600" height="80" rx="0 20 0 0" fill="url(#newsGrad)" />
            <text x="530" y="150" class="heading" font-size="28" fill="white" letter-spacing="2">BINGEKI NEWS</text>
            <rect x="530" y="210" width="540" height="2" fill="#FF2E63" opacity="0.3" />
            <text x="530" y="245" class="heading" font-size="18" fill="#FF2E63">${source} • ${date}</text>
            <foreignObject x="530" y="270" width="540" height="200">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Outfit', sans-serif; font-weight: 900; font-size: 36px; color: white; line-height: 1.2; text-transform: uppercase;">
                    ${title}
                </div>
            </foreignObject>
            <text x="1070" y="500" text-anchor="end" class="heading" font-size="20" fill="#FF2E63">LIRE L'ARTICLE ➔</text>
        </g>
        <text x="1100" y="590" text-anchor="end" class="heading" font-size="18" fill="white" opacity="0.2">bingeki.web.app</text>
    </svg>`;
}

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
        <circle cx="1100" cy="100" r="200" fill="#FF2E63" fill-opacity="0.03" />
        <circle cx="100" cy="530" r="150" fill="#FF2E63" fill-opacity="0.05" />
        <text x="600" y="100" text-anchor="middle" class="heading" font-size="30" fill="white" letter-spacing="15" opacity="0.4">BINGEKI</text>
        <g filter="url(#shadow)">
            <rect x="200" y="200" width="800" height="250" rx="20" fill="#1e1e1e" stroke="#FF2E63" stroke-width="2" />
            <text x="600" y="310" text-anchor="middle" class="heading" font-size="70" fill="white">${cleanTitle}</text>
            <foreignObject x="250" y="340" width="700" height="100">
                <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: 'Inter', sans-serif; font-size: 20px; color: #FF2E63; text-align: center; line-height: 1.4; opacity: 0.9;">
                    ${finalDesc.length > 120 ? finalDesc.substring(0, 120) + '...' : finalDesc}
                </div>
            </foreignObject>
        </g>
        <rect x="550" y="520" width="100" height="4" rx="2" fill="#FF2E63" />
        <text x="600" y="580" text-anchor="middle" class="heading" font-size="16" fill="white" opacity="0.3" letter-spacing="5">JOIN THE ADVENTURE</text>
        <text x="600" y="610" text-anchor="middle" class="heading" font-size="12" fill="white" opacity="0.2">bingeki.web.app</text>
    </svg>`;
}

// ==================== SEO HANDLER APP ====================

const app = express();

app.get('/api/og-image/:type?/:id?', async (req, res) => {
    const { type, id } = req.params;
    const lang = req.query.lang || 'fr';
    const title = req.query.title || '';
    const desc = req.query.desc || '';
    const forceSvg = req.query.force_svg === 'true';

    // Performance Optimization: Redirect static routes to pre-rendered PNGs
    if (!type && !id && req.query.path && !forceSvg) {
        const p = req.query.path;
        const staticImageTypes = ['home', 'discover', 'social', 'schedule', 'news', 'changelog', 'trending', 'challenges', 'library', 'tierlist', 'lens'];
        const pageType = p === '/' ? 'home' : p.replace(/^\//, '').split('/')[0];
        
        if (staticImageTypes.includes(pageType)) {
            const filename = pageType === 'news' ? 'newsIndex' : pageType;
            // Map common aliases
            const finalFilename = filename === 'newsIndex' ? 'news' : filename;
            return res.redirect(301, `https://bingeki.web.app/og-images/${finalFilename}-${lang}.png`);
        }
    }

    try {
        let svg = '';
        if (type === 'profile' && id) {
            const userDoc = await admin.firestore().collection('users').doc(id).get();
            if (userDoc.exists) {
                svg = generateProfileSVG(userDoc.data(), lang);
            }
        } else if (type === 'news' && id) {
            const newsDoc = await admin.firestore().collection('news').doc(id).get();
            if (newsDoc.exists) {
                svg = generateNewsSVG(newsDoc.data(), lang);
            }
        } else if (['library', 'social', 'trending', 'challenges', 'tierlist', 'lens', 'changelog'].includes(type || id)) {
            const pageType = type || id;
            if (pageType === 'library') svg = generateLibrarySVG(lang);
            else if (pageType === 'social') svg = generateSocialSVG(lang);
            else if (pageType === 'trending') svg = generateTrendingSVG(lang);
            else svg = generateGenericBrutalistSVG(lang, pageType);
        } else if (type === 'work' || type === 'character' || type === 'person' || type === 'tierlist') {
            const kindLabel = {
                work: lang === 'en' ? 'Work Details' : 'Fiche oeuvre',
                character: lang === 'en' ? 'Character' : 'Personnage',
                person: lang === 'en' ? 'Person' : 'Personnalite',
                tierlist: 'Tier List'
            }[type] || '';
            svg = generateGenericSVG(kindLabel || title, desc, lang);
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
        let ogType = 'generic';
        if (workId) ogType = 'work';
        if (characterId) ogType = 'character';
        if (personId) ogType = 'person';
        if (tierlistId) ogType = 'tierlist';
        image = `https://bingeki.web.app/api/og-image/${ogType}?title=${encodeURIComponent(title)}&desc=${encodeURIComponent(description)}&lang=${lang}`;
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
    // s-maxage : le CDN Firebase Hosting cache le HTML par URL (purgé à chaque déploiement),
    // sinon chaque chargement dur paie un aller-retour Cloud Function
    res.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
    res.send(html);
});

exports.seoHandler = onRequest(app);
