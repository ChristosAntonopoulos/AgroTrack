import { CalendarEvent, CalendarFilters } from '../calendarService';
import { mockTasks, mockFields, simulateDelay } from './mockData';

export const mockCalendarService = {
  getEvents: async (
    startDate: Date,
    endDate: Date,
    filters?: CalendarFilters
  ): Promise<CalendarEvent[]> => {
    await simulateDelay();
    const events: CalendarEvent[] = [];

    // Filter tasks by date range
    const filteredTasks = mockTasks.filter(task => {
      if (!task.scheduledStart) return false;
      const taskStart = new Date(task.scheduledStart);
      const taskEnd = task.scheduledEnd ? new Date(task.scheduledEnd) : taskStart;
      const overlaps = (taskStart <= endDate && taskEnd >= startDate);
      if (!overlaps) return false;

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

    if (filters?.showTasks !== false) {
      filteredTasks.forEach(task => {
        const field = mockFields.find(f => f.id === task.fieldId);
        events.push({
          id: `task-${task.id}`,
          title: task.title,
          start: new Date(task.scheduledStart!),
          end: task.scheduledEnd ? new Date(task.scheduledEnd) : new Date(task.scheduledStart!),
          type: 'task',
          status: task.status,
          fieldId: task.fieldId,
          fieldName: field?.name,
          taskId: task.id,
          color: getTaskStatusColor(task.status),
        });
      });
    }

    if (filters?.showDeadlines !== false) {
      filteredTasks
        .filter(task => task.status !== 'completed' && task.scheduledEnd)
        .forEach(task => {
          const deadline = new Date(task.scheduledEnd!);
          const daysUntilDeadline = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilDeadline <= 7 && daysUntilDeadline >= 0) {
            const field = mockFields.find(f => f.id === task.fieldId);
            events.push({
              id: `deadline-${task.id}`,
              title: `Deadline: ${task.title}`,
              start: deadline,
              end: deadline,
              type: 'deadline',
              status: task.status,
              fieldId: task.fieldId,
              fieldName: field?.name,
              taskId: task.id,
              color: daysUntilDeadline <= 3 ? '#dc3545' : '#ffc107',
            });
          }
        });
    }

    return events.sort((a, b) => a.start.getTime() - b.start.getTime());
  },

  getTasksForDate: async (date: Date) => {
    await simulateDelay();
    return mockTasks.filter(task => {
      if (!task.scheduledStart) return false;
      const taskDate = new Date(task.scheduledStart);
      return (
        taskDate.getDate() === date.getDate() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getFullYear() === date.getFullYear()
      );
    });
  },

  getLifecycleEvents: async () => {
    await simulateDelay();
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
