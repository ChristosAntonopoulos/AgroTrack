import type { FieldAccessLevel } from '../services/fieldPeopleService';
import type { CapturePermissions } from './types';

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
  /** Seat access level on the active field — view/help further restrict creates. */
  accessLevel?: FieldAccessLevel | null;
}): CapturePermissions => {
  const access = opts.hasAnyFieldAccess;
  const accessLevel = opts.accessLevel ?? null;

  if (accessLevel === 'view') {
    return {
      canRecordObservation: false,
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
  const modules = opts.familyModules;
  const hasFamilyModules = Boolean(modules && modules.size > 0);
  const hasMoneyModule = !hasFamilyModules || Boolean(modules?.has('money'));
  const hasHarvestModule = !hasFamilyModules || Boolean(modules?.has('harvest'));

  // Help: status / observation / work only — not money or harvest create (matches BE help).
  if (accessLevel === 'help') {
    return {
      canRecordObservation: access,
      canRecordWork: canWork || access,
      canRecordExpense: false,
      canRecordIncome: false,
      canRecordHarvest: false,
      canRecordMoney: false,
      canRecordVoice: access,
      canRecordDocument: access,
    };
  }

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
