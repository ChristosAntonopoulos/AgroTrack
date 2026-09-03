import type { ExperienceMode, ExperienceWidget } from './types';

const EVERYDAY_WIDGETS: ReadonlySet<ExperienceWidget> = new Set([
  'fieldMapDefault',
]);

export const isWidgetVisible = (
  widget: ExperienceWidget,
  mode: ExperienceMode
): boolean => {
  if (mode === 'full') return true;
  return EVERYDAY_WIDGETS.has(widget);
};

/** Tab names that remain primary in Everyday mode. */
export const EVERYDAY_PRIMARY_TABS: ReadonlySet<string> = new Set([
  'Today',
  'Fields',
  'Tasks',
  'More',
]);

export const isEverydayPrimaryTab = (tab: string): boolean =>
  EVERYDAY_PRIMARY_TABS.has(tab);
