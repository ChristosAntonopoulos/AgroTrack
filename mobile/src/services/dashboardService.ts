import api from './api';
import { Field } from './fieldService';
import { FieldTask, isActiveFieldTask } from './fieldWorkService';

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
      api.get<FieldTask[]>('/api/v1/field-tasks'),
    ]);

    const fields = fieldsRes.data;
    const tasks = tasksRes.data;
    const active = tasks.filter(isActiveFieldTask);

    const pending = active.filter(
      (t) => t.status === 'planned' || t.status === 'ready' || t.status === 'blocked'
    ).length;
    const inProgress = active.filter((t) => t.status === 'in_progress').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    if (userRole === 'FieldOwner' || userRole === 'Administrator') {
      return {
        totalFields: fields.length,
        totalArea: fields.reduce((sum, f) => sum + (f.area || 0), 0),
        pendingTasks: pending,
        inProgressTasks: inProgress,
        completedTasks: completed,
        totalTasks: total,
        completionRate,
        pendingApprovals: 0,
        fieldsNeedingAttention: fields.filter((f) => {
          const fieldTasks = active.filter((t) => t.fieldId === f.id);
          return fieldTasks.some((t) => {
            if (!t.plannedEnd) return false;
            return new Date(t.plannedEnd) < new Date();
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
