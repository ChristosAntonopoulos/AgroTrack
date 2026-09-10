import { getFieldWorkService } from './serviceFactory';
import { getFieldService } from './serviceFactory';
import type { FieldTask } from './fieldWorkService';
import { Field } from './fieldService';
import { normalizeTaskStatus } from '../utils/categoryNormalize';

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
  averageCompletionTime: number; // in days
}

export interface FieldMetrics {
  fieldId: string;
  fieldName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  totalCost: number;
  averageCostPerTask: number;
}

export interface CostAnalysis {
  totalCost: number;
  costByField: { fieldId: string; fieldName: string; cost: number }[];
  costByTaskType: { type: string; cost: number }[];
  costOverTime: { date: string; cost: number }[];
}

export interface CompletionRates {
  daily: { date: string; completed: number; total: number; rate: number }[];
  weekly: { week: string; completed: number; total: number; rate: number }[];
  monthly: { month: string; completed: number; total: number; rate: number }[];
}

export interface TaskStatusDistribution {
  pending: number;
  inProgress: number;
  completed: number;
}

export interface ProducerPerformance {
  producerId: string;
  producerName: string;
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  averageCompletionTime: number;
  onTimeCompletionRate: number;
}

const listAll = async (): Promise<FieldTask[]> => getFieldWorkService().listFieldTasks();

