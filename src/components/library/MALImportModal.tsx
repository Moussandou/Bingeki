/**
 * MAL Import Modal Component
 * Provides UI for importing MyAnimeList exports
 */

import { useState, useCallback, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { useLibraryStore } from '@/store/libraryStore';
import type { Work } from '@/store/libraryStore';
import { useToast } from '@/context/ToastContext';
import { useGamificationStore } from '@/store/gamificationStore';
import {
    parseMALExport,
    enrichWithJikan,
    findDuplicate,
    delay,
} from '@/services/malImportService';
import type { MALEntry } from '@/services/malImportService';
import styles from './MALImportModal.module.css';
import { logger } from '@/utils/logger';

interface MALImportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ImportPhase = 'upload' | 'preview' | 'duplicates' | 'importing' | 'complete';

interface DuplicateConflict {
    entry: MALEntry;
    existingWork: Work;
}

export function MALImportModal({ isOpen, onClose }: MALImportModalProps) {
    const { t } = useTranslation();
    const { works, addWork, updateWorkDetails } = useLibraryStore();
    const { addToast } = useToast();
    const { recalculateStats } = useGamificationStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // State
    const [phase, setPhase] = useState<ImportPhase>('upload');
    const [entries, setEntries] = useState<MALEntry[]>([]);
    const [duplicates, setDuplicates] = useState<DuplicateConflict[]>([]);
    const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);
    const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
    const [importResults, setImportResults] = useState({ imported: 0, skipped: 0, errors: 0 });
    const [isDragging, setIsDragging] = useState(false);

    // Reset state
    const resetState = useCallback(() => {
        setPhase('upload');
        setEntries([]);
        setDuplicates([]);
        setCurrentDuplicateIndex(0);
        setProgress({ current: 0, total: 0, message: '' });
        setImportResults({ imported: 0, skipped: 0, errors: 0 });
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback(async (file: File) => {
        try {
            setProgress({ current: 0, total: 0, message: t('mal_import.parsing') });
            const parsed = await parseMALExport(file);

            if (parsed.length === 0) {
                addToast(t('mal_import.no_entries'), 'error');
                return;
            }

            setEntries(parsed);

            // Check for duplicates
            const conflicts: DuplicateConflict[] = [];
            parsed.forEach((entry) => {
                const existing = findDuplicate(entry, works);
                if (existing) {
                    conflicts.push({ entry, existingWork: existing });
                }
            });

            setDuplicates(conflicts);
            setPhase('preview');
        } catch (error) {
            logger.error('Failed to parse MAL export:', error);
            addToast(t('mal_import.parse_error'), 'error');
        }
    }, [works, addToast, t]);

    // Handle drop
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith('.xml') || file.name.endsWith('.gz'))) {
            handleFileSelect(file);
        } else {
            addToast(t('mal_import.invalid_file'), 'error');
        }
    }, [handleFileSelect, addToast, t]);


    // Start import process
    const startImport = useCallback(async (toImportEntries: MALEntry[], allEntries: MALEntry[], conflictConflicts: DuplicateConflict[]) => {
        setPhase('importing');
        const results = { imported: 0, skipped: 0, errors: 0 };
        
        setProgress({ current: 0, total: toImportEntries.length, message: '' });

        for (let i = 0; i < toImportEntries.length; i++) {
            const entry = toImportEntries[i];
            setProgress({
                current: i + 1,
                total: toImportEntries.length,
                message: `${entry.title}...`,
            });

            try {
                const work = await enrichWithJikan(entry);

                const existingDuplicate = conflictConflicts.find((d) => d.entry.malId === entry.malId);
                if (existingDuplicate) {
                    updateWorkDetails(existingDuplicate.existingWork.id, work);
                } else {
                    addWork(work);
                }
                results.imported++;
            } catch (error) {
                logger.error(`Failed to import ${entry.title}:`, error);
                results.errors++;
            }

            if (i < toImportEntries.length - 1) {
                await delay(400);
            }
        }

        results.skipped = allEntries.length - toImportEntries.length;
        setImportResults(results);
        setPhase('complete');

        const updatedWorks = useLibraryStore.getState().works;
        recalculateStats(updatedWorks);
    }, [addWork, updateWorkDetails, recalculateStats]);

    // Handle duplicate resolution
    const handleDuplicateAction = useCallback((action: 'overwrite' | 'skip') => {
        setEntries(prevEntries => {
            const currentConflict = duplicates[currentDuplicateIndex];
            const updatedEntries = prevEntries.map(entry => {
                if (entry.malId === currentConflict.entry.malId) {
                    return {
                        ...entry,
                        rawData: { ...entry.rawData, action }
                    };
                }
                return entry;
            });

            // If all duplicates resolved, trigger import with the updated entries
            if (currentDuplicateIndex === duplicates.length - 1) {
                const toImport = updatedEntries.filter(entry => {
                    const isDup = duplicates.find(d => d.entry.malId === entry.malId);
                    if (isDup) {
                        return entry.rawData?.action === 'overwrite';
                    }
                    return true;
                });
                startImport(toImport, updatedEntries, duplicates);
            }

            return updatedEntries;
        });

        if (currentDuplicateIndex < duplicates.length - 1) {
            setCurrentDuplicateIndex(prev => prev + 1);
        }
    }, [duplicates, currentDuplicateIndex, startImport]);

    // Handle close
    const handleClose = useCallback(() => {
        resetState();
        onClose();
    }, [resetState, onClose]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={handleClose}>
                    <X size={24} />
                </button>

                <h2 className={styles.title}>{t('mal_import.title')}</h2>

                {/* Upload Phase */}
                {phase === 'upload' && (
                    <div
                        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Upload size={48} />
                        <p className={styles.dropText}>{t('mal_import.drop_file')}</p>
                        <p className={styles.dropHint}>{t('mal_import.file_types')}</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xml,.gz"
                            hidden
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileSelect(file);
                            }}
                        />
                    </div>
                )}

                {/* Preview Phase */}
                {phase === 'preview' && (
                    <div className={styles.preview}>
                        <div className={styles.stats}>
                            <div className={styles.stat}>
                                <FileText size={24} />
                                <span>{entries.length}</span>
                                <small>{t('mal_import.entries_found')}</small>
                            </div>
                            {duplicates.length > 0 && (
                                <div className={styles.stat}>
                                    <AlertCircle size={24} />
                                    <span>{duplicates.length}</span>
                                    <small>{t('mal_import.duplicates')}</small>
                                </div>
                            )}
                        </div>

                        <div className={styles.breakdown}>
                            <p>📺 Anime: {entries.filter((e) => e.type === 'anime').length}</p>
                            <p>📖 Manga: {entries.filter((e) => e.type === 'manga').length}</p>
                        </div>

                        <div className={styles.actions}>
                            <Button variant="outline" onClick={resetState}>
                                {t('common.cancel')}
                            </Button>
                            <Button onClick={() => {
                                if (duplicates.length > 0) {
                                    setPhase('duplicates');
                                } else {
                                    startImport(entries, entries, duplicates);
                                }
                            }}>
                                {duplicates.length > 0
                                    ? t('mal_import.resolve_duplicates')
                                    : t('mal_import.start_import')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Duplicates Resolution Phase */}
                {phase === 'duplicates' && duplicates.length > 0 && (
                    <div className={styles.duplicateResolver}>
                        <p className={styles.duplicateProgress}>
                            {currentDuplicateIndex + 1} / {duplicates.length}
                        </p>

                        <div className={styles.conflictCard}>
                            <h3>{duplicates[currentDuplicateIndex].entry.title}</h3>

                            <div className={styles.comparison}>
                                <div className={styles.version}>
                                    <span className={styles.versionLabel}>MAL</span>
                                    <p>📊 {duplicates[currentDuplicateIndex].entry.currentProgress} / {duplicates[currentDuplicateIndex].entry.totalProgress || '?'}</p>
                                    <p>⭐ {duplicates[currentDuplicateIndex].entry.score || '-'}/10</p>
                                </div>
                                <div className={styles.version}>
                                    <span className={styles.versionLabel}>Bingeki</span>
                                    <p>📊 {duplicates[currentDuplicateIndex].existingWork.currentChapter || 0} / {duplicates[currentDuplicateIndex].existingWork.totalChapters || '?'}</p>
                                    <p>⭐ {duplicates[currentDuplicateIndex].existingWork.rating || '-'}/10</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.duplicateActions}>
                            <Button variant="outline" onClick={() => handleDuplicateAction('skip')}>
                                {t('mal_import.keep_bingeki')}
                            </Button>
                            <Button onClick={() => handleDuplicateAction('overwrite')}>
                                {t('mal_import.use_mal')}
                            </Button>
                        </div>

                        <div className={styles.navButtons}>
                            <button
                                disabled={currentDuplicateIndex === 0}
                                onClick={() => setCurrentDuplicateIndex(currentDuplicateIndex - 1)}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                disabled={currentDuplicateIndex === duplicates.length - 1}
                                onClick={() => setCurrentDuplicateIndex(currentDuplicateIndex + 1)}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Importing Phase */}
                {phase === 'importing' && (
                    <div className={styles.importing}>
                        <Loader2 size={48} className={styles.spinner} />
                        <p className={styles.progressText}>
                            {progress.current} / {progress.total}
                        </p>
                        <p className={styles.progressMessage}>{progress.message}</p>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Complete Phase */}
                {phase === 'complete' && (
                    <div className={styles.complete}>
                        <Check size={64} className={styles.checkIcon} />
                        <h3>{t('mal_import.complete_title')}</h3>

                        <div className={styles.resultStats}>
                            <p>✅ {importResults.imported} {t('mal_import.imported')}</p>
                            {importResults.skipped > 0 && (
                                <p>⏭️ {importResults.skipped} {t('mal_import.skipped')}</p>
                            )}
                            {importResults.errors > 0 && (
                                <p>❌ {importResults.errors} {t('mal_import.errors')}</p>
                            )}
                        </div>

                        <Button onClick={handleClose}>
                            {t('common.close')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
