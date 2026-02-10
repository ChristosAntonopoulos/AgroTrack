import { getTaskService } from './serviceFactory';
import { Task } from './taskService';
import { Field } from './fieldService';
import { Lifecycle } from './lifecycleService';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'task' | 'lifecycle' | 'deadline';
  status?: string;
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
  showLifecycles?: boolean;
  showDeadlines?: boolean;
}

export const calendarService = {
  getEvents: async (
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): Promise<CalendarEvent[]> => {
    const taskService = getTaskService();
    const events: CalendarEvent[] = [];

    // Get all tasks
    const allTasks = await taskService.getTasks();
    
    // Filter tasks by date range and other filters
    const filteredTasks = allTasks.filter(task => {
      if (!task.scheduledStart) return false;
      
      const taskStart = new Date(task.scheduledStart);
      const taskEnd = task.scheduledEnd ? new Date(task.scheduledEnd) : taskStart;
      
      // Check if task overlaps with date range
      const overlaps = (taskStart <= endDate && taskEnd >= startDate);
      if (!overlaps) return false;
      
      // Apply filters
      if (filters?.fieldIds && filters.fieldIds.length > 0) {
        if (!filters.fieldIds.includes(task.fieldId)) return false;
      }
      
      if (filters?.taskTypes && filters.taskTypes.length > 0) {
        if (!filters.taskTypes.includes(task.type)) return false;
      }
      
      if (filters?.statuses && filters.statuses.length > 0) {
        if (!filters.statuses.includes(task.status)) return false;
      }
      
      return true;
    });

    // Convert tasks to calendar events
    if (filters?.showTasks !== false) {
      filteredTasks.forEach(task => {
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          start: new Date(task.scheduledStart!),
          end: task.scheduledEnd ? new Date(task.scheduledEnd) : new Date(task.scheduledStart!),
          type: 'task',
          status: task.status,
          fieldId: task.fieldId,
          taskId: task.id,
          color: getTaskStatusColor(task.status),
        });
      });
    }

    // Add deadline events (tasks due soon)
    if (filters?.showDeadlines !== false) {
      filteredTasks
        .filter(task => task.status !== 'completed' && task.scheduledEnd)
        .forEach(task => {
          const deadline = new Date(task.scheduledEnd!);
          const daysUntilDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntilDeadline <= 7 && daysUntilDeadline >= 0) {
            events.push({
              id: `deadline-${task.id}`,
              title: `Deadline: ${task.title}`,
              start: deadline,
              end: deadline,
              type: 'deadline',
              status: task.status,
              fieldId: task.fieldId,
              taskId: task.id,
              color: daysUntilDeadline <= 3 ? '#dc3545' : '#ffc107',
            });
          }
        });
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  },

  getTasksForDate: async (date: Date): Promise<Task[]> => {
    const taskService = getTaskService();
    const allTasks = await taskService.getTasks();
    
    return allTasks.filter(task => {
      if (!task.scheduledStart) return false;
      const taskDate = new Date(task.scheduledStart);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  },

  getLifecycleEvents: async (
    fieldId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<CalendarEvent[]> => {
    // This would integrate with lifecycle service to show progression dates
    // For now, return empty array - can be enhanced later
    return [];
  },
};

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
