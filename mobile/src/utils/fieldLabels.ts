/**
 * Presentation-only friendly field label.
 * "Olive Field - ΦΙΛΙΑΤΡΩΝ - 088" → "ΦΙΛΙΑΤΡΩΝ · 088"
 * "Φιλιατρών 088 — Μεγαρίτικη" → "Φιλιατρών 088"
 *
 * Keep in sync with frontend/src/utils/fieldLabels.ts
 */

/** Known olive variety tokens (keys + EL/EN labels) — not part of the grove name on cards. */
const OLIVE_VARIETY_TOKENS = new Set(
  [
    'koroneiki',
    'κορωνέικη',
    'kalamon',
    'καλαμών',
    'megaritiki',
    'μεγαρίτικη',
    'manaki',
    'μανάκι',
    'unknown',
    'άγνωστη',
    'other',
    'άλλη',
  ].map((s) => s.toLocaleLowerCase('el'))
);

const isOliveVarietyToken = (value: string): boolean =>
  OLIVE_VARIETY_TOKENS.has(value.trim().toLocaleLowerCase('el'));

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

  const parts = n.split(/\s·\s/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2 && isOliveVarietyToken(parts[parts.length - 1])) {
    n = parts.slice(0, -1).join(' · ');
  }

  return n || name.trim();
};

export const fieldLabelMap = (
  fields: Array<{ id: string; name?: string | null }>
): Record<string, string> =>
  Object.fromEntries(fields.map((f) => [f.id, friendlyFieldLabel(f.name)]));
