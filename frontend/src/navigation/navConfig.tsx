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
  Warehouse,
  LayoutDashboard,
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
    path: '/my-oil',
    labelKey: 'items.myOil',
    icon: <Warehouse />,
    roles: ['FieldOwner', 'Producer', 'Administrator'],
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
    path: '/admin',
    labelKey: 'items.opsOverview',
    icon: <LayoutDashboard />,
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

/**
 * Active-field context for nav visibility. Owners/Admins always see every module; on a
 * Partner/Family seat (QA-008) the money-bearing modules hide unless the seat grants them.
 */
export type ActiveFieldNavGate = {
  /** Modules granted on the active field (collaborator seats only). */
  modules?: ReadonlySet<string> | null;
  isAdminOnActive?: boolean;
  canViewHarvest?: boolean;
  /** True on a Partner/Family seat of the active field. */
  isCollaboratorOnActive?: boolean;
};

/** Collaborator-only module gates: path → modules that unlock it (any of). */
const COLLABORATOR_NAV_MODULES: Record<string, string[]> = {
  '/harvest': ['harvest'],
  '/money': ['money'],
  '/my-oil': ['harvest', 'money'],
};

const collaboratorMayOpen = (path: string, gate?: ActiveFieldNavGate | null): boolean => {
  const needed = COLLABORATOR_NAV_MODULES[path];
  if (!needed || !gate?.isCollaboratorOnActive || gate.isAdminOnActive || !gate.modules) return true;
  return needed.some((module) => gate.modules!.has(module));
};

/** Shared visibility filter for sidebar and mobile bottom nav. */
export const filterNavItemsForUser = (
  items: NavItem[],
  userRole: AppRole,
  mockMode: boolean,
  gate?: ActiveFieldNavGate | null
): NavItem[] => {
  return items.filter((item) => {
    if (!item.roles.includes(userRole)) return false;
    if (item.mockOnly && !mockMode) return false;
    if (!collaboratorMayOpen(item.path, gate)) return false;
    // Ministry and Reports stay reachable by URL but out of the sidebar.
    if (item.path === '/ministry' || item.path === '/reports') {
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

/** Normalize pathname for exact route comparisons (strip trailing slash). */
export const normalizeAppPath = (pathname: string) => {
  if (!pathname || pathname === '/') return pathname || '/';
  return pathname.replace(/\/+$/, '') || '/';
};

/**
 * First-level app destinations (sidebar / bottom-nav roots).
 * These own their in-page title — no global header title, no back, no breadcrumbs.
 */
export const isTopLevelAppPath = (pathname: string) => {
  const path = normalizeAppPath(pathname);
  if (path === '/' || path === '/chronologio') return true;
  return navItems.some((item) => !item.path.startsWith('__') && !item.action && path === item.path);
};

/**
 * Global Header never owns the page title — every MainLayout page renders its own.
 * Kept as a function so callers/tests stay explicit about the chrome contract.
 */
export const shouldHideGlobalPageTitle = (_pathname: string) => true;

/**
 * Fixed parent for nested routes. Used by BackLink defaults and breadcrumbs policy.
 * Returns null for top-level destinations.
 */
export const resolveParentPath = (pathname: string): string | null => {
  const path = normalizeAppPath(pathname);
  if (isTopLevelAppPath(path)) return null;

  if (path === '/this-harvest/review' || path.startsWith('/harvest/')) return '/harvest';
  if (path.startsWith('/admin/campaigns/')) return '/admin/campaigns';
  if (path.startsWith('/admin/') && path !== '/admin') return '/admin';

  if (path.startsWith('/partners/')) return '/partners';
  if (path.startsWith('/tasks/')) return '/tasks';
  if (path.startsWith('/fields/')) {
    const parts = path.split('/').filter(Boolean);
    // /fields/:id/weather|work-setup|work-profile → field detail
    // /fields/:id/edit and /fields/new → fields list (same as create/edit chrome)
    if (parts.length >= 3 && parts[1] !== 'new' && parts[2] !== 'edit') {
      return `/fields/${parts[1]}`;
    }
    return '/fields';
  }

  // Fallback: nearest nav module root by prefix
  const matched = navItems
    .filter((i) => !i.path.startsWith('__') && !i.action && path.startsWith(`${i.path}/`))
    .sort((a, b) => b.path.length - a.path.length)[0];
  return matched?.path ?? null;
};

export const resolvePageTitle = (pathname: string, role: AppRole, t: TFunction<'nav'>) => {
  const path = normalizeAppPath(pathname);
  if (path === '/this-harvest/review') return t('items.thisHarvest');

  const matched = navItems.find((i) => isNavActive(pathname, i.path));
  if (matched) return resolveNavItemLabel(matched, role, t);
  if (pathname.includes('/chronologio')) return t('nav:breadcrumb.chronologio');
  if (pathname.includes('/new')) return t('breadcrumb.new');
  if (pathname.includes('/edit')) return t('breadcrumb.edit');
  return t('common:appName', { defaultValue: 'The Olive Lot' });
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
