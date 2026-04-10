/**
 * User preferences store (theme, language, privacy, etc.)
 * Persisted to localStorage, synced from Firestore profile
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light';
export type TitleLanguage = 'romaji' | 'english' | 'native';
export type ProfileVisibility = 'public' | 'friends' | 'private';

interface SettingsState {
    theme: Theme;
    reducedMotion: boolean;
    soundEnabled: boolean;
    notifications: boolean;

    streamingUrlPattern: string;
    spoilerMode: boolean;
    nsfwMode: boolean;
    accentColor: string;


    titleLanguage: TitleLanguage;
    hideScores: boolean;
    dataSaver: boolean;
    profileVisibility: ProfileVisibility;
    showActivityStatus: boolean;

    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    toggleReducedMotion: () => void;
    toggleSound: () => void;
    toggleNotifications: () => void;
    setStreamingUrlPattern: (pattern: string) => void;
    toggleSpoilerMode: () => void;
    toggleNsfwMode: () => void;
    setAccentColor: (color: string) => void;


    setTitleLanguage: (lang: TitleLanguage) => void;
    toggleHideScores: () => void;
    toggleDataSaver: () => void;
    setProfileVisibility: (visibility: ProfileVisibility) => void;
    toggleActivityStatus: () => void;

    syncFromProfile: (profile: any) => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'dark',
            reducedMotion: false,
            soundEnabled: true,
            notifications: true,

            streamingUrlPattern: 'https://www.google.com/search?q={title}+episode+{number}+streaming',
            setStreamingUrlPattern: (pattern) => set({ streamingUrlPattern: pattern }),

            setTheme: (theme) => set({ theme }),
            toggleTheme: () => set((state) => {
                const nextTheme = state.theme === 'light' ? 'dark' : 'light';
                return { theme: nextTheme };
            }),
            toggleReducedMotion: () => set((state) => ({ reducedMotion: !state.reducedMotion })),
            toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
            toggleNotifications: () => set((state) => ({ notifications: !state.notifications })),
            spoilerMode: false,
            toggleSpoilerMode: () => set((state) => ({ spoilerMode: !state.spoilerMode })),
            nsfwMode: false,
            toggleNsfwMode: () => set((state) => ({ nsfwMode: !state.nsfwMode })),
            accentColor: '#FF2E63',
            setAccentColor: (color) => set({ accentColor: color }),


            titleLanguage: 'romaji',
            setTitleLanguage: (lang) => set({ titleLanguage: lang }),
            hideScores: false,
            toggleHideScores: () => set((state) => ({ hideScores: !state.hideScores })),
            dataSaver: false,
            toggleDataSaver: () => set((state) => ({ dataSaver: !state.dataSaver })),
            profileVisibility: 'public',
            setProfileVisibility: (visibility) => set({ profileVisibility: visibility }),
            showActivityStatus: true,
            toggleActivityStatus: () => set((state) => ({ showActivityStatus: !state.showActivityStatus })),

            syncFromProfile: (profile) => set((state) => ({
                titleLanguage: profile.titlePriority || state.titleLanguage,
                hideScores: profile.hideScores !== undefined ? profile.hideScores : state.hideScores,
                dataSaver: profile.dataSaver !== undefined ? profile.dataSaver : state.dataSaver,
                profileVisibility: profile.profileVisibility || state.profileVisibility,
                showActivityStatus: profile.showActivityStatus !== undefined ? profile.showActivityStatus : state.showActivityStatus,
            })),
        }),
        {
            name: 'bingeki-settings',
        }
    )
);
