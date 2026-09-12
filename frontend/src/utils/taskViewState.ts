export const TASK_VIEWS = ['now', 'upcoming', 'proposals', 'history'] as const;

export type TaskPageView = (typeof TASK_VIEWS)[number];

export const DEFAULT_TASK_VIEW: TaskPageView = 'now';

/** Legacy URL values remapped for bookmarks and old links. */
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

export const parseTaskYear = (value: string | null | undefined, fallback: number): number => {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fallback;
  return year;
};

export const parseTaskFieldId = (value: string | null | undefined): string => value?.trim() || '';

export const parseTaskAssigneeId = (value: string | null | undefined): string => value?.trim() || '';

export const buildTaskSearchParams = (input: {
  view: TaskPageView;
  year: number;
  defaultYear: number;
  fieldId?: string;
  assigneeId?: string;
  taskId?: string;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('view', input.view);
  if (input.year !== input.defaultYear) {
    params.set('year', String(input.year));
  }
  if (input.fieldId) {
    params.set('field', input.fieldId);
  }
  if (input.assigneeId) {
    params.set('assignee', input.assigneeId);
  }
  if (input.taskId) {
    params.set('task', input.taskId);
  }
  return params;
};

const SCROLL_KEY_PREFIX = 'oleachron.tasks.scroll.v1.';

export const saveTaskListScroll = (view: TaskPageView, scrollY: number): void => {
  try {
    sessionStorage.setItem(`${SCROLL_KEY_PREFIX}${view}`, String(Math.round(scrollY)));
  } catch {
    // Ignore storage failures.
  }
};

export const readTaskListScroll = (view: TaskPageView): number | null => {
  try {
    const raw = sessionStorage.getItem(`${SCROLL_KEY_PREFIX}${view}`);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};
