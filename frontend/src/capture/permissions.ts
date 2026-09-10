import type { CapturePermissions } from './types';

/**
 * Centralize Capture availability from existing capacity signals.
 * Backend remains authoritative; this only shapes UI choices.
 */
export const getAvailableCaptureActions = (opts: {
  hasAnyFieldAccess: boolean;
  canOwn?: boolean;
  canWork?: boolean;
}): CapturePermissions => {
  const access = opts.hasAnyFieldAccess;
  const canOwn = Boolean(opts.canOwn);
  const canWork = Boolean(opts.canWork) || canOwn;

  return {
    canRecordObservation: access,
    canRecordWork: canWork,
    canRecordExpense: canOwn || canWork,
    canRecordIncome: canOwn,
    canRecordHarvest: canOwn,
    canRecordMoney: canOwn || canWork,
  };
};
