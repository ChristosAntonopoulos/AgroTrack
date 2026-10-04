import { harvestMonthTitle, harvestYearSpan, harvestYearStatus, orderHarvestYearMonths } from './harvestYear';

describe('harvest year', () => {
  it('labels a ResultYear as a span that crosses the calendar', () => {
    expect(harvestYearSpan(2026)).toBe('2026/27');
    expect(harvestYearSpan(1999)).toBe('1999/00');
  });

  it('orders months from February through the following January', () => {
    const ordered = orderHarvestYearMonths(2026, [
      { month: 1, label: 'closing' },
      { month: 2, label: 'opening' },
      { month: 9, label: 'summer' },
    ]);
    expect(ordered[0]).toMatchObject({ calendarYear: 2026, month: 2, stage: 'afterHarvest', row: { label: 'opening' } });
    expect(ordered.find((item) => item.month === 9)?.stage).toBe('summer');
    expect(ordered[ordered.length - 1]).toMatchObject({
      calendarYear: 2027,
      month: 1,
      stage: 'harvest',
      row: { label: 'closing' },
    });
    expect(ordered).toHaveLength(12);
  });

  it('names January with the following calendar year', () => {
    expect(harvestMonthTitle(2026, 1, 'en')).toMatch(/January 2027/);
    expect(harvestMonthTitle(2026, 9, 'en')).toMatch(/September 2026/);
  });

  it('treats the live ResultYear as the current harvest year', () => {
    expect(harvestYearStatus(2026, new Date('2026-09-22T12:00:00Z'))).toBe('current');
    expect(harvestYearStatus(2025, new Date('2026-09-22T12:00:00Z'))).toBe('closed');
    expect(harvestYearStatus(2027, new Date('2026-09-22T12:00:00Z'))).toBe('upcoming');
  });
});
