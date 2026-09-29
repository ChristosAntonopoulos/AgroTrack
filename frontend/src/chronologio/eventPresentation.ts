import type { ChronologioEntry, ChronologioSourceType } from '../services/chronologioService';
import { financialCategoryLabel } from '../finance/display';
import { presentPrimaryCategory } from './primaryCategories';
import { formatMonthHeading } from '../utils/taskFormDates';

export type ChronologioEventKey = {
  sourceType: ChronologioSourceType | string;
  sourceId: string;
  occurrenceId?: string;
};

export type IconName =
  | 'task'
  | 'expense'
  | 'income'
  | 'harvest'
  | 'note'
  | 'weather'
  | 'intelligence'
  | 'lifecycle'
  | 'collaborator'
  | 'activity'
  | 'photo';

export type SemanticColor = IconName | 'warning' | 'critical' | 'positive';

export type EventPresentation = {
  label: string;
  shortLabel: string;
  icon: IconName;
  accent: SemanticColor;
  description?: string;
};

const CATEGORY_EL: Record<string, string> = {
  task: 'Εργασία',
  work: 'Εργασία',
  expense: 'Έξοδο',
  income: 'Έσοδο',
  money: 'Χρήματα',
  harvest: 'Συγκομιδή',
  note: 'Παρατήρηση',
  observation: 'Παρατήρηση',
  weather: 'Καιρός',
  intelligence: 'OLEACHRON',
  lifecycle: 'Αλλαγές ελαιώνα',
  collaborator: 'Αλλαγές ελαιώνα',
  activity: 'Αλλαγές ελαιώνα',
  field_change: 'Αλλαγές ελαιώνα',
  photo: 'Παρατήρηση',
};

const CATEGORY_EN: Record<string, string> = {
  task: 'Work',
  work: 'Work',
  expense: 'Expense',
  income: 'Income',
  money: 'Money',
  harvest: 'Harvest',
  note: 'Note',
  observation: 'Note',
  weather: 'Weather',
  intelligence: 'OLEACHRON',
  lifecycle: 'Field change',
  collaborator: 'Field change',
  activity: 'Field change',
  field_change: 'Field change',
  photo: 'Note',
};

const SYSTEM_TITLE_EL: Record<string, string> = {
  observation: 'Παρατήρηση',
  harvest: 'Συγκομιδή',
  task: 'Εργασία',
  activity: 'Δραστηριότητα',
  expense: 'Έξοδο',
  income: 'Έσοδο',
  spraying: 'Ψεκασμός',
  irrigation: 'Άρδευση',
  pruning: 'Κλάδεμα',
  fertilization: 'Λίπανση',
  plant_protection: 'Φυτοπροστασία',
  fuel_and_energy: 'Καύσιμα και ενέργεια',
  fertilizers: 'Λιπάσματα',
};

const SYSTEM_TITLE_EN: Record<string, string> = {
  observation: 'Observation',
  harvest: 'Harvest',
  task: 'Task',
  activity: 'Activity',
  expense: 'Expense',
  income: 'Income',
  spraying: 'Spraying',
  irrigation: 'Irrigation',
  pruning: 'Pruning',
  fertilization: 'Fertilization',
  plant_protection: 'Plant protection',
  fuel_and_energy: 'Fuel and energy',
  fertilizers: 'Fertilizers',
};

const ACTOR_EL: Record<string, string> = {
  'giorgos papadakis': 'Γιώργος Παπαδάκης',
  'giorgos papadopoulos': 'Γιώργος Παπαδόπουλος',
  'kostas manousakis': 'Κώστας Μανούσακης',
  'eleni papadaki': 'Ελένη Παπαδάκη',
};

const ACTOR_EN: Record<string, string> = {
  'γιώργος παπαδάκης': 'Giorgos Papadakis',
  'γιώργος παπαδόπουλος': 'Giorgos Papadopoulos',
  'κώστας μανούσακης': 'Kostas Manousakis',
  'ελένη παπαδάκη': 'Eleni Papadaki',
};

const QUALITY_EL: Record<string, string> = {
  extra_virgin: 'Έξτρα παρθένο',
  virgin: 'Παρθένο',
  lampante: 'Λαμπάντε',
};

const QUALITY_EN: Record<string, string> = {
  extra_virgin: 'Extra virgin',
  virgin: 'Virgin',
  lampante: 'Lampante',
};

const STAGE_EL: Record<string, string> = {
  bud_break: 'Ανάπτυξη οφθαλμών',
  bud_development: 'Ανάπτυξη οφθαλμών',
  flowering: 'Άνθιση',
  fruit_set: 'Ανάπτυξη καρπού',
  fruit_development: 'Ανάπτυξη καρπού',
  ripening: 'Ωρίμανση',
};

