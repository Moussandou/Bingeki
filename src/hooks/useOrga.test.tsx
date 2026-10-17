import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useOrga } from './useOrga';

const mocks = vi.hoisted(() => ({
    sprint: null as null | ((sprint: { id: string } | null) => void),
    tasks: new Map<string, (tasks: { id: string; status: string }[]) => void>(),
    unsubscribe: vi.fn(),
}));
vi.mock('@/store/authStore', () => ({ useAuthStore: () => ({ userProfile: null }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('@/firebase/orga', () => ({
    subscribeToActiveSprint: (callback: typeof mocks.sprint) => { mocks.sprint = callback; return vi.fn(); },
    subscribeToSprintTasks: (id: string, callback: (tasks: { id: string; status: string }[]) => void) => {
        mocks.tasks.set(id, callback);
        return mocks.unsubscribe;
    },
    subscribeToEvents: () => vi.fn(), getAdminMembers: async () => [],
    createSprint: vi.fn(), updateSprint: vi.fn(), closeSprint: vi.fn(),
    createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
    updateMemberRole: vi.fn(), updateMemberName: vi.fn(), getLastSprint: vi.fn(),
    getAllSprints: vi.fn(), getTasksForSprint: vi.fn(), createEvent: vi.fn(), deleteEvent: vi.fn(),
}));

describe('organization sprint subscription', () => {
    it('clears tasks on sprint changes and ignores old callbacks', async () => {
        const { result } = renderHook(() => useOrga());
        await act(async () => {});
        act(() => { mocks.sprint?.({ id: 'a' }); });
        act(() => { mocks.tasks.get('a')?.([{ id: 'task-a', status: 'todo' }]); });
        expect(result.current.allTasks.map(task => task.id)).toEqual(['task-a']);
        act(() => { mocks.sprint?.({ id: 'b' }); });
        expect(result.current.allTasks).toEqual([]);
        act(() => { mocks.tasks.get('a')?.([{ id: 'stale-a', status: 'todo' }]); });
        expect(result.current.allTasks).toEqual([]);
        act(() => { mocks.tasks.get('b')?.([{ id: 'task-b', status: 'done' }]); });
        expect(result.current.stats.done).toBe(1);
        act(() => { mocks.sprint?.(null); });
        expect(result.current.allTasks).toEqual([]);
        expect(mocks.unsubscribe).toHaveBeenCalled();
    });
});
