import type { ChronologioMonthSummary, ChronologioPeriodSummary } from '../services/chronologioService';
import { harvestYearCopyKey, yearComparison, yearHeadline } from './yearPresentation';

const year = (overrides: Partial<ChronologioPeriodSummary> = {}): ChronologioPeriodSummary => ({
  key: '2025',
  periodYear: 2025,
  axis: 'agricultural',
  from: '',
  to: '',
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

const month = (overrides: Partial<ChronologioMonthSummary> = {}): ChronologioMonthSummary => ({
  key: '2025-02',
  year: 2025,
  month: 2,
  from: '',
  to: '',
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

describe('yearPresentation compare', () => {
  it('never reports a zero harvest as a result', () => {
    expect(harvestYearCopyKey(year())).toBe('notStarted');
    expect(harvestYearCopyKey(year({ harvestCount: 2 }))).toBe('noResult');
    expect(harvestYearCopyKey(year({ oliveKg: 2380 }))).toBe('result');
  });

  it('compares oil only when both years have a recorded result', () => {
    expect(
      yearComparison(
        year({ periodYear: 2025, oliveKg: 4760, oilKg: 825 }),
        year({ periodYear: 2024, oliveKg: 4000, oilKg: 736 })
      )
    ).toEqual({ kind: 'oil', percent: 12, previousYear: 2024, scope: 'full' });
    expect(yearComparison(year({ periodYear: 2025, oilKg: 825 }), year({ periodYear: 2024 }))).toBeNull();
    expect(yearHeadline(year({ highlightTitles: ['Observation', 'Πρώιμη συγκομιδή'] }))).toBe(
      'Πρώιμη συγκομιδή'
    );
  });

  it('compares a live year to the same calendar span of the previous year', () => {
    const now = new Date('2026-09-21T12:00:00+03:00');
    const previousMonths = [
      month({ year: 2025, month: 2, expenseTotal: 100 }),
      month({ year: 2025, month: 6, expenseTotal: 200 }),
      month({ year: 2025, month: 9, expenseTotal: 50 }),
      month({ year: 2025, month: 11, expenseTotal: 400 }),
    ];
    expect(
      yearComparison(
        year({ periodYear: 2026, expenseTotal: 300 }),
        year({ periodYear: 2025, expenseTotal: 750 }),
        { now }
      )
    ).toBeNull();

    expect(
      yearComparison(
        year({ periodYear: 2026, expenseTotal: 300 }),
        year({ periodYear: 2025, expenseTotal: 750 }),
        { now, previousMonths }
      )
    ).toEqual({ kind: 'expenses', percent: -14, previousYear: 2025, scope: 'ytd' });

    const ytdOil = yearComparison(
      year({ periodYear: 2026, oliveKg: 2000, oilKg: 400 }),
      year({ periodYear: 2025, oliveKg: 5000, oilKg: 900 }),
      {
        now,
        currentMonths: [month({ year: 2026, month: 8, oliveKg: 2000, oilKg: 400 })],
        previousMonths: [
          month({ year: 2025, month: 8, oliveKg: 1500, oilKg: 300 }),
          month({ year: 2025, month: 11, oliveKg: 3500, oilKg: 600 }),
        ],
      }
    );
    expect(ytdOil).toEqual({ kind: 'oil', percent: 33, previousYear: 2025, scope: 'ytd' });
  });
});
