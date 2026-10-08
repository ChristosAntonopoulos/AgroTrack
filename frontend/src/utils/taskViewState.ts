export const TASK_VIEWS = ['today', 'upcoming', 'done'] as const;

export type TaskPageView = (typeof TASK_VIEWS)[number];

export const DEFAULT_TASK_VIEW: TaskPageView = 'today';

/** Older bookmarks land on the three notebook views. */
const LEGACY_VIEW_MAP: Record<string, TaskPageView> = {
  todo: 'today',
  now: 'today',
  proposals: 'today',
  planned: 'upcoming',
  active: 'today',
  history: 'done',
  completed: 'done',
};

export const isTaskPageView = (value: string | null | undefined): value is TaskPageView =>
  value === 'today' || value === 'upcoming' || value === 'done';

export const parseTaskView = (value: string | null | undefined): TaskPageView => {
  if (isTaskPageView(value)) return value;
  if (value && LEGACY_VIEW_MAP[value]) return LEGACY_VIEW_MAP[value];
  return DEFAULT_TASK_VIEW;
};

export const parseTaskFieldId = (value: string | null | undefined): string => value?.trim() || '';

export const buildTaskSearchParams = (input: {
  view: TaskPageView;
  fieldId?: string;
  taskId?: string;
  schedule?: boolean;
  templateCode?: string;
  created?: string;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('view', input.view);
  if (input.fieldId) {
    params.set('fieldId', input.fieldId);
  }
  if (input.taskId) {
    params.set('task', input.taskId);
  }
  if (input.schedule) {
    params.set('schedule', '1');
  }
  if (input.templateCode) {
    params.set('templateCode', input.templateCode);
  }
  if (input.created) {
    params.set('created', input.created);
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
