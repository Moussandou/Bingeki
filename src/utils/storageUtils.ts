/**
 * LocalStorage size, export/import, and cache utilities
 */
export const getLocalStorageSize = (): string => {
    let total = 0;
    for (const x in localStorage) {
         
        if (Object.prototype.hasOwnProperty.call(localStorage, x)) {
            total += (localStorage[x].length * 2);
        }
    }
    return (total / 1024 / 1024).toFixed(2);
};

export const clearImageCache = async (): Promise<number> => {
    if (!('caches' in globalThis)) throw new Error('Cache Storage is unavailable.');
    const imageCaches = new Set(['mal-images', 'dicebear-avatars', 'firebase-images']);
    const names = (await caches.keys()).filter(name => imageCaches.has(name));
    const deleted = await Promise.all(names.map(name => caches.delete(name)));
    if (deleted.some(success => !success)) throw new Error('An image cache could not be removed.');
    return deleted.length;
};

export const exportData = () => {
    const library = useLibraryStore.getState();
    const data = {
        library: JSON.stringify({ state: Object.fromEntries(Object.entries(library).filter(([key]) => !['ownerId', 'hydrated'].includes(key))), version: 0 }),
        gamification: JSON.stringify({ state: useGamificationStore.getState(), version: 0 }),
        settings: JSON.stringify({ state: useSettingsStore.getState(), version: 0 }),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bingeki-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { logger } from '@/utils/logger';
import { validateBackup } from './backupValidation';

export function restoreBackup(value: unknown): void {
    // Parse every section before changing storage or notifying store subscribers.
    const backup = validateBackup(value);
    const previousLibrary = useLibraryStore.getState();
    const previousGamification = useGamificationStore.getState();
    const previousSettings = useSettingsStore.getState();
    const now = Date.now();
    const importedLibrary = backup.library;
    const deletedWorks = new Map<string, typeof previousLibrary.deletedWorks[number]>();
    if (importedLibrary) {
        const candidates = [
            ...previousLibrary.deletedWorks,
            ...importedLibrary.deletedWorks,
            ...previousLibrary.works.filter(work => !importedLibrary.works.some(w => w.type === work.type && String(w.id) === String(work.id)))
                .map(work => ({ id: work.id, type: work.type, deletedAt: now })),
        ];
        for (const tombstone of candidates) {
            const type = 'type' in tombstone ? tombstone.type : undefined;
            if (type && importedLibrary.works.some(work => work.type === type && String(work.id) === String(tombstone.id))) continue;
            const key = `${type || 'legacy'}:${tombstone.id}`;
            if ((deletedWorks.get(key)?.deletedAt ?? -1) < tombstone.deletedAt) deletedWorks.set(key, tombstone);
        }
    }
    const nextLibrary = importedLibrary ? {
        ...importedLibrary,
        works: importedLibrary.works.map(work => ({ ...work, lastUpdated: now })),
        metadataUpdatedAt: now,
        deletedWorks: [...deletedWorks.values()],
    } : undefined;
    const patches = [
        ['bingeki-library-storage', nextLibrary ? { ...previousLibrary, ...nextLibrary } : undefined],
        ['bingeki-gamification-storage', backup.gamification ? { ...previousGamification, ...backup.gamification } : undefined],
        ['bingeki-settings', backup.settings ? { ...previousSettings, ...backup.settings } : undefined],
    ] as const;
    const snapshots = patches.map(([key]) => [key, localStorage.getItem(key)] as const);
    try {
        // Preflight quota/security failures before any reactive state mutation.
        for (const [key, patch] of patches) {
            if (patch) localStorage.setItem(key, JSON.stringify({ state: patch, version: 0 }));
        }
        if (nextLibrary) useLibraryStore.setState(nextLibrary);
        if (backup.gamification) useGamificationStore.setState(backup.gamification);
        if (backup.settings) useSettingsStore.setState(backup.settings);
    } catch (error) {
        const failures: unknown[] = [error];
        for (const restore of [
            () => useLibraryStore.setState(previousLibrary),
            () => useGamificationStore.setState(previousGamification),
            () => useSettingsStore.setState(previousSettings),
            ...snapshots.map(([key, snapshot]) => () => snapshot === null ? localStorage.removeItem(key) : localStorage.setItem(key, snapshot)),
        ]) {
            try { restore(); } catch (rollbackError) { failures.push(rollbackError); }
        }
        logger.error('Backup restore failed:', failures);
        throw new AggregateError(failures, 'Backup restore failed; local state was rolled back where possible.');
    }
}

export const importData = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;

                if (content.trimStart().startsWith('<?xml') || content.trimStart().startsWith('<myanimelist')) {
                    reject(new Error('mal_xml'));
                    return;
                }

                restoreBackup(JSON.parse(content));
                resolve(true);
            } catch (err) {
                logger.error("Import failed", err);
                reject(err);
            }
        };
        reader.onerror = () => reject(reader.error || new Error('Unable to read backup file'));
        reader.onabort = () => reject(new Error('Backup import was cancelled'));
        reader.readAsText(file);
    });
};
