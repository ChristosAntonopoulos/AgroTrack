/**
 * Chronologio journal-category accents (entry kind: task / harvest / expense…).
 * Intentionally distinct from Tasks work-type accents (Irrigation, Pruning…).
 * Keep frontend + mobile copies in sync.
 */
export const CHRONOLOGIO_CATEGORY_ACCENTS: Record<string, string> = {
  /** Journal “work” mark — amber, not Tasks blue */
  task: '#C47A1A',
  expense: '#3D6EA8',
  income: '#2F7A4B',
  harvest: '#4A7C2A',
  note: '#7A5EA8',
  weather: '#2D7A9A',
  intelligence: '#8A6D3B',
  lifecycle: '#5C7A3A',
  collaborator: '#5A6B8A',
  photo: '#6B7280',
  default: '#5A6A5C',
};

/** Only elevate severity — do not recolour ordinary “positive” entries. */
const IMPORTANCE_ACCENTS: Record<string, string> = {
  critical: '#B33A3A',
  warning: '#C47A1A',
};

/**
 * Soft right-fade accent for Chronologio cards.
 * Journal category colour — not Tasks work-type palette.
 */
export const resolveChronologioCategoryAccent = (
  category?: string | null,
  importance?: string | null
): string => {
  const sev = importance?.toLowerCase?.() ?? '';
  if (sev === 'critical' || sev === 'warning') {
    return IMPORTANCE_ACCENTS[sev];
  }
  if (!category) return CHRONOLOGIO_CATEGORY_ACCENTS.default;
  return CHRONOLOGIO_CATEGORY_ACCENTS[category] ?? CHRONOLOGIO_CATEGORY_ACCENTS.default;
};
