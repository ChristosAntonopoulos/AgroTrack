import type { LivingFilters } from './livingTypes';

const STORAGE_KEY = 'oleachron.chronologio.filters';

export type StoredChronologioFilters = {
  fieldId?: string;
  category?: string;
  lifecycleYear?: string;
};

const clean = (value: StoredChronologioFilters): StoredChronologioFilters => {
  const next: StoredChronologioFilters = {};
  if (value.fieldId) next.fieldId = value.fieldId;
  if (value.category && value.category !== 'all') next.category = value.category;
  if (value.lifecycleYear === 'low' || value.lifecycleYear === 'high') {
    next.lifecycleYear = value.lifecycleYear;
  }
  return next;
};

export const readChronologioFilters = (): StoredChronologioFilters => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as StoredChronologioFilters;
    if (!parsed || typeof parsed !== 'object') return {};
    return clean({
      fieldId: typeof parsed.fieldId === 'string' ? parsed.fieldId : undefined,
      category: typeof parsed.category === 'string' ? parsed.category : undefined,
      lifecycleYear: typeof parsed.lifecycleYear === 'string' ? parsed.lifecycleYear : undefined,
    });
  } catch {
    return {};
  }
};

/**
 * Persist history filters. When `preserveFieldId` is true (field-locked history),
 * the saved grove is left alone.
 */
export const writeChronologioFilters = (
  partial: Partial<LivingFilters>,
  opts?: { preserveFieldId?: boolean }
): void => {
  try {
    const prev = readChronologioFilters();
    const next = clean({
      category:
        partial.category !== undefined ? String(partial.category || 'all') : prev.category,
      lifecycleYear:
        partial.lifecycleYear !== undefined ? partial.lifecycleYear || '' : prev.lifecycleYear,
      fieldId: opts?.preserveFieldId
        ? prev.fieldId
        : partial.fieldId !== undefined
          ? partial.fieldId || ''
          : prev.fieldId,
    });
    if (!next.fieldId && !next.category && !next.lifecycleYear) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private mode */
  }
};
