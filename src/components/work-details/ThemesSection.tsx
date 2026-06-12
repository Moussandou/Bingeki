import { Music, Disc } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { JikanTheme } from '@/services/animeApi';
import styles from '@/pages/WorkDetails.module.css';

interface ThemesSectionProps {
    themes: JikanTheme | null;
    workTitle: string;
}

export function ThemesSection({ themes, workTitle }: ThemesSectionProps) {
    const { t } = useTranslation();

    return (
        <div className="animate-fade-in">
            {(themes && (themes.openings.length > 0 || themes.endings.length > 0)) ? (
                <>
                    <h2 className={styles.sectionTitle} style={{ marginBottom: '1.5rem' }}>{t('work_details.themes.title')}</h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                        gap: '2rem'
                    }}>
                        {/* Openings */}
                        <div style={{
                            background: 'var(--color-surface)',
                            border: '2px solid var(--color-border-heavy)',
                            boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                            padding: '1.5rem'
                        }}>
                            <h3 style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '1.25rem',
                                marginBottom: '1rem',
                                borderBottom: '4px solid var(--color-border-heavy)',
                                paddingBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Music size={24} /> {t('work_details.themes.openings')} ({themes.openings.length})
                            </h3>
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="scrollbar-hide">
                                {themes.openings.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {themes.openings.map((theme: string, idx: number) => (
                                            <li key={idx} style={{ marginBottom: '0.75rem', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.75rem' }}>
                                                <a
                                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(theme + ' ' + workTitle)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        textDecoration: 'none',
                                                        color: 'var(--color-text)',
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '0.75rem'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                >
                                                    <span style={{
                                                        background: 'var(--color-border-heavy)',
                                                        color: 'var(--color-text-inverse)',
                                                        fontFamily: 'var(--font-heading)',
                                                        padding: '2px 6px',
                                                        fontSize: '0.8rem',
                                                        height: 'fit-content'
                                                    }}>#{idx + 1}</span>
                                                    <span style={{ fontWeight: 600, lineHeight: 1.4 }}>{theme} ↗</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p style={{ opacity: 0.5, fontStyle: 'italic' }}>{t('work_details.themes.no_openings')}</p>}
                            </div>
                        </div>

                        {/* Endings */}
                        <div style={{
                            background: 'var(--color-surface)',
                            border: '2px solid var(--color-border-heavy)',
                            boxShadow: '4px 4px 0 var(--color-shadow-solid)',
                            padding: '1.5rem'
                        }}>
                            <h3 style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '1.25rem',
                                marginBottom: '1rem',
                                borderBottom: '4px solid var(--color-border-heavy)',
                                paddingBottom: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Disc size={24} /> {t('work_details.themes.endings')} ({themes.endings.length})
                            </h3>
                            <div style={{ maxHeight: '500px', overflowY: 'auto' }} className="scrollbar-hide">
                                {themes.endings.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0 }}>
                                        {themes.endings.map((theme: string, idx: number) => (
                                            <li key={idx} style={{ marginBottom: '0.75rem', borderBottom: '1px dashed var(--color-border)', paddingBottom: '0.75rem' }}>
                                                <a
                                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(theme + ' ' + workTitle)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{
                                                        textDecoration: 'none',
                                                        color: 'var(--color-text)',
                                                        display: 'flex',
                                                        alignItems: 'flex-start',
                                                        gap: '0.75rem'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                                >
                                                    <span style={{
                                                        background: 'var(--color-border-heavy)',
                                                        color: 'var(--color-text-inverse)',
                                                        fontFamily: 'var(--font-heading)',
                                                        padding: '2px 6px',
                                                        fontSize: '0.8rem',
                                                        height: 'fit-content'
                                                    }}>#{idx + 1}</span>
                                                    <span style={{ fontWeight: 600, lineHeight: 1.4 }}>{theme} ↗</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : <p style={{ opacity: 0.5, fontStyle: 'italic' }}>{t('work_details.themes.no_endings')}</p>}
                            </div>
                        </div>
                    </div>

                </>
            ) : (
                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.6, fontStyle: 'italic', border: '2px dashed var(--color-border-heavy)' }}>
                    {t('work_details.themes.no_music')}
                </div>
            )}
        </div>
    );
}
