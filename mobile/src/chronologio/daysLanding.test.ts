import { daysLandingMonth } from './daysLanding';

describe('daysLandingMonth', () => {
  const now = { year: 2026, month: 9 };

  it('keeps the current month when Days is already in that year', () => {
    expect(daysLandingMonth(2024, { year: 2024, month: 3 }, now)).toBeNull();
  });

  it('does not jump to today when opening Days from a past year', () => {
    expect(daysLandingMonth(2022, { year: 2026, month: 9 }, now)).toEqual({
      year: 2022,
      month: 9,
    });
  });

  it('lands on the live month only when that year is the current year', () => {
    expect(daysLandingMonth(2026, { year: 2024, month: 11 }, now)).toEqual({
      year: 2026,
      month: 9,
    });
  });
});
