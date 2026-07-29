import { useTranslation } from 'react-i18next';
import { Link } from '@/components/routing/LocalizedLink';
import type { JikanRelation } from '@/services/animeApi';
import styles from '@/pages/WorkDetails.module.css';

interface UniverseSectionProps {
    relations: JikanRelation[];
    expandedRelations: Record<number, boolean>;
    setExpandedRelations: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}

export function UniverseSection({ relations, expandedRelations, setExpandedRelations }: UniverseSectionProps) {
    const { t } = useTranslation();

    if (relations.length === 0) return null;

    const MAX_VISIBLE = 5;

    return (
        <div style={{ marginTop: '2rem' }}>
            <h3 className={styles.synopsisTitle} style={{ marginBottom: '1rem', borderTop: '2px solid var(--color-border)', paddingTop: '1rem' }}>
                {t('work_details.universe.title')}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                {relations.map((rel, index) => {
                    const isExpanded = expandedRelations[index];
                    const entries = rel.entry;
                    const visibleEntries = isExpanded ? entries : entries.slice(0, MAX_VISIBLE);
                    const hasMore = entries.length > MAX_VISIBLE;

                    return (
                        <div key={index} style={{
                            background: 'var(--color-surface)',
                            border: '2px solid var(--color-border-heavy)',
                            boxShadow: '3px 3px 0 var(--color-shadow-solid)',
                            padding: '0.75rem',
                            flex: '1 1 250px',
                            maxWidth: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', background: 'var(--color-border-heavy)', color: 'var(--color-text-inverse)', padding: '0.25rem 0.5rem', alignSelf: 'flex-start' }}>
                                {rel.relation}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {visibleEntries.map((entry) => (
                                    // `type` disambiguates colliding MAL ids between anime and manga
                                    <Link to={`/work/${entry.mal_id}?type=${(entry.type || 'anime').toLowerCase()}`} key={entry.mal_id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        textDecoration: 'none',
                                        color: 'var(--color-text)',
                                        fontWeight: 600,
                                        padding: '0.2rem',
                                        fontSize: '0.9rem',
                                        transition: 'background 0.2s'
                                    }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <div style={{ width: '5px', height: '5px', background: 'var(--color-text)', borderRadius: '50%', flexShrink: 0 }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name} ({entry.type})</span>
                                    </Link>
                                ))}
                                {hasMore && (
                                    <button
                                        onClick={() => setExpandedRelations(prev => ({ ...prev, [index]: !prev[index] }))}
                                        style={{
                                            background: 'none',
                                            border: '1px dashed var(--color-border-heavy)',
                                            padding: '0.25rem 0.5rem',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            marginTop: '0.25rem',
                                            color: 'var(--color-text)'
                                        }}
                                    >
                                        {isExpanded ? t('work_details.universe.collapse') : t('work_details.universe.expand', { count: entries.length - MAX_VISIBLE })}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
