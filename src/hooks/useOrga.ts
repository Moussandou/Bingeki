import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/context/ToastContext';
import {
    subscribeToActiveSprint, subscribeToSprintTasks,
    createSprint, updateSprint, closeSprint,
    createTask, updateTask, deleteTask,
    getAdminMembers, updateMemberRole, updateMemberName, getLastSprint,
    getAllSprints, getTasksForSprint,
} from '@/firebase/orga';
import type { OrgaSprint, OrgaTask, TaskStatus } from '@/types/orga';
import type { UserProfile } from '@/firebase/users';

interface OrgaState {
    sprint: OrgaSprint | null;
    tasks: OrgaTask[];
    members: UserProfile[];
    loading: boolean;
    filter: string | null;
}

export function useOrga() {
    const { userProfile } = useAuthStore();
    const { addToast } = useToast();

    const [state, setState] = useState<OrgaState>({
        sprint: null,
        tasks: [],
        members: [],
        loading: true,
        filter: null,
    });

    const isSuperAdmin = userProfile?.isSuperAdmin === true;
    const currentUid = userProfile?.uid ?? '';

    // Fetch admin members once
    useEffect(() => {
        getAdminMembers().then(members => {
            setState(s => ({ ...s, members }));
        });
    }, []);

    // Subscribe to active sprint
    useEffect(() => {
        const unsub = subscribeToActiveSprint((sprint) => {
            setState(s => ({ ...s, sprint, loading: false }));
        });
        return unsub;
    }, []);

    // Subscribe to sprint tasks
    useEffect(() => {
        if (!state.sprint) {
            setState(s => ({ ...s, tasks: [] }));
            return;
        }
        const unsub = subscribeToSprintTasks(state.sprint.id, (tasks) => {
            setState(s => ({ ...s, tasks }));
        });
        return unsub;
    }, [state.sprint?.id]);

    // Filtered tasks
    const filteredTasks = useMemo(() => {
        if (!state.filter) return state.tasks;
        return state.tasks.filter(t => t.assigneeUid === state.filter);
    }, [state.tasks, state.filter]);

    // Stats
    const stats = useMemo(() => {
        const total = state.tasks.length;
        const done = state.tasks.filter(t => t.status === 'done').length;
        const byStatus: Record<TaskStatus, number> = {
            backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0,
        };
        state.tasks.forEach(t => { byStatus[t.status]++; });
        return { total, done, progress: total > 0 ? (done / total) * 100 : 0, byStatus };
    }, [state.tasks]);

    // Permission check: can user move this task?
    const canMoveTask = useCallback((task: OrgaTask): boolean => {
        return isSuperAdmin || task.assigneeUid === currentUid;
    }, [isSuperAdmin, currentUid]);

    // Actions
    const handleCreateSprint = useCallback(async (data: {
        name: string; objectif: string; startDate: Date; endDate: Date;
    }) => {
        try {
            await createSprint(data);
            addToast('Sprint créé', 'success');
        } catch {
            addToast('Erreur lors de la création du sprint', 'error');
        }
    }, [addToast]);

    const handleUpdateSprint = useCallback(async (
        sprintId: string,
        data: { name?: string; objectif?: string; startDate?: Date; endDate?: Date }
    ) => {
        try {
            await updateSprint(sprintId, data);
            addToast('Sprint mis à jour', 'success');
        } catch {
            addToast('Erreur lors de la mise à jour', 'error');
        }
    }, [addToast]);

    const handleCloseSprint = useCallback(async (sprintId: string) => {
        try {
            await closeSprint(sprintId);
            addToast('Sprint clôturé', 'success');
        } catch {
            addToast('Erreur lors de la clôture', 'error');
        }
    }, [addToast]);

    const handleCreateTask = useCallback(async (data: {
        title: string; description?: string;
        assigneeUid: string; assigneeName: string;
        priority: OrgaTask['priority']; status: TaskStatus;
        deadline?: Date; sprintId: string;
        attachments?: string[];
        gitLink?: string;
    }) => {
        try {
            await createTask({ ...data, createdBy: currentUid });
            addToast('Tâche créée', 'success');
        } catch {
            addToast('Erreur lors de la création de la tâche', 'error');
        }
    }, [currentUid, addToast]);

    const handleUpdateTask = useCallback(async (
        taskId: string,
        data: Parameters<typeof updateTask>[1]
    ) => {
        try {
            await updateTask(taskId, data);
        } catch {
            addToast('Permission refusée ou erreur réseau', 'error');
        }
    }, [addToast]);

    const handleDeleteTask = useCallback(async (taskId: string) => {
        try {
            await deleteTask(taskId);
            addToast('Tâche supprimée', 'success');
        } catch {
            addToast('Erreur lors de la suppression', 'error');
        }
    }, [addToast]);

    const setFilter = useCallback((uid: string | null) => {
        setState(s => ({ ...s, filter: uid }));
    }, []);

    const handleUpdateMemberRole = useCallback(async (uid: string, role: string) => {
        try {
            await updateMemberRole(uid, role);
            setState(s => ({
                ...s,
                members: s.members.map(m =>
                    m.uid === uid ? { ...m, orgaRole: role } as UserProfile & { orgaRole: string } : m
                ),
            }));
            addToast('Rôle mis à jour', 'success');
        } catch {
            addToast('Erreur lors de la mise à jour du rôle', 'error');
        }
    }, [addToast]);

    const handleUpdateMemberName = useCallback(async (uid: string, name: string) => {
        try {
            await updateMemberName(uid, name);
            setState(s => ({
                ...s,
                members: s.members.map(m =>
                    m.uid === uid ? { ...m, displayName: name } : m
                ),
            }));
            addToast('Nom mis à jour', 'success');
        } catch {
            addToast('Erreur lors de la mise à jour du nom', 'error');
        }
    }, [addToast]);

    return {
        sprint: state.sprint,
        tasks: filteredTasks,
        allTasks: state.tasks,
        members: state.members,
        loading: state.loading,
        filter: state.filter,
        stats,
        isSuperAdmin,
        currentUid,
        canMoveTask,
        setFilter,
        createSprint: handleCreateSprint,
        updateSprint: handleUpdateSprint,
        closeSprint: handleCloseSprint,
        createTask: handleCreateTask,
        updateTask: handleUpdateTask,
        deleteTask: handleDeleteTask,
        updateMemberRole: handleUpdateMemberRole,
        updateMemberName: handleUpdateMemberName,
        getLastSprint,
        getAllSprints,
        getTasksForSprint,
    };
}
