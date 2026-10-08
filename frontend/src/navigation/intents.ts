import { CHRONOLOGIO_HOME } from './homePath';

/** Canonical query names. `field` is accepted as a legacy alias of `fieldId`. */
export const readFieldId = (search: { get: (key: string) => string | null }): string =>
  (search.get('fieldId') || search.get('field') || '').trim();

const qs = (pairs: Array<[string, string | number | boolean | null | undefined]>): string => {
  const params = new URLSearchParams();
  pairs.forEach(([key, value]) => {
    if (value == null || value === false || value === '') return;
    params.set(key, value === true ? '1' : String(value));
  });
  const text = params.toString();
  return text ? `?${text}` : '';
};

export const chronologioPath = (opts?: {
  focus?: 'today';
  entry?: string;
  fieldId?: string;
}): string =>
  `${CHRONOLOGIO_HOME}${qs([
    ['focus', opts?.focus],
    ['entry', opts?.entry],
    ['fieldId', opts?.fieldId],
  ])}`;

export const fieldPath = (fieldId: string): string => `/fields/${encodeURIComponent(fieldId)}`;

export const fieldStreamPath = (fieldId: string, opts?: { entry?: string }): string =>
  `/fields/${encodeURIComponent(fieldId)}${qs([
    ['tab', 'chronologio'],
    ['entry', opts?.entry],
  ])}`;

/** Open the work screen. Older links used /tasks?task=. */
export const taskPeekPath = (taskId: string): string =>
  `/tasks/${encodeURIComponent(taskId)}`;

export const taskCompletePath = (taskId: string): string =>
  `/tasks/${encodeURIComponent(taskId)}/complete`;

/** Opens the schedule-work sheet on the Tasks page (Phase 2). */
export const taskFormPath = (opts?: {
  fieldId?: string;
  proposalId?: string;
  templateCode?: string;
  view?: 'today' | 'upcoming' | 'done';
}): string =>
  `/tasks${qs([
    ['view', opts?.view || 'today'],
    ['schedule', 1],
    ['fieldId', opts?.fieldId],
    ['templateCode', opts?.templateCode],
    ['proposalId', opts?.proposalId],
  ])}`;

export const moneyPath = (opts?: {
  year?: number;
  fieldId?: string;
  task?: string;
  harvest?: string;
  tx?: string;
}): string =>
  `/money${qs([
    ['year', opts?.year],
    ['fieldId', opts?.fieldId],
    ['task', opts?.task],
    ['harvest', opts?.harvest],
    ['tx', opts?.tx],
  ])}`;

export const photosPath = (opts?: { fieldId?: string; photoId?: string }): string =>
  `/photos${qs([
    ['fieldId', opts?.fieldId],
    ['photoId', opts?.photoId],
  ])}`;

export const harvestPath = (opts?: {
  add?: boolean;
  /** Open this harvest capture directly (sacks, mill, oil, people, expense, income, note). */
  kind?: string;
  evening?: boolean | string;
  fieldId?: string;
  harvestId?: string;
  day?: string;
  /** Open the Fields journey tab (`Η διαδρομή`). */
  view?: 'today' | 'fields' | 'totals' | 'log';
}): string =>
  `/harvest${qs([
    ['add', opts?.add],
    ['kind', opts?.kind],
    ['evening', opts?.evening === true ? '1' : opts?.evening],
    ['fieldId', opts?.fieldId],
    ['harvestId', opts?.harvestId],
    ['day', opts?.day],
    ['view', opts?.view],
  ])}`;

/** Personal oil cellar. `do` opens give, sell, hold, fill, or count. */
export const myOilPath = (opts?: { field?: string; do?: string }): string =>
  `/my-oil${qs([
    ['field', opts?.field],
    ['do', opts?.do],
  ])}`;

export const harvestReviewPath = (opts?: { season?: number }): string =>
  `/this-harvest/review${qs([['season', opts?.season]])}`;

export const fieldWeatherPath = (fieldId: string): string =>
  `/fields/${encodeURIComponent(fieldId)}/weather`;
