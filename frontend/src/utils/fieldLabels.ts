/**
 * Presentation-only friendly field label.
 * "Olive Field - ΦΙΛΙΑΤΡΩΝ - 088" → "ΦΙΛΙΑΤΡΩΝ · 088"
 */
export const friendlyFieldLabel = (name?: string | null): string => {
  if (!name || !name.trim()) return '—';
  let n = name.trim();

  n = n.replace(/^Olive\s+Fields?\s*[-–—:]\s*/i, '');
  n = n.replace(/^Olive\s+Groves?\s*[-–—:]\s*/i, '');
  n = n.replace(/^Oliveto\s*[-–—:]\s*/i, '');
  n = n.replace(/^Ελαιών(?:ας|ες)\s*[-–—:]\s*/i, '');
  n = n.replace(/\s*[-–—]\s*/g, ' · ');
  n = n.replace(/\s{2,}/g, ' ').trim();
  n = n.replace(/(\s·\s)+/g, ' · ');
  return n || name.trim();
};

export const fieldLabelMap = (
  fields: Array<{ id: string; name?: string | null }>
): Record<string, string> =>
  Object.fromEntries(fields.map((f) => [f.id, friendlyFieldLabel(f.name)]));
