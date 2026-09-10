import { Task } from '../services/taskService';
import { parseBusinessDate, startOfLocalDay } from './athensDate';
import { normalizeTaskStatus } from './categoryNormalize';

export type TaskFocusFilter = 'all' | 'action' | 'active' | 'completed';
export type TaskSort = 'due' | 'priority' | 'field' | 'recent';
export type TaskBoardColumn = 'overdue' | 'today' | 'thisWeek' | 'done';

const startOfDay = (d: Date) => startOfLocalDay(d);

const taskDueDate = (task: Task): Date | null => {
  const raw = task.scheduledEnd || task.scheduledStart;
  if (!raw) return null;
  const d = parseBusinessDate(raw);
  return Number.isNaN(d.getTime()) ? null : d;
};

const priorityWeight: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export { taskDueDate };

export const isTaskOverdue = (task: Task, now = new Date()): boolean => {
  if (normalizeTaskStatus(task.status) === 'completed' || normalizeTaskStatus(task.status) === 'cancelled') {
    return false;
  }
  const due = taskDueDate(task);
  if (!due) return false;
  return due < startOfDay(now);
};

export const isTaskDueToday = (task: Task, now = new Date()): boolean => {
  if (normalizeTaskStatus(task.status) === 'completed' || normalizeTaskStatus(task.status) === 'cancelled') {
    return false;
  }
  const due = taskDueDate(task);
  if (!due) return false;
  return startOfDay(due).getTime() === startOfDay(now).getTime();
};

export const needsAction = (task: Task, now = new Date()): boolean => {
  if (task.status === 'completed') return false;
  return isTaskOverdue(task, now) || isTaskDueToday(task, now);
};

export const isActiveTask = (task: Task): boolean => {
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

export const getTaskSummary = (tasks: Task[], now = new Date()): TaskSummary => {
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

export const filterTasks = (tasks: Task[], filters: TaskListFilters, now = new Date()): Task[] => {
  const search = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.fieldId && task.fieldId !== filters.fieldId) return false;

    if (filters.focus === 'action' && !needsAction(task, now)) return false;
    if (filters.focus === 'active' && !isActiveTask(task)) return false;
    if (filters.focus === 'completed' && normalizeTaskStatus(task.status) !== 'completed') return false;

    if (filters.status !== 'all' && normalizeTaskStatus(task.status) !== filters.status) return false;

    if (search) {
      const haystack = [task.title, task.type, task.description || ''].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });
};

export const sortTasks = (
  tasks: Task[],
  sort: TaskSort,
  fieldNames: Record<string, string>
): Task[] => {
  return [...tasks].sort((a, b) => {
    if (sort === 'field') {
      const fa = fieldNames[a.fieldId] || a.fieldId;
      const fb = fieldNames[b.fieldId] || b.fieldId;
      const cmp = fa.localeCompare(fb);
      if (cmp !== 0) return cmp;
    }

    if (sort === 'priority') {
      const pa = priorityWeight[a.priority || 'Medium'] ?? 2;
      const pb = priorityWeight[b.priority || 'Medium'] ?? 2;
      if (pa !== pb) return pb - pa;
    }

    if (sort === 'recent') {
      const ra = new Date(a.updatedAt || a.createdAt).getTime();
      const rb = new Date(b.updatedAt || b.createdAt).getTime();
      return rb - ra;
    }

    const ad = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
    const bd = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
    if (ad !== bd) return ad - bd;

    return a.title.localeCompare(b.title);
  });
};

export const groupOpenTasks = (tasks: Task[], now = new Date()) => {
  const overdue: Task[] = [];
  const today: Task[] = [];
  const upcoming: Task[] = [];
  for (const task of tasks) {
    if (!isActiveTask(task)) continue;
    if (isTaskOverdue(task, now)) overdue.push(task);
    else if (isTaskDueToday(task, now)) today.push(task);
    else upcoming.push(task);
  }
  return { overdue, today, upcoming };
};

export const groupTasksForBoard = (tasks: Task[], now = new Date()): Record<TaskBoardColumn, Task[]> => {
  const today = startOfDay(now);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const cols: Record<TaskBoardColumn, Task[]> = {
    overdue: [],
    today: [],
    thisWeek: [],
    done: [],
  };

  for (const task of tasks) {
    const due = taskDueDate(task);
    const isDone = normalizeTaskStatus(task.status) === 'completed';

    if (isDone) {
      cols.done.push(task);
      continue;
    }
    if (due && due < today) {
      cols.overdue.push(task);
      continue;
    }
    if (due && startOfDay(due).getTime() === today.getTime()) {
      cols.today.push(task);
      continue;
    }
    if (due && due < weekEnd) {
      cols.thisWeek.push(task);
      continue;
    }
    cols.thisWeek.push(task);
  }

  (Object.keys(cols) as TaskBoardColumn[]).forEach((key) => {
    cols[key].sort((a, b) => {
      const ad = a.scheduledEnd ? new Date(a.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      const bd = b.scheduledEnd ? new Date(b.scheduledEnd).getTime() : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
  });

  return cols;
};
