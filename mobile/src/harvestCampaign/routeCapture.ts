import type { CaptureType } from '../capture/types';

/** Only an explicit harvest choice opens the live campaign. The + still shows every record type. */
export const shouldRouteCaptureToHarvest = (preferredType?: CaptureType): boolean =>
  preferredType === 'harvest';
