import { formatChronologioMoney } from '../utils/chronologioGrouping';

export function formatOfficialAmount(
  amount: number | null | undefined,
  currency: string,
  locale: string,
  unknownLabel: string
): string {
  if (amount == null) return unknownLabel;
  return formatChronologioMoney(amount, currency, locale);
}

export function formatOfficialNet(
  amount: number | null | undefined,
  currency: string,
  locale: string,
  unknownLabel: string
): string {
  if (amount == null) return unknownLabel;
  const formatted = formatChronologioMoney(Math.abs(amount), currency, locale);
  if (amount > 0) return `+ ${formatted}`;
  if (amount < 0) return `− ${formatted}`;
  return formatted;
}

export function formatLitres(
  litres: number | null | undefined,
  locale: string,
  unknownLabel: string
): string {
  if (litres == null) return unknownLabel;
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(litres)} L`;
}

export function formatEuroPerLitre(
  value: number | null | undefined,
  locale: string,
  unknownLabel: string
): string {
  if (value == null) return unknownLabel;
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value)} €/L`;
}

export function isForbiddenError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 403
  );
}
