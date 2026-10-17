/**
 * Library store: works, folders, and favorite characters
 * Persisted to localStorage, synced to Firestore via useFirestoreSync
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { FavoriteCharacter } from '@/types/character';
import { nextWorkTimestamp, resolveWork, workKey } from '@/utils/workIdentity';


export const FOLDER_COLORS = [
    '#FF2E63', // Pink/Red
    '#08D9D6', // Cyan
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
] as const;


export const FOLDER_EMOJIS = ['📁', '⭐', '❤️', '🔥', '📚', '🎬', '✨', '🏆', '💎', '🎯'] as const;

export interface FolderSharing {
    enabled: boolean;
    access: 'public' | 'friends';
    sharedAt?: number;
}

export interface Folder {
    id: string;
    name: string;
    color: string;
    emoji: string;
    createdAt: number;
    sharing?: FolderSharing;
}

export interface Work {
    id: number | string;
    title: string;
    title_english?: string | null;
    title_japanese?: string | null;
    image: string;
    image_small?: string;
    type: 'manga' | 'anime';
    format?: string; // TV, Movie, OVA, Manga, Novel, etc.
    totalChapters?: number | null;
    currentChapter?: number;
    totalEpisodes?: number | null;
    currentEpisode?: number;
    status: 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read';
    score?: number;
    synopsis?: string;
    rating?: number;
    notes?: string;
    lastUpdated?: number;
    dateAdded?: number;
    collections?: string[];
    genres?: { name: string }[];
    season?: string;
    year?: number;
    rank?: number;
    popularity?: number;
    duration?: string;
    ratingString?: string;
    source?: string;
}

/** Records a deletion so the cloud merge cannot resurrect the work. */
export interface Tombstone {
    id: number | string;
    type?: Work['type'];
    deletedAt: number;
}

interface LibraryState {
    works: Work[];
    folders: Folder[];
    favoriteCharacters: FavoriteCharacter[];
    deletedWorks: Tombstone[];
    /** False until the cloud library has been merged in; guards cold-start recalcs. */
    hydrated: boolean;
    ownerId: string | null;
    metadataUpdatedAt: number;
    syncError: string | null;

    addWork: (work: Work) => void;
    removeWork: (id: number | string) => void;
    setHydrated: (value: boolean) => void;
    updateProgress: (id: number | string, progress: number) => void;
    updateStatus: (id: number | string, status: Work['status']) => void;
    updateWorkDetails: (id: number | string, details: Partial<Work>) => void;
    getWork: (id: number | string) => Work | undefined;

    createFolder: (name: string, color: string, emoji: string) => void;
    updateFolder: (id: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>) => void;
    deleteFolder: (id: string) => void;
    addToFolder: (workId: number | string, folderId: string) => void;
    removeFromFolder: (workId: number | string, folderId: string) => void;
    getWorksInFolder: (folderId: string) => Work[];

    addFavoriteCharacter: (character: FavoriteCharacter) => void;
    removeFavoriteCharacter: (id: number) => void;
    isFavoriteCharacter: (id: number) => boolean;
    setFavoriteCharacters: (chars: FavoriteCharacter[]) => void;
    reorderWorks: (newWorks: Work[]) => void;
    viewMode: 'grid' | 'list';
    sortBy: string;
    setViewMode: (mode: 'grid' | 'list') => void;
    setSortBy: (sort: string) => void;
    resetStoreBase: () => void;
    resetStore: () => void;
}

