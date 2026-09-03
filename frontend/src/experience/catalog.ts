import type { ExperienceMode, ExperienceWidget } from './types';

/** Widgets visible in Everyday mode. Everything else is Full-picture only. */
const EVERYDAY_WIDGETS: ReadonlySet<ExperienceWidget> = new Set([
  'fieldMapDefault',
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
  '/today',
  '/fields',
  '/tasks',
  '/settings',
]);

export const isEverydayPrimaryPath = (path: string): boolean =>
  EVERYDAY_PRIMARY_PATHS.has(path);
