/**
 * SlidesEditor — inline editor for the anime metadata that feeds the
 * SlideHtmlPreview templates. Every field change lifts a `dirty`
 * boolean and the parent decides when to persist via
 * updatePendingPostDraft.
 *
 * Fields per type:
 *   daily      → title, cover, currentEpisode
 *   weekly     → title, cover, avg, count
 *   favorite   → title, cover, avg, count
 *   newseason  → title, cover, studios, episodes, score, airing_from
 *
 * Actions on each row: move up/down, delete, and one "Ajouter un anime"
 * button at the bottom.
 */
import { useState } from 'react';
import { ChevronUp, ChevronDown, Trash2, Plus, Save, RotateCcw } from 'lucide-react';
import type { PostSourceAnime, PostType } from '@/shared/socialBot';

interface Props {
    type: PostType;
    animes: PostSourceAnime[];
    onSave: (next: PostSourceAnime[]) => Promise<void>;
}

const empty = (type: PostType): PostSourceAnime => {
    switch (type) {
        case 'daily':
            return { title: 'Nouvel anime', cover: '', currentEpisode: 1 };
        case 'weekly':
        case 'favorite':
            return { title: 'Nouvel anime', cover: '', avg: 8.0, count: 100 };
        case 'newseason':
            return { title: 'Nouvel anime', cover: '', studios: [], episodes: 12, score: 8.0 };
        default:
            return { title: 'Nouvel anime', cover: '' };
    }
};

const smallInput: React.CSSProperties = {
    width: '100%', padding: '4px 6px',
    border: '2px solid #000', background: '#fff',
    fontFamily: '"Inter", sans-serif', fontSize: '0.75rem',
};

const inlineIconBtn: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, padding: 0,
    background: '#fff', color: '#000',
    border: '2px solid #000', cursor: 'pointer',
    boxShadow: '2px 2px 0 #000',
};

