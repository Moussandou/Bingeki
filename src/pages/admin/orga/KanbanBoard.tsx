import { useCallback } from 'react';
import {
    DndContext,
    closestCorners,
    DragOverlay,
    type DragEndEvent,
    type DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useState } from 'react';
import type { OrgaTask, TaskStatus } from '@/types/orga';
import { TASK_STATUSES } from '@/types/orga';
import { TaskCard } from './TaskCard';
import styles from './Orga.module.css';

interface KanbanBoardProps {
    tasks: OrgaTask[];
    canMoveTask: (task: OrgaTask) => boolean;
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onTaskClick: (task: OrgaTask) => void;
    memberNames: Record<string, string>;
}

function DroppableColumn({
    status,
    tasks,
    canMoveTask,
    onTaskClick,
    memberNames,
}: {
    status: { key: TaskStatus; label: string };
    tasks: OrgaTask[];
    canMoveTask: (task: OrgaTask) => boolean;
    onTaskClick: (task: OrgaTask) => void;
    memberNames: Record<string, string>;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: status.key });

    return (
        <div className={styles.kanbanColumn}>
            <div className={styles.columnHeader}>
                <span>{status.label}</span>
                <span className={styles.columnCount}>{tasks.length}</span>
            </div>
            <div
                ref={setNodeRef}
                className={`${styles.columnDropZone} ${isOver ? styles.columnDropZoneOver : ''}`}
            >
                <SortableContext
                    items={tasks.map(t => t.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            canDrag={canMoveTask(task)}
                            onClick={() => onTaskClick(task)}
                            assigneeName={memberNames[task.assigneeUid]}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

export function KanbanBoard({ tasks, canMoveTask, onStatusChange, onTaskClick, memberNames }: KanbanBoardProps) {
    const [activeTask, setActiveTask] = useState<OrgaTask | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        })
    );

    const getTasksByStatus = useCallback((status: TaskStatus) => {
        return tasks.filter(t => t.status === status);
    }, [tasks]);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id);
        if (task) setActiveTask(task);
    }, [tasks]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveTask(null);
        const { active, over } = event;
        if (!over) return;

        const taskId = active.id as string;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Dropped onto a column
        const targetStatus = over.id as TaskStatus;
        if (TASK_STATUSES.some(s => s.key === targetStatus) && task.status !== targetStatus) {
            onStatusChange(taskId, targetStatus);
            return;
        }

        // Dropped onto another task's column
        const targetTask = tasks.find(t => t.id === over.id);
        if (targetTask && task.status !== targetTask.status) {
            onStatusChange(taskId, targetTask.status);
        }
    }, [tasks, onStatusChange]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className={styles.kanbanBoard}>
                {TASK_STATUSES.map(status => (
                    <DroppableColumn
                        key={status.key}
                        status={status}
                        tasks={getTasksByStatus(status.key)}
                        canMoveTask={canMoveTask}
                        onTaskClick={onTaskClick}
                        memberNames={memberNames}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeTask && (
                    <div className={styles.taskCard} style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
                        <div className={styles.taskTitle}>{activeTask.title}</div>
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
}
