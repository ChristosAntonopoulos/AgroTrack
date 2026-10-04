import type { FieldWorkProfile } from '../services/fieldWorkService';

/** Screens in the essential onboarding flow (Phase 3). */
export type OnboardingStepId =
  | 'welcome'
  | 'purpose'
  | 'irrigation'
  | 'irrigationMethod'
  | 'irrigationWho'
  | 'pruning'
  | 'pruningLastYear'
  | 'pruningWho'
  | 'fertilisation'
  | 'fertilisationFrequency'
  | 'fertilisationDone'
  | 'fertilisationWho'
  | 'groundCover'
  | 'groundCoverTimes'
  | 'groundCoverMonths'
  | 'pest'
  | 'pestTraps'
  | 'pestWho'
  | 'analyses'
  | 'analysesYears'
  | 'harvestMonth'
  | 'harvestWho'
  | 'harvestMill'
  | 'reminders'
  | 'finished'
  | 'planPreview'
  | 'similarFields'
  | 'completion'
  | 'personalizing';

/** Primary question index (1–8) for progress display; welcome/personalizing excluded. */
export const PRIMARY_TOTAL = 8;

const RETIRED_TO_PERSONALIZING: ReadonlySet<OnboardingStepId> = new Set([
  'harvestMill',
  'reminders',
  'finished',
  'planPreview',
  'similarFields',
  'completion',
]);

export const hasSelectedAnalysisKinds = (
  kinds?: Array<{ kind?: string | null }> | null
): boolean =>
  Boolean(
    kinds?.some((entry) => {
      const kind = entry.kind || '';
      return kind && kind !== 'none' && kind !== 'unknown';
    })
  );

export const primaryIndexForStep = (step: OnboardingStepId): number | null => {
  switch (step) {
    case 'welcome':
    case 'finished':
    case 'planPreview':
    case 'similarFields':
    case 'completion':
    case 'personalizing':
      return null;
    case 'purpose':
      return 1;
    case 'irrigation':
    case 'irrigationMethod':
    case 'irrigationWho':
      return 2;
    case 'pruning':
    case 'pruningLastYear':
    case 'pruningWho':
      return 3;
    case 'fertilisation':
    case 'fertilisationFrequency':
    case 'fertilisationDone':
    case 'fertilisationWho':
      return 4;
    case 'groundCover':
    case 'groundCoverTimes':
    case 'groundCoverMonths':
      return 5;
    case 'pest':
    case 'pestTraps':
    case 'pestWho':
      return 6;
    case 'analyses':
    case 'analysesYears':
      return 7;
    case 'harvestMonth':
    case 'harvestWho':
    case 'harvestMill':
      return 8;
    case 'reminders':
      return 8;
    default:
      return null;
  }
};

const isUnknown = (value?: string | null) => !value || value === 'unknown';

/**
 * Infer first unanswered step from a draft/active profile (for resume).
 * Prefer explicit localStorage stepId when present.
 */
export const inferResumeStep = (profile: FieldWorkProfile | null): OnboardingStepId => {
  if (!profile) return 'welcome';
  if (profile.status === 'active') return 'personalizing';

  if (isUnknown(profile.productionPurpose)) return 'purpose';

  if (isUnknown(profile.irrigation.preferenceMode)) return 'irrigation';
  if (
    profile.irrigation.preferenceMode === 'enabled' &&
    isUnknown(profile.irrigation.method)
  ) {
    return 'irrigationMethod';
  }
  if (
    profile.irrigation.preferenceMode === 'enabled' &&
    isUnknown(profile.irrigation.decisionMaker)
  ) {
    return 'irrigationWho';
  }

  if (isUnknown(profile.pruning.preferenceMode)) return 'pruning';
  if (
    profile.pruning.preferenceMode === 'enabled' &&
    profile.pruning.lastPerformedYear == null &&
    isUnknown(profile.pruning.datePrecision)
  ) {
    return 'pruningLastYear';
  }

  if (isUnknown(profile.fertilisation.preferenceMode)) return 'fertilisation';
  if (
    profile.fertilisation.preferenceMode === 'enabled' &&
    isUnknown(profile.fertilisation.frequencyType)
  ) {
    return 'fertilisationFrequency';
  }

  if (
    profile.groundCover.methods.length === 0 &&
    isUnknown(profile.groundCover.preferenceMode)
  ) {
    return 'groundCover';
  }

  if (isUnknown(profile.pestManagement.decisionApproach)) return 'pest';
  if (
    (profile.pestManagement.decisionApproach === 'trap_and_fruit_checks' ||
      profile.pestManagement.decisionApproach === 'combined') &&
    isUnknown(profile.pestManagement.trapStatus)
  ) {
    return 'pestTraps';
  }

  if (
    !hasSelectedAnalysisKinds(profile.analysis.kinds) &&
    isUnknown(profile.analysis.preferenceMode)
  ) {
    return 'analyses';
  }

  if (profile.harvest.expectedStartMonth == null && isUnknown(profile.harvest.organizer)) {
    return 'harvestMonth';
  }
  if (isUnknown(profile.harvest.organizer)) return 'harvestWho';

  return 'personalizing';
};

export const normalizeOnboardingStep = (
  step: OnboardingStepId,
  profile: FieldWorkProfile | null
): OnboardingStepId => {
  if (step === 'groundCoverMonths') return 'pest';
  if (RETIRED_TO_PERSONALIZING.has(step)) return inferResumeStep(profile);
  return step;
};

export const buildStepSequence = (ctx: {
  irrigationEnabled: boolean;
  pruningEnabled: boolean;
  fertilisationEnabled: boolean;
  fertilisationAnnual: boolean;
  pestMonitoring: boolean;
  analysisKindsSelected: boolean;
}): OnboardingStepId[] => {
  const steps: OnboardingStepId[] = ['welcome', 'purpose', 'irrigation'];
  if (ctx.irrigationEnabled) {
    steps.push('irrigationMethod', 'irrigationWho');
  }
  steps.push('pruning');
  if (ctx.pruningEnabled) {
    steps.push('pruningLastYear', 'pruningWho');
  }
  steps.push('fertilisation');
  if (ctx.fertilisationEnabled) {
    if (ctx.fertilisationAnnual) steps.push('fertilisationFrequency');
    steps.push('fertilisationDone', 'fertilisationWho');
  }
  steps.push('groundCover', 'groundCoverTimes');
  steps.push('pest');
  if (ctx.pestMonitoring) {
    steps.push('pestTraps', 'pestWho');
  }
  steps.push('analyses');
  if (ctx.analysisKindsSelected) {
    steps.push('analysesYears');
  }
  steps.push('harvestMonth', 'harvestWho', 'personalizing');
  return steps;
};

export const nextStep = (
  current: OnboardingStepId,
  sequence: OnboardingStepId[]
): OnboardingStepId => {
  const idx = sequence.indexOf(current);
  if (idx < 0 || idx >= sequence.length - 1) return 'personalizing';
  return sequence[idx + 1];
};

export const prevStep = (
  current: OnboardingStepId,
  sequence: OnboardingStepId[]
): OnboardingStepId | null => {
  const idx = sequence.indexOf(current);
  if (idx <= 0) return null;
  return sequence[idx - 1];
};

/** Year cards for pruning / analysis relative to ResultYear. */
export const resultYearOptions = (resultYear: number) => [
  { value: resultYear, key: 'thisYear' as const },
  { value: resultYear - 1, key: 'lastYear' as const },
  { value: resultYear - 2, key: 'twoYearsAgo' as const },
  { value: resultYear - 3, key: 'threePlus' as const },
];
