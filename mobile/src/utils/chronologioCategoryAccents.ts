/**
 * Chronologio journal-category accents — aligned with web `--event-*` tokens.
 * Soft washes live on theme.colors.event*Soft; these are the strong accents.
 */
export const CHRONOLOGIO_CATEGORY_ACCENTS: Record<string, string> = {
  task: '#5E7848',
  expense: '#99662D',
  income: '#36734D',
  harvest: '#8B4F49',
  note: '#755D8C',
  weather: '#39798D',
  intelligence: '#59696B',
  lifecycle: '#5E7848',
  collaborator: '#59696B',
  photo: '#879086',
  default: '#879086',
};

const IMPORTANCE_ACCENTS: Record<string, string> = {
  critical: '#A74435',
  warning: '#C8924E',
};

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
