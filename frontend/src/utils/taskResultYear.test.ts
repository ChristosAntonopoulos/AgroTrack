import { crossesHarvestYear, deriveResultYear, resultYearChoices } from './taskResultYear';

describe('task result year', () => {
  it('derives the agricultural year of the planned day', () => {
    expect(deriveResultYear('2026-09-10')).toBe(2026);
    expect(deriveResultYear('2027-01-05')).toBe(2026);
    expect(deriveResultYear('2027-02-01')).toBe(2027);
    expect(deriveResultYear(undefined, new Date('2026-09-10T12:00:00Z'))).toBe(2026);
  });

  it('offers a previous-harvest override only in January and February', () => {
    expect(crossesHarvestYear('2026-09-10')).toBe(false);
    expect(crossesHarvestYear('2027-01-05')).toBe(true);
    expect(resultYearChoices('2026-09-10')).toEqual([2026]);
    expect(resultYearChoices('2027-01-05')).toEqual([2026, 2027]);
  });
});
