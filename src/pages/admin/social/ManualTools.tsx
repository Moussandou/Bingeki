/**
 * Outils à la demande du Social Bot : preview d'une saison au choix et
 * post d'actu à partir d'un lien. Affichés dans l'onglet Automatisations.
 */
import { useState } from 'react';
import { Play, Loader2, Sparkles, Newspaper } from 'lucide-react';
import {
    generateSeasonPreview, type AnilistSeason, createCultureNewsFromUrl,
} from '@/firebase/socialBot';
import { logger } from '@/utils/logger';

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

export function SeasonPreviewGenerator() {
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
                <Sparkles size={14} /> Preview de saison · à la demande
            </div>
            <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: 10, lineHeight: 1.4 }}>
                Se génère tout seul le 21 du mois qui précède chaque saison. Ici pour en
                lancer une à la main (autre saison, autre nombre d'animes).
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

export function CultureNewsGenerator() {
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
                        À valider dans l'onglet Valider.
                    </div>
                </div>
            )}
        </div>
    );
}
