/**
 * Require Admin component (admin)
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

// Au-delà, un profil toujours absent est considéré comme introuvable.
const PROFILE_WAIT_MS = 10_000;

export function RequireAdmin({ children }: { children: ReactNode }) {
    const { user, userProfile, loading } = useAuthStore();
    const location = useLocation();
    const [gaveUp, setGaveUp] = useState(false);

    // Le profil arrive par un abonnement Firestore séparé : la bibliothèque
    // peut finir de charger avant lui (loading=false, userProfile=null). On
    // l'attend au lieu de rediriger un admin vers l'accueil.
    const waitingProfile = !!user && !userProfile && !gaveUp;
    useEffect(() => {
        if (!waitingProfile) return;
        const timer = setTimeout(() => setGaveUp(true), PROFILE_WAIT_MS);
        return () => clearTimeout(timer);
    }, [waitingProfile]);

    if (loading || waitingProfile) {
        return <LoadingScreen />;
    }

    // Verify if the user has admin privileges in their Firestore profile
    const isAdmin = user && userProfile?.isAdmin;

    if (!isAdmin) {
        // Redirect to home page if not admin
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
}
