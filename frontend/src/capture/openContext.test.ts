import {
  buildCaptureOpenContext,
  dayKeyFromOccurredAt,
  sourcePageFromPath,
} from './openContext';

describe('sourcePageFromPath', () => {
  it('maps known routes', () => {
    expect(sourcePageFromPath('/harvest')).toBe('harvest');
    expect(sourcePageFromPath('/my-oil')).toBe('warehouse');
    expect(sourcePageFromPath('/money')).toBe('money');
    expect(sourcePageFromPath('/tasks')).toBe('tasks');
    expect(sourcePageFromPath('/photos')).toBe('photos');
    expect(sourcePageFromPath('/fields/abc')).toBe('grove');
    expect(sourcePageFromPath('/chronologio')).toBe('chronologio');
  });
});

describe('dayKeyFromOccurredAt', () => {
  it('returns Athens calendar day', () => {
    expect(dayKeyFromOccurredAt('2026-10-02T15:30:00')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns undefined for empty', () => {
    expect(dayKeyFromOccurredAt(undefined)).toBeUndefined();
  });
});

describe('buildCaptureOpenContext', () => {
  it('merges explicit over page snapshot and route field', () => {
    const ctx = buildCaptureOpenContext({
      pathname: '/fields/route-field',
      page: {
        sourcePage: 'grove',
        fieldId: 'page-field',
        occurredAt: '2026-10-01T10:00:00.000Z',
      },
      explicit: {
        fieldId: 'explicit-field',
        sourcePage: 'tasks',
      },
    });
    expect(ctx.fieldId).toBe('explicit-field');
    expect(ctx.sourcePage).toBe('tasks');
    expect(ctx.occurredAt).toBe('2026-10-01T10:00:00.000Z');
  });

  it('reads harvest day from query when no explicit date', () => {
    const ctx = buildCaptureOpenContext({
      pathname: '/harvest',
      search: 'day=2026-10-02',
    });
    expect(ctx.sourcePage).toBe('harvest');
    expect(ctx.occurredAt).toBeTruthy();
    expect(dayKeyFromOccurredAt(ctx.occurredAt)).toBe('2026-10-02');
  });

  it('uses the current route before a stale page snapshot', () => {
    const ctx = buildCaptureOpenContext({
      pathname: '/fields/grove-1',
      page: { sourcePage: 'warehouse', fieldId: 'cellar-field' },
    });
    expect(ctx.sourcePage).toBe('grove');
    expect(ctx.fieldId).toBe('grove-1');
  });
});
