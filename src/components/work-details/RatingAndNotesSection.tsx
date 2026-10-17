import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import styles from '@/pages/WorkDetails.module.css';
import type { Work } from '@/store/libraryStore';
import { workKey } from '@/utils/workIdentity';

interface RatingAndNotesSectionProps {
    libraryWork: Work | undefined;
    work: Work;
    isNotesExpanded: boolean;
    setIsNotesExpanded: (expanded: boolean) => void;
    updateWorkDetails: (id: string | number, data: Partial<Work>) => void;
}

export function RatingAndNotesSection({
    libraryWork,
    work,
    isNotesExpanded,
    setIsNotesExpanded,
    updateWorkDetails
}: RatingAndNotesSectionProps) {
    const { t } = useTranslation();

    if (!libraryWork) return null;

    return (
        <>
            {/* Rating Section */}
            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>{t('work_details.rating.title')}</h3>
                <div className={styles.ratingContainer}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                        <button
                            key={star}
                            onClick={() => updateWorkDetails(workKey(work), { rating: star })}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'transform 0.1s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Star
                                size={32}
                                fill={(work.rating || 0) >= star ? 'var(--color-text)' : 'none'}
                                color="var(--color-text)"
                                strokeWidth={2}
                            />
                        </button>
                    ))}
                    <span style={{ marginLeft: '1rem', fontSize: '1.5rem', fontWeight: 900 }}>{work.rating ? `${work.rating}/10` : '-/10'}</span>
                </div>
            </div>

            {/* Notes Section */}
            <div style={{ marginBottom: '2rem' }}>
                <h3
                    onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                    style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.5rem',
                        marginBottom: '1rem',
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        userSelect: 'none'
                    }}
                >
                    {t('work_details.notes.title')} {isNotesExpanded ? '▼' : '►'}
                </h3>
                {isNotesExpanded && (
                    <textarea
                        value={work.notes || ''}
                        onChange={(e) => updateWorkDetails(workKey(work), { notes: e.target.value })}
                        placeholder={t('work_details.notes.placeholder')}
                        className={styles.notesArea}
                    />
                )}
            </div>
        </>
    );
}