export const useLibraryStore = create<LibraryState>()(
    persist(
        (set, get) => ({
            works: [],
            folders: [],
            favoriteCharacters: [],
            deletedWorks: [],
            hydrated: false,
            ownerId: null,
            metadataUpdatedAt: 0,
            syncError: null,

            setHydrated: (value) => set({ hydrated: value }),

            addWork: (work) => set((state) => {
                if (state.works.some((w) => workKey(w) === workKey(work))) return state;
                const deletionTime = Math.max(0, ...state.deletedWorks
                    .filter(t => String(t.id) === String(work.id) && (!t.type || t.type === work.type))
                    .map(t => t.deletedAt));
                return {
                    works: [...state.works, {
                        ...work,
                        dateAdded: Date.now(),
                        lastUpdated: Math.max(Date.now(), deletionTime + 1),
                        collections: work.collections || []
                    }]
                };
            }),
            removeWork: (id) => set((state) => {
                const work = resolveWork(state.works, id);
                if (!work) return state;
                return {
                    works: state.works.filter(w => workKey(w) !== workKey(work)),
                    deletedWorks: [
                        ...state.deletedWorks.filter(t => !(t.type === work.type && String(t.id) === String(work.id))),
                        { id: work.id, type: work.type, deletedAt: nextWorkTimestamp(work) },
                    ],
                };
            }),
            updateProgress: (id, progress) => get().updateWorkDetails(id, { currentChapter: progress }),
            updateStatus: (id, status) => get().updateWorkDetails(id, { status }),
            updateWorkDetails: (id, details) => set((state) => {
                const work = resolveWork(state.works, id);
                return {
                    works: state.works.map(w => w === work
                        ? { ...w, ...details, id: w.id, type: w.type, lastUpdated: nextWorkTimestamp(w) }
                        : w),
                };
            }),
            getWork: (id) => resolveWork(get().works, id),


            createFolder: (name, color, emoji) => set((state) => ({
                metadataUpdatedAt: Math.max(Date.now(), state.metadataUpdatedAt + 1),
                folders: [...state.folders, {
                    id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name,
                    color,
                    emoji,
                    createdAt: Date.now()
                }]
            })),
            updateFolder: (id, updates) => set((state) => ({
                metadataUpdatedAt: Math.max(Date.now(), state.metadataUpdatedAt + 1),
                folders: state.folders.map((f) =>
                    f.id === id ? { ...f, ...updates } : f
                )
            })),
            deleteFolder: (id) => set((state) => ({
                metadataUpdatedAt: Math.max(Date.now(), state.metadataUpdatedAt + 1),
                folders: state.folders.filter((f) => f.id !== id),
                // Remove folder reference from all works
                works: state.works.map((w) => w.collections?.includes(id) ? ({
                    ...w,
                    collections: w.collections?.filter((c) => c !== id) || [],
                    lastUpdated: nextWorkTimestamp(w),
                }) : w)
            })),
            addToFolder: (workId, folderId) => {
                const work = get().getWork(workId);
                if (!work || work.collections?.includes(folderId)) return;
                get().updateWorkDetails(workId, { collections: [...(work.collections || []), folderId] });
            },
            removeFromFolder: (workId, folderId) => {
                const work = get().getWork(workId);
                if (!work) return;
                get().updateWorkDetails(workId, { collections: (work.collections || []).filter(c => c !== folderId) });
            },
            getWorksInFolder: (folderId) => get().works.filter((w) =>
                w.collections?.includes(folderId)
            ),


            addFavoriteCharacter: (character) => set((state) => {
                if (state.favoriteCharacters.some((c) => c.id === character.id)) return state;
                return { favoriteCharacters: [...state.favoriteCharacters, character] };
            }),
            removeFavoriteCharacter: (id) => set((state) => ({
                favoriteCharacters: state.favoriteCharacters.filter((c) => c.id !== id)
            })),
            isFavoriteCharacter: (id: number) => get().favoriteCharacters.some((c) => c.id === id),
            setFavoriteCharacters: (chars) => set({ favoriteCharacters: chars }),
            reorderWorks: (newWorks) => set(state => ({
                works: newWorks,
                metadataUpdatedAt: Math.max(Date.now(), state.metadataUpdatedAt + 1),
            })),
            viewMode: 'grid',
            sortBy: 'updated',
            setViewMode: (mode) => set(state => ({ viewMode: mode, metadataUpdatedAt: Math.max(Date.now(), state.metadataUpdatedAt + 1) })),
            setSortBy: (sort) => set(state => ({ sortBy: sort, metadataUpdatedAt: Math.max(Date.now(), state.metadataUpdatedAt + 1) })),
            resetStoreBase: () => set({
                works: [],
                folders: [],
                favoriteCharacters: [],
                deletedWorks: [],
                hydrated: false,
                metadataUpdatedAt: 0,
                syncError: null,
                viewMode: 'grid',
                sortBy: 'updated'
            }),
            resetStore: () => {
                get().resetStoreBase();

            }
        }),
        {
            name: 'bingeki-library-storage',
            // `hydrated` tracks this session's cloud load; it must never be restored.
            partialize: (state) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { hydrated, syncError, ...rest } = state;
                return rest;
            },
        }
    )
);
