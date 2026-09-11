import type { ExperienceMode, ExperienceWidget } from './types';

/**
 * Widgets visible in Everyday mode. Everything else is Full-picture only.
 * Audited baseline allow-list was `fieldMapDefault` only; Phase 1 adds action-first Everyday surfaces.
 */
const EVERYDAY_WIDGETS: ReadonlySet<ExperienceWidget> = new Set([
  'fieldMapDefault',
  'todayAction',
  'weatherAdvice',
  'nextTasks',
  'peopleStrip',
  'alertsPlain',
  'fieldCosts',
  'myActions',
  'recentNotes',
]);

/**
 * Returns whether a UI widget should be shown for the given experience mode.
 * Everyday keeps action-first surfaces; Full picture shows the control room.
 */
export const isWidgetVisible = (
  widget: ExperienceWidget,
  mode: ExperienceMode
): boolean => {
  if (mode === 'full') return true;
  return EVERYDAY_WIDGETS.has(widget);
};

/** Nav paths that stay in the primary Everyday sidebar (others move under More / Settings). */
export const EVERYDAY_PRIMARY_PATHS: ReadonlySet<string> = new Set([
  '/chronologio',
  '/fields',
  '/tasks',
  '/money',
  '/this-harvest',
  '/partners',
  '/settings',
]);

/** Reachable in Everyday but not primary (More). */
export const EVERYDAY_MORE_PATHS: ReadonlySet<string> = new Set([
  '/notes',
]);

export const isEverydayPrimaryPath = (path: string): boolean =>
  EVERYDAY_PRIMARY_PATHS.has(path);

export const isEverydayAllowedPath = (path: string): boolean => {
  if (EVERYDAY_PRIMARY_PATHS.has(path) || EVERYDAY_MORE_PATHS.has(path)) return true;
  const first = `/${path.split('/').filter(Boolean)[0] || ''}`;
  return EVERYDAY_PRIMARY_PATHS.has(first) || EVERYDAY_MORE_PATHS.has(first);
};
