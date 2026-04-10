/**
 * Require Admin component (admin)
 */
import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';

export function RequireAdmin({ children }: { children: ReactNode }) {
    const { user, userProfile, loading } = useAuthStore();
    const location = useLocation();

    // While loading auth state, show nothing or a spinner
    if (loading) {
        return null;
    }

    // Verify if the user has admin privileges in their Firestore profile
    const isAdmin = user && userProfile?.isAdmin;

    if (!isAdmin) {
        // Redirect to home page if not admin
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return children;
}
