export const TASK_VIEWS = ['now', 'upcoming', 'proposals', 'history'] as const;

export type TaskPageView = (typeof TASK_VIEWS)[number];

export const DEFAULT_TASK_VIEW: TaskPageView = 'now';

/** Legacy URL / deep-link values remapped for bookmarks and old links. */
const LEGACY_VIEW_MAP: Record<string, TaskPageView> = {
  planned: 'upcoming',
  active: 'now',
};

export const isTaskPageView = (value: string | null | undefined): value is TaskPageView =>
  value === 'now' || value === 'upcoming' || value === 'proposals' || value === 'history';

export const parseTaskView = (value: string | null | undefined): TaskPageView => {
  if (isTaskPageView(value)) return value;
  if (value && LEGACY_VIEW_MAP[value]) return LEGACY_VIEW_MAP[value];
  return DEFAULT_TASK_VIEW;
};

export const parseTaskYear = (value: string | number | null | undefined, fallback: number): number => {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fallback;
  return year;
};

export const parseTaskFieldId = (value: string | null | undefined): string => value?.trim() || '';

export const parseTaskAssigneeId = (value: string | null | undefined): string => value?.trim() || '';

/** Map legacy deep-link filters onto the refactored views. */
export const viewFromLegacyFilter = (filter?: string | null): TaskPageView | undefined => {
  if (filter === 'in_progress') return 'now';
  if (filter === 'planned' || filter === 'ready' || filter === 'blocked') return 'upcoming';
  return undefined;
};
