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
const DAY_EXTRA: HarvestCaptureKind[] = ['people', 'expense', 'income', 'note'];

const WAREHOUSE: WarehouseAction[] = ['add', 'give', 'sell', 'hold', 'fill', 'count'];

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

/**
 * Harvest records are always available. A live campaign only marks the next step.
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
  const suggested = isHarvestLive
    ? suggestHarvestKind(input.harvestKinds, input.openSacks ?? 0, input.openMillKg ?? 0)
    : null;
  for (const kind of PRODUCTION_KINDS) {
    if (!input.harvestKinds.includes(kind)) continue;
    dayMoves.push({
      id: kind,
      surface: 'harvest',
      kind,
      featured: kind === suggested,
    });
  }
  for (const kind of DAY_EXTRA) {
    if (!input.harvestKinds.includes(kind)) continue;
    dayMoves.push({ id: kind, surface: 'harvest', kind });
  }

  const grove: CaptureMove[] = [];
  if (permissions.canRecordWork) grove.push(captureMove('work'));
  if (permissions.canRecordPhoto) grove.push(captureMove('photo'));
  if (permissions.canRecordObservation) grove.push(captureMove('observation'));
  if (permissions.canRecordVoice) grove.push(captureMove('voice'));
  if (permissions.canRecordDocument) grove.push(captureMove('document'));

  const warehouse: CaptureMove[] = canUseWarehouse
    ? WAREHOUSE.map((action) => ({ id: action, surface: 'warehouse' as const, action }))
    : [];

  const money: CaptureMove[] = [];
  if (permissions.canRecordIncome) {
    money.push(captureMove('income'));
    money.push({ id: 'oil_sale', surface: 'capture', type: 'income' });
  }
  if (permissions.canRecordExpense) {
    money.push(captureMove('expense'));
    money.push({ id: 'payment', surface: 'capture', type: 'expense' });
  }

  return [
    { id: 'day', moves: dayMoves },
    { id: 'grove', moves: grove },
    { id: 'warehouse', moves: warehouse },
    { id: 'money', moves: money },
  ];
};
