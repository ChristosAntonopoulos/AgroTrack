import type { NavigationState, PartialState } from '@react-navigation/native';
import type { CaptureContext } from '../capture/types';
import { sourcePageFromRoute } from '../capture/openContext';

export type DockTab = 'ChronologioTab' | 'Fields' | 'Tasks' | 'More';

type NavState = NavigationState | PartialState<NavigationState>;

/** Focused flows where a persistent dock would compete with the task. */
const HIDDEN_ROUTES = new Set([
  'Auth',
  'FieldForm',
  'FieldMapBoundary',
  'CreateTask',
  'FieldWorkSetup',
  'TaskCompletion',
  'InviteAccept',
  'FamilyInviteAccept',
  'PartnerInviteAccept',
]);

const FIELD_ROUTES = new Set([
  'Fields',
  'FieldsHome',
  'FieldDetail',
  'HarvestCampaign',
  'FieldWeatherVegetation',
  'FieldWorkProfile',
  'ThisHarvest',
  'ThisHarvestReview',
]);

const TASK_ROUTES = new Set(['Tasks', 'TaskDetail']);

const CHRONOLOGIO_ROUTES = new Set([
  'ChronologioTab',
  'Chronologio',
  'Dashboard',
  'NotesList',
  'Calendar',
]);

export type FocusedRoute = {
  name: string;
  params?: Record<string, unknown>;
};

export const getFocusedRoute = (state: NavState | undefined): FocusedRoute => {
  if (!state || state.index == null || !state.routes?.length) return { name: '' };
  const route = state.routes[state.index];
  if (!route) return { name: '' };
  if (route.state) return getFocusedRoute(route.state as NavState);
  return { name: route.name, params: route.params as Record<string, unknown> | undefined };
};

export const dockTabForRoute = (name: string): DockTab => {
  if (FIELD_ROUTES.has(name)) return 'Fields';
  if (TASK_ROUTES.has(name)) return 'Tasks';
  if (CHRONOLOGIO_ROUTES.has(name)) return 'ChronologioTab';
  return 'More';
};

export const dockHiddenForRoute = (name: string): boolean => HIDDEN_ROUTES.has(name);

/** Record opens already pointed at the place the user is looking at. */
export const captureContextForRoute = (
  route: FocusedRoute,
  _opts?: { isHarvestLive?: boolean }
): CaptureContext => {
  const params = route.params || {};
  const fieldId =
    typeof params.fieldId === 'string'
      ? params.fieldId
      : typeof params.field === 'string'
        ? params.field
        : undefined;
  const taskId = typeof params.taskId === 'string' ? params.taskId : undefined;
  const sourcePage = sourcePageFromRoute(route.name);
  if (route.name === 'TaskDetail' && taskId) {
    return { taskId, fieldId, sourcePage: sourcePage || 'tasks' };
  }
  if (fieldId) return { fieldId, sourcePage };
  return { sourcePage };
};