const STAGE_EN: Record<string, string> = {
  bud_break: 'Bud development',
  bud_development: 'Bud development',
  flowering: 'Flowering',
  fruit_set: 'Fruit development',
  fruit_development: 'Fruit development',
  ripening: 'Ripening',
};

const isEnglish = (language?: string) => (language || 'el').toLowerCase().startsWith('en');
const isItalian = (language?: string) => (language || 'el').toLowerCase().startsWith('it');

const pick = (el: Record<string, string>, en: Record<string, string>, key: string, language?: string) =>
  (isEnglish(language) ? en[key] : el[key]) || el[key];

const isMergedHarvestDayEntry = (entry: ChronologioEntry): boolean =>
  entry.sourceType === 'Harvest' && /^Harvest:day:/i.test(entry.id);

export const chronologioEventKey = (entry: Pick<ChronologioEntry, 'sourceType' | 'sourceId'> & {
  occurrenceId?: string | null;
}): ChronologioEventKey => ({
  sourceType: entry.sourceType,
  sourceId: entry.sourceId,
  occurrenceId: entry.occurrenceId || undefined,
});

export const chronologioEventKeyId = (key: ChronologioEventKey): string =>
  key.occurrenceId ? `${key.sourceType}:${key.sourceId}:${key.occurrenceId}` : `${key.sourceType}:${key.sourceId}`;

export const looksLikeInternalCode = (value?: string | null): boolean => {
  const text = (value || '').trim();
  if (!text) return true;
  if (/^T\d{2}$/i.test(text)) return true;
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(text)) return true;
  return /^[a-z][a-z0-9-]*$/.test(text) && !text.includes(' ');
};

export const presentCategory = (category: string, language = 'el'): string => {
  const mapped = pick(CATEGORY_EL, CATEGORY_EN, category, language);
  if (mapped) return mapped;
  const primary = presentPrimaryCategory(category, language, true);
  if (primary) return primary;
  return isEnglish(language) ? 'Activity' : 'Δραστηριότητα';
};

export const presentExpenseCategory = (category?: string | null, language = 'el'): string => {
  if (!category) return '';
  const labeled = financialCategoryLabel(category, language);
  if (labeled && labeled !== category) return labeled;
  return pick(SYSTEM_TITLE_EL, SYSTEM_TITLE_EN, category, language) || '';
};

export const presentActorName = (name?: string | null, language = 'el'): string => {
  if (!name?.trim()) return '';
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  if (isEnglish(language)) return ACTOR_EN[key] || trimmed;
  return ACTOR_EL[key] || trimmed;
};

export const presentHarvestQuality = (quality?: string | null, language = 'el'): string => {
  if (!quality) return '';
  const key = quality.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const mapped = pick(QUALITY_EL, QUALITY_EN, key, language);
  if (mapped) return mapped;
  return looksLikeInternalCode(quality) ? '' : quality.trim();
};

export const presentLifecycleStage = (stage?: string | null, language = 'el'): string => {
  if (!stage) return '';
  const key = stage.trim().toLowerCase().replace(/[\s-]+/g, '_');
  const mapped = pick(STAGE_EL, STAGE_EN, key, language);
  if (mapped) return mapped;
  return looksLikeInternalCode(stage) ? '' : stage.trim();
};

const iconFor = (category: string): IconName => {
  if (category === 'income') return 'income';
  if (
    category === 'task' ||
    category === 'expense' ||
    category === 'harvest' ||
    category === 'note' ||
    category === 'weather' ||
    category === 'intelligence' ||
    category === 'lifecycle' ||
    category === 'collaborator' ||
    category === 'photo'
  ) {
    return category;
  }
  return 'activity';
};

const accentFor = (category: string, importance?: string): SemanticColor => {
  if (importance === 'critical' || importance === 'warning') return importance;
  if (importance === 'positive') return category === 'harvest' || category === 'income' ? category : 'positive';
  return iconFor(category);
};

const humanTitle = (raw: string | undefined, language: string, fallback: string): string => {
  const title = (raw || '').trim();
  if (!title) return fallback;
  const key = title.toLowerCase().replace(/[\s-]+/g, '_');
  const mapped = pick(SYSTEM_TITLE_EL, SYSTEM_TITLE_EN, key, language);
  if (mapped) return mapped;
  if (looksLikeInternalCode(title)) return fallback;
  return title;
};

const weatherLabel = (entry: ChronologioEntry, language: string): string => {
  const weather = entry.details.weather;
  if (weather?.year && weather.month) {
    return formatMonthHeading(weather.year, weather.month, language);
  }
  if (weather?.year) return String(weather.year);
  return humanTitle(entry.title, language, presentCategory('weather', language));
};

