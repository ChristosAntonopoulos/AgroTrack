import { canonicalQuickMove, type CaptureMove } from './menu';
import type { CapturePermissions, CaptureSourcePage } from './types';
import { isOliveHarvestSeason } from '../utils/harvestSeason';
import { sourcePageFromPath } from './openContext';

export type QuickAddContext =
  | 'harvest'
  | 'warehouse'
  | 'grove'
  | 'money'
  | 'tasks'
  | 'photos'
  | 'home';

const mapSourcePage = (page?: CaptureSourcePage | ''): QuickAddContext | undefined => {
  if (!page) return undefined;
  if (page === 'harvest') return 'harvest';
  if (page === 'warehouse') return 'warehouse';
  if (page === 'money') return 'money';
  if (page === 'tasks') return 'tasks';
  if (page === 'photos') return 'photos';
  if (page === 'grove') return 'grove';
  if (page === 'chronologio' || page === 'home') return 'home';
  return undefined;
};

/**
 * Route first, then opener sourcePage. Harvest-live never retargets another page.
 */
export const resolveQuickAddContext = (input: {
  pathname: string;
  isHarvestLive?: boolean;
  sourcePage?: CaptureSourcePage;
}): QuickAddContext => {
  return mapSourcePage(sourcePageFromPath(input.pathname)) || mapSourcePage(input.sourcePage) || 'home';
};

/** Exact allowed Quick Add ids per surface. Never merge recents or leftovers. */
export const QUICK_PRESETS: Record<QuickAddContext, readonly string[]> = {
  harvest: ['sacks', 'mill', 'oil', 'expense'],
  warehouse: ['add', 'sell', 'give', 'fill'],
  grove: ['scheduleWork', 'recordWork', 'observation', 'expense', 'harvest'],
  money: ['income', 'expense', 'sell'],
  /** Tasks page: schedule first, then record completed work. */
  tasks: ['scheduleWork', 'recordWork', 'observation', 'expense'],
  photos: ['observation', 'recordWork', 'scheduleWork', 'expense'],
  home: ['scheduleWork', 'recordWork', 'observation', 'expense', 'harvest'],
};

const isPresetAllowed = (
  id: string,
  permissions?: CapturePermissions & { canUseWarehouse?: boolean }
): boolean => {
  if (!permissions) return true;
  switch (id) {
    case 'scheduleWork':
    case 'recordWork':
      return permissions.canRecordWork;
    case 'observation':
      return permissions.canRecordObservation;
    case 'expense':
      return permissions.canRecordExpense;
    case 'income':
      return permissions.canRecordIncome;
    case 'harvest':
    case 'sacks':
    case 'mill':
    case 'oil':
      return permissions.canRecordHarvest;
    case 'add':
    case 'sell':
    case 'give':
    case 'fill':
      return permissions.canUseWarehouse ?? permissions.canRecordMoney;
    default:
      return false;
  }
};

/**
 * Returns only the canonical moves for the current surface.
 * `groups` and `recentIds` are ignored so stale catalog/recents cannot leak in.
 */
export const buildQuickAddMoves = (input: {
  pathname: string;
  isHarvestLive?: boolean;
  sourcePage?: CaptureSourcePage;
  groups?: readonly unknown[];
  recentIds?: readonly string[];
  permissions?: CapturePermissions & { canUseWarehouse?: boolean };
}): CaptureMove[] => {
  const ctx = resolveQuickAddContext({
    pathname: input.pathname,
    sourcePage: input.sourcePage,
  });
  const moves: CaptureMove[] = [];
  for (const id of QUICK_PRESETS[ctx]) {
    if (!isPresetAllowed(id, input.permissions)) continue;
    const move = canonicalQuickMove(id);
    if (move) moves.push(move);
  }
  return moves;
};

/** Catalog section order for the full list (no horizontal tabs). */
export const CATALOG_SECTION_ORDER = ['day', 'grove', 'money', 'warehouse'] as const;

export type CatalogSectionId = (typeof CATALOG_SECTION_ORDER)[number];

/** Harvest leads during picking months. The rest of the year it follows the other records. */
export const catalogSectionOrder = (now = new Date()): CatalogSectionId[] => {
  const rest: CatalogSectionId[] = ['grove', 'money', 'warehouse'];
  return isOliveHarvestSeason(now) ? ['day', ...rest] : [...rest, 'day'];
};
