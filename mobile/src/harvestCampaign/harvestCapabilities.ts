import { getAvailableCaptureActions } from '../capture/permissions';
import type { FieldAccessLevel } from '../services/fieldPeopleService';
import type { HarvestCaptureKind } from './types';

export type HarvestCapabilities = {
  canView: boolean;
  canStart: boolean;
  canAddSacks: boolean;
  canAddMill: boolean;
  canAddOil: boolean;
  canAddPeople: boolean;
  canAddExpense: boolean;
  canAddIncome: boolean;
  canAddNote: boolean;
  canCloseDay: boolean;
  canReopenDay: boolean;
  canCompleteSeason: boolean;
  canReopenSeason: boolean;
  canPause: boolean;
  canMutateDay: boolean;
  canUseChronologioHarvest: boolean;
  isViewOnly: boolean;
  editRestrictionReasonKey: 'viewOnly' | 'helpOnly' | 'noProduce' | null;
  captureKinds: HarvestCaptureKind[];
};

export type HarvestCapabilityInput = {
  hasAnyFieldAccess: boolean;
  canOwn?: boolean;
  canWork?: boolean;
  familyModules?: ReadonlySet<string> | null;
  accessLevel?: FieldAccessLevel | null;
  harvestModuleGranted?: boolean;
};

export const getHarvestCapabilities = (opts: HarvestCapabilityInput): HarvestCapabilities => {
  const capture = getAvailableCaptureActions({
    hasAnyFieldAccess: opts.hasAnyFieldAccess,
    canOwn: opts.canOwn,
    canWork: opts.canWork,
    familyModules: opts.familyModules,
    accessLevel: opts.accessLevel === 'view' || opts.accessLevel === 'help' || opts.accessLevel === 'work'
      ? opts.accessLevel
      : null,
  });

  const modules = opts.familyModules;
  const hasFamilyModules = Boolean(modules && modules.size > 0);
  const harvestModule =
    opts.harvestModuleGranted ?? (!hasFamilyModules || Boolean(modules?.has('harvest')));

  const canOwn = Boolean(opts.canOwn);
  const canWork = Boolean(opts.canWork) || canOwn;
  const helpOnly = opts.accessLevel === 'help';
  const viewOnly = opts.accessLevel === 'view';

  const canView = opts.hasAnyFieldAccess && harvestModule;
  const canProduce =
    canView && !viewOnly && !helpOnly && (canOwn || (canWork && harvestModule) || capture.canRecordHarvest);
  const canStart = canView && canOwn && !viewOnly;
  const canCompleteSeason = canOwn && canView && !viewOnly;
  const canReopenSeason = canOwn && canView && !viewOnly;
  const canPause = canOwn && canView && !viewOnly;
  const canCloseDay = canProduce || (canOwn && !viewOnly);
  const canAddExpense = canView && !viewOnly && capture.canRecordExpense;
  const canAddIncome = canView && !viewOnly && capture.canRecordIncome;
  const canAddNote = canView && !viewOnly && capture.canRecordObservation;

  const captureKinds: HarvestCaptureKind[] = [];
  if (canProduce) {
    captureKinds.push('sacks', 'mill', 'oil', 'people');
  }
  if (canAddExpense) captureKinds.push('expense');
  if (canAddNote) captureKinds.push('note');

  const isViewOnly = canView && !canProduce && captureKinds.length === 0;
  let editRestrictionReasonKey: HarvestCapabilities['editRestrictionReasonKey'] = null;
  if (canView && !canProduce) {
    if (viewOnly) editRestrictionReasonKey = 'viewOnly';
    else if (helpOnly) editRestrictionReasonKey = 'helpOnly';
    else editRestrictionReasonKey = 'noProduce';
  }

  return {
    canView,
    canStart,
    canAddSacks: canProduce,
    canAddMill: canProduce,
    canAddOil: canProduce,
    canAddPeople: canProduce,
    canAddExpense,
    canAddIncome,
    canAddNote,
    canCloseDay,
    canReopenDay: canCloseDay,
    canCompleteSeason,
    canReopenSeason,
    canPause,
    canMutateDay: canCloseDay,
    canUseChronologioHarvest: canView,
    isViewOnly,
    editRestrictionReasonKey,
    captureKinds,
  };
};
