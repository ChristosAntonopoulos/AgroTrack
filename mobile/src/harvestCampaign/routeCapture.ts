import type { CaptureType } from '../capture/types';

export const shouldRouteCaptureToHarvest = (preferredType?: CaptureType): boolean =>
  !preferredType || preferredType === 'harvest';
