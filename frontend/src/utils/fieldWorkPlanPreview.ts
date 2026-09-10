import type { OnboardingStepId } from './fieldWorkOnboardingSteps';
import type { FieldWorkPlanPreviewItem } from '../services/fieldWorkService';

/** Practice category from plan-preview API → onboarding step for “Αλλαγές”. */
export function practiceCategoryToStep(category: string | undefined | null): OnboardingStepId {
  switch ((category || '').toLowerCase()) {
    case 'irrigation':
      return 'irrigation';
    case 'pruning':
      return 'pruning';
    case 'fertilisation':
      return 'fertilisation';
    case 'ground_cover':
      return 'groundCover';
    case 'pest':
      return 'pest';
    case 'analysis':
      return 'analyses';
    case 'harvest':
      return 'harvestMonth';
    default:
      return 'purpose';
  }
}

export type PlanPreviewGroupKey = 'enabled' | 'askFirst' | 'suppressed';

export type PlanPreviewGroup = {
  key: PlanPreviewGroupKey;
  items: FieldWorkPlanPreviewItem[];
};

/** Stable group order for plan preview UI. */
export function groupPlanPreviewItems(preview: {
  enabled: FieldWorkPlanPreviewItem[];
  askFirst: FieldWorkPlanPreviewItem[];
  suppressed: FieldWorkPlanPreviewItem[];
}): PlanPreviewGroup[] {
  return [
    { key: 'enabled', items: preview.enabled },
    { key: 'askFirst', items: preview.askFirst },
    { key: 'suppressed', items: preview.suppressed },
  ];
}
