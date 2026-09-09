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
  Wallet,
  Settings,
  Database,
  Handshake,
  Wheat,
  BookOpen,
} from 'lucide-react';
import { isEverydayAllowedPath, isEverydayPrimaryPath } from '../experience/catalog';
import { settingsService, pathForDefaultView } from '../services/settingsService';

export type AppRole = 'FieldOwner' | 'Producer' | 'Agronomist' | 'Administrator' | 'ServiceProvider' | '';

export type NavSectionId = 'command' | 'work' | 'operations' | 'insights' | 'compliance' | 'account';

export type NavSection = {
  id: NavSectionId;
  labelKey: string;
};

export type NavItem = {
  path: string;
  labelKey: string;
  icon: React.ReactNode;
  roles: AppRole[];
  section: NavSectionId;
  mockOnly?: boolean;
  /** Shown in phone bottom tab bar when visible for the user */
  mobilePrimary?: boolean;
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
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'work',
    mobilePrimary: true,
  },
  {
    path: '/fields',
    labelKey: 'items.fields',
    icon: <Layers />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'operations',
    mobilePrimary: true,
  },
  {
    path: '/chronologio',
    labelKey: 'items.chronologio',
    icon: <BookOpen />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    section: 'work',
  },
  {
    path: '/tasks',
    labelKey: 'items.tasks',
    icon: <CheckSquare />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'operations',
    mobilePrimary: true,
  },
  {
    path: '/partners',
    labelKey: 'items.partners',
    icon: <Handshake />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'operations',
    mobilePrimary: true,
  },
  {
    path: '/money',
    labelKey: 'items.money',
    icon: <Wallet />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    section: 'operations',
  },
  {
    path: '/calendar',
    labelKey: 'items.calendar',
    icon: <Calendar />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'operations',
  },
  {
    path: '/this-harvest',
    labelKey: 'items.thisHarvest',
    icon: <Wheat />,
    roles: ['FieldOwner', 'Administrator'],
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
    path: '/data-sources',
    labelKey: 'items.dataSources',
    icon: <Database />,
    roles: ['Administrator'],
    section: 'account',
  },
  {
    path: '/settings',
    labelKey: 'items.settings',
    icon: <Settings />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'account',
  },
];

export const resolveNavItemLabel = (item: NavItem, _role: AppRole, t: TFunction<'nav'>): string =>
  t(item.labelKey);

/** Shared visibility filter for sidebar and mobile bottom nav. */
export const filterNavItemsForUser = (
  items: NavItem[],
  userRole: AppRole,
  isEveryday: boolean,
  mockMode: boolean,
  familyModules?: ReadonlySet<string> | null
): NavItem[] => {
  return items.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if (item.mockOnly && !mockMode) return false;
    // Calendar, Ministry, and Dashboard are hidden from navigation (routes remain reachable by URL).
    if (item.path === '/calendar' || item.path === '/ministry' || item.path === '/dashboard') return false;
    if (isEveryday) {
      if (item.path === '/analytics' || item.path === '/reports' || item.path === '/data-sources') {
        return false;
      }
      if (item.path === '/money' || item.path === '/partners') return true;
      return isEverydayAllowedPath(item.path) || isEverydayPrimaryPath(item.path);
    }

    // Family members acting on a shared grove never see analytics/reports.
    if (familyModules && familyModules.size > 0) {
      if (item.path === '/analytics' || item.path === '/reports' || item.path === '/data-sources') {
        return false;
      }
      if (item.path === '/money' && !familyModules.has('money')) return false;
      if (item.path === '/this-harvest' && !familyModules.has('harvest')) return false;
      if (item.path === '/tasks' && !familyModules.has('tasks')) return false;
      if (item.path === '/fields' && !familyModules.has('fields')) return false;
    }

    return true;
  });
};

export const roleHomePath = (_role: AppRole, _experienceMode?: 'everyday' | 'full') => {
  const prefs = settingsService.getPreferences();
  if (prefs.defaultView) {
    return pathForDefaultView(prefs.defaultView);
  }
  return '/today';
};

export const isNavActive = (pathname: string, itemPath: string) => {
  if (itemPath === '/dashboard') return pathname === '/dashboard' || pathname === '/';
  return pathname.startsWith(itemPath);
};

export const resolvePageTitle = (pathname: string, role: AppRole, t: TFunction<'nav'>) => {
  const matched = navItems.find((i) => isNavActive(pathname, i.path));
  if (matched) return resolveNavItemLabel(matched, role, t);

  if (pathname.includes('/task-templates')) return t('nav:breadcrumb.taskTemplates');
  if (pathname.includes('/chronologio')) return t('nav:breadcrumb.chronologio');
  if (pathname.includes('/new')) return t('breadcrumb.new');
  if (pathname.includes('/edit')) return t('breadcrumb.edit');
  return t('common:appName', { defaultValue: 'Oleachron' });
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
  if (segment === 'task-templates') return t('breadcrumb.taskTemplates');
  if (segment === 'chronologio') return t('breadcrumb.chronologio');
  if (segment === 'notes') return t('breadcrumb.notes');
  if (segment === 'review') return t('breadcrumb.apologismos');

  if (/^[a-zA-Z0-9_-]{6,}$/.test(segment)) return t('breadcrumb.details');

  return segment.charAt(0).toUpperCase() + segment.slice(1);
};
