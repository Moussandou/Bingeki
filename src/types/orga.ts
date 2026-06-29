import type { Timestamp } from 'firebase/firestore';

export interface OrgaSprint {
    id: string;
    name: string;
    objectif: string;
    startDate: Timestamp;
    endDate: Timestamp;
    isActive: boolean;
    createdAt: Timestamp;
}

export interface OrgaTask {
    id: string;
    title: string;
    description?: string;
    assigneeUid: string;
    assigneeName: string;
    priority: TaskPriority;
    status: TaskStatus;
    deadline?: Timestamp;
    sprintId: string;
    createdBy: string;
    createdAt: Timestamp;
    completedAt?: Timestamp;
    attachments?: string[];
    gitLink?: string;
}

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export const TASK_STATUSES: { key: TaskStatus; label: string }[] = [
    { key: 'backlog', label: 'BACKLOG' },
    { key: 'todo', label: 'TO DO' },
    { key: 'in_progress', label: 'IN PROGRESS' },
    { key: 'review', label: 'REVIEW' },
    { key: 'done', label: 'DONE' },
];

export const TASK_PRIORITIES: { key: TaskPriority; label: string; color: string }[] = [
    { key: 'high', label: 'HIGH', color: '#FF2E63' },
    { key: 'medium', label: 'MED', color: '#facc15' },
    { key: 'low', label: 'LOW', color: '#888888' },
];

export const MEMBER_COLORS: Record<string, string> = {
    'Moussandou': '#FF2E63',
    'Maxime': '#08D9D6',
    'Hugo': '#7c3aed',
    'Yanis': '#facc15',
};

export function getMemberColor(name: string): string {
    return MEMBER_COLORS[name] || `hsl(${name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 60%, 50%)`;
}

export interface OrgaEvent {
    id: string;
    title: string;
    description?: string;
    date: Timestamp;
    startTime: string;
    endTime: string;
    type: 'oral' | 'peda' | 'team' | 'deadline';
    createdBy: string;
    createdAt: Timestamp;
}

export const EVENT_TYPES: { key: OrgaEvent['type']; label: string; color: string }[] = [
    { key: 'oral', label: 'Oral', color: '#7c3aed' },
    { key: 'peda', label: 'Pédagogie', color: '#FF2E63' },
    { key: 'team', label: 'Réunion Équipe', color: '#08D9D6' },
    { key: 'deadline', label: 'Rendu / Deadline', color: '#facc15' },
];
