import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Work } from '@/store/libraryStore';
import type { CommunityPost, ReviewInput } from '@/types/community';
import { communityWrite } from '@/firebase/community';
import { useToast } from '@/context/ToastContext';
import styles from './Community.module.css';

interface Props {
    works: Work[];
    initialWorkKey?: string;
    initialUnit?: number;
    editing?: CommunityPost;
    onSaved: () => void;
    onCancel: () => void;
}

export function ReviewComposer({ works, initialWorkKey, initialUnit, editing, onSaved, onCancel }: Props) {
    const { t } = useTranslation('community');
    const { addToast } = useToast();
    const id = useId();
    const [requestId] = useState(() => crypto.randomUUID());
    const [workKey, setWorkKey] = useState(editing?.workKey || initialWorkKey || (works[0] ? `${works[0].type}:${works[0].id}` : ''));
    const [unit, setUnit] = useState(String(editing ? editing.unit ?? '' : initialUnit || ''));
    const [text, setText] = useState(editing?.text || '');
    const [rating, setRating] = useState(String(editing?.rating || ''));
    const [visibility, setVisibility] = useState<'public' | 'friends'>(editing?.visibility || 'public');
    const [spoiler, setSpoiler] = useState(editing?.spoiler ?? true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const work = works.find(w => `${w.type}:${w.id}` === workKey);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (!work || !text.trim() || (unit && (!Number.isInteger(Number(unit)) || Number(unit) < 1))) return;
        const review: ReviewInput = {
            workId: Number(work.id), workType: work.type, unit: unit ? Number(unit) : null,
            text: text.trim(), rating: rating ? Number(rating) : null, visibility, spoiler,
        };
        setSaving(true);
        setError('');
        try {
            const result = await communityWrite({ action: editing ? 'edit' : 'publish', id: editing?.id || requestId, review });
            addToast(result.xp ? t('savedXp', { xp: result.xp }) : t('saved'), 'success');
            onSaved();
        } catch {
            setError(t('publishError'));
        } finally {
            setSaving(false);
        }
    }

    return (
        <form className={styles.composer} onSubmit={submit} aria-label={t(editing ? 'editReview' : 'writeReview')}>
            <div className={styles.sectionHeading}>
                <h2>{t(editing ? 'editReview' : 'writeReview')}</h2>
                <Button type="button" variant="ghost" size="icon" aria-label={t('cancel')} onClick={onCancel} disabled={saving}><X size={18} /></Button>
            </div>
            <label htmlFor={`${id}-work`}>{t('work')}</label>
            <select id={`${id}-work`} required value={workKey} onChange={e => { setWorkKey(e.target.value); setUnit(''); }} disabled={!!editing || saving}>
                <option value="">{t('chooseWork')}</option>
                {works.filter(w => Number.isSafeInteger(Number(w.id)) && Number(w.id) > 0).map(w => <option key={`${w.type}:${w.id}`} value={`${w.type}:${w.id}`}>{w.title} · {w.type}</option>)}
            </select>
            {!works.length && <p>{t('noWorks')}</p>}
            <div className={styles.formRow}>
                <div>
                    <label htmlFor={`${id}-unit`}>{t(work?.type === 'anime' ? 'episodeOptional' : 'chapterOptional')}</label>
                    <input id={`${id}-unit`} type="number" min="1" max="5000" step="1" placeholder={t('wholeWork')} value={unit} disabled={!!editing || saving} onChange={e => setUnit(e.target.value)} />
                </div>
                <div>
                    <label htmlFor={`${id}-rating`}>{t('ratingOptional')}</label>
                    <select id={`${id}-rating`} value={rating} onChange={e => setRating(e.target.value)} disabled={saving}>
                        <option value="">{t('noRating')}</option>
                        {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}/10</option>)}
                    </select>
                </div>
            </div>
            <label htmlFor={`${id}-text`}>{t('yourReview')}</label>
            <textarea id={`${id}-text`} required maxLength={4000} rows={5} placeholder={t('reviewPlaceholder')} value={text} disabled={saving} onChange={e => setText(e.target.value)} />
            <div className={styles.meta}>{text.length}/4000 · {t('reviewHint')}</div>
            <div className={styles.formRow}>
                <label className={styles.check}><input type="checkbox" checked={spoiler} disabled={saving} onChange={e => setSpoiler(e.target.checked)} />{t('containsSpoilers')}</label>
                <label>{t('visibility')}
                    <select value={visibility} disabled={saving} onChange={e => setVisibility(e.target.value === 'friends' ? 'friends' : 'public')}>
                        <option value="public">{t('public')}</option><option value="friends">{t('friendsOnly')}</option>
                    </select>
                </label>
            </div>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <Button type="submit" variant="manga" className={styles.primaryAction} icon={<Send size={16} />} disabled={saving || !work || !text.trim()}>{t(saving ? 'publishing' : editing ? 'save' : 'publish')}</Button>
        </form>
    );
}
