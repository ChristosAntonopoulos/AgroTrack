/** Display metadata for Field Work catalogue codes — mirrors backend FieldWorkCatalogue. */

export type FieldWorkCategory =
  | 'monitoring'
  | 'pruning'
  | 'fertilisation'
  | 'irrigation'
  | 'harvest'
  | 'inspection'
  | 'analysis'
  | 'ground'
  | 'other';

export type FieldWorkTemplateMeta = {
  el: string;
  en: string;
  category: FieldWorkCategory;
  weatherSensitive: boolean;
};

export const FIELD_WORK_TEMPLATE_META: Record<string, FieldWorkTemplateMeta> = {
  T01: { el: 'Ανασκόπηση προηγούμενης χρονιάς', en: 'Review previous year', category: 'other', weatherSensitive: false },
  T02: { el: 'Χειμερινός έλεγχος χωραφιού', en: 'Winter field inspection', category: 'inspection', weatherSensitive: true },
  T03: { el: 'Ανάλυση εδάφους', en: 'Soil analysis', category: 'analysis', weatherSensitive: false },
  T04: { el: 'Ετήσιο σχέδιο λίπανσης', en: 'Annual fertilisation plan', category: 'fertilisation', weatherSensitive: false },
  T05: { el: 'Βασική λίπανση', en: 'Base fertilisation', category: 'fertilisation', weatherSensitive: true },
  T06: { el: 'Κλάδεμα', en: 'Pruning', category: 'pruning', weatherSensitive: true },
  T07: { el: 'Διαχείριση κλαδιών', en: 'Pruning residue management', category: 'pruning', weatherSensitive: false },
  T08: { el: 'Έλεγχος αρδευτικού', en: 'Irrigation-system inspection', category: 'irrigation', weatherSensitive: false },
  T09: { el: 'Χόρτα και κάλυψη εδάφους', en: 'Ground cover', category: 'ground', weatherSensitive: true },
  T10: { el: 'Παρατήρηση άνθισης', en: 'Flowering observation', category: 'inspection', weatherSensitive: false },
  T11: { el: 'Παρακολούθηση πυρηνοτρήτη', en: 'Olive-moth monitoring', category: 'monitoring', weatherSensitive: false },
  T12: { el: 'Εκτίμηση καρπόδεσης', en: 'Fruit-set assessment', category: 'inspection', weatherSensitive: false },
  T13: { el: 'Ενεργοποίηση παγίδων δάκου', en: 'Activate olive-fly monitoring', category: 'monitoring', weatherSensitive: false },
  T14: { el: 'Έλεγχος παγίδων δάκου', en: 'Olive-fly trap check', category: 'monitoring', weatherSensitive: false },
  T15: { el: 'Προγραμματισμός άρδευσης', en: 'Irrigation scheduling', category: 'irrigation', weatherSensitive: true },
  T16: { el: 'Φυλλοδιαγνωστική', en: 'July leaf analysis', category: 'analysis', weatherSensitive: false },
  T17: { el: 'Θερινός έλεγχος', en: 'Summer stress inspection', category: 'inspection', weatherSensitive: true },
  T18: { el: 'Προκαταρκτική εκτίμηση συγκομιδής', en: 'Preliminary harvest estimate', category: 'harvest', weatherSensitive: false },
  T19: { el: 'Κράτηση συνεργείου και ελαιοτριβείου', en: 'Book crew and mill', category: 'harvest', weatherSensitive: false },
  T20: { el: 'Προετοιμασία συγκομιδής', en: 'Harvest readiness', category: 'harvest', weatherSensitive: false },
  T21: { el: 'Συγκομιδή', en: 'Harvest', category: 'harvest', weatherSensitive: true },
  T22: { el: 'Μετασυλλεκτική συμφωνία', en: 'Post-harvest reconciliation', category: 'harvest', weatherSensitive: false },
  T23: { el: 'Μετασυλλεκτικός έλεγχος', en: 'Post-harvest field inspection', category: 'inspection', weatherSensitive: false },
  T24: { el: 'Κλείσιμο χρονιάς', en: 'Close result year', category: 'other', weatherSensitive: false },
};

/** @deprecated Use FIELD_WORK_TEMPLATE_META. Kept for existing form imports. */
export const FIELD_WORK_TEMPLATE_LABELS: Record<string, { el: string; en: string }> = Object.fromEntries(
  Object.entries(FIELD_WORK_TEMPLATE_META).map(([code, meta]) => [code, { el: meta.el, en: meta.en }])
);

export function templateMeta(code: string | undefined): FieldWorkTemplateMeta | undefined {
  if (!code) return undefined;
  return FIELD_WORK_TEMPLATE_META[code.toUpperCase()];
}

export function templateTitle(code: string | undefined, language = 'el'): string {
  const entry = templateMeta(code);
  if (!entry) return language.toLowerCase().startsWith('el') ? 'Εργασία' : 'Task';
  return language.toLowerCase().startsWith('el') ? entry.el : entry.en;
}

export function isWeatherSensitiveTemplate(code: string | undefined): boolean {
  return Boolean(templateMeta(code)?.weatherSensitive);
}
