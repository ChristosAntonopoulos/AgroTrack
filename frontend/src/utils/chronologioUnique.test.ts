import type { ChronologioEntry } from '../services/chronologioService';
import { uniqueChronologioEntries } from './chronologioUnique';

const entry = (overrides: Partial<ChronologioEntry>): ChronologioEntry =>
  ({
    id: 'a',
    fieldId: 'f1',
    eventType: 'note.observation',
    occurredAt: '2026-09-08T10:00:00Z',
    title: 'Observation',
    ...overrides,
  }) as ChronologioEntry;

describe('uniqueChronologioEntries', () => {
  it('keeps one row when the same source is repeated', () => {
    const rows = uniqueChronologioEntries([
      entry({ id: '1', sourceId: 'note-8' }),
      entry({ id: '2', sourceId: 'note-8' }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('1');
  });
});
