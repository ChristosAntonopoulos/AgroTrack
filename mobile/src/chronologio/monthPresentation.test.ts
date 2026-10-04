import { entryMatchesMonthFocus, monthFocusApiCategory } from './monthPresentation';
import type { ChronologioEntry } from '../services/chronologioService';

const entry = (category: ChronologioEntry['category']): ChronologioEntry =>
  ({
    id: category,
    fieldId: 'f1',
    field: { id: 'f1', name: 'Grove' },
    occurredAt: '2026-09-01T08:00:00Z',
    eventType: category,
    title: category,
    sourceType: 'Note',
    sourceId: category,
    isSystemGenerated: false,
    importance: 'normal',
    media: [],
    details: {},
    category,
  }) as ChronologioEntry;

describe('monthPresentation focus', () => {
  it('maps chapter chips to the API category used on web', () => {
    expect(monthFocusApiCategory('work')).toBe('task');
    expect(monthFocusApiCategory('observation')).toBe('note');
    expect(monthFocusApiCategory('harvest')).toBe('harvest');
    expect(monthFocusApiCategory('money')).toBeUndefined();
  });

  it('keeps money and observation peeks on the same event types as web', () => {
    expect(entryMatchesMonthFocus(entry('expense'), 'money')).toBe(true);
    expect(entryMatchesMonthFocus(entry('income'), 'money')).toBe(true);
    expect(entryMatchesMonthFocus(entry('task'), 'money')).toBe(false);
    expect(entryMatchesMonthFocus(entry('note'), 'observation')).toBe(true);
    expect(entryMatchesMonthFocus(entry('photo'), 'observation')).toBe(true);
    expect(entryMatchesMonthFocus(entry('task'), 'work')).toBe(true);
  });
});
