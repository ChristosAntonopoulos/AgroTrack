import type { ChronologioEntry } from '../services/chronologioService';
import {
  chronologioEntryCapabilities,
  chronologioHarvestId,
  chronologioMobileDestination,
  chronologioWebDestination,
} from './entryDestination';

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
    actor: { userId: 'u1', displayName: 'Μαρία' },
  }) as ChronologioEntry;

describe('chronologioWebDestination', () => {
  it('routes money with tx (not entry)', () => {
    const dest = chronologioWebDestination({
      ...base(),
      category: 'expense',
      sourceType: 'Expense',
      sourceId: 'tx-9',
      details: { expense: { expenseId: 'tx-9' } },
    });
    expect(dest).toEqual({ kind: 'path', path: '/money?fieldId=f1&tx=tx-9' });
  });

  it('routes photo with photoId', () => {
    const dest = chronologioWebDestination({
      ...base(),
      category: 'photo',
      sourceType: 'Photo',
      sourceId: 'p1',
      details: {},
    });
    expect(dest).toEqual({
      kind: 'path',
      path: '/photos?fieldId=f1&photoId=p1',
    });
  });

  it('routes note to in-place edit', () => {
    const dest = chronologioWebDestination({
      ...base(),
      category: 'note',
      sourceType: 'Note',
      sourceId: 'n1',
      details: { note: { noteId: 'n1', bodyPreview: 'Δάκος', pinned: false } },
    });
    expect(dest).toEqual({ kind: 'noteEdit', noteId: 'n1', fieldId: 'f1' });
  });

  it('routes harvest with harvestId', () => {
    const dest = chronologioWebDestination({
      ...base(),
      category: 'harvest',
      sourceType: 'Harvest',
      sourceId: 'h1',
      details: { harvest: { harvestId: 'h1', oliveKg: 100, workers: 2 } },
    });
    expect(dest).toEqual({ kind: 'path', path: '/harvest?fieldId=f1&harvestId=h1' });
  });

  it('routes merged harvest day without voidable id', () => {
    const entry = {
      ...base(),
      id: 'Harvest:day:2025-11-12',
      category: 'harvest' as const,
      sourceType: 'Harvest',
      sourceId: 'h1',
      details: { harvest: { harvestId: 'h1', oliveKg: 200, workers: 4 } },
    };
    expect(chronologioHarvestId(entry)).toBeNull();
    expect(chronologioWebDestination(entry)).toEqual({
      kind: 'path',
      path: '/harvest?fieldId=f1&day=2025-11-12',
    });
  });
});

describe('chronologioMobileDestination', () => {
  it('routes harvest to HarvestCampaign not FieldDetail', () => {
    expect(
      chronologioMobileDestination({
        ...base(),
        category: 'harvest',
        sourceType: 'Harvest',
        sourceId: 'h1',
        details: { harvest: { harvestId: 'h1', oliveKg: 10, workers: 1 } },
      })
    ).toEqual({ kind: 'HarvestCampaign', fieldId: 'f1', harvestId: 'h1', day: undefined });
  });

  it('routes money with tx', () => {
    expect(
      chronologioMobileDestination({
        ...base(),
        category: 'income',
        sourceType: 'Income',
        sourceId: 'tx-2',
        details: { expense: { expenseId: 'tx-2' } },
      })
    ).toEqual({ kind: 'Money', fieldId: 'f1', tx: 'tx-2' });
  });
});

describe('chronologioEntryCapabilities', () => {
  it('hides mutate on system rows', () => {
    expect(
      chronologioEntryCapabilities({
        ...base(),
        isSystemGenerated: true,
        category: 'weather',
        sourceType: 'WeatherReview',
        eventType: 'weather.monthReview',
        details: { weather: { year: 2026, month: 9 } },
      })
    ).toEqual({ canEdit: false, removeAction: null });
  });

  it('allows own note edit/delete only', () => {
    const note = {
      ...base(),
      category: 'note' as const,
      sourceType: 'Note',
      sourceId: 'n1',
      details: { note: { noteId: 'n1', bodyPreview: 'x', pinned: false } },
    };
    expect(chronologioEntryCapabilities(note, { userId: 'u1' })).toEqual({
      canEdit: true,
      removeAction: 'delete',
    });
    expect(chronologioEntryCapabilities(note, { userId: 'other' })).toEqual({
      canEdit: false,
      removeAction: null,
    });
  });

  it('hides edit and void on merged harvest days', () => {
    expect(
      chronologioEntryCapabilities(
        {
          ...base(),
          id: 'Harvest:day:2025-11-12',
          category: 'harvest',
          sourceType: 'Harvest',
          sourceId: 'h1',
          details: { harvest: { harvestId: 'h1', oliveKg: 1, workers: 1 } },
        },
        { userId: 'u1', role: 'FieldOwner' }
      )
    ).toEqual({ canEdit: false, removeAction: null });
  });
});
