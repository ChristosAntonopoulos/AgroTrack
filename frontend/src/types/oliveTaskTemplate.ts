export type TaskTemplateCategory =
  | 'Observation'
  | 'Soil & Analysis'
  | 'Fertilization'
  | 'Irrigation'
  | 'Pruning'
  | 'Weed Management'
  | 'Pest Monitoring'
  | 'Disease Management'
  | 'Harvest'
  | 'Equipment'
  | 'Post-Harvest';

export type TaskTemplatePriority = 'Low' | 'Medium' | 'High' | 'Critical';

export type TaskTemplateSeason =
  | 'All year'
  | 'Winter'
  | 'Spring'
  | 'Summer'
  | 'Autumn'
  | 'Harvest season';

export type TimingStatus = 'recommended' | 'coming_soon' | 'passed' | 'none';

export interface OliveTaskTemplate {
  id: string;
  title: string;
  category: TaskTemplateCategory;
  priority: TaskTemplatePriority;
  shortDescription: string;
  whyItMatters: string;
  repetition: string;
  estimatedDuration?: string;
  appliesTo: string[];
  primaryMonths: number[];
  optionalMonths: number[];
  checklist: string[];
  requiredInputs: string[];
  completionFields: string[];
  timingExplanation: string;
  monthTooltip: string;
  warnings?: string[];
  requiresIrrigation?: boolean;
  harvestPhase?: 'prepare' | 'daily' | 'final';
}

export interface TaskTemplateFilters {
  search: string;
  category: TaskTemplateCategory | 'All';
  season: TaskTemplateSeason;
  priority: TaskTemplatePriority | 'All';
  recommendedOnly: boolean;
  fieldSuitableOnly: boolean;
}

export interface CategoryStyle {
  bg: string;
  border: string;
  text: string;
  chipBg: string;
}
