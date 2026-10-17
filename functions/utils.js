/**
 * Simple HTML escape utility to prevent XSS in generated SVGs or HTML strings.
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function safeImageUrl(value) {
    if (typeof value !== 'string') return '';
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password ? escapeHtml(url.href) : '';
    } catch {
        return '';
    }
}

function safeColor(value, fallback) {
    return typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value) ? value : fallback;
}

function safeStat(value, fallback = 0) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? Math.min(Math.floor(value), Number.MAX_SAFE_INTEGER) : fallback;
}

module.exports = {
    escapeHtml,
    safeImageUrl,
    safeColor,
    safeStat,
};
