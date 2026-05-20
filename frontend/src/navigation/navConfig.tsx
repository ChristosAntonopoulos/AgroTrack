import React from 'react';
import { TFunction } from 'i18next';
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
  labelKey: string;
};

export type NavItem = {
  path: string;
  labelKey: string;
  labelKeyOwner?: string;
  labelKeyProducer?: string;
  icon: React.ReactNode;
  roles: AppRole[];
  section: NavSectionId;
};

export const navSections: NavSection[] = [
  { id: 'command', labelKey: 'sections.command' },
  { id: 'work', labelKey: 'sections.work' },
  { id: 'operations', labelKey: 'sections.operations' },
  { id: 'insights', labelKey: 'sections.insights' },
  { id: 'compliance', labelKey: 'sections.compliance' },
  { id: 'account', labelKey: 'sections.account' },
];

export const navItems: NavItem[] = [
  {
    path: '/dashboard',
    labelKey: 'items.dashboard',
    icon: <Home />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    section: 'command',
  },
  {
    path: '/today',
    labelKey: 'items.today',
    icon: <Route />,
    roles: ['Producer'],
    section: 'work',
  },
  {
    path: '/fields',
    labelKey: 'items.fields',
    labelKeyOwner: 'items.fieldsOwner',
    icon: <Layers />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'operations',
  },
  {
    path: '/tasks',
    labelKey: 'items.tasks',
    labelKeyProducer: 'items.tasksProducer',
    icon: <CheckSquare />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'operations',
  },
  {
    path: '/approvals',
    labelKey: 'items.approvals',
    icon: <ClipboardCheck />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'operations',
  },
  {
    path: '/issues',
    labelKey: 'items.issues',
    icon: <AlertTriangle />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'operations',
  },
  {
    path: '/calendar',
    labelKey: 'items.calendar',
    icon: <Calendar />,
    roles: ['FieldOwner', 'Producer'],
    section: 'operations',
  },
  {
    path: '/analytics',
    labelKey: 'items.analytics',
    icon: <BarChart2 />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'insights',
  },
  {
    path: '/reports',
    labelKey: 'items.reports',
    icon: <FileText />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'insights',
  },
  {
    path: '/ministry',
    labelKey: 'items.ministry',
    icon: <Bell />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'compliance',
  },
  {
    path: '/settings',
    labelKey: 'items.settings',
    icon: <Settings />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'account',
  },
];

export const resolveNavItemLabel = (item: NavItem, role: AppRole, t: TFunction<'nav'>): string => {
  if (item.labelKeyOwner && role === 'FieldOwner') return t(item.labelKeyOwner);
  if (item.labelKeyProducer && role === 'Producer') return t(item.labelKeyProducer);
  return t(item.labelKey);
};

export const roleHomePath = (role: AppRole) => {
  if (role === 'Producer') return '/today';
  return '/dashboard';
};

export const isNavActive = (pathname: string, itemPath: string) => {
  if (itemPath === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  return pathname.startsWith(itemPath);
};

export const resolvePageTitle = (pathname: string, role: AppRole, t: TFunction<'nav'>) => {
  const matched = navItems.find((i) => isNavActive(pathname, i.path));
  if (matched) return resolveNavItemLabel(matched, role, t);

  if (pathname.includes('/new')) return t('breadcrumb.new');
  if (pathname.includes('/edit')) return t('breadcrumb.edit');
  return t('common:appName', { defaultValue: 'Olive Lifecycle' });
};

export const resolveBreadcrumbLabel = (
  segment: string,
  role: AppRole,
  t: TFunction<'nav'>
) => {
  const nav = navItems.find((i) => i.path.replace('/', '') === segment);
  if (nav) return resolveNavItemLabel(nav, role, t);

  if (segment === 'new') return t('breadcrumb.new');
  if (segment === 'edit') return t('breadcrumb.edit');

  if (/^[a-zA-Z0-9_-]{6,}$/.test(segment)) return t('breadcrumb.details');

  return segment.charAt(0).toUpperCase() + segment.slice(1);
};
