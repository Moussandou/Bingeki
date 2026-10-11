/**
 * Post sélectionné dans l'onglet Valider.
 *
 * - Pas encore validé : aperçu des slides, légende modifiable sur place,
 *   son suggéré, puis Valider / Régénérer / Rejeter (raccourcis V, R, X).
 * - Validé : tout ce qu'il faut pour publier à la main depuis le tel
 *   (slides à enregistrer, légende à copier, son, « J'ai publié »).
 */
import { useEffect, useMemo, useState } from 'react';
import {
    Check, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Loader2,
    RefreshCw, Send, Undo2, X as XIcon, AlertTriangle,
} from 'lucide-react';
import { logger } from '@/utils/logger';
import type { BotConfig, PendingPost, PostPlatforms, PostSourceAnime } from '@/shared/socialBot';
import { POST_TYPE_LABELS, POST_TYPE_COLORS, TYPE_TO_MODE_KEY, getMode } from '@/shared/socialBot';
import {
    validatePost, unvalidatePost, regeneratePost, rejectPost, markPublished,
    publishPostNow, updatePendingPostDraft,
} from '@/firebase/socialBot';
import { SlideHtmlPreview } from '@/components/admin/SlideHtmlPreview';
import { SlidesEditor } from '@/components/admin/SlidesEditor';
import { RejectModal } from '@/components/admin/RejectModal';
import { SoundSuggestion } from './SoundSuggestion';
import { formatWhen, partInfoFor, templateDataFor } from './helpers';
import { buildSlidesHTML } from '@/shared/socialTemplates';
import s from './SocialBot.module.css';

interface Props {
    post: PendingPost;
    config: BotConfig;
    onNext: () => void;
    onPrev: () => void;
}

export function TypeBadge({ type }: { type: PendingPost['type'] }) {
    const c = POST_TYPE_COLORS[type];
    return (
        <span className={s.typeBadge} style={{ background: c.bg, color: c.text }}>
            {POST_TYPE_LABELS[type]}
        </span>
    );
}

const isTyping = (el: EventTarget | null) => {
    const t = el as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
};

export function PostFocus(props: Props) {
    return props.post.validatedAt
        ? <PublishPanel post={props.post} config={props.config} />
        : <ReviewPanel {...props} />;
}

/* ==========================================================================
   À VALIDER
   ========================================================================== */

