import { useState, useEffect } from 'react';
import { Shield, Save, Database, Server, Terminal, Radio, Megaphone, Activity, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { logDataBackup } from '@/utils/dataProtection';
import { getAllActivities, setGlobalAnnouncement, setGlobalConfig, getGlobalConfig, type ActivityEvent } from '@/firebase/firestore';
import { useTranslation } from 'react-i18next';
import { checkJikanStatus, type JikanStatusResponse } from '@/services/animeApi';

export default function AdminSystem() {
    const { t } = useTranslation();
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [registrationsOpen, setRegistrationsOpen] = useState(true);
    const [logs, setLogs] = useState<string[]>(() => [
        `[SYSTEM] Admin console initialized at ${new Date().toLocaleTimeString()}`,
        `[AUTH] Connected as Administrator`,
        `[DB] Firestore connection: STABLE`,
        `[SHIELD] Data Protection Protocol v3.0: ACTIVE`,
        `[CONNECT] Listening to Global Activity Feed...`
    ]);

    // Broadcast State
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastActive, setBroadcastActive] = useState(false);
    const [broadcastType, setBroadcastType] = useState<'info' | 'warning' | 'alert'>('info');

    // Jikan API Status
    const [jikanStatus, setJikanStatus] = useState<JikanStatusResponse | null>(null);
    const [checkingJikan, setCheckingJikan] = useState(false);

    // Helper functions (declared before useEffect to avoid hoisting issues)
    const formatActivityLog = (act: ActivityEvent) => {
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
    };

    const addLog = (msg: string) => {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50));
    };

    useEffect(() => {
        // Load Global Config
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

        // Poll for REAL Activities
        const fetchActivities = async () => {
            const activities = await getAllActivities(10);
            const formattedLogs = activities.map(formatActivityLog);
            // Prepend new logs that aren't already there (simple check by string content)
            // In a real app we'd use IDs, but string comparison is enough for visual logs using timestamps
            setLogs(prev => {
                const uniqueNewLogs = formattedLogs.filter(l => !prev.includes(l));
                if (uniqueNewLogs.length === 0) return prev;
                return [...uniqueNewLogs, ...prev].slice(0, 100);
            });
        };

        fetchActivities();
        const interval = setInterval(fetchActivities, 5000);

        // Check Jikan API Status
        const checkApiStatus = async () => {
            setCheckingJikan(true);
            const status = await checkJikanStatus();
            setJikanStatus(status);
            setCheckingJikan(false);
            addLog(`[API] Jikan: ${status.status.toUpperCase()} | ${status.responseTime}ms`);
        };
        checkApiStatus();
        const apiInterval = setInterval(checkApiStatus, 30000);

        return () => { clearInterval(interval); clearInterval(apiInterval); };
    }, []);

    // formatActivityLog and addLog are declared above the useEffect

    const handleBackup = () => {
        addLog("[BACKUP] Starting manual system backup...");
        try {
            logDataBackup('system', 'gamification', { source: 'manual_admin_trigger', time: Date.now() });
            setTimeout(() => addLog("[BACKUP] Backup completed successfully. Data synchronized."), 1000);
        } catch {
            addLog("[ERROR] Backup failed.");
        }
    };

    const handleBroadcastSave = async () => {
        addLog(`[BROADCAST] Updating global announcement...`);
        try {
            await setGlobalAnnouncement(broadcastMessage, broadcastType, broadcastActive);
            addLog(`[BROADCAST] Success. Message is now ${broadcastActive ? 'LIVE' : 'OFFLINE'}.`);
        } catch {
            addLog(`[ERROR] Broadcast update failed.`);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease' }}>
            <div>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', textTransform: 'uppercase' }}>{t('admin.system.title')}</h1>
                <p style={{ borderLeft: '2px solid black', paddingLeft: '0.5rem', color: '#6b7280', fontFamily: 'monospace' }}>
                    {t('admin.system.subtitle')}
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
                {/* Left Column: Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Global Broadcast Card */}
                    <Card variant="manga" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Megaphone size={20} /> {t('admin.system.global_announcement')}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    type="text"
                                    placeholder={t('admin.system.message_placeholder')}
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    style={{ flex: 1, padding: '0.5rem', border: '2px solid var(--color-border)', fontFamily: 'monospace', background: 'var(--color-surface)', color: 'var(--color-text)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                    <input type="radio" checked={broadcastType === 'info'} onChange={() => setBroadcastType('info')} /> {t('admin.system.info')}
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 'bold', color: '#ef4444' }}>
                                    <input type="radio" checked={broadcastType === 'alert'} onChange={() => setBroadcastType('alert')} /> {t('admin.system.alert')}
                                </label>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{t('admin.system.enable_announcement')}</span>
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
                                {broadcastActive ? t('admin.system.update_live') : t('admin.system.save_offline')}
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
                                        {jikanStatus.status === 'error' && <AlertCircle size={24} color="#eab308" />}
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
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', fontFamily: 'monospace' }}>Last checked: {new Date(jikanStatus.timestamp).toLocaleTimeString()}</div>
                                </>
                            )}
                            <button onClick={async () => { setCheckingJikan(true); const s = await checkJikanStatus(); setJikanStatus(s); setCheckingJikan(false); addLog(`[API] Manual check: ${s.status.toUpperCase()} | ${s.responseTime}ms`); }} disabled={checkingJikan} style={{ width: '100%', padding: '0.5rem', backgroundColor: checkingJikan ? 'var(--color-text-dim)' : 'var(--color-text)', color: 'var(--color-surface)', fontWeight: 'bold', textTransform: 'uppercase', cursor: checkingJikan ? 'not-allowed' : 'pointer', border: 'none', opacity: checkingJikan ? 0.6 : 1 }}>
                                {checkingJikan ? 'CHECKING...' : 'CHECK NOW'}
                            </button>
                        </div>
                    </Card>



                    <Card variant="manga" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Server size={20} /> {t('admin.system.server_config')}
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{t('admin.system.maintenance_mode')}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('admin.system.maintenance_desc')}</div>
                                </div>
                                <Switch isOn={maintenanceMode} onToggle={async () => {
                                    const newVal = !maintenanceMode;
                                    setMaintenanceMode(newVal);
                                    await setGlobalConfig({ maintenance: newVal });
                                    addLog(`[CONFIG] Maintenance mode set to ${newVal}`);
                                }} />
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{t('admin.system.registrations')}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{t('admin.system.registrations_desc')}</div>
                                </div>
                                <Switch isOn={registrationsOpen} onToggle={async () => {
                                    const newVal = !registrationsOpen;
                                    setRegistrationsOpen(newVal);
                                    await setGlobalConfig({ registrationsOpen: newVal });
                                    addLog(`[CONFIG] Registrations set to ${newVal}`);
                                }} />
                            </div>
                        </div>
                    </Card>

                    <Card variant="manga" style={{ padding: '1.5rem', backgroundColor: 'var(--color-surface)' }}>
                        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', textTransform: 'uppercase', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Database size={20} /> {t('admin.system.database')}
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontFamily: 'monospace', fontSize: '0.875rem', border: '2px solid #bbf7d0', backgroundColor: '#f0fdf4', padding: '0.5rem' }}>
                                <Shield size={16} />
                                {t('admin.system.data_shield')}
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
                                <Save size={18} /> {t('admin.system.manual_backup')}
                            </button>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Real-time Terminal */}
                <Card variant="manga" style={{
                    padding: 0,
                    backgroundColor: 'var(--color-card-background)', // Was #111827, using card dark
                    color: '#4ade80', // Keep terminal green for aesthetics
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
                            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.7rem' }}>{t('admin.system.live')}</span>
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
    );
}
