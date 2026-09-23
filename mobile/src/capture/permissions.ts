import type { CaptureContext } from './types';

export type CapturePermissions = {
  canRecordObservation: boolean;
  canRecordPhoto: boolean;
  canRecordWork: boolean;
  canRecordExpense: boolean;
  canRecordIncome: boolean;
  canRecordHarvest: boolean;
  canRecordMoney: boolean;
  canRecordVoice: boolean;
  canRecordDocument: boolean;
};

export const getAvailableCaptureActions = (opts: {
  hasAnyFieldAccess: boolean;
  canOwn?: boolean;
  canWork?: boolean;
  familyModules?: ReadonlySet<string> | null;
  accessLevel?: 'view' | 'help' | 'work' | null;
}): CapturePermissions => {
  const access = opts.hasAnyFieldAccess;
  const accessLevel = opts.accessLevel ?? null;
  const modules = opts.familyModules;
  const restrictByModules = modules != null;
  const has = (module: string) => !restrictByModules || modules.has(module);

  if (accessLevel === 'view') {
    return {
      canRecordObservation: false,
      canRecordPhoto: false,
      canRecordWork: false,
      canRecordExpense: false,
      canRecordIncome: false,
      canRecordHarvest: false,
      canRecordMoney: false,
      canRecordVoice: false,
      canRecordDocument: false,
    };
  }

  const canOwn = Boolean(opts.canOwn);
  const canWork = Boolean(opts.canWork) || canOwn;

  if (accessLevel === 'help') {
    return {
      canRecordObservation: access && has('chronologio'),
      canRecordPhoto: false,
      canRecordWork: (canWork || access) && has('tasks'),
      canRecordExpense: false,
      canRecordIncome: false,
      canRecordHarvest: false,
      canRecordMoney: false,
      canRecordVoice: access && has('chronologio'),
      canRecordDocument: access && has('documents'),
    };
  }

  return {
    canRecordObservation: access && has('chronologio'),
    canRecordPhoto: access && has('photos') && (canOwn || canWork),
    canRecordWork: canWork && has('tasks'),
    canRecordExpense: (canOwn || canWork) && has('money'),
    canRecordIncome: canOwn && has('money'),
    canRecordHarvest: canOwn && has('harvest'),
    canRecordMoney: (canOwn || canWork) && has('money'),
    canRecordVoice: access && has('chronologio'),
    canRecordDocument: access && has('documents'),
  };
};

export type { CaptureContext };
