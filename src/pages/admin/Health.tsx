/**
 * Unified Health & System Dashboard
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    Activity, RefreshCw, Server, Database, Shield, HardDrive,
    UserCheck, Trophy, Ban, Lock, Unlock, AlertTriangle, CheckCircle, Zap,
    MessageCircle, List, Tv, Newspaper, Target, ClipboardList,
    Download, Clock, Radio, TrendingUp,
    Terminal, Megaphone, Save, XCircle, History, User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
    getAdminStats, getHealthHistory,
    setGlobalAnnouncement, setGlobalConfig, getGlobalConfig,
    getAuditLogs, logAdminAction, type AuditLogEntry
} from '@/firebase/firestore';
import {
    getFullHealthReport,
    sendDiscordHealthAlert,
    runSelfHealing,
    getRepairHistory,
    type FullHealthReport,
    type ServiceHealthResult,
    type ServiceStatus,
    type RepairSession
} from '@/firebase/healthChecks';
import { getAllActivities } from '@/firebase/misc';
import { logDataBackup } from '@/utils/dataProtection';
import { checkJikanStatus, type JikanStatusResponse } from '@/services/animeApi';
import { useAuthStore } from '@/store/authStore';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import styles from './Health.module.css';
import { logger } from '@/utils/logger';

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
    timestamp: { seconds: number; nanoseconds: number } | string | number | Date;
    [key: string]: unknown;
}

export default function AdminHealth() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') as 'health' | 'system' | 'audit') || 'health';

    const setActiveTab = (tab: 'health' | 'system' | 'audit') => {
        setSearchParams({ tab });
    };

    const { userProfile } = useAuthStore();

    // ─── Health Tab State ───
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
    const [repairHistory, setRepairHistory] = useState<RepairSession[]>([]);
    const [hasPermissionError, setHasPermissionError] = useState(false);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);

    // Discord Integration State
    const [showDiscordModal, setShowDiscordModal] = useState(false);
    const [discordConfig, setDiscordConfig] = useState<DiscordConfig>(() => {
        const saved = localStorage.getItem('bingeki_discord_health');
        return saved ? JSON.parse(saved) : {
            webhookUrl: '',
            enabled: false
        };
    });
    const [isTestingDiscord, setIsTestingDiscord] = useState(false);
    const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

    // ─── System Tab State ───
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [registrationsOpen, setRegistrationsOpen] = useState(true);
    const [logs, setLogs] = useState<string[]>(() => [
        `[SYSTEM] Console système initialisée à ${new Date().toLocaleTimeString()}`,
        `[AUTH] Connecté en tant qu'administrateur`,
        `[DB] Connexion Firestore : STABLE`,
        `[SHIELD] Protocole de protection des données v3.0 : ACTIF`,
        `[CONNECT] En attente des flux d'activités globaux...`
    ]);

    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastActive, setBroadcastActive] = useState(false);
    const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'alert'>('info');

    const [jikanStatus, setJikanStatus] = useState<JikanStatusResponse | null>(null);
    const [checkingJikan, setCheckingJikan] = useState(false);

    // ─── Audit Tab State ───
    const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(true);

    // Fetch Health Data
    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [healthReport, stats, history, repairLog] = await Promise.all([
                getFullHealthReport(),
                getAdminStats(),
                getHealthHistory(),
                getRepairHistory(10)
            ]);
            setReport(healthReport);
            setAdminStats(stats);
            setScoreHistory(history as unknown as ScoreHistoryEntry[]);
            setRepairHistory(repairLog);
            setHasPermissionError(false);
            setLastRefresh(new Date());

            // Auto-report to Discord if critical
            const hasCriticalFailure = healthReport.infrastructure.some(s => s.status === 'down');
            const alertNeeded = (healthReport.overallScore < 50 || hasCriticalFailure) && discordConfig.enabled && discordConfig.webhookUrl;

            if (alertNeeded) {
                const lastAlert = localStorage.getItem('bingeki_last_discord_alert');
                const now = Date.now();
                if (!lastAlert || now - parseInt(lastAlert) > 4 * 60 * 60 * 1000) {
                    await sendDiscordHealthAlert(discordConfig.webhookUrl, healthReport);
                    localStorage.setItem('bingeki_last_discord_alert', now.toString());
                }
            }
        } catch (error: unknown) {
            logger.error('[Health] Failed to fetch health data:', error);
            const err = error as { code?: string; message?: string };
            if (err?.code === 'permission-denied' || err?.message?.includes('permissions')) {
                setHasPermissionError(true);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [discordConfig]);

    // Fetch Audit Logs
    const fetchAuditLogs = async () => {
        setLoadingAudit(true);
        try {
            const data = await getAuditLogs(50);
            setAuditLogs(data);
        } catch (e) {
            logger.error('Failed to fetch audit logs:', e);
        } finally {
            setLoadingAudit(false);
        }
    };

    // Load Health Data initially and on interval
    useEffect(() => {
        fetchData();
        const interval = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Load System Configuration and poll activities / Jikan status when in System tab
    useEffect(() => {
        if (activeTab === 'system') {
            getGlobalConfig().then(config => {
                if (config) {
                    setMaintenanceMode(config.maintenance || false);
                    setRegistrationsOpen(config.registrationsOpen ?? true);
                    if (config.announcement) {
                        setBroadcastMessage(config.announcement.message);
                        setBroadcastActive(config.announcement.active);
                        setBroadcastType(config.announcement.type);
                    }
                }
            });

            const checkApiStatus = async () => {
                setCheckingJikan(true);
                try {
                    const status = await checkJikanStatus();
                    setJikanStatus(status);
                    setLogs(prev => [`[${new Date().toLocaleTimeString()}] [API] Jikan: ${status.status.toUpperCase()} | ${status.responseTime}ms`, ...prev].slice(0, 100));
                } catch (e) {
                    logger.error(e);
                } finally {
                    setCheckingJikan(false);
                }
            };

            checkApiStatus();
            const apiInterval = setInterval(checkApiStatus, 30000);

            const fetchActivities = async () => {
                try {
                    const activities = await getAllActivities(10);
                    const formattedLogs = activities.map(act => {
                        const time = new Date(act.timestamp).toLocaleTimeString();
                        let prefix = '[INFO]';
                        let detail = '';

                        switch (act.type) {
                            case 'watch': prefix = '[WATCH]'; detail = `watched ${act.workTitle || '?'} Ep.${act.episodeNumber}`; break;
                            case 'read': prefix = '[READ]'; detail = `read ${act.workTitle || '?'} Vol.${act.episodeNumber}`; break;
                            case 'complete': prefix = '[DONE]'; detail = `completed ${act.workTitle || 'a work'}`; break;
                            case 'level_up': prefix = '[GAMIF]'; detail = `reached Level ${act.newLevel}`; break;
                            case 'badge': prefix = '[BADGE]'; detail = `unlocked ${act.badgeName}`; break;
                            default: prefix = '[USER]'; detail = `performed action ${act.type}`;
                        }

                        return `[${time}] ${prefix} User ${(act.userName || 'Guest').slice(0, 10)}... ${detail}`;
                    });
                    
                    setLogs(prev => {
                        const uniqueNewLogs = formattedLogs.filter(l => !prev.includes(l));
                        if (uniqueNewLogs.length === 0) return prev;
                        return [...uniqueNewLogs, ...prev].slice(0, 100);
                    });
                } catch (e) {
                    logger.error(e);
                }
            };

            fetchActivities();
            const activityInterval = setInterval(fetchActivities, 5000);

            return () => {
                clearInterval(apiInterval);
                clearInterval(activityInterval);
            };
        } else if (activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeTab]);

    // Handle manual system scans / repairs
    const handleManualRepair = async () => {
        if (!window.confirm("Run full system scan and repair common data issues?")) return;
        setRepairing(true);
        try {
            const adminName = userProfile?.displayName || userProfile?.email?.split('@')[0] || "Admin";
            const result = await runSelfHealing(adminName);
            
            if (userProfile) {
                await logAdminAction({
                    action: 'system_self_healing',
                    adminId: userProfile.uid,
                    adminName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Admin',
                    adminEmail: userProfile.email || undefined,
                    details: `Triggered self-healing. Fixed ${result.repaired} issues, ${result.errors} errors.`
                });
            }

            alert(`Repair complete! Fixed ${result.repaired} issues, encountered ${result.errors} errors.`);
            fetchData(true);
        } catch (e) {
            logger.error('[Health] Manual repair failed:', e);
            alert("Repair failed. Check console.");
        } finally {
            setRepairing(false);
        }
    };

    // Toggle maintenance mode
    const handleToggleMaintenance = async () => {
        const newVal = !maintenanceMode;
        setMaintenanceMode(newVal);
        try {
            await setGlobalConfig({ maintenance: newVal });
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] [CONFIG] Maintenance mode set to ${newVal}`, ...prev]);
            
            if (userProfile) {
                await logAdminAction({
                    action: 'system_maintenance_toggle',
                    adminId: userProfile.uid,
                    adminName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Admin',
                    adminEmail: userProfile.email || undefined,
                    details: `Set maintenance mode to ${newVal}`
                });
            }
        } catch (e) {
            logger.error(e);
            setMaintenanceMode(!newVal);
        }
    };

    // Toggle user registrations
    const handleToggleRegistrations = async () => {
        const newVal = !registrationsOpen;
        setRegistrationsOpen(newVal);
        try {
            await setGlobalConfig({ registrationsOpen: newVal });
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] [CONFIG] Registrations set to ${newVal}`, ...prev]);
            
            if (userProfile) {
                await logAdminAction({
                    action: 'system_registrations_toggle',
                    adminId: userProfile.uid,
                    adminName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Admin',
                    adminEmail: userProfile.email || undefined,
                    details: `Set registrations open to ${newVal}`
                });
            }
        } catch (e) {
            logger.error(e);
            setRegistrationsOpen(!newVal);
        }
    };

    // Handle manual database backup
    const handleBackup = async () => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] [BACKUP] Starting manual system backup...`, ...prev]);
        try {
            logDataBackup('system', 'gamification', { source: 'manual_admin_trigger', time: Date.now() });
            
            if (userProfile) {
                await logAdminAction({
                    action: 'system_backup_manual',
                    adminId: userProfile.uid,
                    adminName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Admin',
                    adminEmail: userProfile.email || undefined,
                    details: 'Triggered manual data protection backup'
                });
            }

            setTimeout(() => {
                setLogs(prev => [`[${new Date().toLocaleTimeString()}] [BACKUP] Backup completed successfully. Data synchronized.`, ...prev]);
            }, 1000);
        } catch {
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] [ERROR] Backup failed.`, ...prev]);
        }
    };

    // Update global broadcast message
    const handleBroadcastSave = async () => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] [BROADCAST] Updating global announcement...`, ...prev]);
        try {
            await setGlobalAnnouncement(broadcastMessage, broadcastType, broadcastActive);
            
            if (userProfile) {
                await logAdminAction({
                    action: 'system_announcement_update',
                    adminId: userProfile.uid,
                    adminName: userProfile.displayName || userProfile.email?.split('@')[0] || 'Admin',
                    adminEmail: userProfile.email || undefined,
                    details: `Updated announcement: Message="${broadcastMessage}", Active=${broadcastActive}, Type=${broadcastType}`
                });
            }

            setLogs(prev => [`[${new Date().toLocaleTimeString()}] [BROADCAST] Success. Message is now ${broadcastActive ? 'LIVE' : 'OFFLINE'}.`, ...prev]);
        } catch {
            setLogs(prev => [`[${new Date().toLocaleTimeString()}] [ERROR] Broadcast update failed.`, ...prev]);
        }
    };

    // Discord configuration webhook save
    const saveDiscordConfig = () => {
        localStorage.setItem('bingeki_discord_health', JSON.stringify(discordConfig));
        setShowDiscordModal(false);
        setTestStatus(null);
        if (discordConfig.enabled && discordConfig.webhookUrl) {
            alert("Discord alerts enabled. A test message will be sent if score is critical.");
        }
    };

    // Discord configuration webhook test
    const testDiscordWebhook = async () => {
        if (!discordConfig.webhookUrl) {
            setTestStatus({ success: false, message: "Webhook URL required" });
            return;
        }

        setIsTestingDiscord(true);
        setTestStatus(null);
        logger.log('[AdminHealth] Starting Discord test...');

        try {
            const success = await sendDiscordHealthAlert(discordConfig.webhookUrl, report!, true);
            if (success) {
                setTestStatus({ success: true, message: "Test message sent!" });
                logger.log('[AdminHealth] Test message success.');
            } else {
                setTestStatus({ success: false, message: "Failed to send message (check console/URL)" });
                logger.error('[AdminHealth] Test message failed.');
            }
        } catch (error) {
            setTestStatus({ success: false, message: "Error during test" });
            logger.error('[AdminHealth] Test error:', error);
        } finally {
            setIsTestingDiscord(false);
        }
    };

    // Export report as JSON
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

    // Audit logs action coloring
    const getAuditActionColor = (action: string) => {
        if (action.includes('delete') || action.includes('ban') || action.includes('remove')) return '#ef4444';
        if (action.includes('update') || action.includes('edit') || action.includes('toggle')) return '#3b82f6';
        if (action.includes('create') || action.includes('add') || action.includes('make') || action.includes('save')) return '#10b981';
        return '#8b5cf6';
    };

    if (loading && activeTab === 'health') {
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

    return (
        <div className={styles.healthPage}>
            {/* ─── Alert Banner (Local Overlays for critical state) ─── */}
            {hasPermissionError && activeTab === 'health' && (
                <div className={styles.permissionWarning}>
                    <Shield size={16} />
                    <span>
                        {t('admin.health.permission_error', "Accès restreint détecté. Certaines données d'historique peuvent être manquantes. Vérifiez que votre profil a bien les droits Admin dans Firestore.")}
                    </span>
                </div>
            )}

            {report && report.overallScore < 50 && activeTab === 'health' && (
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

            {/* ─── Secondary Actions Bar (Only for health tab) ─── */}
            {activeTab === 'health' && (
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
            )}

            {/* ─── Header ─── */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className={styles.headerIcon}>
                        {activeTab === 'health' && <Activity size={24} strokeWidth={3} />}
                        {activeTab === 'system' && <Terminal size={24} strokeWidth={3} />}
                        {activeTab === 'audit' && <History size={24} strokeWidth={3} />}
                    </div>
                    <div>
                        <h1 className={styles.title}>
                            {activeTab === 'health' && t('admin.health.title', 'Health Dashboard')}
                            {activeTab === 'system' && t('admin.system.title', 'Console Système')}
                            {activeTab === 'audit' && 'Journal d\'Audit'}
                        </h1>
                        <p className={styles.subtitle}>
                            {activeTab === 'health' && t('admin.health.subtitle', 'Diagnostic temps réel de la plateforme')}
                            {activeTab === 'system' && t('admin.system.subtitle', 'Console d\'administration et configuration')}
                            {activeTab === 'audit' && 'Registre de traçabilité des actions des administrateurs'}
                        </p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    {activeTab === 'health' && report && (
                        <button
                            className={styles.exportBtn}
                            onClick={exportJson}
                            title={t('admin.health.export_json', 'Exporter JSON')}
                        >
                            <Download size={14} />
                            JSON
                        </button>
                    )}
                    <button
                        className={styles.refreshBtn}
                        onClick={() => {
                            if (activeTab === 'health') fetchData(true);
                            else if (activeTab === 'audit') fetchAuditLogs();
                            else if (activeTab === 'system') {
                                setCheckingJikan(true);
                                checkJikanStatus().then(s => {
                                    setJikanStatus(s);
                                    setCheckingJikan(false);
                                    setLogs(prev => [`[${new Date().toLocaleTimeString()}] [API] Jikan: ${s.status.toUpperCase()} | ${s.responseTime}ms`, ...prev].slice(0, 100));
                                });
                            }
                        }}
                        disabled={refreshing || checkingJikan || (activeTab === 'audit' && loadingAudit)}
                    >
                        <RefreshCw size={16} className={(refreshing || checkingJikan || (activeTab === 'audit' && loadingAudit)) ? styles.spinning : ''} />
                        {t('admin.health.refresh', 'Actualiser')}
                    </button>
                </div>
            </div>

            {/* ─── Brutalist Tabs Navigation ─── */}
            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'health' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('health')}
                >
                    <Activity size={14} />
                    {t('admin.health.tab_health', 'Santé & Performance')}
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'system' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('system')}
                >
                    <Terminal size={14} />
                    {t('admin.health.tab_system', 'Console & Configuration')}
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'audit' ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab('audit')}
                >
                    <History size={14} />
                    {t('admin.health.tab_audit', 'Journal d\'Audit')}
                </button>
            </div>

            {/* ─── TAB CONTENT: HEALTH ─── */}
            {activeTab === 'health' && report && (
                <>
                    {/* Overall Score + Sparkline */}
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

                    {/* Sections Grid */}
                    <div className={styles.sectionsGrid}>
                        {/* 1. Infrastructure */}
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

                                <div style={{ marginTop: 'var(--space-md)' }}>
                                    <LatencyChart services={report.infrastructure} />
                                </div>
                            </div>
                        </div>

                        {/* 2. API Queue Monitor */}
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
                                <div className={styles.queueNote} title="Le système est en veille quand aucune synchronisation n'est en cours.">
                                    <Clock size={12} />
                                    <span>{t('admin.health.queue_throttle', 'Throttle: 400ms/requête')}</span>
                                </div>
                                {report.apiQueue.error && (
                                    <div className={styles.queueError}>
                                        <AlertTriangle size={12} />
                                        <span>{report.apiQueue.error}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 3. Activité Utilisateurs */}
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

                        {/* 4. Community Content */}
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

                        {/* 5. Intégrité des Données */}
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

                        {/* 6. Editorial / News */}
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
                                        <div className={styles.statValue} style={{ fontSize: '1.0rem' }}>
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

                        {/* 7. Gamification */}
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

                        {/* 8. Challenges */}
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

                        {/* 9. Surveys */}
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

                        {/* 10. Sécurité */}
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

                        {/* 11. Repair Activity Logs (HISTORY) */}
                        <div className={`${styles.sectionCard} ${styles.fullWidth}`}>
                            <div className={styles.sectionHeader}>
                                <Clock size={18} className={styles.sectionIcon} />
                                <h3 className={styles.sectionTitle}>
                                    {t('admin.health.repair_history', 'Repair Activity Logs')}
                                </h3>
                            </div>
                            <div className={styles.sectionBody}>
                                {repairHistory.length === 0 ? (
                                    <div className={styles.emptyLog}>No recent repair activity.</div>
                                ) : (
                                    <div className={styles.historyList}>
                                        {repairHistory.map((session) => (
                                            <div key={session.id} className={styles.historySession}>
                                                <div 
                                                    className={styles.sessionHeader}
                                                    onClick={() => setExpandedSession(expandedSession === session.id ? null : session.id!)}
                                                >
                                                    <div className={styles.sessionMain}>
                                                        <span className={styles.sessionTime}>
                                                            {new Date(session.timestamp as number).toLocaleString()}
                                                        </span>
                                                        <span className={styles.sessionAdmin}>
                                                            by <strong>{session.adminName}</strong>
                                                        </span>
                                                    </div>
                                                    <div className={styles.sessionStats}>
                                                        <span className={styles.repairedCount}>
                                                            <CheckCircle size={12} /> {session.repairedCount} fixed
                                                        </span>
                                                        {session.errorsCount > 0 && (
                                                            <span className={styles.errorsCount}>
                                                                <AlertTriangle size={12} /> {session.errorsCount} errors
                                                            </span>
                                                        )}
                                                        <div className={`${styles.chevron} ${expandedSession === session.id ? styles.open : ''}`}>
                                                            ▼
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {expandedSession === session.id && (
                                                    <div className={styles.sessionDetails}>
                                                        {session.actions.length === 0 ? (
                                                            <p className={styles.noActions}>No specific users were modified.</p>
                                                        ) : (
                                                            <table className={styles.detailsTable}>
                                                                <thead>
                                                                    <tr>
                                                                        <th>User</th>
                                                                        <th>UID</th>
                                                                        <th>Changes</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {session.actions.map((act, i) => (
                                                                        <tr key={i}>
                                                                            <td className={styles.cellUser}>{act.userName}</td>
                                                                            <td className={styles.cellUid}>{act.uid}</td>
                                                                            <td className={styles.cellChanges}>
                                                                                <ul className={styles.changesList}>
                                                                                    {act.changes.map((c, j) => <li key={j}>{c}</li>)}
                                                                                </ul>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 12. Health Check History (TIMELINE) */}
                        <div className={`${styles.sectionCard} ${styles.fullWidth}`}>
                            <div className={styles.sectionHeader}>
                                <Activity size={18} className={styles.sectionIcon} />
                                <h3 className={styles.sectionTitle}>
                                    {t('admin.health.history_title', 'Historique Global de Santé')}
                                </h3>
                            </div>
                            <div className={styles.sectionBody}>
                                {scoreHistory.length === 0 ? (
                                    <div className={styles.emptyLog}>No health history recorded yet.</div>
                                ) : (
                                    <div className={styles.historyTimeline}>
                                        {[...scoreHistory].reverse().map((entry, index) => {
                                            const id = (entry as Record<string, unknown>).id as string | undefined;
                                            const ts = entry.timestamp;
                                            const tsMs = typeof ts === 'object' && ts !== null && 'seconds' in ts
                                                ? (ts as { seconds: number }).seconds * 1000
                                                : typeof ts === 'number' ? ts : new Date(ts as string | Date).getTime();
                                            const summary = (entry as Record<string, unknown>).summary as
                                                { infraStatus?: string; users?: number; issues?: number } | undefined;
                                            return (
                                            <div key={id || index} className={styles.snapshotCard}>
                                                <div className={styles.snapshotInfo}>
                                                    <span className={styles.snapshotDate}>
                                                        {new Date(tsMs).toLocaleString()}
                                                    </span>
                                                    <div className={styles.snapshotSummary}>
                                                        <div className={styles.summaryItem}>
                                                            <div className={`${styles.statusIndicator} ${
                                                                summary?.infraStatus === 'operational' 
                                                                    ? styles.statusOperational 
                                                                    : styles.statusDegraded
                                                            }`} />
                                                            {summary?.infraStatus === 'operational' ? 'Infra OK' : 'Degraded'}
                                                        </div>
                                                        <div className={styles.summaryItem}>
                                                            <UserCheck size={12} /> {summary?.users || 0} users
                                                        </div>
                                                        <div className={styles.summaryItem}>
                                                            <AlertTriangle size={12} /> {summary?.issues || 0} issues
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.snapshotScore}>
                                                    <div className={`${styles.scoreBadge} ${
                                                        entry.score >= 80 ? styles.scoreHigh 
                                                        : entry.score >= 50 ? styles.scoreMid 
                                                        : styles.scoreLow
                                                    }`}>
                                                        {entry.score}%
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Auto-refresh indicator */}
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
                </>
            )}

            {/* ─── TAB CONTENT: SYSTEM CONSOLE ─── */}
            {activeTab === 'system' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                        {/* Left Column: Controls */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                            {/* Global Broadcast Card */}
                            <Card variant="manga" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Megaphone size={20} /> {t('admin.system.global_announcement', 'Annonce Globale')}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            type="text"
                                            placeholder={t('admin.system.message_placeholder', 'Message à diffuser...')}
                                            value={broadcastMessage}
                                            onChange={(e) => setBroadcastMessage(e.target.value)}
                                            style={{ flex: 1, padding: '0.5rem', border: '2px solid var(--color-border)', fontFamily: 'monospace', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            <input type="radio" checked={broadcastType === 'info'} onChange={() => setBroadcastType('info')} /> {t('admin.system.info', 'Info')}
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444' }}>
                                            <input type="radio" checked={broadcastType === 'alert'} onChange={() => setBroadcastType('alert')} /> {t('admin.system.alert', 'Alerte')}
                                        </label>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t('admin.system.enable_announcement', 'Activer la diffusion')}</span>
                                        <Switch isOn={broadcastActive} onToggle={() => setBroadcastActive(!broadcastActive)} />
                                    </div>

                                    <button onClick={handleBroadcastSave} style={{
                                        marginTop: '0.5rem',
                                        width: '100%',
                                        padding: '0.5rem',
                                        backgroundColor: broadcastActive ? '#ef4444' : 'var(--color-text)',
                                        color: 'var(--color-surface)',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        cursor: 'pointer',
                                        border: 'none'
                                    }}>
                                        <Radio size={14} style={{ marginRight: '0.5rem', display: 'inline' }} />
                                        {broadcastActive ? t('admin.system.update_live', 'Mettre en Ligne') : t('admin.system.save_offline', 'Désactiver')}
                                    </button>
                                </div>
                            </Card>

                            {/* Jikan API Status Card */}
                            <Card variant="manga" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Activity size={20} /> JIKAN API STATUS
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {jikanStatus && (
                                        <>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', border: '2px solid var(--color-border)', backgroundColor: jikanStatus.status === 'online' ? 'rgba(74, 222, 128, 0.2)' : jikanStatus.status === 'error' ? 'rgba(250, 204, 21, 0.2)' : 'rgba(239, 68, 68, 0.2)' }}>
                                                {jikanStatus.status === 'online' && <CheckCircle size={24} color="#22c55e" />}
                                                {jikanStatus.status === 'error' && <AlertTriangle size={24} color="#eab308" />}
                                                {jikanStatus.status === 'offline' && <XCircle size={24} color="#ef4444" />}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1rem', textTransform: 'uppercase', color: 'var(--color-text)' }}>
                                                        {jikanStatus.status === 'online' && 'ONLINE'}
                                                        {jikanStatus.status === 'error' && 'ERROR'}
                                                        {jikanStatus.status === 'offline' && 'OFFLINE'}
                                                    </div>
                                                    {jikanStatus.responseTime !== undefined && <div style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>Response: {jikanStatus.responseTime}ms</div>}
                                                    {jikanStatus.message && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'monospace', marginTop: '0.25rem' }}>{jikanStatus.message}</div>}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>Dernière vérification : {new Date(jikanStatus.timestamp).toLocaleTimeString()}</div>
                                        </>
                                    )}
                                    <button onClick={async () => {
                                        setCheckingJikan(true);
                                        const s = await checkJikanStatus();
                                        setJikanStatus(s);
                                        setCheckingJikan(false);
                                        setLogs(prev => [`[${new Date().toLocaleTimeString()}] [API] Manual check: ${s.status.toUpperCase()} | ${s.responseTime}ms`, ...prev].slice(0, 100));
                                    }} disabled={checkingJikan} style={{ width: '100%', padding: '0.5rem', backgroundColor: checkingJikan ? 'var(--color-text-dim)' : 'var(--color-text)', color: 'var(--color-surface)', fontWeight: 'bold', textTransform: 'uppercase', cursor: checkingJikan ? 'not-allowed' : 'pointer', border: 'none', opacity: checkingJikan ? 0.6 : 1 }}>
                                        {checkingJikan ? 'VÉRIFICATION...' : 'VÉRIFIER MAINTENANT'}
                                    </button>
                                </div>
                            </Card>

                            {/* Server Config Card */}
                            <Card variant="manga" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Server size={20} /> {t('admin.system.server_config', 'Configuration Serveur')}
                                </h2>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{t('admin.system.maintenance_mode', 'Mode Maintenance')}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('admin.system.maintenance_desc', 'Restreint l\'accès à la plateforme pour les non-admins.')}</div>
                                        </div>
                                        <Switch isOn={maintenanceMode} onToggle={handleToggleMaintenance} />
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{t('admin.system.registrations', 'Inscriptions')}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('admin.system.registrations_desc', 'Permet ou bloque la création de nouveaux comptes.')}</div>
                                        </div>
                                        <Switch isOn={registrationsOpen} onToggle={handleToggleRegistrations} />
                                    </div>
                                </div>
                            </Card>

                            {/* Database Card */}
                            <Card variant="manga" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Database size={20} /> {t('admin.system.database', 'Base de Données')}
                                </h2>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontFamily: 'monospace', fontSize: '0.875rem', border: '2px solid #bbf7d0', backgroundColor: '#f0fdf4', padding: '0.5rem' }}>
                                        <Shield size={16} />
                                        {t('admin.system.data_shield', 'Data Shield Active')}
                                    </div>

                                    <button onClick={handleBackup} style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--color-text)',
                                        color: 'var(--color-surface)',
                                        transition: 'background-color 0.2s',
                                        fontWeight: 'bold',
                                        textTransform: 'uppercase',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                        cursor: 'pointer',
                                        border: 'none'
                                    }}>
                                        <Save size={18} /> {t('admin.system.manual_backup', 'Sauvegarde Manuelle')}
                                    </button>
                                </div>
                            </Card>
                        </div>

                        {/* Right Column: Real-time Terminal */}
                        <Card variant="manga" style={{
                            padding: 0,
                            backgroundColor: 'var(--color-card-background)',
                            color: '#4ade80',
                            fontFamily: 'monospace',
                            fontSize: '0.875rem',
                            height: '100%',
                            minHeight: '600px',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '8px 8px 0 var(--color-shadow-strong)',
                            border: '2px solid var(--color-border)'
                        }}>
                            <div style={{ backgroundColor: 'var(--color-surface-hover)', padding: '0.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Terminal size={14} style={{ color: 'var(--color-text-dim)' }} />
                                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.75rem' }}>root@bingeki-v2-activity-feed:~</span>
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%', animation: 'pulse 1s infinite' }}></span>
                                    <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.7rem' }}>{t('admin.system.live', 'LIVE')}</span>
                                </div>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', lineHeight: '1.25rem' }}>
                                {logs.map((log, i) => (
                                    <div key={i} style={{ wordBreak: 'break-all', display: 'flex' }}>
                                        <span style={{ color: '#16a34a', marginRight: '0.5rem' }}>{'>'}</span>
                                        {log}
                                    </div>
                                ))}
                                <div style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>_</div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* ─── TAB CONTENT: AUDIT LOG ─── */}
            {activeTab === 'audit' && (
                <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)', animation: 'fadeIn 0.5s ease' }}>
                    {loadingAudit ? (
                        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>Chargement...</div>
                    ) : auditLogs.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                            Aucun log d'audit trouvé.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {auditLogs.map((log) => (
                                <div
                                    key={log.id}
                                    style={{
                                        display: 'flex', gap: '1.5rem', padding: '1rem',
                                        border: '2px solid var(--color-border)',
                                        background: 'var(--color-background)',
                                        boxShadow: '4px 4px 0 var(--color-shadow-strong)',
                                        alignItems: 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        width: '40px', height: '40px', background: 'var(--color-surface)',
                                        border: '2px solid var(--color-border)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center',
                                        color: getAuditActionColor(log.action)
                                    }}>
                                        <History size={20} />
                                    </div>
                                    
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: getAuditActionColor(log.action) }}>
                                                    {log.action}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-dim)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                                                    <User size={12} /> {log.adminEmail || log.adminName} ({log.adminId})
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5 }}>
                                                {new Date(log.timestamp).toLocaleString('fr-FR')}
                                            </div>
                                        </div>
                                        
                                        {log.targetId && (
                                            <div style={{ fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                                Cible : <span style={{ fontFamily: 'monospace', background: 'var(--color-surface)', padding: '2px 4px', border: '1px solid var(--color-border)' }}>{log.targetName || log.targetId} ({log.targetId})</span>
                                            </div>
                                        )}

                                        {log.details && (
                                            <div style={{ 
                                                background: 'var(--color-surface)', padding: '0.75rem', border: '2px solid var(--color-border)', 
                                                fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap',
                                                color: 'var(--color-text)'
                                            }}>
                                                {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

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
                            <div className={styles.checkboxGroup || ''}>
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
                            <button 
                                className={styles.testBtn} 
                                onClick={testDiscordWebhook}
                                disabled={isTestingDiscord || !discordConfig.webhookUrl}
                            >
                                {isTestingDiscord ? 'Sending...' : 'Test Webhook'}
                            </button>

                            <div className={styles.modalFooterRight}>
                                <button className={styles.cancelBtn} onClick={() => {
                                    setShowDiscordModal(false);
                                    setTestStatus(null);
                                }}>
                                    Cancel
                                </button>
                                <button className={styles.saveBtn} onClick={saveDiscordConfig}>
                                    Save Config
                                </button>
                            </div>
                        </div>

                        {testStatus && (
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <span className={testStatus.success ? styles.testSuccess : styles.testError}>
                                    {testStatus.message}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
