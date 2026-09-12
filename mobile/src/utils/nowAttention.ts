import type { FieldTask } from '../services/fieldWorkService';
import { parseBusinessDate, athensParts } from './athensDate';
import { checklistProgress } from './plannedTaskGroups';
import { isTaskOverdue, isTaskDueToday, taskDueDate } from './taskListUtils';
import { resolveWeatherKind } from './taskWeather';

export type AttentionReasonId =
  | 'overdue'
  | 'weatherBlocked'
  | 'unassigned'
  | 'windowEnding'
  | 'incompletePrep'
  | 'paused';

export type AttentionItem = {
  task: FieldTask;
  reasonId: AttentionReasonId;
  /** Interpolation values for i18n, e.g. { days: 3 } */
  params?: Record<string, string | number>;
};

const PLANNED = new Set(['planned', 'ready', 'blocked']);
const OPEN = new Set(['planned', 'ready', 'blocked', 'in_progress']);

const daysUntil = (iso: string | undefined, now: Date): number | null => {
  if (!iso) return null;
  const end = parseBusinessDate(iso);
  if (Number.isNaN(end.getTime())) return null;
  const endParts = athensParts(end);
  const nowParts = athensParts(now);
  const endLocal = new Date(endParts.year, endParts.month - 1, endParts.day);
  const nowLocal = new Date(nowParts.year, nowParts.month - 1, nowParts.day);
  return Math.round((endLocal.getTime() - nowLocal.getTime()) / (24 * 60 * 60 * 1000));
};

const isUnassigned = (task: FieldTask): boolean =>
  !task.assignedUserId && !task.assignedCollaboratorId && !task.responsibleUserId;

const isWeatherBlocked = (task: FieldTask): boolean => {
  const kind = resolveWeatherKind(task.weatherSuitability);
  return kind === 'unsuitable' || (String(task.status).toLowerCase() === 'blocked' && kind === 'caution');
};

const isWindowEnding = (task: FieldTask, now: Date): boolean => {
  if (!task.plannedEnd || !task.plannedStart) return false;
  if (task.plannedEnd.slice(0, 10) === task.plannedStart.slice(0, 10)) return false;
  const days = daysUntil(task.plannedEnd, now);
  return days != null && days >= 1 && days <= 3 && PLANNED.has(String(task.status).toLowerCase());
};

const hasIncompletePrep = (task: FieldTask): boolean => {
  if (!PLANNED.has(String(task.status).toLowerCase())) return false;
  const { done, total } = checklistProgress(task);
  return total > 0 && done === 0 && Boolean(task.templateCode);
};

const isPaused = (task: FieldTask): boolean =>
  String(task.status).toLowerCase() === 'in_progress' && Boolean(task.isPaused);

/**
 * Tasks that need farmer attention on Τώρα, with a concrete reason.
 * Order: paused → overdue → weather → window ending → unassigned → incomplete prep.
 */
export const buildAttentionItems = (tasks: FieldTask[], now = new Date()): AttentionItem[] => {
  const items: AttentionItem[] = [];
  const seen = new Set<string>();

  const push = (task: FieldTask, reasonId: AttentionReasonId, params?: AttentionItem['params']) => {
    if (seen.has(task.id)) return;
    if (!OPEN.has(String(task.status).toLowerCase())) return;
    seen.add(task.id);
    items.push({ task, reasonId, params });
  };

  for (const task of tasks) {
    if (isPaused(task)) push(task, 'paused');
  }
  for (const task of tasks) {
    if (isTaskOverdue(task, now) && PLANNED.has(String(task.status).toLowerCase())) {
      push(task, 'overdue');
    }
  }
  for (const task of tasks) {
    if (isWeatherBlocked(task)) push(task, 'weatherBlocked');
  }
  for (const task of tasks) {
    if (isWindowEnding(task, now)) {
      const days = daysUntil(task.plannedEnd || task.plannedStart, now) ?? 0;
      push(task, 'windowEnding', { days });
    }
  }
  for (const task of tasks) {
    if (PLANNED.has(String(task.status).toLowerCase()) && isUnassigned(task)) {
      push(task, 'unassigned');
    }
  }
  for (const task of tasks) {
    if (hasIncompletePrep(task)) push(task, 'incompletePrep');
  }

  return items;
};

export const attentionReasonKey = (reasonId: AttentionReasonId): string =>
  `fieldWork.attention.reasons.${reasonId}`;

export type NowBuckets = {
  attention: AttentionItem[];
  inProgress: FieldTask[];
  today: FieldTask[];
  thisWeekPreview: FieldTask[];
  nextUpcoming: FieldTask | null;
};

const startOfLocalDay = (now: Date): Date => {
  const p = athensParts(now);
  return new Date(p.year, p.month - 1, p.day);
};

const endOfWeekSunday = (now: Date): Date => {
  const today = startOfLocalDay(now);
  const weekday = today.getDay();
  const daysToSunday = weekday === 0 ? 0 : 7 - weekday;
  const sunday = new Date(today);
  sunday.setDate(today.getDate() + daysToSunday);
  return sunday;
};

/** Partition open tasks into Τώρα sections. */
export const buildNowBuckets = (tasks: FieldTask[], now = new Date()): NowBuckets => {
  const open = tasks.filter((task) => OPEN.has(String(task.status).toLowerCase()));
  const attention = buildAttentionItems(open, now);
  const attentionIds = new Set(attention.map((item) => item.task.id));

  const inProgress = open
    .filter((task) => String(task.status).toLowerCase() === 'in_progress' && !task.isPaused)
    .filter((task) => !attentionIds.has(task.id))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  const today = open
    .filter((task) => PLANNED.has(String(task.status).toLowerCase()))
    .filter((task) => isTaskDueToday(task, now))
    .filter((task) => !attentionIds.has(task.id))
    .sort((a, b) => String(a.plannedStart || '').localeCompare(String(b.plannedStart || '')));

  const weekEnd = endOfWeekSunday(now);
  const todayStart = startOfLocalDay(now);
  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const thisWeekPreview = open
    .filter((task) => PLANNED.has(String(task.status).toLowerCase()))
    .filter((task) => {
      const due = taskDueDate(task);
      if (!due) return false;
      const day = startOfLocalDay(due);
      return day >= tomorrow && day <= weekEnd;
    })
    .filter((task) => !attentionIds.has(task.id))
    .sort((a, b) => String(a.plannedStart || '').localeCompare(String(b.plannedStart || '')))
    .slice(0, 4);

  const nextUpcoming =
    open
      .filter((task) => PLANNED.has(String(task.status).toLowerCase()))
      .filter((task) => {
        const due = taskDueDate(task);
        if (!due) return false;
        return startOfLocalDay(due) > todayStart;
      })
      .sort((a, b) => String(a.plannedStart || a.plannedEnd || '').localeCompare(String(b.plannedStart || b.plannedEnd || '')))[0] ||
    null;

  return { attention, inProgress, today, thisWeekPreview, nextUpcoming };
};

export const countNowAttention = (tasks: FieldTask[], now = new Date()): number =>
  buildAttentionItems(tasks, now).length;
