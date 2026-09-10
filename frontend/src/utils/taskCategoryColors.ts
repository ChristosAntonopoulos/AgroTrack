/** Category colors for FieldTask template codes / legacy category labels. */

export type CategoryColorStyle = {
  bg: string;
  border: string;
  text: string;
  chipBg: string;
};

export const CATEGORY_STYLES: Record<string, CategoryColorStyle> = {
  Observation: { bg: '#e8f0fe', border: '#4285f4', text: '#1a56db', chipBg: '#dbeafe' },
  observation: { bg: '#e8f0fe', border: '#4285f4', text: '#1a56db', chipBg: '#dbeafe' },
  'Soil & Analysis': { bg: '#f3ebe3', border: '#8b6914', text: '#6b4f1d', chipBg: '#ede0d4' },
  soil: { bg: '#f3ebe3', border: '#8b6914', text: '#6b4f1d', chipBg: '#ede0d4' },
  Fertilization: { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20', chipBg: '#c8e6c9' },
  fertilization: { bg: '#e8f5e9', border: '#2e7d32', text: '#1b5e20', chipBg: '#c8e6c9' },
  Irrigation: { bg: '#e0f7fa', border: '#00838f', text: '#006064', chipBg: '#b2ebf2' },
  irrigation: { bg: '#e0f7fa', border: '#00838f', text: '#006064', chipBg: '#b2ebf2' },
  Pruning: { bg: '#f3e5f5', border: '#7b1fa2', text: '#6a1b9a', chipBg: '#e1bee7' },
  pruning: { bg: '#f3e5f5', border: '#7b1fa2', text: '#6a1b9a', chipBg: '#e1bee7' },
  'Weed Management': { bg: '#f1f8e9', border: '#689f38', text: '#558b2f', chipBg: '#dcedc8' },
  'Pest Monitoring': { bg: '#fbe9e7', border: '#e64a19', text: '#bf360c', chipBg: '#ffccbc' },
  'Pest Control': { bg: '#fbe9e7', border: '#e64a19', text: '#bf360c', chipBg: '#ffccbc' },
  plant_protection: { bg: '#fbe9e7', border: '#e64a19', text: '#bf360c', chipBg: '#ffccbc' },
  'Disease Management': { bg: '#fff8e1', border: '#f9a825', text: '#f57f17', chipBg: '#ffecb3' },
  Harvest: { bg: '#fffde7', border: '#f9a825', text: '#8d6e00', chipBg: '#fff9c4' },
  harvest: { bg: '#fffde7', border: '#f9a825', text: '#8d6e00', chipBg: '#fff9c4' },
  Harvesting: { bg: '#fffde7', border: '#f9a825', text: '#8d6e00', chipBg: '#fff9c4' },
  Equipment: { bg: '#eceff1', border: '#607d8b', text: '#455a64', chipBg: '#cfd8dc' },
  maintenance: { bg: '#eceff1', border: '#607d8b', text: '#455a64', chipBg: '#cfd8dc' },
  'Post-Harvest': { bg: '#e8eaf6', border: '#3949ab', text: '#283593', chipBg: '#c5cae9' },
};

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
  if (!type) return '#6c757d';
  const style = CATEGORY_STYLES[type] ?? CATEGORY_STYLES[type.toLowerCase()];
  return style?.border ?? '#6c757d';
};

export const getTaskCategoryStyle = (type?: string | null): CategoryColorStyle | undefined => {
  if (!type) return undefined;
  return CATEGORY_STYLES[type] ?? CATEGORY_STYLES[type.toLowerCase()];
};
