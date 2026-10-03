import { athensCalendarDateKey } from '../utils/athensDate';
import { occurredAtForCalendarDay } from '../chronologio/captureContext';
import { fieldIdFromRouteParams } from './fieldContext';
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

/** Infer source page from a React Navigation route name. */
export const sourcePageFromRoute = (routeName: string): CaptureSourcePage | undefined => {
  const name = routeName || '';
  if (name === 'HarvestCampaign' || name === 'ThisHarvest' || name === 'ThisHarvestReview') {
    return 'harvest';
  }
  if (name === 'MyOil') return 'warehouse';
  if (name === 'Money') return 'money';
  if (name === 'Tasks' || name === 'TaskDetail' || name === 'CreateTask') return 'tasks';
  if (name === 'Photos' || name === 'PhotoHub') return 'photos';
  if (
    name === 'Fields' ||
    name === 'FieldsHome' ||
    name === 'FieldDetail' ||
    name === 'FieldWeatherVegetation' ||
    name === 'FieldWorkProfile'
  ) {
    return 'grove';
  }
  if (
    name === 'ChronologioTab' ||
    name === 'Chronologio' ||
    name === 'Dashboard' ||
    name === 'NotesList' ||
    name === 'Calendar' ||
    name === 'Launcher'
  ) {
    return 'chronologio';
  }
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
 * Date priority: explicit → page snapshot → route day param.
 * Field priority: explicit → route params → page snapshot (resolver fills the rest later).
 */
export const buildCaptureOpenContext = (input: {
  routeName: string;
  params?: Record<string, unknown> | null;
  explicit?: CaptureContext;
  page?: CapturePageSnapshot | null;
}): CaptureContext => {
  const explicit = input.explicit || {};
  const page = input.page || {};
  const params = input.params || {};

  const routeFieldId = fieldIdFromRouteParams(params);
  const dayFromParams =
    typeof params.day === 'string' && params.day.trim() ? params.day.trim() : undefined;

  const fieldId = explicit.fieldId || routeFieldId || page.fieldId || undefined;

  let occurredAt = explicit.occurredAt || page.occurredAt;
  if (!occurredAt && dayFromParams) {
    occurredAt = occurredAtForCalendarDay(dayFromParams);
  }

  const sourcePage =
    explicit.sourcePage || page.sourcePage || sourcePageFromRoute(input.routeName);

  const taskId =
    explicit.taskId ||
    page.taskId ||
    (typeof params.taskId === 'string' ? params.taskId : undefined);

  const harvestId =
    explicit.harvestId ||
    page.harvestId ||
    (typeof params.harvestId === 'string' ? params.harvestId : undefined);

  return {
    ...page,
    ...explicit,
    fieldId,
    occurredAt,
    sourcePage,
    taskId,
    harvestId,
    dateDefaultedToToday: explicit.dateDefaultedToToday ?? page.dateDefaultedToToday,
    dateNeedsChoice: explicit.dateNeedsChoice ?? page.dateNeedsChoice,
    periodLabel: explicit.periodLabel ?? page.periodLabel,
  };
};
