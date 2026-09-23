import type { CapturePermissions } from '../capture/permissions';
import type { Field } from '../services/fieldService';
import type { FieldAccessLevel, FieldCapabilities } from '../services/fieldPeopleService';

export type FieldGates = {
  /** Present when the field payload included API capabilities. */
  capabilities: FieldCapabilities | null;
  canOwn: boolean;
  canManageAccess: boolean;
  canDelete: boolean;
  canViewMoney: boolean;
  canCapture: boolean;
  canViewChronologio: boolean;
  canViewMap: boolean;
  canViewPhotos: boolean;
  canUploadPhotos: boolean;
  canViewTasks: boolean;
  canManageTasks: boolean;
  canViewHarvest: boolean;
  canViewSensitiveIdentity: boolean;
  canViewEnvironmentalData: boolean;
  canViewDocuments: boolean;
  canManageDocuments: boolean;
};

type GateField = Pick<Field, 'ownerId' | 'capabilities' | 'memberships'> | null | undefined;

const legacyCanOwn = (
  field: GateField,
  userId?: string | null,
  userRole?: string | null
): boolean => {
  if (userRole === 'Administrator') return true;
  const memberships = field?.memberships;
  if (memberships && memberships.length > 0) {
    if (userId && field?.ownerId === userId) return true;
    return Boolean(
      userId &&
        memberships.some(
          (member) =>
            member.userId === userId &&
            (member.status || 'active') === 'active' &&
            member.role === 'Admin'
        )
    );
  }
  if (!field || !userId) return false;
  return field.ownerId === userId || userRole === 'FieldOwner';
};

/**
 * Same fallbacks as web FieldDetailPage: API capabilities win.
 * Owner-role heuristics apply only when the payload has no capabilities.
 */
export const resolveFieldGates = (input: {
  field?: GateField;
  userId?: string | null;
  userRole?: string | null;
}): FieldGates => {
  const capabilities = input.field?.capabilities ?? null;
  const canOwn = capabilities
    ? Boolean(capabilities.canEditField)
    : legacyCanOwn(input.field, input.userId, input.userRole);

  if (!capabilities) {
    return {
      capabilities: null,
      canOwn,
      canManageAccess: canOwn,
      canDelete: canOwn,
      canViewMoney: canOwn,
      canCapture: true,
      canViewChronologio: true,
      canViewMap: true,
      canViewPhotos: true,
      canUploadPhotos: canOwn,
      canViewTasks: true,
      canManageTasks: canOwn,
      canViewHarvest: true,
      canViewSensitiveIdentity: true,
      canViewEnvironmentalData: true,
      canViewDocuments: true,
      canManageDocuments: canOwn,
    };
  }

  return {
    capabilities,
    canOwn,
    canManageAccess: Boolean(capabilities.canManageAccess),
    canDelete: Boolean(capabilities.canDeleteField),
    canViewMoney: Boolean(capabilities.canViewMoney),
    canCapture: capabilities.canCreateRecords !== false,
    canViewChronologio: capabilities.canViewChronologio !== false,
    canViewMap: capabilities.canViewBoundary !== false,
    canViewPhotos: capabilities.canViewPhotos !== false,
    canUploadPhotos: Boolean(capabilities.canUploadPhotos),
    canViewTasks: capabilities.canViewTasks !== false,
    canManageTasks: Boolean(capabilities.canManageTasks),
    canViewHarvest: capabilities.canViewHarvest !== false,
    canViewSensitiveIdentity: capabilities.canViewSensitiveIdentity !== false,
    canViewEnvironmentalData: capabilities.canViewEnvironmentalData !== false,
    canViewDocuments: capabilities.canViewDocuments !== false,
    canManageDocuments: Boolean(capabilities.canManageDocuments),
  };
};

const modulesFromCapabilities = (capabilities: FieldCapabilities): ReadonlySet<string> => {
  const modules = new Set<string>();
  if (capabilities.canViewChronologio) modules.add('chronologio');
  if (capabilities.canViewTasks || capabilities.canManageTasks) modules.add('tasks');
  if (capabilities.canViewPhotos || capabilities.canUploadPhotos) modules.add('photos');
  if (capabilities.canViewMoney) modules.add('money');
  if (capabilities.canViewHarvest) modules.add('harvest');
  if (capabilities.canViewDocuments || capabilities.canManageDocuments) modules.add('documents');
  return modules;
};

