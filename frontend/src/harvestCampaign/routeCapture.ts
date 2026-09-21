import type { CaptureType } from '../capture/types';

/** Generic + and harvest capture join the harvest add menu while a harvest is live. */
export const shouldRouteCaptureToHarvest = (preferredType?: CaptureType): boolean =>
  !preferredType || preferredType === 'harvest';
