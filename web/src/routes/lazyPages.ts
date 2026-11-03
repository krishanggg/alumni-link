import { lazyWithPreload } from '../lib/lazyWithPreload';

// Route pages that are targets of the sidebar nav. Defined as preloadable here
// (rather than a bare `lazy()` in App.tsx) so hovering/focusing a nav link — or
// going idle on a page — can start the chunk download before the click lands.
export const AdminDashboardPage = lazyWithPreload(() => import('../pages/dashboard/AdminDashboardPage'));
export const AlumniListPage = lazyWithPreload(() => import('../pages/alumni/AlumniListPage'));
export const BatchListPage = lazyWithPreload(() => import('../pages/batches/BatchListPage'));
export const ReportsPage = lazyWithPreload(() => import('../pages/reports/ReportsPage'));
export const FeedbackPage = lazyWithPreload(() => import('../pages/feedback/FeedbackPage'));
export const AnnouncementListPage = lazyWithPreload(() => import('../pages/announcements/AnnouncementListPage'));
export const SchoolListPage = lazyWithPreload(() => import('../pages/schools/SchoolListPage'));
export const UserManagementPage = lazyWithPreload(() => import('../pages/admin/UserManagementPage'));
export const PendingApprovalsPage = lazyWithPreload(() => import('../pages/admin/PendingApprovalsPage'));
export const ProfileSettings = lazyWithPreload(() => import('../pages/settings/ProfileSettings'));

// Form routes reached by a button click from a list page. They pull in heavy
// dependencies (the date-picker chunk, form schemas), so on a slow connection
// the first click otherwise stalls with no feedback. Callers preload the chunk
// on hover/focus of the trigger and on idle after the list mounts.
export const AlumniFormPage = lazyWithPreload(() => import('../pages/alumni/AlumniFormPage'));
export const AnnouncementComposerPage = lazyWithPreload(() => import('../pages/announcements/AnnouncementComposerPage'));

// Sidebar destinations → the chunk they render. Keyed by the exact nav `path`
// values in config/navigation.ts (`/settings` lands on ProfileSettings).
const NAV_PRELOAD: Record<string, () => Promise<unknown>> = {
  '/dashboard/admin': AdminDashboardPage.preload,
  '/alumni': AlumniListPage.preload,
  '/alumni/archived': AlumniListPage.preload,
  '/batches': BatchListPage.preload,
  '/reports': ReportsPage.preload,
  '/feedback': FeedbackPage.preload,
  '/announcements': AnnouncementListPage.preload,
  '/announcements/archived': AnnouncementListPage.preload,
  '/schools': SchoolListPage.preload,
  '/users': UserManagementPage.preload,
  '/pending-approvals': PendingApprovalsPage.preload,
  '/settings': ProfileSettings.preload,
};

/** Warm the chunk for a sidebar destination on hover/focus. No-op for unknown paths. */
export function preloadNavRoute(path: string): void {
  void NAV_PRELOAD[path]?.();
}
