/**
 * SearchFilters — panneau de filtres pour GlobalSearch.
 *
 * 3 taxonomies MAL exposées séparément :
 *   • Démographie (Shounen, Shoujo, Seinen, Josei, Kids) — single-sélect
 *     car un anime a rarement plusieurs publics cibles
 *   • Genres (Action, Comédie, Romance, …) — multi-sélect, top 12 visibles
 *     + expand "Tout voir" pour les ~70 restants
 *   • Thèmes (Isekai, School, Mecha, …) — multi-sélect, top 12 + expand
 *
 * Plus les options quick-picks : note minimale, statut, tri.
 *
 * Les taxonomies sont fetch au 1er open et cachées 7j côté proxy Firebase.
 * Passer l'ANIME/MANGA en `mediaType` filtre naturellement la liste
 * (les mal_id ne sont pas les mêmes entre les 2 taxonomies).
 */

import { useEffect, useMemo, useState } from 'react';
import { getGenres, type JikanGenre } from '@/services/animeApi';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useSettingsStore } from '@/store/settingsStore';
import { isEmptyFilters, type SearchFilterState } from './searchFilterTypes';

interface SearchFiltersProps {
    mediaType: 'anime' | 'manga';
    filters: SearchFilterState;
    onChange: (next: SearchFilterState) => void;
}

/** Combien de chips genres/themes on affiche avant "Tout voir". */
const COLLAPSED_LIMIT = 12;

/** Ordre visuel des démographies. Les IDs MAL sont fixes. */
const DEMOGRAPHIC_ORDER = ['Shounen', 'Shoujo', 'Seinen', 'Josei', 'Kids'];

const MIN_SCORE_OPTIONS = [
    { value: 6, label: '★ 6+' },
    { value: 7, label: '★ 7+' },
    { value: 8, label: '★ 8+' },
    { value: 9, label: '★ 9+' },
] as const;

const STATUS_OPTIONS_ANIME = [
    { value: 'airing' as const, label: 'En cours' },
    { value: 'complete' as const, label: 'Terminé' },
    { value: 'upcoming' as const, label: 'À venir' },
];

const STATUS_OPTIONS_MANGA = [
    { value: 'publishing' as const, label: 'En cours' },
    { value: 'complete' as const, label: 'Terminé' },
    { value: 'hiatus' as const, label: 'En pause' },
    { value: 'discontinued' as const, label: 'Abandonné' },
    { value: 'upcoming' as const, label: 'À venir' },
];

const ORDER_OPTIONS = [
    { value: 'relevance' as const, label: 'Pertinence' },
    { value: 'score' as const, label: 'Note' },
    { value: 'popularity' as const, label: 'Popularité' },
    { value: 'start_date' as const, label: 'Récent' },
    { value: 'title' as const, label: 'A → Z' },
];

/* ==== Chip ================================================================= */

interface ChipProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    small?: boolean;
}
function Chip({ active, onClick, children, small = false }: ChipProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                padding: small ? '0.35rem 0.7rem' : '0.5rem 0.9rem',
                border: '2px solid var(--color-border-heavy)',
                background: active ? 'var(--color-primary)' : 'var(--color-surface)',
                color: active ? '#fff' : 'var(--color-text)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: small ? '0.72rem' : '0.8rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: active ? '1px 1px 0 var(--color-shadow-solid)' : '3px 3px 0 var(--color-shadow-solid)',
                transform: active ? 'translate(2px, 2px)' : 'none',
                transition: 'transform 0.1s, box-shadow 0.1s, background 0.1s',
                whiteSpace: 'nowrap',
            }}
        >
            {children}
        </button>
    );
}

/* ==== Section (démo / genres / themes) ===================================== */

interface SectionProps {
    label: string;
    total: number;
    expanded: boolean;
    onToggle: () => void;
    canExpand: boolean;
    children: React.ReactNode;
}
function Section({ label, total, expanded, onToggle, canExpand, children }: SectionProps) {
    return (
        <div style={{ marginBottom: '0.9rem' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
            }}>
                <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 900,
                    fontSize: '0.75rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-dim)',
                }}>
                    {label} <span style={{ opacity: 0.55 }}>({total})</span>
                </div>
                {canExpand && (
                    <button
                        type="button"
                        onClick={onToggle}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-primary)',
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: 0,
                        }}
                    >
                        {expanded ? 'Réduire' : 'Tout voir'}
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {children}
            </div>
        </div>
    );
}

/* ==== Composant principal ================================================== */

