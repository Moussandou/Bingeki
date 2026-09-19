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

async function sendWebhook(webhook, payload) {
    try {
        const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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

/**
 * Notify when a publish attempt failed on ONE or MORE platforms.
 * `errors` shape: { insta?: string, tiktok?: string }.
 * `partial` = true when at least one other platform succeeded.
 */
async function notifyPublishError(config, { title, postId, errors, partial, publishedBy }) {
    const webhook = config?.discordWebhook;
    if (!webhook) return { skipped: 'no webhook configured' };

    const failedPlatforms = Object.keys(errors).join(', ');
    const color = partial ? 0xF59E0B : 0xDC2626;
    const emoji = partial ? '⚠️' : '❌';
    const heading = partial
        ? `${emoji} Publish partiel — ${title}`
        : `${emoji} Publish échoué — ${title}`;
    const description = partial
        ? `Une plateforme a échoué mais le post est publié ailleurs. Retry possible depuis /admin/social.`
        : `Aucune plateforme n'a réussi. Le post reste en attente pour retry manuel.`;

    const errorFields = Object.entries(errors).map(([platform, msg]) => ({
        name: platform,
        value: `\`${String(msg).slice(0, 900)}\``,
        inline: false,
    }));

    const embed = {
        title: heading,
        description,
        color,
        fields: [
            { name: 'Plateformes en échec', value: failedPlatforms, inline: true },
            { name: 'ID', value: postId, inline: true },
            ...errorFields,
        ],
        footer: { text: `Publish par ${publishedBy || '—'} · ${new Date().toLocaleString('fr-FR')}` },
    };

    return sendWebhook(webhook, {
        content: partial ? undefined : `🚨 Publish complètement échoué sur **${failedPlatforms}**`,
        embeds: [embed],
    });
}

module.exports = { notifyPendingPost, notifyPublishError };
