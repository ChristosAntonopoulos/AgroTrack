export const TASK_VIEWS = ['proposals', 'planned', 'active'] as const;

export type TaskPageView = (typeof TASK_VIEWS)[number];

export const DEFAULT_TASK_VIEW: TaskPageView = 'proposals';

export const isTaskPageView = (value: string | null | undefined): value is TaskPageView =>
  value === 'proposals' || value === 'planned' || value === 'active';

export const parseTaskView = (value: string | null | undefined): TaskPageView =>
  isTaskPageView(value) ? value : DEFAULT_TASK_VIEW;

export const parseTaskYear = (value: string | number | null | undefined, fallback: number): number => {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fallback;
  return year;
};

export const parseTaskFieldId = (value: string | null | undefined): string => value?.trim() || '';

/** Map legacy deep-link filters onto the refactored views. */
export const viewFromLegacyFilter = (filter?: string | null): TaskPageView | undefined => {
  if (filter === 'in_progress') return 'active';
  if (filter === 'planned' || filter === 'ready' || filter === 'blocked') return 'planned';
  return undefined;
};
