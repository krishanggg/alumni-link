import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

import type { NavItem } from '../../config/navigation';

import { MotionLink } from '../shared/MotionLink';
import { NavRailFlyout } from './NavRailFlyout';
import { usePressTap } from '../../hooks/usePressTap';
import { preloadNavRoute } from '../../routes/lazyPages';

interface SidebarNavProps {
  items: NavItem[];
}

function isItemActive(pathname: string, item: NavItem): boolean {
  if (item.children) {
    return getActiveChildPath(pathname, item) !== null;
  }

  return pathname === item.path || pathname.startsWith(`${item.path}/`);
}

// When a nav item's children have paths that are prefixes of one another
// (e.g. "/alumni" and "/alumni/archived"), naive prefix matching would mark
// both active. Only the single longest (most specific) matching child path
// should be highlighted.
function getActiveChildPath(pathname: string, item: NavItem): string | null {
  if (!item.children) {
    return null;
  }

  const matches = item.children.filter(
    (child) => pathname === child.path || pathname.startsWith(`${child.path}/`),
  );

  if (matches.length === 0) {
    return null;
  }

  return matches.reduce((longest, child) => (child.path.length > longest.path.length ? child : longest)).path;
}

function CountBadge({ count, label }: { count: number; label: string }) {
  if (count < 1) {
    return null;
  }

  return (
    <span
      aria-label={`${count} ${label}`}
      className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-white px-1.5 py-0.5 text-label-sm font-label-sm text-accent"
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function SidebarNav({ items }: SidebarNavProps) {
  const location = useLocation();
  const pressTap = usePressTap();

  // Parent sections start expanded; collapsing one is a plain user toggle that
  // sticks. If navigation lands in a section the user had collapsed, re-open it
  // so the active child is never hidden.
  const activeParentPath = items.find(
    (item) => item.children && isItemActive(location.pathname, item),
  )?.path;
  const [openPaths, setOpenPaths] = useState<Set<string>>(
    () => new Set(items.filter((item) => item.children).map((item) => item.path)),
  );

  useEffect(() => {
    if (!activeParentPath) {
      return;
    }
    setOpenPaths((prev) => (prev.has(activeParentPath) ? prev : new Set(prev).add(activeParentPath)));
  }, [activeParentPath]);

  function toggle(path: string) {
    setOpenPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 sidebar-scrollbar rail:px-2" aria-label="Primary">
      {items.map((item, index) => {
        const active = isItemActive(location.pathname, item);
        const activeChildPath = getActiveChildPath(location.pathname, item);
        const Icon = item.icon;
        const isOpen = openPaths.has(item.path);
        const showGroupHeading = index === 0 || items[index - 1].group !== item.group;

        return (
          <div key={item.path}>
            {showGroupHeading && (
              <p className="sidebar-group px-3 pb-1.5 pt-4 text-overline font-overline text-on-primary/55 first:pt-1 rail:hidden">
                {item.group}
              </p>
            )}

            {/* Rail band only (768-1199px): a hover/focus flyout replaces this
                link + the inline children list below, since neither fits the
                collapsed rail's width — see NavRailFlyout. */}
            {item.children && (
              <NavRailFlyout item={item} active={active} activeChildPath={activeChildPath} />
            )}

            {item.children ? (
              // The parent row navigates to its first child (its own `path`);
              // the chevron is a separate control that only expands/collapses.
              <div
                className={`flex items-center rounded-DEFAULT pr-1 transition-all duration-[var(--duration-fast)] rail:hidden ${
                  active
                    ? 'bg-white/10 text-on-primary'
                    : 'text-on-primary/80 hover:bg-sidebar-hover hover:text-on-primary'
                }`}
              >
                <MotionLink
                  to={item.path}
                  title={item.label}
                  aria-label={item.label}
                  onPointerEnter={() => preloadNavRoute(item.path)}
                  onFocus={() => preloadNavRoute(item.path)}
                  {...pressTap}
                  className={`flex flex-1 items-center gap-3 rounded-DEFAULT px-3 py-2 text-body-md ${
                    active ? 'font-label-md' : ''
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                  <CountBadge count={item.badgeCount ?? 0} label={`${item.label.toLowerCase()} pending`} />
                </MotionLink>
                <button
                  type="button"
                  onClick={() => toggle(item.path)}
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.label}`}
                  className="tap-target rounded-DEFAULT p-1 text-on-primary/60 transition-colors hover:bg-white/10 hover:text-on-primary"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-[var(--duration-fast)] ${
                      isOpen ? '' : '-rotate-90'
                    }`}
                    aria-hidden="true"
                  />
                </button>
              </div>
            ) : (
              <MotionLink
                to={item.path}
                title={item.label}
                aria-label={item.label}
                onPointerEnter={() => preloadNavRoute(item.path)}
                onFocus={() => preloadNavRoute(item.path)}
                {...pressTap}
                className={`flex items-center gap-3 rounded-DEFAULT px-3 py-2 text-body-md transition-all duration-[var(--duration-fast)] rail:justify-center rail:gap-0 rail:px-2 ${
                  active
                    ? 'bg-sidebar-active font-label-md text-on-primary'
                    : 'text-on-primary/80 hover:bg-sidebar-hover hover:text-on-primary'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className="rail:hidden">{item.label}</span>
                <CountBadge count={item.badgeCount ?? 0} label={`${item.label.toLowerCase()} pending`} />
              </MotionLink>
            )}

            {item.children && isOpen && (
              <div className="ml-[1.375rem] mt-0.5 mb-1 space-y-0.5 border-l border-white/20 pl-3.5 rail:hidden">
                {item.children.map((child) => {
                  const childActive = child.path === activeChildPath;
                  return (
                    <MotionLink
                      key={child.path}
                      to={child.path}
                      onPointerEnter={() => preloadNavRoute(child.path)}
                      onFocus={() => preloadNavRoute(child.path)}
                      {...pressTap}
                      className={`relative block rounded-DEFAULT px-2.5 py-1.5 text-label-md transition-all duration-[var(--duration-fast)] ${
                        childActive
                          ? 'font-label-md text-on-primary before:absolute before:-left-[0.9375rem] before:top-1.5 before:bottom-1.5 before:w-0.5 before:rounded-full before:bg-on-primary'
                          : 'text-on-primary/65 hover:bg-sidebar-hover hover:text-on-primary'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {child.label}
                        <CountBadge count={child.badgeCount ?? 0} label={`${child.label.toLowerCase()} pending`} />
                      </span>
                    </MotionLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