function ReviewPanel({ post, config, onNext, onPrev }: Props) {
    const [caption, setCaption] = useState(post.caption);
    const [hashtags, setHashtags] = useState(post.hashtags);
    const [platforms, setPlatforms] = useState<PostPlatforms>(post.platforms);
    const [format, setFormat] = useState<'feed' | 'story'>('feed');
    const [slide, setSlide] = useState(0);
    const [busy, setBusy] = useState<null | 'validate' | 'regen' | 'reject' | 'save'>(null);
    const [rejecting, setRejecting] = useState(false);

    useEffect(() => {
        setCaption(post.caption);
        setHashtags(post.hashtags);
        setPlatforms(post.platforms);
        setSlide(0);
    }, [post.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // Une régénération côté serveur remplace la légende : on la reprend.
    useEffect(() => { setCaption(post.caption); setHashtags(post.hashtags); }, [post.caption, post.hashtags]);

    const dirty = caption !== post.caption
        || hashtags !== post.hashtags
        || platforms.insta !== post.platforms.insta
        || platforms.tiktok !== post.platforms.tiktok;

    const data = useMemo(() => templateDataFor(post), [post]);
    const partInfo = useMemo(() => partInfoFor(post.title), [post.title]);
    const templateCount = useMemo(
        () => (data ? buildSlidesHTML(post.type, data, { partInfo, date: new Date(post.createdAt) }).length : 0),
        [data, post.type, partInfo, post.createdAt],
    );
    const images = post.slides.filter((sl) => sl.format === format).sort((a, b) => a.index - b.index);
    const count = data ? templateCount : images.length;
    const mode = getMode(config, TYPE_TO_MODE_KEY[post.type]);

    const validate = async () => {
        if (!platforms.insta && !platforms.tiktok) {
            alert('Choisis au moins un réseau.');
            return;
        }
        setBusy('validate');
        try {
            await validatePost(post.id, { caption, hashtags, platforms });
        } catch (e) {
            logger.error('[SocialBot] validate failed:', e);
            alert('Validation impossible (voir console).');
        } finally {
            setBusy(null);
        }
    };

    const save = async () => {
        setBusy('save');
        try {
            await updatePendingPostDraft(post.id, { caption, hashtags, platforms });
        } catch (e) {
            logger.error('[SocialBot] save failed:', e);
            alert('Enregistrement impossible.');
        } finally {
            setBusy(null);
        }
    };

    const regenerate = async () => {
        if (!confirm('Régénérer la légende ? La version actuelle reste disponible en B.')) return;
        setBusy('regen');
        try {
            await regeneratePost(post.id);
        } catch (e) {
            logger.error('[SocialBot] regenerate failed:', e);
            alert('Régénération échouée (voir console).');
        } finally {
            setBusy(null);
        }
    };

    const reject = async (reason: string) => {
        setBusy('reject');
        try {
            await rejectPost(post.id, reason);
            setRejecting(false);
        } catch (e) {
            logger.error('[SocialBot] reject failed:', e);
            alert('Rejet échoué (voir console).');
        } finally {
            setBusy(null);
        }
    };

    const saveSlides = async (next: PostSourceAnime[]) => {
        await updatePendingPostDraft(post.id, {
            sourceData: {
                ...post.sourceData,
                animes: next,
                animeIds: next.map((a) => a.mal_id).filter(Boolean) as number[],
            },
        });
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || busy || rejecting) return;
            const k = e.key.toLowerCase();
            if (k === 'v') { e.preventDefault(); validate(); }
            else if (k === 'r') { e.preventDefault(); regenerate(); }
            else if (k === 'x') { e.preventDefault(); setRejecting(true); }
            else if (k === 'j') { e.preventDefault(); onNext(); }
            else if (k === 'k') { e.preventDefault(); onPrev(); }
            else if (e.key === 'ArrowRight') setSlide((i) => Math.min(i + 1, count - 1));
            else if (e.key === 'ArrowLeft') setSlide((i) => Math.max(i - 1, 0));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <section className={s.focus} aria-labelledby="focus-title">
            <div className={s.focusHead}>
                <div className={s.focusTitleBlock}>
                    <div className={s.chipRow}>
                        <TypeBadge type={post.type} />
                        <span className={`${s.chip} ${mode === 'auto' ? s.chipAuto : s.chipManual}`}>
                            {mode === 'auto' ? 'Auto · Buffer' : 'Manuel'}
                        </span>
                    </div>
                    <h2 id="focus-title" className={s.focusTitle}>{post.title}</h2>
                    <span className={s.muted}>
                        Généré {formatWhen(post.createdAt).toLowerCase()} · prévu {formatWhen(post.scheduledAt).toLowerCase()} · {count} slides
                    </span>
                </div>
                <div className={`${s.actions} ${s.desktopOnly}`}>
                    <button type="button" className={s.btn} onClick={() => setRejecting(true)} disabled={!!busy}>
                        Rejeter <kbd>X</kbd>
                    </button>
                    <button type="button" className={s.btn} onClick={regenerate} disabled={!!busy}>
                        {busy === 'regen' ? <Loader2 size={14} className="animate-spin" /> : null} Régénérer <kbd>R</kbd>
                    </button>
                    <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={validate} disabled={!!busy}>
                        {busy === 'validate' ? <Loader2 size={14} className="animate-spin" /> : null} Valider <kbd>V</kbd>
                    </button>
                </div>
            </div>

            {(post.manualFallback || post.status === 'failed' || post.status === 'processing') && (
                <div className={post.status === 'processing' ? s.noticeInfo : s.noticeWarn}>
                    {post.status === 'processing' ? <Loader2 size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
                    <span>
                        {post.status === 'processing'
                            ? 'Traitement en cours (régénération ou publication)…'
                            : post.error || 'La publication automatique a échoué : publie-le à la main.'}
                    </span>
                </div>
            )}

            <div className={s.focusBody}>
                <div className={s.previewCol}>
                    <div className={s.segmented} role="group" aria-label="Format des slides">
                        {(['feed', 'story'] as const).map((f) => (
                            <button
                                key={f}
                                type="button"
                                aria-pressed={format === f}
                                onClick={() => { setFormat(f); setSlide(0); }}
                            >
                                {f === 'feed' ? 'Feed 4:5' : 'Story 9:16'}
                            </button>
                        ))}
                    </div>
                    <div className={s.previewStage}>
                        <button
                            type="button"
                            className={s.arrow}
                            aria-label="Slide précédente"
                            onClick={() => setSlide((i) => Math.max(i - 1, 0))}
                            disabled={slide === 0}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <div className={`${s.previewFrame} ${format === 'story' ? s.story : ''}`}>
                            {data ? (
                                <SlideHtmlPreview
                                    type={post.type}
                                    data={data}
                                    slideIndex={slide}
                                    format={format}
                                    partInfo={partInfo}
                                    postDate={post.createdAt}
                                />
                            ) : images[slide] ? (
                                <img src={images[slide].url} alt={`Slide ${slide + 1}`} className={s.fill} />
                            ) : (
                                <span className={s.emptySlide}>Aucune slide {format}</span>
                            )}
                        </div>
                        <button
                            type="button"
                            className={s.arrow}
                            aria-label="Slide suivante"
                            onClick={() => setSlide((i) => Math.min(i + 1, count - 1))}
                            disabled={slide >= count - 1}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <span className={s.counter}>{count ? `${slide + 1} / ${count}` : '—'}</span>
                </div>

                <div className={s.editCol}>
                    <div className={s.field}>
                        <div className={s.fieldHead}>
                            <label htmlFor="sb-caption" className={s.label}>Légende</label>
                            {post.variantB && (
                                <div className={s.abToggle} role="group" aria-label="Version de la légende">
                                    <button
                                        type="button"
                                        aria-pressed={caption === post.caption}
                                        onClick={() => { setCaption(post.caption); setHashtags(post.hashtags); }}
                                    >
                                        A
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={caption === post.variantB.caption}
                                        onClick={() => { setCaption(post.variantB!.caption); setHashtags(post.variantB!.hashtags); }}
                                    >
                                        B
                                    </button>
                                </div>
                            )}
                        </div>
                        <textarea
                            id="sb-caption"
                            className={s.textarea}
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            rows={6}
                        />
                        <span className={s.small}>{caption.length} / 2200</span>
                    </div>
                    <div className={s.field}>
                        <label htmlFor="sb-hashtags" className={s.label}>Hashtags</label>
                        <input
                            id="sb-hashtags"
                            className={s.input}
                            value={hashtags}
                            onChange={(e) => setHashtags(e.target.value)}
                        />
                    </div>
                    <div className={s.field}>
                        <span className={s.label}>Réseaux</span>
                        <div className={s.chipRow}>
                            {(['insta', 'tiktok'] as const).map((k) => (
                                <label key={k} className={s.check}>
                                    <input
                                        type="checkbox"
                                        checked={platforms[k]}
                                        onChange={() => setPlatforms((p) => ({ ...p, [k]: !p[k] }))}
                                    />
                                    {k === 'insta' ? 'Instagram' : 'TikTok'}
                                </label>
                            ))}
                        </div>
                    </div>
                    <SoundSuggestion post={post} />
                    {dirty && (
                        <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={save} disabled={!!busy}>
                            Enregistrer sans valider
                        </button>
                    )}
                    {post.sourceData?.animes && post.sourceData.animes.length > 0 && (
                        <details className={s.details}>
                            <summary>Modifier le contenu des slides</summary>
                            <SlidesEditor key={post.id} type={post.type} animes={post.sourceData.animes} onSave={saveSlides} />
                        </details>
                    )}
                </div>
            </div>

            <p className={s.footNote}>
                Valider = le post passe dans « À publier » avec les slides, la légende et le son prêts.
                Tu le publies ensuite toi-même depuis ton tel.
            </p>

            <div className={s.mobileBar}>
                <button type="button" className={s.btn} aria-label="Rejeter" onClick={() => setRejecting(true)} disabled={!!busy}>
                    <XIcon size={18} />
                </button>
                <button type="button" className={s.btn} aria-label="Régénérer" onClick={regenerate} disabled={!!busy}>
                    <RefreshCw size={18} />
                </button>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={validate} disabled={!!busy}>
                    {busy === 'validate' ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} />} Valider
                </button>
            </div>

            {rejecting && (
                <RejectModal
                    postTitle={post.title}
                    onCancel={() => setRejecting(false)}
                    onConfirm={reject}
                    busy={busy === 'reject'}
                />
            )}
        </section>
    );
}

/* ==========================================================================
   À PUBLIER (depuis le tel)
   ========================================================================== */

const NETWORKS = {
    insta: { label: 'Instagram', url: 'https://www.instagram.com/' },
    tiktok: { label: 'TikTok', url: 'https://www.tiktok.com/upload' },
} as const;

async function saveSlidesToDevice(urls: string[], title: string): Promise<'shared' | 'downloaded'> {
    const files = await Promise.all(urls.map(async (url, i) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`slide ${i + 1}: HTTP ${res.status}`);
        const blob = await res.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        return new File([blob], `bingeki-${String(i + 1).padStart(2, '0')}.${ext}`, { type: blob.type || 'image/jpeg' });
    }));
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (nav.canShare?.({ files })) {
        await navigator.share({ files, title });
        return 'shared';
    }
    for (const file of files) {
        const href = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = href;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 10_000);
    }
    return 'downloaded';
}

