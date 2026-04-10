/**
 * Survey Dashboard page
 */
import { useState, useEffect, useMemo, Fragment } from 'react';
import { 
    Users, 
    ChevronDown, 
    ChevronUp,
    User,
    ArrowLeft,
    TrendingUp,
    Star,
    Mail,
    Calendar,
    Clipboard,
    Trash2,
    Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getSurveyResponses, deleteSurveyResponse, type SurveyResponse } from '@/firebase/firestore';
import { 
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';
import styles from './SurveyDashboard.module.css';
import { Link } from '@/components/routing/LocalizedLink';
import { useMounted } from '@/hooks/useMounted';
import { useToast } from '@/context/ToastContext';

const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#6366f1'];

export default function SurveyDashboard() {
    const { t } = useTranslation();
    const isMounted = useMounted();
    const { addToast } = useToast();
    const [responses, setResponses] = useState<SurveyResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadResponses = async () => {
        try {
            const data = await getSurveyResponses();
            setResponses(data);
        } catch (err) {
            console.error("Failed to load survey responses:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadResponses();
    }, []);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!window.confirm(t('admin.survey.confirm_delete'))) return;

        setDeletingId(id);
        try {
            await deleteSurveyResponse(id);
            addToast(t('admin.survey.delete_success'), 'success');
            setResponses(prev => prev.filter(r => r.id !== id));
            if (expandedRow === id) setExpandedRow(null);
        } catch (err) {
            addToast(t('admin.survey.delete_error'), 'error');
        } finally {
            setDeletingId(null);
        }
    };

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
                <p>{t('admin.survey.loading')}</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link to="/admin" className={styles.backLink}>
                        <ArrowLeft size={16} /> {t('common.back')}
                    </Link>
                    <h1 className={styles.title}>
                        <Clipboard size={32} /> {t('admin.survey.title')}
                    </h1>
                </div>
                <div className={styles.statsBadge}>
                    <strong>{responses.length}</strong> {t('admin.survey.total_responses')}
                </div>
            </div>

            {/* summary row */}
            {responses.length === 0 ? (
                <Card variant="manga" className={styles.emptyState}>
                    <Clipboard size={48} />
                    <p>{t('admin.survey.no_responses')}</p>
                </Card>
            ) : (
                <>
                <div className={styles.summaryGrid}>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.total')}</div>
                        <div className={styles.summaryValue}>{stats?.total}</div>
                        <Users className={styles.summaryIcon} size={80} />
                    </Card>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.waitlist')}</div>
                        <div className={styles.summaryValue}>{stats?.waitlist}</div>
                        <Mail className={styles.summaryIcon} size={80} />
                    </Card>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.hyped')}</div>
                        <div className={styles.summaryValue}>{stats?.highInterest}</div>
                        <TrendingUp className={styles.summaryIcon} size={80} />
                    </Card>
                    <Card variant="manga" className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>{t('admin.survey.labels.premium')}</div>
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
                        <div className={styles.chartContainer} style={{ minWidth: 0 }}>
                            {isMounted ? (
                                <ResponsiveContainer width="99%" height="100%" debounce={100}>
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
                            ) : (
                                <div style={{ height: '100%', border: '1px dashed var(--color-border)', opacity: 0.5 }} />
                            )}
                        </div>
                    </Card>

                    <Card variant="manga" className={styles.chartCard}>
                        <h3>
                            {t('survey.questions.interestLevel', 'Intérêt')}
                            <TrendingUp size={18} />
                        </h3>
                        <div className={styles.chartContainer} style={{ minWidth: 0 }}>
                            {isMounted ? (
                                <ResponsiveContainer width="99%" height="100%" debounce={100}>
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
                            ) : (
                                <div style={{ height: '100%', border: '1px dashed var(--color-border)', opacity: 0.5 }} />
                            )}
                        </div>
                    </Card>

                    <Card variant="manga" className={styles.chartCard}>
                        <h3>
                            {t('survey.questions.mostAttractiveFeatures', 'Fonctionnalités')}
                            <Star size={18} />
                        </h3>
                        <div className={styles.chartContainer} style={{ minWidth: 0 }}>
                            {isMounted ? (
                                <ResponsiveContainer width="99%" height="100%" debounce={100}>
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
                            ) : (
                                <div style={{ height: '100%', border: '1px dashed var(--color-border)', opacity: 0.5 }} />
                            )}
                        </div>
                    </Card>

                    <Card variant="manga" className={styles.chartCard}>
                        <h3>
                            {t('survey.questions.status', 'Situation')}
                            <User size={18} />
                        </h3>
                        <div className={styles.chartContainer} style={{ minWidth: 0 }}>
                            {isMounted ? (
                                <ResponsiveContainer width="99%" height="100%" debounce={100}>
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
                            ) : (
                                <div style={{ height: '100%', border: '1px dashed var(--color-border)', opacity: 0.5 }} />
                            )}
                        </div>
                    </Card>
                </div>

                {/* Individual Responses List */}
                <div className={styles.responsesSection}>
                    <h2 className={styles.sectionTitle}>
                        <Users size={24} /> {t('admin.survey.raw_data')}
                    </h2>
                    
                    <div className={styles.tableContainer}>
                        <table className={styles.responsesTable}>
                            <thead>
                                <tr>
                                    <th>{t('admin.survey.date')}</th>
                                    <th>{t('admin.survey.email')}</th>
                                    <th>{t('admin.survey.profile')}</th>
                                    <th>{t('admin.survey.interest')}</th>
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
                                                    <Calendar size={14} />
                                                    <span>
                                                        {isMounted 
                                                            ? new Date(response.submittedAt || 0).toLocaleDateString()
                                                            : '...'}
                                                    </span>
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
                                                    {String(response.answers?.interestLevel || t('common.unknown'))}
                                                </span>
                                            </td>
                                             <td style={{ textAlign: 'right' }}>
                                                <div className={styles.actionGroup}>
                                                    <button 
                                                        className={styles.deleteBtn}
                                                        onClick={(e) => handleDelete(e, response.id)}
                                                        disabled={deletingId === response.id}
                                                        title={t('admin.feedback.delete')}
                                                    >
                                                        {deletingId === response.id ? <Loader2 size={16} className={styles.spin} /> : <Trash2 size={16} />}
                                                    </button>
                                                    {expandedRow === response.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
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
                                            <div className={styles.detailsActions}>
                                                <button 
                                                    className={styles.deleteFullBtn}
                                                    onClick={(e) => handleDelete(e, response.id)}
                                                    disabled={deletingId === response.id}
                                                >
                                                    {deletingId === response.id ? <Loader2 size={14} className={styles.spin} /> : <Trash2 size={14} />}
                                                    {t('admin.feedback.delete')}
                                                </button>
                                            </div>
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
