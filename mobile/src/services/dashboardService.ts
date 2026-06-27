import api from './api';
import { Field } from './fieldService';
import { Task } from './taskService';

export interface DashboardStats {
  totalFields?: number;
  totalArea?: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  completedTasks?: number;
  totalTasks?: number;
  completionRate?: number;
  pendingApprovals?: number;
  fieldsNeedingAttention?: number;
}

export const dashboardService = {
  computeStats: async (_userId: string, userRole: string): Promise<DashboardStats> => {
    const [fieldsRes, tasksRes] = await Promise.all([
      api.get<Field[]>('/api/v1/fields'),
      api.get<Task[]>('/api/v1/tasks'),
    ]);

    const fields = fieldsRes.data;
    const tasks = tasksRes.data;

    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const pendingApprovals = tasks.filter(
      t => (t as Task & { approvalStatus?: string }).approvalStatus === 'pending'
    ).length;

    if (userRole === 'FieldOwner' || userRole === 'Administrator') {
      return {
        totalFields: fields.length,
        totalArea: fields.reduce((sum, f) => sum + (f.area || 0), 0),
        pendingTasks: pending,
        inProgressTasks: inProgress,
        completedTasks: completed,
        totalTasks: total,
        completionRate,
        pendingApprovals,
        fieldsNeedingAttention: fields.filter(f => {
          const fieldTasks = tasks.filter(t => t.fieldId === f.id && t.status !== 'completed');
          return fieldTasks.some(t => {
            if (!t.scheduledEnd) return false;
            return new Date(t.scheduledEnd) < new Date();
          });
        }).length,
      };
    }

    return {
      totalTasks: total,
      pendingTasks: pending,
      inProgressTasks: inProgress,
      completedTasks: completed,
      completionRate,
    };
  },
};