function PublishPanel({ post, config }: { post: PendingPost; config: BotConfig }) {
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);
    const [marking, setMarking] = useState<null | 'insta' | 'tiktok'>(null);
    const [buffering, setBuffering] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    const feed = post.slides.filter((sl) => sl.format === 'feed').sort((a, b) => a.index - b.index);
    const targets = (['insta', 'tiktok'] as const).filter((k) => post.platforms[k]);
    const fullCaption = `${post.caption}\n\n${post.hashtags}`.trim();

    const saveSlides = async () => {
        setSaving(true);
        setNotice(null);
        try {
            const how = await saveSlidesToDevice(feed.map((sl) => sl.url), post.title);
            setNotice(how === 'shared' ? 'Slides envoyées. Choisis « Enregistrer les images ».' : `${feed.length} slides téléchargées.`);
        } catch (e) {
            if ((e as Error)?.name === 'AbortError') return;
            logger.error('[SocialBot] save slides failed:', e);
            setNotice('Impossible de récupérer les slides. Appui long sur chaque image pour l\'enregistrer.');
        } finally {
            setSaving(false);
        }
    };

    const copyCaption = async () => {
        try {
            await navigator.clipboard.writeText(fullCaption);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            setNotice('Copie impossible : sélectionne la légende à la main.');
        }
    };

    const mark = async (platform: 'insta' | 'tiktok') => {
        setMarking(platform);
        try {
            await markPublished(post.id, platform);
        } catch (e) {
            logger.error('[SocialBot] mark published failed:', e);
            alert('Impossible d\'enregistrer la publication (voir console).');
        } finally {
            setMarking(null);
        }
    };

    const viaBuffer = async () => {
        if (!confirm('Publier ce post via Buffer maintenant ? Le son sera celui par défaut.')) return;
        setBuffering(true);
        try {
            await publishPostNow(post.id);
        } catch (e) {
            logger.error('[SocialBot] buffer publish failed:', e);
            alert('Buffer a échoué (voir console). Tu peux toujours publier à la main.');
        } finally {
            setBuffering(false);
        }
    };

    return (
        <section className={s.focus} aria-labelledby="publish-title">
            <div className={s.focusHead}>
                <div className={s.focusTitleBlock}>
                    <div className={s.chipRow}>
                        <TypeBadge type={post.type} />
                        <span className={`${s.chip} ${s.chipReady}`}>À publier</span>
                    </div>
                    <h2 id="publish-title" className={s.focusTitle}>{post.title}</h2>
                    <span className={s.muted}>Validé {formatWhen(post.validatedAt!).toLowerCase()} · prévu {formatWhen(post.scheduledAt).toLowerCase()}</span>
                </div>
                <button type="button" className={`${s.btn} ${s.btnSmall}`} onClick={() => unvalidatePost(post.id)}>
                    <Undo2 size={14} /> Annuler la validation
                </button>
            </div>

            <ol className={s.steps}>
                <li className={s.step}>
                    <span className={s.stepNum}>1</span>
                    <div className={s.stepBody}>
                        <strong>Enregistre les slides</strong>
                        <div className={s.slideStrip} aria-label="Slides du post">
                            {feed.map((sl) => (
                                <img key={sl.url} src={sl.url} alt={`Slide ${sl.index + 1}`} className={s.slideImg} loading="lazy" />
                            ))}
                            {feed.length === 0 && <span className={s.muted}>Pas encore d'images pour ce post.</span>}
                        </div>
                        <button type="button" className={s.btn} onClick={saveSlides} disabled={saving || feed.length === 0}>
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            Enregistrer les {feed.length} slides
                        </button>
                    </div>
                </li>
                <li className={s.step}>
                    <span className={s.stepNum}>2</span>
                    <div className={s.stepBody}>
                        <strong>Copie la légende</strong>
                        <p className={s.captionBox}>{fullCaption}</p>
                        <button type="button" className={s.btn} onClick={copyCaption}>
                            {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiée' : 'Copier la légende'}
                        </button>
                    </div>
                </li>
                <li className={s.step}>
                    <span className={s.stepNum}>3</span>
                    <div className={s.stepBody}>
                        <strong>Publie avec le son de ton choix</strong>
                        <SoundSuggestion post={post} />
                        <div className={s.netGrid}>
                            {targets.map((k) => {
                                const done = post.manualPublished?.[k];
                                return (
                                    <div key={k} className={`${s.netCard} ${done ? s.netDone : ''}`}>
                                        <div className={s.netHead}>
                                            <strong>{NETWORKS[k].label}</strong>
                                            <span className={done ? s.okText : s.todoText}>
                                                {done ? `Publié ${formatWhen(done.publishedAt).toLowerCase()}` : 'À faire'}
                                            </span>
                                        </div>
                                        {!done && (
                                            <div className={s.netActions}>
                                                <a className={s.btn} href={NETWORKS[k].url} target="_blank" rel="noreferrer">
                                                    <ExternalLink size={15} /> Ouvrir
                                                </a>
                                                <button
                                                    type="button"
                                                    className={`${s.btn} ${s.btnPrimary}`}
                                                    onClick={() => mark(k)}
                                                    disabled={marking !== null}
                                                >
                                                    {marking === k ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                                                    J'ai publié
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </li>
            </ol>

            {notice && <p className={s.noticeInfo} role="status">{notice}</p>}

            <div className={s.footRow}>
                <span className={s.small}>Pas le temps ? Buffer peut le publier avec le son par défaut.</span>
                <button
                    type="button"
                    className={`${s.btn} ${s.btnSmall}`}
                    onClick={viaBuffer}
                    disabled={buffering || !config.enabled}
                    title={config.enabled ? '' : 'Bot coupé'}
                >
                    {buffering ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publier via Buffer
                </button>
            </div>
        </section>
    );
}
