import { formatSeasonLabel, getSeasonBounds, getSeasonStartYear, isDateInSeason } from './harvestSeason';
import { agriculturalYearFor, agriculturalYearSlashLabel } from '../chronologio/agriculturalYear';
import { harvestYearSpan } from '../finance/harvestYear';
import { athensCalendarYear, parseBusinessDate } from './athensDate';

describe('QA_006 crop season', () => {
  it('starts in February and ends in January (matches AgriculturalYear)', () => {
    expect(getSeasonStartYear(new Date(2026, 1, 1, 12))).toBe(2026);
    expect(getSeasonStartYear(new Date(2026, 0, 31, 12))).toBe(2025);
    expect(getSeasonStartYear(new Date(2026, 8, 1, 12))).toBe(2026);
    expect(getSeasonStartYear(new Date(2026, 0, 15, 12))).toBe(2025);
    const bounds = getSeasonBounds(2025);
    expect(isDateInSeason(new Date(2025, 10, 2, 12), bounds)).toBe(true);
    expect(isDateInSeason(new Date(2026, 0, 20, 12), bounds)).toBe(true);
    expect(isDateInSeason(new Date(2026, 1, 3, 12), bounds)).toBe(false);
  });

  it('QA_005 uses one label helper across Harvest, My Oil and Money', () => {
    expect(formatSeasonLabel(2025)).toBe('2025/26');
    expect(formatSeasonLabel(2025)).toBe(harvestYearSpan(2025));
    expect(formatSeasonLabel(2025)).toBe(agriculturalYearSlashLabel(2025));
    expect(getSeasonStartYear(new Date(2026, 5, 1, 12))).toBe(agriculturalYearFor(new Date(2026, 5, 1, 12)));
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
