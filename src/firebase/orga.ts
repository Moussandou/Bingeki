import {
    collection, doc, query, where, orderBy, limit,
    addDoc, updateDoc, deleteDoc, onSnapshot,
    Timestamp, getDocs, serverTimestamp
} from 'firebase/firestore';
import { db } from './config';
import { logger } from '@/utils/logger';
import type { OrgaSprint, OrgaTask, TaskStatus } from '@/types/orga';
import type { UserProfile } from './users';

// ==================== SPRINTS ====================

export function subscribeToActiveSprint(
    callback: (sprint: OrgaSprint | null) => void
): () => void {
    const q = query(
        collection(db, 'orga_sprints'),
        where('isActive', '==', true)
    );
    return onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            callback(null);
            return;
        }
        const doc = snapshot.docs[0];
        callback({ id: doc.id, ...doc.data() } as OrgaSprint);
    }, (error) => {
        logger.error('[Orga] Error subscribing to sprint:', error);
        callback(null);
    });
}

export async function getLastSprint(): Promise<OrgaSprint | null> {
    try {
        const q = query(
            collection(db, 'orga_sprints'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as OrgaSprint;
    } catch (error) {
        logger.error('[Orga] Error fetching last sprint:', error);
        return null;
    }
}


export async function createSprint(data: {
    name: string;
    objectif: string;
    startDate: Date;
    endDate: Date;
}): Promise<string> {
    const ref = await addDoc(collection(db, 'orga_sprints'), {
        name: data.name,
        objectif: data.objectif,
        startDate: Timestamp.fromDate(data.startDate),
        endDate: Timestamp.fromDate(data.endDate),
        isActive: true,
        createdAt: serverTimestamp(),
    });
    return ref.id;
}

export async function updateSprint(
    sprintId: string,
    data: Partial<Pick<OrgaSprint, 'name' | 'objectif'>> & {
        startDate?: Date;
        endDate?: Date;
    }
): Promise<void> {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.objectif !== undefined) updateData.objectif = data.objectif;
    if (data.startDate) updateData.startDate = Timestamp.fromDate(data.startDate);
    if (data.endDate) updateData.endDate = Timestamp.fromDate(data.endDate);

    await updateDoc(doc(db, 'orga_sprints', sprintId), updateData);
}

export async function closeSprint(sprintId: string): Promise<void> {
    await updateDoc(doc(db, 'orga_sprints', sprintId), { isActive: false });
}

// ==================== TASKS ====================

export function subscribeToSprintTasks(
    sprintId: string,
    callback: (tasks: OrgaTask[]) => void
): () => void {
    const q = query(
        collection(db, 'orga_tasks'),
        where('sprintId', '==', sprintId),
        orderBy('createdAt', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrgaTask));
        callback(tasks);
    }, (error) => {
        logger.error('[Orga] Error subscribing to tasks:', error);
        callback([]);
    });
}

export async function createTask(data: {
    title: string;
    description?: string;
    assigneeUid: string;
    assigneeName: string;
    priority: OrgaTask['priority'];
    status: TaskStatus;
    deadline?: Date;
    sprintId: string;
    createdBy: string;
    attachments?: string[];
    gitLink?: string;
}): Promise<string> {
    const taskData: Record<string, unknown> = {
        title: data.title,
        assigneeUid: data.assigneeUid,
        assigneeName: data.assigneeName,
        priority: data.priority,
        status: data.status,
        sprintId: data.sprintId,
        createdBy: data.createdBy,
        createdAt: serverTimestamp(),
    };
    if (data.description) taskData.description = data.description;
    if (data.deadline) taskData.deadline = Timestamp.fromDate(data.deadline);
    if (data.attachments) taskData.attachments = data.attachments;
    if (data.gitLink) taskData.gitLink = data.gitLink;

    const ref = await addDoc(collection(db, 'orga_tasks'), taskData);
    return ref.id;
}

export async function updateTask(
    taskId: string,
    data: Partial<{
        title: string;
        description: string;
        assigneeUid: string;
        assigneeName: string;
        priority: OrgaTask['priority'];
        status: TaskStatus;
        deadline: Date | null;
        attachments: string[];
        gitLink: string | null;
    }>
): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.assigneeUid !== undefined) updateData.assigneeUid = data.assigneeUid;
    if (data.assigneeName !== undefined) updateData.assigneeName = data.assigneeName;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) {
        updateData.status = data.status;
        if (data.status === 'done') {
            updateData.completedAt = serverTimestamp();
        }
    }
    if (data.deadline !== undefined) {
        updateData.deadline = data.deadline ? Timestamp.fromDate(data.deadline) : null;
    }
    if (data.attachments !== undefined) {
        updateData.attachments = data.attachments;
    }
    if (data.gitLink !== undefined) {
        updateData.gitLink = data.gitLink;
    }

    await updateDoc(doc(db, 'orga_tasks', taskId), updateData);
}

export async function deleteTask(taskId: string): Promise<void> {
    await deleteDoc(doc(db, 'orga_tasks', taskId));
}

// ==================== MEMBERS ====================

export async function getAdminMembers(): Promise<UserProfile[]> {
    try {
        const q = query(
            collection(db, 'users'),
            where('isAdmin', '==', true)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
    } catch (error) {
        logger.error('[Orga] Error fetching admin members:', error);
        return [];
    }
}

export async function updateMemberRole(uid: string, orgaRole: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { orgaRole });
}

export async function updateMemberName(uid: string, displayName: string): Promise<void> {
    await updateDoc(doc(db, 'users', uid), { displayName });
}

export async function getAllSprints(): Promise<OrgaSprint[]> {
    try {
        const q = query(
            collection(db, 'orga_sprints'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrgaSprint));
    } catch (error) {
        logger.error('[Orga] Error fetching all sprints:', error);
        return [];
    }
}

export async function getTasksForSprint(sprintId: string): Promise<OrgaTask[]> {
    try {
        const q = query(
            collection(db, 'orga_tasks'),
            where('sprintId', '==', sprintId),
            orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as OrgaTask));
    } catch (error) {
        logger.error('[Orga] Error fetching sprint tasks:', error);
        return [];
    }
}

