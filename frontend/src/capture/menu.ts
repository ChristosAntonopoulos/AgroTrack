import type { CapturePermissions, CaptureTab, CaptureType } from './types';
import type { HarvestCaptureKind } from '../harvestCampaign/types';

export type WarehouseAction = 'add' | 'give' | 'sell' | 'hold' | 'fill' | 'count';

export type CaptureMove =
  | { id: string; surface: 'capture'; type: CaptureType; featured?: boolean }
  | { id: string; surface: 'harvest'; kind: HarvestCaptureKind; featured?: boolean }
  | { id: string; surface: 'warehouse'; action: WarehouseAction }
  | { id: string; surface: 'money'; type: 'money' };

export type CaptureMenuGroup = {
  id: CaptureTab;
  moves: CaptureMove[];
};

const HARVEST_KINDS: HarvestCaptureKind[] = [
  'sacks',
  'mill',
  'oil',
  'people',
  'expense',
  'income',
  'note',
];

export const PRODUCTION_KINDS: HarvestCaptureKind[] = ['sacks', 'mill', 'oil'];

const WAREHOUSE_PRIMARY: WarehouseAction[] = ['add', 'sell', 'give', 'fill'];

export const isHarvestCaptureKind = (value: string | null | undefined): value is HarvestCaptureKind =>
  !!value && (HARVEST_KINDS as string[]).includes(value);

export const isWarehouseAction = (value: string | null | undefined): value is WarehouseAction =>
  value === 'add' ||
  value === 'give' ||
  value === 'sell' ||
  value === 'hold' ||
  value === 'fill' ||
  value === 'count';

/** Next production step while a harvest is open. Sacks waiting beat a fresh start. */
export const suggestHarvestKind = (
  kinds: readonly HarvestCaptureKind[],
  openSacks: number,
  openMillKg: number
): HarvestCaptureKind | null => {
  const production = PRODUCTION_KINDS.filter((kind) => kinds.includes(kind));
  if (production.includes('mill') && openSacks > 0) return 'mill';
  if (production.includes('oil') && openMillKg > 0) return 'oil';
  if (production.includes('sacks')) return 'sacks';
  return production[0] ?? null;
};

const captureMove = (type: CaptureType): CaptureMove => ({
  id: type,
  surface: 'capture',
  type,
});

/** Exact Quick Add move for a preset id. Does not look up the catalog or recents. */
export const canonicalQuickMove = (id: string): CaptureMove | null => {
  switch (id) {
    case 'work':
    case 'observation':
    case 'expense':
    case 'income':
    case 'harvest':
      return { id, surface: 'capture', type: id };
    case 'sacks':
    case 'mill':
    case 'oil':
      return { id, surface: 'harvest', kind: id };
    case 'add':
    case 'sell':
    case 'give':
    case 'fill':
    case 'count':
      return { id, surface: 'warehouse', action: id };
    default:
      return null;
  }
};

const uniqueMoveIds = (groups: CaptureMenuGroup[]): CaptureMenuGroup[] => {
  const seen = new Set<string>();
  return groups.map((group) => ({
    ...group,
    moves: group.moves.filter((move) => {
      if (seen.has(move.id)) return false;
      seen.add(move.id);
      return true;
    }),
  }));
};

/**
 * One move id per real event. Production steps only while harvest is live.
 * Count lives in the warehouse catalog (Περισσότερα), not Quick Add.
 */
export const buildCaptureMenu = (input: {
  permissions: CapturePermissions;
  harvestKinds: readonly HarvestCaptureKind[];
  isHarvestLive: boolean;
  canUseWarehouse: boolean;
  openSacks?: number;
  openMillKg?: number;
}): CaptureMenuGroup[] => {
  const { permissions, canUseWarehouse, isHarvestLive } = input;

  const dayMoves: CaptureMove[] = [];
  if (isHarvestLive) {
    const suggested = suggestHarvestKind(
      input.harvestKinds,
      input.openSacks ?? 0,
      input.openMillKg ?? 0
    );
    for (const kind of PRODUCTION_KINDS) {
      if (!input.harvestKinds.includes(kind)) continue;
      dayMoves.push({
        id: kind,
        surface: 'harvest',
        kind,
        featured: kind === suggested,
      });
    }
  } else if (permissions.canRecordHarvest) {
    dayMoves.push(captureMove('harvest'));
  }

  const grove: CaptureMove[] = [];
  if (permissions.canRecordWork) grove.push(captureMove('work'));
  if (permissions.canRecordObservation) grove.push(captureMove('observation'));

  const warehouse: CaptureMove[] = canUseWarehouse
    ? [
        ...WAREHOUSE_PRIMARY.map((action) => ({ id: action, surface: 'warehouse' as const, action })),
        { id: 'count', surface: 'warehouse' as const, action: 'count' as const },
      ]
    : [];

  const money: CaptureMove[] = [];
  if (permissions.canRecordIncome) money.push(captureMove('income'));
  if (permissions.canRecordExpense) money.push(captureMove('expense'));
  if (canUseWarehouse) {
    money.push({ id: 'sell', surface: 'warehouse', action: 'sell' });
  }

  return uniqueMoveIds([
    { id: 'day', moves: dayMoves },
    { id: 'grove', moves: grove },
    { id: 'warehouse', moves: warehouse },
    { id: 'money', moves: money },
  ]);
};
