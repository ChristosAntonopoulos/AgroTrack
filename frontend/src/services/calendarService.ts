import { getFieldWorkService } from './serviceFactory';
import { getTaskCategoryColor } from '../utils/taskCategoryColors';
import { getStatusPalette } from '../styles/colorTokens';
import type { FieldTask } from './fieldWorkService';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'lifecycle' | 'deadline';
  status?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  taskType?: string;
  fieldId?: string;
  fieldName?: string;
  taskId?: string;
  color?: string;
}

export interface CalendarFilters {
  fieldIds?: string[];
  taskTypes?: string[];
  statuses?: string[];
  priorities?: string[];
  categories?: string[];
  showTasks?: boolean;
  showLifecycles?: boolean;
  showDeadlines?: boolean;
}

const openStatuses = new Set(['planned', 'ready', 'in_progress', 'blocked', 'pending']);

export const calendarService = {
  getEvents: async (
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): Promise<CalendarEvent[]> => {
    const fieldWork = getFieldWorkService();
    const events: CalendarEvent[] = [];

    const allTasks = await fieldWork.listFieldTasks();

    const filteredTasks = allTasks.filter((task) => {
      if (!task.plannedStart && !task.plannedEnd) return false;

      const taskStart = new Date(task.plannedStart || task.plannedEnd!);
      const taskEnd = task.plannedEnd ? new Date(task.plannedEnd) : taskStart;

      const overlaps = taskStart <= endDate && taskEnd >= startDate;
      if (!overlaps) return false;

      if (filters?.fieldIds && filters.fieldIds.length > 0) {
        if (!filters.fieldIds.includes(task.fieldId)) return false;
      }

      if (filters?.taskTypes && filters.taskTypes.length > 0) {
        if (!task.templateCode || !filters.taskTypes.includes(task.templateCode)) return false;
      }

      if (filters?.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(task.status)) return false;
      }

      if (filters?.categories && filters.categories.length > 0) {
        if (!task.templateCode || !filters.categories.includes(task.templateCode)) return false;
      }

      return true;
    });

    if (filters?.showTasks !== false) {
      filteredTasks.forEach((task) => {
        const start = new Date(task.plannedStart || task.plannedEnd!);
        const end = task.plannedEnd ? new Date(task.plannedEnd) : start;
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          start,
          end,
          type: 'task',
          status: task.status,
          taskType: task.templateCode,
          fieldId: task.fieldId,
          taskId: task.id,
          color: getTaskCategoryColor(task.templateCode) || getTaskStatusColor(task.status),
        });
      });
    }

    if (filters?.showDeadlines !== false) {
      filteredTasks
        .filter((task) => task.status !== 'completed' && task.status !== 'cancelled' && task.plannedEnd)
        .forEach((task) => {
          const deadline = new Date(task.plannedEnd!);
          const daysUntilDeadline = Math.ceil(
            (deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilDeadline <= 7 && daysUntilDeadline >= 0 && openStatuses.has(task.status)) {
            events.push({
              id: `deadline-${task.id}`,
              title: `Deadline: ${task.title}`,
              start: deadline,
              end: deadline,
              type: 'deadline',
              status: task.status,
              fieldId: task.fieldId,
              taskId: task.id,
              color: daysUntilDeadline <= 3
                ? getStatusPalette().danger
                : getStatusPalette().warning,
            });
          }
        });
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  },

  getTasksForDate: async (date: Date): Promise<FieldTask[]> => {
    const fieldWork = getFieldWorkService();
    const allTasks = await fieldWork.listFieldTasks();

    return allTasks.filter((task) => {
      const raw = task.plannedStart || task.plannedEnd;
      if (!raw) return false;
      const taskDate = new Date(raw);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  },

  getLifecycleEvents: async (
    _fieldId: string,
    _dateRange: { start: Date; end: Date }
  ): Promise<CalendarEvent[]> => {
    return [];
  },
};

function getTaskStatusColor(status: string): string {
  const s = getStatusPalette();
  switch (status) {
    case 'planned':
    case 'ready':
    case 'pending':
      return s.warning;
    case 'in_progress':
      return s.olive || s.info;
    case 'blocked':
      return s.warning;
    case 'completed':
      return s.success;
    default:
      return s.neutral;
  }
}
