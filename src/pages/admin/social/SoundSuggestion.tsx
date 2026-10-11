/**
 * Son suggéré pour un post : opening de l'anime principal du carrousel
 * (puis celui du suivant en alternative). Le choix final reste à l'admin
 * au moment de publier sur Instagram / TikTok.
 */
import { useEffect, useState } from 'react';
import { Music2 } from 'lucide-react';
import { getWorkThemes } from '@/services/animeApi';
import type { PendingPost } from '@/shared/socialBot';
import { cleanThemeLabel } from './helpers';
import s from './SocialBot.module.css';

interface Suggestion {
    song: string;
    anime: string;
}

export function SoundSuggestion({ post }: { post: PendingPost }) {
    const animes = post.sourceData?.animes ?? [];
    const candidates = animes.filter((a) => a.mal_id).slice(0, 3);
    const key = candidates.map((a) => a.mal_id).join(',');
    const [result, setResult] = useState<{ key: string; items: Suggestion[] } | null>(null);
    const items = result?.key === key ? result.items : null;

    useEffect(() => {
        if (!key) return;
        let cancelled = false;
        (async () => {
            const out: Suggestion[] = [];
            for (const anime of candidates) {
                try {
                    const themes = await getWorkThemes(anime.mal_id as number);
                    const first = themes.openings?.[0] || themes.endings?.[0];
                    if (first) out.push({ song: cleanThemeLabel(first), anime: anime.title });
                } catch {
                    // Pas de thème pour cet anime : on passe au suivant.
                }
                if (out.length >= 2) break;
            }
            if (!cancelled) setResult({ key, items: out });
        })();
        return () => { cancelled = true; };
    }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!key) return null;
    if (items && items.length === 0) return null;

    return (
        <div className={s.sound}>
            <Music2 size={20} className={s.soundIcon} aria-hidden="true" />
            <div className={s.soundBody}>
                <span className={s.label}>Son suggéré</span>
                {items === null ? (
                    <span className={s.muted}>Recherche de l'opening…</span>
                ) : (
                    <>
                        <strong>{items[0].song}</strong>
                        <span className={s.small}>Opening de {items[0].anime}</span>
                        {items[1] && (
                            <span className={s.small}>Autre idée : {items[1].song} ({items[1].anime})</span>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
