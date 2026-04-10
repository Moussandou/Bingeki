/**
 * Lens page
 */
import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ScanSearch, Upload, Camera, X, ExternalLink, Search, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { lensSearch, type LensResult } from '@/services/lensApi';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import styles from './Lens.module.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function Lens() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [results, setResults] = useState<LensResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const handleFile = useCallback((file: File) => {
        if (file.size > MAX_FILE_SIZE) {
            addToast(t('lens.file_too_large'), 'error');
            return;
        }
        if (!file.type.startsWith('image/')) {
            return;
        }
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
        setResults([]);
        setError(null);
        setHasSearched(false);
    }, [addToast, t]);

    const clearFile = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        setResults([]);
        setError(null);
        setHasSearched(false);
    };

    const handleSearch = async () => {
        if (!selectedFile) return;
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const res = await lensSearch(selectedFile);
            setResults(res);
            setHasSearched(true);
        } catch {
            setError(t('lens.error'));
        } finally {
            setLoading(false);
        }
    };

    // Drag and Drop handlers
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const formatTimestamp = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getSimilarityClass = (score: number) => {
        if (score >= 85) return styles.similarityHigh;
        if (score >= 60) return styles.similarityMedium;
        return styles.similarityLow;
    };

    const lang = i18n.language === 'en' ? 'en' : 'fr';

    return (
        <Layout>
            <div className={styles.container}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <h1 className={styles.title}>
                        <ScanSearch size={32} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                        {t('lens.title')}
                    </h1>
                    <p className={styles.subtitle}>{t('lens.subtitle')}</p>
                </motion.div>

                {/* Image Input */}
                {!previewUrl ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className={styles.dropZoneIcon}>
                            <Upload size={48} />
                        </div>
                        <p className={styles.dropZoneText}>{t('lens.drop_zone')}</p>
                        <p className={styles.dropZoneHint}>PNG, JPG, WEBP — max 10 MB</p>

                        <div className={styles.cameraRow}>
                            <span className={styles.orText}>{t('lens.or')}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<Camera size={16} />}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    cameraInputRef.current?.click();
                                }}
                            >
                                {t('lens.camera')}
                            </Button>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />
                        <input
                            ref={cameraInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFile(file);
                            }}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={styles.previewContainer}
                    >
                        <OptimizedImage src={previewUrl} alt="Preview" className={styles.previewImage} />
                        <button className={styles.clearButton} onClick={clearFile}>
                            <X size={18} />
                        </button>
                    </motion.div>
                )}

                {/* Search Button */}
                {previewUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <Button
                            variant="manga"
                            className={styles.searchBtn}
                            onClick={handleSearch}
                            disabled={loading}
                            icon={loading ? <Loader2 size={18} className="spin" /> : <ScanSearch size={18} />}
                        >
                            {loading ? t('lens.searching') : t('lens.search')}
                        </Button>
                    </motion.div>
                )}

                {/* Error */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={styles.errorState}
                    >
                        {error}
                    </motion.div>
                )}

                {/* Results */}
                <AnimatePresence>
                    {results.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <p className={styles.resultsHeader}>
                                {t('lens.result_count', { count: results.length })}
                            </p>

                            {results.map((result, index) => (
                                <motion.div
                                    key={`${result.title}-${index}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={styles.resultCard}
                                >
                                    {result.thumbnail && (
                                        <OptimizedImage
                                            src={result.thumbnail}
                                            alt={result.title}
                                            className={styles.resultThumb}
                                        />
                                    )}

                                    <div className={styles.resultInfo}>
                                        <div className={styles.resultTitle}>{result.title}</div>
                                        <div className={styles.resultMeta}>
                                            <span className={`${styles.similarityBadge} ${getSimilarityClass(result.similarity)}`}>
                                                {t('lens.similarity', { score: result.similarity })} {t('lens.match')}
                                            </span>
                                            {result.episode && (
                                                <span style={{ marginLeft: '0.5rem' }}>
                                                    {t('lens.episode', { ep: result.episode })}
                                                </span>
                                            )}
                                            {result.timestamp && result.timestamp.from > 0 && (
                                                <span style={{ marginLeft: '0.5rem' }}>
                                                    {t('lens.timestamp', { time: formatTimestamp(result.timestamp.from) })}
                                                </span>
                                            )}
                                        </div>

                                        <div className={styles.resultActions}>
                                            {result.malId ? (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    icon={<ExternalLink size={14} />}
                                                    onClick={() => navigate(`/${lang}/work/${result.malId}?type=anime`)}
                                                >
                                                    {t('lens.view_details')}
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    icon={<Search size={14} />}
                                                    onClick={() => navigate(`/${lang}/discover?q=${encodeURIComponent(result.title)}`)}
                                                >
                                                    {t('lens.search_discover')}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Empty State */}
                {hasSearched && results.length === 0 && !loading && !error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={styles.emptyState}
                    >
                        <div className={styles.emptyStateIcon}>
                            <ScanSearch size={48} />
                        </div>
                        <p>{t('lens.no_results')}</p>
                    </motion.div>
                )}
            </div>
        </Layout>
    );
}
