import React from 'react';
import { TFunction } from 'i18next';
import {
  Layers,
  CheckSquare,
  FileText,
  Bell,
  Wallet,
  Settings,
  Database,
  Handshake,
  Wheat,
  BookOpen,
  HeartHandshake,
  Images,
  Megaphone,
  MessageSquareHeart,
} from 'lucide-react';
import { settingsService, pathForDefaultView } from '../services/settingsService';
import { CHRONOLOGIO_HOME } from './homePath';

export type AppRole = 'FieldOwner' | 'Producer' | 'Agronomist' | 'Administrator' | 'ServiceProvider' | '';

export type NavSectionId = 'primary' | 'secondary' | 'account';

export type NavSection = {
  id: NavSectionId;
  labelKey: string;
};

export type NavItem = {
  path: string;
  labelKey: string;
  mobileLabelKey?: string;
  icon: React.ReactNode;
  roles: AppRole[];
  section: NavSectionId;
  mockOnly?: boolean;
  /** Shown in phone bottom tab bar when visible for the user */
  mobilePrimary?: boolean;
  /** Opens an in-app action instead of navigating */
  action?: 'feedback';
};

export const navSections: NavSection[] = [
  { id: 'primary', labelKey: 'sections.primary' },
  { id: 'secondary', labelKey: 'sections.secondary' },
  { id: 'account', labelKey: 'sections.account' },
];

export const navItems: NavItem[] = [
  {
    path: '/chronologio',
    labelKey: 'items.chronologio',
    icon: <BookOpen />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'primary',
    mobilePrimary: true,
  },
  {
    path: '/fields',
    labelKey: 'items.fields',
    icon: <Layers />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'primary',
    mobilePrimary: true,
  },
  {
    path: '/tasks',
    labelKey: 'items.tasks',
    icon: <CheckSquare />,
    roles: ['FieldOwner', 'Producer', 'Agronomist'],
    section: 'primary',
    mobilePrimary: true,
  },
  {
    path: '/harvest',
    labelKey: 'items.thisHarvest',
    icon: <Wheat />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'primary',
  },
  {
    path: '/money',
    labelKey: 'items.money',
    icon: <Wallet />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    section: 'primary',
  },
  {
    path: '/photos',
    labelKey: 'items.photos',
    icon: <Images />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator'],
    section: 'primary',
  },
  {
    path: '/partners',
    labelKey: 'items.partners',
    icon: <Handshake />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'secondary',
  },
  {
    path: '/reports',
    labelKey: 'items.reports',
    icon: <FileText />,
    roles: ['FieldOwner', 'Administrator'],
    section: 'secondary',
  },
  {
    path: '/ministry',
    labelKey: 'items.ministry',
    icon: <Bell />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'secondary',
  },
  {
    path: '/data-sources',
    labelKey: 'items.dataSources',
    icon: <Database />,
    roles: ['Administrator'],
    section: 'account',
  },
  {
    path: '/admin/campaigns',
    labelKey: 'items.campaigns',
    icon: <Megaphone />,
    roles: ['Administrator'],
    section: 'account',
  },
  {
    path: '/admin/feedback',
    labelKey: 'items.userFeedback',
    icon: <MessageSquareHeart />,
    roles: ['Administrator'],
    section: 'account',
  },
  {
    path: '__feedback__',
    labelKey: 'items.feedback',
    icon: <HeartHandshake />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'account',
    action: 'feedback',
  },
  {
    path: '/settings',
    labelKey: 'items.settings',
    icon: <Settings />,
    roles: ['FieldOwner', 'Producer', 'Agronomist', 'Administrator', 'ServiceProvider'],
    section: 'account',
  },
];

export const resolveNavItemLabel = (item: NavItem, _role: AppRole, t: TFunction<'nav'>, opts?: { mobile?: boolean }): string =>
  t(opts?.mobile && item.mobileLabelKey ? item.mobileLabelKey : item.labelKey);

export type ActiveFieldNavGate = {
  /** Partner/Family modules for the active field only — null/empty when Admin / unrestricted. */
  modules?: ReadonlySet<string> | null;
  /** True when the user is Admin on the active field (or unrestricted owner). */
  isAdminOnActive?: boolean;
  /**
   * When set, overrides module-only harvest visibility (help/view seats, etc.).
   * Computed via getHarvestCapabilities.canView.
   */
  canViewHarvest?: boolean;
};

/** Shared visibility filter for sidebar and mobile bottom nav. */
export const filterNavItemsForUser = (
  items: NavItem[],
  userRole: AppRole,
  mockMode: boolean,
  gate?: ActiveFieldNavGate | null
): NavItem[] => {
  const modules = gate?.modules;
  const restrictCollaborator = Boolean(
    modules && modules.size > 0 && gate?.isAdminOnActive === false
  );

  return items.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if (item.mockOnly && !mockMode) return false;
    // Ministry and Reports stay reachable by URL but out of the sidebar.
    if (item.path === '/ministry' || item.path === '/reports') {
      return false;
    }

    // Partner/Family on the active field: gate by that seat’s modules only (no union).
    if (restrictCollaborator) {
      if (
        item.path === '/reports' ||
        item.path === '/data-sources' ||
        item.path === '/partners'
      ) {
        return false;
      }
      if (item.path === '/money' && !modules!.has('money')) return false;
      if (item.path === '/harvest') {
        if (gate?.canViewHarvest === false) return false;
        if (!modules!.has('harvest')) return false;
      }
      if (item.path === '/tasks' && !modules!.has('tasks')) return false;
      if (item.path === '/fields' && !modules!.has('fields')) return false;
      if (item.path === '/photos' && !modules!.has('photos')) return false;
      if (item.path === '/chronologio' && !modules!.has('chronologio')) return false;
    } else if (item.path === '/harvest' && gate?.canViewHarvest === false) {
      return false;
    }

    return true;
  });
};

export const roleHomePath = (_role: AppRole) => {
  const prefs = settingsService.getPreferences();
  if (prefs.defaultView) {
    return pathForDefaultView(prefs.defaultView);
  }
  return CHRONOLOGIO_HOME;
};

export const isNavActive = (pathname: string, itemPath: string) => {
  if (itemPath.startsWith('__')) return false;
  if (itemPath === '/chronologio') return pathname === '/chronologio' || pathname === '/';
  if (itemPath === '/harvest') return pathname === '/harvest' || pathname.startsWith('/harvest/');
  return pathname.startsWith(itemPath);
};

export const resolvePageTitle = (pathname: string, role: AppRole, t: TFunction<'nav'>) => {
  const matched = navItems.find((i) => isNavActive(pathname, i.path));
  if (matched) return resolveNavItemLabel(matched, role, t);
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
  if (segment === 'chronologio') return t('breadcrumb.chronologio');
  if (segment === 'notes') return t('breadcrumb.notes');
  if (segment === 'harvest') return t('items.thisHarvest');
  if (segment === 'review') return t('breadcrumb.apologismos');
  if (segment === 'work-setup') return t('breadcrumb.workSetup');
  if (segment === 'work-profile') return t('breadcrumb.workProfile');
  if (segment === 'weather') return t('breadcrumb.weather');

  if (/^[a-zA-Z0-9_-]{6,}$/.test(segment)) return t('breadcrumb.details');

  return segment.charAt(0).toUpperCase() + segment.slice(1);
};
