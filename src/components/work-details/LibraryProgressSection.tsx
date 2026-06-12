import { useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import styles from '@/pages/WorkDetails.module.css';
import type { Work } from '@/store/libraryStore';
import type { User } from 'firebase/auth';

interface LibraryProgressSectionProps {
    user: User | null;
    libraryWork: Work | undefined;
    fetchedWork: Work | null;
    work: Work;
    isEditing: boolean;
    progress: number;
    isCompleteModalOpen: boolean;
    setProgress: (p: number) => void;
    setIsEditing: (e: boolean) => void;
    setIsCompleteModalOpen: (o: boolean) => void;
    handleSave: () => void;
    handleEpisodeSelect: (val: number) => void;
    addWork: (w: Work) => void;
    updateStatus: (id: string | number, s: Work['status']) => void;
    updateWorkDetails: (id: string | number, data: Partial<Work>) => void;
    handleProgressUpdateWithXP: (id: string | number, oldChap: number, newChap: number) => void;
    addToast: (msg: string, type: 'success'|'error') => void;
}

export function LibraryProgressSection({
    user,
    libraryWork,
    fetchedWork,
    work,
    isEditing,
    progress,
    setProgress,
    setIsEditing,
    handleSave,
    handleEpisodeSelect,
    addWork,
    updateStatus,
    updateWorkDetails,
    handleProgressUpdateWithXP,
    addToast
}: Omit<LibraryProgressSectionProps, 'isCompleteModalOpen' | 'setIsCompleteModalOpen'>) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

    return (
        <div style={{ marginBottom: '2rem' }}>
            {!libraryWork ? (
                <div style={{ padding: '2rem', background: 'var(--color-surface-hover)', textAlign: 'center', border: '2px dashed var(--color-border-heavy)' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem' }}>{t('work_details.library.interested_title')}</h3>
                    <p style={{ marginBottom: '1.5rem' }}>{t('work_details.library.interested_desc')}</p>
                    <Button
                        onClick={() => {
                            if (user && fetchedWork) {
                                const workToAdd: Work = {
                                    ...fetchedWork,
                                    type: fetchedWork.type || 'anime', // Fallback or strict assertion
                                    status: 'plan_to_read', // Default status
                                };
                                addWork(workToAdd);
                                addToast(t('work_details.library.added_toast'), 'success');
                            } else {
                                navigate('/auth');
                            }
                        }}
                        variant="primary"
                        size="lg"
                        icon={<BookOpen size={20} />}
                    >
                        {user ? t('work_details.library.add_to_collection') : t('work_details.library.login_to_add')}
                    </Button>
                </div>
            ) : (
                <>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>{t('work_details.progress.title')}</h3>
                    <div style={{ color: 'var(--color-text)' }}>
                        {isEditing ? (
                            <div className={styles.progressContainer}>
                                <input
                                    type="number"
                                    value={progress}
                                    onChange={(e) => setProgress(Number(e.target.value))}
                                    className={styles.progressInput}
                                />
                                <span style={{ fontSize: '1.5rem', fontWeight: 900 }}>/ {work.totalChapters || '?'}</span>
                                <Button onClick={handleSave} variant="primary" icon={<Check size={20} />}>{t('work_details.progress.ok')}</Button>
                            </div>
                        ) : (
                            <div className={styles.progressControls}>
                                {/* Decrement buttons */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEpisodeSelect(Math.max(0, (work.currentChapter || 0) - 5))}
                                    style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                >-5</Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEpisodeSelect(Math.max(0, (work.currentChapter || 0) - 3))}
                                    style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                >-3</Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEpisodeSelect(Math.max(0, (work.currentChapter || 0) - 1))}
                                    style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                >-1</Button>

                                {/* Progress display */}
                                <span className={styles.progressDisplay}>
                                    {work.currentChapter} <span style={{ fontSize: '1.25rem', opacity: 0.5 }}>/ {work.totalChapters || '?'}</span>
                                </span>

                                {/* Increment buttons */}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEpisodeSelect((work.currentChapter || 0) + 1)}
                                    style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                >+1</Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEpisodeSelect((work.currentChapter || 0) + 3)}
                                    style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                >+3</Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEpisodeSelect((work.currentChapter || 0) + 5)}
                                    style={{ fontWeight: 700, border: '1px solid var(--color-border)' }}
                                >+5</Button>
                                <Button onClick={() => setIsEditing(true)} variant="manga" size="sm">{t('work_details.progress.edit')}</Button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {libraryWork && (
                <div style={{ marginBottom: '2rem', marginTop: '2rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-text)' }}>{t('work_details.status.title')}</h3>
                    <div className={styles.statusButtons}>
                        {['reading', 'completed', 'plan_to_read', 'dropped'].map((s) => (
                            <button
                                key={s}
                                onClick={() => {
                                    if (s === 'completed' && work.status !== 'completed') {
                                        setIsCompleteModalOpen(true);
                                    } else {
                                        updateStatus(work.id, s as Work['status']);
                                    }
                                }}
                                className={`${styles.statusButton} ${work.status === s ? styles.statusButtonActive : ''}`}
                            >
                                {t(`work_details.status.${s}`)}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <Modal
                isOpen={isCompleteModalOpen}
                onClose={() => setIsCompleteModalOpen(false)}
                title={t('work_details.status.completed')}
            >
                <div style={{ textAlign: 'center' }}>
                    <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>
                        {t('work_details.progress.mark_complete_confirm', "Have you finished this work? Your progress will be set to the maximum.")}
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <Button
                            variant="ghost"
                            onClick={() => setIsCompleteModalOpen(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => {
                                updateStatus(work.id, 'completed');
                                if (work.totalChapters && work.totalChapters > 0) {
                                    handleProgressUpdateWithXP(work.id, work.currentChapter || 0, work.totalChapters);
                                    updateWorkDetails(work.id, { currentChapter: work.totalChapters }); // Force update store locally just in case
                                    setProgress(work.totalChapters);
                                }
                                addToast(t('work_details.progress.saved_toast'), 'success');
                                setIsCompleteModalOpen(false);
                            }}
                        >
                            {t('common.confirm')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
