import { FieldTask, isCompletedFieldTask } from '../services/fieldWorkService';
import { athensParts, parseBusinessDate } from './athensDate';

export type TaskFilter = 'all' | 'planned' | 'in_progress' | 'ready' | 'blocked';

const startOfLocalDay = (d: Date): Date => {
  const p = athensParts(d);
  return new Date(p.year, p.month - 1, p.day);
};

export const taskDueDate = (task: FieldTask): Date | null => {
  const raw = task.plannedEnd || task.plannedStart;
  if (!raw) return null;
  const d = parseBusinessDate(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function isTaskOverdue(task: FieldTask, now = new Date()): boolean {
  if (isCompletedFieldTask(task)) return false;
  const status = String(task.status).toLowerCase();
  if (status === 'cancelled' || status === 'skipped') return false;
  const due = taskDueDate(task);
  if (!due) return false;
  return due < startOfLocalDay(now);
}

export const isActiveTask = (task: FieldTask): boolean => {
  const status = String(task.status || '').toLowerCase();
  return status === 'pending' || status === 'planned' || status === 'ready' || status === 'in_progress';
};

export const isTaskDueToday = (task: FieldTask, now = new Date()): boolean => {
  if (isCompletedFieldTask(task)) return false;
  const status = String(task.status).toLowerCase();
  if (status === 'cancelled' || status === 'skipped') return false;
  const due = taskDueDate(task);
  if (!due) return false;
  return startOfLocalDay(due).getTime() === startOfLocalDay(now).getTime();
};

export function sortTasksForList(tasks: FieldTask[]): FieldTask[] {
  return [...tasks].sort((a, b) => {
    const aOver = isTaskOverdue(a);
    const bOver = isTaskOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;

    const statusOrder: Record<string, number> = {
      in_progress: 0,
      ready: 1,
      planned: 2,
      blocked: 3,
    };
    const aStatus = statusOrder[String(a.status).toLowerCase()] ?? 4;
    const bStatus = statusOrder[String(b.status).toLowerCase()] ?? 4;
    if (aStatus !== bStatus) return aStatus - bStatus;

    const aDate = a.plannedStart ? new Date(a.plannedStart).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.plannedStart ? new Date(b.plannedStart).getTime() : Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });
}

export function getTaskFilterCounts(tasks: FieldTask[]): Record<TaskFilter, number> {
  return {
    all: tasks.length,
    planned: tasks.filter((t) => t.status === 'planned').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    ready: tasks.filter((t) => t.status === 'ready').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
  };
}

export function getStatusAccentColor(
  status: string,
  colors: {
    taskPending: string;
    taskInProgress: string;
    taskCompleted: string;
    textSecondary: string;
  }
): string {
  switch (status) {
    case 'planned':
    case 'ready':
    case 'pending':
      return colors.taskPending;
    case 'in_progress':
      return colors.taskInProgress;
    case 'completed':
      return colors.taskCompleted;
    case 'blocked':
      return colors.textSecondary;
    default:
      return colors.textSecondary;
  }
}
