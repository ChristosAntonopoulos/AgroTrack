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
  /** Chronologio harvest category / deep-links into /harvest */
  canUseChronologioHarvest: boolean;
  /**
   * True when the seat can see the harvest but cannot change production
   * (view-only, help-only without produce, or harvest module without work rights).
   */
  isViewOnly: boolean;
  /**
   * Short reason shown inline when the user can view but not edit production.
   * Null when full edit is available or harvest is not viewable.
   */
  editRestrictionReasonKey: 'viewOnly' | 'helpOnly' | 'noProduce' | null;
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

  // View-only seats can still open harvest; they just cannot mutate.
  const canView = opts.hasAnyFieldAccess && harvestModule;
  // Production captures: owners always; workers with harvest module (not help/view).
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
  if (canAddIncome) captureKinds.push('income');
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
    canUseChronologioHarvest: canView,
    isViewOnly,
    editRestrictionReasonKey,
    captureKinds,
  };
};
