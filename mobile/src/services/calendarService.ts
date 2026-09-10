import { getTaskCategoryColor } from '../utils/calendarCategoryColors';
import { getFieldWorkService } from './serviceFactory';
import { FieldTask, fieldTaskTypeKey, isActiveFieldTask } from './fieldWorkService';

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
    case 'planned':
    case 'ready':
      return '#ffc107';
    case 'in_progress':
      return '#17a2b8';
    case 'blocked':
      return '#6c757d';
    case 'completed':
      return '#28a745';
    default:
      return '#6c757d';
  }
}

function taskInRange(task: FieldTask, startDate: Date, endDate: Date): boolean {
  if (!task.plannedStart) return false;
  const taskStart = new Date(task.plannedStart);
  const taskEnd = task.plannedEnd ? new Date(task.plannedEnd) : taskStart;
  return taskStart <= endDate && taskEnd >= startDate;
}

function applyTaskFilters(task: FieldTask, filters?: CalendarFilters): boolean {
  if (filters?.fieldIds?.length && !filters.fieldIds.includes(task.fieldId)) return false;
  const typeKey = fieldTaskTypeKey(task);
  if (filters?.taskTypes?.length && !filters.taskTypes.includes(typeKey)) return false;
  if (filters?.statuses?.length && !filters.statuses.includes(task.status)) return false;
  return true;
}

export const calendarService = {
  getEvents: async (
    startDate: Date,
    endDate: Date,
    _userId: string,
    _userRole: string,
    fieldNames: Record<string, string> = {},
    filters?: CalendarFilters
  ): Promise<CalendarEvent[]> => {
    const allTasks = await getFieldWorkService().listFieldTasks();
    const events: CalendarEvent[] = [];

    const filteredTasks = allTasks.filter(
      (task) => taskInRange(task, startDate, endDate) && applyTaskFilters(task, filters)
    );

    if (filters?.showTasks !== false) {
      filteredTasks.forEach((task) => {
        const typeKey = fieldTaskTypeKey(task);
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          start: new Date(task.plannedStart!),
          end: task.plannedEnd ? new Date(task.plannedEnd) : new Date(task.plannedStart!),
          type: 'task',
          status: task.status,
          taskType: typeKey,
          fieldId: task.fieldId,
          fieldName: fieldNames[task.fieldId],
          taskId: task.id,
          color: getTaskCategoryColor(typeKey) || getTaskStatusColor(task.status),
        });
      });
    }

    if (filters?.showDeadlines !== false) {
      filteredTasks
        .filter((task) => isActiveFieldTask(task) && task.plannedEnd)
        .forEach((task) => {
          const deadline = new Date(task.plannedEnd!);
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
