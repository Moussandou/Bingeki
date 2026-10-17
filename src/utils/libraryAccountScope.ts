import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore, type GamificationState } from '@/store/gamificationStore';
import type { FavoriteCharacter } from '@/types/character';
import type { Folder, Tombstone, Work } from '@/store/libraryStore';
import { logger } from '@/utils/logger';

interface AccountSnapshot {
    library: {
        works: Work[];
        folders: Folder[];
        deletedWorks: Tombstone[];
        favoriteCharacters: FavoriteCharacter[];
        viewMode: 'grid' | 'list';
        sortBy: string;
        metadataUpdatedAt: number;
    };
    gamification: Partial<GamificationState>;
}

function snapshot(): AccountSnapshot {
    const library = useLibraryStore.getState();
    return {
        library: {
            works: library.works,
            folders: library.folders,
            deletedWorks: library.deletedWorks,
            favoriteCharacters: library.favoriteCharacters,
            viewMode: library.viewMode,
            sortBy: library.sortBy,
            metadataUpdatedAt: library.metadataUpdatedAt,
        },
        gamification: JSON.parse(JSON.stringify(useGamificationStore.getState())) as Partial<GamificationState>,
    };
}

function scopeKey(ownerId: string | null): string {
    return `bingeki-account-snapshot:${ownerId === null ? 'guest' : `user:${ownerId}`}`;
}

/** The legacy, unowned persisted library is a guest library; never assign it to another account implicitly. */
export function activateLibraryOwner(ownerId: string | null): void {
    const currentOwner = useLibraryStore.getState().ownerId;
    if (currentOwner === ownerId) return;
    try {
        const current = snapshot();
        localStorage.setItem(scopeKey(currentOwner), JSON.stringify(current));
        const stored = localStorage.getItem(scopeKey(ownerId));
        const restored = stored ? JSON.parse(stored) as AccountSnapshot : null;
        // Legacy unowned data may be from an old account: retain it as guest, never auto-upload it.
        const target = restored;
        useLibraryStore.getState().resetStoreBase();
        useGamificationStore.getState().resetStore();
        if (target) {
            useLibraryStore.setState(target.library);
            useGamificationStore.setState(target.gamification);
        }
        useLibraryStore.setState({ ownerId, hydrated: false, syncError: null });
    } catch (error) {
        // Do not clear or switch stores if retaining the old account's data failed.
        logger.error('[AuthSync] Cannot retain account data locally:', error);
        throw error;
    }
}
