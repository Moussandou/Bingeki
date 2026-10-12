/**
 * Onglet Automatisations : mode Auto / Manuel / Off par type de post,
 * santé des crons (vérifiée toute seule par le cron cronWatchdog),
 * réglages Buffer et outils à la demande.
 */
import { useState } from 'react';
import { Loader2, Play, Power } from 'lucide-react';
import { logger } from '@/utils/logger';
import type { BotConfig, CronHealth, CronId, ModeKey, PublishMode, WatchdogStatus } from '@/shared/socialBot';
import { CRON_META, getMode } from '@/shared/socialBot';
import {
    setTypeMode, setFallbackToManual, setPlatformMode, setBotEnabled, triggerCron,
} from '@/firebase/socialBot';
import { CultureNewsGenerator, SeasonPreviewGenerator } from './ManualTools';
import { TiktokAccountCard } from './TiktokAccountCard';
import { BufferQuotaCard } from './BufferQuotaCard';
import { HEALTH_ORDER, formatAgo, healthSummary } from './helpers';
import s from './SocialBot.module.css';

const TYPES: { key: ModeKey; label: string; desc: string; when: string }[] = [
    { key: 'daily', label: 'Sorties du jour', desc: 'Épisodes sortis dans la journée', when: 'Généré à 10h · prévu le soir' },
    { key: 'weekly', label: 'Récap hebdo', desc: 'Top de la semaine Bingeki', when: 'Dimanche · 19h' },
    { key: 'favorite', label: 'Coup de cœur', desc: 'Épisodes les mieux notés de la semaine', when: 'Dimanche · 21h' },
    { key: 'newseason', label: 'Nouvelle saison', desc: 'Quand une suite démarre', when: 'Tous les jours · 8h, si besoin' },
    { key: 'announcement', label: 'Prochainement', desc: 'Annonces de futures saisons', when: 'Lun / Mer / Ven · 15h' },
    { key: 'seasonPreview', label: 'Preview de saison', desc: 'Les animés de la saison suivante', when: '21 mars, juin, sept., déc. · 18h' },
    { key: 'cultureNewsAuto', label: 'Actu culture anime', desc: 'Veille des sites d\'actu', when: 'Toutes les 6 h' },
];

const MODES: { mode: PublishMode; label: string }[] = [
    { mode: 'auto', label: 'Auto' },
    { mode: 'manual', label: 'Manuel' },
    { mode: 'off', label: 'Off' },
];

interface Props {
    config: BotConfig;
    health: Record<string, CronHealth>;
    watchdog: WatchdogStatus | null;
    isSuperAdmin: boolean;
}

