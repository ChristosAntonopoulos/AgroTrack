import type { ChronologioPeriodSummary } from '../services/chronologioService';
import {
  agriculturalYearState,
  ensureCurrentAgriculturalYear,
  harvestYearCopyKey,
  monthSeasonStage,
  seasonStageIndex,
  seasonTrackFill,
  yearChapterFacts,
  yearComparison,
  yearHeadline,
} from './yearPresentation';

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

describe('yearPresentation', () => {
  it('marks the live agricultural year as in progress until harvest starts', () => {
    const now = new Date('2026-09-10T12:00:00+03:00');
    expect(agriculturalYearState(2026, year({ periodYear: 2026 }), now)).toBe('inProgress');
    expect(
      agriculturalYearState(2026, year({ periodYear: 2026, harvestCount: 2 }), now)
    ).toBe('harvesting');
    expect(agriculturalYearState(2027, year({ periodYear: 2027 }), now)).toBe('upcoming');
  });

  it('does not treat a past year without a harvest result as closed', () => {
    const now = new Date('2026-09-10T12:00:00+03:00');
    expect(
      agriculturalYearState(2025, year({ harvestCount: 3, oliveKg: 0, oilKg: 0 }), now)
    ).toBe('awaitingClosure');
    expect(agriculturalYearState(2025, year({ oliveKg: 4760, oilKg: 825 }), now)).toBe('closed');
  });

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
    ).toEqual({ kind: 'oil', percent: 12, previousYear: 2024 });
    expect(yearComparison(year({ periodYear: 2025, oilKg: 825 }), year({ periodYear: 2024 }))).toBeNull();
    expect(yearHeadline(year({ highlightTitles: ['Observation', 'Πρώιμη συγκομιδή'] }))).toBe(
      'Πρώιμη συγκομιδή'
    );
  });

  it('keeps a current-year card even when the API has no row yet', () => {
    const rows = ensureCurrentAgriculturalYear([], new Date('2026-09-10T12:00:00+03:00'));
    expect(rows[0].periodYear).toBe(2026);
    expect(seasonStageIndex(new Date('2026-09-10T12:00:00+03:00'))).toBe(2);
    expect(seasonStageIndex(new Date('2026-02-10T12:00:00+02:00'))).toBe(0);
    expect(seasonStageIndex(new Date('2027-01-10T12:00:00+02:00'))).toBe(3);
    expect(seasonTrackFill(2)).toBeCloseTo(0.6375);
    expect(seasonTrackFill(0, true)).toBe(1);
    expect(monthSeasonStage(2)).toBe('afterHarvest');
    expect(monthSeasonStage(5)).toBe('spring');
    expect(monthSeasonStage(8)).toBe('summer');
    expect(monthSeasonStage(10)).toBe('harvest');
  });

  it('shows only facts that actually happened', () => {
    expect(yearChapterFacts(year({ periodYear: 2026, noteCount: 3, expenseTotal: 330.1 }), true)).toEqual([
      { kind: 'notes', count: 3 },
      { kind: 'money', amount: 330.1, currency: 'EUR' },
    ]);
    expect(
      yearChapterFacts(year({ periodYear: 2025, oliveKg: 2380, oilKg: 412.7, expenseTotal: 746, noteCount: 8 }))
    ).toEqual([
      { kind: 'notes', count: 8 },
      { kind: 'money', amount: 746, currency: 'EUR' },
      { kind: 'olives', kg: 2380 },
    ]);
    expect(yearChapterFacts(year({ taskCount: 0, noteCount: 0 }))).toEqual([]);
  });
});
