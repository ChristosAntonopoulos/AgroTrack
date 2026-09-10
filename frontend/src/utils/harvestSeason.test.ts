import { formatSeasonLabel, getSeasonBounds, getSeasonStartYear, isDateInSeason } from './harvestSeason';
import { athensCalendarYear, parseBusinessDate } from './athensDate';

describe('cultivation season', () => {
  it('starts in September and ends in August', () => {
    expect(getSeasonStartYear(new Date(2026, 8, 1))).toBe(2026);
    expect(getSeasonStartYear(new Date(2026, 7, 31))).toBe(2025);
    expect(getSeasonStartYear(new Date(2026, 0, 15))).toBe(2025);
    const bounds = getSeasonBounds(2025);
    expect(isDateInSeason(new Date(2025, 10, 2), bounds)).toBe(true);
    expect(isDateInSeason(new Date(2026, 8, 1), bounds)).toBe(false);
    expect(formatSeasonLabel(2025)).toBe('2025/2026');
  });
});

describe('date-only parsing', () => {
  it('does not shift a date-only value by one day', () => {
    const d = parseBusinessDate('2024-11-02');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(2);
    expect(athensCalendarYear('2024-11-02')).toBe(2024);
  });
});
