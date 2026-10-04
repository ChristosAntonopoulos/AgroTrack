import type { HarvestRecord } from '../services/harvestService';
import { formatDate } from '../utils/localeFormatters';
import type { SupportedLocale } from '../i18n/config';

export type HarvestLabelOptions = {
  fieldName?: string;
  locale: string;
  dateFormat: string;
  statusLabel?: (status: NonNullable<HarvestRecord['status']>) => string;
};

/** Build a distinguishable harvest option label: field · date · mill · status (omit empties). */
export function formatRelatedHarvestLabel(
  harvest: HarvestRecord,
  options: HarvestLabelOptions
): string {
  const parts: string[] = [];
  const field = options.fieldName?.trim();
  if (field) parts.push(field);

  const date = formatDate(harvest.harvestDate, {
    locale: options.locale as SupportedLocale,
    dateFormat: options.dateFormat,
  });
  if (date) parts.push(date);

  const mill = harvest.millName?.trim();
  if (mill) parts.push(mill);

  if (harvest.status && options.statusLabel) {
    parts.push(options.statusLabel(harvest.status));
  }

  return parts.join(' · ');
}

/** Ensure option labels are unique; never leave two identical date-only (or otherwise equal) labels. */
export function uniqueRelatedHarvestLabels(
  harvests: HarvestRecord[],
  options: HarvestLabelOptions
): Map<string, string> {
  const labels = new Map<string, string>();
  const counts = new Map<string, number>();

  for (const harvest of harvests) {
    const base = formatRelatedHarvestLabel(harvest, options);
    counts.set(base, (counts.get(base) || 0) + 1);
  }

  const seen = new Map<string, number>();
  for (const harvest of harvests) {
    const base = formatRelatedHarvestLabel(harvest, options);
    const total = counts.get(base) || 1;
    if (total === 1) {
      labels.set(harvest.id, base);
      continue;
    }
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const disambiguator =
      harvest.oliveKg > 0
        ? `${harvest.oliveKg} kg`
        : harvest.id.slice(0, 6);
    labels.set(harvest.id, `${base} · ${disambiguator}`);
  }

  return labels;
}
