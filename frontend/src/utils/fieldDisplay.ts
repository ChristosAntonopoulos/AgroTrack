import type { TFunction } from 'i18next';
import type { ChronologioEntry } from '../services/chronologioService';
import type { Field, FieldStatus } from '../services/fieldService';
import type { FieldTask } from '../services/fieldWorkService';
import { isTaskDueToday } from './taskListUtils';
import { formatChronologioMoney } from './chronologioGrouping';

/** Incomplete setup — open the create/edit wizard, not the live field page. */
export const INCOMPLETE_FIELD_STATUSES: ReadonlySet<FieldStatus> = new Set([
  'Draft',
  'NeedsBoundaryConfirmation',
  'NeedsAreaReview',
]);

export const isFieldSetupIncomplete = (status?: string | null): boolean =>
  Boolean(status && INCOMPLETE_FIELD_STATUSES.has(status as FieldStatus));

/** Groves the Chronologio scope menu should offer — not drafts, leftovers, or unnamed pins. */
export const isListedGrove = (field: Pick<Field, 'status' | 'name'>): boolean => {
  if (field.status === 'Archived' || isFieldSetupIncomplete(field.status)) return false;
  const name = (field.name || '').trim();
  if (!name) return false;
  const leftover = name.length < 8 && !/\s/.test(name) && !/\d/.test(name);
  return !leftover;
};

/** Fields list: show active and recoverable drafts; hide archived and nameless leftovers. */
export const isVisibleOnFieldsList = (field: Pick<Field, 'status' | 'name'>): boolean => {
  if (field.status === 'Archived') return false;
  const name = (field.name || '').trim();
  if (!name) return false;
  return true;
};

export const isOwnedField = (
  field: Pick<Field, 'ownerId'>,
  userId: string | undefined | null
): boolean => Boolean(userId && field.ownerId === userId);

/**
 * Partners page scope: every named field this person owns, including short names and drafts,
 * plus finished groves shared with them. Short names are real fields, not leftover pins.
 */
export const isPartnerScopeField = (
  field: Pick<Field, 'status' | 'name' | 'ownerId'>,
  userId: string | undefined | null
): boolean => {
  if (!isVisibleOnFieldsList(field)) return false;
  if (isOwnedField(field, userId)) return true;
  return isListedGrove(field);
};

/** Seat the signed-in person holds on a field. Admin is the person who manages it. */
export type ViewerFieldRole = 'Admin' | 'Partner' | 'Family';

const isViewerFieldRole = (value: string | undefined): value is ViewerFieldRole =>
  value === 'Admin' || value === 'Partner' || value === 'Family';

export const viewerFieldRole = (
  field: Pick<Field, 'ownerId' | 'memberships'>,
  userId: string | undefined | null
): ViewerFieldRole | null => {
  if (!userId) return null;
  const membership = field.memberships?.find(
    (member) =>
      member.userId === userId && member.status !== 'removed' && member.status !== 'revoked'
  );
  if (membership && isViewerFieldRole(membership.role)) return membership.role;
  if (field.ownerId === userId) return 'Admin';
  return null;
};

/** Every grove this person sits on, split by the seat they hold. */
export const groupFieldsByViewerRole = <T extends Pick<Field, 'ownerId' | 'memberships'>>(
  fields: T[],
  userId: string | undefined | null
): Record<ViewerFieldRole, T[]> => {
  const groups: Record<ViewerFieldRole, T[]> = { Admin: [], Family: [], Partner: [] };
  for (const field of fields) {
    const role = viewerFieldRole(field, userId);
    if (role === 'Family') groups.Family.push(field);
    else if (role === 'Partner') groups.Partner.push(field);
    else if (role === 'Admin' || isOwnedField(field, userId)) groups.Admin.push(field);
    else groups.Partner.push(field);
  }
  return groups;
};

export type FieldListCounts = {
  active: number;
  draft: number;
  shared: number;
  total: number;
};

export const countFieldListBuckets = (
  fields: Array<Pick<Field, 'status' | 'name' | 'ownerId'>>,
  userId: string | undefined | null
): FieldListCounts => {
  const visible = fields.filter(isVisibleOnFieldsList);
  let active = 0;
  let draft = 0;
  let shared = 0;
  for (const field of visible) {
    if (isFieldSetupIncomplete(field.status)) draft += 1;
    else active += 1;
    if (!isOwnedField(field, userId)) shared += 1;
  }
  return { active, draft, shared, total: visible.length };
};

export const fieldHasBoundary = (field: Pick<Field, 'boundary'>): boolean => {
  const ring = field.boundary?.coordinates?.[0];
  return Boolean(ring && ring.length >= 4);
};

/** Pin / center is enough to place the grove on the map. */
export const fieldHasLocation = (
  field: Pick<Field, 'latitude' | 'longitude' | 'centerPoint'>
): boolean => {
  if (field.centerPoint?.coordinates?.length === 2) {
    const [lng, lat] = field.centerPoint.coordinates;
    if (Number.isFinite(lat) && Number.isFinite(lng)) return true;
  }
  return (
    typeof field.latitude === 'number' &&
    typeof field.longitude === 'number' &&
    Number.isFinite(field.latitude) &&
    Number.isFinite(field.longitude)
  );
};

