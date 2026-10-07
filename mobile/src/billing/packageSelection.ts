import type { BillingPackage } from './types';

export const findPackage = (packages: BillingPackage[], period: 'monthly' | 'annual') =>
  packages.find((p) => p.period === period) ?? null;

/** Whole-percent saving of paying yearly vs. twelve months. Null when not a real saving. */
export const annualSavingsPercent = (packages: BillingPackage[]): number | null => {
  const monthly = findPackage(packages, 'monthly');
  const annual = findPackage(packages, 'annual');
  if (!monthly || !annual || monthly.amount <= 0 || monthly.currency !== annual.currency) return null;
  const yearOfMonths = monthly.amount * 12;
  if (annual.amount >= yearOfMonths) return null;
  const percent = Math.round((1 - annual.amount / yearOfMonths) * 100);
  return percent >= 1 ? percent : null;
};

/** Annual is the default only when it is genuinely better value; otherwise monthly. */
export const pickDefaultPackage = (packages: BillingPackage[]): BillingPackage | null => {
  const monthly = findPackage(packages, 'monthly');
  const annual = findPackage(packages, 'annual');
  if (annual && monthly) return annualSavingsPercent(packages) != null ? annual : monthly;
  return annual ?? monthly ?? packages[0] ?? null;
};

/** Localised "per month" equivalent of the annual plan, derived from store data. */
export const annualPerMonthLabel = (packages: BillingPackage[], locale: string): string | null => {
  const annual = findPackage(packages, 'annual');
  if (!annual || annual.amount <= 0) return null;
  if (annual.perMonthFormatted) return annual.perMonthFormatted;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: annual.currency }).format(
      annual.amount / 12
    );
  } catch {
    return null;
  }
};
