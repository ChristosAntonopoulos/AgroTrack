import type { ChronologioEntry } from '../services/chronologioService';
import { chronologioDetailKind } from './detailKind';

const base = (): ChronologioEntry =>
  ({
    id: 'e1',
    fieldId: 'f1',
    field: { id: 'f1', name: 'Άλσος' },
    occurredAt: '2026-09-10T08:00:00Z',
    eventType: 'record',
    title: 'Title',
    sourceType: 'Activity',
    sourceId: 's1',
    isSystemGenerated: false,
    importance: 'normal',
    media: [],
    category: 'activity',
    details: {},
  }) as ChronologioEntry;

describe('chronologioDetailKind', () => {
  it('maps source categories to drawer panels', () => {
    expect(
      chronologioDetailKind({
        ...base(),
        category: 'task',
        sourceType: 'Task',
        details: { task: { taskId: 't1', status: 'completed' } },
      })
    ).toBe('task');
    expect(
      chronologioDetailKind({
        ...base(),
        category: 'note',
        sourceType: 'Note',
        details: { note: { noteId: 'n1', bodyPreview: 'Δάκος', pinned: false } },
      })
    ).toBe('observation');
    expect(
      chronologioDetailKind({
        ...base(),
        category: 'expense',
        sourceType: 'Expense',
        details: { expense: { expenseId: 'x1' } },
      })
    ).toBe('money');
    expect(
      chronologioDetailKind({
        ...base(),
        category: 'intelligence',
        details: { intelligence: { message: 'Παγετός', severity: 'warning' } },
      })
    ).toBe('warning');
  });

  it('keeps period weather reviews on the weather panel', () => {
    expect(
      chronologioDetailKind({
        ...base(),
        category: 'weather',
        eventType: 'weather.monthReview',
        sourceType: 'WeatherReview',
        details: { weather: { year: 2026, month: 9 } },
      })
    ).toBe('weatherPeriod');
  });
});
