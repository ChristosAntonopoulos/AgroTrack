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
  canAddNote: boolean;
  canCloseDay: boolean;
  canReopenDay: boolean;
  canCompleteSeason: boolean;
  canReopenSeason: boolean;
  canPause: boolean;
  /** Chronologio harvest category / deep-links into /harvest */
  canUseChronologioHarvest: boolean;
  captureKinds: HarvestCaptureKind[];
};

export type HarvestCapabilityInput = {
  hasAnyFieldAccess: boolean;
  canOwn?: boolean;
  canWork?: boolean;
  familyModules?: ReadonlySet<string> | null;
  accessLevel?: FieldAccessLevel | null;
  /** True when nav gate would hide /harvest for collaborators. */
  harvestModuleGranted?: boolean;
};

/**
 * Single FE source for harvest menus, sheets, and Chronologio harvest chip.
 * Money/expense rights reuse Capture permissions so Add menu never offers a dead Expense.
 */
export const getHarvestCapabilities = (opts: HarvestCapabilityInput): HarvestCapabilities => {
  const capture = getAvailableCaptureActions({
    hasAnyFieldAccess: opts.hasAnyFieldAccess,
    canOwn: opts.canOwn,
    canWork: opts.canWork,
    familyModules: opts.familyModules,
    accessLevel: opts.accessLevel,
  });

  const modules = opts.familyModules;
  const hasFamilyModules = Boolean(modules && modules.size > 0);
  const harvestModule =
    opts.harvestModuleGranted ?? (!hasFamilyModules || Boolean(modules?.has('harvest')));

  const canOwn = Boolean(opts.canOwn);
  const canWork = Boolean(opts.canWork) || canOwn;
  const helpOnly = opts.accessLevel === 'help';
  const viewOnly = opts.accessLevel === 'view';

  const canView = opts.hasAnyFieldAccess && harvestModule && !viewOnly;
  // Production captures: owners always; workers with harvest module (not help/view).
  const canProduce =
    canView && !helpOnly && (canOwn || (canWork && harvestModule) || capture.canRecordHarvest);
  const canStart = canView && canOwn;
  const canCompleteSeason = canOwn && canView;
  const canReopenSeason = canOwn && canView;
  const canPause = canOwn && canView;
  const canCloseDay = canProduce || canOwn;
  const canAddExpense = canView && capture.canRecordExpense;
  const canAddNote = canView && capture.canRecordObservation;

  const captureKinds: HarvestCaptureKind[] = [];
  if (canProduce) {
    captureKinds.push('sacks', 'mill', 'oil', 'people');
  }
  if (canAddExpense) captureKinds.push('expense');
  if (canAddNote) captureKinds.push('note');

  return {
    canView,
    canStart,
    canAddSacks: canProduce,
    canAddMill: canProduce,
    canAddOil: canProduce,
    canAddPeople: canProduce,
    canAddExpense,
    canAddNote,
    canCloseDay,
    canReopenDay: canCloseDay,
    canCompleteSeason,
    canReopenSeason,
    canPause,
    canUseChronologioHarvest: canView,
    captureKinds,
  };
};
