/** Compact checklist examples from the Field Work catalogue — display only. */

export type ChecklistPreviewItem = { el: string; en: string };

const PREVIEW: Record<string, ChecklistPreviewItem[]> = {
  T02: [
    { el: 'Φωτογραφίες', en: 'Photos' },
    { el: 'Σημειώσεις', en: 'Notes' },
    { el: 'Κατάσταση δέντρων', en: 'Tree condition' },
  ],
  T05: [
    { el: 'Σωστό χωράφι', en: 'Correct field' },
    { el: 'Σωστό λίπασμα', en: 'Correct fertiliser' },
    { el: 'Προγραμματισμένη ποσότητα', en: 'Planned quantity' },
  ],
  T06: [
    { el: 'Στόχος κλαδέματος', en: 'Pruning objective' },
    { el: 'Δέντρα ή έκταση που ολοκληρώθηκε', en: 'Trees or area completed' },
    { el: 'Φωτογραφίες πριν/μετά', en: 'Before/after photos' },
  ],
  T08: [
    { el: 'Κατάσταση συστήματος', en: 'System condition' },
    { el: 'Ανάγκες επισκευής', en: 'Repair needs' },
    { el: 'Φωτογραφίες', en: 'Photos' },
  ],
  T09: [
    { el: 'Έκταση', en: 'Area' },
    { el: 'Μέθοδος', en: 'Method' },
    { el: 'Φωτογραφίες πριν/μετά', en: 'Before/after photos' },
  ],
  T14: [
    { el: 'Συλλήψεις παγίδας', en: 'Trap catches' },
    { el: 'Περίοδος παγίδας σε ημέρες', en: 'Trap period in days' },
    { el: 'Δειγματοληψία καρπών', en: 'Sampled fruit count' },
  ],
  T15: [
    { el: 'Διάρκεια', en: 'Duration' },
    { el: 'Όγκος νερού', en: 'Water volume' },
    { el: 'Αρδευόμενη έκταση', en: 'Irrigated area' },
  ],
  T18: [
    { el: 'Αναμενόμενη έναρξη', en: 'Expected harvest start' },
    { el: 'Εκτιμώμενα κιλά ελιάς', en: 'Estimated olive kilograms' },
    { el: 'Προορισμός: λάδι ή επιτραπέζιες', en: 'Oil or table olives' },
  ],
  T19: [
    { el: 'Υπεύθυνος', en: 'Responsible person' },
    { el: 'Αριθμός εργατών', en: 'Number of workers' },
    { el: 'Εκτιμώμενα κόστη', en: 'Estimated costs' },
  ],
  T21: [
    { el: 'Κιλά ελιάς', en: 'Olive kilograms' },
    { el: 'Προορισμός', en: 'Destination' },
    { el: 'Ελαιοτριβείο', en: 'Mill' },
  ],
};

const FALLBACK: ChecklistPreviewItem[] = [
  { el: 'Σωστό χωράφι', en: 'Correct field' },
  { el: 'Φωτογραφίες', en: 'Photos' },
  { el: 'Σημειώσεις', en: 'Notes' },
];

export const checklistPreviewItems = (
  templateCode?: string,
  language = 'el'
): { items: string[]; total: number } => {
  const source = (templateCode && PREVIEW[templateCode.toUpperCase()]) || FALLBACK;
  const greek = language.toLowerCase().startsWith('el');
  return {
    items: source.slice(0, 3).map((item) => (greek ? item.el : item.en)),
    total: source.length,
  };
};
