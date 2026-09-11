/** Category border colors aligned with web Mediterranean event palette */
const CATEGORY_COLORS: Record<string, string> = {
  Pruning: '#5E7848',
  Harvesting: '#8B4F49',
  Fertilization: '#5E7848',
  Irrigation: '#39798D',
  'Pest Control': '#A74435',
  'Soil Analysis': '#755D8C',
  'Soil Testing': '#755D8C',
  Spraying: '#A74435',
  Inspection: '#755D8C',
};

export const getTaskCategoryColor = (type: string): string =>
  CATEGORY_COLORS[type] ?? '#879086';
