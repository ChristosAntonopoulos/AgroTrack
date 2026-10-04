import { farmerSeasonFor } from './farmerSeason';

describe('farmerSeasonFor', () => {
  it('maps months to the six farmer-facing stages', () => {
    expect(farmerSeasonFor(new Date('2026-02-10T12:00:00+02:00')).id).toBe('afterHarvest');
    expect(farmerSeasonFor(new Date('2026-01-10T12:00:00+02:00')).id).toBe('winterCare');
    expect(farmerSeasonFor(new Date('2026-04-15T12:00:00+03:00')).id).toBe('springGrowth');
    expect(farmerSeasonFor(new Date('2026-07-01T12:00:00+03:00')).id).toBe('summerProtection');
    expect(farmerSeasonFor(new Date('2026-09-10T12:00:00+03:00')).id).toBe('harvestPrep');
    expect(farmerSeasonFor(new Date('2026-11-05T12:00:00+02:00')).id).toBe('harvest');
  });
});
