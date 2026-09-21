import type { CaptureContext } from './types';

export type CapturePermissions = {
  canRecordObservation: boolean;
  canRecordWork: boolean;
  canRecordExpense: boolean;
  canRecordIncome: boolean;
  canRecordHarvest: boolean;
  canRecordMoney: boolean;
  canRecordVoice: boolean;
  canRecordDocument: boolean;
};

/**
 * Centralize Capture availability from existing capacity signals.
 * Backend remains authoritative; this only shapes UI choices.
 */
export const getAvailableCaptureActions = (opts: {
  hasAnyFieldAccess: boolean;
  canOwn?: boolean;
  canWork?: boolean;
  /** When set, module grants further restrict income / harvest for collaborators. */
  familyModules?: ReadonlySet<string> | null;
}): CapturePermissions => {
  const access = opts.hasAnyFieldAccess;
  const canOwn = Boolean(opts.canOwn);
  const canWork = Boolean(opts.canWork) || canOwn;
  const modules = opts.familyModules;
  const hasFamilyModules = Boolean(modules && modules.size > 0);
  const hasMoneyModule = !hasFamilyModules || Boolean(modules?.has('money'));
  const hasHarvestModule = !hasFamilyModules || Boolean(modules?.has('harvest'));

  return {
    canRecordObservation: access,
    canRecordWork: canWork,
    canRecordExpense: canOwn || canWork,
    canRecordIncome: canOwn && hasMoneyModule,
    canRecordHarvest: canOwn && hasHarvestModule,
    canRecordMoney: canOwn || canWork,
    canRecordVoice: access,
    canRecordDocument: access,
  };
};

export type { CaptureContext };
