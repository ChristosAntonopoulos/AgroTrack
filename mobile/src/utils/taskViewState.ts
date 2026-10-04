export const TASK_VIEWS = ['todo', 'done'] as const;

export type TaskPageView = (typeof TASK_VIEWS)[number];

export const DEFAULT_TASK_VIEW: TaskPageView = 'todo';

/** Older bookmarks land on the two notebook views. */
const LEGACY_VIEW_MAP: Record<string, TaskPageView> = {
  now: 'todo',
  upcoming: 'todo',
  proposals: 'todo',
  planned: 'todo',
  active: 'todo',
  history: 'done',
  completed: 'done',
};

export const isTaskPageView = (value: string | null | undefined): value is TaskPageView =>
  value === 'todo' || value === 'done';

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

/** Map leftover deep-link filters onto the notebook. */
export const viewFromLegacyFilter = (filter?: string | null): TaskPageView | undefined => {
  if (!filter) return undefined;
  if (filter === 'completed' || filter === 'cancelled' || filter === 'skipped') return 'done';
  return 'todo';
};
