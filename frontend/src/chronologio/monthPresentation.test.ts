import type { ChronologioMonthSummary } from '../services/chronologioService';
import {
  buildMonthWeatherView,
  harvestHasResult,
  isMeaningfulHighlight,
  monthCardLayout,
  monthsForOverview,
  percentChange,
} from './monthPresentation';

const month = (overrides: Partial<ChronologioMonthSummary> = {}): ChronologioMonthSummary => ({
  key: '2026-09',
  year: 2026,
  month: 9,
  from: '2026-09-01',
  to: '2026-09-30',
  taskCount: 0,
  expenseCount: 0,
  harvestCount: 0,
  noteCount: 0,
  expenseTotal: 0,
  currency: 'EUR',
  oliveKg: 0,
  oilKg: 0,
  highlightTitles: [],
  ...overrides,
});

describe('monthPresentation', () => {
  it('never treats an unstarted harvest as a harvest layout or a zero result', () => {
    const idle = month();
    expect(harvestHasResult(idle)).toBe(false);
    expect(monthCardLayout(idle)).toBe('standard');
    expect(harvestHasResult(month({ harvestCount: 2 }))).toBe(false);
    expect(harvestHasResult(month({ oliveKg: 1435 }))).toBe(true);
    expect(monthCardLayout(month({ oliveKg: 1435 }))).toBe('harvest');
  });

  it('marks weather missing instead of zero when there is no reading', () => {
    expect(buildMonthWeatherView(month()).kind).toBe('missing');
    expect(buildMonthWeatherView(month({ rainfallMm: 0 })).kind).toBe('ready');
  });

  it('uses coverage from the review and does not invent a change percent', () => {
    expect(
      buildMonthWeatherView(month(), {
        daysWithRainData: 9,
        expectedDays: 30,
        rainfallMm: 12,
      }).kind
    ).toBe('insufficient');
    expect(percentChange(20, 10)).toBe(100);
    expect(percentChange(20, 0)).toBeNull();
    expect(percentChange(20, null)).toBeNull();
  });

  it('keeps January with the previous agricultural year', () => {
    const rows = [month({ year: 2026, month: 1 }), month({ year: 2026, month: 2 })];
    const agri2026 = monthsForOverview(rows, 2026, 'agricultural', { year: 2026, month: 9 });
    expect(agri2026.map((m) => `${m.year}-${m.month}`)).toEqual([
      '2026-9',
      '2026-8',
      '2026-7',
      '2026-6',
      '2026-5',
      '2026-4',
      '2026-3',
      '2026-2',
    ]);
    expect(agri2026.some((m) => m.month === 1 && m.year === 2026)).toBe(false);
    expect(isMeaningfulHighlight('Observation')).toBe(false);
    expect(isMeaningfulHighlight('Κλάδεμα Φιλιατρών')).toBe(true);
  });
});
