import {
  LayoutDashboard,
  GraduationCap,
  Layers,
  FileText,
  Megaphone,
  School,
  UserCog,
  Settings,
  type LucideIcon,
} from 'lucide-react';

interface NavChild {
  label: string;
  path: string;
  badgeCount?: number;
}

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Uppercase section heading this item sits under in the sidebar. */
  group: string;
  badgeCount?: number;
  children?: NavChild[];
}

export const SETTINGS_ROUTE = {
  path: '/settings',
  defaultPath: '/settings/profile',
} as const;

export const adminNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard, group: 'Overview' },
  {
    label: 'Alumni',
    path: '/alumni',
    icon: GraduationCap,
    group: 'Manage',
    children: [
      { label: 'Active', path: '/alumni' },
      { label: 'Archived', path: '/alumni/archived' },
    ],
  },
  { label: 'Batch Tracking', path: '/batches', icon: Layers, group: 'Manage' },
  { label: 'Reports', path: '/reports', icon: FileText, group: 'Manage' },
  {
    label: 'Announcements',
    path: '/announcements',
    icon: Megaphone,
    group: 'Manage',
    children: [
      { label: 'All Announcements', path: '/announcements' },
      { label: 'Archived', path: '/announcements/archived' },
    ],
  },
  { label: 'Schools', path: '/schools', icon: School, group: 'System' },
  {
    label: 'Users',
    path: '/users',
    icon: UserCog,
    group: 'System',
    children: [
      { label: 'All Users', path: '/users' },
      { label: 'Pending Approvals', path: '/pending-approvals' },
    ],
  },
  { label: 'Settings', path: SETTINGS_ROUTE.path, icon: Settings, group: 'System' },
];

export const schoolAdminNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard, group: 'Overview' },
  {
    label: 'Alumni',
    path: '/alumni',
    icon: GraduationCap,
    group: 'Manage',
    children: [
      { label: 'Active', path: '/alumni' },
      { label: 'Archived', path: '/alumni/archived' },
    ],
  },
  { label: 'Batch Tracking', path: '/batches', icon: Layers, group: 'Manage' },
  { label: 'Reports', path: '/reports', icon: FileText, group: 'Manage' },
  {
    label: 'Announcements',
    path: '/announcements',
    icon: Megaphone,
    group: 'Manage',
    children: [
      { label: 'All Announcements', path: '/announcements' },
      { label: 'Archived', path: '/announcements/archived' },
    ],
  },
  { label: 'Pending Approvals', path: '/pending-approvals', icon: UserCog, group: 'System' },
  { label: 'Settings', path: SETTINGS_ROUTE.path, icon: Settings, group: 'System' },
];

export const alumniNavItems: NavItem[] = [
  { label: 'Settings', path: SETTINGS_ROUTE.path, icon: Settings, group: 'Account' },
];
