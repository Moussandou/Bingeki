import { BookOpen, Trophy, Tv, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { getDisplayTitle } from '@/utils/titleUtils';
import styles from '@/pages/WorkDetails.module.css';
import logoCrunchyroll from '@/assets/logo_crunchyroll.png';
import logoADN from '@/assets/logo_adn.png';
import type { Work } from '@/store/libraryStore';
import type { JikanStreaming } from '@/services/animeApi';

interface WorkMainHeaderProps {
    work: Work;
    titleLanguage: 'default' | 'romaji' | 'native' | 'english';
    hideScores: boolean;
    streaming: JikanStreaming[];
    updateWorkDetails: (id: string | number, details: Partial<Work>) => void;
    handleEpisodeSelect: (number: number) => void;
}

export function WorkMainHeader({
    work,
    titleLanguage,
    hideScores,
    streaming,
    updateWorkDetails,
    handleEpisodeSelect
}: WorkMainHeaderProps) {
    const { t } = useTranslation();

    return (
        <>
            <h1 className={styles.title}>
                {getDisplayTitle(work, titleLanguage)}
            </h1>

            <div className={styles.metaContainer}>
                <div className={styles.metaItem}>
                    <Trophy size={20} />
                    {!hideScores && <span>{t('work_details.meta.score')}: {work.score || '?'}</span>}
                </div>
                <div
                    onClick={() => {
                        const newTotal = prompt(t('work_details.chapters.prompt_total'), work.totalChapters?.toString() || "");
                        if (newTotal && !isNaN(Number(newTotal))) {
                            updateWorkDetails(Number(work.id), { totalChapters: Number(newTotal) });
                        }
                    }}
                    className={styles.metaItem}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title={t('work_details.chapters.click_to_edit')}
                >
                    <BookOpen size={20} />
                    <span>{work.totalChapters || '?'} {(work.type === 'manga') ? t('work_details.meta.chaps') : t('work_details.meta.eps')}</span>
                </div>

                {/* Minimalist Streaming Buttons */}
                {!(work.type === 'manga') ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {/* Dynamic Streaming Links */}
                        {streaming.map((s) => {
                            const name = s.name.toLowerCase();

                            // Service detection and styling
                            const getServiceStyle = () => {
                                if (name.includes('crunchyroll')) return { bg: '#f47521', logo: logoCrunchyroll, short: 'CR' };
                                if (name.includes('adn') || name.includes('animation digital')) return { bg: '#0099ff', logo: logoADN, short: 'ADN' };
                                if (name.includes('netflix')) return { bg: '#e50914', logo: null, short: 'N' };
                                if (name.includes('prime') || name.includes('amazon')) return { bg: '#00a8e1', logo: null, short: 'PRIME' };
                                if (name.includes('hulu')) return { bg: '#1ce783', logo: null, short: 'HULU' };
                                if (name.includes('disney')) return { bg: '#113ccf', logo: null, short: 'D+' };
                                if (name.includes('funimation')) return { bg: '#5b0bb5', logo: null, short: 'FUNI' };
                                if (name.includes('hidive')) return { bg: '#00baff', logo: null, short: 'HIDIVE' };
                                if (name.includes('wakanim')) return { bg: '#e60012', logo: null, short: 'WAKA' };
                                if (name.includes('bilibili')) return { bg: '#00a1d6', logo: null, short: 'BILI' };
                                return { bg: '#000', logo: null, short: s.name.slice(0, 4).toUpperCase() };
                            };

                            const service = getServiceStyle();

                            return (
                                <a
                                    key={s.name}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        border: `2px solid ${service.bg}`,
                                        padding: '0.4rem 0.6rem',
                                        background: service.logo ? '#fff' : service.bg,
                                        cursor: 'pointer',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        textDecoration: 'none',
                                        color: service.logo ? '#000' : '#fff',
                                        height: '36px',
                                        minWidth: '36px',
                                        justifyContent: 'center',
                                        fontWeight: 800,
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.5px',
                                        boxShadow: '2px 2px 0 rgba(0,0,0,0.2)',
                                    }}
                                    title={`${t('work_details.streaming.watch_on')} ${s.name}`}
                                >
                                    {service.logo ? (
                                        <OptimizedImage 
                                            src={service.logo} 
                                            alt={service.short} 
                                            containerClassName={styles.serviceLogoContainer}
                                            style={{ width: '22px', height: '22px' }} 
                                            objectFit="contain" 
                                        />
                                    ) : (
                                        <span>{service.short}</span>
                                    )}
                                </a>
                            );
                        })}

                        {/* Generic Streaming Fallback (Google Search) */}
                        <button
                            onClick={() => {
                                const nextEp = (work.currentChapter || 0) + 1;
                                handleEpisodeSelect(nextEp);
                                window.open(`https://www.google.com/search?q=${encodeURIComponent(work.title)} episode ${nextEp} streaming vostfr`, '_blank');
                            }}
                            style={{ border: '2px solid var(--color-border-heavy)', padding: '0.5rem 1rem', background: 'var(--color-surface)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', height: '40px', gap: '0.5rem', fontWeight: 700, color: 'var(--color-text)' }}
                            title={`${t('work_details.streaming.search_episode')} ${(work.currentChapter || 0) + 1}`}
                        >
                            <Tv size={20} />
                            <span>{t('work_details.streaming.watch')}</span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            const nextChap = (work.currentChapter || 0) + 1;
                            handleEpisodeSelect(nextChap);
                            window.open(`https://www.google.com/search?q=${encodeURIComponent(work.title)} chapitre ${nextChap} scan fr`, '_blank');
                        }}
                        style={{ border: '2px solid #22c55e', color: '#22c55e', padding: '0.5rem 1rem', background: 'var(--color-surface)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
                        title={`${t('work_details.streaming.search_chapter')} ${(work.currentChapter || 0) + 1}`}
                    >
                        <FileText size={20} />
                        <span>{t('work_details.streaming.read')}</span>
                    </button>
                )}
            </div>
        </>
    );
}
