import type { TFunction } from 'i18next';
import type { FieldPhenology } from '../services/fieldWorkService';
import { getLifecycleStageLabel } from './fieldDisplay';

type PhenologyLike = Pick<FieldPhenology, 'isKnown' | 'stageLabel' | 'stageCode'> | null | undefined;

/**
 * Single authoritative field stage: phenology when known, else field.currentLifecycleStage.
 * Unknown only when both are empty.
 */
export function resolveFieldStageLabel(input: {
  phenology?: PhenologyLike;
  currentLifecycleStage?: string | null;
  t: TFunction;
  unknownLabel?: string;
}): string | null {
  const { phenology, currentLifecycleStage, t, unknownLabel } = input;

  if (phenology?.isKnown) {
    const fromPhenology =
      phenology.stageLabel?.trim() ||
      getLifecycleStageLabel(phenology.stageCode, t) ||
      phenology.stageCode?.trim() ||
      null;
    if (fromPhenology) return fromPhenology;
  }

  const fromField =
    getLifecycleStageLabel(currentLifecycleStage ?? undefined, t) ||
    currentLifecycleStage?.trim() ||
    null;
  if (fromField) return fromField;

  return unknownLabel ?? null;
}
