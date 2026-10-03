import {
  buildCaptureOpenContext,
  dayKeyFromOccurredAt,
  sourcePageFromRoute,
} from './openContext';

describe('sourcePageFromRoute', () => {
  it('maps known routes', () => {
    expect(sourcePageFromRoute('HarvestCampaign')).toBe('harvest');
    expect(sourcePageFromRoute('MyOil')).toBe('warehouse');
    expect(sourcePageFromRoute('Money')).toBe('money');
    expect(sourcePageFromRoute('Tasks')).toBe('tasks');
    expect(sourcePageFromRoute('Photos')).toBe('photos');
    expect(sourcePageFromRoute('FieldDetail')).toBe('grove');
    expect(sourcePageFromRoute('ChronologioTab')).toBe('chronologio');
  });
});

describe('dayKeyFromOccurredAt', () => {
  it('returns Athens calendar day', () => {
    expect(dayKeyFromOccurredAt('2026-10-02T15:30:00')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('buildCaptureOpenContext', () => {
  it('merges explicit over page snapshot and route field', () => {
    const ctx = buildCaptureOpenContext({
      routeName: 'FieldDetail',
      params: { fieldId: 'route-field' },
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

  it('reads harvest day from params when no explicit date', () => {
    const ctx = buildCaptureOpenContext({
      routeName: 'HarvestCampaign',
      params: { day: '2026-10-02' },
    });
    expect(ctx.sourcePage).toBe('harvest');
    expect(dayKeyFromOccurredAt(ctx.occurredAt)).toBe('2026-10-02');
  });
});
