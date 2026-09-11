/**
 * Category colours for FieldTask template codes / legacy category labels.
 * Aligned with Chronologio `--event-*` tokens (Mediterranean olive system).
 * Soft backgrounds for chips only — not full card fills.
 */

import {
  getCssToken,
  getEventCategoryColor,
  type EventCategoryKey,
} from '../styles/colorTokens';

export type CategoryColorStyle = {
  bg: string;
  border: string;
  text: string;
  chipBg: string;
};

type CategoryMapping = {
  event: EventCategoryKey;
  /** Agronomic subtype of work/observation — still uses event token family */
};

const CATEGORY_EVENT: Record<string, EventCategoryKey> = {
  Observation: 'observation',
  observation: 'observation',
  Inspection: 'observation',
  'Soil & Analysis': 'observation',
  soil: 'observation',
  'Soil Analysis': 'observation',
  Fertilization: 'work',
  fertilization: 'work',
  Irrigation: 'work',
  irrigation: 'work',
  Pruning: 'work',
  pruning: 'work',
  'Weed Management': 'work',
  'Pest Monitoring': 'warning',
  'Pest Control': 'warning',
  plant_protection: 'warning',
  Spraying: 'warning',
  'Disease Management': 'warning',
  Harvest: 'harvest',
  harvest: 'harvest',
  Harvesting: 'harvest',
  'Post-Harvest': 'harvest',
  Equipment: 'field_change',
  maintenance: 'field_change',
  Task: 'work',
};

function styleFromEvent(key: EventCategoryKey): CategoryColorStyle {
  const border = getEventCategoryColor(key);
  const soft = getCssToken(`--event-${key.replace(/_/g, '-')}-soft`);
  return {
    bg: soft || 'transparent',
    border,
    text: border,
    chipBg: soft || 'transparent',
  };
}

/** Build styles live from theme so light/dark stay in sync. */
export const getCategoryStylesMap = (): Record<string, CategoryColorStyle> => {
  const map: Record<string, CategoryColorStyle> = {};
  for (const [label, event] of Object.entries(CATEGORY_EVENT)) {
    map[label] = styleFromEvent(event);
  }
  return map;
};

/** @deprecated Prefer getTaskCategoryStyle — kept for callers that expect a static map. */
export const CATEGORY_STYLES: Record<string, CategoryColorStyle> = new Proxy(
  {} as Record<string, CategoryColorStyle>,
  {
    get(_target, prop: string) {
      if (typeof prop !== 'string') return undefined;
      const event = CATEGORY_EVENT[prop] ?? CATEGORY_EVENT[prop.toLowerCase()];
      if (!event) return undefined;
      return styleFromEvent(event);
    },
    has(_target, prop: string) {
      return prop in CATEGORY_EVENT || String(prop).toLowerCase() in CATEGORY_EVENT;
    },
    ownKeys() {
      return Reflect.ownKeys(CATEGORY_EVENT);
    },
    getOwnPropertyDescriptor(_target, prop) {
      if (typeof prop === 'string' && prop in CATEGORY_EVENT) {
        return { configurable: true, enumerable: true, value: styleFromEvent(CATEGORY_EVENT[prop]) };
      }
      return undefined;
    },
  }
);

/** Legend categories shown on the calendar. */
export const LEGEND_CATEGORIES = [
  'Observation',
  'Fertilization',
  'Irrigation',
  'Pruning',
  'Harvest',
  'Equipment',
] as const;

export const getTaskCategoryColor = (type?: string | null): string => {
  if (!type) return getCssToken('--status-neutral');
  const event = CATEGORY_EVENT[type] ?? CATEGORY_EVENT[type.toLowerCase()];
  if (event) return getEventCategoryColor(event);
  return getCssToken('--status-neutral');
};

export const getTaskCategoryStyle = (type?: string | null): CategoryColorStyle | undefined => {
  if (!type) return undefined;
  const event = CATEGORY_EVENT[type] ?? CATEGORY_EVENT[type.toLowerCase()];
  if (!event) return undefined;
  return styleFromEvent(event);
};

export const resolveCategoryEventKey = (type?: string | null): EventCategoryKey | undefined => {
  if (!type) return undefined;
  return CATEGORY_EVENT[type] ?? CATEGORY_EVENT[type.toLowerCase()];
};
