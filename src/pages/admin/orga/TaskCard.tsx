import { useMemo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { OrgaTask } from '@/types/orga';
import { TASK_PRIORITIES, getMemberColor } from '@/types/orga';
import { Paperclip, GitBranch } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import styles from './Orga.module.css';

interface TaskCardProps {
    task: OrgaTask;
    canDrag: boolean;
    onClick: () => void;
    assigneeName?: string;
}

export function TaskCard({ task, canDrag, onClick, assigneeName }: TaskCardProps) {
    const { userProfile } = useAuthStore();
    const currentName = userProfile?.displayName;

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: task.id,
        disabled: !canDrag,
        data: { task },
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const priority = TASK_PRIORITIES.find(p => p.key === task.priority);
    const displayName = assigneeName || task.assigneeName;
    const memberColor = getMemberColor(displayName);
    const isDone = task.status === 'done';

    // Compute if current user is mentioned in title or description
    const isMentioned = useMemo(() => {
        if (!currentName) return false;
        const mentionTag = `@${currentName.toLowerCase()}`;
        const inTitle = task.title.toLowerCase().includes(mentionTag);
        const inDesc = task.description?.toLowerCase().includes(mentionTag) || false;
        return inTitle || inDesc;
    }, [task.title, task.description, currentName]);

    const deadlineStr = task.deadline
        ? new Date(task.deadline.seconds * 1000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        : null;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`${styles.taskCard} ${isDragging ? styles.taskCardDragging : ''} ${isDone ? styles.taskCardDone : ''} ${isMentioned ? styles.taskCardMentioned : ''}`}
            onClick={onClick}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <div className={styles.taskTitle} style={{ margin: 0, flex: 1 }}>{task.title}</div>
                {isMentioned && (
                    <span style={{
                        fontSize: '0.55rem',
                        fontWeight: 900,
                        background: '#FF2E63',
                        color: '#fff',
                        padding: '0.05rem 0.25rem',
                        border: '1px solid #000',
                        boxShadow: '1px 1px 0 #000',
                        display: 'inline-flex',
                        alignItems: 'center',
                        textTransform: 'uppercase',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                        marginTop: '2px'
                    }} title="Vous êtes mentionné dans cette tâche">
                        ⚡ Ment.
                    </span>
                )}
            </div>
            <div className={styles.taskMeta}>
                {priority && (
                    <span
                        className={styles.priorityBadge}
                        style={{ background: priority.color }}
                    >
                        {priority.label}
                    </span>
                )}
                <span className={styles.assigneePill}>
                    <span className={styles.assigneeDot} style={{ background: memberColor }} />
                    {displayName}
                </span>
                {task.attachments && task.attachments.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.65rem', color: '#888' }} title={`${task.attachments.length} images`}>
                        <Paperclip size={10} />
                        {task.attachments.length}
                    </span>
                )}
                {task.gitLink && (
                    <a
                        href={task.gitLink.startsWith('http') ? task.gitLink : `https://github.com/Moussandou/Bingeki-V2/tree/${task.gitLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                            e.stopPropagation();
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.65rem', color: '#000', background: '#fff', border: '1px solid #000', padding: '0.05rem 0.25rem', textTransform: 'none', cursor: 'pointer' }}
                        title="Voir la branche / PR GitHub"
                    >
                        <GitBranch size={10} />
                        Git
                    </a>
                )}
                {deadlineStr && (
                    <span className={styles.taskDeadline}>{deadlineStr}</span>
                )}
            </div>
        </div>
    );
}
