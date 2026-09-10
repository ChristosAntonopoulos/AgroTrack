import { oilYieldPercent, ratioOrNull, summarizeChronologioEntries } from './groveTotals';
import type { ChronologioEntry } from '../services/chronologioService';

const entry = (partial: Partial<ChronologioEntry> & { category: ChronologioEntry['category'] }): ChronologioEntry =>
  ({
    id: partial.id || 'e',
    fieldId: 'f1',
    field: { id: 'f1', name: 'Grove' },
    occurredAt: '2026-01-01',
    eventType: 'x',
    title: 't',
    sourceType: 'Task',
    sourceId: 's',
    isSystemGenerated: false,
    importance: 'normal',
    media: [],
    details: {},
    ...partial,
  }) as ChronologioEntry;

describe('shared financial totals', () => {
  it('does not add task amounts on top of ledger expenses', () => {
    const totals = summarizeChronologioEntries([
      entry({
        id: 'exp',
        category: 'expense',
        amount: { value: 2910, currency: 'EUR' },
        details: { expense: { expenseId: 'fe1', expenseCategory: 'labor', linkedTaskId: 't1' } },
      }),
      entry({
        id: 'task',
        category: 'task',
        sourceId: 't1',
        amount: { value: 2910, currency: 'EUR' },
        details: { task: { taskId: 't1', status: 'completed' } },
      }),
    ]);
    expect(totals.recordedExpenses).toBe(2910);
    expect(totals.estimatedTaskCosts).toBe(0);
    expect(totals.completedTasks).toBe(1);
  });

  it('keeps unlinked task costs as estimates', () => {
    const totals = summarizeChronologioEntries([
      entry({
        id: 'task',
        category: 'task',
        sourceId: 't2',
        amount: { value: 80, currency: 'EUR' },
        details: { task: { taskId: 't2', status: 'completed' } },
      }),
    ]);
    expect(totals.recordedExpenses).toBe(0);
    expect(totals.estimatedTaskCosts).toBe(80);
  });
});

describe('oil yield', () => {
  it('uses total oil divided by total olives', () => {
    expect(oilYieldPercent(1000, 185)).toBeCloseTo(18.5, 5);
  });

  it('returns null for zero or missing production', () => {
    expect(oilYieldPercent(0, 10)).toBeNull();
    expect(oilYieldPercent(100, Number.NaN)).toBeNull();
    expect(ratioOrNull(10, 0)).toBeNull();
    expect(ratioOrNull(Number.POSITIVE_INFINITY, 5)).toBeNull();
  });
});
