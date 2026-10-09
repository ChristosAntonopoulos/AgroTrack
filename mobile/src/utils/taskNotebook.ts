import type { Task } from '../services/taskService';
import { athensParts, parseBusinessDate } from './athensDate';

/** User-visible work state. Overdue and suggestions are not statuses. */
export type NotebookStatus = 'planned' | 'done' | 'skipped';

export type NotebookSection = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later';

export type NotebookMenuAction = 'reschedule' | 'assign' | 'repeat' | 'edit' | 'complete';

export type TaskUnit = {
  key: string;
  tasks: Task[];
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
  if (value === 'done' || value === 'completed') return 'done';
  if (value === 'skipped' || value === 'cancelled') return 'skipped';
  return 'planned';
};

export const isOpenWork = (task: Task): boolean => notebookStatus(task.status) === 'planned';

export const isRecordedWork = (task: Task): boolean => {
  const status = notebookStatus(task.status);
  return status === 'done' || status === 'skipped';
};

export const checklistCount = (task: Task): { done: number; total: number } => {
  const items = task.checklist || [];
  return {
    done: items.filter((item) => item.isAnswered).length,
    total: items.length,
  };
};

const taskAnchor = (task: Task): Date | null =>
  parseDay(task.scheduledFor || task.plannedStart || task.plannedEnd);

export const isTaskOverdue = (task: Task, now = new Date()): boolean => {
  if (!isOpenWork(task)) return false;
  const due = taskAnchor(task);
  if (!due) return false;
  return dayKey(due) < dayKey(now);
};

export const isTaskDueToday = (task: Task, now = new Date()): boolean => {
  if (!isOpenWork(task)) return false;
  const bucket = String(task.timingBucket || '').toLowerCase();
  if (bucket === 'today' && !task.scheduledFor && !task.plannedStart) return true;
  const due = taskAnchor(task);
  if (!due) return bucket === 'today';
  return dayKey(due) === dayKey(now);
};

/**
 * One home section per open task. Overdue is derived from dates, never a stored status.
 */
export const sectionFor = (task: Task, now = new Date()): NotebookSection => {
  if (!isOpenWork(task)) return 'later';
  if (isTaskOverdue(task, now)) return 'overdue';

  const bucket = String(task.timingBucket || '').toLowerCase();
  if (bucket === 'today' || isTaskDueToday(task, now)) return 'today';
  if (bucket === 'tomorrow') return 'tomorrow';
  if (bucket === 'thisweek') return 'week';
  if (bucket === 'later') return 'later';

  const due = taskAnchor(task);
  if (!due) return 'later';
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dayKey(due) === dayKey(tomorrow)) return 'tomorrow';
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 7);
  if (dayKey(due) <= dayKey(horizon)) return 'week';
  return 'later';
};

export const groupWorkUnits = (tasks: Task[]): TaskUnit[] =>
  tasks.map((task) => ({ key: task.id, tasks: [task] }));

export const leadTask = (unit: TaskUnit): Task => unit.tasks[0];

export const unitSection = (unit: TaskUnit, now = new Date()): NotebookSection =>
  sectionFor(leadTask(unit), now);

export type WhenTone = 'overdue' | 'today' | 'tomorrow' | 'window' | 'none';

export const whenTone = (task: Task, now = new Date()): WhenTone => {
  if (isOpenWork(task) && isTaskOverdue(task, now)) return 'overdue';
  if (isTaskDueToday(task, now)) return 'today';
  const section = sectionFor(task, now);
  if (section === 'tomorrow') return 'tomorrow';
  if (task.scheduledFor || task.plannedStart || task.plannedEnd) return 'window';
  return 'none';
};

export const resolveTaskPerson = (
  task: Pick<Task, 'assignedUserId' | 'assignedCollaboratorId' | 'assigneeId'>,
  names: Record<string, string>
): string => {
  if (task.assignedUserId && names[`user:${task.assignedUserId}`]) {
    return names[`user:${task.assignedUserId}`];
  }
  if (task.assigneeId) {
    if (names[`user:${task.assigneeId}`]) return names[`user:${task.assigneeId}`];
    if (names[task.assigneeId]) return names[task.assigneeId];
  }
  if (task.assignedCollaboratorId && names[`contact:${task.assignedCollaboratorId}`]) {
    return names[`contact:${task.assignedCollaboratorId}`];
  }
  return '';
};
