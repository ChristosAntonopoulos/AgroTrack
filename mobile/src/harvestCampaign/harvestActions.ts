import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { HarvestCaptureKind } from './types';

export const HARVEST_ACTION_ICONS: Record<
  HarvestCaptureKind,
  ComponentProps<typeof Ionicons>['name']
> = {
  sacks: 'bag',
  mill: 'leaf',
  oil: 'water',
  people: 'people',
  expense: 'wallet',
  income: 'cash',
  note: 'camera',
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
