import { annualSavingsPercent, pickDefaultPackage } from './packageSelection';
import type { BillingPackage } from './types';

const pkg = (id: string, period: BillingPackage['period'], amount: number): BillingPackage => ({
  id,
  period,
  amount,
  currency: 'EUR',
  formattedPrice: `${amount}`,
  title: id,
});

describe('packageSelection', () => {
  it('defaults to annual when it is cheaper than twelve months', () => {
    const packages = [pkg('m', 'monthly', 4), pkg('a', 'annual', 36)];
    expect(annualSavingsPercent(packages)).toBe(25);
    expect(pickDefaultPackage(packages)?.id).toBe('a');
  });

  it('defaults to monthly when annual is not better value', () => {
    const packages = [pkg('m', 'monthly', 3), pkg('a', 'annual', 36)];
    expect(annualSavingsPercent(packages)).toBeNull();
    expect(pickDefaultPackage(packages)?.id).toBe('m');
  });

  it('uses the only available package', () => {
    expect(pickDefaultPackage([pkg('m', 'monthly', 4)])?.id).toBe('m');
    expect(pickDefaultPackage([])).toBeNull();
  });
});
