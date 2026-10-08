import type { FieldTask } from '../services/fieldWorkService';
import { parseBusinessDate, startOfLocalDay } from './athensDate';
import { normalizeTaskStatus } from './categoryNormalize';

export type TaskFocusFilter = 'all' | 'action' | 'active' | 'completed';
export type TaskSort = 'due' | 'priority' | 'field' | 'recent';

const startOfDay = (d: Date) => startOfLocalDay(d);

const taskDueDate = (task: FieldTask): Date | null => {
  const raw = task.plannedEnd || task.plannedStart;
  if (!raw) return null;
  const d = parseBusinessDate(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

export { taskDueDate };

export const isTaskOverdue = (task: FieldTask, now = new Date()): boolean => {
  if (normalizeTaskStatus(task.status) === 'completed' || normalizeTaskStatus(task.status) === 'cancelled') {
    return false;
  }
  const due = taskDueDate(task);
  if (!due) return false;
  return due < startOfDay(now);
};

export const isTaskDueToday = (task: FieldTask, now = new Date()): boolean => {
  if (normalizeTaskStatus(task.status) === 'completed' || normalizeTaskStatus(task.status) === 'cancelled') {
    return false;
  }
  const due = taskDueDate(task);
  if (!due) return false;
  return startOfDay(due).getTime() === startOfDay(now).getTime();
};

export const needsAction = (task: FieldTask, now = new Date()): boolean => {
  if (normalizeTaskStatus(task.status) === 'completed') return false;
  return isTaskOverdue(task, now) || isTaskDueToday(task, now);
};

export const isActiveTask = (task: FieldTask): boolean => {
  const status = normalizeTaskStatus(task.status);
  return status === 'pending' || status === 'in_progress';
};

export type TaskSummary = {
  total: number;
  active: number;
  overdue: number;
  dueToday: number;
  inProgress: number;
};

export const getTaskSummary = (tasks: FieldTask[], now = new Date()): TaskSummary => {
  let active = 0;
  let overdue = 0;
  let dueToday = 0;
  let inProgress = 0;

  for (const task of tasks) {
    if (isActiveTask(task)) active += 1;
    if (normalizeTaskStatus(task.status) === 'in_progress') inProgress += 1;
    if (isTaskOverdue(task, now)) overdue += 1;
    if (isTaskDueToday(task, now)) dueToday += 1;
  }

  return {
    total: tasks.length,
    active,
    overdue,
    dueToday,
    inProgress,
  };
};

export type TaskListFilters = {
  search: string;
  focus: TaskFocusFilter;
  fieldId: string;
  status: string;
};

export const filterTasks = (tasks: FieldTask[], filters: TaskListFilters, now = new Date()): FieldTask[] => {
  const search = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.fieldId && task.fieldId !== filters.fieldId) return false;

    if (filters.focus === 'action' && !needsAction(task, now)) return false;
    if (filters.focus === 'active' && !isActiveTask(task)) return false;
    if (filters.focus === 'completed' && normalizeTaskStatus(task.status) !== 'completed') return false;

    if (filters.status !== 'all' && normalizeTaskStatus(task.status) !== filters.status) return false;

    if (search) {
      const haystack = [task.title, task.templateCode || '', task.description || ''].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
};

export const sortTasks = (
  tasks: FieldTask[],
  sort: TaskSort,
  fieldNames: Record<string, string>
): FieldTask[] => {
  return [...tasks].sort((a, b) => {
    if (sort === 'field') {
      const fa = fieldNames[a.fieldId] || a.fieldId;
      const fb = fieldNames[b.fieldId] || b.fieldId;
      const cmp = fa.localeCompare(fb);
      if (cmp !== 0) return cmp;
    }

    if (sort === 'recent') {
      const ra = new Date(a.updatedAt || a.createdAt).getTime();
      const rb = new Date(b.updatedAt || b.createdAt).getTime();
      return rb - ra;
    }

    const ad = a.plannedEnd ? new Date(a.plannedEnd).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.plannedEnd ? new Date(b.plannedEnd).getTime() : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;

    return a.title.localeCompare(b.title);
  });
};
