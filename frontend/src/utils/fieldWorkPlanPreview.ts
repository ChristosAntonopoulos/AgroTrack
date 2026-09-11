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

export type PlanTaskTone = 'planned' | 'done' | 'ifNeeded' | 'skipped';

export type PlanSeasonKey = 'winter' | 'spring' | 'summer' | 'autumn';

export type PlanSeasonGroup = {
  key: PlanSeasonKey;
  items: FieldWorkPlanPreviewItem[];
};

const SEASON_ORDER: PlanSeasonKey[] = ['winter', 'spring', 'summer', 'autumn'];

const monthFromIso = (value?: string | null): number | null => {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) return Number(match[2]);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getUTCMonth() + 1;
};

export function seasonForMonth(month: number | null): PlanSeasonKey {
  if (month == null) return 'winter';
  if (month <= 2) return 'winter';
  if (month <= 5) return 'spring';
  if (month <= 8) return 'summer';
  return 'autumn';
}

export function planTaskTone(item: FieldWorkPlanPreviewItem): PlanTaskTone {
  if (item.reasonCode === 'already_completed_this_year') return 'done';
  const status = (item.eligibilityStatus || '').toLowerCase();
  if (status === 'ask_first' || status === 'askfirst') return 'ifNeeded';
  if (status === 'suppressed') return 'skipped';
  return 'planned';
}

export function flattenPlanPreviewItems(preview: {
  enabled: FieldWorkPlanPreviewItem[];
  askFirst: FieldWorkPlanPreviewItem[];
  suppressed: FieldWorkPlanPreviewItem[];
}): FieldWorkPlanPreviewItem[] {
  return [...preview.enabled, ...preview.askFirst, ...preview.suppressed];
}

/** Year timeline: this year's / if-needed work, grouped by season and date. */
export function groupPlanPreviewBySeason(
  items: FieldWorkPlanPreviewItem[]
): PlanSeasonGroup[] {
  const buckets: Record<PlanSeasonKey, FieldWorkPlanPreviewItem[]> = {
    winter: [],
    spring: [],
    summer: [],
    autumn: [],
  };

  const dated = items.filter((item) => planTaskTone(item) !== 'skipped');
  dated
    .slice()
    .sort((a, b) => {
      const aStart = a.windowStart || '';
      const bStart = b.windowStart || '';
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      return a.templateCode.localeCompare(b.templateCode);
    })
    .forEach((item) => {
      buckets[seasonForMonth(monthFromIso(item.windowStart))].push(item);
    });

  return SEASON_ORDER.filter((key) => buckets[key].length > 0).map((key) => ({
    key,
    items: buckets[key],
  }));
}

export function skippedPlanItems(items: FieldWorkPlanPreviewItem[]): FieldWorkPlanPreviewItem[] {
  return items
    .filter((item) => planTaskTone(item) === 'skipped')
    .sort((a, b) => (a.windowStart || '').localeCompare(b.windowStart || ''));
}
