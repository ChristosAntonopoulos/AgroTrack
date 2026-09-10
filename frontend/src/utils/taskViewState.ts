export const TASK_VIEWS = ['proposals', 'planned', 'active'] as const;

export type TaskPageView = (typeof TASK_VIEWS)[number];

export const DEFAULT_TASK_VIEW: TaskPageView = 'proposals';

export const isTaskPageView = (value: string | null | undefined): value is TaskPageView =>
  value === 'proposals' || value === 'planned' || value === 'active';

export const parseTaskView = (value: string | null | undefined): TaskPageView =>
  isTaskPageView(value) ? value : DEFAULT_TASK_VIEW;

export const parseTaskYear = (value: string | null | undefined, fallback: number): number => {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return fallback;
  return year;
};

export const parseTaskFieldId = (value: string | null | undefined): string => value?.trim() || '';

export const buildTaskSearchParams = (input: {
  view: TaskPageView;
  year: number;
  defaultYear: number;
  fieldId?: string;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('view', input.view);
  params.set('year', String(input.year));
  if (input.fieldId) {
    params.set('field', input.fieldId);
  }
  return params;
};
