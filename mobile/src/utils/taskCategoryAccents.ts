import { DOMAIN_ACCENTS } from './domainAccents';

/** Keep in sync with frontend/src/utils/taskCategoryAccents.ts */
export const TASK_CATEGORY_ACCENTS: Record<string, string> = {
  Observation: '#4285F4',
  'Soil & Analysis': '#8B6914',
  Fertilization: '#2E7D32',
  Irrigation: '#00838F',
  Pruning: '#7B1FA2',
  'Weed Management': '#689F38',
  'Pest Monitoring': '#E64A19',
  'Disease Management': '#F9A825',
  Harvest: '#C47A1A',
  Harvesting: '#C47A1A',
  Equipment: '#607D8B',
  'Post-Harvest': '#3949AB',
  'Pest Control': '#E64A19',
  'Soil Analysis': '#8B6914',
  Spraying: '#E64A19',
  Inspection: '#4285F4',
  Task: DOMAIN_ACCENTS.task,
};

export const resolveTaskCategoryAccent = (type?: string | null): string => {
  if (!type) return DOMAIN_ACCENTS.task;
  const direct = TASK_CATEGORY_ACCENTS[type];
  if (direct) return direct;
  let hash = 0;
  for (let i = 0; i < type.length; i += 1) {
    hash = (hash * 31 + type.charCodeAt(i)) | 0;
  }
  const palette = Object.values(TASK_CATEGORY_ACCENTS);
  return palette[Math.abs(hash) % palette.length];
};
