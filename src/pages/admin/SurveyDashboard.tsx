import { useState, useEffect, useMemo, Fragment } from 'react';
import { 
    Clipboard, 
    Users, 
    ChevronDown, 
    ChevronUp,
    Clock,
    User,
    ArrowLeft,
    TrendingUp,
    Star,
    Mail,
    Globe
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getSurveyResponses, type SurveyResponse } from '@/firebase/firestore';
import { 
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';
import styles from './SurveyDashboard.module.css';
import { Link } from '@/components/routing/LocalizedLink';

const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];

export default function SurveyDashboard() {
    const { t } = useTranslation();
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getSurveyResponses();
                setResponses(data);
            } catch (err) {
                console.error("Failed to load survey responses:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const stats = useMemo(() => {
        if (!responses.length) return null;

        const processCounts = (field: string) => {
            const counts: Record<string, number> = {};
            responses.forEach(r => {
                const rawVal = r.answers?.[field];
                if (Array.isArray(rawVal)) {
                    rawVal.forEach(v => {
                        const s = String(v);
                        counts[s] = (counts[s] || 0) + 1;
                    });
                } else {
                    const s = String(rawVal || 'Unknown');
                    counts[s] = (counts[s] || 0) + 1;
                }
            });
            return Object.entries(counts)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value);
        };

        const waitlistCount = responses.filter(r => (r.answers?.email as string) && (r.answers?.wantsLaunchNews as string) === 'Oui').length;
        const highInterestCount = responses.filter(r => (r.answers?.interestLevel as string) === 'Extrêmement intéressé' || (r.answers?.interestLevel as string) === 'Very Interested').length;
        const premiumInterestCount = responses.filter(r => (r.answers?.premiumInterest as string) === 'Oui' || (r.answers?.premiumInterest as string) === 'Yes').length;

        return {
            total: responses.length,
            waitlist: waitlistCount,
            highInterest: highInterestCount,
            premiumInterestPercent: Math.round((premiumInterestCount / responses.length) * 100),
            age: processCounts('ageRange'),
            status: processCounts('status'),
            consumption: processCounts('consumptionFrequency'),
            interest: processCounts('interestLevel'),
            features: processCounts('mostAttractiveFeatures'),
            monetization: processCounts('premiumInterest'),
        };
    }, [responses]);

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>{t('admin.survey.loading', 'Chargement des réponses...')}</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link to="/admin" className={styles.backLink}>
                        <ArrowLeft size={16} /> {t('common.back', 'Retour')}
                    </Link>
                    <h1 className={styles.title}>
                        <Clipboard size={32} /> {t('admin.survey.title', 'Analyses')}
                    </h1>
                </div>
                <div className={styles.statsBadge}>
                    <strong>{responses.length}</strong> {t('admin.survey.total_responses', 'réponses')}
                </div>
            </div>

            {/* summary row */}
            {responses.length === 0 ? (
                <Card variant="manga" className={styles.emptyState}>
                    <Clipboard size={48} />
                    <p>{t('admin.survey.no_responses', 'Aucune réponse pour le moment.')}</p>
                </Card>
            ) : (
                <>
                <div className={styles.summaryGrid}>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.total', 'Total Réponses')}</div>
                        <div className={styles.summaryValue}>{stats?.total}</div>
                        <Users className={styles.summaryIcon} size={80} />
                    </Card>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.waitlist', 'Waitlist Additions')}</div>
                        <div className={styles.summaryValue}>{stats?.waitlist}</div>
                        <Mail className={styles.summaryIcon} size={80} />
                    </Card>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.hyped', 'Niveau d\'intérêt élevé')}</div>
                        <div className={styles.summaryValue}>{stats?.highInterest}</div>
                        <TrendingUp className={styles.summaryIcon} size={80} />
                    </Card>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.premium', 'Intérêt Premium')}</div>
                        <div className={styles.summaryValue}>{stats?.premiumInterestPercent}%</div>
                        <Star className={styles.summaryIcon} size={80} />
                    </Card>
                </div>

                {/* Visual Insights */}
                <div className={styles.chartsGrid}>
                    <Card variant="manga" className={styles.chartCard}>
                        <h3>
                            {t('survey.questions.ageRange', 'Âge')}
                            <Users size={18} />
                        </h3>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.age}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {stats?.age.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ background: '#000', border: '2px solid var(--color-border)', color: '#fff' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card variant="manga" className={styles.chartCard}>
                        <h3>
                            {t('survey.questions.interestLevel', 'Intérêt')}
                            <TrendingUp size={18} />
                        </h3>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.interest}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                    <YAxis tick={{ fontSize: 10 }} />
                                    <RechartsTooltip 
                                        cursor={{fill: 'rgba(239, 68, 68, 0.1)'}}
                                        contentStyle={{ background: '#000', border: '2px solid var(--color-border)', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card variant="manga" className={styles.chartCard}>
                        <h3>
                            {t('survey.questions.mostAttractiveFeatures', 'Fonctionnalités')}
                            <Star size={18} />
                        </h3>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={stats?.features.slice(0, 5)} margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                    <RechartsTooltip 
                                        contentStyle={{ background: '#000', border: '2px solid var(--color-border)', color: '#fff' }}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>

                    <Card variant="manga" className={styles.chartCard}>
                        <h3>
                            {t('survey.questions.status', 'Situation')}
                            <User size={18} />
                        </h3>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats?.status}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={85}
                                        dataKey="value"
                                        stroke="none"
                                    >
                                        {stats?.status.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        contentStyle={{ background: '#000', border: '2px solid var(--color-border)', color: '#fff' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </div>

                {/* Individual Responses List */}
                <div className={styles.responsesSection}>
                    <h2 className={styles.sectionTitle}>
                        <Users size={24} /> {t('admin.survey.raw_data', 'Données brutes')}
                    </h2>
                    
                    <div className={styles.tableContainer}>
                        <table className={styles.responsesTable}>
                            <thead>
                                <tr>
                                    <th>{t('admin.survey.date', 'Date')}</th>
                                    <th>{t('admin.survey.email', 'Email')}</th>
                                    <th>{t('admin.survey.profile', 'Profil')}</th>
                                    <th>{t('admin.survey.interest', 'Intérêt')}</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {responses.map((response) => (
                                    <Fragment key={response.id}>
                                        <tr 
                                            className={expandedRow === response.id ? styles.expandedRow : ''}
                                            onClick={() => setExpandedRow(expandedRow === response.id ? null : response.id)}
                                        >
                                            <td>
                                                <div className={styles.dateTime}>
                                                    <Clock size={14} />
                                                    {new Date(response.submittedAt || 0).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.emailCell}>
                                                    <Mail size={14} />
                                                    {String(response.answers?.email || 'Anonymous')}
                                                </div>
                                            </td>
                                            <td>
                                                {String(response.answers?.ageRange || '?')}, {String(response.answers?.status || '?')}
                                            </td>
                                            <td>
                                                <span className={`${styles.tag} ${styles[`interest_${String(response.answers?.interestLevel || '').replace(/[^a-zA-Z0-9]/g, '_')}`] || styles.interest_Unknown}`}>
                                                    {String(response.answers?.interestLevel || t('common.unknown', 'Inconnu'))}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {expandedRow === response.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                            </td>
                                        </tr>
                                        {expandedRow === response.id && (
                                            <tr className={styles.detailsRow}>
                                                <td colSpan={5}>
                                                    <div className={styles.detailsContent}>
                                                        <div className={styles.detailsGrid}>
                                                            {Object.entries(response.answers || {}).map(([key, value]) => (
                                                                <div key={key} className={styles.detailItem}>
                                                                    <label>{t(`survey.questions.${key}`, key.replace(/([A-Z])/g, ' $1').trim())}</label>
                                                                    <p>{Array.isArray(value) ? value.join(', ') : String(value)}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        {(response.userAgent || response.language) && (
                                                            <div className={styles.technicalInfo}>
                                                                {response.userAgent && <small><Globe size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> User Agent: {response.userAgent}</small>}
                                                                {response.language && <small>Language: {response.language}</small>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                </>
            )}
        </div>
    );
}

