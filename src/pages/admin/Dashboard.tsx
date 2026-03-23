import { useState, useEffect } from 'react';
import { Users, AlertCircle, TrendingUp, Activity, ExternalLink, Shield, Clipboard, Clock, Circle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Link } from '@/components/routing/LocalizedLink';
import { getAdminStats, getRecentMembers, getSevenDayActivityStats, type UserProfile } from '@/firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';

interface ChartData {
    name: string;
    active: number;
    new: number;
    activities: number;
    index: number;
}

export default function AdminDashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalFeedback: 0,
        newUsersToday: 0,
        pendingFeedback: 0,
        totalSurveyResponses: 0
    });
    const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
    const [chartData, setChartData] = useState<ChartData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const results = await Promise.allSettled([
                    getAdminStats(),
                    getRecentMembers(10),
                    getSevenDayActivityStats()
                ]);

                if (results[0].status === 'fulfilled') {
                    setStats(results[0].value);
                } else {
                    console.error("Failed to load stats:", results[0].reason);
                }

                if (results[1].status === 'fulfilled') {
                    setRecentUsers(results[1].value.slice(0, 5));
                } else {
                    console.error("Failed to load users:", results[1].reason);
                }

                if (results[2].status === 'fulfilled') {
                    const data = results[2].value;
                    if (Array.isArray(data)) {
                        setChartData(data.filter((item): item is ChartData => item !== undefined));
                    }
                } else {
                    console.error("Failed to load chart data:", results[2].reason);
                }

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

    const isOnlineRecently = (lastLogin: number | undefined) => {
        if (!lastLogin) return false;
        return (Date.now() - lastLogin) < 15 * 60 * 1000; // 15 minutes
    };

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>{t('admin.dashboard.loading')}</div>;
    }

    const containerStyle = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2rem',
        animation: 'fadeIn 0.5s ease',
        paddingBottom: '2rem'
    };

    const headerStyle = {
        fontFamily: 'var(--font-heading)',
        fontSize: '2.5rem',
        textTransform: 'uppercase' as const,
        marginBottom: '0.5rem'
    };

    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
        color: 'var(--color-text)'
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
                <p style={{
                    borderLeft: '4px solid var(--color-border)',
                    paddingLeft: '1rem',
                    fontFamily: 'monospace',
                    color: 'var(--color-text-dim)'
                }}>
                    {t('admin.dashboard.subtitle')}
                </p>
            </div>

            {/* Stats Grid */}
            <div style={gridStyle}>
                <Card variant="manga" style={statCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.users_label')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>{stats.totalUsers}</h3>
                        </div>
                        <div style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.5rem', borderRadius: '4px' }}>
                            <Users size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10b981', fontWeight: 'bold' }}>
                        <TrendingUp size={14} /> +{stats.newUsersToday} {t('admin.dashboard.today')}
                    </div>
                </Card>

                <Card variant="manga" style={statCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.feedback_label')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>{stats.totalFeedback}</h3>
                        </div>
                        <div style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.5rem', borderRadius: '4px' }}>
                            <AlertCircle size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 'bold', color: stats.pendingFeedback > 0 ? '#ef4444' : '#10b981' }}>
                        {stats.pendingFeedback} {t('admin.dashboard.tickets_pending')}
                    </div>
                </Card>

                <Card variant="manga" style={statCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.system_label')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>OK</h3>
                        </div>
                        <div style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.5rem', borderRadius: '4px' }}>
                            <Activity size={20} />
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
                        Version 3.0.1
                    </div>
                </Card>

                <Card variant="manga" style={statCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <p style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--color-text-dim)' }}>{t('admin.dashboard.survey_label', 'Questionnaires')}</p>
                            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', lineHeight: 1 }}>{stats.totalSurveyResponses}</h3>
                        </div>
                        <div style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.5rem', borderRadius: '4px' }}>
                            <Clipboard size={20} />
                        </div>
                    </div>
                    <Link to="/admin/survey" style={{ marginTop: '1rem', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--color-text)', textDecoration: 'underline' }}>
                        {t('admin.dashboard.view_survey_details', 'Voir les détails')}
                    </Link>
                </Card>
            </div>

            {/* Charts Section */}
            <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', border: '2px solid var(--color-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Activity className="text-red-500" size={24} />
                        <h3 style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontSize: '1.25rem' }}>{t('admin.dashboard.activity_volume')}</h3>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>{t('admin.dashboard.last_7_days')}</div>
                </div>
                <div style={{ height: '300px', width: '100%', position: 'relative' }}>
                    {chartData.length > 0 && (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12, fontWeight: 'bold' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 12 }}
                                />
                                <Tooltip
                                    contentStyle={{ background: 'black', border: '2px solid white', color: 'white', fontFamily: 'var(--font-heading)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="activities"
                                    name="Activité"
                                    stroke="#ef4444"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorActivity)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="new"
                                    name="Inscriptions"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorNew)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </Card>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Recent Users */}
                <div>
                    <h2 style={sectionTitleStyle}>
                        <Users size={24} /> {t('admin.dashboard.recent_members')}
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {recentUsers.map(user => {
                            const online = isOnlineRecently(user.lastLogin);
                            return (
                                <Card key={user.uid} variant="manga" style={{
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'var(--color-surface)',
                                    border: '2px solid var(--color-border)',
                                    color: 'var(--color-text)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {/* Avatar with online indicator */}
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ width: '40px', height: '40px', background: 'var(--color-surface-hover)', borderRadius: '50%', border: '2px solid var(--color-border)', overflow: 'hidden' }}>
                                                {user.photoURL && <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                            </div>
                                            {online && (
                                                <div style={{
                                                    position: 'absolute', bottom: -1, right: -1,
                                                    width: '12px', height: '12px',
                                                    background: '#22c55e', borderRadius: '50%',
                                                    border: '2px solid var(--color-surface)',
                                                    boxShadow: '0 0 4px #22c55e'
                                                }} />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                {user.displayName || t('admin.dashboard.anonymous')}
                                                {user.isAdmin && (
                                                    <span style={{ background: 'var(--color-text)', color: 'var(--color-surface)', padding: '0.1rem 0.4rem', fontSize: '0.55rem', fontWeight: 'bold', textTransform: 'uppercase', borderRadius: '2px' }}>ADMIN</span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{user.email}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                <Clock size={10} />
                                                {t('admin.dashboard.last_seen', 'Connecte')} {formatDate(user.lastLogin)}
                                                {online && (
                                                    <span style={{ color: '#22c55e', fontWeight: 'bold', marginLeft: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                                        <Circle size={6} fill="#22c55e" /> {t('admin.dashboard.online', 'En ligne')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Link to={`/admin/users?highlight=${user.uid}`} style={{ padding: '0.5rem', border: '2px solid var(--color-border)', color: 'var(--color-text)', display: 'flex', alignItems: 'center' }}>
                                        <ExternalLink size={16} />
                                    </Link>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Quick Actions */}
                <div>
                    <h2 style={sectionTitleStyle}>
                        <Shield size={24} /> {t('admin.dashboard.quick_actions')}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Link to="/admin/users" style={{ textDecoration: 'none' }}>
                            <Card variant="manga" style={{
                                padding: '2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'var(--color-surface)',
                                border: '2px solid var(--color-border)',
                                color: 'var(--color-text)',
                                height: '100%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
                            }}>
                                <Users size={32} />
                                <span style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontWeight: 900 }}>{t('admin.dashboard.manage_users')}</span>
                            </Card>
                        </Link>
                        <Link to="/admin/feedback" style={{ textDecoration: 'none' }}>
                            <Card variant="manga" style={{
                                padding: '2rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'var(--color-surface)',
                                border: '2px solid var(--color-border)',
                                color: 'var(--color-text)',
                                height: '100%',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem'
                            }}>
                                <AlertCircle size={32} />
                                <span style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontWeight: 900 }}>{t('admin.dashboard.view_feedback')}</span>
                            </Card>
                        </Link>
                        <Link to="/admin/system" style={{ textDecoration: 'none', gridColumn: 'span 2' }}>
                            <Card variant="manga" style={{
                                padding: '1.5rem',
                                textAlign: 'center',
                                cursor: 'pointer',
                                background: 'black',
                                color: 'white',
                                height: '100%',
                                display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '1rem'
                            }}>
                                <Activity size={24} color="#ef4444" />
                                <span style={{ fontFamily: 'var(--font-heading)', textTransform: 'uppercase', fontWeight: 900 }}>{t('admin.dashboard.live_console')}</span>
                            </Card>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
