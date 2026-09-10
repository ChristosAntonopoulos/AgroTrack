import type { FieldTask } from '../services/fieldWorkService';
import { athensParts, parseBusinessDate } from './athensDate';

export type PlannedGroupId = 'today' | 'thisWeek' | 'later';

export type PlannedTaskGroup = {
  id: PlannedGroupId;
  tasks: FieldTask[];
};

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

export const plannedGroupOf = (task: FieldTask, now = new Date()): PlannedGroupId => {
  const parts = taskAnchorParts(task);
  if (!parts) return 'today';

  const nowParts = athensParts(now);
  const taskKey = dateKey(parts.year, parts.month, parts.day);
  const todayKey = dateKey(nowParts.year, nowParts.month, nowParts.day);
  if (taskKey <= todayKey) return 'today';

  const todayLocal = new Date(nowParts.year, nowParts.month - 1, nowParts.day);
  const weekday = todayLocal.getDay();
  const daysToSunday = weekday === 0 ? 0 : 7 - weekday;
  const sunday = new Date(todayLocal);
  sunday.setDate(todayLocal.getDate() + daysToSunday);
  const sundayKey = dateKey(sunday.getFullYear(), sunday.getMonth() + 1, sunday.getDate());
  if (taskKey <= sundayKey) return 'thisWeek';
  return 'later';
};

const sortByStart = (a: FieldTask, b: FieldTask): number => {
  const aKey = a.plannedStart || a.plannedEnd || '';
  const bKey = b.plannedStart || b.plannedEnd || '';
  return aKey.localeCompare(bKey);
};

export const groupPlannedTasks = (tasks: FieldTask[], now = new Date()): PlannedTaskGroup[] => {
  const buckets: Record<PlannedGroupId, FieldTask[]> = {
    today: [],
    thisWeek: [],
    later: [],
  };
  tasks.forEach((task) => {
    buckets[plannedGroupOf(task, now)].push(task);
  });
  return (['today', 'thisWeek', 'later'] as PlannedGroupId[])
    .map((id) => ({ id, tasks: buckets[id].slice().sort(sortByStart) }))
    .filter((group) => group.tasks.length > 0);
};

export const checklistProgress = (task: FieldTask): { done: number; total: number } => {
  const items = task.checklist || [];
  const scoped = items.some((item) => item.isEssential) ? items.filter((item) => item.isEssential) : items;
  return {
    done: scoped.filter((item) => item.isAnswered).length,
    total: scoped.length,
  };
};

export const taskStartedAt = (task: FieldTask): string | undefined =>
  task.startedAt || (String(task.status).toLowerCase() === 'in_progress' ? task.updatedAt : undefined);

export const resolveTaskPerson = (
  task: FieldTask,
  names: Record<string, string>
): string => {
  if (task.assignedUserId && names[`user:${task.assignedUserId}`]) {
    return names[`user:${task.assignedUserId}`];
  }
  if (task.assignedCollaboratorId && names[`contact:${task.assignedCollaboratorId}`]) {
    return names[`contact:${task.assignedCollaboratorId}`];
  }
  return '';
};
