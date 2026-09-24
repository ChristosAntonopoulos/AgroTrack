import type { ChronologioEntry } from '../services/chronologioService';
import {
  fieldPath,
  fieldWeatherPath,
  harvestPath,
  moneyPath,
  photosPath,
  taskPeekPath,
} from '../navigation/intents';
import { chronologioDetailKind } from './detailKind';

/** Web path destinations for Chronologio deep-links. */
export type ChronologioWebDestination =
  | { kind: 'path'; path: string }
  | { kind: 'noteEdit'; noteId: string; fieldId: string }
  | { kind: 'none' };

export type ChronologioMobileDestination =
  | { kind: 'TaskDetail'; taskId: string }
  | { kind: 'Money'; fieldId: string; tx?: string }
  | { kind: 'Photos'; fieldId: string; photoId: string }
  | { kind: 'HarvestCampaign'; fieldId?: string; harvestId?: string; day?: string; view?: 'today' | 'fields' | 'totals' | 'log' }
  | { kind: 'FieldWeatherVegetation'; fieldId: string }
  | { kind: 'FieldDetail'; fieldId: string }
  | { kind: 'noteEdit'; noteId: string; fieldId: string }
  | { kind: 'none' };

export type ChronologioMutateAction = 'edit' | 'delete' | 'void' | 'cancel';

export type ChronologioEntryCapabilities = {
  canEdit: boolean;
  /** Soft-remove label: delete | void | cancel */
  removeAction: ChronologioMutateAction | null;
};

const isMergedHarvestDay = (entry: ChronologioEntry): boolean =>
  entry.sourceType === 'Harvest' && /^Harvest:day:/i.test(entry.id);

export const isChronologioMergedHarvestDay = isMergedHarvestDay;

export const chronologioHarvestId = (entry: ChronologioEntry): string | null => {
  if (entry.sourceType !== 'Harvest' || isMergedHarvestDay(entry)) return null;
  return entry.details.harvest?.harvestId || entry.sourceId || null;
};

export const chronologioNoteId = (entry: ChronologioEntry): string | null => {
  if (entry.sourceType !== 'Note' && entry.category !== 'note') return null;
  return entry.details.note?.noteId || entry.sourceId || null;
};

export const chronologioPhotoId = (entry: ChronologioEntry): string | null => {
  if (entry.sourceType !== 'Photo' && entry.category !== 'photo') return null;
  return entry.sourceId || entry.media?.[0]?.id || null;
};

export const chronologioTaskId = (entry: ChronologioEntry): string | null => {
  if (entry.sourceType !== 'Task' && entry.sourceType !== 'TaskExecution' && entry.category !== 'task') {
    return null;
  }
  return entry.details.task?.taskId || entry.sourceId || null;
};

export const chronologioMoneyTxId = (entry: ChronologioEntry): string | null => {
  if (
    entry.sourceType !== 'Expense' &&
    entry.sourceType !== 'Income' &&
    entry.category !== 'expense' &&
    entry.category !== 'income'
  ) {
    return null;
  }
  return entry.details.expense?.expenseId || entry.sourceId || null;
};

const isOwnActor = (entry: ChronologioEntry, userId?: string | null): boolean => {
  if (!userId) return false;
  if (!entry.actor?.userId) return true;
  return entry.actor.userId === userId;
};

const isFieldOwnerRole = (role?: string | null): boolean =>
  role === 'FieldOwner' || role === 'Administrator';

/**
 * UI hint for Edit / Delete on Chronologio peek. Feature APIs remain the real gate.
 */
export const chronologioEntryCapabilities = (
  entry: ChronologioEntry,
  opts: { userId?: string | null; role?: string | null } = {}
): ChronologioEntryCapabilities => {
  if (entry.isSystemGenerated) {
    return { canEdit: false, removeAction: null };
  }

  const kind = chronologioDetailKind(entry);
  const own = isOwnActor(entry, opts.userId);
  const owner = isFieldOwnerRole(opts.role);

  if (kind === 'weatherPeriod' || kind === 'weatherExtreme' || kind === 'warning' || kind === 'fieldChange') {
    return { canEdit: false, removeAction: null };
  }

  if (entry.sourceType === 'Photo' || entry.category === 'photo') {
    return { canEdit: true, removeAction: own || owner ? 'delete' : null };
  }

  if (entry.sourceType === 'Note' || entry.category === 'note') {
    return { canEdit: own, removeAction: own ? 'delete' : null };
  }

  if (kind === 'money') {
    return { canEdit: true, removeAction: own || owner ? 'void' : null };
  }

  if (kind === 'harvest') {
    // Merged day cards open a historical day board; Edit requires a concrete posted record.
    if (isMergedHarvestDay(entry)) {
      return { canEdit: false, removeAction: null };
    }
    return { canEdit: true, removeAction: owner ? 'void' : null };
  }

  if (kind === 'task') {
    const status = (entry.details.task?.status || '').toLowerCase();
    const completed = status === 'completed' || status === 'done';
    return {
      canEdit: true,
      removeAction: completed ? null : own || owner ? 'cancel' : null,
    };
  }

  return { canEdit: false, removeAction: null };
};

