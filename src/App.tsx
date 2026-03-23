import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MaintenanceScreen } from '@/components/ui/MaintenanceScreen';
import { useAuthStore } from '@/store/authStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useGamificationStore } from '@/store/gamificationStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePWAStore } from '@/store/pwaStore';
import { useShallow } from 'zustand/react/shallow';
import { auth } from '@/firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import {
  loadLibraryFromFirestore,
  loadGamificationFromFirestore,
  saveLibraryToFirestore,
  saveGamificationToFirestore,
  saveUserProfileToFirestore,
  subscribeToGlobalConfig
} from '@/firebase/firestore';
import { mergeLibraryData, mergeGamificationData } from '@/utils/dataProtection';
import { ToastProvider } from '@/context/ToastContext';
import { isBot } from '@/utils/isBot';

// Lazy load pages
const Opening = lazy(() => import('@/pages/Opening'));
const Auth = lazy(() => import('@/pages/Auth'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Library = lazy(() => import('@/pages/Library'));
const WorkDetails = lazy(() => import('@/pages/WorkDetails'));
const Profile = lazy(() => import('@/pages/Profile'));
const Settings = lazy(() => import('@/pages/Settings'));
const Discover = lazy(() => import('@/pages/Discover'));
const Social = lazy(() => import('@/pages/Social'));
const Legal = lazy(() => import('@/pages/Legal'));
const Challenges = lazy(() => import('@/pages/Challenges'));
const Feedback = lazy(() => import('@/pages/Feedback'));
const FeedbackList = lazy(() => import('@/pages/admin/FeedbackList'));
const Changelog = lazy(() => import('@/pages/Changelog'));
const Schedule = lazy(() => import('@/pages/Schedule'));
const CharacterDetails = lazy(() => import('@/pages/CharacterDetails'));
const PersonDetails = lazy(() => import('@/pages/PersonDetails'));
const Credits = lazy(() => import('@/pages/Credits'));
const Assets = lazy(() => import('@/pages/AssetsPage'));
const Donors = lazy(() => import('@/pages/Donors'));
const Notifications = lazy(() => import('@/pages/Notifications')); // Added

const FormSurvey = lazy(() => import('@/pages/FormSurvey'));
const FormSurveyThankYou = lazy(() => import('@/pages/FormSurveyThankYou'));

const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
const Contact = lazy(() => import('@/pages/Contact'));
const About = lazy(() => import('@/pages/About'));
// MyTickets and TicketDetail are now merged into Feedback.tsx

const Lens = lazy(() => import('@/pages/Lens'));
const NewsIndex = lazy(() => import('@/pages/NewsIndex'));
const NewsArticle = lazy(() => import('@/pages/NewsArticle'));

import { AdminLayout } from '@/components/admin/AdminLayout';
import { RequireAdmin } from '@/components/admin/RequireAdmin';
import { InstallInstructionsModal } from '@/components/pwa/InstallInstructionsModal';
import { MobileMenuFAB } from '@/components/layout/MobileMenuFAB';

// Bot aware suspense to avoid blank screen during hydration for screenshot tools
const BotAwareSuspense = ({ children }: { children: React.ReactNode }) => {
  const fallback = isBot() ? null : <LoadingScreen />;
  return <Suspense fallback={fallback}>{children}</Suspense>;
};

// Admin Components
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminFeedback = lazy(() => import('@/pages/admin/FeedbackAdmin'));
const AdminSystem = lazy(() => import('@/pages/admin/SystemLogs'));
const AdminSocialGenerator = lazy(() => import('@/pages/admin/SocialGenerator'));
const AdminSurvey = lazy(() => import('@/pages/admin/SurveyDashboard'));

// Language Manager Component
const LanguageManager = () => {
  const { lang } = useParams();
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (lang && (lang === 'fr' || lang === 'en')) {
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    }
  }, [lang, i18n]);

  // If language is invalid or missing, redirect to detection
  if (!lang || !['fr', 'en'].includes(lang)) {
    const detectedLang = i18n.language || 'fr';
    let cleanPath = location.pathname;

    // If path already starts with a valid language but LanguageManager matched something else
    // (e.g. /fr/form but lang parameter was captured as something else, which shouldn't happen
    // with :lang route but let's be safe), or if it's already prefixed in general.
    if (cleanPath.startsWith('/fr/') || cleanPath.startsWith('/en/') || cleanPath === '/fr' || cleanPath === '/en') {
      // In this case, we're likely in a loop if we stay here, 
      // but let's just make sure we don't ADD another prefix.
      return <div className="flex h-screen items-center justify-center">404 - Page Not Found</div>;
    }

    if (cleanPath === '/') cleanPath = '';
    return <Navigate to={`/${detectedLang}${cleanPath}${location.search}`} replace />;
  }

  return <Outlet />;
};

