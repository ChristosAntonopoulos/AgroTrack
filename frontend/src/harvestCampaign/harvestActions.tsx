import {
  Droplets,
  Package,
  Scale,
  StickyNote,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { HarvestCaptureKind } from './types';

export const HARVEST_ACTION_ICONS: Record<HarvestCaptureKind, LucideIcon> = {
  sacks: Package,
  mill: Scale,
  oil: Droplets,
  people: Users,
  expense: Wallet,
  note: StickyNote,
};

export const HARVEST_HOME_ACTIONS: HarvestCaptureKind[] = [
  'sacks',
  'mill',
  'oil',
  'expense',
  'people',
  'note',
];
