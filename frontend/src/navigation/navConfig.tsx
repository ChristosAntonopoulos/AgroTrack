import React from 'react';
import {
  Home,
  Layers,
  CheckSquare,
  BarChart2,
  FileText,
  Calendar,
  Bell,
  Route,
  ClipboardCheck,
  AlertTriangle,
  Settings,
} from 'lucide-react';

export type AppRole = 'FieldOwner' | 'Producer' | 'Agronomist' | 'Administrator' | 'ServiceProvider' | '';

export type NavSectionId = 'command' | 'work' | 'operations' | 'insights' | 'compliance' | 'account';

export type NavSection = {
  id: NavSectionId;
  label: string;
};

export type NavItem = {
  path: string;
  label: (role: AppRole) => string;
  icon: React.ReactNode;
  roles: AppRole[];
  section: NavSectionId;
};

export const navSections: NavSection[] = [
  { id: 'command', label: 'Command center' },
  { id: 'work', label: 'Work' },
  { id: 'operations', label: 'Operations' },
  { id: 'insights', label: 'Insights' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'account', label: 'Account' },
];

export const navItems: NavItem[] = [
  {
    path: '/dashboard',
    label: () => 'Dashboard',
    icon: <Home />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    section: 'command',
  },
  {
    path: '/today',
    label: () => 'Today',
    icon: <Route />,
    roles: ['Producer'],
    section: 'work',
  },
  {
    path: '/fields',
    label: (role) => (role === 'FieldOwner' ? 'My Fields' : 'Fields'),
    icon: <Layers />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'operations',
  },
  {
    path: '/tasks',
    label: (role) => (role === 'Producer' ? 'My Tasks' : 'Tasks'),
    icon: <CheckSquare />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'operations',
  },
  {
    path: '/approvals',
    label: () => 'Approvals',
    icon: <ClipboardCheck />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'operations',
  },
  {
    path: '/issues',
    label: () => 'Issues',
    icon: <AlertTriangle />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'operations',
  },
  {
    path: '/calendar',
    label: () => 'Calendar',
    icon: <Calendar />,
    roles: ['FieldOwner', 'Producer'],
    section: 'operations',
  },
  {
    path: '/analytics',
    label: () => 'Analytics',
    icon: <BarChart2 />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'insights',
  },
  {
    path: '/reports',
    label: () => 'Reports',
    icon: <FileText />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'insights',
  },
  {
    path: '/ministry',
    label: () => 'Ministry',
    icon: <Bell />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'compliance',
  },
  {
    path: '/settings',
    label: () => 'Settings',
    icon: <Settings />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'account',
  },
];

export const roleHomePath = (role: AppRole) => {
  if (role === 'Producer') return '/today';
  return '/dashboard';
};

export const isNavActive = (pathname: string, itemPath: string) => {
  if (itemPath === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  return pathname.startsWith(itemPath);
};

export const resolvePageTitle = (pathname: string, role: AppRole) => {
  const matched = navItems.find((i) => isNavActive(pathname, i.path));
  if (matched) return matched.label(role);

  if (pathname.includes('/new')) return 'New';
  if (pathname.includes('/edit')) return 'Edit';
  return 'Olive Lifecycle';
};

export const resolveBreadcrumbLabel = (segment: string, role: AppRole) => {
  const nav = navItems.find((i) => i.path.replace('/', '') === segment);
  if (nav) return nav.label(role);

  if (segment === 'new') return 'New';
  if (segment === 'edit') return 'Edit';

  if (/^[a-zA-Z0-9_-]{6,}$/.test(segment)) return 'Details';

  return segment.charAt(0).toUpperCase() + segment.slice(1);
};

