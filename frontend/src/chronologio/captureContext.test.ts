import {
  preferredCaptureTypeFromCategory,
  resolveChronologioCaptureDate,
} from './captureContext';

describe('preferredCaptureTypeFromCategory', () => {
  it('maps primary filter keys to capture types', () => {
    // Work splits into schedule vs record — chooser, not a single preferred type.
    expect(preferredCaptureTypeFromCategory('work')).toBeUndefined();
    expect(preferredCaptureTypeFromCategory('observation')).toBe('observation');
    expect(preferredCaptureTypeFromCategory('money')).toBe('money');
    expect(preferredCaptureTypeFromCategory('harvest')).toBeUndefined();
  });

  it('maps legacy API category aliases', () => {
    expect(preferredCaptureTypeFromCategory('task')).toBeUndefined();
    expect(preferredCaptureTypeFromCategory('note')).toBe('observation');
    expect(preferredCaptureTypeFromCategory('photo')).toBe('observation');
    expect(preferredCaptureTypeFromCategory('expense')).toBe('money');
  });

  it('returns undefined for non-capturable filters', () => {
    expect(preferredCaptureTypeFromCategory('weather')).toBeUndefined();
    expect(preferredCaptureTypeFromCategory('all')).toBeUndefined();
    expect(preferredCaptureTypeFromCategory('harvest')).toBeUndefined();
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

  it('keeps the exact day when Days is showing an older date', () => {
    const result = resolveChronologioCaptureDate({
      zoom: 'month',
      focusDate: '2025-08-10',
      now,
    });
    expect(result.dateDefaultedToToday).toBe(false);
    expect(result.dateNeedsChoice).toBe(false);
    expect(result.focusDayKey).toBe('2025-08-10');
  });

  it('uses today on the current month without calling it an older period', () => {
    const result = resolveChronologioCaptureDate({
      zoom: 'year',
      focusDate: '2026-09-21',
      now,
      language: 'el',
    });
    expect(result.dateDefaultedToToday).toBe(false);
    expect(result.dateNeedsChoice).toBe(false);
    expect(result.focusDayKey).toBe('2026-09-21');
    expect(result.periodLabel).toBe('Σεπτέμβριος 2026');
  });

  it('asks for a date inside a past month or past agricultural year', () => {
    const pastMonth = resolveChronologioCaptureDate({
      zoom: 'year',
      focusDate: '2026-03-15',
      now,
      language: 'el',
    });
    expect(pastMonth.dateNeedsChoice).toBe(true);
    expect(pastMonth.dateDefaultedToToday).toBe(false);
    expect(pastMonth.focusDayKey.startsWith('2026-03')).toBe(true);

    const pastYear = resolveChronologioCaptureDate({
      zoom: 'years',
      focusDate: '2024-06-15',
      now,
    });
    expect(pastYear.dateNeedsChoice).toBe(true);
    expect(pastYear.periodLabel).toBe('2024');
  });
});
