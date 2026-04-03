import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Activity, RefreshCw, Server, Database, Shield, HardDrive,
    UserCheck, Trophy, Ban, Lock, Unlock, AlertTriangle, CheckCircle, Zap,
    MessageCircle, List, Tv, Newspaper, Target, ClipboardList,
    Download, Clock, Radio, TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getAdminStats, getHealthHistory } from '@/firebase/firestore';
import {
    getFullHealthReport,
    sendDiscordHealthAlert,
    runSelfHealing,
    type FullHealthReport,
    type ServiceHealthResult,
    type ServiceStatus
} from '@/firebase/healthChecks';
import styles from './Health.module.css';

const STATUS_LABELS: Record<ServiceStatus, string> = {
    operational: 'OK',
    degraded: 'WARN',
    down: 'DOWN',
    checking: '...'
};

const SERVICE_ICONS: Record<string, typeof Server> = {
    'Firebase Auth': Lock,
    'Firestore': Database,
    'Storage': HardDrive,
    'Jikan API': Zap
};

interface DiscordConfig {
    webhookUrl: string;
    enabled: boolean;
}

function getScoreColor(score: number): string {
    if (score >= 80) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
}

function getBarColor(value: number): string {
    if (value >= 80) return '#22c55e';
    if (value >= 50) return '#f59e0b';
    return '#ef4444';
}

function formatDate(iso: string | null): string {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    } catch {
        return iso;
    }
}

