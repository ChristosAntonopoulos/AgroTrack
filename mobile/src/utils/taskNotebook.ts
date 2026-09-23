import type { FieldTask } from '../services/fieldWorkService';
import { athensParts, parseBusinessDate } from './athensDate';
import { isTaskDueToday, isTaskOverdue } from './taskListUtils';
import { resolveWeatherKind } from './taskWeather';

/** User-visible work state. Overdue, today and suggestions are not statuses. */
export type NotebookStatus =
  | 'todo'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'skipped'
  | 'cancelled';

export type NotebookSection =
  | 'overdue'
  | 'blocked'
  | 'weather'
  | 'today'
  | 'tomorrow'
  | 'week'
  | 'later';

export type NotebookAction = 'start' | 'continue' | 'view' | 'resolve';

export type TaskUnit = {
  key: string;
  tasks: FieldTask[];
};

const dayKey = (date: Date): number => {
  const parts = athensParts(date);
  return parts.year * 10000 + parts.month * 100 + parts.day;
};

const parseDay = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = parseBusinessDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const notebookStatus = (status: string | undefined): NotebookStatus => {
  const value = String(status || '').toLowerCase();
  if (value === 'in_progress') return 'in_progress';
  if (value === 'completed') return 'completed';
  if (value === 'blocked') return 'blocked';
  if (value === 'skipped') return 'skipped';
  if (value === 'cancelled') return 'cancelled';
  return 'todo';
};

export const isOpenWork = (task: FieldTask): boolean => {
  const status = notebookStatus(task.status);
  return status === 'todo' || status === 'in_progress' || status === 'blocked';
};

export const isRecordedWork = (task: FieldTask): boolean => {
  const status = notebookStatus(task.status);
  return status === 'completed' || status === 'skipped' || status === 'cancelled';
};

export const primaryActionFor = (status: NotebookStatus): NotebookAction => {
  if (status === 'in_progress') return 'continue';
  if (status === 'blocked') return 'resolve';
  if (status === 'completed' || status === 'skipped' || status === 'cancelled') return 'view';
  return 'start';
};

export const checklistCount = (task: FieldTask): { done: number; total: number } => {
  const items = task.checklist || [];
  return {
    done: items.filter((item) => item.isAnswered).length,
    total: items.length,
  };
};

export const requiredChecksRemaining = (task: FieldTask): number =>
  (task.checklist || []).filter((item) => {
    const requirement = String(item.requirement || '').toLowerCase();
    const required = requirement.includes('required');
    return required && !item.isAnswered;
  }).length;

const windowContainsToday = (task: FieldTask, now: Date): boolean => {
  const start = parseDay(task.plannedStart);
  const end = parseDay(task.plannedEnd);
  if (!start || !end) return false;
  const today = dayKey(now);
  return dayKey(start) <= today && today <= dayKey(end);
};

const isDueTomorrow = (task: FieldTask, now: Date): boolean => {
  const due = parseDay(task.plannedEnd || task.plannedStart);
  if (!due) return false;
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKey(due) === dayKey(tomorrow);
};

const isDueThisWeek = (task: FieldTask, now: Date): boolean => {
  const due = parseDay(task.plannedStart || task.plannedEnd);
  if (!due) return false;
  const today = dayKey(now);
  const dueKey = dayKey(due);
  if (dueKey <= today) return false;
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 7);
  return dueKey <= dayKey(horizon);
};

export const weatherChangesDecision = (task: FieldTask): boolean => {
  const kind = resolveWeatherKind(task.weatherSuitability);
  return kind === 'unsuitable' || kind === 'caution';
};

export const sectionFor = (task: FieldTask, now = new Date()): NotebookSection => {
  const status = notebookStatus(task.status);
  if (status === 'blocked') return 'blocked';
  if (status === 'todo' && isTaskOverdue(task, now)) return 'overdue';
  if (status === 'todo' && weatherChangesDecision(task)) return 'weather';
  if (status === 'in_progress') return 'today';
  if (status === 'todo' && (isTaskDueToday(task, now) || windowContainsToday(task, now))) return 'today';
  if (status === 'todo' && isDueTomorrow(task, now)) return 'tomorrow';
  if (status === 'todo' && isDueThisWeek(task, now)) return 'week';
  return 'later';
};

export const groupWorkUnits = (tasks: FieldTask[]): TaskUnit[] => {
  const groups = new Map<string, FieldTask[]>();
  const order: string[] = [];
  tasks.forEach((task) => {
    const key = task.workGroupId || task.id;
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(task);
  });
  return order.map((key) => ({ key, tasks: groups.get(key)! }));
};

export const leadTask = (unit: TaskUnit): FieldTask => {
  const rank = (task: FieldTask) => {
    const status = notebookStatus(task.status);
    if (status === 'in_progress') return 0;
    if (status === 'blocked') return 1;
    if (status === 'todo') return 2;
    return 3;
  };
  return [...unit.tasks].sort((a, b) => rank(a) - rank(b))[0];
};

export const unitSection = (unit: TaskUnit, now = new Date()): NotebookSection =>
  sectionFor(leadTask(unit), now);

export type WhenTone = 'overdue' | 'today' | 'tomorrow' | 'window' | 'none' | 'progress';

export const whenTone = (task: FieldTask, now = new Date()): WhenTone => {
  const status = notebookStatus(task.status);
  if (isOpenWork(task) && isTaskOverdue(task, now)) return 'overdue';
  if (status === 'in_progress') return 'progress';
  if (isTaskDueToday(task, now) || windowContainsToday(task, now)) return 'today';
  if (isDueTomorrow(task, now)) return 'tomorrow';
  if (task.plannedStart || task.plannedEnd) return 'window';
  return 'none';
};
