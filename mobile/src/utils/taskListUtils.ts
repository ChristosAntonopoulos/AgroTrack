import { FieldTask, isCompletedFieldTask } from '../services/fieldWorkService';

export type TaskFilter = 'all' | 'planned' | 'in_progress' | 'ready' | 'blocked';

export function isTaskOverdue(task: FieldTask): boolean {
  if (isCompletedFieldTask(task)) return false;
  const deadline = task.plannedEnd ?? task.plannedStart;
  if (!deadline) return false;
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

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
