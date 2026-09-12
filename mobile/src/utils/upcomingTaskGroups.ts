import type { FieldTask } from '../services/fieldWorkService';
import { athensParts, parseBusinessDate } from './athensDate';

export type UpcomingGroupId =
  | 'tomorrow'
  | 'thisWeek'
  | 'nextWeek'
  | 'later'
  | 'undated';

export type UpcomingTaskGroup = {
  id: UpcomingGroupId;
  tasks: FieldTask[];
};

const PLANNED = new Set(['planned', 'ready', 'blocked']);

const ISO_DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;

const dateKey = (year: number, month: number, day: number): number =>
  year * 10000 + month * 100 + day;

const partsFromValue = (value: string | Date): { year: number; month: number; day: number } | null => {
  if (typeof value === 'string') {
    const match = ISO_DATE_PREFIX.exec(value.trim());
    if (match) {
      return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
    }
  }
  const date = value instanceof Date ? value : parseBusinessDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return athensParts(date);
};

const taskAnchorParts = (task: FieldTask) => {
  const raw = task.plannedStart || task.plannedEnd;
  if (!raw) return null;
  return partsFromValue(raw);
};

const localDay = (now: Date) => {
  const p = athensParts(now);
  return new Date(p.year, p.month - 1, p.day);
};

/** Bucket planned tasks for Επόμενες (excludes today — today lives in Τώρα). */
export const upcomingGroupOf = (task: FieldTask, now = new Date()): UpcomingGroupId => {
  const parts = taskAnchorParts(task);
  if (!parts) return 'undated';

  const today = localDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowKey = dateKey(tomorrow.getFullYear(), tomorrow.getMonth() + 1, tomorrow.getDate());

  const taskKey = dateKey(parts.year, parts.month, parts.day);
  const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  if (taskKey <= todayKey) return 'thisWeek'; // overdue/today should not appear here, but safe fallback
  if (taskKey === tomorrowKey) return 'tomorrow';

  const weekday = today.getDay();
  const daysToSunday = weekday === 0 ? 0 : 7 - weekday;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + daysToSunday);
  const sundayKey = dateKey(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate());
  if (taskKey <= sundayKey) return 'thisWeek';

  const nextMonday = new Date(sunday);
  nextMonday.setDate(sunday.getDate() + 1);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);
  const nextMondayKey = dateKey(nextMonday.getFullYear(), nextMonday.getMonth() + 1, nextMonday.getDate());
  const nextSundayKey = dateKey(nextSunday.getFullYear(), nextSunday.getMonth() + 1, nextSunday.getDate());
  if (taskKey >= nextMondayKey && taskKey <= nextSundayKey) return 'nextWeek';

  return 'later';
};

const sortByStart = (a: FieldTask, b: FieldTask): number => {
  const aKey = a.plannedStart || a.plannedEnd || '';
  const bKey = b.plannedStart || b.plannedEnd || '';
  return aKey.localeCompare(bKey);
};

export const groupUpcomingTasks = (tasks: FieldTask[], now = new Date()): UpcomingTaskGroup[] => {
  const planned = tasks.filter((task) => PLANNED.has(String(task.status).toLowerCase()));
  const today = localDay(now);
  const todayKey = dateKey(today.getFullYear(), today.getMonth() + 1, today.getDate());

  const futureOrUndated = planned.filter((task) => {
    const parts = taskAnchorParts(task);
    if (!parts) return true;
    return dateKey(parts.year, parts.month, parts.day) > todayKey;
  });

  const buckets: Record<UpcomingGroupId, FieldTask[]> = {
    tomorrow: [],
    thisWeek: [],
    nextWeek: [],
    later: [],
    undated: [],
  };

  futureOrUndated.forEach((task) => {
    buckets[upcomingGroupOf(task, now)].push(task);
  });

  return (['tomorrow', 'thisWeek', 'nextWeek', 'later', 'undated'] as UpcomingGroupId[])
    .map((id) => ({ id, tasks: buckets[id].slice().sort(sortByStart) }))
    .filter((group) => group.tasks.length > 0);
};
