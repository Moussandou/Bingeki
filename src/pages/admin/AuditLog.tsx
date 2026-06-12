import { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, History, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { getAuditLogs, type AuditLogEntry } from '@/firebase/firestore';
import { logger } from '@/utils/logger';

export default function AuditLog() {
    const [logs, setLogs] = useState<AuditLogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getAuditLogs(50);
            setLogs(data);
        } catch (e) {
            logger.error('Failed to fetch audit logs:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const getActionColor = (action: string) => {
        if (action.includes('delete') || action.includes('ban')) return '#ef4444';
        if (action.includes('update') || action.includes('edit')) return '#3b82f6';
        if (action.includes('create') || action.includes('add')) return '#10b981';
        return '#8b5cf6';
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ShieldAlert size={32} />
                    <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', textTransform: 'uppercase', margin: 0 }}>
                        Audit Log
                    </h1>
                </div>
                <button
                    onClick={fetchLogs}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 1rem', background: 'var(--color-surface)',
                        border: '2px solid var(--color-border)', cursor: 'pointer',
                        fontWeight: 900, textTransform: 'uppercase'
                    }}
                >
                    <RefreshCw size={16} className={loading ? 'spin' : ''} />
                    Rafraîchir
                </button>
            </div>

            <Card variant="manga" style={{ padding: '1.5rem', background: 'var(--color-surface)' }}>
                {loading ? (
                    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>Chargement...</div>
                ) : logs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-dim)' }}>
                        Aucun log d'audit trouvé.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {logs.map((log) => (
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
                                    color: getActionColor(log.action)
                                }}>
                                    <History size={20} />
                                </div>
                                
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase', color: getActionColor(log.action) }}>
                                                {log.action}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-dim)', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                                                <User size={12} /> {log.adminEmail} ({log.adminId})
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 900, opacity: 0.5 }}>
                                            {new Date(log.timestamp).toLocaleString('fr-FR')}
                                        </div>
                                    </div>
                                    
                                    {log.details && (
                                        <div style={{ 
                                            background: '#f8f9fa', padding: '0.75rem', border: '1px solid #e5e7eb', 
                                            fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'pre-wrap',
                                            color: '#374151'
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
        </div>
    );
}
