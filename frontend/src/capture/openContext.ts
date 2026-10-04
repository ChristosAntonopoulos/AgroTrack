import { athensCalendarDateKey } from '../utils/athensDate';
import { occurredAtForCalendarDay } from '../chronologio/captureContext';
import { fieldIdFromPath } from './fieldContext';
import type { CaptureContext, CaptureSourcePage } from './types';

/** YYYY-MM-DD from an ISO / local datetime, or undefined if missing/invalid. */
export const dayKeyFromOccurredAt = (iso?: string | null): string | undefined => {
  if (!iso) return undefined;
  try {
    return athensCalendarDateKey(iso);
  } catch {
    return undefined;
  }
};

/** Infer source page from the route when the opener does not set one. */
export const sourcePageFromPath = (pathname: string): CaptureSourcePage | undefined => {
  const path = pathname || '/';
  if (path === '/harvest' || path.startsWith('/harvest/')) return 'harvest';
  if (path === '/my-oil' || path.startsWith('/my-oil/')) return 'warehouse';
  if (path === '/money' || path.startsWith('/money/')) return 'money';
  if (path === '/tasks' || path.startsWith('/tasks/')) return 'tasks';
  if (path === '/photos' || path.startsWith('/photos/')) return 'photos';
  if (path === '/fields' || path.startsWith('/fields/')) return 'grove';
  if (path === '/chronologio' || path.startsWith('/chronologio')) return 'chronologio';
  return undefined;
};

export type CapturePageSnapshot = {
  fieldId?: string;
  occurredAt?: string;
  dateDefaultedToToday?: boolean;
  dateNeedsChoice?: boolean;
  periodLabel?: string;
  harvestId?: string;
  taskId?: string;
  sourcePage?: CaptureSourcePage;
};

/**
 * Merge explicit opener args with route + registered page snapshot.
 * Date priority: explicit → page snapshot → today.
 * Field priority: explicit → route `/fields/:id` → page snapshot (resolver fills the rest later).
 */
export const buildCaptureOpenContext = (input: {
  pathname: string;
  search?: string | URLSearchParams;
  explicit?: CaptureContext;
  page?: CapturePageSnapshot | null;
}): CaptureContext => {
  const explicit = input.explicit || {};
  const page = input.page || {};
  const search =
    typeof input.search === 'string'
      ? new URLSearchParams(input.search.startsWith('?') ? input.search : `?${input.search}`)
      : input.search;

  const routeFieldId = fieldIdFromPath(input.pathname) || undefined;
  const dayFromQuery = search?.get('day')?.trim() || undefined;

  const fieldId = explicit.fieldId || routeFieldId || page.fieldId || undefined;

  let occurredAt = explicit.occurredAt || page.occurredAt;
  if (!occurredAt && dayFromQuery) {
    occurredAt = occurredAtForCalendarDay(dayFromQuery);
  }

  const sourcePage =
    explicit.sourcePage || page.sourcePage || sourcePageFromPath(input.pathname);

  return {
    ...page,
    ...explicit,
    fieldId,
    occurredAt,
    sourcePage,
    dateDefaultedToToday: explicit.dateDefaultedToToday ?? page.dateDefaultedToToday,
    dateNeedsChoice: explicit.dateNeedsChoice ?? page.dateNeedsChoice,
    periodLabel: explicit.periodLabel ?? page.periodLabel,
    harvestId: explicit.harvestId || page.harvestId,
    taskId: explicit.taskId || page.taskId,
  };
};
