import { getTaskCategoryStyle } from './taskCategoryColors';
import { DOMAIN_ACCENTS } from './domainAccents';

/** Strong left-edge accents per task category — distinct at a glance. */
export const TASK_CATEGORY_ACCENTS: Record<string, string> = {
  Observation: '#4285F4',
  observation: '#4285F4',
  'Soil & Analysis': '#8B6914',
  soil: '#8B6914',
  Fertilization: '#2E7D32',
  fertilization: '#2E7D32',
  Irrigation: '#00838F',
  irrigation: '#00838F',
  Pruning: '#7B1FA2',
  pruning: '#7B1FA2',
  'Weed Management': '#689F38',
  'Pest Monitoring': '#E64A19',
  'Disease Management': '#F9A825',
  Harvest: '#C47A1A',
  harvest: '#C47A1A',
  Harvesting: '#C47A1A',
  Equipment: '#607D8B',
  maintenance: '#607D8B',
  'Post-Harvest': '#3949AB',
  'Pest Control': '#E64A19',
  plant_protection: '#E64A19',
  'Soil Analysis': '#8B6914',
  Spraying: '#E64A19',
  Inspection: '#4285F4',
  Task: DOMAIN_ACCENTS.task,
};

/**
 * Primary card accent for a task: category color (unique look per type).
 * Falls back to CATEGORY_STYLES border, then a stable hash / domain accent.
 */
export const resolveTaskCategoryAccent = (type?: string | null): string => {
  if (!type) return DOMAIN_ACCENTS.task;
  const direct = TASK_CATEGORY_ACCENTS[type] ?? TASK_CATEGORY_ACCENTS[type.toLowerCase()];
  if (direct) return direct;
  const styled = getTaskCategoryStyle(type);
  if (styled?.border) return styled.border;
  let hash = 0;
  for (let i = 0; i < type.length; i += 1) {
    hash = (hash * 31 + type.charCodeAt(i)) | 0;
  }
  const palette = Object.values(TASK_CATEGORY_ACCENTS);
  return palette[Math.abs(hash) % palette.length];
};
