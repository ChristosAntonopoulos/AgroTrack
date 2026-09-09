import type { TFunction } from 'i18next';
import type { ChronologioEntry } from '../services/chronologioService';
import type { Field } from '../services/fieldService';
import type { Task } from '../services/taskService';
import { formatChronologioMoney } from './chronologioGrouping';

const startOfLocalDay = (d: Date): Date =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const countTasksToday = (tasks: Task[], now: Date = new Date()): number => {
  const start = startOfLocalDay(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return tasks.filter((task) => {
    if (task.status === 'completed') return false;
    const raw = task.scheduledStart || task.scheduledEnd;
    if (!raw) return false;
    const when = new Date(raw);
    return when >= start && when < end;
  }).length;
};

export const getNextUpcomingTask = (tasks: Task[], now: Date = new Date()): Task | undefined => {
  const start = startOfLocalDay(now).getTime();
  return tasks
    .filter((task) => task.status !== 'completed')
    .filter((task) => task.scheduledEnd || task.scheduledStart)
    .slice()
    .sort((a, b) => {
      const aTime = new Date(a.scheduledEnd || a.scheduledStart || 0).getTime();
      const bTime = new Date(b.scheduledEnd || b.scheduledStart || 0).getTime();
      return aTime - bTime;
    })
    .find((task) => new Date(task.scheduledEnd || task.scheduledStart || 0).getTime() >= start);
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
