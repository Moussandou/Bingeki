import { useState, useCallback, useMemo } from 'react';
import { Plus, Zap, Users, FileText, Calendar } from 'lucide-react';
import { useOrga } from '@/hooks/useOrga';
import type { OrgaTask, TaskStatus } from '@/types/orga';
import { TASK_STATUSES } from '@/types/orga';
import { SprintHeader } from './SprintHeader';
import { KanbanBoard } from './KanbanBoard';
import { TaskModal } from './TaskModal';
import { SprintModal } from './SprintModal';
import { MemberFilter } from './MemberFilter';
import { WhoDoesWhat } from './WhoDoesWhat';
import { SprintReportModal } from './SprintReportModal';
import { RepoStats } from './RepoStats';
import styles from './Orga.module.css';

export default function OrgaPage() {
    const orga = useOrga();

    const memberNames = useMemo(() => {
        const map: Record<string, string> = {};
        orga.members.forEach(m => {
            map[m.uid] = m.displayName || m.uid.slice(0, 6);
        });
        return map;
    }, [orga.members]);

    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [sprintModalOpen, setSprintModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<OrgaTask | null>(null);
    const [editSprint, setEditSprint] = useState(false);

    const [activeTab, setActiveTab] = useState<'board' | 'history' | 'repo'>('board');
    const [sprintsList, setSprintsList] = useState<any[]>([]);
    const [sprintsLoading, setSprintsLoading] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportMarkdown, setReportMarkdown] = useState('');
    const [selectedSprint, setSelectedSprint] = useState<any | null>(null);
    const [selectedSprintTasks, setSelectedSprintTasks] = useState<OrgaTask[]>([]);

    const loadHistory = useCallback(async () => {
        setSprintsLoading(true);
        try {
            const list = await orga.getAllSprints();
            setSprintsList(list);
        } finally {
            setSprintsLoading(false);
        }
    }, [orga]);

    const handleTabChange = useCallback((tab: 'board' | 'history' | 'repo') => {
        setActiveTab(tab);
        if (tab === 'history') {
            loadHistory();
        }
    }, [loadHistory]);

    const handleGenerateReport = useCallback(async (sprint: any) => {
        try {
            const tasks = await orga.getTasksForSprint(sprint.id);
            const startStr = new Date(sprint.startDate.seconds * 1000).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric'
            });
            const endStr = new Date(sprint.endDate.seconds * 1000).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'long', year: 'numeric'
            });

            const groupedTasks: Record<string, OrgaTask[]> = {};
            tasks.forEach(t => {
                const name = memberNames[t.assigneeUid] || t.assigneeName;
                if (!groupedTasks[name]) groupedTasks[name] = [];
                groupedTasks[name].push(t);
            });

            let markdown = `# BILAN DE SPRINT : ${sprint.name.toUpperCase()}\n`;
            markdown += `**Objectif** : ${sprint.objectif}\n`;
            markdown += `**Période** : du ${startStr} au ${endStr}\n\n`;
            markdown += `---\n\n`;

            const memberKeys = Object.keys(groupedTasks);
            if (memberKeys.length === 0) {
                markdown += `*Aucune tâche enregistrée dans ce sprint.*\n`;
            } else {
                memberKeys.forEach(name => {
                    markdown += `### 👤 ${name.toUpperCase()}\n`;
                    const memberTasks = groupedTasks[name];
                    const doneTasks = memberTasks.filter(t => t.status === 'done');
                    const otherTasks = memberTasks.filter(t => t.status !== 'done');

                    if (doneTasks.length > 0) {
                        markdown += `#### ✅ Tâches terminées :\n`;
                        doneTasks.forEach(t => {
                            const link = t.gitLink ? (t.gitLink.startsWith('http') ? t.gitLink : `https://github.com/Moussandou/Bingeki-V2/tree/${t.gitLink}`) : null;
                            if (link) {
                                markdown += `- [${t.title}](${link})\n`;
                            } else {
                                markdown += `- ${t.title}\n`;
                            }
                        });
                    }

                    if (otherTasks.length > 0) {
                        markdown += `#### ⏳ Tâches restantes / En cours :\n`;
                        otherTasks.forEach(t => {
                            const statusLabel = TASK_STATUSES.find(s => s.key === t.status)?.label || t.status;
                            const link = t.gitLink ? (t.gitLink.startsWith('http') ? t.gitLink : `https://github.com/Moussandou/Bingeki-V2/tree/${t.gitLink}`) : null;
                            if (link) {
                                markdown += `- [${t.title}](${link}) *(${statusLabel})*\n`;
                            } else {
                                markdown += `- ${t.title} *(${statusLabel})*\n`;
                            }
                        });
                    }
                    markdown += `\n`;
                });
            }

            setReportMarkdown(markdown);
            setSelectedSprint(sprint);
            setSelectedSprintTasks(tasks);
            setReportModalOpen(true);
        } catch (err) {
            console.error('Error generating report:', err);
        }
    }, [orga, memberNames]);

    const handleTaskClick = useCallback((task: OrgaTask) => {
        setEditingTask(task);
        setTaskModalOpen(true);
    }, []);

    const handleNewTask = useCallback(() => {
        setEditingTask(null);
        setTaskModalOpen(true);
    }, []);

    const handleEditSprint = useCallback(() => {
        setEditSprint(true);
        setSprintModalOpen(true);
    }, []);

    const handleNewSprint = useCallback(() => {
        setEditSprint(false);
        setSprintModalOpen(true);
    }, []);

    const handleStatusChange = useCallback((taskId: string, newStatus: TaskStatus) => {
        orga.updateTask(taskId, { status: newStatus });
    }, [orga]);

    if (orga.loading) {
        return (
            <div className={styles.orgaContainer}>
                <div className={styles.orgaContent}>
                    <div className={styles.emptyState}>
                        <div className={styles.emptyTitle}>Chargement...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.orgaContainer}>
            <div className={styles.tabsContainer}>
                <button
                    className={`${styles.tabButton} ${activeTab === 'board' ? styles.tabButtonActive : ''}`}
                    onClick={() => handleTabChange('board')}
                >
                    Sprint Actif
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'history' ? styles.tabButtonActive : ''}`}
                    onClick={() => handleTabChange('history')}
                >
                    Historique & Rapports
                </button>
                <button
                    className={`${styles.tabButton} ${activeTab === 'repo' ? styles.tabButtonActive : ''}`}
                    onClick={() => handleTabChange('repo')}
                >
                    💻 Repo Git
                </button>
            </div>

            {activeTab === 'board' && (
                <div className={styles.orgaContent}>
                    {/* Sprint Header or Empty State */}
                    {orga.sprint ? (
                        <SprintHeader
                            sprint={orga.sprint}
                            stats={orga.stats}
                            isSuperAdmin={orga.isSuperAdmin}
                            onEdit={handleEditSprint}
                        />
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyTitle}>Aucun sprint actif</div>
                            <p className={styles.emptyText}>
                                Crée un sprint pour commencer à organiser le travail de l'équipe.
                            </p>
                            {orga.isSuperAdmin && (
                                <button
                                    className={`${styles.btnManga} ${styles.btnPrimary}`}
                                    onClick={handleNewSprint}
                                >
                                    <Zap size={16} />
                                    Créer un sprint
                                </button>
                            )}
                        </div>
                    )}

                    {/* Actions Bar */}
                    {orga.sprint && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                            <MemberFilter
                                members={orga.members}
                                activeFilter={orga.filter}
                                onFilter={orga.setFilter}
                            />
                            <button
                                className={`${styles.btnManga} ${styles.btnPrimary}`}
                                onClick={handleNewTask}
                            >
                                <Plus size={16} />
                                Nouvelle tâche
                            </button>
                        </div>
                    )}

                    {/* Kanban Board */}
                    {orga.sprint && (
                        <KanbanBoard
                            tasks={orga.tasks}
                            canMoveTask={orga.canMoveTask}
                            onStatusChange={handleStatusChange}
                            onTaskClick={handleTaskClick}
                            memberNames={memberNames}
                        />
                    )}

                    {/* Who Does What */}
                    {orga.members.length > 0 && (
                        <div>
                            <h2 className={styles.sectionTitle}>
                                <Users size={18} />
                                Qui fait quoi
                            </h2>
                            <div style={{ marginTop: 'var(--space-md)' }}>
                                <WhoDoesWhat
                                    members={orga.members}
                                    tasks={orga.allTasks}
                                    isSuperAdmin={orga.isSuperAdmin}
                                    onUpdateRole={orga.updateMemberRole}
                                    onUpdateName={orga.updateMemberName}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'history' && (
                <div className={styles.orgaContent}>
                    <div className={styles.historyList}>
                        {sprintsLoading ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyTitle}>Chargement de l'historique...</div>
                            </div>
                        ) : sprintsList.length === 0 ? (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyTitle}>Aucun historique de sprint</div>
                                <p className={styles.emptyText}>
                                    Les sprints créés apparaîtront ici une fois enregistrés.
                                </p>
                            </div>
                        ) : (
                            sprintsList.map(s => {
                                const startStr = new Date(s.startDate.seconds * 1000).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'short'
                                });
                                const endStr = new Date(s.endDate.seconds * 1000).toLocaleDateString('fr-FR', {
                                    day: '2-digit', month: 'short'
                                });
                                return (
                                    <div key={s.id} className={styles.historyCard}>
                                        <div className={styles.historyInfo}>
                                            <div className={styles.historyTitle}>
                                                <span>{s.name}</span>
                                                <span className={`${styles.historyStatusBadge} ${s.isActive ? styles.statusActive : styles.statusClosed}`}>
                                                    {s.isActive ? 'Actif' : 'Clôturé'}
                                                </span>
                                            </div>
                                            <div className={styles.historyGoal}>{s.objectif}</div>
                                            <div className={styles.historyMeta}>
                                                <span>
                                                    <Calendar size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4, marginTop: -2 }} />
                                                    {startStr} — {endStr}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className={`${styles.btnManga} ${styles.btnPrimary} ${styles.btnSmall}`}
                                            onClick={() => handleGenerateReport(s)}
                                        >
                                            <FileText size={14} />
                                            Bilan du sprint
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'repo' && (
                <div className={styles.orgaContent}>
                    <RepoStats />
                </div>
            )}

            {/* Modals */}
            {orga.sprint && (
                <TaskModal
                    isOpen={taskModalOpen}
                    onClose={() => setTaskModalOpen(false)}
                    task={editingTask}
                    members={orga.members}
                    sprintId={orga.sprint.id}
                    isSuperAdmin={orga.isSuperAdmin}
                    onCreate={orga.createTask}
                    onUpdate={orga.updateTask}
                    onDelete={orga.deleteTask}
                />
            )}

            <SprintModal
                isOpen={sprintModalOpen}
                onClose={() => setSprintModalOpen(false)}
                sprint={editSprint ? orga.sprint : null}
                onCreate={orga.createSprint}
                onUpdate={orga.updateSprint}
                onCloseSprint={orga.closeSprint}
                getLastSprint={orga.getLastSprint}
            />

            <SprintReportModal
                isOpen={reportModalOpen}
                onClose={() => {
                    setReportModalOpen(false);
                    setSelectedSprint(null);
                    setSelectedSprintTasks([]);
                }}
                reportMarkdown={reportMarkdown}
                sprint={selectedSprint}
                tasks={selectedSprintTasks}
                members={orga.members}
            />
        </div>
    );
}
