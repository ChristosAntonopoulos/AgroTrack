/** FieldOwner first-run activation — mirrored step ids for mobile. */

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
  forceShow: boolean;
  /** Later escape before όρια — allows browse until they resume or save boundary. */
  laterSnoozedAt: string | null;
  /** Soft guide after spatial welcome: details → home → History → first observation. */
  awaitingFirstObservation: boolean;
  firstObservationDoneAt: string | null;
  /**
   * Soft navigation lesson after the grove exists.
   * linger = free map look-around, home = pulse launcher mark, history = pulse Ιστορικό.
   */
  navCoachPhase: NavCoachPhase | null;
};

export type NavCoachPhase = 'linger' | 'home' | 'history';

export const GUIDE_TARGETS = [
  'fieldsCard',
  'createField',
  'homeButton',
  'historyCard',
  'addButton',
  'observationType',
  'saveObservation',
] as const;

export type GuideTargetId = (typeof GUIDE_TARGETS)[number];

/**
 * Controls the focus ring can frame while a grove is being created.
 * Nav cards plus the name, search, map, and save actions.
 */
export const FORM_COACH_TARGETS = [
  'createGrove',
  'locatePlace',
  'drawBoundary',
  'saveBoundary',
] as const;

export type FormCoachTargetId = (typeof FORM_COACH_TARGETS)[number];

export type CoachTargetId = GuideTargetId | FormCoachTargetId;

/**
 * One path from the first tap through the first note.
 * The number on each focus card is this order.
 */
export const ONBOARDING_JOURNEY = [
  'fieldsCard',
  'createField',
  'createGrove',
  'locatePlace',
  'drawBoundary',
  'saveBoundary',
  'groveReady',
  'historyCard',
  'addButton',
  'observationType',
  'saveObservation',
] as const;

export type OnboardingJourneyId = (typeof ONBOARDING_JOURNEY)[number];

export const ONBOARDING_JOURNEY_TOTAL = ONBOARDING_JOURNEY.length;

export const onboardingStepNumber = (id: OnboardingJourneyId): number =>
  ONBOARDING_JOURNEY.indexOf(id) + 1;

export type BoundaryCoachPhase = 'locate' | 'draw' | 'save';

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

export const storageKeyFor = (userId: string) => `The Olive Lot.ownerActivation.v1.${userId}`;

export const ONBOARDING_TARGETS = {
  groveName: 'grove-name',
  createCta: 'grove-create-cta',
  boundaryMap: 'boundary-map',
  boundarySave: 'boundary-save',
  spatialPanel: 'spatial-loading',
  firstObservation: 'first-observation',
  addButton: 'add-button',
  observationType: 'observation-type',
  saveObservation: 'save-observation',
} as const;
