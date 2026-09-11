import { eventAccentToken, eventCardSpan, isFeaturedChronologioCard } from './eventCardLayout';
import type { ChronologioEntry } from '../services/chronologioService';

const entry = (partial: Partial<ChronologioEntry>): ChronologioEntry =>
  ({
    id: 'e1',
    occurredAt: '2026-09-10T10:00:00Z',
    category: 'note',
    importance: 'normal',
    eventType: 'note.created',
    sourceType: 'Note',
    sourceId: 'n1',
    fieldId: 'f1',
    details: {},
    media: [],
    ...partial,
  }) as ChronologioEntry;

describe('eventCardLayout', () => {
  it('maps categories onto the editorial accent tokens', () => {
    expect(eventAccentToken('task')).toBe('work');
    expect(eventAccentToken('note')).toBe('observation');
    expect(eventAccentToken('income')).toBe('income');
    expect(eventAccentToken('expense', 'warning')).toBe('warning');
  });

  it('spans harvest results and warnings across both columns', () => {
    expect(eventCardSpan(entry({ category: 'expense' }))).toBe(1);
    expect(
      eventCardSpan(
        entry({
          category: 'harvest',
          details: { harvest: { harvestId: 'h1', oliveKg: 120, oilKg: 20, workers: 0 } },
        })
      )
    ).toBe(2);
    expect(isFeaturedChronologioCard(entry({ importance: 'critical' }))).toBe(true);
  });
});
