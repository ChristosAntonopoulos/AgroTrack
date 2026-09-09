import type { CaptureContext } from './types';

export type CapturePermissions = {
  canRecordObservation: boolean;
  canRecordWork: boolean;
  canRecordExpense: boolean;
  canRecordHarvest: boolean;
};

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
    canRecordHarvest: canOwn,
  };
};

export type { CaptureContext };
