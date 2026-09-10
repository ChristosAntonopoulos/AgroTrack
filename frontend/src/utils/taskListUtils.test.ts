import { getTaskSummary, isTaskDueToday, isTaskOverdue } from './taskListUtils';
import type { Task } from '../services/taskService';

const task = (partial: Partial<Task>): Task =>
  ({
    id: 't',
    fieldId: 'f',
    title: 'Work',
    type: 'pruning',
    status: 'pending',
    priority: 'Medium',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...partial,
  }) as Task;

describe('overdue and today task counts', () => {
  const now = new Date(2026, 2, 10, 12, 0, 0);

  it('counts overdue, today, and upcoming consistently', () => {
    const tasks = [
      task({ id: '1', scheduledEnd: '2026-03-08', status: 'pending' }),
      task({ id: '2', scheduledEnd: '2026-03-10', status: 'pending' }),
      task({ id: '3', scheduledStart: '2026-03-10T08:00:00', scheduledEnd: '2026-03-12', status: 'in_progress' }),
      task({ id: '4', scheduledEnd: '2026-03-09', status: 'completed' }),
    ];
    const summary = getTaskSummary(tasks, now);
    expect(summary.overdue).toBe(1);
    expect(summary.dueToday).toBe(1);
    expect(isTaskOverdue(tasks[0], now)).toBe(true);
    expect(isTaskDueToday(tasks[1], now)).toBe(true);
    expect(isTaskDueToday(tasks[2], now)).toBe(false);
    expect(isTaskOverdue(tasks[3], now)).toBe(false);
  });
});
