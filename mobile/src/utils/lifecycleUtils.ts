export const LIFECYCLE_STAGES = [
  'dormancy',
  'bud_break',
  'flowering',
  'fruit_set',
  'fruit_growth',
  'harvest',
] as const;

export type LifecycleStageKey = (typeof LIFECYCLE_STAGES)[number];

export function normalizeStage(stage?: string | null): LifecycleStageKey {
  if (!stage) return 'dormancy';
  const key = stage.toLowerCase() as LifecycleStageKey;
  return LIFECYCLE_STAGES.includes(key) ? key : 'dormancy';
}

export function getStageIndex(stage?: string | null): number {
  return LIFECYCLE_STAGES.indexOf(normalizeStage(stage));
}

export function stageLabelKey(stage?: string | null): string {
  return `common:lifecycleStage.${normalizeStage(stage)}`;
}
