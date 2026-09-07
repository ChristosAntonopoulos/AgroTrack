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
    id: 'tpl-harvest-nets',
    type: 'harvest_ready_nets',
    title: 'Ready nets and crates',
    description: 'Lay out nets and crates before picking',
    lifecycleYear: 'high',
    harvestPhase: 'prepare',
  },
  {
    id: 'tpl-harvest-mill',
    type: 'harvest_book_mill',
    title: 'Book the mill',
    description: 'Confirm a mill slot before harvest starts',
    lifecycleYear: 'high',
    harvestPhase: 'prepare',
  },
  {
    id: 'tpl-harvest-crew',
    type: 'harvest_call_crew',
    title: 'Call the crew',
    description: 'Confirm who is coming to pick',
    lifecycleYear: 'high',
    harvestPhase: 'prepare',
  },
  {
    id: 'tpl-harvest-access',
    type: 'harvest_check_access',
    title: 'Check access and weather',
    description: 'Check roads and the forecast',
    lifecycleYear: 'high',
    harvestPhase: 'prepare',
  },
  {
    id: 'tpl-harvest',
    type: 'harvest_daily_kilos',
    title: "Write today's kilos",
    description: 'Record kilos for this grove today',
    lifecycleYear: 'high',
    harvestPhase: 'daily',
  },
  {
    id: 'tpl-harvest-delivery',
    type: 'harvest_mill_delivery',
    title: 'Take olives to the mill',
    description: 'Deliver fruit and write oil kilos',
    lifecycleYear: 'high',
    harvestPhase: 'final',
  },
  {
    id: 'tpl-harvest-close',
    type: 'harvest_close_season',
    title: 'Close this harvest',
    description: 'Mark harvest done and write the sale',
    lifecycleYear: 'high',
    harvestPhase: 'final',
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
