import { TaskTemplate } from './taskTemplateService';
import { simulateDelay } from './mockDataService';

const MOCK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-pruning',
    type: 'Pruning',
    title: 'Winter Pruning',
    description: 'Annual pruning of olive trees',
    lifecycleYear: 'low',
  },
  {
    id: 'tpl-harvest',
    type: 'Harvesting',
    title: 'Harvest',
    description: 'Olive harvest collection',
    lifecycleYear: 'high',
  },
];

export const mockTaskTemplateService = {
  getTemplates: async (): Promise<TaskTemplate[]> => {
    await simulateDelay();
    return [...MOCK_TEMPLATES];
  },
};
