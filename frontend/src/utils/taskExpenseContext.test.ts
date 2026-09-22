import { taskExpenseCaptureContext } from './taskExpenseContext';

test('prefills a pruning expense from the task', () => {
  expect(
    taskExpenseCaptureContext({
      id: 'task-1',
      fieldId: 'field-1',
      title: 'Κλάδεμα',
      templateCode: 'T06',
      plannedStart: '2026-09-22T08:00:00',
    })
  ).toEqual({
    preferredType: 'expense',
    fieldId: 'field-1',
    taskId: 'task-1',
    occurredAt: '2026-09-22T08:00:00',
    description: 'Κλάδεμα',
    category: 'labor',
  });
});

test('uses the day the work started and leaves custom jobs without a category', () => {
  expect(
    taskExpenseCaptureContext({
      id: 'task-2',
      fieldId: 'field-2',
      title: '  Μερεμέτι  ',
      plannedStart: '2026-09-20T08:00:00',
      startedAt: '2026-09-22T09:00:00',
    })
  ).toMatchObject({
    occurredAt: '2026-09-22T09:00:00',
    description: 'Μερεμέτι',
    category: undefined,
  });
});
