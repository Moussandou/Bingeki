import { logger } from '@/utils/logger';
import { auth } from './config';
import {
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    type User
} from 'firebase/auth';
import { saveLibraryToFirestore, saveGamificationToFirestore, saveUserProfileToFirestore } from './firestore';
import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';

const googleProvider = new GoogleAuthProvider();
const discordProvider = new OAuthProvider('oidc.discord');
discordProvider.addScope('openid');
discordProvider.addScope('identify');
discordProvider.addScope('email');

// appleConfig removed

export const loginWithDiscord = async (): Promise<User | null> => {
    const result = await signInWithPopup(auth, discordProvider);
    return result.user;
};

// loginWithApple removed

export const loginWithGoogle = async (): Promise<User | null> => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
};

export const loginWithEmail = async (email: string, password: string): Promise<{ user: User | null; error: string | null }> => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return { user: result.user, error: null };
    } catch (error) {
        logger.error("Error logging in with email", error);
        const err = error as { code?: string; message: string };
        let errorMessage = "Une erreur est survenue";
        if (err.code === 'auth/user-not-found') errorMessage = "Aucun compte trouvé avec cet email";
        if (err.code === 'auth/wrong-password') errorMessage = "Mot de passe incorrect";
        if (err.code === 'auth/invalid-email') errorMessage = "Format d'email invalide";
        if (err.code === 'auth/too-many-requests') errorMessage = "Trop de tentatives, réessayez plus tard";
        return { user: null, error: errorMessage };
    }
};

export const registerWithEmail = async (email: string, password: string, displayName: string): Promise<{ user: User | null; error: string | null }> => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Update the user's display name
        if (result.user && displayName) {
            await updateProfile(result.user, { displayName });
            
            // NEW: Explicity save to firestore immediately to avoid race condition with onAuthStateChanged in App.tsx
            // This ensures the initial Firestore document has the correct name.
            await saveUserProfileToFirestore({
                uid: result.user.uid,
                email: result.user.email,
                displayName: displayName,
                photoURL: result.user.photoURL,
                lastLogin: Date.now()
            }, true); // forceUpdate true to ensure it's saved correctly
        }
        return { user: result.user, error: null };
    } catch (error) {
        logger.error("Error registering with email", error);
        const err = error as { code?: string; message: string };
        let errorMessage = "Une erreur est survenue";
        if (err.code === 'auth/email-already-in-use') errorMessage = "Cet email est déjà utilisé";
        if (err.code === 'auth/invalid-email') errorMessage = "Format d'email invalide";
        if (err.code === 'auth/weak-password') errorMessage = "Le mot de passe doit faire au moins 6 caractères";
        return { user: null, error: errorMessage };
    }
};

export const logout = async (): Promise<void> => {
    try {
        // Sync data to Firestore before logging out
        const currentUser = auth.currentUser;
        if (currentUser) {
            const libraryState = useLibraryStore.getState();
            const gamificationState = useGamificationStore.getState();

            // Save current data to cloud
            await saveLibraryToFirestore(currentUser.uid, libraryState.works);
            await saveGamificationToFirestore(currentUser.uid, {
                level: gamificationState.level,
                xp: gamificationState.xp,
                totalXp: gamificationState.totalXp,
                xpToNextLevel: gamificationState.xpToNextLevel,
                streak: gamificationState.streak,
                lastActivityDate: gamificationState.lastActivityDate,
                badges: gamificationState.badges,
                totalChaptersRead: gamificationState.totalChaptersRead,
                totalAnimeEpisodesWatched: gamificationState.totalAnimeEpisodesWatched,
                totalMoviesWatched: gamificationState.totalMoviesWatched,
                totalWorksAdded: gamificationState.totalWorksAdded,
                totalWorksCompleted: gamificationState.totalWorksCompleted,
                bonusXp: gamificationState.bonusXp
            });

            logger.log("Data synced before logout");
        }

        await signOut(auth);
    } catch (error) {
        logger.error("Error logging out", error);
    }
};