export type CaptureSeat = {
  canOwn: boolean;
  canWork: boolean;
  familyModules: ReadonlySet<string> | null;
  accessLevel: FieldAccessLevel | null;
};

/** Seat used by capture permissions for one field. Null modules means unrestricted (admin). */
export const captureSeatFromCapabilities = (
  capabilities: FieldCapabilities,
  hookAccessLevel?: FieldAccessLevel | null
): CaptureSeat => {
  if (capabilities.canEditField || capabilities.canManageAccess) {
    return { canOwn: true, canWork: true, familyModules: null, accessLevel: null };
  }
  const accessLevel: FieldAccessLevel = capabilities.canCreateRecords
    ? 'work'
    : capabilities.canManageTasks || hookAccessLevel === 'help'
      ? 'help'
      : 'view';
  return {
    canOwn: false,
    canWork: capabilities.canCreateRecords || capabilities.canManageTasks || accessLevel === 'help',
    familyModules: modulesFromCapabilities(capabilities),
    accessLevel,
  };
};

export const capturePermissionsFromCapabilities = (
  capabilities: FieldCapabilities,
  hookAccessLevel?: FieldAccessLevel | null
): CapturePermissions => {
  const seat = captureSeatFromCapabilities(capabilities, hookAccessLevel);
  const write = capabilities.canCreateRecords;
  if (seat.accessLevel === 'view') {
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
  if (seat.accessLevel === 'help') {
    return {
      canRecordObservation: capabilities.canViewChronologio,
      canRecordPhoto: false,
      canRecordWork: capabilities.canManageTasks,
      canRecordExpense: false,
      canRecordIncome: false,
      canRecordHarvest: false,
      canRecordMoney: false,
      canRecordVoice: capabilities.canViewChronologio,
      canRecordDocument: capabilities.canViewDocuments,
    };
  }
  return {
    canRecordObservation: capabilities.canViewChronologio,
    canRecordPhoto: capabilities.canUploadPhotos,
    canRecordWork: capabilities.canManageTasks || write,
    canRecordExpense: write && capabilities.canViewMoney,
    canRecordIncome: seat.canOwn && capabilities.canViewMoney,
    canRecordHarvest: seat.canOwn && capabilities.canViewHarvest,
    canRecordMoney: (seat.canOwn || write) && capabilities.canViewMoney,
    canRecordVoice: capabilities.canViewChronologio,
    canRecordDocument: capabilities.canManageDocuments,
  };
};

export type HarvestSeat = {
  canOwn: boolean;
  canWork: boolean;
  accessLevel: FieldAccessLevel | null;
  harvestModuleGranted: boolean;
};

/**
 * When field payloads include capabilities, harvest rights follow those fields
 * instead of the signed-in user's global role.
 */
export const harvestSeatFromFields = (
  fields: Array<Pick<Field, 'id' | 'capabilities'>>,
  preferredFieldId?: string | null
): HarvestSeat | null => {
  const relevant = preferredFieldId
    ? fields.filter((field) => field.id === preferredFieldId)
    : fields;
  const caps = relevant
    .map((field) => field.capabilities)
    .filter((value): value is FieldCapabilities => Boolean(value));
  if (!caps.length) return null;

  const canOwn = caps.some((item) => item.canEditField);
  const canCreate = caps.some((item) => item.canCreateRecords);
  const canManageTasks = caps.some((item) => item.canManageTasks);
  const accessLevel: FieldAccessLevel | null = canOwn
    ? null
    : canCreate
      ? 'work'
      : canManageTasks
        ? 'help'
        : 'view';

  return {
    canOwn,
    canWork: canOwn || canCreate || canManageTasks,
    accessLevel,
    harvestModuleGranted: canOwn || caps.some((item) => item.canViewHarvest),
  };
};
