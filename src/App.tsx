/**
 * Root application component
 * Routes, global modals, auth sync, and maintenance gate
 */
import { logger } from '@/utils/logger';
import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MaintenanceScreen } from '@/components/ui/MaintenanceScreen';
import { useAuthStore } from '@/store/authStore';
import { usePWAStore } from '@/store/pwaStore';
import {
  subscribeToGlobalConfig
} from '@/firebase/firestore';
import { ToastProvider } from '@/context/ToastContext';
import { isBot } from '@/utils/isBot';

// Pages (lazy loaded)
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
const Notifications = lazy(() => import('@/pages/Notifications'));
const TierListFeed = lazy(() => import('@/pages/tierlist/TierListFeed'));
const CreateTierList = lazy(() => import('@/pages/tierlist/CreateTierList'));
const ViewTierList = lazy(() => import('@/pages/tierlist/ViewTierList'));

const FormSurvey = lazy(() => import('@/pages/FormSurvey'));
const FormSurveyThankYou = lazy(() => import('@/pages/FormSurveyThankYou'));

const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));
const Contact = lazy(() => import('@/pages/Contact'));
const About = lazy(() => import('@/pages/About'));


const Lens = lazy(() => import('@/pages/Lens'));
const NewsIndex = lazy(() => import('@/pages/NewsIndex'));
const NewsArticle = lazy(() => import('@/pages/NewsArticle'));
const NotFound = lazy(() => import('@/pages/NotFound'));

import { AdminLayout } from '@/components/admin/AdminLayout';
import { RequireAdmin } from '@/components/admin/RequireAdmin';
import { InstallInstructionsModal } from '@/components/pwa/InstallInstructionsModal';
import { MobileMenuFAB } from '@/components/layout/MobileMenuFAB';
import { UsernameSelectionModal } from '@/components/auth/UsernameSelectionModal';
import { XPGainToast } from '@/components/gamification/XPGainToast';
import { LevelUpModal } from '@/components/gamification/LevelUpModal';
import { AvatarSelectionModal } from '@/components/auth/AvatarSelectionModal';
import { ReloadPrompt } from '@/components/pwa/ReloadPrompt';
import { ScrollToTop } from '@/components/layout/ScrollToTop';


import { useAuthSync } from '@/hooks/useAuthSync';
import { usePWAHandler } from '@/hooks/usePWAHandler';
import { useThemeManager } from '@/hooks/useThemeManager';
import { useMounted } from '@/hooks/useMounted';
import { useFirestoreSync } from '@/hooks/useFirestoreSync';
import { useLanguageDetection } from '@/hooks/useLanguageDetection';

// Skip loading spinners for bots / prerendered pages
const BotAwareSuspense = ({ children }: { children: React.ReactNode }) => {
  const isMounted = useMounted();
  const isPrerendered = typeof document !== 'undefined' && document.body.classList.contains('is-prerendered');
  const fallback = !isMounted || isBot() || isPrerendered ? null : <LoadingScreen />;
  return <Suspense fallback={fallback}>{children}</Suspense>;
};

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/Users'));
const AdminFeedback = lazy(() => import('@/pages/admin/FeedbackAdmin'));
const AdminSystem = lazy(() => import('@/pages/admin/SystemLogs'));
const AdminSurvey = lazy(() => import('@/pages/admin/SurveyDashboard'));
const AdminGrowthAnalytics = lazy(() => import('@/pages/admin/analytics/Growth'));
const AdminEngagementAnalytics = lazy(() => import('@/pages/admin/analytics/Engagement'));
const AdminRetentionAnalytics = lazy(() => import('@/pages/admin/analytics/Retention'));
const AdminHealth = lazy(() => import('@/pages/admin/Health'));


const LanguageManager = () => {
  const { handleLanguageManagerRedirect } = useLanguageDetection();
  const redirect = handleLanguageManagerRedirect();

  if (redirect === 'not_found') {
    return (
      <BotAwareSuspense>
        <NotFound />
      </BotAwareSuspense>
    );
  }

  if (redirect) {
    return <Navigate to={`${redirect.target}${redirect.search}`} replace />;
  }

  return <Outlet />;
};

const RootRedirect = () => {
  const { handleRootRedirect } = useLanguageDetection();
  const redirect = handleRootRedirect();

  if (redirect === '404') {
    return <div className="flex h-screen items-center justify-center">404 - File Not Found</div>;
  }

  if (redirect === 'not_found') {
    return (
      <BotAwareSuspense>
        <NotFound />
      </BotAwareSuspense>
    );
  }

  if (redirect) {
    return <Navigate to={`${redirect.target}${redirect.search}`} replace />;
  }

  return null;
};

function App() {
  const { userProfile, loading, setLoading } = useAuthStore();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const { showInstallModal, setShowInstallModal } = usePWAStore();


  useAuthSync();
  usePWAHandler();
  useThemeManager();
  useFirestoreSync();

  // Maintenance mode toggle
  useEffect(() => {
    const unsubscribe = subscribeToGlobalConfig((config) => {
      if (config) setIsMaintenance(config.maintenance);
      setConfigLoaded(true);
    });
    return () => unsubscribe();
  }, []);

  // Force render after 5s timeout to avoid infinite loading
  useEffect(() => {
    if (loading || !configLoaded) {
      const timer = setTimeout(() => {
        logger.warn('[App] Loading timeout reached - forcing render');
        if (loading) setLoading(false);
        if (!configLoaded) setConfigLoaded(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [loading, configLoaded, setLoading]);

  const isPrerendered = typeof document !== 'undefined' && document.body.classList.contains('is-prerendered');

  if ((loading || !configLoaded) && !isBot() && !isPrerendered) {
    return <LoadingScreen />;
  }

  const isAuthPage = window.location.pathname.includes('/auth');
  if (isMaintenance && userProfile?.isSuperAdmin !== true && !isAuthPage) {
    return <MaintenanceScreen />;
  }

  return (
    <ToastProvider>
      <BrowserRouter>
        <ScrollToTop />
        <UsernameSelectionModal />
        <AvatarSelectionModal />
        <XPGainToast />
        <LevelUpModal />
        <BotAwareSuspense>
          <Routes>

            <Route path="/" element={<RootRedirect />} />


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

              <Route path="tierlist" element={<TierListFeed />} />
              <Route path="tierlist/create" element={<CreateTierList />} />
              <Route path="tierlist/:id" element={<ViewTierList />} />

              <Route path="admin" element={
                <RequireAdmin>
                  <AdminLayout />
                </RequireAdmin>
              }>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="system" element={<AdminSystem />} />
                <Route path="survey" element={<AdminSurvey />} />
                <Route path="assets" element={<Assets />} />
                <Route path="analytics/growth" element={<AdminGrowthAnalytics />} />
                <Route path="analytics/engagement" element={<AdminEngagementAnalytics />} />
                <Route path="analytics/retention" element={<AdminRetentionAnalytics />} />
                <Route path="health" element={<AdminHealth />} />
              </Route>


              <Route path="*" element={<NotFound />} />
            </Route>


            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </BotAwareSuspense>
        <MobileMenuFAB />
      </BrowserRouter>
      <InstallInstructionsModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />
      <ReloadPrompt />
    </ToastProvider >
  )
}

export default App
