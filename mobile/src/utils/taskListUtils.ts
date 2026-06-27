import { Task } from '../services/taskService';

export type TaskFilter = 'all' | 'pending' | 'in_progress' | 'completed' | 'approval';

export function isTaskOverdue(task: Task): boolean {
  if (task.status === 'completed') return false;
  const deadline = task.scheduledEnd ?? task.scheduledStart;
  if (!deadline) return false;
  const end = new Date(deadline);
  end.setHours(23, 59, 59, 999);
  return end.getTime() < Date.now();
}

export function sortTasksForList(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const aOver = isTaskOverdue(a);
    const bOver = isTaskOverdue(b);
    if (aOver !== bOver) return aOver ? -1 : 1;

    const statusOrder: Record<string, number> = {
      in_progress: 0,
      pending: 1,
      completed: 2,
    };
    const aStatus = statusOrder[a.status] ?? 3;
    const bStatus = statusOrder[b.status] ?? 3;
    if (aStatus !== bStatus) return aStatus - bStatus;

    const aDate = a.scheduledStart ? new Date(a.scheduledStart).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.scheduledStart ? new Date(b.scheduledStart).getTime() : Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });
}

export function getTaskFilterCounts(tasks: Task[]): Record<TaskFilter, number> {
  return {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    approval: tasks.filter(t => t.approvalStatus === 'pending').length,
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
    case 'pending':
      return colors.taskPending;
    case 'in_progress':
      return colors.taskInProgress;
    case 'completed':
      return colors.taskCompleted;
    default:
      return colors.textSecondary;
  }
}