export const chronologioWebDestination = (entry: ChronologioEntry): ChronologioWebDestination => {
  const kind = chronologioDetailKind(entry);
  const fieldId = entry.fieldId;

  if (entry.sourceType === 'Photo' || entry.category === 'photo') {
    const photoId = chronologioPhotoId(entry);
    if (!photoId || !fieldId) return { kind: 'none' };
    return { kind: 'path', path: photosPath({ fieldId, photoId }) };
  }

  if (entry.sourceType === 'Note' || entry.category === 'note') {
    const noteId = chronologioNoteId(entry);
    if (!noteId) return { kind: 'none' };
    return { kind: 'noteEdit', noteId, fieldId: fieldId || '' };
  }

  const taskId = chronologioTaskId(entry);
  if (taskId && (entry.sourceType === 'Task' || entry.sourceType === 'TaskExecution' || kind === 'task')) {
    return { kind: 'path', path: taskPeekPath(taskId) };
  }

  const txId = chronologioMoneyTxId(entry);
  if (txId && (kind === 'money' || entry.sourceType === 'Expense' || entry.sourceType === 'Income')) {
    return { kind: 'path', path: moneyPath({ fieldId, tx: txId }) };
  }

  if (kind === 'harvest' || entry.sourceType === 'Harvest') {
    const harvestId = chronologioHarvestId(entry);
    const day = isMergedHarvestDay(entry) ? entry.id.replace(/^Harvest:day:/i, '') : undefined;
    return {
      kind: 'path',
      path: harvestPath({
        fieldId,
        harvestId: harvestId || undefined,
        day,
        view: day ? 'fields' : undefined,
      }),
    };
  }

  if (entry.sourceType === 'WeatherReview' || kind === 'weatherPeriod') {
    if (!fieldId) return { kind: 'none' };
    return { kind: 'path', path: fieldWeatherPath(fieldId) };
  }

  if (kind === 'warning') {
    const related = entry.details.intelligence?.relatedSourceIds?.[0];
    if (related) return { kind: 'path', path: taskPeekPath(related) };
  }

  if (fieldId) {
    return { kind: 'path', path: fieldPath(fieldId) };
  }

  return { kind: 'none' };
};

export const chronologioMobileDestination = (entry: ChronologioEntry): ChronologioMobileDestination => {
  const kind = chronologioDetailKind(entry);
  const fieldId = entry.fieldId;

  if (entry.sourceType === 'Photo' || entry.category === 'photo') {
    const photoId = chronologioPhotoId(entry);
    if (!photoId || !fieldId) return { kind: 'none' };
    return { kind: 'Photos', fieldId, photoId };
  }

  if (entry.sourceType === 'Note' || entry.category === 'note') {
    const noteId = chronologioNoteId(entry);
    if (!noteId) return { kind: 'none' };
    return { kind: 'noteEdit', noteId, fieldId: fieldId || '' };
  }

  const taskId = chronologioTaskId(entry);
  if (taskId && (entry.sourceType === 'Task' || entry.sourceType === 'TaskExecution' || kind === 'task')) {
    return { kind: 'TaskDetail', taskId };
  }

  const txId = chronologioMoneyTxId(entry);
  if (txId && (kind === 'money' || entry.sourceType === 'Expense' || entry.sourceType === 'Income')) {
    return { kind: 'Money', fieldId, tx: txId };
  }

  if (kind === 'harvest' || entry.sourceType === 'Harvest') {
    const harvestId = chronologioHarvestId(entry);
    const day = isMergedHarvestDay(entry) ? entry.id.replace(/^Harvest:day:/i, '') : undefined;
    return { kind: 'HarvestCampaign', fieldId: fieldId || undefined, harvestId: harvestId || undefined, day, view: day ? 'fields' : undefined };
  }

  if (entry.sourceType === 'WeatherReview' || kind === 'weatherPeriod') {
    if (!fieldId) return { kind: 'none' };
    return { kind: 'FieldWeatherVegetation', fieldId };
  }

  if (kind === 'warning') {
    const related = entry.details.intelligence?.relatedSourceIds?.[0];
    if (related) return { kind: 'TaskDetail', taskId: related };
  }

  if (fieldId) return { kind: 'FieldDetail', fieldId };
  return { kind: 'none' };
};
