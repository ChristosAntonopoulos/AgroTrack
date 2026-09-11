import { rankHarvestDay, buildWeekStrip } from './weatherRank';

describe('harvest weather ranks', () => {
  it('uses the harvest rain and wind thresholds', () => {
    expect(rankHarvestDay(0, 10)).toBe('good');
    expect(rankHarvestDay(2, 10)).toBe('caution');
    expect(rankHarvestDay(8, 10)).toBe('unsuitable');
    expect(rankHarvestDay(0, 40)).toBe('caution');
    expect(rankHarvestDay(undefined, undefined)).toBe('unknown');
  });

  it('builds a seven-day strip from 24/48/72h rain', () => {
    const week = buildWeekStrip({ rain24: 0, rain48: 2, rain72: 10, wind24: 12, wind72: 18 });
    expect(week).toHaveLength(7);
    expect(week[0].rank).toBe('good');
    expect(week[1].rank).toBe('caution');
    expect(week[2].rank).toBe('unsuitable');
    expect(week[3].rank).toBe('unknown');
  });
});
