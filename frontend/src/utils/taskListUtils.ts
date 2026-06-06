import { Task } from '../services/taskService';

export type TaskFocusFilter = 'all' | 'action' | 'active' | 'completed';
export type TaskSort = 'due' | 'priority' | 'field' | 'recent';
export type TaskBoardColumn = 'overdue' | 'today' | 'thisWeek' | 'done';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const priorityWeight: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

export const isTaskOverdue = (task: Task, now = new Date()): boolean => {
  if (task.status === 'completed') return false;
  if (!task.scheduledEnd) return false;
  return new Date(task.scheduledEnd) < startOfDay(now);
};

export const isTaskDueToday = (task: Task, now = new Date()): boolean => {
  if (task.status === 'completed') return false;
  if (!task.scheduledEnd) return false;
  return startOfDay(new Date(task.scheduledEnd)).getTime() === startOfDay(now).getTime();
};

export const needsAction = (task: Task, now = new Date()): boolean => {
  if (task.status === 'completed') return false;
  return isTaskOverdue(task, now) || isTaskDueToday(task, now);
};

export const isActiveTask = (task: Task): boolean =>
  task.status === 'pending' || task.status === 'in_progress';

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
    if (task.status === 'in_progress') inProgress += 1;
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
    if (filters.focus === 'completed' && task.status !== 'completed') return false;

    if (filters.status !== 'all' && task.status !== filters.status) return false;

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
    const due = task.scheduledEnd ? new Date(task.scheduledEnd) : null;
    const isDone = task.status === 'completed';

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
