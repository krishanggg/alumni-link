import { Link, useLocation } from 'react-router-dom';
import {
  UserRound, ShieldCheck, Mail, DatabaseBackup, Info, ScrollText, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

import { ALUMNI_WEB_ENABLED } from '../../config/features';

interface SettingsLayoutProps {
  children: React.ReactNode;
  disableNav?: boolean;
  /** Fill the available height; regular settings content scrolls in the main panel. */
  fillHeight?: boolean;
}

const ICONS: Record<string, LucideIcon> = {
  '/settings/profile': UserRound,
  '/settings/security': ShieldCheck,
  '/settings/notifications': Mail,
  '/settings/backup': DatabaseBackup,
  '/settings/audit-logs': ScrollText,
  '/settings/system': Info,
};

export function SettingsLayout({ children, disableNav = false, fillHeight = true }: SettingsLayoutProps) {
  const { user } = useAuth();
  const location = useLocation();
  const isSuperAdmin = user?.role === 'super_admin';

  const adminLinks = [
    { path: '/settings/profile', label: 'Profile' },
    { path: '/settings/security', label: 'Security' },
    { path: '/settings/notifications', label: 'Email Notifications' },
    { path: '/settings/backup', label: 'Backup & Restore' },
    { path: '/settings/audit-logs', label: 'Audit Logs' },
    { path: '/settings/system', label: 'System Information' },
  ];

  const personalSettingsLinks = [
    { path: '/settings/profile', label: 'Profile' },
    { path: '/settings/security', label: 'Security' },
    { path: '/settings/notifications', label: 'Email Notifications' },
  ];

  const alumniLinks = user?.role === 'alumni' && !ALUMNI_WEB_ENABLED
    ? [personalSettingsLinks[0]]
    : personalSettingsLinks;

  const links = isSuperAdmin ? adminLinks : alumniLinks;

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className={`flex flex-col gap-6 p-6 ${fillHeight ? 'h-full min-h-0 overflow-hidden' : 'min-h-full'}`}>
      <div className={`flex min-w-0 flex-1 flex-col gap-6 lg:flex-row ${fillHeight ? 'min-h-0' : ''}`}>
        <aside className="w-full min-w-0 shrink-0 self-start rounded-lg border border-outline-variant/70 bg-white p-2 shadow-card lg:w-64">
          <nav aria-label="Settings sections">
            <ul className="space-y-0.5">
              {links.map((link) => {
                const Icon = ICONS[link.path];
                const active = isActive(link.path);
                return (
                  <li key={link.path}>
                    {disableNav ? (
                      <span className="flex min-w-0 items-center gap-2.5 rounded-md px-3 py-2 text-body-md text-on-surface-variant opacity-50">
                        <Icon size={17} aria-hidden="true" />
                        <span className="min-w-0 break-words">{link.label}</span>
                      </span>
                    ) : (
                      <Link
                        to={link.path}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-w-0 items-center gap-2.5 rounded-md px-3 py-2 text-body-md font-label-md transition-colors ${
                          active
                            ? 'bg-accent/10 text-accent'
                            : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                        }`}
                      >
                        <Icon size={17} aria-hidden="true" />
                        <span className="min-w-0 break-words">{link.label}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <main className={`thin-scrollbar flex min-w-0 flex-1 flex-col ${fillHeight ? 'min-h-0 overflow-y-auto' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