export const analyticsService = {
  getTaskMetrics: async (dateRange: DateRange): Promise<TaskMetrics> => {
    const allTasks = await listAll();

    const filteredTasks = allTasks.filter((task) => {
      if (!task.createdAt) return false;
      const taskDate = new Date(task.createdAt);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });

    const total = filteredTasks.length;
    const pending = filteredTasks.filter((t) => normalizeTaskStatus(t.status) === 'pending').length;
    const inProgress = filteredTasks.filter((t) => normalizeTaskStatus(t.status) === 'in_progress').length;
    const completed = filteredTasks.filter((t) => normalizeTaskStatus(t.status) === 'completed').length;

    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    const completedTasksWithDates = filteredTasks.filter(
      (t) => normalizeTaskStatus(t.status) === 'completed' && t.plannedStart && t.updatedAt
    );

    let averageCompletionTime = 0;
    if (completedTasksWithDates.length > 0) {
      const totalDays = completedTasksWithDates.reduce((sum, task) => {
        const start = new Date(task.plannedStart!);
        const end = new Date(task.updatedAt);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      averageCompletionTime = totalDays / completedTasksWithDates.length;
    }

    return {
      total,
      pending,
      inProgress,
      completed,
      completionRate,
      averageCompletionTime,
    };
  },

  getFieldMetrics: async (fieldIds: string[], dateRange: DateRange): Promise<FieldMetrics[]> => {
    const allTasks = await listAll();
    const allFields = await getFieldService().getFields();

    const filteredTasks = allTasks.filter((task) => {
      if (!task.createdAt) return false;
      const taskDate = new Date(task.createdAt);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });

    return fieldIds.map((fieldId) => {
      const field = allFields.find((f) => f.id === fieldId);
      const fieldTasks = filteredTasks.filter((t) => t.fieldId === fieldId);
      const completedTasks = fieldTasks.filter((t) => normalizeTaskStatus(t.status) === 'completed');
      const totalCost = completedTasks.reduce((sum, task) => sum + (task.estimatedCost || 0), 0);

      return {
        fieldId,
        fieldName: field?.name || 'Unknown Field',
        totalTasks: fieldTasks.length,
        completedTasks: completedTasks.length,
        completionRate: fieldTasks.length > 0 ? (completedTasks.length / fieldTasks.length) * 100 : 0,
        totalCost,
        averageCostPerTask: completedTasks.length > 0 ? totalCost / completedTasks.length : 0,
      };
    });
  },

  getCostAnalysis: async (dateRange: DateRange): Promise<CostAnalysis> => {
    const allTasks = await listAll();
    const allFields = await getFieldService().getFields();

    const filteredTasks = allTasks.filter((task) => {
      if (!task.updatedAt || !task.estimatedCost) return false;
      if (normalizeTaskStatus(task.status) !== 'completed') return false;
      const taskDate = new Date(task.updatedAt);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });

    const totalCost = filteredTasks.reduce((sum, task) => sum + (task.estimatedCost || 0), 0);

    const costByFieldMap = new Map<string, number>();
    filteredTasks.forEach((task) => {
      const current = costByFieldMap.get(task.fieldId) || 0;
      costByFieldMap.set(task.fieldId, current + (task.estimatedCost || 0));
    });

    const costByField = Array.from(costByFieldMap.entries()).map(([fieldId, cost]) => {
      const field = allFields.find((f) => f.id === fieldId);
      return { fieldId, fieldName: field?.name || 'Unknown', cost };
    });

    const costByTaskTypeMap = new Map<string, number>();
    filteredTasks.forEach((task) => {
      const key = task.templateCode || 'other';
      const current = costByTaskTypeMap.get(key) || 0;
      costByTaskTypeMap.set(key, current + (task.estimatedCost || 0));
    });

    const costByTaskType = Array.from(costByTaskTypeMap.entries()).map(([type, cost]) => ({
      type,
      cost,
    }));

    const costOverTimeMap = new Map<string, number>();
    filteredTasks.forEach((task) => {
      const dateKey = new Date(task.updatedAt).toISOString().split('T')[0];
      const current = costOverTimeMap.get(dateKey) || 0;
      costOverTimeMap.set(dateKey, current + (task.estimatedCost || 0));
    });

    const costOverTime = Array.from(costOverTimeMap.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCost,
      costByField,
      costByTaskType,
      costOverTime,
    };
  },

  getCompletionRates: async (dateRange: DateRange): Promise<CompletionRates> => {
    const allTasks = await listAll();

    const filteredTasks = allTasks.filter((task) => {
      if (!task.createdAt) return false;
      const taskDate = new Date(task.createdAt);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });

    const dailyMap = new Map<string, { completed: number; total: number }>();
    filteredTasks.forEach((task) => {
      const dateKey = new Date(task.createdAt).toISOString().split('T')[0];
      const current = dailyMap.get(dateKey) || { completed: 0, total: 0 };
      current.total++;
      if (normalizeTaskStatus(task.status) === 'completed') {
        current.completed++;
      }
      dailyMap.set(dateKey, current);
    });

    const daily = Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const weekly = daily.reduce(
      (acc, day) => {
        const weekStart = new Date(day.date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];

        const existing = acc.find((w) => w.week === weekKey);
        if (existing) {
          existing.completed += day.completed;
          existing.total += day.total;
          existing.rate = existing.total > 0 ? (existing.completed / existing.total) * 100 : 0;
        } else {
          acc.push({
            week: weekKey,
            completed: day.completed,
            total: day.total,
            rate: day.rate,
          });
        }
        return acc;
      },
      [] as { week: string; completed: number; total: number; rate: number }[]
    );

    const monthlyMap = new Map<string, { completed: number; total: number }>();
    filteredTasks.forEach((task) => {
      const taskDate = new Date(task.createdAt);
      const monthKey = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}`;
      const current = monthlyMap.get(monthKey) || { completed: 0, total: 0 };
      current.total++;
      if (normalizeTaskStatus(task.status) === 'completed') {
        current.completed++;
      }
      monthlyMap.set(monthKey, current);
    });

    const monthly = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        ...data,
        rate: data.total > 0 ? (data.completed / data.total) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return { daily, weekly, monthly };
  },

  getTaskStatusDistribution: async (dateRange: DateRange): Promise<TaskStatusDistribution> => {
    const allTasks = await listAll();

    const filteredTasks = allTasks.filter((task) => {
      if (!task.createdAt) return false;
      const taskDate = new Date(task.createdAt);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });

    return {
      pending: filteredTasks.filter((t) => normalizeTaskStatus(t.status) === 'pending').length,
      inProgress: filteredTasks.filter((t) => normalizeTaskStatus(t.status) === 'in_progress').length,
      completed: filteredTasks.filter((t) => normalizeTaskStatus(t.status) === 'completed').length,
    };
  },
};
