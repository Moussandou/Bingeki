/**
 * Quota de l'API Buffer : 3000 requêtes sur 30 jours, 250 par jour.
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
    const last30 = Object.entries(days).reduce((sum, [d, n]) => (d >= cutoff ? sum + (Number(n) || 0) : sum), 0);
    const today = Number(days[dayKey(now)]) || 0;
    const firstDay = Object.keys(days).sort()[0];
    const blocked = !!usage?.lastRateLimitAt && now - usage.lastRateLimitAt < 86_400_000;

    return (
        <section className={s.panel} aria-labelledby="quota-title">
            <div className={s.sectionHead}>
                <h2 id="quota-title" className={s.panelTitle}>Quota Buffer</h2>
                {blocked && <span className={`${s.chip} ${s.chipErr}`}>Atteint</span>}
            </div>
            <Gauge value={last30} max={BUFFER_LIMIT_30D} label="sur 30 jours" />
            <Gauge value={today} max={BUFFER_LIMIT_24H} label="aujourd'hui" />
            {blocked && (
                <p className={s.errText}>
                    Buffer a refusé une requête {formatAgo(usage!.lastRateLimitAt!)} (quota dépassé) : publication auto et stats reprendront quand il se libère.
                </p>
            )}
            <p className={s.small}>
                Au-delà de 80 %, les stats se mettent en pause pour garder la publication.
                {firstDay ? ` Compté depuis le ${new Date(firstDay).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}.` : ' Le comptage démarre au prochain appel à Buffer.'}
            </p>
        </section>
    );
}