export function AutomationsView({ config, health, watchdog, isSuperAdmin }: Props) {
    const [running, setRunning] = useState<CronId | null>(null);
    const { failing, ok } = healthSummary(health);

    const changeMode = (key: ModeKey, mode: PublishMode) => {
        setTypeMode(key, mode).catch((e) => {
            logger.error('[SocialBot] set mode failed:', e);
            alert('Changement de mode impossible.');
        });
    };

    const runNow = async (cronId: CronId) => {
        if (!confirm(`Lancer « ${CRON_META[cronId].label} » maintenant ?`)) return;
        setRunning(cronId);
        try {
            const res = await triggerCron(cronId);
            alert(res?.result?.note ? `${CRON_META[cronId].label} : ${res.result.note}` : `${CRON_META[cronId].label} lancé`);
        } catch (e) {
            logger.error(`[SocialBot] trigger ${cronId} failed:`, e);
            alert(`${CRON_META[cronId].label} a échoué : ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setRunning(null);
        }
    };

    const toggleBot = () => {
        if (config.enabled && !confirm('Tout couper ? Plus aucun post ne sera généré ni publié.')) return;
        setBotEnabled(!config.enabled).catch((e) => {
            logger.error('[SocialBot] kill-switch failed:', e);
            alert('Impossible de changer l\'état du bot.');
        });
    };

    return (
        <div className={s.autoGrid}>
            <section className={s.panel} aria-labelledby="types-title">
                <h2 id="types-title" className={s.panelTitle}>Types de posts</h2>
                <p className={s.muted}>
                    <strong>Auto</strong> : Buffer publie sans toi. <strong>Manuel</strong> : tu valides, tu choisis le son et tu publies depuis ton tel. <strong>Off</strong> : plus généré.
                </p>
                <div className={s.typeList}>
                    {TYPES.map((t) => {
                        const mode = getMode(config, t.key);
                        return (
                            <div key={t.key} className={s.typeRow}>
                                <div className={s.typeInfo}>
                                    <strong>{t.label}</strong>
                                    <span className={s.small}>{t.desc} · {t.when}</span>
                                </div>
                                <div className={`${s.segmented} ${s.modeSeg}`} role="group" aria-label={`Mode ${t.label}`}>
                                    {MODES.map((m) => (
                                        <button
                                            key={m.mode}
                                            type="button"
                                            aria-pressed={mode === m.mode}
                                            data-mode={m.mode}
                                            disabled={!isSuperAdmin}
                                            onClick={() => mode !== m.mode && changeMode(t.key, m.mode)}
                                        >
                                            {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <label className={`${s.check} ${s.fallback}`}>
                    <input
                        type="checkbox"
                        checked={config.fallbackToManual !== false}
                        disabled={!isSuperAdmin}
                        onChange={(e) => setFallbackToManual(e.target.checked).catch((err) => logger.error(err))}
                    />
                    <span><strong>Si Buffer échoue, passer le post en Manuel</strong> au lieu de le perdre : il revient dans l'onglet Valider.</span>
                </label>
                {!isSuperAdmin && <p className={s.small}>Seul un superAdmin peut changer les modes.</p>}
            </section>

            <div className={s.stack}>
                <section className={s.panel} aria-labelledby="health-title">
                    <div className={s.sectionHead}>
                        <h2 id="health-title" className={s.panelTitle}>Santé</h2>
                        <span className={`${s.chip} ${ok ? s.chipOk : s.chipErr}`}>
                            {ok ? 'Tout va bien' : `${failing.length} en erreur`}
                        </span>
                    </div>
                    <p className={s.muted}>
                        Vérifiée toute seule toutes les 30 min · {watchdog?.checkedAt ? `dernière vérif ${formatAgo(watchdog.checkedAt)}` : 'première vérif à venir'}.
                        Un cron en erreur est relancé une fois automatiquement.
                    </p>
                    <ul className={s.healthList}>
                        {HEALTH_ORDER.map((id) => {
                            const h = health[id];
                            const status = h?.lastStatus;
                            const retried = h?.lastAutoRetryAt && h.autoRetriedFor === h.lastRunAt;
                            return (
                                <li key={id} className={s.healthRow}>
                                    <span className={`${s.dot} ${status === 'error' ? s.dotErr : status === 'running' ? s.dotRun : status === 'success' ? s.dotOk : s.dotIdle}`} aria-hidden="true" />
                                    <span className={s.healthText}>
                                        <span>{CRON_META[id].label}</span>
                                        {status === 'error' && h?.lastError && (
                                            <span className={s.errText}>{retried ? 'Relancé, toujours en erreur : ' : ''}{h.lastError}</span>
                                        )}
                                    </span>
                                    <span className={s.small}>
                                        {status === 'running' ? 'en cours' : h ? formatAgo(h.lastRunEndAt || h.lastRunAt) : 'jamais lancé'}
                                    </span>
                                    {isSuperAdmin && (
                                        <button
                                            type="button"
                                            className={s.iconBtn}
                                            aria-label={`Lancer ${CRON_META[id].label}`}
                                            title="Lancer maintenant"
                                            onClick={() => runNow(id)}
                                            disabled={running !== null}
                                        >
                                            {running === id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </section>

                <TiktokAccountCard />

                <BufferQuotaCard />

                <section className={s.panel} aria-labelledby="buffer-title">
                    <h2 id="buffer-title" className={s.panelTitle}>Buffer (mode Auto)</h2>
                    {(['insta', 'tiktok'] as const).map((k) => {
                        const fmt = config.platforms?.[k]?.mode ?? 'photo';
                        return (
                            <div key={k} className={s.typeRow}>
                                <strong>{k === 'insta' ? 'Instagram' : 'TikTok'}</strong>
                                <div className={s.segmented} role="group" aria-label={`Format ${k}`}>
                                    <button type="button" aria-pressed={fmt === 'photo'} disabled={!isSuperAdmin} onClick={() => setPlatformMode(k, 'photo').catch((e) => logger.error(e))}>Carrousel</button>
                                    <button type="button" aria-pressed={fmt === 'video'} disabled={!isSuperAdmin} onClick={() => setPlatformMode(k, 'video').catch((e) => logger.error(e))}>Vidéo</button>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {isSuperAdmin && (
                    <section className={`${s.killPanel} ${config.enabled ? '' : s.killOff}`}>
                        <div>
                            <strong className={s.panelTitle}>{config.enabled ? 'Tout couper' : 'Bot coupé'}</strong>
                            <p className={s.small}>
                                {config.enabled ? 'Arrête la génération et toute publication auto.' : 'Plus rien n\'est généré ni publié.'}
                            </p>
                        </div>
                        <button type="button" className={s.btn} onClick={toggleBot}>
                            <Power size={16} /> {config.enabled ? 'Couper' : 'Relancer le bot'}
                        </button>
                    </section>
                )}
            </div>

            <section className={`${s.panel} ${s.toolsPanel}`} aria-labelledby="tools-title">
                <h2 id="tools-title" className={s.panelTitle}>À la demande</h2>
                <div className={s.toolsGrid}>
                    <SeasonPreviewGenerator />
                    <CultureNewsGenerator />
                </div>
            </section>
        </div>
    );
}
