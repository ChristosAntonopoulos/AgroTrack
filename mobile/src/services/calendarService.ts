import { getTaskCategoryColor } from '../utils/calendarCategoryColors';
import { isMockDataEnabled } from '../config/env';
import { taskService } from './taskService';
import { mockTaskService } from './mockTaskService';
import { Task } from './taskService';

const getTaskService = () => (isMockDataEnabled() ? mockTaskService : taskService);

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'lifecycle' | 'deadline';
  status?: string;
  priority?: string;
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
  showTasks?: boolean;
  showDeadlines?: boolean;
}

function getTaskStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return '#ffc107';
    case 'in_progress':
      return '#17a2b8';
    case 'completed':
      return '#28a745';
    default:
      return '#6c757d';
  }
}

function taskInRange(task: Task, startDate: Date, endDate: Date): boolean {
  if (!task.scheduledStart) return false;
  const taskStart = new Date(task.scheduledStart);
  const taskEnd = task.scheduledEnd ? new Date(task.scheduledEnd) : taskStart;
  return taskStart <= endDate && taskEnd >= startDate;
}

function applyTaskFilters(task: Task, filters?: CalendarFilters): boolean {
  if (filters?.fieldIds?.length && !filters.fieldIds.includes(task.fieldId)) return false;
  if (filters?.taskTypes?.length && !filters.taskTypes.includes(task.type)) return false;
  if (filters?.statuses?.length && !filters.statuses.includes(task.status)) return false;
  return true;
}

export const calendarService = {
  getEvents: async (
    startDate: Date,
    endDate: Date,
    userId: string,
    userRole: string,
    fieldNames: Record<string, string> = {},
    filters?: CalendarFilters
  ): Promise<CalendarEvent[]> => {
    const allTasks = await getTaskService().getAssignedTasks(userId, userRole);
    const events: CalendarEvent[] = [];

    const filteredTasks = allTasks.filter(
      task => taskInRange(task, startDate, endDate) && applyTaskFilters(task, filters)
    );

    if (filters?.showTasks !== false) {
      filteredTasks.forEach(task => {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          start: new Date(task.scheduledStart!),
          end: task.scheduledEnd ? new Date(task.scheduledEnd) : new Date(task.scheduledStart!),
          type: 'task',
          status: task.status,
          taskType: task.type,
          fieldId: task.fieldId,
          fieldName: fieldNames[task.fieldId],
          taskId: task.id,
          color: getTaskCategoryColor(task.type) || getTaskStatusColor(task.status),
        });
      });
    }

    if (filters?.showDeadlines !== false) {
      filteredTasks
        .filter(task => task.status !== 'completed' && task.scheduledEnd)
        .forEach(task => {
          const deadline = new Date(task.scheduledEnd!);
          const daysUntil = Math.ceil(
            (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          if (daysUntil <= 7 && daysUntil >= 0) {
            events.push({
              id: `deadline-${task.id}`,
              title: task.title,
              start: deadline,
              end: deadline,
              type: 'deadline',
              status: task.status,
              fieldId: task.fieldId,
              fieldName: fieldNames[task.fieldId],
              taskId: task.id,
              color: daysUntil <= 3 ? '#dc3545' : '#ffc107',
            });
          }
        });
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  },
};
