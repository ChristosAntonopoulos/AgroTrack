import { DOMAIN_ACCENTS } from './domainAccents';

/**
 * Strong left-edge accents per task category — Mediterranean event palette.
 * Keep in sync with frontend/src/utils/taskCategoryColors.ts CATEGORY_EVENT map.
 */
const EVENT = {
  work: '#5E7848',
  observation: '#755D8C',
  expense: '#99662D',
  income: '#36734D',
  harvest: '#8B4F49',
  weather: '#39798D',
  warning: '#A74435',
  field_change: '#59696B',
} as const;

export const TASK_CATEGORY_ACCENTS: Record<string, string> = {
  Observation: EVENT.observation,
  observation: EVENT.observation,
  Inspection: EVENT.observation,
  'Soil & Analysis': EVENT.observation,
  soil: EVENT.observation,
  'Soil Analysis': EVENT.observation,
  Fertilization: EVENT.work,
  fertilization: EVENT.work,
  Irrigation: EVENT.work,
  irrigation: EVENT.work,
  Pruning: EVENT.work,
  pruning: EVENT.work,
  'Weed Management': EVENT.work,
  'Pest Monitoring': EVENT.warning,
  'Pest Control': EVENT.warning,
  plant_protection: EVENT.warning,
  Spraying: EVENT.warning,
  'Disease Management': EVENT.warning,
  Harvest: EVENT.harvest,
  harvest: EVENT.harvest,
  Harvesting: EVENT.harvest,
  'Post-Harvest': EVENT.harvest,
  Equipment: EVENT.field_change,
  maintenance: EVENT.field_change,
  Task: EVENT.work,
};

export const resolveTaskCategoryAccent = (type?: string | null): string => {
  if (!type) return DOMAIN_ACCENTS.task;
  const direct = TASK_CATEGORY_ACCENTS[type];
  if (direct) return direct;
  const lower = TASK_CATEGORY_ACCENTS[type.toLowerCase()];
  if (lower) return lower;
  let hash = 0;
  for (let i = 0; i < type.length; i += 1) {
    hash = (hash * 31 + type.charCodeAt(i)) | 0;
  }
  const palette = Object.values(EVENT);
  return palette[Math.abs(hash) % palette.length];
};
