/**
 * CronHealthPanel — état d'exécution live de chaque cron du social bot.
 *
 * Lit `social_cron_health/<cronId>` en subscription et affiche pour
 * chaque cron : label, horaire, dernier statut, durée, dernier post créé,
 * bouton "Lancer maintenant" pour tester en dehors de l'horaire.
 */
import { useEffect, useState } from 'react';
import { Play, CheckCircle2, XCircle, Clock, Loader2, Activity } from 'lucide-react';
import { CRON_META, type CronId, type CronHealth } from '@/shared/socialBot';
import { subscribeToCronHealth, triggerCron } from '@/firebase/socialBot';
import { logger } from '@/utils/logger';

const CRON_ORDER: CronId[] = [
    'dailyReleases',
    'newSeasonDetector',
    'announcement',
    'weeklyRecap',
    'communityFavorite',
    'pollReach',
    'cleanupPending',
];

function formatDuration(ms: number | undefined): string {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60_000).toFixed(1)}min`;
}

function formatWhen(ts: number | undefined): string {
    if (!ts) return 'jamais';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'à l\'instant';
    if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)}min`;
    if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)}h`;
    const days = Math.floor(diff / 86_400_000);
    return days === 1 ? 'hier' : `il y a ${days}j`;
}

function StatusPill({ status }: { status: CronHealth['lastStatus'] }) {
    if (status === 'running') {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#fef3c7', color: '#78350f',
                padding: '2px 8px', fontSize: '0.62rem', fontWeight: 700,
                letterSpacing: 1, textTransform: 'uppercase', borderRadius: 2,
            }}>
                <Loader2 size={10} className="animate-spin" /> En cours
            </span>
        );
    }
    if (status === 'success') {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#d1fae5', color: '#065f46',
                padding: '2px 8px', fontSize: '0.62rem', fontWeight: 700,
                letterSpacing: 1, textTransform: 'uppercase', borderRadius: 2,
            }}>
                <CheckCircle2 size={10} /> Succès
            </span>
        );
    }
    if (status === 'error') {
        return (
            <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#fee2e2', color: '#991b1b',
                padding: '2px 8px', fontSize: '0.62rem', fontWeight: 700,
                letterSpacing: 1, textTransform: 'uppercase', borderRadius: 2,
            }}>
                <XCircle size={10} /> Erreur
            </span>
        );
    }
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: '#f5f5f5', color: '#666',
            padding: '2px 8px', fontSize: '0.62rem', fontWeight: 700,
            letterSpacing: 1, textTransform: 'uppercase', borderRadius: 2,
        }}>
            <Clock size={10} /> Jamais lancé
        </span>
    );
}

export function CronHealthPanel() {
    const [health, setHealth] = useState<Record<string, CronHealth>>({});
    const [running, setRunning] = useState<Set<CronId>>(new Set());

    useEffect(() => subscribeToCronHealth(setHealth), []);

    const handleTrigger = async (cronId: CronId) => {
        const label = CRON_META[cronId].label;
        if (!confirm(`Lancer maintenant "${label}" ? Le post sera créé avec les données réelles.`)) return;
        setRunning((s) => new Set(s).add(cronId));
        try {
            const res = await triggerCron(cronId);
            const note = res?.result?.note;
            alert(note ? `✓ ${label}\n${note}` : `✓ ${label} exécuté`);
        } catch (err) {
            logger.error(`[CronHealth] trigger ${cronId} failed:`, err);
            const msg = err instanceof Error ? err.message : String(err);
            alert(`✗ ${label} a échoué\n${msg}`);
        } finally {
            setRunning((s) => {
                const next = new Set(s);
                next.delete(cronId);
                return next;
            });
        }
    };

    return (
        <div style={{
            background: '#fff',
            border: '2px solid #000',
            padding: '16px',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 900,
                fontSize: '0.78rem',
                letterSpacing: 2,
                textTransform: 'uppercase',
            }}>
                <Activity size={14} /> Santé des crons
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {CRON_ORDER.map((cronId) => {
                    const meta = CRON_META[cronId];
                    const h = health[cronId];
                    const isRunning = running.has(cronId) || h?.lastStatus === 'running';

                    return (
                        <div key={cronId} style={{
                            border: '1px solid #ddd',
                            padding: '10px 12px',
                            background: h?.lastStatus === 'error' ? '#fef2f2' : '#fafafa',
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: 12,
                                marginBottom: 6,
                            }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        fontFamily: 'Outfit, sans-serif',
                                        fontWeight: 900,
                                        fontSize: '0.85rem',
                                        marginBottom: 2,
                                    }}>{meta.label}</div>
                                    <div style={{
                                        fontSize: '0.68rem',
                                        color: '#666',
                                        marginBottom: 2,
                                    }}>{meta.schedule}</div>
                                    <div style={{ fontSize: '0.66rem', color: '#888', lineHeight: 1.3 }}>
                                        {meta.description}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                                    <StatusPill status={h?.lastStatus} />
                                    <button
                                        onClick={() => handleTrigger(cronId)}
                                        disabled={isRunning}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                            background: isRunning ? '#ccc' : '#000',
                                            color: '#fff',
                                            border: 'none',
                                            padding: '5px 10px',
                                            fontFamily: 'Outfit, sans-serif',
                                            fontWeight: 800,
                                            fontSize: '0.62rem',
                                            letterSpacing: 1,
                                            textTransform: 'uppercase',
                                            cursor: isRunning ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {isRunning ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                                        Lancer
                                    </button>
                                </div>
                            </div>

                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 6,
                                marginTop: 8,
                                fontSize: '0.66rem',
                                color: '#444',
                            }}>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 1 }}>Dernier run</div>
                                    <div style={{ fontWeight: 700 }}>{formatWhen(h?.lastRunEndAt || h?.lastRunAt)}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 1 }}>Durée</div>
                                    <div style={{ fontWeight: 700 }}>{formatDuration(h?.lastDurationMs)}</div>
                                </div>
                                <div>
                                    <div style={{ color: '#888', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: 1 }}>Succès / erreurs</div>
                                    <div style={{ fontWeight: 700 }}>{h?.successCount ?? 0} / {h?.errorCount ?? 0}</div>
                                </div>
                            </div>

                            {h?.lastNote && (
                                <div style={{
                                    marginTop: 6,
                                    fontSize: '0.66rem',
                                    color: '#555',
                                    fontStyle: 'italic',
                                }}>→ {h.lastNote}</div>
                            )}
                            {h?.lastError && (
                                <div style={{
                                    marginTop: 6,
                                    padding: '4px 8px',
                                    background: '#fee2e2',
                                    border: '1px solid #fca5a5',
                                    fontSize: '0.65rem',
                                    color: '#991b1b',
                                    fontFamily: 'monospace',
                                    wordBreak: 'break-word',
                                }}>{h.lastError}</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default CronHealthPanel;
