/**
 * Totals lifecycle: Pause never opens the complete sheet.
 * Stop / finish is the only path that opens complete confirmation.
 */
export type HarvestTotalsLifecycleIntent = 'pause' | 'resume' | 'openComplete';

export const resolveHarvestTotalsLifecycle = (
  action: 'pause' | 'resume' | 'stop'
): HarvestTotalsLifecycleIntent => {
  if (action === 'pause') return 'pause';
  if (action === 'resume') return 'resume';
  return 'openComplete';
};
