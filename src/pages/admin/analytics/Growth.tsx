import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Link } from '@/components/routing/LocalizedLink';
import { getHistoricalTrends, getAdminStats } from '@/firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useTranslation } from 'react-i18next';

export default function GrowthAnalytics() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<any>(null);
    const [trends, setTrends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [basicStats, historicalData] = await Promise.all([
                    getAdminStats(),
                    getHistoricalTrends(30)
                ]);
                setStats(basicStats);
                setTrends(historicalData);
            } catch (e) {
                console.error("Failed to load growth analytics", e);
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
                    {t('admin.dashboard.growth', 'CROISSANCE')}
                </h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <p style={{ textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>Total Utilisateurs</p>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem' }}>{stats?.totalUsers}</h2>
                </Card>
                <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <p style={{ textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>Nouveaux (24h)</p>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', color: '#10b981' }}>+{stats?.newUsersToday}</h2>
                </Card>
                <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <p style={{ textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>Taux de Croissance</p>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '3rem', color: '#3b82f6' }}>+{Math.round((stats?.newUsersToday / (stats?.totalUsers || 1)) * 100)}%</h2>
                </Card>
            </div>

            <Card variant="manga" style={{ padding: '2rem', background: 'white', border: '3px solid black', boxShadow: '8px 8px 0px black' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.5rem' }}>Courbe d'acquisition (30j)</h3>
                    <Calendar size={24} />
                </div>
                <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip contentStyle={{ background: 'black', color: 'white', border: '2px solid white' }} />
                            <Area type="monotone" dataKey="newUsers" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={4} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card variant="manga" style={{ padding: '2rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.5rem', marginBottom: '1.5rem' }}>Utilisateurs cumulés</h3>
                <div style={{ height: '300px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="totalUsers" fill="black" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
