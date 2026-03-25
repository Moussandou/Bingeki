import { useState, useEffect } from 'react';
import { 
    Users, TrendingUp, Activity, ExternalLink, Clipboard 
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Link } from '@/components/routing/LocalizedLink';
import { 
    getAdminStats, getRecentMembers, getSevenDayActivityStats, 
    getEngagementBreakdown, getTopContentStats, getFunnelStats,
    type UserProfile 
} from '@/firebase/firestore';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface ChartData {
    name: string;
    active: number;
    new: number;
    activities: number;
    index: number;
}
export default function AdminDashboard() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalFeedback: 0,
        newUsersToday: 0,
        pendingFeedback: 0,
        totalSurveyResponses: 0,
        dau: 0,
        wau: 0,
        mau: 0,
        engagementRate: 0
    });
    const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [engagementData, setEngagementData] = useState<any>(null);
    const [topContent, setTopContent] = useState<any[]>([]);
    const [funnelData, setFunnelData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const [basicStats, members, weeklyStats, engagement, top, funnel] = await Promise.all([
                    getAdminStats(),
                    getRecentMembers(10),
                    getSevenDayActivityStats(),
                    getEngagementBreakdown(),
                    getTopContentStats(5),
                    getFunnelStats()
                ]);

                setStats(basicStats);
                setRecentUsers(members.slice(0, 5));
                if (Array.isArray(weeklyStats)) {
                    setChartData(weeklyStats.filter((item): item is ChartData => item !== undefined));
                }
                setEngagementData(engagement);
                setTopContent(top);
                setFunnelData(funnel);

            } catch (e) {
                console.error("Dashboard load failed", e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const formatDate = (timestamp: number | undefined) => {
        if (!timestamp) return null;
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMs / 3600000);
        const diffD = Math.floor(diffMs / 86400000);

        if (diffMin < 1) return t('admin.dashboard.just_now', 'A l\'instant');
        if (diffMin < 60) return t('admin.dashboard.minutes_ago', 'Il y a {{count}} min', { count: diffMin });
        if (diffH < 24) return t('admin.dashboard.hours_ago', 'Il y a {{count}}h', { count: diffH });
        if (diffD < 7) return t('admin.dashboard.days_ago', 'Il y a {{count}}j', { count: diffD });
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>{t('admin.dashboard.loading')}</div>;
    }

    const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    const containerStyle = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2rem',
        animation: 'fadeIn 0.5s ease',
        paddingBottom: '3rem'
    };

    const headerStyle = {
        fontFamily: 'var(--font-heading)',
        fontSize: '2.5rem',
        textTransform: 'uppercase' as const,
        marginBottom: '0.5rem'
    };

    const gridRow1 = {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem'
    };

    const gridRow2 = {
        display: 'grid',
        gridTemplateColumns: '3fr 2fr',
        gap: '1.5rem'
    };

    const gridRow3 = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem'
    };

    const gridRow4 = {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1.5rem'
    };

    const statCardStyle = {
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'space-between',
        height: '100%',
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        color: 'var(--color-text)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease',
        ':hover': { transform: 'translateY(-4px)' }
    } as any;

    const chartCardStyle = {
        padding: '1.5rem',
        background: 'var(--color-surface)',
        border: '2px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '1rem',
        cursor: 'pointer'
    };

    const sectionTitleStyle = {
        fontFamily: 'var(--font-heading)',
        fontSize: '1.5rem',
        textTransform: 'uppercase' as const,
        borderBottom: '2px solid var(--color-border)',
        paddingBottom: '0.5rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div>
                <h1 style={headerStyle}>{t('admin.dashboard.title')}</h1>
                <p style={{ borderLeft: '4px solid var(--color-border)', paddingLeft: '1rem', fontFamily: 'monospace', color: 'var(--color-text-dim)' }}>
                    {t('admin.dashboard.subtitle')}
                </p>
            </div>

            {/* Row 1: Key Metrics (KPIs) */}
            <div style={gridRow1}>
                <Card variant="manga" style={statCardStyle} onClick={() => navigate('/admin/users')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.users_label')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>{stats.totalUsers}</h3>
                        </div>
                        <Users size={24} />
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#10b981', fontWeight: 900 }}>
                        <TrendingUp size={14} style={{ marginRight: '0.25rem' }} /> +{stats.newUsersToday} {t('admin.dashboard.today')}
                    </div>
                </Card>

                <Card variant="manga" style={statCardStyle} onClick={() => navigate('/admin/analytics/retention')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.dau')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>{stats.dau}</h3>
                        </div>
                        <Activity size={24} />
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>
                        WAU: {stats.wau} | MAU: {stats.mau}
                    </div>
                </Card>

                <Card variant="manga" style={statCardStyle} onClick={() => navigate('/admin/analytics/growth')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.growth')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>+{Math.round((stats.newUsersToday / (stats.totalUsers || 1)) * 100)}%</h3>
                        </div>
                        <TrendingUp size={24} />
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#3b82f6', fontWeight: 900 }}>
                         NOUVEAUX CHASSEURS
                    </div>
                </Card>

                <Card variant="manga" style={statCardStyle} onClick={() => navigate('/admin/analytics/engagement')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 900, fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.engagement_rate')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>{Math.round(stats.engagementRate)}%</h3>
                        </div>
                        <Clipboard size={24} />
                    </div>
                    <div style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>
                        Score de Vitalité platforme
                    </div>
                </Card>
            </div>

            {/* Row 2: Main Growth & Activity Curves */}
            <div style={gridRow2}>
                <Card variant="manga" style={chartCardStyle} onClick={() => navigate('/admin/analytics/growth')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h3 style={sectionTitleStyle}><TrendingUp size={20} /> {t('admin.dashboard.activity_volume')}</h3>
                        <div style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>HEBDOMADAIRE</div>
                    </div>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                                <Tooltip contentStyle={{ background: 'black', border: '2px solid white', color: 'white', fontFamily: 'var(--font-heading)' }} />
                                <Area type="monotone" dataKey="activities" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} strokeWidth={3} />
                                <Area type="monotone" dataKey="new" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card variant="manga" style={chartCardStyle} onClick={() => navigate('/admin/analytics/retention')}>
                    <h3 style={sectionTitleStyle}><Activity size={20} /> {t('admin.dashboard.active_users')}</h3>
                    <div style={{ height: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} />
                                <Tooltip cursor={{ fill: '#f5f5f5' }} />
                                <Bar dataKey="active" fill="var(--color-text)" barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Row 3: Engagement Breakdown & Funnel */}
            <div style={gridRow3}>
                <Card variant="manga" style={chartCardStyle} onClick={() => navigate('/admin/analytics/engagement')}>
                    <h3 style={sectionTitleStyle}><Clipboard size={20} /> {t('admin.dashboard.engagement_breakdown')}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', height: '250px' }}>
                        <ResponsiveContainer width="60%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={engagementData ? Object.entries(engagementData).map(([name, value]) => ({ name, value })) : []} 
                                    innerRadius={60} 
                                    outerRadius={80} 
                                    paddingAngle={5} 
                                    dataKey="value"
                                >
                                    {Object.keys(engagementData || {}).map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ width: '40%', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {engagementData && Object.entries(engagementData).map(([key, value], idx) => (
                                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ width: '10px', height: '10px', background: COLORS[idx % COLORS.length] }} />
                                    <span style={{ textTransform: 'capitalize' }}>{key}: <strong>{value as number}</strong></span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>

                <Card variant="manga" style={chartCardStyle}>
                    <h3 style={sectionTitleStyle}><TrendingUp size={20} /> {t('admin.dashboard.funnel')}</h3>
                    <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={funnelData} margin={{ left: 40, right: 40 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={120} style={{ fontSize: '10px', fontWeight: 900 }} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]}>
                                    {funnelData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fillOpacity={1 - index * 0.2} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Row 4: Top Content & Utility */}
            <div style={gridRow4}>
                <div>
                    <h3 style={sectionTitleStyle}><Clipboard size={20} /> {t('admin.dashboard.top_content')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {topContent.map((item, idx) => (
                            <Card key={idx} variant="manga" style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                                <div style={{ width: '40px', height: '56px', background: '#e5e5e5', border: '1px solid var(--color-border)' }}>
                                    {item.image && <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 900, fontSize: '0.9rem' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{item.count} interactions</div>
                                </div>
                                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.5rem', color: 'var(--color-border)' }}>#{idx + 1}</div>
                            </Card>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 style={sectionTitleStyle}><Users size={20} /> {t('admin.dashboard.recent_members')}</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                        {recentUsers.map(user => (
                            <div key={user.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eee', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                    {user.photoURL && <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{user.displayName || 'Anonyme'}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)' }}>{formatDate(user.lastLogin)}</div>
                                </div>
                                <Link to={`/admin/users?highlight=${user.uid}`}><ExternalLink size={14} /></Link>
                            </div>
                        ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Link to="/admin/feedback" style={{ textDecoration: 'none' }}>
                            <button style={{ width: '100%', padding: '1rem', background: 'var(--color-text)', color: 'var(--color-surface)', border: 'none', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
                                Feedback ({stats.pendingFeedback})
                            </button>
                        </Link>
                        <Link to="/admin/system" style={{ textDecoration: 'none' }}>
                            <button style={{ width: '100%', padding: '1rem', background: 'black', color: 'white', border: 'none', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
                                {t('admin.dashboard.live_console')}
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
