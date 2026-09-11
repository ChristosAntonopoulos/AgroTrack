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

/** Route when tapping a field from the list or map. */
export const getFieldOpenPath = (field: Pick<Field, 'id' | 'status'>): string =>
  isFieldSetupIncomplete(field.status) ? `/fields/${field.id}/edit` : `/fields/${field.id}`;

export const fieldHasBoundary = (field: Pick<Field, 'boundary'>): boolean => {
  const ring = field.boundary?.coordinates?.[0];
  return Boolean(ring && ring.length >= 4);
};

/** Best wizard step when resuming an incomplete field. */
export const getFieldSetupResumeStep = (
  field: Pick<Field, 'name' | 'status' | 'boundary'>
): 'basics-edit' | 'boundary' | 'review' => {
  const hasName = Boolean(field.name?.trim());
  const hasBoundary = fieldHasBoundary(field);

  if (!hasName) return 'basics-edit';
  if (!hasBoundary || field.status === 'NeedsBoundaryConfirmation') return 'boundary';
  return 'review';
};

const startOfLocalDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const countTasksToday = (tasks: FieldTask[], now: Date = new Date()): number =>
  tasks.filter((task) => isTaskDueToday(task, now)).length;

export const getNextUpcomingTask = (tasks: FieldTask[], now: Date = new Date()): FieldTask | undefined => {
  const start = startOfLocalDay(now).getTime();
  return tasks
    .filter((task) => task.status !== 'completed' && task.status !== 'cancelled')
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