export function SlidesEditor({ type, animes, onSave }: Props) {
    const [draft, setDraft] = useState<PostSourceAnime[]>(animes);
    const [saving, setSaving] = useState(false);

    const dirty = JSON.stringify(draft) !== JSON.stringify(animes);

    const patch = (i: number, updates: Partial<PostSourceAnime>) => {
        setDraft((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...updates } : a)));
    };

    const move = (i: number, dir: -1 | 1) => {
        setDraft((prev) => {
            const next = [...prev];
            const j = i + dir;
            if (j < 0 || j >= next.length) return prev;
            [next[i], next[j]] = [next[j], next[i]];
            return next;
        });
    };

    const remove = (i: number) => {
        setDraft((prev) => prev.filter((_, idx) => idx !== i));
    };

    const add = () => {
        setDraft((prev) => [...prev, empty(type)]);
    };

    const reset = () => setDraft(animes);

    const save = async () => {
        setSaving(true);
        try {
            await onSave(draft);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            background: '#fff', border: '3px solid #000', boxShadow: '5px 5px 0 #000',
            padding: '0.9rem',
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: '0.6rem',
            }}>
                <h3 style={{
                    fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                    fontSize: '0.85rem', textTransform: 'uppercase',
                    letterSpacing: '0.08em', margin: 0,
                }}>
                    Slides — sources anime ({draft.length})
                </h3>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                        onClick={reset}
                        disabled={!dirty || saving}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: '#fff', color: '#000', border: '2px solid #000',
                            padding: '4px 8px',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.6rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                            cursor: dirty && !saving ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.5,
                        }}
                    >
                        <RotateCcw size={11} /> Annuler
                    </button>
                    <button
                        onClick={save}
                        disabled={!dirty || saving}
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: dirty ? '#08D9D6' : '#eee',
                            color: dirty ? '#000' : '#999',
                            border: '2px solid #000',
                            padding: '4px 10px',
                            fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                            fontSize: '0.65rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                            cursor: dirty && !saving ? 'pointer' : 'not-allowed',
                        }}
                    >
                        <Save size={11} /> {saving ? '...' : 'Sauver slides'}
                    </button>
                </div>
            </div>

            {draft.length === 0 && (
                <div style={{
                    padding: '1rem', border: '2px dashed #ccc',
                    textAlign: 'center', color: '#999', fontSize: '0.75rem',
                }}>
                    Aucun anime — clique sur "Ajouter" pour en créer un.
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {draft.map((a, i) => (
                    <div key={i} style={{
                        padding: '0.5rem', border: '2px solid #000', background: '#f5f5f5',
                        display: 'grid',
                        gridTemplateColumns: '48px 1fr auto',
                        gap: '0.5rem', alignItems: 'stretch',
                    }}>
                        {/* Cover thumbnail */}
                        <div style={{
                            width: '48px', height: '64px',
                            background: '#000', border: '2px solid #000',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            {a.cover && (
                                <img src={a.cover} alt="" style={{
                                    position: 'absolute', inset: 0,
                                    width: '100%', height: '100%', objectFit: 'cover',
                                }} />
                            )}
                            <span style={{
                                position: 'absolute', top: 2, left: 2,
                                background: '#fff', color: '#000',
                                fontFamily: '"Outfit", sans-serif', fontWeight: 900,
                                fontSize: '0.55rem', padding: '1px 3px',
                                border: '1px solid #000',
                            }}>
                                {i + 1}
                            </span>
                        </div>

                        {/* Editable fields */}
                        <div style={{ display: 'grid', gap: '0.3rem' }}>
                            <input
                                type="text"
                                placeholder="Titre"
                                value={a.title}
                                onChange={(e) => patch(i, { title: e.target.value })}
                                style={{ ...smallInput, fontWeight: 700 }}
                            />
                            <input
                                type="url"
                                placeholder="URL de la cover (https://…)"
                                value={a.cover || ''}
                                onChange={(e) => patch(i, { cover: e.target.value })}
                                style={{ ...smallInput, fontSize: '0.65rem', color: '#555' }}
                            />
                            {/* Type-specific fields */}
                            {type === 'daily' && (
                                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700 }}>Ép.</span>
                                    <input
                                        type="number" min={1}
                                        value={a.currentEpisode ?? ''}
                                        onChange={(e) => patch(i, { currentEpisode: parseInt(e.target.value, 10) || undefined })}
                                        style={{ ...smallInput, width: 70 }}
                                    />
                                </div>
                            )}
                            {(type === 'weekly' || type === 'favorite') && (
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700 }}>Note</span>
                                    <input
                                        type="number" step={0.1} min={0} max={10}
                                        value={a.avg ?? ''}
                                        onChange={(e) => patch(i, { avg: parseFloat(e.target.value) || undefined })}
                                        style={{ ...smallInput, width: 70 }}
                                    />
                                    <span style={{ fontSize: '0.65rem', color: '#666', fontWeight: 700 }}>Watchers</span>
                                    <input
                                        type="number" min={0}
                                        value={a.count ?? ''}
                                        onChange={(e) => patch(i, { count: parseInt(e.target.value, 10) || undefined })}
                                        style={{ ...smallInput, width: 90 }}
                                    />
                                </div>
                            )}
                            {type === 'newseason' && (
                                <div style={{ display: 'grid', gap: '0.3rem' }}>
                                    <input
                                        type="text"
                                        placeholder="Studio (séparés par virgule)"
                                        value={(a.studios || []).join(', ')}
                                        onChange={(e) => patch(i, {
                                            studios: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                        })}
                                        style={{ ...smallInput, fontSize: '0.7rem' }}
                                    />
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="number" min={1}
                                            placeholder="Épisodes"
                                            value={a.episodes ?? ''}
                                            onChange={(e) => patch(i, { episodes: parseInt(e.target.value, 10) || undefined })}
                                            style={{ ...smallInput, width: 80 }}
                                        />
                                        <input
                                            type="number" step={0.1} min={0} max={10}
                                            placeholder="Note S1"
                                            value={a.score ?? ''}
                                            onChange={(e) => patch(i, { score: parseFloat(e.target.value) || undefined })}
                                            style={{ ...smallInput, width: 80 }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Actions column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'space-between' }}>
                            <button title="Monter" onClick={() => move(i, -1)} disabled={i === 0} style={{
                                ...inlineIconBtn,
                                opacity: i === 0 ? 0.4 : 1,
                                cursor: i === 0 ? 'not-allowed' : 'pointer',
                            }}>
                                <ChevronUp size={14} />
                            </button>
                            <button title="Supprimer" onClick={() => remove(i)} style={{
                                ...inlineIconBtn,
                                background: '#fff', color: '#ef4444',
                            }}>
                                <Trash2 size={14} />
                            </button>
                            <button title="Descendre" onClick={() => move(i, 1)} disabled={i === draft.length - 1} style={{
                                ...inlineIconBtn,
                                opacity: i === draft.length - 1 ? 0.4 : 1,
                                cursor: i === draft.length - 1 ? 'not-allowed' : 'pointer',
                            }}>
                                <ChevronDown size={14} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={add}
                style={{
                    marginTop: '0.5rem', width: '100%',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    background: '#fff', color: '#000', border: '2px dashed #000',
                    padding: '0.5rem',
                    fontFamily: '"Outfit", sans-serif', fontWeight: 800,
                    fontSize: '0.7rem', letterSpacing: '0.05em', textTransform: 'uppercase',
                    cursor: 'pointer',
                }}
            >
                <Plus size={14} /> Ajouter un anime
            </button>
        </div>
    );
}

export default SlidesEditor;
