import { getTaskService, getFieldService } from './serviceFactory';
import { Task } from './taskService';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface TaskMetrics {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}

export interface FieldMetrics {
  fieldId: string;
  fieldName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
}

export const analyticsService = {
  getTaskMetrics: async (dateRange: DateRange): Promise<TaskMetrics> => {
    const allTasks = await getTaskService().getAllTasks();
    const filtered = allTasks.filter((task) => {
      if (!task.createdAt) return false;
      const taskDate = new Date(task.createdAt);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });
    const total = filtered.length;
    const pending = filtered.filter((t) => t.status === 'pending').length;
    const inProgress = filtered.filter((t) => t.status === 'in_progress').length;
    const completed = filtered.filter((t) => t.status === 'completed').length;
    return {
      total,
      pending,
      inProgress,
      completed,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  },

  getFieldMetrics: async (dateRange: DateRange): Promise<FieldMetrics[]> => {
    const [tasks, fields] = await Promise.all([
      getTaskService().getAllTasks(),
      getFieldService().getFields('', ''),
    ]);
    const inRange = (task: Task) => {
      if (!task.createdAt) return false;
      const d = new Date(task.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    };
    return fields.map((field) => {
      const fieldTasks = tasks.filter((t) => t.fieldId === field.id && inRange(t));
      const completedTasks = fieldTasks.filter((t) => t.status === 'completed').length;
      return {
        fieldId: field.id,
        fieldName: field.name,
        totalTasks: fieldTasks.length,
        completedTasks,
        completionRate: fieldTasks.length > 0 ? (completedTasks / fieldTasks.length) * 100 : 0,
      };
    });
  },
};
