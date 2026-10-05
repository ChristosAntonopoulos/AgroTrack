import type { CaptureMenuGroup, CaptureMove } from './menu';
import type { CaptureSourcePage } from './types';
import { isOliveHarvestSeason } from '../utils/harvestSeason';

export type QuickAddContext =
  | 'harvest'
  | 'warehouse'
  | 'grove'
  | 'money'
  | 'tasks'
  | 'photos'
  | 'home';

/** Which page/context drives the four Quick Add slots. */
export const resolveQuickAddContext = (input: {
  pathname: string;
  isHarvestLive?: boolean;
  sourcePage?: CaptureSourcePage;
}): QuickAddContext => {
  if (input.sourcePage === 'harvest') return 'harvest';
  if (input.sourcePage === 'warehouse') return 'warehouse';
  if (input.sourcePage === 'money') return 'money';
  if (input.sourcePage === 'tasks') return 'tasks';
  if (input.sourcePage === 'photos') return 'photos';
  if (input.sourcePage === 'grove') return 'grove';
  if (input.sourcePage === 'chronologio' || input.sourcePage === 'home') {
    return input.isHarvestLive ? 'harvest' : 'home';
  }

  const path = input.pathname || '/';
  if (path === '/harvest' || path.startsWith('/harvest/')) return 'harvest';
  if (path === '/my-oil' || path.startsWith('/my-oil/')) return 'warehouse';
  if (path === '/money' || path.startsWith('/money/')) return 'money';
  if (path === '/tasks' || path.startsWith('/tasks/')) return 'tasks';
  if (path === '/photos' || path.startsWith('/photos/')) return 'photos';
  if (path === '/fields' || path.startsWith('/fields/')) return 'grove';
  if (input.isHarvestLive) return 'harvest';
  return 'home';
};

/** Preferred move ids for each context (first available wins). */
export const QUICK_PRESETS: Record<QuickAddContext, readonly string[]> = {
  harvest: ['sacks', 'mill', 'oil', 'expense'],
  warehouse: ['add', 'give', 'sell', 'hold'],
  grove: ['work', 'observation', 'expense', 'photo'],
  money: ['expense', 'income', 'oil_sale', 'payment'],
  tasks: ['work', 'observation', 'expense', 'photo'],
  photos: ['photo', 'observation', 'work', 'expense'],
  /** Universal four when harvest is closed; sacks inserted when live via harvest context. */
  home: ['work', 'observation', 'expense', 'photo'],
};

const flattenMoves = (groups: readonly CaptureMenuGroup[]): CaptureMove[] =>
  groups.flatMap((group) => group.moves);

/**
 * Four obvious actions for the Quick Add sheet.
 * Context beats frequency: first 2 slots from presets, then recent, then fill.
 */
export const buildQuickAddMoves = (input: {
  pathname: string;
  isHarvestLive?: boolean;
  sourcePage?: CaptureSourcePage;
  groups: readonly CaptureMenuGroup[];
  recentIds?: readonly string[];
}): CaptureMove[] => {
  const ctx = resolveQuickAddContext({
    pathname: input.pathname,
    isHarvestLive: input.isHarvestLive,
    sourcePage: input.sourcePage,
  });
  const available = flattenMoves(input.groups);
  // Harvest and money both use expense/income ids. On Χρήματα the money record wins.
  const byId = new Map<string, CaptureMove>();
  for (const move of available) {
    const existing = byId.get(move.id);
    if (!existing) {
      byId.set(move.id, move);
      continue;
    }
    if (ctx === 'money' && existing.surface === 'harvest' && move.surface === 'capture') {
      byId.set(move.id, move);
    }
  }

  let presets = [...QUICK_PRESETS[ctx]];
  if (ctx === 'home' && input.isHarvestLive && byId.has('sacks')) {
    presets = ['sacks', 'work', 'expense', 'observation'];
  }

  const picked: CaptureMove[] = [];
  const seen = new Set<string>();
  const pushId = (id: string) => {
    if (seen.has(id) || picked.length >= 4) return;
    const move = byId.get(id);
    if (!move) return;
    seen.add(id);
    picked.push(move);
  };

  // 1) Two fixed context presets (muscle memory).
  for (const id of presets.slice(0, 2)) pushId(id);

  // 2) Recent intersection with this context's available pool.
  for (const id of input.recentIds || []) pushId(id);

  // 3) Remaining presets, then anything else available.
  for (const id of presets) pushId(id);
  for (const move of available) pushId(move.id);

  return picked;
};

/** Catalog section order for the full list (no horizontal tabs). */
export const CATALOG_SECTION_ORDER = ['day', 'grove', 'money', 'warehouse'] as const;

export type CatalogSectionId = (typeof CATALOG_SECTION_ORDER)[number];

/** Harvest leads during picking months. The rest of the year it follows the other records. */
export const catalogSectionOrder = (now = new Date()): CatalogSectionId[] => {
  const rest: CatalogSectionId[] = ['grove', 'money', 'warehouse'];
  return isOliveHarvestSeason(now) ? ['day', ...rest] : [...rest, 'day'];
};
