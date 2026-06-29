import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Copy, Check, Eye, Code, CheckCircle2, Circle, Calendar, GitBranch } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import type { OrgaTask } from '@/types/orga';
import { getMemberColor, TASK_STATUSES } from '@/types/orga';
import type { UserProfile } from '@/firebase/users';
import styles from './Orga.module.css';

interface SprintReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    reportMarkdown: string;
    sprint: { name: string; objectif: string; startDate: any; endDate: any } | null;
    tasks: OrgaTask[];
    members: UserProfile[];
}

export function SprintReportModal({
    isOpen,
    onClose,
    reportMarkdown,
    sprint,
    tasks,
    members
}: SprintReportModalProps) {
    const { addToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'visual' | 'markdown'>('visual');

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(reportMarkdown);
            setCopied(true);
            addToast('Rapport copié !', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            addToast('Erreur lors de la copie', 'error');
        }
    };

    // Group tasks by members
    const memberTasksMap = useMemo(() => {
        const map: Record<string, { name: string; color: string; done: OrgaTask[]; pending: OrgaTask[] }> = {};
        
        // Initialize map with all current members
        members.forEach(m => {
            map[m.uid] = {
                name: m.displayName || m.uid.slice(0, 6),
                color: getMemberColor(m.uid),
                done: [],
                pending: []
            };
        });

        // Group tasks
        tasks.forEach(t => {
            const assigneeId = t.assigneeUid;
            if (!map[assigneeId]) {
                map[assigneeId] = {
                    name: t.assigneeName || assigneeId.slice(0, 6),
                    color: getMemberColor(assigneeId),
                    done: [],
                    pending: []
                };
            }
            if (t.status === 'done') {
                map[assigneeId].done.push(t);
            } else {
                map[assigneeId].pending.push(t);
            }
        });

        // Keep only members that have tasks in this sprint
        return Object.values(map).filter(item => item.done.length > 0 || item.pending.length > 0);
    }, [tasks, members]);

    const startStr = sprint?.startDate
        ? new Date(sprint.startDate.seconds * 1000).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
          })
        : '';
    const endStr = sprint?.endDate
        ? new Date(sprint.endDate.seconds * 1000).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric'
          })
        : '';

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Bilan : ${sprint?.name || ''}`}
            variant="manga"
            maxWidth="600px"
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                
                {/* Sprint info card */}
                {sprint && (
                    <div style={{
                        border: '2px solid #000',
                        background: '#fcfcfc',
                        padding: '0.75rem 1rem',
                        position: 'relative'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Calendar size={12} />
                            Du {startStr} au {endStr}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#1a1a1a', fontWeight: 'bold' }}>
                            🎯 Objectif : {sprint.objectif || 'Aucun objectif défini'}
                        </div>
                    </div>
                )}

                {/* Sub-tab switcher */}
                <div style={{ display: 'flex', gap: '0.35rem', borderBottom: '2px solid #000', paddingBottom: '0.35rem' }}>
                    <button
                        type="button"
                        className={`${styles.tabButton} ${activeTab === 'visual' ? styles.tabButtonActive : ''}`}
                        onClick={() => setActiveTab('visual')}
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', boxShadow: '2px 2px 0 #000' }}
                    >
                        <Eye size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle', marginTop: -2 }} />
                        Aperçu Visuel
                    </button>
                    <button
                        type="button"
                        className={`${styles.tabButton} ${activeTab === 'markdown' ? styles.tabButtonActive : ''}`}
                        onClick={() => setActiveTab('markdown')}
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', boxShadow: '2px 2px 0 #000' }}
                    >
                        <Code size={12} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle', marginTop: -2 }} />
                        Code Markdown
                    </button>
                </div>

                {activeTab === 'visual' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                        {memberTasksMap.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', fontStyle: 'italic', color: '#666' }}>
                                Aucune tâche enregistrée dans ce sprint.
                            </div>
                        ) : (
                            memberTasksMap.map(item => {
                                const total = item.done.length + item.pending.length;
                                const done = item.done.length;
                                const percent = total > 0 ? Math.round((done / total) * 100) : 0;

                                return (
                                    <div key={item.name} style={{
                                        border: '3px solid #000',
                                        boxShadow: '4px 4px 0 #000',
                                        background: '#fff',
                                        padding: '0.85rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.6rem'
                                    }}>
                                        {/* Member row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '0.3rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                                                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            <span style={{
                                                fontFamily: 'var(--font-heading)',
                                                fontWeight: 900,
                                                fontSize: '0.7rem',
                                                border: '2px solid #000',
                                                padding: '0.05rem 0.35rem',
                                                background: percent === 100 ? '#22c55e' : '#fff',
                                                color: percent === 100 ? '#fff' : '#000'
                                            }}>
                                                {done}/{total} ({percent}%)
                                            </span>
                                        </div>

                                        {/* Sub-list of tasks */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                            {item.done.map(t => {
                                                const link = t.gitLink ? (t.gitLink.startsWith('http') ? t.gitLink : `https://github.com/Moussandou/Bingeki-V2/tree/${t.gitLink}`) : null;
                                                return (
                                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#777' }}>
                                                        <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0 }} />
                                                        <span style={{ textDecoration: 'line-through' }}>{t.title}</span>
                                                        {link && (
                                                            <a
                                                                href={link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                style={{ display: 'inline-flex', alignItems: 'center', color: '#666', background: '#fafafa', border: '1px solid #000', padding: '0.02rem 0.2rem', textDecoration: 'none', marginLeft: 'auto' }}
                                                            >
                                                                <GitBranch size={10} />
                                                            </a>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {item.pending.map(t => {
                                                const statusLabel = TASK_STATUSES.find(s => s.key === t.status)?.label || t.status;
                                                const link = t.gitLink ? (t.gitLink.startsWith('http') ? t.gitLink : `https://github.com/Moussandou/Bingeki-V2/tree/${t.gitLink}`) : null;
                                                return (
                                                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: '#1a1a1a' }}>
                                                        <Circle size={13} color="#000" style={{ flexShrink: 0 }} />
                                                        <span>{t.title}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                                                            {link && (
                                                                <a
                                                                    href={link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    style={{ display: 'inline-flex', alignItems: 'center', color: '#1a1a1a', background: '#fff', border: '1px solid #000', padding: '0.02rem 0.2rem', textDecoration: 'none' }}
                                                                >
                                                                    <GitBranch size={10} />
                                                                </a>
                                                            )}
                                                            <span style={{
                                                                fontSize: '0.6rem',
                                                                padding: '0.02rem 0.25rem',
                                                                border: '1px solid #000',
                                                                background: '#fafafa',
                                                                fontWeight: 600,
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {statusLabel}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div style={{ position: 'relative' }}>
                        <textarea
                            readOnly
                            value={reportMarkdown}
                            className={styles.formTextarea}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                minHeight: '260px',
                                width: '100%',
                                background: '#fafafa',
                                color: '#1a1a1a',
                                border: '2px solid #000',
                                padding: '1rem',
                                resize: 'none'
                            }}
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={`${styles.btnManga} ${styles.btnPrimary} ${styles.btnSmall}`}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                zIndex: 10
                            }}
                        >
                            {copied ? <Check size={14} /> : <Copy size={14} />}
                            {copied ? 'Copié !' : 'Copier'}
                        </button>
                    </div>
                )}

                <div className={styles.formActions}>
                    <button
                        type="button"
                        className={`${styles.btnManga} ${styles.btnSecondary}`}
                        onClick={onClose}
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </Modal>
    );
}
