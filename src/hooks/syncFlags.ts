/**
 * Shared flags between useAuthSync and useFirestoreSync
 * Module-level to avoid coupling the hooks through React render cycles
 */
export const syncFlags = {
    /**
     * When true, the next gamification store change is a hydration from
     * Firestore (initial sync or remote profile update) and must NOT be
     * written back, to avoid a write loop.
     */
    skipGamificationSave: false,
};
