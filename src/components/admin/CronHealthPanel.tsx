/**
 * CronHealthPanel — état d'exécution live de chaque cron du social bot.
 *
 * Lit `social_cron_health/<cronId>` en subscription et affiche pour
 * chaque cron : label, horaire, dernier statut, durée, dernier post créé,
 * bouton "Lancer maintenant" pour tester en dehors de l'horaire.
 */
import { useEffect, useState } from 'react';
import { Play, CheckCircle2, XCircle, Clock, Loader2, Activity, Sparkles, Newspaper } from 'lucide-react';
import { CRON_META, type CronId, type CronHealth } from '@/shared/socialBot';
import {
    subscribeToCronHealth, triggerCron, generateSeasonPreview, type AnilistSeason,
    createCultureNewsFromUrl,
} from '@/firebase/socialBot';
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

function nextSeasonDefault(): { season: AnilistSeason; year: number } {
    // Retourne la saison suivante (celle qui commencera au prochain
    // trimestre) pour préremplir le formulaire par défaut.
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();
    // saisons anime: winter=Jan-Mar, spring=Apr-Jun, summer=Jul-Sep, fall=Oct-Dec
    if (month <= 2) return { season: 'SPRING', year };
    if (month <= 5) return { season: 'SUMMER', year };
    if (month <= 8) return { season: 'FALL', year };
    return { season: 'WINTER', year: year + 1 };
}

const SEASON_LABELS: Record<AnilistSeason, string> = {
    WINTER: 'Hiver',
    SPRING: 'Printemps',
    SUMMER: 'Été',
    FALL: 'Automne',
};

function SeasonPreviewGenerator() {
    const defaults = nextSeasonDefault();
    const [season, setSeason] = useState<AnilistSeason>(defaults.season);
    const [year, setYear] = useState<number>(defaults.year);
    const [limit, setLimit] = useState<number>(20);
    const [running, setRunning] = useState(false);

    const handleGenerate = async () => {
        const label = `${SEASON_LABELS[season]} ${year}`;
        if (!confirm(`Générer le post preview "${label}" avec ${limit} animes ?`)) return;
        setRunning(true);
        try {
            const res = await generateSeasonPreview(season, year, limit);
            const note = res?.result?.note;
            alert(note ? `✓ Preview ${label}\n${note}` : `✓ Preview ${label} créé`);
        } catch (err) {
            logger.error('[SeasonPreview] failed:', err);
            const msg = err instanceof Error ? err.message : String(err);
            alert(`✗ Preview ${label} a échoué\n${msg}`);
        } finally {
            setRunning(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        border: '2px solid #000', padding: '6px 10px',
        fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.78rem',
        background: '#fff', color: '#000',
    };
    return (
        <div style={{
            background: '#fff', border: '2px solid #000', padding: 16, marginTop: 16,
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '0.78rem',
                letterSpacing: 2, textTransform: 'uppercase',
            }}>
                <Sparkles size={14} /> Preview de saison · manuel
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 10, lineHeight: 1.4 }}>
                Génère un post carousel avec les animes d'une saison AniList (dates fiables,
                sequels détectés, films marqués). À déclencher ~2 semaines avant la saison.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value as AnilistSeason)}
                    disabled={running}
                    style={inputStyle}
                >
                    <option value="WINTER">Hiver (Jan-Mars)</option>
                    <option value="SPRING">Printemps (Avr-Juin)</option>
                    <option value="SUMMER">Été (Juil-Sept)</option>
                    <option value="FALL">Automne (Oct-Déc)</option>
                </select>
                <input
                    type="number"
                    min="2020"
                    max="2030"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    disabled={running}
                    style={{ ...inputStyle, width: 90 }}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#444' }}>
                    Animes :
                    <input
                        type="number"
                        min="4"
                        max="24"
                        value={limit}
                        onChange={(e) => setLimit(Number(e.target.value))}
                        disabled={running}
                        style={{ ...inputStyle, width: 70 }}
                    />
                </label>
                <button
                    onClick={handleGenerate}
                    disabled={running}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: running ? '#ccc' : '#FF2E63', color: '#fff',
                        border: '2px solid #000', padding: '6px 14px',
                        fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                        fontSize: '0.7rem', letterSpacing: 1, textTransform: 'uppercase',
                        cursor: running ? 'not-allowed' : 'pointer',
                        boxShadow: '4px 4px 0 #000',
                    }}
                >
                    {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                    Générer
                </button>
            </div>
        </div>
    );
}

function CultureNewsGenerator() {
    const [url, setUrl] = useState('');
    const [creating, setCreating] = useState(false);
    const [lastResult, setLastResult] = useState<null | { title: string; category: string; source: string }>(null);

    const handleCreate = async () => {
        if (!url.trim()) return;
        setCreating(true);
        setLastResult(null);
        try {
            const res = await createCultureNewsFromUrl(url.trim());
            setLastResult({
                title: res.inferred.title,
                category: res.inferred.category,
                source: res.inferred.source,
            });
            setUrl('');
        } catch (err) {
            logger.error('[cultureNews] create failed:', err);
            alert(`✗ ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setCreating(false);
        }
    };

    const input: React.CSSProperties = {
        border: '2px solid #000', padding: '8px 12px',
        fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: '0.82rem',
        background: '#fff', color: '#000', width: '100%',
    };
    return (
        <div style={{ background: '#fff', border: '2px solid #000', padding: 16, marginTop: 16 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                fontFamily: 'Outfit, sans-serif', fontWeight: 900, fontSize: '0.78rem',
                letterSpacing: 2, textTransform: 'uppercase',
            }}>
                <Newspaper size={14} /> Actu culture anime · 1 clic
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 12, lineHeight: 1.4 }}>
                Colle l'URL d'une news (TikTok, article ANN, tweet, page produit officielle…).
                Image, titre, catégorie, source et contexte sont récupérés automatiquement.
                Bingeki ne relaie que les infos avec une source officielle identifiable —
                pas de rumeurs ni de leaks d'influenceurs.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
                <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Colle l'URL de la news ici…"
                    disabled={creating}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !creating && url.trim()) handleCreate(); }}
                    style={{ ...input, flex: 1 }}
                />
                <button
                    onClick={handleCreate}
                    disabled={creating || !url.trim()}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: creating || !url.trim() ? '#ccc' : '#FBBF24', color: '#000',
                        border: '2px solid #000', padding: '8px 18px',
                        fontFamily: 'Outfit, sans-serif', fontWeight: 900,
                        fontSize: '0.72rem', letterSpacing: 1, textTransform: 'uppercase',
                        cursor: creating || !url.trim() ? 'not-allowed' : 'pointer',
                        boxShadow: '4px 4px 0 #000', whiteSpace: 'nowrap',
                    }}
                >
                    {creating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {creating ? 'Analyse…' : 'Créer'}
                </button>
            </div>

            {lastResult && (
                <div style={{
                    marginTop: 12, padding: 10, background: '#f0fdf4', border: '2px solid #16a34a',
                    fontSize: '0.72rem', color: '#166534',
                }}>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 900, marginBottom: 4 }}>✓ Post créé</div>
                    <div><strong>Titre :</strong> {lastResult.title}</div>
                    <div><strong>Catégorie :</strong> {lastResult.category}</div>
                    <div><strong>Source :</strong> {lastResult.source}</div>
                    <div style={{ marginTop: 4, color: '#065f46' }}>
                        À valider dans la queue admin ci-dessus.
                    </div>
                </div>
            )}
        </div>
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

            <SeasonPreviewGenerator />
            <CultureNewsGenerator />
        </div>
    );
}

export default CronHealthPanel;