const GENERIC_NOTE_TITLES = new Set([
  'observation',
  'note',
  'photo',
  'παρατήρηση',
  'σημείωση',
  'φωτογραφία',
  'osservazione',
  'nota',
  'foto',
]);

/** First sentence, capped so the card preview stays two or three lines. */
export const observationPreview = (text: string, max = 140): string => {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  const breakAt = trimmed.search(/[.!;…](?:\s|$)/);
  const sentence = (breakAt >= 0 ? trimmed.slice(0, breakAt) : trimmed).trim();
  const source = sentence || trimmed;
  if (source.length <= max) return source;
  const cut = source.slice(0, max).replace(/\s+\S*$/, '').trim();
  return `${cut || source.slice(0, max)}…`;
};

const isGenericNoteTitle = (title: string, body: string): boolean => {
  const key = title.trim().toLowerCase();
  if (!key) return true;
  if (GENERIC_NOTE_TITLES.has(key)) return true;
  if (looksLikeInternalCode(title)) return true;
  if (body && key === body.trim().toLowerCase()) return true;
  return false;
};

export const presentChronologioEvent = (entry: ChronologioEntry, language = 'el'): EventPresentation => {
  const category = entry.category || 'activity';
  const shortLabel = presentCategory(category, language);
  const icon = iconFor(category);
  const accent = accentFor(category, String(entry.importance || ''));

  if (category === 'note' || category === 'photo') {
    const body = (entry.details.note?.bodyPreview || entry.summary || '').trim();
    const rawTitle = (entry.title || '').trim();
    if (category === 'photo' && (!body || body.toLowerCase() === 'photo' || body === 'Φωτογραφία') && isGenericNoteTitle(rawTitle, body)) {
      const field = entry.field?.name;
      const auto = field
        ? isEnglish(language)
          ? `Photo from ${field}`
          : `Φωτογραφία από ${field}`
        : presentCategory('photo', language);
      return { label: auto, shortLabel, icon: 'photo', accent, description: undefined };
    }
    if (isGenericNoteTitle(rawTitle, body)) {
      return {
        label: observationPreview(body || presentCategory('note', language)),
        shortLabel,
        icon: category === 'photo' ? 'photo' : icon,
        accent,
        description: undefined,
      };
    }
    const preview = observationPreview(body);
    const repeatsTitle =
      !preview ||
      preview.toLowerCase() === rawTitle.toLowerCase() ||
      body.toLowerCase().startsWith(rawTitle.toLowerCase());
    return {
      label: humanTitle(rawTitle, language, presentCategory('note', language)),
      shortLabel,
      icon: category === 'photo' ? 'photo' : icon,
      accent,
      description: repeatsTitle ? undefined : preview,
    };
  }

  if (category === 'harvest') {
    if (isMergedHarvestDayEntry(entry)) {
      return {
        // Category as title — date lives in the card meta; avoid "Ημέρα συγκομιδής · 21 Σεπ" twice.
        label: presentCategory('harvest', language),
        shortLabel: presentCategory('harvest', language),
        icon,
        accent,
        // Sack totals render as stats; keep summary only when it adds non-sack facts.
        description: undefined,
      };
    }
    return {
      label: presentCategory('harvest', language),
      shortLabel,
      icon,
      accent,
      description: entry.summary || undefined,
    };
  }

  if (category === 'weather') {
    return {
      label: weatherLabel(entry, language),
      shortLabel,
      icon,
      accent,
      description: entry.summary || undefined,
    };
  }

  if (category === 'expense' || category === 'income') {
    const categoryLabel =
      entry.details.expense?.expenseCategoryLabel ||
      presentExpenseCategory(entry.details.expense?.expenseCategory, language);
    const titled = humanTitle(entry.title, language, '');
    const genericMoneyTitle =
      !titled ||
      titled === shortLabel ||
      titled.toLowerCase().startsWith(shortLabel.toLowerCase());
    const label = genericMoneyTitle
      ? categoryLabel || titled || shortLabel
      : titled;
    const summary = (entry.summary || '').trim();
    const extra =
      summary && summary !== label && summary.toLowerCase() !== label.toLowerCase()
        ? summary
        : undefined;
    return {
      label,
      shortLabel,
      icon,
      accent,
      description: label === categoryLabel ? extra : categoryLabel || extra,
    };
  }

  return {
    label: humanTitle(entry.title, language, shortLabel),
    shortLabel,
    icon,
    accent,
    description: entry.summary || undefined,
  };
};

export const presentExpenseChip = (entry: ChronologioEntry, language = 'el'): string => {
  const labeled = entry.details.expense?.expenseCategoryLabel?.trim();
  if (labeled && !looksLikeInternalCode(labeled)) return labeled;
  return presentExpenseCategory(entry.details.expense?.expenseCategory, language);
};
