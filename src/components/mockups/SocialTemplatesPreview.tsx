/**
 * SocialTemplatesPreview — vitrine des 4 types de posts que le bot
 * social génère. Accessible via /fr/_preview/social-templates.
 *
 * Chaque card montre :
 *   - Ce que fait ce type de post (data source, ton, fréquence).
 *   - Une preview des slides rendues à partir de vrais anime.
 *
 * Utilise les MÊMES templates que la prod (`socialTemplates.ts`), donc
 * ce que tu vois ici = ce qui sera publié sur Instagram/TikTok.
 */
import { buildSlidesHTML } from '@/shared/socialTemplates';
import type { AnimeSlideData } from '@/shared/socialTemplates';
import type { PostType } from '@/shared/socialBot';
import SlideHtmlPreview from '@/components/admin/SlideHtmlPreview';

interface Sample {
    type: PostType;
    label: string;
    description: string;
    cadence: string;
    data: AnimeSlideData | AnimeSlideData[];
}

const SAMPLES: Sample[] = [
    {
        type: 'daily',
        label: 'Sorties du jour',
        description:
            "Carrousel des épisodes d'anime qui sortent aujourd'hui, triés par note. Généré tous les soirs.",
        cadence: 'Chaque jour · 19h',
        data: [
            { title: 'Frieren', cover: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', currentEpisode: 24 },
            { title: 'My Hero Academia', cover: 'https://cdn.myanimelist.net/images/anime/10/78745l.jpg', currentEpisode: 12 },
            { title: 'One Piece', cover: 'https://cdn.myanimelist.net/images/anime/1244/138851l.jpg', currentEpisode: 1108 },
            { title: 'Dandadan', cover: 'https://cdn.myanimelist.net/images/anime/1584/143719l.jpg', currentEpisode: 9 },
            { title: 'Blue Lock', cover: 'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg', currentEpisode: 5 },
        ],
    },
    {
        type: 'weekly',
        label: 'Récap hebdo',
        description:
            'TOP 3 des anime les mieux notés par les watchers Bingeki cette semaine. Fierté commu.',
        cadence: 'Chaque dimanche · 19h',
        data: [
            { title: 'Frieren', cover: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg', avg: 9.4, count: 2847 },
            { title: 'Dandadan', cover: 'https://cdn.myanimelist.net/images/anime/1584/143719l.jpg', avg: 9.1, count: 2103 },
            { title: 'Blue Lock', cover: 'https://cdn.myanimelist.net/images/anime/1258/126929l.jpg', avg: 8.9, count: 1876 },
        ],
    },
    {
        type: 'favorite',
        label: 'Coup de cœur',
        description:
            "TOP 3 des épisodes d'anime les mieux notés sur MAL cette semaine. Notes converties sur /10.",
        cadence: 'Chaque dimanche · 21h',
        data: [
            {
                title: 'Solo Leveling',
                cover: 'https://cdn.myanimelist.net/images/anime/1448/147351l.jpg',
                avg: 9.42,
                count: 12,
                episodeNumber: 12,
                episodeTitle: 'La chasse aux ombres',
                season: 2,
            } as AnimeSlideData,
            {
                title: 'Dandadan',
                cover: 'https://cdn.myanimelist.net/images/anime/1584/143719l.jpg',
                avg: 9.24,
                count: 5,
                episodeNumber: 5,
                episodeTitle: 'La confrontation finale',
                season: 2,
            } as AnimeSlideData,
            {
                title: 'Frieren',
                cover: 'https://cdn.myanimelist.net/images/anime/1015/138006l.jpg',
                avg: 9.10,
                count: 24,
                episodeNumber: 24,
                episodeTitle: 'Une aventure sans regret',
                // pas de season → affichera "ÉPISODE 24" tout court
            } as AnimeSlideData,
        ],
    },
    {
        type: 'newseason',
        label: 'Nouvelle saison',
        description:
            "Annonce quand une nouvelle saison d'un anime attendu démarre. Studio, épisodes prévus, note de la S1.",
        cadence: 'Détecté auto · matin 8h',
        data: {
            title: 'Chainsaw Man',
            cover: 'https://cdn.myanimelist.net/images/anime/1806/126216l.jpg',
            studios: ['MAPPA'],
            episodes: 12,
            score: 8.7,
            airing_from: new Date().toISOString(),
        },
    },
];

function SampleCard({ sample }: { sample: Sample }) {
    const slideCount = buildSlidesHTML(sample.type, sample.data).length;
    return (
        <div style={{
            background: '#fff',
            color: '#000',
            border: '4px solid #000',
            boxShadow: '10px 10px 0 #000',
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
        }}>
            <div>
                <div style={{
                    display: 'inline-block',
                    background: '#000',
                    color: '#fff',
                    padding: '4px 12px',
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 900,
                    fontSize: '0.68rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                }}>
                    {sample.cadence}
                </div>
                <h2 style={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 900,
                    fontSize: '1.6rem',
                    margin: '10px 0 4px',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em',
                }}>
                    {sample.label}
                </h2>
                <p style={{
                    color: '#555',
                    fontSize: '0.88rem',
                    lineHeight: 1.45,
                    margin: 0,
                }}>
                    {sample.description}
                </p>
            </div>

            {/* Feed 4:5 slides carousel — vrai rendu templates */}
            <div style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 8,
            }}>
                {Array.from({ length: slideCount }, (_, i) => (
                    <div key={i} style={{
                        flex: '0 0 auto',
                        width: 200,
                        aspectRatio: '4 / 5',
                        border: '3px solid #000',
                        background: '#f5f0e6',
                        overflow: 'hidden',
                        position: 'relative',
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 6, left: 6, zIndex: 3,
                            background: '#000', color: '#fff',
                            fontFamily: '"Outfit", sans-serif',
                            fontWeight: 900,
                            fontSize: '0.62rem',
                            padding: '3px 8px',
                            letterSpacing: '0.1em',
                        }}>
                            {i + 1}/{slideCount}
                        </div>
                        <SlideHtmlPreview
                            type={sample.type}
                            data={sample.data}
                            slideIndex={i}
                            format="feed"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function SocialTemplatesPreview() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#0d0d0d',
            color: '#fff',
            padding: '48px 24px 64px',
        }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                <div style={{
                    background: '#FF2E63',
                    color: '#fff',
                    padding: '6px 16px',
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 900,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textAlign: 'center',
                    borderBottom: '2px solid #000',
                    marginBottom: 32,
                }}>
                    MODE PREVIEW · TEMPLATES SOCIAL BOT · DONNÉES DÉMO
                </div>

                <h1 style={{
                    fontFamily: '"Outfit", sans-serif',
                    fontWeight: 900,
                    fontSize: '2.2rem',
                    letterSpacing: '-0.02em',
                    marginBottom: 4,
                }}>
                    Templates du Social Bot
                </h1>
                <p style={{ color: '#999', maxWidth: 720, lineHeight: 1.5, marginBottom: 40 }}>
                    Voilà à quoi ressemble chacun des 4 types de posts que le bot génère
                    automatiquement. Chaque exemple est rendu avec les mêmes templates
                    que la prod — ce que tu vois ici = ce qui sera publié sur Instagram
                    et TikTok.
                </p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(560px, 1fr))',
                    gap: 32,
                }}>
                    {SAMPLES.map((s) => (
                        <SampleCard key={s.type} sample={s} />
                    ))}
                </div>

                <div style={{
                    marginTop: 48,
                    padding: 20,
                    background: '#1c1c1c',
                    color: '#aaa',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    lineHeight: 1.55,
                    maxWidth: 720,
                }}>
                    <strong style={{ color: '#fff' }}>Note :</strong> chaque intro
                    utilise une palette de couleur différente selon le jour de la
                    semaine (7 palettes qui tournent, toutes en rose + noir + paper).
                    Sur ta grille Insta, aucun jour ne se ressemble sans jamais
                    quitter la DA Bingeki.
                </div>
            </div>
        </div>
    );
}
