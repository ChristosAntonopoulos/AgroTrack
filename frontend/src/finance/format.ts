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

/** Litres only — never pass oilKg. Use formatGroveMassKg / formatGroveMassKgLabel for oil kg. */
export function formatLitres(
  litres: number | null | undefined,
  locale: string,
  unknownLabel: string
): string {
  if (litres == null || !Number.isFinite(litres)) return unknownLabel;
  const rounded = Math.round(litres * 1000) / 1000;
  return `${new Intl.NumberFormat(locale, {
    maximumFractionDigits: 3,
    minimumFractionDigits: Number.isInteger(rounded) ? 0 : undefined,
  }).format(rounded)} L`;
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

/**
 * UI shows €/stremma everywhere. API stores €/ha (1 ha = 10 στρέμματα).
 * `locale` is kept for call-site compatibility; conversion no longer varies by language.
 */
export function perAreaForDisplay(
  perHectare: number | null | undefined,
  _locale?: string
): number | null {
  if (perHectare == null) return null;
  return perHectare / 10;
}

export function isForbiddenError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'response' in error &&
      (error as { response?: { status?: number } }).response?.status === 403
  );
}
