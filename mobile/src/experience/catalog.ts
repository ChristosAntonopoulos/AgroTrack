import type { ExperienceMode, ExperienceWidget } from './types';

/**
 * Everyday allow-list. Wiki Field Detail needs map + weather advice + next tasks + alerts.
 * Density tools (intelligence, cadastre, satellite) stay Full-only.
 */
const EVERYDAY_WIDGETS: ReadonlySet<ExperienceWidget> = new Set([
  'fieldMapDefault',
  'todayAction',
  'weatherAdvice',
  'nextTasks',
  'peopleStrip',
  'alertsPlain',
]);

export const isWidgetVisible = (
  widget: ExperienceWidget,
  mode: ExperienceMode
): boolean => {
  if (mode === 'full') return true;
  return EVERYDAY_WIDGETS.has(widget);
};

/** Everyday thumb bar: Today, Fields, Tasks, More. Calendar lives under More. */
export const EVERYDAY_PRIMARY_TABS: ReadonlySet<string> = new Set([
  'Today',
  'Fields',
  'Tasks',
  'More',
]);

export const isEverydayPrimaryTab = (tab: string): boolean =>
  EVERYDAY_PRIMARY_TABS.has(tab);