/** Inline SVG sparkline for score history */
function ScoreSparkline({ data }: { data: ScoreHistoryEntry[] }) {
    if (data.length < 2) return null;

    const width = 200;
    const height = 40;
    const padding = 2;
    const scores = data.map(d => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;

    const points = scores.map((s, i) => {
        const x = padding + (i / (scores.length - 1)) * (width - padding * 2);
        const y = height - padding - ((s - min) / range) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    const lastScore = scores[scores.length - 1];
    const color = getScoreColor(lastScore);

    return (
        <div className={styles.sparklineContainer}>
            <svg viewBox={`0 0 ${width} ${height}`} className={styles.sparklineSvg}>
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Last point dot */}
                {(() => {
                    const lastX = padding + ((scores.length - 1) / (scores.length - 1)) * (width - padding * 2);
                    const lastY = height - padding - ((lastScore - min) / range) * (height - padding * 2);
                    return <circle cx={lastX} cy={lastY} r="3" fill={color} />;
                })()}
            </svg>
            <span className={styles.sparklineLabel}>{data.length} pts</span>
        </div>
    );
}

/** Latency bar chart for infrastructure services */
function LatencyChart({ services }: { services: ServiceHealthResult[] }) {
    const maxTime = Math.max(...services.map(s => s.responseTime), 1);

    return (
        <div className={styles.latencyChart}>
            {services.map(svc => (
                <div key={svc.service} className={styles.latencyRow}>
                    <span className={styles.latencyLabel}>{svc.service.split(' ').pop()}</span>
                    <div className={styles.latencyTrack}>
                        <div
                            className={styles.latencyBar}
                            style={{
                                width: `${Math.max((svc.responseTime / maxTime) * 100, 4)}%`,
                                background: svc.responseTime > 1000 ? '#ef4444'
                                    : svc.responseTime > 300 ? '#f59e0b' : '#22c55e'
                            }}
                        />
                    </div>
                    <span className={styles.latencyValue}>{svc.responseTime}ms</span>
                </div>
            ))}
        </div>
    );
}

export interface ScoreHistoryEntry {
    score: number;
    timestamp: any;
    [key: string]: any;
}

export default function AdminHealth() {
    const { t } = useTranslation();
    const [report, setReport] = useState<FullHealthReport | null>(null);
    const [adminStats, setAdminStats] = useState<{
        dau: number; wau: number; mau: number; engagementRate: number;
        totalUsers: number; newUsersToday: number;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [repairing, setRepairing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [scoreHistory, setScoreHistory] = useState<ScoreHistoryEntry[]>([]);

    // Discord Integration State
    const [showDiscordModal, setShowDiscordModal] = useState(false);
    const [discordConfig, setDiscordConfig] = useState<DiscordConfig>(() => {
        const saved = localStorage.getItem('bingeki_discord_health');
        return saved ? JSON.parse(saved) : { webhookUrl: '', enabled: false };
    });

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [healthReport, stats, history] = await Promise.all([
                getFullHealthReport(),
                getAdminStats(),
                getHealthHistory()
            ]);
            setReport(healthReport);
            setAdminStats(stats);
            setScoreHistory(history as any);
            setLastRefresh(new Date());

            // Auto-report to Discord if critical (score < 50 OR any service is DOWN)
            const hasCriticalFailure = healthReport.infrastructure.some(s => s.status === 'down');
            const alertNeeded = (healthReport.overallScore < 50 || hasCriticalFailure) && discordConfig.enabled && discordConfig.webhookUrl;

            if (alertNeeded) {
                const lastAlert = localStorage.getItem('bingeki_last_discord_alert');
                const now = Date.now();
                // Avoid spamming: only alert every 4 hours
                if (!lastAlert || now - parseInt(lastAlert) > 4 * 60 * 60 * 1000) {
                    await sendDiscordHealthAlert(discordConfig.webhookUrl, healthReport);
                    localStorage.setItem('bingeki_last_discord_alert', now.toString());
                }
            }
        } catch (error) {
            console.error('[Health] Failed to fetch health data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [discordConfig]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleManualRepair = async () => {
        if (!window.confirm("Run full system scan and repair common data issues?")) return;
        setRepairing(true);
        try {
            const result = await runSelfHealing();
            alert(`Repair complete! Fixed ${result.repaired} issues, encountered ${result.errors} errors.`);
            fetchData();
        } catch (e) {
            alert("Repair failed. Check console.");
        } finally {
            setRepairing(false);
        }
    };

    const saveDiscordConfig = () => {
        localStorage.setItem('bingeki_discord_health', JSON.stringify(discordConfig));
        setShowDiscordModal(false);
        if (discordConfig.enabled && discordConfig.webhookUrl) {
            alert("Discord alerts enabled. A test message will be sent if score is critical.");
        }
    };

    const exportJson = useCallback(() => {
        if (!report) return;
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bingeki-health-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [report]);

    // Count operational services for header badge
    const operationalCount = useMemo(() => {
        if (!report) return 0;
        return report.infrastructure.filter(s => s.status === 'operational').length;
    }, [report]);

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingBar}>
                    <div className={styles.loadingBarFill} />
                </div>
                <span className={styles.loadingText}>
                    {t('admin.health.loading', 'Diagnostic en cours...')}
                </span>
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className={styles.healthPage}>
            {/* ─── Alert Banner (Local Overlays for critical state) ─── */}
            {report.overallScore < 50 && (
                <div className={styles.alertBanner}>
                    <div className={styles.alertLeft}>
                        <Zap size={16} fill="white" />
                        CRITICAL SYSTEM HEALTH ({report.overallScore}/100)
                    </div>
                    <button className={styles.alertAction} onClick={handleManualRepair}>
                        Run Self-Healing
                    </button>
                </div>
            )}

            {/* ─── Secondary Actions Bar ─── */}
            <div className={styles.secondaryActions}>
                <button 
                    className={styles.discordBtn} 
                    onClick={() => setShowDiscordModal(true)}
                    title="Configure Discord Webhooks"
                >
                    <Radio size={14} />
                    {discordConfig.enabled ? "Discord Active" : "Config Discord"}
                </button>
                <button 
                    className={styles.repairBtn} 
                    onClick={handleManualRepair}
                    disabled={repairing}
                >
                    <RefreshCw size={14} className={repairing ? styles.spinning : ''} />
                    {repairing ? "Repairing..." : "Manual Repair"}
                </button>
            </div>
            {/* ─── Header ─── */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>
                        <Activity size={24} strokeWidth={3} />
                    </div>
                    <div>
                        <h1 className={styles.title}>
                            {t('admin.health.title', 'Health Dashboard')}
                        </h1>
                        <p className={styles.subtitle}>
                            {t('admin.health.subtitle', 'Diagnostic temps réel de la plateforme')}
                        </p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        className={styles.exportBtn}
                        onClick={exportJson}
                        title={t('admin.health.export_json', 'Exporter JSON')}
                    >
                        <Download size={14} />
                        JSON
                    </button>
                    <button
                        className={styles.refreshBtn}
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                    >
                        <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
                        {t('admin.health.refresh', 'Actualiser')}
                    </button>
                </div>
            </div>

            {/* ─── Overall Score + Sparkline ─── */}
            <div className={styles.overallScoreCard}>
                <div
                    className={styles.scoreCircle}
                    style={{ borderColor: getScoreColor(report.overallScore) }}
                >
                    <span
                        className={styles.scoreValue}
                        style={{ color: getScoreColor(report.overallScore) }}
                    >
                        {report.overallScore}
                    </span>
                    <span className={styles.scoreLabel}>/100</span>
                </div>
                <div className={styles.scoreInfo}>
                    <div className={styles.scoreRow}>
                        <div>
                            <h2 className={styles.scoreTitle}>
                                {report.overallScore >= 80
                                    ? t('admin.health.score_good', '🟢 Système opérationnel')
                                    : report.overallScore >= 50
                                        ? t('admin.health.score_warn', '🟡 Dégradation détectée')
                                        : t('admin.health.score_bad', '🔴 Problèmes critiques')
                                }
                            </h2>
                            <p className={styles.scoreDesc}>
                                {t('admin.health.score_desc', "Score calculé à partir de l'infrastructure et de l'intégrité des données.")}
                            </p>
                        </div>
                        <ScoreSparkline data={scoreHistory} />
                    </div>
                    <div className={styles.scoreMeta}>
                        {lastRefresh && (
                            <span className={styles.lastChecked}>
                                {t('admin.health.last_check', 'Dernier check')}: {lastRefresh.toLocaleTimeString()}
                            </span>
                        )}
                        <span className={styles.serviceCounter}>
                            {operationalCount}/{report.infrastructure.length} {t('admin.health.services_up', 'services OK')}
                        </span>
                    </div>
                </div>
            </div>

            {/* ─── Sections Grid ─── */}
            <div className={styles.sectionsGrid}>

                {/* ─── 1. Infrastructure ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <Server size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.infrastructure', 'Infrastructure')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        {report.infrastructure.map((svc: ServiceHealthResult) => {
                            const Icon = SERVICE_ICONS[svc.service] || Server;
                            return (
                                <div key={svc.service} className={styles.serviceRow}>
                                    <div className={styles.serviceLeft}>
                                        <div
                                            className={styles.statusDot}
                                            data-status={svc.status}
                                        />
                                        <Icon size={14} style={{ color: 'var(--color-text-dim)' }} />
                                        <span className={styles.serviceName}>{svc.service}</span>
                                    </div>
                                    <div className={styles.serviceRight}>
                                        <span className={styles.responseTime}>{svc.responseTime}ms</span>
                                        <span
                                            className={styles.statusBadge}
                                            data-status={svc.status}
                                        >
                                            {STATUS_LABELS[svc.status]}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Latency chart */}
                        <div style={{ marginTop: 'var(--space-md)' }}>
                            <LatencyChart services={report.infrastructure} />
                        </div>
                    </div>
                </div>

                {/* ─── 2. API Queue Monitor ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <Radio size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.api_queue', 'File API (Jikan)')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{report.apiQueue.pending}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.queue_pending', 'En attente')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    <span
                                        className={styles.statusDot}
                                        data-status={report.apiQueue.processing ? 'operational' : 'checking'}
                                        style={{ display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }}
                                    />
                                    {report.apiQueue.processing
                                        ? t('admin.health.queue_active', 'Actif')
                                        : t('admin.health.queue_idle', 'Idle')}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.queue_status', 'Statut')}
                                </div>
                            </div>
                        </div>
                        <div className={styles.queueNote}>
                            <Clock size={12} />
                            <span>{t('admin.health.queue_throttle', 'Throttle: 400ms/requête (2.5 req/s)')}</span>
                        </div>
                    </div>
                </div>

                {/* ─── 3. Activité Utilisateurs ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <UserCheck size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.user_activity', 'Activité Utilisateurs')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{adminStats?.dau || 0}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.dashboard.dau', 'Actifs (24h)')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{adminStats?.wau || 0}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.dashboard.wau', 'Actifs (7j)')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{adminStats?.mau || 0}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.dashboard.mau', 'Actifs (30j)')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    +{adminStats?.newUsersToday || 0}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.new_today', "Nouveaux aujourd'hui")}
                                </div>
                            </div>
                        </div>

                        <div className={styles.healthBarContainer}>
                            <div className={styles.healthBarLabel}>
                                <span>{t('admin.health.engagement', 'Engagement')}</span>
                                <span>{Math.round(adminStats?.engagementRate || 0)}%</span>
                            </div>
                            <div className={styles.healthBarTrack}>
                                <div
                                    className={styles.healthBarFill}
                                    style={{
                                        width: `${adminStats?.engagementRate || 0}%`,
                                        background: getBarColor(adminStats?.engagementRate || 0)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 4. Community Content ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <MessageCircle size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.community', 'Contenu Communautaire')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.serviceRow}>
                            <div className={styles.serviceLeft}>
                                <MessageCircle size={14} style={{ color: 'var(--color-text-dim)' }} />
                                <span className={styles.serviceName}>
                                    {t('admin.health.comments', 'Commentaires')}
                                </span>
                            </div>
                            <span className={styles.responseTime}>{report.community.totalComments}</span>
                        </div>
                        <div className={styles.serviceRow}>
                            <div className={styles.serviceLeft}>
                                <List size={14} style={{ color: 'var(--color-text-dim)' }} />
                                <span className={styles.serviceName}>
                                    {t('admin.health.tier_lists', 'Tier Lists')}
                                </span>
                            </div>
                            <div className={styles.serviceRight}>
                                <span className={styles.responseTime}>
                                    {report.community.publicTierLists} {t('admin.health.public', 'publiques')}
                                </span>
                                <span className={styles.responseTime}>{report.community.totalTierLists} {t('admin.health.total_short', 'total')}</span>
                            </div>
                        </div>
                        <div className={styles.serviceRow}>
                            <div className={styles.serviceLeft}>
                                <Tv size={14} style={{ color: 'var(--color-text-dim)' }} />
                                <span className={styles.serviceName}>
                                    {t('admin.health.watch_parties', 'Watch Parties')}
                                </span>
                            </div>
                            <div className={styles.serviceRight}>
                                <span className={`${styles.statusBadge}`} data-status="operational">
                                    {report.community.activeWatchParties} {t('admin.health.active', 'actives')}
                                </span>
                                <span className={styles.responseTime}>{report.community.totalWatchParties} {t('admin.health.total_short', 'total')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 5. Intégrité des Données ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <Database size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.data_integrity', 'Intégrité des Données')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    {report.dataIntegrity.dataHealthScore}%
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.data_score', 'Score Santé')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    {report.dataIntegrity.totalUsers}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.total_users', 'Total Utilisateurs')}
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'var(--space-md)' }}>
                            <div className={styles.serviceRow}>
                                <div className={styles.serviceLeft}>
                                    {report.dataIntegrity.missingDisplayName > 0
                                        ? <AlertTriangle size={14} color="#f59e0b" />
                                        : <CheckCircle size={14} color="#22c55e" />
                                    }
                                    <span className={styles.serviceName}>
                                        {t('admin.health.display_names', 'Display Names')}
                                    </span>
                                </div>
                                <span className={styles.responseTime}>
                                    {report.dataIntegrity.missingDisplayName} {t('admin.health.missing', 'manquants')}
                                </span>
                            </div>
                            <div className={styles.serviceRow}>
                                <div className={styles.serviceLeft}>
                                    {report.dataIntegrity.missingPhotoURL > 0
                                        ? <AlertTriangle size={14} color="#f59e0b" />
                                        : <CheckCircle size={14} color="#22c55e" />
                                    }
                                    <span className={styles.serviceName}>
                                        {t('admin.health.avatars', 'Avatars')}
                                    </span>
                                </div>
                                <span className={styles.responseTime}>
                                    {report.dataIntegrity.missingPhotoURL} {t('admin.health.missing', 'manquants')}
                                </span>
                            </div>
                        </div>

                        <div className={styles.healthBarContainer}>
                            <div className={styles.healthBarLabel}>
                                <span>{t('admin.health.completeness', 'Complétude')}</span>
                                <span>{report.dataIntegrity.dataHealthScore}%</span>
                            </div>
                            <div className={styles.healthBarTrack}>
                                <div
                                    className={styles.healthBarFill}
                                    style={{
                                        width: `${report.dataIntegrity.dataHealthScore}%`,
                                        background: getBarColor(report.dataIntegrity.dataHealthScore)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 6. Editorial / News ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <Newspaper size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.editorial', 'Éditorial / News')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{report.editorial.totalNews}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.total_articles', 'Total Articles')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue} style={{ fontSize: '1rem' }}>
                                    {formatDate(report.editorial.lastPublished)}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.last_published', 'Dernière publication')}
                                </div>
                            </div>
                        </div>
                        {report.editorial.lastTitle && (
                            <div className={styles.editorialLast}>
                                <TrendingUp size={12} />
                                <span className={styles.editorialTitle}>
                                    {report.editorial.lastTitle}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── 7. Gamification ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <Trophy size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.gamification', 'Gamification')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    {report.gamification.avgLevel}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.avg_level', 'Niveau Moyen')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    {report.gamification.maxLevelUsers}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.max_level', 'Niveau Max (100)')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    {report.gamification.badgeUnlockRate}%
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.badge_rate', 'Badge Unlock Rate')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>
                                    {report.gamification.avgXP.toLocaleString()}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.avg_xp', 'XP Moyen')}
                                </div>
                            </div>
                        </div>

                        <div className={styles.healthBarContainer}>
                            <div className={styles.healthBarLabel}>
                                <span>{t('admin.health.badge_adoption', 'Adoption Badges')}</span>
                                <span>{report.gamification.badgeUnlockRate}%</span>
                            </div>
                            <div className={styles.healthBarTrack}>
                                <div
                                    className={styles.healthBarFill}
                                    style={{
                                        width: `${report.gamification.badgeUnlockRate}%`,
                                        background: getBarColor(report.gamification.badgeUnlockRate)
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 8. Challenges ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <Target size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.challenges', 'Challenges')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{report.challenges.totalChallenges}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.total_short', 'Total')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue} style={{ color: '#22c55e' }}>
                                    {report.challenges.activeChallenges}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.active', 'Actifs')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue} style={{ color: 'var(--color-text-dim)' }}>
                                    {report.challenges.completedChallenges}
                                </div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.completed', 'Terminés')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 9. Surveys ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <ClipboardList size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.surveys', 'Sondages')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.statsGrid}>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{report.survey.totalResponses}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.survey_responses', 'Réponses')}
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <div className={styles.statValue}>{report.survey.totalWaitlist}</div>
                                <div className={styles.statLabel}>
                                    {t('admin.health.survey_waitlist', 'Waitlist')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 10. Sécurité ─── */}
                <div className={styles.sectionCard}>
                    <div className={styles.sectionHeader}>
                        <Shield size={18} className={styles.sectionIcon} />
                        <h3 className={styles.sectionTitle}>
                            {t('admin.health.security', 'Sécurité')}
                        </h3>
                    </div>
                    <div className={styles.sectionBody}>
                        <div className={styles.securityRow}>
                            <div className={styles.securityLabel}>
                                <AlertTriangle size={14} />
                                {t('admin.system.maintenance_mode', 'Mode Maintenance')}
                            </div>
                            <span className={`${styles.securityValue} ${
                                report.security.maintenanceMode ? styles.securityDanger : styles.securityOk
                            }`}>
                                {report.security.maintenanceMode ? 'ON' : 'OFF'}
                            </span>
                        </div>

                        <div className={styles.securityRow}>
                            <div className={styles.securityLabel}>
                                {report.security.registrationsOpen
                                    ? <Unlock size={14} />
                                    : <Lock size={14} />
                                }
                                {t('admin.system.registrations', 'Inscriptions')}
                            </div>
                            <span className={`${styles.securityValue} ${
                                report.security.registrationsOpen ? styles.securityOk : styles.securityWarn
                            }`}>
                                {report.security.registrationsOpen
                                    ? t('admin.health.open', 'OUVERT')
                                    : t('admin.health.closed', 'FERMÉ')
                                }
                            </span>
                        </div>

                        <div className={styles.securityRow}>
                            <div className={styles.securityLabel}>
                                <Ban size={14} />
                                {t('admin.health.banned_users', 'Utilisateurs Bannis')}
                            </div>
                            <span className={`${styles.securityValue} ${
                                report.security.bannedUsersCount > 0 ? styles.securityWarn : styles.securityOk
                            }`}>
                                {report.security.bannedUsersCount}
                            </span>
                        </div>

                        <div className={styles.securityRow}>
                            <div className={styles.securityLabel}>
                                <CheckCircle size={14} />
                                {t('admin.health.data_shield', 'Data Shield')}
                            </div>
                            <span className={`${styles.securityValue} ${styles.securityOk}`}>
                                v3.0
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── Auto-refresh indicator ─── */}
            <div className={styles.autoRefreshBar}>
                <div className={styles.liveDot} />
                <span>
                    {t('admin.health.auto_refresh', 'Auto-refresh toutes les 60s')} —{' '}
                    {lastRefresh
                        ? `${t('admin.health.last_check', 'Dernier check')}: ${lastRefresh.toLocaleTimeString()}`
                        : '...'
                    }
                </span>
            </div>

            {/* ─── Discord Configuration Modal ─── */}
            {showDiscordModal && (
                <div className={styles.modalOverlay} onClick={() => setShowDiscordModal(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2 className={styles.modalTitle}>Discord Alerts</h2>
                            <p className={styles.modalDesc}>
                                Receive notifications on Discord when system health drops below 50%.
                            </p>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.inputGroup}>
                                <label className={styles.inputLabel}>Webhook URL</label>
                                <input 
                                    className={styles.textInput}
                                    type="text" 
                                    placeholder="https://discord.com/api/webhooks/..."
                                    value={discordConfig.webhookUrl}
                                    onChange={e => setDiscordConfig({...discordConfig, webhookUrl: e.target.value})}
                                />
                            </div>
                            <div className={styles.checkboxGroup}>
                                <label className={styles.checkboxLabel}>
                                    <input 
                                        type="checkbox"
                                        checked={discordConfig.enabled}
                                        onChange={e => setDiscordConfig({...discordConfig, enabled: e.target.checked})}
                                    />
                                    Enable Alerts
                                </label>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setShowDiscordModal(false)}>
                                Cancel
                            </button>
                            <button className={styles.saveBtn} onClick={saveDiscordConfig}>
                                Save Config
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