const RootRedirect = () => {
  const { i18n } = useTranslation();
  const location = useLocation();

  // Prevent redirect loops for static files that fell through
  if (/\.(xml|txt|json|png|jpg|jpeg|svg|ico)$/i.test(location.pathname)) {
    return <div className="flex h-screen items-center justify-center">404 - File Not Found</div>;
  }

  const lang = i18n.language === 'en' ? 'en' : 'fr';
  const currentPath = location.pathname;

  // If already prefixed, don't re-prefix (this happens if a route falls through)
  if (currentPath.startsWith('/fr/') || currentPath.startsWith('/en/') || currentPath === '/fr' || currentPath === '/en') {
    return <div className="flex h-screen items-center justify-center">404 - Page Not Found</div>;
  }

  return <Navigate to={`/${lang}${currentPath}${location.search}`} replace />;
};

function App() {
  const { setUser, setUserProfile, setLoading, user, userProfile, loading } = useAuthStore();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  const libraryWorks = useLibraryStore((s) => s.works);
  const libraryFolders = useLibraryStore((s) => s.folders);
  const gamificationState = useGamificationStore(useShallow((s) => ({
    level: s.level,
    xp: s.xp,
    xpToNextLevel: s.xpToNextLevel,
    streak: s.streak,
    lastActivityDate: s.lastActivityDate,
    badges: s.badges,
    totalChaptersRead: s.totalChaptersRead,
    totalWorksAdded: s.totalWorksAdded,
    totalWorksCompleted: s.totalWorksCompleted,
    totalAnimeEpisodesWatched: s.totalAnimeEpisodesWatched,
    totalMoviesWatched: s.totalMoviesWatched,
  })));

  // Detect bot and apply class to body for CSS targeting (e.g. disabling animations)
  useEffect(() => {
    if (isBot()) {
      document.body.classList.add('is-bot');
    }
  }, []);

  // Auth state listener + Firestore sync
  useEffect(() => {
    let profileUnsubscribe: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // DON'T clear stores - we'll merge instead to avoid data loss
        // Get current local state before loading cloud
        const localLibrary = useLibraryStore.getState().works;
        const localGamification = useGamificationStore.getState();

        // Sync user profile (email, name, photo)
        await saveUserProfileToFirestore(firebaseUser);

        // REAL-TIME: Subscribe to profile changes (handling admin status updates instantly)
        if (profileUnsubscribe) profileUnsubscribe(); // Cleanup previous if any
        profileUnsubscribe = useAuthStore.getState().subscribeToProfile(firebaseUser.uid);

        // Load cloud data
        const cloudLibrary = await loadLibraryFromFirestore(firebaseUser.uid);
        const cloudGamification = await loadGamificationFromFirestore(firebaseUser.uid);

        // Smart merge: combine local and cloud data safely
        const mergedLibrary = mergeLibraryData(localLibrary, cloudLibrary);
        const mergedGamification = mergeGamificationData(
          {
            ...localGamification,
            badges: localGamification.badges || []
          },
          cloudGamification
        );

        // Update stores with merged data
        useLibraryStore.setState({ works: mergedLibrary });
        useGamificationStore.setState(mergedGamification);

        console.log('[App] Data merged successfully:', {
          libraryCount: mergedLibrary.length,
          level: mergedGamification.level
        });
      } else {
        // User logged out - cleanup
        if (profileUnsubscribe) {
          profileUnsubscribe();
          profileUnsubscribe = undefined;
        }

        // Clear local stores
        useLibraryStore.getState().resetStore();
        useGamificationStore.getState().resetStore();
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) profileUnsubscribe();
    };
  }, [setUser, setLoading, setUserProfile]);

  // Auto-save to Firestore when data changes (debounced)
  useEffect(() => {
    if (!user) return;

    // Save library changes to Firestore
    const timeout = setTimeout(() => {
      saveLibraryToFirestore(user.uid, libraryWorks, libraryFolders);
    }, 3000); // Increased to 3s to reduce save conflicts

    return () => clearTimeout(timeout);
  }, [libraryWorks, libraryFolders, user]);

  useEffect(() => {
    if (!user) return;

    // Save gamification changes to Firestore
    const timeout = setTimeout(() => {
      saveGamificationToFirestore(user.uid, gamificationState);
    }, 3000); // Increased to 3s to reduce save conflicts

    return () => clearTimeout(timeout);
  }, [gamificationState, user]);

  // PWA Global Listeners
  const { setDeferredPrompt, setIsInstalled, clearPrompt } = usePWAStore();
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e as any);
      console.log('👋 PWA Install Prompt captured!');
    };

    const handleAppInstalled = () => {
      // Hide the app-provided install promotion
      clearPrompt();
      setIsInstalled(true);
      console.log('✅ PWA Installed successfully!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [setDeferredPrompt, setIsInstalled, clearPrompt]);

  // Global Auto-install check from QR code URL
  const { triggerInstall, showInstallModal, setShowInstallModal } = usePWAStore();
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('install') === '1') {
      const timer = setTimeout(() => {
        triggerInstall();
        // Clean up URL parameter
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }, 1500); // 1.5s to ensure app is ready
      return () => clearTimeout(timer);
    }
  }, [triggerInstall]);

  // Apply theme to document
  const theme = useSettingsStore(s => s.theme);
  useEffect(() => {
    const finalTheme = isBot() ? 'dark' : theme;
    document.documentElement.setAttribute('data-theme', finalTheme);
  }, [theme]);

  // Apply global accent color
  const accentColor = useSettingsStore(s => s.accentColor);
  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', accentColor);
    // Also update glow for consistency
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
    }
    const rgb = hexToRgb(accentColor);
    if (rgb) {
      document.documentElement.style.setProperty('--color-primary-glow', `rgba(${rgb}, 0.5)`);
      // Update gradient to use the accent color (using theme-aware end color?)
      // Note: We keep the hardcoded end colors for now or we could make them dynamic relative to theme
      // For now, let's just update the start color which is the primary one
      // document.documentElement.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${accentColor} 0%, ${accentColor} 100%)`);
    }
  }, [accentColor]);

  // Subscribe to global config for maintenance mode
  useEffect(() => {
    const unsubscribe = subscribeToGlobalConfig((config) => {
      if (config) {
        setIsMaintenance(config.maintenance);
      }
      setConfigLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Safety timeout: force loading to finish if it hangs too long (5s)
  // This ensures bots and slow connections eventually see the app
  useEffect(() => {
    if (loading || !configLoaded) {
      const timer = setTimeout(() => {
        console.warn('[App] Loading timeout reached - forcing render');
        if (loading) setLoading(false);
        if (!configLoaded) setConfigLoaded(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, configLoaded, setLoading]);

  // Show loading screen while initializing auth or config
  // Skip loading screen for bots OR if we are on a prerendered page
  // This avoids flickering the loading screen over static content
  const isPrerendered = typeof document !== 'undefined' && document.body.classList.contains('is-prerendered');
  
  if ((loading || !configLoaded) && !isBot() && !isPrerendered) {
    return <LoadingScreen />;
  }

  // Show maintenance screen if active and user is not admin
  // We allow the check to pass if userProfile.isAdmin is true
  // We also allow access to the auth page so admins can log in
  const isAuthPage = window.location.pathname.includes('/auth');

  if (isMaintenance && userProfile?.isSuperAdmin !== true && !isAuthPage) {
    return <MaintenanceScreen />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <BotAwareSuspense>
          <Routes>
            {/* Root redirect to language prefix */}
            <Route path="/" element={<RootRedirect />} />

            {/* Language-prefixed routes */}
            <Route path="/:lang" element={<LanguageManager />}>
              <Route index element={<Opening />} />
              <Route path="form" element={<FormSurvey />} />
              <Route path="form/thank-you" element={<FormSurveyThankYou />} />
              <Route path="challenges" element={<Challenges />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="feedback-admin" element={<FeedbackList />} />
              <Route path="changelog" element={<Changelog />} />
              <Route path="auth" element={<Auth />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="library" element={<Library />} />
              <Route path="users/:uid/library" element={<Library />} />
              <Route path="discover" element={<Discover />} />
              <Route path="social" element={<Social />} />
              <Route path="work/:id" element={<WorkDetails />} />
              <Route path="profile" element={<Profile />} />
              <Route path="profile/:uid" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="schedule" element={<Schedule />} />
              <Route path="character/:id" element={<CharacterDetails />} />
              <Route path="person/:id" element={<PersonDetails />} />

              <Route path="legal" element={<Legal />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="terms" element={<Terms />} />
              <Route path="contact" element={<Contact />} />
              <Route path="about" element={<About />} />
              <Route path="credits" element={<Credits />} />

              <Route path="donors" element={<Donors />} />
              <Route path="lens" element={<Lens />} />
              <Route path="news" element={<NewsIndex />} />
              <Route path="news/article/:slug" element={<NewsArticle />} />

              <Route path="admin" element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="system" element={<AdminSystem />} />
                <Route path="social-generator" element={<AdminSocialGenerator />} />
                <Route path="survey" element={<AdminSurvey />} />
                <Route path="assets" element={<Assets />} />
              </Route>
            </Route>

            {/* Fallback for non-prefixed paths */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BotAwareSuspense>
        <MobileMenuFAB />
      </BrowserRouter>
      <InstallInstructionsModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
    </ToastProvider >
  )
}

export default App
