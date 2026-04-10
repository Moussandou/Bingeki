/**
 * Retention page
 */
import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Link } from '@/components/routing/LocalizedLink';
import { getFunnelStats, getAdminStats, getHistoricalTrends } from '@/firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { useTranslation } from 'react-i18next';

interface FunnelEntry {
    name: string;
    value: number;
}

interface AdminStats {
    dau: number;
    wau: number;
    mau: number;
    totalUsers: number;
    totalFeedback: number;
    totalSurveyResponses: number;
    newUsersToday: number;
    pendingFeedback: number;
    engagementRate: number;
}

interface TrendEntry {
    date: string;
    inscriptions: number;
    activities: number;
    activeUsers: number;
}

export default function RetentionAnalytics() {
    const { t } = useTranslation();
    const [funnelData, setFunnelData] = useState<FunnelEntry[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [trends, setTrends] = useState<TrendEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [funnel, basicStats, historical] = await Promise.all([
                    getFunnelStats(),
                    getAdminStats(),
                    getHistoricalTrends(30)
                ]);
                setFunnelData(funnel);
                setStats(basicStats);
                setTrends(historical);
            } catch (e) {
                console.error("Failed to load retention analytics", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>{t('admin.dashboard.loading')}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 900 }}>
                    <ArrowLeft size={20} /> RETOUR
                </Link>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', textTransform: 'uppercase' }}>
                    {t('admin.dashboard.retention', 'RÉTENTION')}
                </h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <p style={{ textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>DAU (Actifs 24h)</p>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem' }}>{stats?.dau}</h2>
                </Card>
                <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <p style={{ textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>WAU (Actifs 7j)</p>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem' }}>{stats?.wau}</h2>
                </Card>
                <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <p style={{ textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>MAU (Actifs 30j)</p>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem' }}>{stats?.mau}</h2>
                </Card>
            </div>

            <Card variant="manga" style={{ padding: '2rem', background: 'white', border: '3px solid black', boxShadow: '8px 8px 0px black' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.5rem', marginBottom: '2rem' }}>Entonnoir de Conversion (Tunnel)</h3>
                <div style={{ height: '350px' }}>
                    <ResponsiveContainer width="99%" height="100%" debounce={100}>
                        <BarChart layout="vertical" data={funnelData} margin={{ left: 60, right: 60 }}>
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={150} style={{ fontSize: '14px', fontWeight: 900 }} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                                {funnelData.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fillOpacity={1 - index * 0.15} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
                    * Analyse du passage de l'inscription à l'activité régulière et à l'exploration profonde.
                </p>
            </Card>

            <Card variant="manga" style={{ padding: '2rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.5rem', marginBottom: '2rem' }}>Activité Journalière (DAU)</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="99%" height="100%" debounce={100}>
                        <AreaChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Area type="monotone" dataKey="activeUsers" stroke="black" fill="black" fillOpacity={0.1} strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
