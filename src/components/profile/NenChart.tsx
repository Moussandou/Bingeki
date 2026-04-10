/**
 * Nen Chart component (profile)
 */
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NenChartProps {
    stats: {
        level: number;
        xp: number;
        streak: number;
        totalChaptersRead: number;
        totalWorksAdded: number;
        totalWorksCompleted: number;
    };
    themeColor?: string;
}

export function NenChart({ stats, themeColor = '#FF2E63' }: NenChartProps) {
    const { t } = useTranslation();
    const [showLegend, setShowLegend] = useState(false);

    // Safe defaults to prevent NaN/undefined causing Recharts hook issues
    const safeStats = {
        level: stats?.level ?? 0,
        xp: stats?.xp ?? 0,
        streak: stats?.streak ?? 0,
        totalChaptersRead: stats?.totalChaptersRead ?? 0,
        totalWorksAdded: stats?.totalWorksAdded ?? 0,
        totalWorksCompleted: stats?.totalWorksCompleted ?? 0,
    };

    // Normalize data for the chart (0-100 scale)
    const data = [
        { subject: t('stats.level'), A: Math.min(safeStats.level * 2, 100), fullMark: 100 },
        { subject: t('stats.passion'), A: Math.min(safeStats.xp / 100, 100), fullMark: 100 },
        { subject: t('stats.diligence'), A: Math.min(safeStats.streak, 100), fullMark: 100 },
        { subject: t('stats.collection'), A: Math.min(safeStats.totalWorksAdded / 2, 100), fullMark: 100 },
        { subject: t('stats.reading'), A: Math.min(safeStats.totalChaptersRead / 10, 100), fullMark: 100 },
        { subject: t('stats.completion'), A: Math.min(safeStats.totalWorksCompleted * 5, 100), fullMark: 100 },
    ];

    const [mounted, setMounted] = useState(false);

    // Ensure we only render the ResponsiveContainer after the component has mounted
    // This helps it correctly measure its parent's dimensions and avoids -1 warnings.
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div style={{ width: '100%', minHeight: '200px', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Info button */}
            <button
                onClick={() => setShowLegend(!showLegend)}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: 0.7,
                    zIndex: 10,
                    color: 'var(--color-text)'
                }}
                title="Comment ça marche ?"
            >
                <Info size={16} />
            </button>

            {/* Legend Modal */}
            {showLegend && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    zIndex: 20,
                    padding: '0.75rem',
                    fontSize: '0.7rem',
                    lineHeight: 1.4,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    border: '2px solid var(--color-border)',
                    boxShadow: '4px 4px 0 var(--color-shadow)'
                }}>
                    <div style={{ fontWeight: 900, marginBottom: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span>📊 {t('stats.legend.title')}</span>
                        <button onClick={() => setShowLegend(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 900, color: 'var(--color-text)' }}>✕</button>
                    </div>
                    <div><strong>{t('stats.level')}</strong>: {t('stats.legend.level')}</div>
                    <div><strong>{t('stats.passion')}</strong>: {t('stats.legend.passion')}</div>
                    <div><strong>{t('stats.diligence')}</strong>: {t('stats.legend.diligence')}</div>
                    <div><strong>{t('stats.collection')}</strong>: {t('stats.legend.collection')}</div>
                    <div><strong>{t('stats.reading')}</strong>: {t('stats.legend.reading')}</div>
                    <div><strong>{t('stats.completion')}</strong>: {t('stats.legend.completion')}</div>
                </div>
            )}

            {mounted ? (
                <ResponsiveContainer width="100%" height={180}>
                    <RadarChart cx="50%" cy="50%" outerRadius="45%" data={data}>
                        <PolarGrid stroke="var(--color-border)" strokeOpacity={0.5} />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--color-text)', fontSize: 10, fontWeight: 900 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                            name="Stats"
                            dataKey="A"
                            stroke={themeColor}
                            strokeWidth={3}
                            fill={themeColor}
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            ) : (
                <div style={{ width: '100%', height: '180px' }} />
            )}
            <div style={{ position: 'absolute', bottom: 0, width: '100%', textAlign: 'center', fontSize: '0.6rem', opacity: 0.5, fontStyle: 'italic', color: 'var(--color-text)' }}>
                {t('stats.chart_title')}
            </div>
        </div>
    );
}
