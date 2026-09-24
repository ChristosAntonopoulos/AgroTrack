import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { HarvestCaptureKind } from './types';

export const HARVEST_ACTION_ICONS: Record<
  HarvestCaptureKind,
  ComponentProps<typeof Ionicons>['name']
> = {
  sacks: 'bag-handle-outline',
  mill: 'scale-outline',
  oil: 'water-outline',
  people: 'people-outline',
  expense: 'wallet-outline',
  income: 'cash-outline',
  note: 'camera-outline',
};

export const HARVEST_HOME_ACTIONS: HarvestCaptureKind[] = [
  'sacks',
  'mill',
  'oil',
  'expense',
  'income',
  'people',
  'note',
];
