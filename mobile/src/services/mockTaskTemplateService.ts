import { TaskTemplate } from './taskTemplateService';
import { simulateDelay } from './mockDataService';

const MOCK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-pruning',
    type: 'Pruning',
    title: 'Winter Pruning',
    description: 'Annual pruning of olive trees to shape canopy and improve yield',
    lifecycleYear: 'low',
  },
  {
    id: 'tpl-fertilization',
    type: 'Fertilization',
    title: 'Spring Fertilization',
    description: 'Apply nitrogen and micronutrients after bud break',
    lifecycleYear: 'low',
  },
  {
    id: 'tpl-irrigation',
    type: 'Irrigation',
    title: 'Irrigation Check',
    description: 'Inspect drip lines and adjust watering schedule',
    lifecycleYear: 'high',
  },
  {
    id: 'tpl-spraying',
    type: 'Spraying',
    title: 'Disease Prevention Spray',
    description: 'Copper or organic spray before rainy season',
    lifecycleYear: 'low',
  },
  {
    id: 'tpl-harvest',
    type: 'Harvesting',
    title: 'Olive Harvest',
    description: 'Collect olives at optimal maturity for oil quality',
    lifecycleYear: 'high',
  },
  {
    id: 'tpl-inspection',
    type: 'Inspection',
    title: 'Field Inspection',
    description: 'Walk the grove and note tree health or pest signs',
    lifecycleYear: 'low',
  },
];

export const mockTaskTemplateService = {
  getTemplates: async (): Promise<TaskTemplate[]> => {
    await simulateDelay();
    return [...MOCK_TEMPLATES];
  },
};