export function SearchFilters({ mediaType, filters, onChange }: SearchFiltersProps) {
    const nsfwMode = useSettingsStore(s => s.nsfwMode);
    const [genres, setGenres] = useState<JikanGenre[]>([]);
    const [themes, setThemes] = useState<JikanGenre[]>([]);
    const [demographics, setDemographics] = useState<JikanGenre[]>([]);
    const [loading, setLoading] = useState(false);
    const [genresExpanded, setGenresExpanded] = useState(false);
    const [themesExpanded, setThemesExpanded] = useState(false);

    // Fetch les 3 taxonomies dès que mediaType change. Le proxy cache 30j
    // côté backend, ce qui fait qu'après le 1er load tout revient instantané.
    useEffect(() => {
        let cancelled = false;
        // Reset explicit du loading state à chaque mediaType — accepté ici,
        // c'est la seule façon propre d'indiquer qu'on recharge la taxonomie
        // pour un autre type. Sans ça, l'UI garderait "chargé" alors qu'on
        // affiche encore les genres de l'autre type.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);
        Promise.all([
            getGenres(mediaType),
            getGenres(mediaType, 'themes'),
            getGenres(mediaType, 'demographics'),
            // NSFW off (défaut) → on charge les explicit_genres uniquement pour
            // les filtrer OUT des genres classiques. Sinon Hentai/Erotica
            // apparaîtraient dans la liste principale.
            getGenres(mediaType, 'explicit_genres').catch(() => [] as JikanGenre[]),
        ])
            .then(([g, th, demo, explicit]) => {
                if (cancelled) return;
                // Le endpoint /genres/{type} sans filter renvoie TOUT (genres,
                // démographies, thèmes, explicit_genres lumped ensemble). On
                // soustrait donc les IDs des autres taxonomies pour ne garder
                // que les vrais genres, sinon "Shounen"/"School"/"Hentai" se
                // retrouvent dupliqués ou hors-contexte.
                const excluded = new Set<number>([
                    ...(demo || []).map(x => x.mal_id),
                    ...(th || []).map(x => x.mal_id),
                    // NSFW off → on masque aussi les explicit
                    ...(!nsfwMode ? (explicit || []).map(x => x.mal_id) : []),
                ]);
                const pureGenres = (g || []).filter(x => !excluded.has(x.mal_id));
                setGenres(pureGenres.slice().sort((a, b) => (b.count ?? 0) - (a.count ?? 0)));
                setThemes((th || []).slice().sort((a, b) => (b.count ?? 0) - (a.count ?? 0)));
                setDemographics(demo || []);
            })
            .catch(err => {
                if (!cancelled) logger.warn('[SearchFilters] taxonomies fetch failed', err);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [mediaType, nsfwMode]);

    // Réordonne les démographies pour matcher l'ordre visuel canonique
    const orderedDemographics = useMemo(() => {
        const map = new Map(demographics.map(d => [d.name, d]));
        return DEMOGRAPHIC_ORDER
            .map(name => map.get(name))
            .filter((d): d is JikanGenre => Boolean(d));
    }, [demographics]);

    const visibleGenres = genresExpanded ? genres : genres.slice(0, COLLAPSED_LIMIT);
    const visibleThemes = themesExpanded ? themes : themes.slice(0, COLLAPSED_LIMIT);

    // Mutations
    const toggleGenre = (id: number) => {
        const next = filters.genres.includes(id)
            ? filters.genres.filter(g => g !== id)
            : [...filters.genres, id];
        onChange({ ...filters, genres: next });
    };
    const toggleTheme = (id: number) => {
        const next = filters.themes.includes(id)
            ? filters.themes.filter(g => g !== id)
            : [...filters.themes, id];
        onChange({ ...filters, themes: next });
    };
    const setDemographic = (id: number) => {
        onChange({ ...filters, demographic: filters.demographic === id ? null : id });
    };
    const setMinScore = (score: number) => {
        onChange({ ...filters, minScore: filters.minScore === score ? null : score });
    };
    const setStatus = (status: SearchFilterState['status']) => {
        onChange({ ...filters, status: filters.status === status ? null : status });
    };

    const statusOptions = mediaType === 'anime' ? STATUS_OPTIONS_ANIME : STATUS_OPTIONS_MANGA;

    return (
        <div style={{
            padding: '0.9rem',
            border: '2px solid var(--color-border-heavy)',
            background: 'var(--color-surface)',
            boxShadow: '4px 4px 0 var(--color-shadow-solid)',
        }}>
            {/* Démographie */}
            {orderedDemographics.length > 0 && (
                <Section
                    label="Démographie"
                    total={orderedDemographics.length}
                    expanded={false}
                    onToggle={() => { /* pas d'expand pour démo */ }}
                    canExpand={false}
                >
                    {orderedDemographics.map(d => (
                        <Chip
                            key={d.mal_id}
                            active={filters.demographic === d.mal_id}
                            onClick={() => setDemographic(d.mal_id)}
                        >
                            {d.name}
                        </Chip>
                    ))}
                </Section>
            )}

            {/* Genres */}
            {genres.length > 0 && (
                <Section
                    label="Genres"
                    total={genres.length}
                    expanded={genresExpanded}
                    onToggle={() => setGenresExpanded(v => !v)}
                    canExpand={genres.length > COLLAPSED_LIMIT}
                >
                    {visibleGenres.map(g => (
                        <Chip
                            key={g.mal_id}
                            active={filters.genres.includes(g.mal_id)}
                            onClick={() => toggleGenre(g.mal_id)}
                        >
                            {g.name}
                        </Chip>
                    ))}
                </Section>
            )}

            {/* Thèmes */}
            {themes.length > 0 && (
                <Section
                    label="Thèmes"
                    total={themes.length}
                    expanded={themesExpanded}
                    onToggle={() => setThemesExpanded(v => !v)}
                    canExpand={themes.length > COLLAPSED_LIMIT}
                >
                    {visibleThemes.map(g => (
                        <Chip
                            key={g.mal_id}
                            active={filters.themes.includes(g.mal_id)}
                            onClick={() => toggleTheme(g.mal_id)}
                        >
                            {g.name}
                        </Chip>
                    ))}
                </Section>
            )}

            {loading && genres.length === 0 && (
                <div style={{
                    padding: '1rem 0',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: 'var(--color-text-dim)',
                }}>
                    Chargement des filtres…
                </div>
            )}

            {/* Ligne compacte : Note · Statut · Trier */}
            <div style={{
                display: 'grid',
                gap: '0.75rem 1rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                marginTop: '0.5rem',
                paddingTop: '0.75rem',
                borderTop: '2px dashed var(--color-border)',
            }}>
                <QuickOption label="Note min.">
                    {MIN_SCORE_OPTIONS.map(o => (
                        <Chip
                            key={o.value}
                            small
                            active={filters.minScore === o.value}
                            onClick={() => setMinScore(o.value)}
                        >
                            {o.label}
                        </Chip>
                    ))}
                </QuickOption>

                <QuickOption label="Statut">
                    {statusOptions.map(o => (
                        <Chip
                            key={o.value}
                            small
                            active={filters.status === o.value}
                            onClick={() => setStatus(o.value)}
                        >
                            {o.label}
                        </Chip>
                    ))}
                </QuickOption>

                <QuickOption label="Trier par">
                    {ORDER_OPTIONS.map(o => (
                        <Chip
                            key={o.value}
                            small
                            active={filters.orderBy === o.value}
                            onClick={() => onChange({ ...filters, orderBy: o.value })}
                        >
                            {o.label}
                        </Chip>
                    ))}
                </QuickOption>
            </div>
        </div>
    );
}

function QuickOption({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <div style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--color-text-dim)',
                marginBottom: '0.4rem',
            }}>
                {label}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {children}
            </div>
        </div>
    );
}

