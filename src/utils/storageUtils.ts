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

export const clearImageCache = () => {
    // Browser HTTP cache can't be cleared from JS — no-op placeholder
    return true;
};

export const exportData = () => {
    const data = {
        library: localStorage.getItem('bingeki-library-storage'),
        gamification: localStorage.getItem('bingeki-gamification-storage'),
        settings: localStorage.getItem('bingeki-settings'),
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

export const importData = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);


                if (data.library) localStorage.setItem('bingeki-library-storage', data.library);
                if (data.gamification) localStorage.setItem('bingeki-gamification-storage', data.gamification);
                if (data.settings) localStorage.setItem('bingeki-settings', data.settings);

                // Hydrate Zustand stores to trigger reactive UI + Firestore sync
                if (data.library) {
                    try {
                        const parsedLib = JSON.parse(data.library);

                        const works = parsedLib.state ? parsedLib.state.works : parsedLib;

                        const actualWorks = Array.isArray(works) ? works : (Array.isArray(parsedLib) ? parsedLib : []);

                        if (actualWorks.length > 0) {
                            useLibraryStore.setState({ works: actualWorks });
                        }
                    } catch (e) {
                        console.error("Failed to parse library data for store", e);
                    }
                }

                if (data.gamification) {
                    try {
                        const parsedGam = JSON.parse(data.gamification);
                        const state = parsedGam.state || parsedGam;
                        useGamificationStore.setState(state);
                    } catch (e) { console.error("Failed to parse gamification", e); }
                }

                if (data.settings) {
                    try {
                        const parsedSet = JSON.parse(data.settings);
                        const state = parsedSet.state || parsedSet;
                        useSettingsStore.setState(state);
                    } catch (e) { console.error("Failed to parse settings", e); }
                }

                resolve(true);
            } catch (err) {
                console.error("Import failed", err);
                reject(false);
            }
        };
        reader.readAsText(file);
    });
};
