import type { ChronologioEntry, ChronologioSourceType } from '../services/chronologioService';
import { financialCategoryLabel } from '../finance/display';

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
  expense: 'Έξοδο',
  income: 'Έσοδο',
  harvest: 'Συγκομιδή',
  note: 'Παρατήρηση',
  weather: 'Καιρός',
  intelligence: 'OLEACHRON',
  lifecycle: 'Κύκλος ζωής',
  collaborator: 'Συνεργάτης',
  activity: 'Δραστηριότητα',
  photo: 'Φωτογραφία',
};

const CATEGORY_EN: Record<string, string> = {
  task: 'Task',
  expense: 'Expense',
  income: 'Income',
  harvest: 'Harvest',
  note: 'Observation',
  weather: 'Weather',
  intelligence: 'OLEACHRON',
  lifecycle: 'Lifecycle',
  collaborator: 'Collaborator',
  activity: 'Activity',
  photo: 'Photo',
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
};

const ACTOR_EN: Record<string, string> = {
  'γιώργος παπαδάκης': 'Giorgos Papadakis',
  'γιώργος παπαδόπουλος': 'Giorgos Papadopoulos',
  'κώστας μανούσακης': 'Kostas Manousakis',
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

const pick = (el: Record<string, string>, en: Record<string, string>, key: string, language?: string) =>
  (isEnglish(language) ? en[key] : el[key]) || el[key];

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

export const presentCategory = (category: string, language = 'el'): string =>
  pick(CATEGORY_EL, CATEGORY_EN, category, language) || (isEnglish(language) ? 'Activity' : 'Δραστηριότητα');

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
    const locale = isEnglish(language) ? 'en-US' : 'el-GR';
    const monthName = new Date(Date.UTC(weather.year, weather.month - 1, 1)).toLocaleDateString(locale, {
      month: 'long',
      timeZone: 'UTC',
    });
    return isEnglish(language) ? `${monthName} ${weather.year}` : `${monthName} ${weather.year}`;
  }
  if (weather?.year) return String(weather.year);
  return humanTitle(entry.title, language, presentCategory('weather', language));
};

export const presentChronologioEvent = (entry: ChronologioEntry, language = 'el'): EventPresentation => {
  const category = entry.category || 'activity';
  const shortLabel = presentCategory(category, language);
  const icon = iconFor(category);
  const accent = accentFor(category, String(entry.importance || ''));

  if (category === 'note') {
    return {
      label: presentCategory('note', language),
      shortLabel,
      icon,
      accent,
      description: entry.details.note?.bodyPreview || entry.summary || undefined,
    };
  }

  if (category === 'harvest') {
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
    return {
      label: humanTitle(entry.title, language, shortLabel),
      shortLabel,
      icon,
      accent,
      description: categoryLabel || entry.summary || undefined,
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
