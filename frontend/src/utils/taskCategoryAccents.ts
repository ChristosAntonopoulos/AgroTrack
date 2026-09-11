import { getTaskCategoryColor, getTaskCategoryStyle } from './taskCategoryColors';
import { getCssToken } from '../styles/colorTokens';
import { DOMAIN_ACCENTS } from './domainAccents';

/**
 * Strong left-edge accents per task category — Mediterranean event palette.
 * Values are resolved live from CSS tokens.
 */
export const resolveTaskCategoryAccent = (type?: string | null): string => {
  if (!type) return getCssToken('--olive-primary') || DOMAIN_ACCENTS.task;
  const fromCategory = getTaskCategoryColor(type);
  if (fromCategory) return fromCategory;
  const styled = getTaskCategoryStyle(type);
  if (styled?.border) return styled.border;
  return getCssToken('--olive-primary') || DOMAIN_ACCENTS.task;
};

/** @deprecated Prefer resolveTaskCategoryAccent — static map for rare callers. */
export const TASK_CATEGORY_ACCENTS: Record<string, string> = new Proxy(
  {} as Record<string, string>,
  {
    get(_target, prop: string) {
      if (typeof prop !== 'string') return undefined;
      return resolveTaskCategoryAccent(prop);
    },
  }
);