/**
 * Resume incomplete setup: name → place pin → optional boundary.
 * Active groves without a boundary open the live page (maps prompt), not the wizard.
 */
export const getFieldSetupResumeStep = (
  field: Pick<Field, 'name' | 'status' | 'boundary' | 'latitude' | 'longitude' | 'centerPoint'>
): 'basics-edit' | 'place' | 'boundary' | 'review' => {
  if (!field.name?.trim()) return 'basics-edit';
  if (!fieldHasLocation(field)) return 'place';
  if (!fieldHasBoundary(field) && field.status === 'NeedsBoundaryConfirmation') return 'boundary';
  return 'basics-edit';
};

/** Route when tapping a field — drafts without a pin resume place step. */
export const getFieldOpenPath = (
  field: Pick<Field, 'id' | 'status' | 'name' | 'boundary' | 'latitude' | 'longitude' | 'centerPoint'>
): string => {
  if (!isFieldSetupIncomplete(field.status)) return `/fields/${field.id}`;
  const step = getFieldSetupResumeStep(field);
  if (step === 'place') return `/fields/${field.id}/edit?focus=place`;
  if (step === 'boundary') return `/fields/${field.id}/edit?focus=boundary`;
  return `/fields/${field.id}/edit`;
};

const startOfLocalDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const countTasksToday = (tasks: FieldTask[], now: Date = new Date()): number =>
  tasks.filter((task) => isTaskDueToday(task, now)).length;

const isOpenForFieldList = (status: string | undefined): boolean => {
  const s = String(status || '').toLowerCase();
  return s !== 'completed' && s !== 'cancelled' && s !== 'done' && s !== 'skipped';
};

export const getNextUpcomingTask = (tasks: FieldTask[], now: Date = new Date()): FieldTask | undefined => {
  const start = startOfLocalDay(now).getTime();
  return tasks
    .filter((task) => isOpenForFieldList(task.status))
    .filter((task) => task.plannedEnd || task.plannedStart)
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.plannedEnd || a.plannedStart || 0).getTime();
      const bTime = new Date(b.plannedEnd || b.plannedStart || 0).getTime();
      return aTime - bTime;
    })
    .find((task) => new Date(task.plannedEnd || task.plannedStart || 0).getTime() >= start);
};

export const kmhToBeaufort = (kmh: number): number => {
  const thresholds = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];
  let beaufort = 0;
  for (const threshold of thresholds) {
    if (kmh >= threshold) beaufort += 1;
    else break;
  }
  return Math.min(beaufort, 12);
};

export const getLifecycleStageLabel = (
  stage: string | undefined,
  t: TFunction
): string | null => {
  if (!stage) return null;
  const key = stage.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return null;
  const label = t(`common:lifecycleStage.${key}`, { defaultValue: '' });
  return label || null;
};

export const getFieldStatusLabel = (status: string | undefined, t: TFunction): string => {
  const key = status || 'Active';
  return t(`fields:fieldStatus.${key}`, { defaultValue: t(`fields:addField.statuses.${key}`, { defaultValue: '' }) });
};

export const formatDayMonth = (value: Date | string, locale: string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date
    .toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    .replace('.', '');
};

export const formatCompactDate = (value: Date | string, locale: string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
};

export const numberLocaleFor = (language: string): string => {
  if (language.startsWith('el')) return 'el-GR';
  if (language.startsWith('it')) return 'it-IT';
  return 'en-US';
};

export const formatSignedMoney = (value: number, currency: string, locale: string): string => {
  const formatted = formatChronologioMoney(Math.abs(value), currency, locale);
  if (value > 0) return `+ ${formatted}`;
  if (value < 0) return `− ${formatted}`;
  return formatted;
};

export const chronologioDetailLine = (
  entry: ChronologioEntry,
  locale: string
): string => {
  const harvest = entry.details.harvest;
  if (entry.category === 'harvest' && harvest) {
    const kg = harvest.oliveKg.toLocaleString(locale, { maximumFractionDigits: 0 });
    if (harvest.oilYieldPercent != null) {
      return `${kg} kg · ${harvest.oilYieldPercent.toLocaleString(locale, { maximumFractionDigits: 0 })}%`;
    }
    return `${kg} kg`;
  }

  if (entry.category === 'expense') {
    if (entry.summary) return entry.summary;
    if (entry.amount) {
      return formatChronologioMoney(entry.amount.value, entry.amount.currency, locale);
    }
    return entry.details.expense?.description || '';
  }

  if (entry.category === 'note') {
    return entry.details.note?.bodyPreview || entry.summary || '';
  }

  return entry.summary || '';
};

export const fieldSearchHaystack = (field: Field): string => {
  const parts = [
    field.name,
    field.variety,
    field.oliveVariety,
    field.greekCadastre?.kaek,
    field.greekCadastre?.normalizedKaek,
  ];
  return parts.filter(Boolean).join(' ').toLowerCase();
};
