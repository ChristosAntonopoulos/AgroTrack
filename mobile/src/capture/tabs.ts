import type { CaptureTab, CaptureType } from './types';

/** Map a preferred capture type onto a tab when the caller did not set `tab`. */
export const tabFromPreferredType = (preferredType?: CaptureType): CaptureTab | null => {
  if (!preferredType) return null;
  if (preferredType === 'money' || preferredType === 'expense' || preferredType === 'income') {
    return 'money';
  }
  if (preferredType === 'harvest') return 'day';
  if (
    preferredType === 'work' ||
    preferredType === 'scheduleWork' ||
    preferredType === 'recordWork' ||
    preferredType === 'photo' ||
    preferredType === 'observation' ||
    preferredType === 'voice' ||
    preferredType === 'document'
  ) {
    return 'grove';
  }
  return null;
};

/**
 * Default tab from the current path.
 * Harvest-live prefers Ημέρα except on money / cellar pages.
 */
export const defaultCaptureTab = (input: {
  pathname: string;
  isHarvestLive?: boolean;
  preferredType?: CaptureType;
  tab?: CaptureTab;
}): CaptureTab => {
  if (input.tab) return input.tab;
  const fromType = tabFromPreferredType(input.preferredType);
  if (fromType) return fromType;

  const path = input.pathname || '/';
  if (path === '/harvest' || path.startsWith('/harvest/')) return 'day';
  if (path === '/my-oil' || path.startsWith('/my-oil/')) return 'warehouse';
  if (path === '/money' || path.startsWith('/money/')) return 'money';

  if (input.isHarvestLive) return 'day';
  return 'grove';
};

/** Mobile route name → same defaults as web paths. */
export const defaultCaptureTabFromRoute = (input: {
  routeName?: string;
  isHarvestLive?: boolean;
  preferredType?: CaptureType;
  tab?: CaptureTab;
}): CaptureTab => {
  if (input.tab) return input.tab;
  const fromType = tabFromPreferredType(input.preferredType);
  if (fromType) return fromType;

  const name = input.routeName || '';
  if (name === 'HarvestCampaign' || name === 'ThisHarvest' || name === 'ThisHarvestReview') {
    return 'day';
  }
  if (name === 'MyOil') return 'warehouse';
  if (name === 'Money') return 'money';

  if (input.isHarvestLive) return 'day';
  return 'grove';
};
