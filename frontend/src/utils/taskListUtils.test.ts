import { getTaskSummary, isTaskDueToday, isTaskOverdue } from './taskListUtils';
import type { FieldTask } from '../services/fieldWorkService';

const task = (partial: Partial<FieldTask>): FieldTask =>
  ({
    id: 't',
    fieldId: 'f',
    title: 'Work',
    templateCode: 'pruning',
    status: 'planned',
    statusLabel: 'planned',
    resultYear: 2026,
    additionalParticipantUserIds: [],
    assignmentResponse: 'pending',
    checklist: [],
    attachmentIds: [],
    weatherSuitability: 'unknown',
    weatherSuitabilityLabel: '',
    createdByUserId: 'u',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...partial,
  }) as FieldTask;

describe('overdue and today task counts', () => {
  const now = new Date(2026, 2, 10, 12, 0, 0);

  it('counts overdue, today, and upcoming consistently', () => {
    const tasks = [
      task({ id: '1', plannedEnd: '2026-03-08', status: 'planned' }),
      task({ id: '2', plannedEnd: '2026-03-10', status: 'planned' }),
      task({ id: '3', plannedStart: '2026-03-10T08:00:00', plannedEnd: '2026-03-12', status: 'in_progress' }),
      task({ id: '4', plannedEnd: '2026-03-09', status: 'completed' }),
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
