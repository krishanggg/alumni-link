import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, CircleHelp } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useFeedbackUnreadCount } from '../../hooks/useFeedback';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { adminNavItems, alumniNavItems, schoolAdminNavItems } from '../../config/navigation';
import { useNavigationFocusHandoff } from '../../contexts/navigationFocusHandoffContext';
import { getScrollPosition, saveScrollPosition } from '../../utils/scrollPositions';
import { PageLoadingFallback } from '../shared/PageLoadingFallback';
import { SchoolSeal } from '../shared/icons/SchoolSeal';
import { ScopeHeaderControl } from './ScopeHeaderControl';
import { SidebarNav } from './SidebarNav';
import { SidebarAccountMenu } from './SidebarAccountMenu';
import { RouteTransition } from './RouteTransition';

interface AppShellProps {
  title: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  contentScrollable?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  school_admin: 'School Admin',
  alumni: 'Alumni',
};

const MOBILE_VIEWPORT_QUERY = '(max-width: 767px)';

function getIsMobileViewport() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_VIEWPORT_QUERY).matches
    : false;
}

export function AppShell({ title, subtitle, headerActions, children, contentScrollable = true }: AppShellProps) {
  const { user, logout } = useAuth();
  const { requestNavigationFocusRestore, clearNavigationFocusRestore } = useNavigationFocusHandoff();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);
  const drawerRef = useRef<HTMLElement>(null);
  const drawerToggleRef = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const navItems = user?.role === 'super_admin'
    ? adminNavItems
    : user?.role === 'school_admin'
      ? schoolAdminNavItems
      : alumniNavItems;
  const { data: unreadData } = useFeedbackUnreadCount(user?.role === 'super_admin' || user?.role === 'school_admin');
  const unreadFeedbackCount = unreadData?.unread_count ?? 0;
  const scrollKey = `${location.pathname}${location.search}`;

  const handleDrawerClose = useCallback(() => {
    clearNavigationFocusRestore();
    setIsDrawerOpen(false);
  }, [clearNavigationFocusRestore]);

  const handleDrawerToggle = useCallback(() => {
    clearNavigationFocusRestore();
    setIsDrawerOpen((open) => !open);
  }, [clearNavigationFocusRestore]);

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_VIEWPORT_QUERY);
    const handleViewportChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) {
        handleDrawerClose();
      }
    };

    setIsMobileViewport(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleViewportChange);
      return () => mediaQuery.removeEventListener('change', handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, [handleDrawerClose]);

  useEffect(() => {
    const main = mainRef.current;
    if (!main) {
      return undefined;
    }

    if (!contentScrollable) {
      main.scrollTop = 0;
      return undefined;
    }

    const target = getScrollPosition(scrollKey);
    // Ignore scroll events while restoring so a clamped intermediate value doesn't get saved as the real position.
    let restoring = true;
    main.scrollTop = target;

    // Content behind a skeleton may not be tall enough to reach `target` on first paint, so keep nudging until it is.
    let frame: number;
    let attempts = 0;
    const tryRestore = () => {
      if (main.scrollTop < target && attempts < 20) {
        main.scrollTop = target;
        attempts += 1;
        frame = requestAnimationFrame(tryRestore);
      } else {
        restoring = false;
      }
    };
    frame = requestAnimationFrame(tryRestore);

    function onScroll() {
      if (restoring) {
        return;
      }
      saveScrollPosition(scrollKey, main!.scrollTop);
    }
    main.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      main.removeEventListener('scroll', onScroll);
    };
  }, [contentScrollable, scrollKey]);

  useFocusTrap(isDrawerOpen, drawerRef, handleDrawerClose, true, drawerToggleRef);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const accountMeta =
    user?.role === 'school_admin'
      ? user.school?.name ?? ROLE_LABELS.school_admin
      : user?.role
        ? ROLE_LABELS[user.role]
        : null;

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar-gradient">
      <div className="sidebar-brand px-6 py-6 rail:px-0 rail:text-center desktop:px-6 desktop:text-left">
        <div className="flex items-center gap-2 rail:hidden">
          <SchoolSeal size={26} className="shrink-0 text-on-primary" />
          <div>
            <p className="text-headline-sm font-headline-sm text-on-primary">AlumniLink</p>
            <p className="text-label-sm text-on-primary/60">Alumni Tracking System</p>
          </div>
        </div>
        <div className="hidden rail:flex rail:justify-center">
          <SchoolSeal size={28} className="text-on-primary" />
        </div>
      </div>

      <SidebarNav items={navItems} />

      <div className="mt-auto space-y-0.5 border-t border-white/12 px-3 py-3 rail:px-2">
        {user?.role !== 'alumni' && (
          <button
            type="button"
            onClick={() => navigate('/feedback')}
            title="Help & support"
            aria-label="Help & support"
            className="flex w-full items-center gap-3 rounded-DEFAULT px-3 py-2 text-body-md text-on-primary/80 transition-colors hover:bg-sidebar-hover hover:text-on-primary rail:justify-center rail:gap-0 rail:px-2"
          >
            <CircleHelp className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="rail:hidden">Help &amp; support</span>
            {unreadFeedbackCount > 0 && (
              <span
                aria-label={`${unreadFeedbackCount} unread feedback conversation${unreadFeedbackCount === 1 ? '' : 's'}`}
                className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-label-sm font-label-sm text-accent"
              >
                {unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount}
              </span>
            )}
          </button>
        )}
        <SidebarAccountMenu
          name={user?.name}
          meta={accountMeta}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        ref={drawerRef}
        id="mobile-navigation-drawer"
        role={isDrawerOpen ? 'dialog' : undefined}
        aria-modal={isDrawerOpen ? true : undefined}
        aria-hidden={isMobileViewport && !isDrawerOpen}
        aria-label="Navigation"
        onClickCapture={(event) => {
          if (!isMobileViewport || !isDrawerOpen) {
            return;
          }

          const target = event.target;
          const link = target instanceof Element
            ? target.closest<HTMLAnchorElement>('a[href]')
            : null;
          if (link) {
            requestNavigationFocusRestore({
              sourcePathname: location.pathname,
              destinationPathname: link.pathname,
              drawerWasOpen: true,
            });
          }
        }}
        // All supported evergreen browsers have native inert support (baseline since 2023).
        inert={isMobileViewport && !isDrawerOpen}
        className="md:static md:z-auto md:translate-x-0 rail:w-[var(--spacing-sidebar-rail-width)] fixed inset-y-0 left-0 z-40 h-full w-[var(--spacing-sidebar-width)] -translate-x-full shrink-0 transition-[width,transform] duration-200 data-[open=true]:translate-x-0"
        data-open={isDrawerOpen}
      >
        {sidebar}
      </aside>

      {isDrawerOpen && (
        <div
          data-testid="mobile-navigation-backdrop"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={handleDrawerClose}
          aria-hidden="true"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="relative z-50 flex h-14 shrink-0 items-center gap-3 bg-white px-4 shadow-header sm:gap-4 sm:px-5">
          <button
            ref={drawerToggleRef}
            data-navigation-toggle
            type="button"
            onClick={handleDrawerToggle}
            aria-label="Toggle navigation"
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-navigation-drawer"
            className="tap-target -ml-1 rounded-DEFAULT p-2 text-on-surface-variant hover:bg-surface-container md:hidden"
          >
            {isDrawerOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>

          <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
            <h1 className="shrink-0 text-title-md font-headline-lg text-on-surface">{title}</h1>
            {subtitle && (
              <p className="hidden min-w-0 truncate text-body-sm text-on-surface-variant before:mr-2.5 before:inline-block before:h-1 before:w-1 before:rounded-full before:bg-outline before:align-middle sm:block">
                {subtitle}
              </p>
            )}
          </div>

          {/* App-wide school scope (Super Admin) sits alongside page-level
              actions; identity, help and logout moved to the sidebar footer. */}
          <div className="flex shrink-0 items-center gap-2">
            <ScopeHeaderControl />
            {headerActions && (
              <div className="flex items-center gap-0.5 rounded-full bg-surface-container-low p-1">
                {headerActions}
              </div>
            )}
          </div>
        </header>

        <main ref={mainRef} className={`bg-app-canvas bg-app-canvas--shell flex min-w-0 flex-1 flex-col overflow-x-hidden ${contentScrollable ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
          <Suspense fallback={<PageLoadingFallback />}>
            <RouteTransition>{children}</RouteTransition>
          </Suspense>
        </main>
      </div>

    </div>
  );
}