/* ==== Rangée "filtres actifs" (utilitaire réutilisable) ==================== */

interface ActiveFiltersBarProps {
    filters: SearchFilterState;
    genreLookup: Map<number, string>;
    themeLookup: Map<number, string>;
    demographicLookup: Map<number, string>;
    onChange: (next: SearchFilterState) => void;
    onClearAll: () => void;
}

export function ActiveFiltersBar({
    filters, genreLookup, themeLookup, demographicLookup, onChange, onClearAll,
}: ActiveFiltersBarProps) {
    if (isEmptyFilters(filters)) return null;

    const removeGenre = (id: number) => onChange({ ...filters, genres: filters.genres.filter(g => g !== id) });
    const removeTheme = (id: number) => onChange({ ...filters, themes: filters.themes.filter(g => g !== id) });

    const pill = (label: string, onRemove: () => void, tone: 'primary' | 'secondary' = 'primary') => (
        <button
            type="button"
            onClick={onRemove}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.5rem 0.3rem 0.7rem',
                border: '2px solid var(--color-border-heavy)',
                background: tone === 'primary' ? 'var(--color-primary)' : 'var(--color-secondary)',
                color: tone === 'primary' ? '#fff' : '#000',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                fontSize: '0.72rem',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '2px 2px 0 var(--color-shadow-solid)',
            }}
        >
            {label}
            <X size={12} strokeWidth={3} />
        </button>
    );

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.4rem',
            alignItems: 'center',
            marginBottom: '0.9rem',
        }}>
            <span style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 900,
                fontSize: '0.7rem',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: 'var(--color-text-dim)',
                marginRight: '0.25rem',
            }}>
                Filtres :
            </span>

            {filters.demographic !== null && demographicLookup.get(filters.demographic) &&
                pill(demographicLookup.get(filters.demographic)!, () => onChange({ ...filters, demographic: null }), 'secondary')}

            {filters.genres.map(id => (
                <span key={`g-${id}`}>
                    {pill(genreLookup.get(id) ?? `#${id}`, () => removeGenre(id))}
                </span>
            ))}

            {filters.themes.map(id => (
                <span key={`t-${id}`}>
                    {pill(themeLookup.get(id) ?? `#${id}`, () => removeTheme(id))}
                </span>
            ))}

            {filters.minScore !== null &&
                pill(`★ ${filters.minScore}+`, () => onChange({ ...filters, minScore: null }))}

            {filters.status !== null &&
                pill(filters.status, () => onChange({ ...filters, status: null }))}

            <button
                type="button"
                onClick={onClearAll}
                style={{
                    marginLeft: 'auto',
                    padding: '0.25rem 0.6rem',
                    border: '2px solid var(--color-border-heavy)',
                    background: 'transparent',
                    color: 'var(--color-text)',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    fontSize: '0.7rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                }}
            >
                Tout effacer
            </button>
        </div>
    );
}
