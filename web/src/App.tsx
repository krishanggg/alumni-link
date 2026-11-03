import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import { ScopeProvider } from './contexts/ScopeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { GlobalLoadingBar } from './components/shared/GlobalLoadingBar';
import { SessionExpiredModal } from './components/shared/SessionExpiredModal';
import { RouteLoadingFallback } from './components/shared/RouteLoadingFallback';
import { SETTINGS_ROUTE } from './config/navigation';
import { NavigationFocusHandoffProvider } from './contexts/NavigationFocusHandoffProvider';
import { useFeedbackInboxRealtime } from './hooks/useFeedbackRealtime';
// Eager-loaded: it's the first thing an unauthenticated visitor sees, so a lazy chunk would cause a Suspense flash.
import LoginPage from './pages/auth/LoginPage';

import { queryClient } from './lib/queryClient';
// Preloadable (see lazyPages): the sidebar warms these on hover/idle, and the
// list pages warm the two form routes on hover of their add/edit triggers.
import {
  AdminDashboardPage,
  AlumniListPage,
  BatchListPage,
  ReportsPage,
  FeedbackPage,
  AnnouncementListPage,
  SchoolListPage,
  UserManagementPage,
  PendingApprovalsPage,
  ProfileSettings,
  AlumniFormPage,
  AnnouncementComposerPage,
} from './routes/lazyPages';

import { ALUMNI_WEB_ENABLED } from './config/features';

const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));
const WebAccessUnavailablePage = lazy(() => import('./pages/auth/WebAccessUnavailablePage'));
const BatchDetailRoute = lazy(() => import('./pages/batches/BatchDetailRoute'));
const BatchComparePage = lazy(() => import('./pages/batches/BatchComparePage'));
const SecuritySettings = lazy(() => import('./pages/settings/SecuritySettings'));
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'));
const SystemInfoPage = lazy(() => import('./pages/settings/SystemInfoPage'));
const AuditLogsPage = lazy(() => import('./pages/settings/AuditLogsPage'));
const BackupRestorePage = lazy(() => import('./pages/settings/BackupRestorePage'));
const PermissionDeniedPage = lazy(() => import('./pages/errors/PermissionDeniedPage'));
const NotFoundPage = lazy(() => import('./pages/errors/NotFoundPage'));

const SETTINGS_SUBTITLES: Record<string, string> = {
  '/settings/security': 'Password and sign-in security',
  '/settings/notifications': 'Notification preferences',
  '/settings/system': 'System status and application details',
  '/settings/audit-logs': 'Review system activity',
  '/settings/backup': 'Manage system backups',
};

function getSettingsSubtitle(pathname: string, isAlumni: boolean): string {
  if (pathname === '/settings/profile') {
    if (isAlumni) {
      return 'Your profile and directory privacy';
    }

    return 'Profile and account details';
  }

  return SETTINGS_SUBTITLES[pathname] ?? 'Settings and account preferences';
}

function SettingsShell({ children, contentScrollable }: { children: ReactNode; contentScrollable?: boolean }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const subtitle = getSettingsSubtitle(pathname, user?.role === 'alumni');

  return (
    <AppShell title="Settings" subtitle={subtitle} contentScrollable={contentScrollable}>
      {children}
    </AppShell>
  );
}

function FeedbackRealtimeBridge() {
  const { user } = useAuth();
  const isFeedbackAdmin = user?.role === 'super_admin' || user?.role === 'school_admin';

  useFeedbackInboxRealtime(isFeedbackAdmin ? user.id : null);

  return null;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobalLoadingBar />
      <AuthProvider>
        <FeedbackRealtimeBridge />
        <SessionExpiredModal />
        <NavigationFocusHandoffProvider>
        <ToastProvider>
        <ScopeProvider>
        <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/web-access-unavailable" element={<WebAccessUnavailablePage />} />
        <Route path="/403" element={<PermissionDeniedPage />} />

        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Dashboard" subtitle="Alumni activity and records at a glance"><AdminDashboardPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/schools"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AppShell title="Schools" subtitle="Manage registered schools" contentScrollable={false}><SchoolListPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <AppShell title="Users" subtitle="Manage system users and their accounts" contentScrollable={false}><UserManagementPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/pending-approvals"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Pending Approvals" subtitle="Review and process alumni registration requests" contentScrollable={false}><PendingApprovalsPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alumni"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Alumni" subtitle="Manage alumni records" contentScrollable={false}><AlumniListPage key="active" initialStatus="active" /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alumni/archived"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Archived Alumni" subtitle="Records removed from the active directory" contentScrollable={false}><AlumniListPage key="archived" initialStatus="archived" /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alumni/new"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Add New Alumni" subtitle="Create an alumni record"><AlumniFormPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alumni/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Edit Alumni" subtitle="Update this alumni record"><AlumniFormPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/batches"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']} requireApproved>
              <AppShell title="Batch Tracking" subtitle="Graduation cohorts and statistics"><BatchListPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/batches/compare"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Compare Batches" subtitle="Select 2 to 5 graduation years to compare side by side."><BatchComparePage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/batches/:year"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']} requireApproved>
              <BatchDetailRoute />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']} requireApproved>
              <AppShell title="Reports" subtitle="Reports generated from alumni records"><ReportsPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/announcements"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Announcements" subtitle="Manage announcements" contentScrollable={false}><AnnouncementListPage key="all" initialStatus="all" /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/announcements/archived"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Archived Announcements" subtitle="No longer shown to alumni" contentScrollable={false}><AnnouncementListPage key="archived" initialStatus="archived" /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/announcements/new"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Compose Announcement" subtitle="Draft and publish an announcement"><AnnouncementComposerPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/announcements/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Edit Announcement" subtitle="Update this announcement"><AnnouncementComposerPage /></AppShell>
            </ProtectedRoute>
          }
        />

        {!ALUMNI_WEB_ENABLED && (
          <>
            <Route path="/dashboard" element={<Navigate to="/web-access-unavailable" replace />} />
            <Route path="/directory" element={<Navigate to="/web-access-unavailable" replace />} />
            <Route path="/announcements/mine" element={<Navigate to="/web-access-unavailable" replace />} />
            <Route path="/register" element={<Navigate to="/web-access-unavailable" replace />} />
            <Route path="/pending-approval" element={<Navigate to="/web-access-unavailable" replace />} />
            <Route path="/rejected" element={<Navigate to="/web-access-unavailable" replace />} />
            <Route path="/complete-profile" element={<Navigate to="/web-access-unavailable" replace />} />
          </>
        )}

        <Route
          path={SETTINGS_ROUTE.path}
          element={<Navigate to={SETTINGS_ROUTE.defaultPath} replace />}
        />

        <Route
          path="/feedback"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']}>
              <AppShell title="Help & support" subtitle="Private conversations between School Admins and Super Admins." contentScrollable={false}><FeedbackPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/profile"
          element={
            <ProtectedRoute requireApproved allowProfileSettingsForApprovedAlumni>
              <SettingsShell><ProfileSettings /></SettingsShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/security"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']} requireApproved>
              <SettingsShell><SecuritySettings /></SettingsShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/notifications"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'school_admin']} requireApproved>
              <SettingsShell><NotificationSettings /></SettingsShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/system"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SettingsShell><SystemInfoPage /></SettingsShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/audit-logs"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SettingsShell contentScrollable={false}><AuditLogsPage /></SettingsShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/backup"
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SettingsShell><BackupRestorePage /></SettingsShell>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />

        </Routes>
        </Suspense>
        </ScopeProvider>
        </ToastProvider>
        </NavigationFocusHandoffProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
