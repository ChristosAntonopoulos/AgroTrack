import {
  preferredCaptureTypeFromCategory,
  resolveChronologioCaptureDate,
} from './captureContext';

describe('preferredCaptureTypeFromCategory', () => {
  it('maps primary filter keys to capture types', () => {
    expect(preferredCaptureTypeFromCategory('work')).toBe('work');
    expect(preferredCaptureTypeFromCategory('observation')).toBe('observation');
    expect(preferredCaptureTypeFromCategory('money')).toBe('money');
    expect(preferredCaptureTypeFromCategory('harvest')).toBe('harvest');
  });

  it('maps legacy API category aliases', () => {
    expect(preferredCaptureTypeFromCategory('task')).toBe('work');
    expect(preferredCaptureTypeFromCategory('note')).toBe('observation');
    expect(preferredCaptureTypeFromCategory('photo')).toBe('observation');
    expect(preferredCaptureTypeFromCategory('expense')).toBe('money');
  });

  it('returns undefined for non-capturable filters', () => {
    expect(preferredCaptureTypeFromCategory('weather')).toBeUndefined();
    expect(preferredCaptureTypeFromCategory('all')).toBeUndefined();
  });
});

describe('resolveChronologioCaptureDate', () => {
  const now = new Date(2026, 8, 21, 15, 30, 0); // 21 Sep 2026 local

  it('uses focused day when viewing Days of the live month', () => {
    const result = resolveChronologioCaptureDate({
      zoom: 'month',
      focusDate: '2026-09-18',
      now,
    });
    expect(result.dateDefaultedToToday).toBe(false);
    expect(result.focusDayKey).toBe('2026-09-18');
    const d = new Date(result.occurredAt);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(18);
  });

  it('defaults to today when viewing an older month in Days', () => {
    const result = resolveChronologioCaptureDate({
      zoom: 'month',
      focusDate: '2025-08-10',
      now,
    });
    expect(result.dateDefaultedToToday).toBe(true);
    expect(result.focusDayKey).toBe('2026-09-21');
  });

  it('defaults to today on Months / Years views', () => {
    expect(
      resolveChronologioCaptureDate({ zoom: 'year', focusDate: '2026-09-21', now })
        .dateDefaultedToToday
    ).toBe(true);
    expect(
      resolveChronologioCaptureDate({ zoom: 'years', focusDate: '2024-06-15', now })
        .dateDefaultedToToday
    ).toBe(true);
  });
});
