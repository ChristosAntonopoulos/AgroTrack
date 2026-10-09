/** Farmer-facing minimal templates — mirrors backend CuratedTaskTemplates. */

export type MinimalTaskTemplate = {
  code: string;
  title: { el: string; en: string };
  description: { el: string; en: string };
  checklist: { el: string[]; en: string[] };
};

export const MINIMAL_TASK_TEMPLATES: MinimalTaskTemplate[] = [
  {
    code: 'T06',
    title: { el: 'Κλάδεμα', en: 'Pruning' },
    description: {
      el: 'Κλάδεψε και καθάρισε τα δέντρα για σωστό αερισμό και παραγωγή.',
      en: 'Prune and clear the trees for airflow and production.',
    },
    checklist: {
      el: ['Έλεγχος εργαλείων', 'Κλάδεμα δέντρων', 'Καθάρισμα κλαδιών'],
      en: ['Check tools', 'Prune trees', 'Clear branches'],
    },
  },
  {
    code: 'T05',
    title: { el: 'Λίπανση', en: 'Fertilisation' },
    description: {
      el: 'Βάλε τη λίπανση που αποφάσισες για τον ελαιώνα.',
      en: 'Apply the fertiliser you chose for the grove.',
    },
    checklist: {
      el: ['Επιλογή λιπάσματος', 'Εφαρμογή', 'Σημείωσε ποσότητα / κόστος'],
      en: ['Choose fertiliser', 'Apply', 'Note quantity / cost'],
    },
  },
  {
    code: 'T15',
    title: { el: 'Πότισμα', en: 'Watering' },
    description: {
      el: 'Έλεγξε ή κάνε άρδευση στον ελαιώνα.',
      en: 'Check or irrigate the grove.',
    },
    checklist: {
      el: ['Έλεγχος νερού', 'Έλεγχος σωλήνων / σταλακτών', 'Σημείωσε διάρκεια'],
      en: ['Check water', 'Check pipes / drippers', 'Note duration'],
    },
  },
  {
    code: 'T14',
    title: { el: 'Έλεγχος δάκου', en: 'Olive-fly check' },
    description: {
      el: 'Έλεγξε παγίδες και σημάδια προσβολής.',
      en: 'Check traps and signs of infestation.',
    },
    checklist: {
      el: ['Έλεγχος παγίδων', 'Παρατήρηση καρπού', 'Πρόσθεσε φωτογραφία αν χρειάζεται'],
      en: ['Check traps', 'Observe fruit', 'Add a photo if needed'],
    },
  },
  {
    code: 'T09',
    title: { el: 'Καθαρισμός εδάφους', en: 'Ground clearing' },
    description: {
      el: 'Κόψε χόρτα ή καθάρισε τον χώρο γύρω από τα δέντρα.',
      en: 'Cut grass or clear the ground around the trees.',
    },
    checklist: {
      el: ['Έλεγχος περιοχής', 'Κοπή / καθαρισμός', 'Απομάκρυνση υπολειμμάτων'],
      en: ['Check the area', 'Cut / clear', 'Remove leftovers'],
    },
  },
  {
    code: 'T21',
    title: { el: 'Συγκομιδή', en: 'Harvest' },
    description: {
      el: 'Οργάνωσε και ολοκλήρωσε τη συγκομιδή.',
      en: 'Organise and complete the harvest.',
    },
    checklist: {
      el: ['Δίχτυα και εργαλεία', 'Μάζεμα σακιών', 'Καταγραφή κιλών / εξόδων'],
      en: ['Nets and tools', 'Gather sacks', 'Record kilos / costs'],
    },
  },
  {
    code: 'T02',
    title: { el: 'Επίσκεψη στον ελαιώνα', en: 'Grove visit' },
    description: {
      el: 'Μια γενική επίσκεψη για να δεις τι χρειάζεται.',
      en: 'A general visit to see what is needed.',
    },
    checklist: {
      el: ['Έλεγχος δέντρων', 'Έλεγχος νερού / εδάφους', 'Σημείωσε ό,τι παρατήρησες'],
      en: ['Check trees', 'Check water / soil', 'Note what you observed'],
    },
  },
];

export const CURATED_TASK_TEMPLATE_CODES = MINIMAL_TASK_TEMPLATES.map((t) => t.code);

const byCode = new Map(
  MINIMAL_TASK_TEMPLATES.map((t) => [t.code.toUpperCase(), t] as const)
);

const pickLang = (language?: string): 'el' | 'en' =>
  (language || 'el').toLowerCase().startsWith('en') ? 'en' : 'el';

export function getMinimalTemplate(code?: string | null): MinimalTaskTemplate | undefined {
  if (!code) return undefined;
  return byCode.get(code.toUpperCase());
}

export function minimalTemplateTitle(code: string | undefined, language = 'el'): string {
  const entry = getMinimalTemplate(code);
  if (!entry) return pickLang(language) === 'el' ? 'Εργασία' : 'Task';
  return entry.title[pickLang(language)];
}

export function minimalTemplateDescription(code: string | undefined, language = 'el'): string {
  const entry = getMinimalTemplate(code);
  if (!entry) return '';
  return entry.description[pickLang(language)];
}

export function minimalTemplateChecklistLines(code: string | undefined, language = 'el'): string[] {
  const entry = getMinimalTemplate(code);
  if (!entry) return [];
  return entry.checklist[pickLang(language)];
}
