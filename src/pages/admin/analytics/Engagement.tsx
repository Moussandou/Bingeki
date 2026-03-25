import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Link } from '@/components/routing/LocalizedLink';
import { getEngagementBreakdown, getTopContentStats } from '@/firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useTranslation } from 'react-i18next';

export default function EngagementAnalytics() {
    const { t } = useTranslation();
    const [engagementData, setEngagementData] = useState<any>(null);
    const [topContent, setTopContent] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    useEffect(() => {
        const load = async () => {
            try {
                const [engagement, top] = await Promise.all([
                    getEngagementBreakdown(),
                    getTopContentStats(10)
                ]);
                setEngagementData(engagement);
                setTopContent(top);
            } catch (e) {
                console.error("Failed to load engagement analytics", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>{t('admin.dashboard.loading')}</div>;

    const pieData = engagementData ? Object.entries(engagementData).map(([name, value]) => ({ name, value })) : [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--color-text)', fontWeight: 900 }}>
                    <ArrowLeft size={20} /> RETOUR
                </Link>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', textTransform: 'uppercase' }}>
                    {t('admin.dashboard.engagement', 'ENGAGEMENT')}
                </h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <Card variant="manga" style={{ padding: '2rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.5rem', marginBottom: '2rem' }}>Détail des Actions</h3>
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center' }}>
                        <ResponsiveContainer width="60%" height="100%">
                            <PieChart>
                                <Pie data={pieData} innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {pieData.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {pieData.map((item: any, idx) => (
                                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '12px', height: '12px', background: COLORS[idx % COLORS.length] }} />
                                    <span style={{ fontSize: '0.9rem', textTransform: 'capitalize' }}>
                                        {item.name}: <strong>{item.value}</strong>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card variant="manga" style={{ padding: '2rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                    <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.5rem', marginBottom: '2rem' }}>Volume d'activité total</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', alignItems: 'center' }}>
                        <div style={{ fontSize: '5rem', fontWeight: 900, fontFamily: 'var(--font-heading)' }}>
                            {pieData.reduce((acc, curr: any) => acc + (curr.value as number), 0)}
                        </div>
                        <p style={{ textTransform: 'uppercase', fontWeight: 900, color: 'var(--color-text-dim)' }}>Interactions cumulées</p>
                    </div>
                </Card>
            </div>

            <Card variant="manga" style={{ padding: '2rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.5rem', marginBottom: '2rem' }}>Contenus les plus populaires</h3>
                <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topContent} layout="vertical" margin={{ left: 50 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="title" width={150} style={{ fontSize: '12px', fontWeight: 900 }} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
}
