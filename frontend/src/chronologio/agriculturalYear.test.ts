import {
  agriculturalYearFor,
  agriculturalYearMonths,
  agriculturalYearRangeLabel,
  agriculturalYearTitle,
} from './agriculturalYear';

describe('agriculturalYear', () => {
  it('keeps January inside the previous ResultYear', () => {
    expect(agriculturalYearFor('2026-02-01')).toBe(2026);
    expect(agriculturalYearFor('2026-09-10')).toBe(2026);
    expect(agriculturalYearFor('2027-01-15')).toBe(2026);
    expect(agriculturalYearFor('2027-02-01')).toBe(2027);
  });

  it('lists February through January', () => {
    const months = agriculturalYearMonths(2026);
    expect(months[0]).toEqual({ year: 2026, month: 2 });
    expect(months[months.length - 1]).toEqual({ year: 2027, month: 1 });
  });

  it('uses Greek labels by default', () => {
    expect(agriculturalYearTitle(2026)).toBe('Καλλιεργητική χρονιά 2026');
    expect(agriculturalYearRangeLabel(2026)).toMatch(/Φεβ/);
    expect(agriculturalYearRangeLabel(2026)).toMatch(/Ιαν/);
  });
});
