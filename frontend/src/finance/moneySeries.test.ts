import { allocateCents, monthlyDatesInHarvestYear, planMoneySeries } from './moneySeries';

describe('moneySeries', () => {
  it('splits cents so the parts add back to the total', () => {
    expect(allocateCents(10, [1, 1, 1])).toEqual([3.34, 3.33, 3.33]);
    expect(allocateCents(100, [1, 3]).reduce((sum, value) => sum + value, 0)).toBe(100);
    expect(allocateCents(100, [1, 3])).toEqual([25, 75]);
  });

  it('repeats monthly only inside the harvest year', () => {
    expect(monthlyDatesInHarvestYear('2026-11-15', 2026)).toEqual([
      '2026-11-15',
      '2026-12-15',
      '2027-01-15',
    ]);
    expect(monthlyDatesInHarvestYear('2026-03-31', 2026)).toContain('2026-04-30');
    expect(monthlyDatesInHarvestYear('2026-03-31', 2026).at(-1)).toBe('2027-01-31');
  });

  it('plans an equal split across fields and months', () => {
    const plan = planMoneySeries({
      amount: 90,
      occurredOn: '2026-12-01',
      resultYear: 2026,
      fieldIds: ['a', 'b'],
      areaHectares: { a: 1, b: null },
      splitMode: 'equal',
      repeat: 'monthly',
    });
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.entries).toHaveLength(4);
    expect(plan.entries.map((entry) => entry.amount)).toEqual([45, 45, 45, 45]);
    expect(plan.entries.map((entry) => entry.fieldId)).toEqual(['a', 'b', 'a', 'b']);
  });

  it('refuses a by-area split when fewer than two fields have area', () => {
    const plan = planMoneySeries({
      amount: 40,
      occurredOn: '2026-05-01',
      resultYear: 2026,
      fieldIds: ['a', 'b'],
      areaHectares: { a: 2, b: null },
      splitMode: 'area',
      repeat: 'once',
    });
    expect(plan).toEqual({ ok: false, reason: 'missing-area' });
  });
});
