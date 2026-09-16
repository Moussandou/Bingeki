/**
 * shared/discord.js — Discord webhook notifier.
 *
 * Called by the crons after createPendingPost() so the team can hop
 * into /admin/social and validate without checking every hour.
 *
 * The webhook URL lives in `social_bot_config/singleton.discordWebhook`.
 * If empty, calls become no-ops (no network) — safe by default.
 */

const TYPE_COLOR = {
    daily: 0x000000,
    weekly: 0xFF2E63,
    favorite: 0x08D9D6,
    newseason: 0xFF0844,
};

const TYPE_LABEL = {
    daily: 'Sorties du jour',
    weekly: 'Récap hebdo',
    favorite: 'Coup de cœur',
    newseason: 'Nouvelle saison',
};

async function notifyPendingPost(config, { type, title, postId, slidesCount = 0 }) {
    const webhook = config?.discordWebhook;
    if (!webhook) return { skipped: 'no webhook configured' };

    const embed = {
        title: `📣 Nouveau post à valider — ${TYPE_LABEL[type] || type}`,
        description: title,
        color: TYPE_COLOR[type] || 0x000000,
        fields: [
            { name: 'Slides', value: String(slidesCount), inline: true },
            { name: 'ID', value: postId, inline: true },
        ],
        footer: { text: `Bingeki social bot · ${new Date().toLocaleString('fr-FR')}` },
    };

    try {
        const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: 'Un post attend votre validation dans **/admin/social**.',
                embeds: [embed],
            }),
            signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) {
            const body = await res.text().catch(() => '');
            console.error(`[discord] webhook ${res.status}: ${body.slice(0, 300)}`);
            return { ok: false, status: res.status };
        }
        return { ok: true };
    } catch (err) {
        console.error('[discord] webhook failed:', err.message || err);
        return { ok: false, error: String(err) };
    }
}

module.exports = { notifyPendingPost };
