/** Category border colors aligned with web calendar legend */
const CATEGORY_COLORS: Record<string, string> = {
  Pruning: '#4a7c2a',
  Harvesting: '#8b9a46',
  Fertilization: '#6b8e23',
  Irrigation: '#17a2b8',
  'Pest Control': '#dc3545',
  'Soil Analysis': '#6c757d',
  Spraying: '#fd7e14',
  Inspection: '#6610f2',
};

export const getTaskCategoryColor = (type: string): string =>
  CATEGORY_COLORS[type] ?? '#6c757d';
