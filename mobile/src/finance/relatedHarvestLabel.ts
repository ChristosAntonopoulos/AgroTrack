import type { HarvestRecord } from '../services/harvestService';

export type HarvestLabelOptions = {
  fieldName?: string;
  locale: string;
  statusLabel?: (status: NonNullable<HarvestRecord['status']>) => string;
};

/** Field · date · mill · status — omit empties. */
export function formatRelatedHarvestLabel(
  harvest: HarvestRecord,
  options: HarvestLabelOptions
): string {
  const parts: string[] = [];
  const field = options.fieldName?.trim();
  if (field) parts.push(field);

  const date = new Date(harvest.harvestDate).toLocaleDateString(options.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (date) parts.push(date);

  const mill = harvest.millName?.trim();
  if (mill) parts.push(mill);

  if (harvest.status && options.statusLabel) {
    parts.push(options.statusLabel(harvest.status));
  }

  return parts.join(' · ');
}
