/** FieldOwner first-run activation — shared step ids for web + mobile mental model. */

export const OWNER_ACTIVATION_STEPS = [
  'createGrove',
  'drawBoundary',
  'loadData',
  'firstObservation',
] as const;

/** Top checklist bar — spatial welcome + first observation are soft post-όρια guides. */
export const OWNER_CHECKLIST_STEPS = ['createGrove', 'drawBoundary', 'loadData'] as const;

export type OwnerActivationStepId = (typeof OWNER_ACTIVATION_STEPS)[number];

export type OwnerActivationPersisted = {
  skippedSteps: OwnerActivationStepId[];
  /** Permanent hide — only after όρια unlock (or Settings tips off). */
  dismissedAt: string | null;
  checklistCollapsed: boolean;
  /** User asked to see tips again from settings. */
  forceShow: boolean;
  /** Later escape before όρια — allows browse until they resume or save boundary. */
  laterSnoozedAt: string | null;
  /** Soft guide after spatial welcome: details → home → History → first observation. */
  awaitingFirstObservation: boolean;
  firstObservationDoneAt: string | null;
  /** linger on field details, then the home logo, then History. */
  navCoachPhase: NavCoachPhase | null;
};

export type NavCoachPhase = 'linger' | 'home' | 'history';

export const GUIDE_TARGETS = ['fieldsNav', 'createField', 'homeButton', 'historyNav'] as const;

export type GuideTargetId = (typeof GUIDE_TARGETS)[number];

/** One path, welcome through the first note. Numbers on the cards follow this order. */
export const ONBOARDING_JOURNEY = [
  'fieldsNav',
  'createField',
  'createGrove',
  'locatePlace',
  'drawBoundary',
  'groveReady',
  'homeButton',
  'historyNav',
  'firstObservation',
] as const;

export type OnboardingJourneyId = (typeof ONBOARDING_JOURNEY)[number];

export const ONBOARDING_JOURNEY_TOTAL = ONBOARDING_JOURNEY.length;

export const onboardingStepNumber = (id: OnboardingJourneyId): number =>
  ONBOARDING_JOURNEY.indexOf(id) + 1;

export const emptyPersisted = (): OwnerActivationPersisted => ({
  skippedSteps: [],
  dismissedAt: null,
  checklistCollapsed: false,
  forceShow: false,
  laterSnoozedAt: null,
  awaitingFirstObservation: false,
  firstObservationDoneAt: null,
  navCoachPhase: null,
});

export const storageKeyFor = (userId: string) => `oleachron.ownerActivation.v1.${userId}`;

export const ONBOARDING_TARGETS = {
  groveName: 'grove-name',
  groveColor: 'grove-color',
  createCta: 'grove-create-cta',
  boundarySearch: 'boundary-search',
  boundaryMap: 'boundary-map',
  boundarySave: 'boundary-save',
  spatialPanel: 'spatial-loading',
  firstObservation: 'first-observation',
} as const;

export type OnboardingTargetId = (typeof ONBOARDING_TARGETS)[keyof typeof ONBOARDING_TARGETS];

export const stepTarget = (step: OwnerActivationStepId): OnboardingTargetId => {
  switch (step) {
    case 'createGrove':
      return ONBOARDING_TARGETS.groveName;
    case 'drawBoundary':
      return ONBOARDING_TARGETS.boundaryMap;
    case 'loadData':
      return ONBOARDING_TARGETS.spatialPanel;
    case 'firstObservation':
      return ONBOARDING_TARGETS.firstObservation;
  }
};

export const stepPath = (step: OwnerActivationStepId, fieldId: string | null): string => {
  switch (step) {
    case 'createGrove':
      return fieldId ? `/fields/${fieldId}/edit` : '/fields/new';
    case 'drawBoundary':
      return fieldId ? `/fields/${fieldId}/edit?focus=boundary` : '/fields/new';
    case 'loadData':
      return fieldId ? `/fields/${fieldId}?tab=map&activation=spatial` : '/fields';
    case 'firstObservation':
      return fieldId ? `/fields/${fieldId}?tab=details&activation=observe` : '/fields';
  }
};
