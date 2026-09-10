/** Canonical task/work category ids, independent of UI language. */
export const TASK_CATEGORY_IDS = [
  'irrigation',
  'harvest',
  'pruning',
  'fertilization',
  'plant_protection',
  'soil',
  'observation',
  'maintenance',
  'other',
] as const;

export type TaskCategoryId = (typeof TASK_CATEGORY_IDS)[number];

const ALIASES: Record<string, TaskCategoryId> = {
  irrigation: 'irrigation',
  irrigate: 'irrigation',
  watering: 'irrigation',
  αρδευση: 'irrigation',
  άρδευση: 'irrigation',
  ποτισμα: 'irrigation',
  πότισμα: 'irrigation',
  harvest: 'harvest',
  harvesting: 'harvest',
  συγκομιδη: 'harvest',
  συγκομιδή: 'harvest',
  τρυγος: 'harvest',
  τρύγος: 'harvest',
  pruning: 'pruning',
  κλαδεμα: 'pruning',
  κλάδεμα: 'pruning',
  fertilization: 'fertilization',
  fertilizer: 'fertilization',
  λιπανση: 'fertilization',
  λίπανση: 'fertilization',
  plant_protection: 'plant_protection',
  plantprotection: 'plant_protection',
  spraying: 'plant_protection',
  treatment: 'plant_protection',
  treatments: 'plant_protection',
  φυτοπροστασια: 'plant_protection',
  φυτοπροστασία: 'plant_protection',
  ψεκασμος: 'plant_protection',
  ψεκασμός: 'plant_protection',
  soil: 'soil',
  εδαφος: 'soil',
  έδαφος: 'soil',
  observation: 'observation',
  παρατηρηση: 'observation',
  παρατήρηση: 'observation',
  maintenance: 'maintenance',
  εξοπλισμος: 'maintenance',
  εξοπλισμός: 'maintenance',
  other: 'other',
  αλλο: 'other',
  άλλο: 'other',
};

const strip = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s-]+/g, '');

export const normalizeTaskCategory = (value: string | null | undefined): TaskCategoryId => {
  if (!value) return 'other';
  const raw = value.trim().toLowerCase();
  if (ALIASES[raw]) return ALIASES[raw];
  const compact = strip(value);
  for (const [alias, id] of Object.entries(ALIASES)) {
    if (strip(alias) === compact) return id;
  }
  return 'other';
};

export const TASK_STATUS_IDS = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
export type TaskStatusId = (typeof TASK_STATUS_IDS)[number];

const STATUS_ALIASES: Record<string, TaskStatusId> = {
  pending: 'pending',
  planned: 'pending',
  ready: 'pending',
  blocked: 'pending',
  scheduled: 'pending',
  todo: 'pending',
  in_progress: 'in_progress',
  inprogress: 'in_progress',
  'in-progress': 'in_progress',
  completed: 'completed',
  complete: 'completed',
  done: 'completed',
  cancelled: 'cancelled',
  canceled: 'cancelled',
};

export const normalizeTaskStatus = (value: string | null | undefined): TaskStatusId | null => {
  if (!value) return null;
  const key = value.trim().toLowerCase().replace(/\s+/g, '_');
  return STATUS_ALIASES[key] ?? null;
};

export const FINANCIAL_CATEGORY_IDS = [
  'labor',
  'fertilizers',
  'treatments',
  'irrigation_water',
  'electricity_fuel',
  'equipment',
  'repairs',
  'pruning',
  'harvest_workers',
  'mill_cost',
  'transport',
  'packaging',
  'storage',
  'agronomist',
  'fruit_sale',
  'oil_sale',
  'subsidy',
  'other',
] as const;

export type FinancialCategoryId = (typeof FINANCIAL_CATEGORY_IDS)[number];

export const HARVEST_COST_CATEGORIES: ReadonlySet<string> = new Set([
  'harvest_workers',
  'mill_cost',
  'packaging',
  'storage',
]);

export const normalizeFinancialCategory = (
  value: string | null | undefined
): FinancialCategoryId => {
  if (!value) return 'other';
  const raw = value.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((FINANCIAL_CATEGORY_IDS as readonly string[]).includes(raw)) {
    return raw as FinancialCategoryId;
  }
  const compact = strip(value);
  for (const id of FINANCIAL_CATEGORY_IDS) {
    if (strip(id) === compact) return id;
  }
  return 'other';
};

export const financialCategoryI18nKey = (value: string | null | undefined): string =>
  `fields:financial.categories.${normalizeFinancialCategory(value)}`;

export const taskStatusI18nKey = (value: string | null | undefined): string => {
  const status = normalizeTaskStatus(value);
  return status ? `common:taskStatus.${status}` : 'common:taskStatus.pending';
};
