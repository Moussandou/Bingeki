import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { FavoriteCharacter } from '@/types/character';

// Folder colors palette
export const FOLDER_COLORS = [
    '#FF2E63', // Pink/Red
    '#08D9D6', // Cyan
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
] as const;

// Folder emojis
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
    image: string;
    type: 'manga' | 'anime';
    format?: string; // TV, Movie, OVA, Manga, Novel, etc.
    totalChapters?: number | null;
    currentChapter?: number;
    status: 'reading' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_read';
    score?: number;
    synopsis?: string; // Add synopsis field
    rating?: number; // User personal rating (0-10)
    notes?: string;  // User personal notes
    lastUpdated?: number; // Timestamp of last progress update
    dateAdded?: number; // Timestamp of creation
    collections?: string[]; // Folder IDs
    genres?: { name: string }[];
    season?: string;
    year?: number;
    rank?: number;
    popularity?: number;
    duration?: string;
    ratingString?: string;
    source?: string;
}

interface LibraryState {
    works: Work[];
    folders: Folder[];
    favoriteCharacters: FavoriteCharacter[];
    // Work actions
    addWork: (work: Work) => void;
    removeWork: (id: number | string) => void;
    updateProgress: (id: number | string, progress: number) => void;
    updateStatus: (id: number | string, status: Work['status']) => void;
    updateWorkDetails: (id: number | string, details: Partial<Work>) => void;
    getWork: (id: number | string) => Work | undefined;
    // Folder actions
    createFolder: (name: string, color: string, emoji: string) => void;
    updateFolder: (id: string, updates: Partial<Omit<Folder, 'id' | 'createdAt'>>) => void;
    deleteFolder: (id: string) => void;
    addToFolder: (workId: number | string, folderId: string) => void;
    removeFromFolder: (workId: number | string, folderId: string) => void;
    getWorksInFolder: (folderId: string) => Work[];
    // Character actions
    addFavoriteCharacter: (character: FavoriteCharacter) => void;
    removeFavoriteCharacter: (id: number) => void;
    isFavoriteCharacter: (id: number) => boolean;
    setFavoriteCharacters: (chars: FavoriteCharacter[]) => void;
    resetStore: () => void;
}

export const useLibraryStore = create<LibraryState>()(
    persist(
        (set, get) => ({
            works: [],
            folders: [],
            favoriteCharacters: [],

            // Work actions
            addWork: (work) => set((state) => {
                if (state.works.some((w) => w.id === work.id)) return state;
                return {
                    works: [...state.works, {
                        ...work,
                        dateAdded: Date.now(),
                        lastUpdated: Date.now(),
                        collections: []
                    }]
                };
            }),
            removeWork: (id) => set((state) => ({
                works: state.works.filter((w) => w.id !== id),
            })),
            updateProgress: (id, progress) => set((state) => ({
                works: state.works.map((w) =>
                    w.id === id ? { ...w, currentChapter: progress, lastUpdated: Date.now() } : w
                ),
            })),
            updateStatus: (id, status) => set((state) => ({
                works: state.works.map((w) =>
                    w.id === id ? { ...w, status } : w
                ),
            })),
            updateWorkDetails: (id, details) => set((state) => ({
                works: state.works.map((w) =>
                    w.id === id ? { ...w, ...details } : w
                ),
            })),
            getWork: (id) => get().works.find((w) => w.id === id),

            // Folder actions
            createFolder: (name, color, emoji) => set((state) => ({
                folders: [...state.folders, {
                    id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    name,
                    color,
                    emoji,
                    createdAt: Date.now()
                }]
            })),
            updateFolder: (id, updates) => set((state) => ({
                folders: state.folders.map((f) =>
                    f.id === id ? { ...f, ...updates } : f
                )
            })),
            deleteFolder: (id) => set((state) => ({
                folders: state.folders.filter((f) => f.id !== id),
                // Also remove folder reference from all works
                works: state.works.map((w) => ({
                    ...w,
                    collections: w.collections?.filter((c) => c !== id) || []
                }))
            })),
            addToFolder: (workId, folderId) => set((state) => ({
                works: state.works.map((w) => {
                    if (w.id !== workId) return w;
                    const collections = w.collections || [];
                    if (collections.includes(folderId)) return w;
                    return { ...w, collections: [...collections, folderId] };
                })
            })),
            removeFromFolder: (workId, folderId) => set((state) => ({
                works: state.works.map((w) => {
                    if (w.id !== workId) return w;
                    return {
                        ...w,
                        collections: w.collections?.filter((c) => c !== folderId) || []
                    };
                })
            })),
            getWorksInFolder: (folderId) => get().works.filter((w) =>
                w.collections?.includes(folderId)
            ),

            // Character actions
            addFavoriteCharacter: (character) => set((state) => {
                if (state.favoriteCharacters.some((c) => c.id === character.id)) return state;
                return { favoriteCharacters: [...state.favoriteCharacters, character] };
            }),
            removeFavoriteCharacter: (id) => set((state) => ({
                favoriteCharacters: state.favoriteCharacters.filter((c) => c.id !== id)
            })),
            isFavoriteCharacter: (id: number) => get().favoriteCharacters.some((c) => c.id === id),
            setFavoriteCharacters: (chars) => set({ favoriteCharacters: chars }),
            resetStore: () => set({ works: [], folders: [], favoriteCharacters: [] }),
        }),
        {
            name: 'bingeki-library-storage',
        }
    )
);
