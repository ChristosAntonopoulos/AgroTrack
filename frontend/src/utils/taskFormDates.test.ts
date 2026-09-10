import {
  addDaysToIso,
  athensTodayIso,
  formatLongTaskDate,
  toEndIso,
  toStartIso,
  weekSundayIso,
} from './taskFormDates';

describe('task form dates', () => {
  it('formats a Greek long weekday date', () => {
    expect(formatLongTaskDate('2026-06-10', 'el')).toBe('Τετάρτη 10 Ιουνίου 2026');
    expect(formatLongTaskDate('2026-09-10', 'el')).toBe('Πέμπτη 10 Σεπτεμβρίου 2026');
  });

  it('does not use slash numeric dates', () => {
    expect(formatLongTaskDate('2026-06-10', 'el')).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  it('adds days and finds Sunday of the week', () => {
    expect(addDaysToIso('2026-09-10', 1)).toBe('2026-09-11');
    expect(weekSundayIso('2026-09-10')).toBe('2026-09-13');
  });

  it('converts a single day to start ISO without requiring an end', () => {
    expect(toStartIso('2026-09-10')).toBe('2026-09-10T00:00:00.000Z');
    expect(toEndIso('')).toBeUndefined();
  });

  it('reads today from the Athens calendar', () => {
    expect(athensTodayIso(new Date('2026-09-10T10:00:00+03:00'))).toBe('2026-09-10');
  });
});
