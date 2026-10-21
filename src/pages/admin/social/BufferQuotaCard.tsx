/**
 * Quota de l'API Buffer : 2000 requêtes sur 30 jours (1000 par chaîne), 600 par jour.
 * Buffer n'expose pas de compteur, on affiche celui tenu côté serveur
 * (functions/social/shared/bufferUsage.js).
 */
import { useEffect, useState } from 'react';
import type { BufferUsage } from '@/shared/socialBot';
import { BUFFER_LIMIT_24H, BUFFER_LIMIT_30D } from '@/shared/socialBot';
import { subscribeToBufferUsage } from '@/firebase/socialBot';
import { formatAgo } from './helpers';
import s from './SocialBot.module.css';

const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

function Gauge({ value, max, label }: { value: number; max: number; label: string }) {
    const ratio = Math.min(value / max, 1);
    const level = ratio >= 0.8 ? s.gaugeHigh : ratio >= 0.5 ? s.gaugeMid : '';
    return (
        <div className={s.gaugeBlock}>
            <div className={s.gaugeHead}>
                <span className={s.kpiValue}>{value}</span>
                <span className={s.small}>/ {max} {label}</span>
            </div>
            <div
                className={s.gauge}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-label={`Quota Buffer ${label}`}
            >
                <div className={`${s.gaugeFill} ${level}`} style={{ width: `${ratio * 100}%` }} />
            </div>
        </div>
    );
}

export function BufferQuotaCard() {
    const [usage, setUsage] = useState<BufferUsage | null>(null);
    const [now] = useState(() => Date.now());

    useEffect(() => subscribeToBufferUsage(setUsage), []);

    const days = usage?.days ?? {};
    const cutoff = dayKey(now - 29 * 86_400_000);
    const counted30 = Object.entries(days).reduce((sum, [d, n]) => (d >= cutoff ? sum + (Number(n) || 0) : sum), 0);
    const countedToday = Number(days[dayKey(now)]) || 0;
    const firstDay = Object.keys(days).sort()[0];

    // Les vrais chiffres de Buffer (en-têtes de sa dernière réponse) priment
    // sur notre compteur, qui ne voit que les appels faits depuis sa mise en place.
    const fresh = !!usage?.realAt && now - usage.realAt < 86_400_000;
    const used = (w?: { limit: number | null; remaining: number | null }) =>
        (w && w.limit != null && w.remaining != null ? w.limit - w.remaining : null);
    const real30 = fresh ? used(usage?.real?.w30d) : null;
    const real24 = fresh ? used(usage?.real?.w24h) : null;
    const last30 = real30 ?? counted30;
    const today = real24 ?? countedToday;
    const max30 = (fresh && usage?.real?.w30d?.limit) || BUFFER_LIMIT_30D;
    const max24 = (fresh && usage?.real?.w24h?.limit) || BUFFER_LIMIT_24H;
    const resetIn = fresh ? usage?.real?.w30d?.resetIn : null;
    const blocked = (real30 != null && real30 >= max30)
        || (!!usage?.lastRateLimitAt && now - usage.lastRateLimitAt < 86_400_000);

    return (
        <section className={s.panel} aria-labelledby="quota-title">
            <div className={s.sectionHead}>
                <h2 id="quota-title" className={s.panelTitle}>Quota Buffer</h2>
                {blocked && <span className={`${s.chip} ${s.chipErr}`}>Atteint</span>}
            </div>
            <Gauge value={last30} max={max30} label="sur 30 jours" />
            <Gauge value={today} max={max24} label="sur 24 h" />
            {blocked && (
                <p className={s.errText}>
                    Quota atteint : la publication via Buffer et les stats reprendront quand des requêtes se libèrent
                    {resetIn ? ` (fenêtre de 30 jours : remise à zéro dans ${Math.ceil(resetIn / 86_400)} j)` : ''}.
                </p>
            )}
            <p className={s.small}>
                {fresh
                    ? `Chiffres donnés par Buffer ${formatAgo(usage!.realAt!)}.`
                    : firstDay
                        ? `Appels comptés depuis le ${new Date(firstDay).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} (les vrais chiffres de Buffer s'afficheront à son prochain appel).`
                        : 'Les vrais chiffres de Buffer s\'afficheront à son prochain appel.'}
                {' '}Au-delà de 50 %, les stats se mettent en pause : l'autre moitié reste à la publication. Stats Insta relues à J+1 et J+7 seulement ; TikTok passe par le compte connecté, sans quota Buffer.
            </p>
        </section>
    );
}
